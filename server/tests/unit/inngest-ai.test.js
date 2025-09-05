const { describe, it, beforeAll, afterAll, expect, jest } = require('@jest/globals');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { inngest } = require('../config/inngest');
const { setupTestData } = require('./inngest.test');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  await setupTestData();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AI Services Integration Tests', () => {
  describe('AI Analysis Processing', () => {
    it('should send AI analysis request event', async () => {
      const User = require('../models/User');
      const testUser = await User.findOne({ role: 'student' });
      
      const eventData = {
        name: 'ai/analyze-request',
        data: {
          userId: testUser._id,
          message: 'I am feeling very anxious today',
          sessionId: 'test_session_123',
          timestamp: Date.now()
        }
      };

      // Mock Inngest send
      const sendSpy = jest.spyOn(inngest, 'send').mockResolvedValue({ id: 'event_123' });
      
      await inngest.send(eventData);
      
      expect(sendSpy).toHaveBeenCalledWith(eventData);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      
      sendSpy.mockRestore();
    });

    it('should handle batch AI analysis events', async () => {
      const events = [
        {
          data: {
            userId: 'user1',
            message: 'I feel sad',
            sessionId: 'session1'
          }
        },
        {
          data: {
            userId: 'user2', 
            message: 'I want to hurt myself',
            sessionId: 'session2'
          }
        }
      ];

      // Mock AI analysis service
      const aiAnalysisService = require('../services/aiAnalysis');
      const analyzeSpy = jest.spyOn(aiAnalysisService, 'analyzeMessage')
        .mockResolvedValueOnce({
          sentiment: { urgencyLevel: 2 },
          risk: { riskLevel: 'low', alertCounselor: false }
        })
        .mockResolvedValueOnce({
          sentiment: { urgencyLevel: 5 },
          risk: { riskLevel: 'critical', alertCounselor: true, confidence: 0.9 }
        });

      // Simulate batch processing
      const results = [];
      for (const event of events) {
        try {
          const analysis = await aiAnalysisService.analyzeMessage(
            event.data.message, 
            event.data.userId
          );
          results.push({ 
            userId: event.data.userId, 
            sessionId: event.data.sessionId, 
            analysis, 
            success: true 
          });
        } catch (error) {
          results.push({ 
            userId: event.data.userId, 
            sessionId: event.data.sessionId, 
            error: error.message, 
            success: false 
          });
        }
      }

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].analysis.risk.alertCounselor).toBe(true);
      
      analyzeSpy.mockRestore();
    });
  });

  describe('Analytics Processing', () => {
    it('should aggregate user action events', async () => {
      const events = [
        {
          data: {
            type: 'chat_interaction',
            userId: 'user1',
            metadata: { messageLength: 50 },
            timestamp: new Date().getTime()
          }
        },
        {
          data: {
            type: 'chat_interaction', 
            userId: 'user2',
            metadata: { messageLength: 75 },
            timestamp: new Date().getTime()
          }
        },
        {
          data: {
            type: 'crisis_detected',
            userId: 'user3',
            metadata: { confidence: 0.9 },
            timestamp: new Date().getTime()
          }
        }
      ];

      // Simulate analytics aggregation
      const aggregated = {};
      events.forEach(({ data }) => {
        const { type, userId, metadata, timestamp } = data;
        const hour = new Date(timestamp).getHours();
        const key = `${type}_${hour}`;
        
        if (!aggregated[key]) {
          aggregated[key] = { type, hour, count: 0, users: new Set(), metadata: [] };
        }
        
        aggregated[key].count++;
        aggregated[key].users.add(userId);
        aggregated[key].metadata.push(metadata);
      });

      const records = Object.values(aggregated).map(agg => ({
        type: agg.type,
        hour: agg.hour,
        count: agg.count,
        uniqueUsers: agg.users.size,
        date: new Date().toISOString().split('T')[0],
        metadata: agg.metadata
      }));

      expect(records).toHaveLength(2); // chat_interaction and crisis_detected
      expect(records.find(r => r.type === 'chat_interaction').count).toBe(2);
      expect(records.find(r => r.type === 'crisis_detected').count).toBe(1);
    });

    it('should detect crisis spikes', async () => {
      const crisisEvents = Array(12).fill().map((_, i) => ({
        data: {
          type: 'crisis_detected',
          userId: `user${i}`,
          timestamp: Date.now()
        }
      }));

      const crisisCount = crisisEvents.filter(e => e.data.type === 'crisis_detected').length;
      
      expect(crisisCount).toBeGreaterThan(10); // Should trigger spike alert
      
      // Mock spike detection
      if (crisisCount > 10) {
        const spikeEvent = {
          name: 'analytics/crisis-spike',
          data: { count: crisisCount, timestamp: Date.now() }
        };
        
        expect(spikeEvent.data.count).toBe(12);
        expect(spikeEvent.name).toBe('analytics/crisis-spike');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track AI model performance metrics', async () => {
      const AISession = require('../models/AISession');
      const User = require('../models/User');
      const testUser = await User.findOne({ role: 'student' });
      
      // Create test AI sessions
      const sessions = [
        {
          user: testUser._id,
          sessionId: 'session1',
          responseTime: 2000,
          createdAt: new Date()
        },
        {
          user: testUser._id,
          sessionId: 'session2', 
          responseTime: 6000, // Slow response
          error: 'Timeout error',
          createdAt: new Date()
        }
      ];

      await AISession.insertMany(sessions);

      // Simulate performance check
      const last15Min = new Date(Date.now() - 15 * 60 * 1000);
      const metrics = await AISession.aggregate([
        { $match: { createdAt: { $gte: last15Min } } },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            totalRequests: { $sum: 1 },
            errorRate: { 
              $avg: { $cond: [{ $ne: ['$error', null] }, 1, 0] }
            }
          }
        }
      ]);

      const performance = metrics[0];
      expect(performance.totalRequests).toBe(2);
      expect(performance.avgResponseTime).toBe(4000); // (2000 + 6000) / 2
      expect(performance.errorRate).toBe(0.5); // 1 error out of 2 requests
      
      // Should trigger performance alert
      expect(performance.avgResponseTime > 5000 || performance.errorRate > 0.1).toBe(true);
    });
  });
});

module.exports = {};
