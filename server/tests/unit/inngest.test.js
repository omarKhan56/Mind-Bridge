const { describe, it, beforeAll, afterAll, expect } = require('@jest/globals');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { inngest, eventHandler } = require('../config/inngest');
const User = require('../models/User');
const CrisisAlert = require('../models/CrisisAlert');

let mongoServer;

beforeAll(async () => {
  // Setup in-memory MongoDB for testing
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Create test data
  await setupTestData();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

async function setupTestData() {
  // Create test college
  const College = require('../models/College');
  const testCollege = await College.create({
    name: 'Test University',
    domain: 'test.edu',
    isActive: true
  });

  // Create test users
  const testStudent = await User.create({
    name: 'Test Student',
    email: 'student@test.edu',
    password: 'hashedpassword',
    role: 'student',
    college: testCollege._id,
    isActive: true
  });

  const testCounselor = await User.create({
    name: 'Test Counselor',
    email: 'counselor@test.edu',
    password: 'hashedpassword',
    role: 'counselor',
    college: testCollege._id,
    isActive: true
  });

  return { testCollege, testStudent, testCounselor };
}

describe('Inngest Services Tests', () => {
  describe('Event Handler', () => {
    it('should handle high-risk user detection', async () => {
      const testUser = await User.findOne({ role: 'student' });
      
      await eventHandler.handleHighRiskUser(testUser._id, 'critical', {
        source: 'test',
        message: 'Test crisis message',
        confidence: 0.95
      });

      // Check if crisis alert was created
      const alert = await CrisisAlert.findOne({ user: testUser._id });
      expect(alert).toBeTruthy();
      expect(alert.riskLevel).toBe('critical');
      expect(alert.status).toBe('active');
    });

    it('should handle chat interactions with crisis detection', async () => {
      const testUser = await User.findOne({ role: 'student' });
      const crisisMessage = 'I want to kill myself';
      
      await eventHandler.handleChatInteraction(testUser._id, crisisMessage, 'AI response');

      // Should create crisis alert for crisis keywords
      const alert = await CrisisAlert.findOne({ 
        user: testUser._id,
        'screeningData.source': 'chat'
      });
      expect(alert).toBeTruthy();
      expect(alert.riskLevel).toBe('critical');
    });

    it('should track metrics correctly', async () => {
      const initialMetrics = eventHandler.getMetrics();
      const testUser = await User.findOne({ role: 'student' });
      
      await eventHandler.handleHighRiskUser(testUser._id, 'high', { source: 'test' });
      
      const updatedMetrics = eventHandler.getMetrics();
      expect(updatedMetrics.eventsProcessed).toBeGreaterThan(initialMetrics.eventsProcessed);
      expect(updatedMetrics.lastProcessed).toBeTruthy();
    });
  });

  describe('Crisis Alert Processing', () => {
    it('should create crisis alert with proper data structure', async () => {
      const testUser = await User.findOne({ role: 'student' }).populate('college');
      
      const alert = await eventHandler.processHighRiskUserDirect(testUser._id, 'high', {
        source: 'screening',
        confidence: 0.8,
        trigger: 'PHQ-9 score'
      });

      expect(alert.user.toString()).toBe(testUser._id.toString());
      expect(alert.college.toString()).toBe(testUser.college._id.toString());
      expect(alert.riskLevel).toBe('high');
      expect(alert.screeningData.source).toBe('screening');
      expect(alert.status).toBe('active');
    });

    it('should notify counselors for high-risk alerts', async () => {
      const testUser = await User.findOne({ role: 'student' }).populate('college');
      const consoleSpy = jest.spyOn(console, 'log');
      
      await eventHandler.notifyCounselors(testUser._id, 'critical', testUser.college._id);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notified 1 counselors for critical risk user')
      );
      
      consoleSpy.mockRestore();
    });
  });
});

module.exports = { setupTestData };
