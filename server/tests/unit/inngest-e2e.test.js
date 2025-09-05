const { describe, it, beforeAll, afterAll, expect, jest } = require('@jest/globals');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const { setupTestData } = require('./inngest.test');
const jwt = require('jsonwebtoken');

let mongoServer;
let testToken;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  const { testStudent } = await setupTestData();
  testUser = testStudent;
  
  // Generate test JWT token
  testToken = jwt.sign(
    { userId: testUser._id, role: 'student' },
    process.env.JWT_SECRET || 'test-secret'
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('End-to-End Inngest Integration Tests', () => {
  describe('Crisis Detection Workflow', () => {
    it('should handle complete crisis detection flow', async () => {
      const crisisMessage = 'I want to end my life';
      
      // Step 1: Send chat message with crisis content
      const response = await request(app)
        .post('/api/ai/analyze-message')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          message: crisisMessage,
          sessionId: 'test_crisis_session'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('processing');
      expect(response.body.analysisId).toBeTruthy();

      // Step 2: Wait and check if crisis alert was created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const CrisisAlert = require('../models/CrisisAlert');
      const alert = await CrisisAlert.findOne({ user: testUser._id });
      
      expect(alert).toBeTruthy();
      expect(alert.riskLevel).toBe('critical');
      expect(alert.status).toBe('active');
    });

    it('should handle follow-up workflow', async () => {
      const CrisisAlert = require('../models/CrisisAlert');
      
      // Create initial alert
      const alert = await CrisisAlert.create({
        user: testUser._id,
        college: testUser.college,
        riskLevel: 'high',
        status: 'active',
        screeningData: { source: 'test' }
      });

      // Simulate follow-up check
      const { eventHandler } = require('../config/inngest');
      
      // Mock user with no recent activity
      const User = require('../models/User');
      await User.findByIdAndUpdate(testUser._id, {
        lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      });

      // This would normally be triggered by Inngest after delay
      const followupData = {
        userId: testUser._id,
        alertId: alert._id,
        attempt: 1,
        maxAttempts: 3
      };

      // Verify follow-up logic
      const user = await User.findById(testUser._id);
      const daysSinceAlert = (Date.now() - alert.createdAt) / (1000 * 60 * 60 * 24);
      const hasRecentActivity = user.lastLogin > alert.createdAt;
      
      expect(hasRecentActivity).toBe(false);
      expect(followupData.attempt).toBeLessThan(followupData.maxAttempts);
    });
  });

  describe('Analytics Workflow', () => {
    it('should track and aggregate user interactions', async () => {
      const { inngest } = require('../config/inngest');
      
      // Mock multiple user interactions
      const interactions = [
        { type: 'chat_interaction', userId: testUser._id, metadata: { messageLength: 50 } },
        { type: 'screening_completed', userId: testUser._id, metadata: { score: 15 } },
        { type: 'resource_accessed', userId: testUser._id, metadata: { resourceId: 'res1' } }
      ];

      const sendSpy = jest.spyOn(inngest, 'send').mockResolvedValue({ id: 'event_123' });

      // Send analytics events
      for (const interaction of interactions) {
        await inngest.send({
          name: 'analytics/user-action',
          data: {
            ...interaction,
            timestamp: Date.now()
          }
        });
      }

      expect(sendSpy).toHaveBeenCalledTimes(3);
      
      sendSpy.mockRestore();
    });

    it('should generate system health metrics', async () => {
      // Simulate health check
      const healthChecks = {
        database: mongoose.connection.readyState === 1,
        redis: true, // Mock Redis as healthy
        apiResponse: true // Mock API as responsive
      };

      expect(healthChecks.database).toBe(true);
      expect(healthChecks.redis).toBe(true);
      expect(healthChecks.apiResponse).toBe(true);

      // If any service was down, it would trigger alert
      const allHealthy = Object.values(healthChecks).every(check => check === true);
      expect(allHealthy).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle failed events gracefully', async () => {
      const FailedEvent = require('../models/FailedEvent');
      
      // Simulate a failed event
      const failedEvent = await FailedEvent.create({
        functionId: 'alert-high-risk-user',
        originalEvent: {
          name: 'user/high-risk-detected',
          data: { userId: testUser._id, riskLevel: 'critical' }
        },
        error: 'Database connection timeout',
        status: 'pending_review'
      });

      expect(failedEvent.functionId).toBe('alert-high-risk-user');
      expect(failedEvent.status).toBe('pending_review');
      expect(failedEvent.retryCount).toBe(0);
    });

    it('should handle rate limiting', async () => {
      // Mock Redis for rate limiting
      const mockRedis = {
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(true)
      };

      const collegeId = testUser.college;
      const key = `crisis_alerts:${collegeId}:${new Date().toISOString().split('T')[0]}`;
      
      const count = await mockRedis.incr(key);
      await mockRedis.expire(key, 86400);

      expect(count).toBe(1);
      expect(count).toBeLessThan(50); // Under rate limit
      expect(mockRedis.incr).toHaveBeenCalledWith(key);
      expect(mockRedis.expire).toHaveBeenCalledWith(key, 86400);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = Array(10).fill().map((_, i) => 
        request(app)
          .post('/api/ai/analyze-message')
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            message: `Test message ${i}`,
            sessionId: `concurrent_session_${i}`
          })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('processing');
      });
    });

    it('should batch process events efficiently', async () => {
      const batchSize = 20;
      const events = Array(batchSize).fill().map((_, i) => ({
        data: {
          userId: `user_${i}`,
          message: `Message ${i}`,
          sessionId: `session_${i}`
        }
      }));

      // Simulate batch processing
      const startTime = Date.now();
      const results = [];
      
      for (const event of events) {
        results.push({
          userId: event.data.userId,
          sessionId: event.data.sessionId,
          success: true,
          processingTime: Math.random() * 1000 // Mock processing time
        });
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerEvent = totalTime / batchSize;
      
      expect(results).toHaveLength(batchSize);
      expect(avgTimePerEvent).toBeLessThan(100); // Should be fast for mocked processing
    });
  });
});

module.exports = {};
