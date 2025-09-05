#!/usr/bin/env node

const io = require('socket.io-client');
const mongoose = require('mongoose');

// Connect to MongoDB to create test data
mongoose.connect('mongodb://localhost:27017/mindbridge');

const User = require('./server/models/User');
const College = require('./server/models/College');

class CollegeCrisisTest {
  constructor() {
    this.socket = null;
    this.counselorSocket = null;
    this.alertsReceived = 0;
  }

  async setupTestData() {
    console.log('🏗️ Setting up test data...');
    
    // Create test college
    let testCollege = await College.findOne({ code: 'TEST' });
    if (!testCollege) {
      testCollege = new College({
        name: 'Test University',
        code: 'TEST',
        address: '123 Test Street',
        contactEmail: 'admin@test.edu'
      });
      await testCollege.save();
    }

    // Create test student
    let testStudent = await User.findOne({ email: 'student@test.com' });
    if (!testStudent) {
      testStudent = new User({
        name: 'Test Student',
        email: 'student@test.com',
        password: 'password123',
        role: 'student',
        college: testCollege._id
      });
      await testStudent.save();
    }

    // Create test counselor
    let testCounselor = await User.findOne({ email: 'counselor@test.com' });
    if (!testCounselor) {
      testCounselor = new User({
        name: 'Test Counselor',
        email: 'counselor@test.com',
        password: 'password123',
        role: 'counselor',
        college: testCollege._id,
        department: 'Psychology'
      });
      await testCounselor.save();
    }

    console.log('✅ Test data created');
    return { testStudent, testCounselor, testCollege };
  }

  async connectSockets(testStudent, testCounselor) {
    console.log('🔌 Connecting sockets...');
    
    // Student socket
    this.socket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    // Counselor socket
    this.counselorSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    return new Promise((resolve, reject) => {
      let connectionsReady = 0;

      this.socket.on('connect', () => {
        console.log('✅ Student socket connected');
        connectionsReady++;
        if (connectionsReady === 2) resolve();
      });

      this.counselorSocket.on('connect', () => {
        console.log('✅ Counselor socket connected');
        // Join counselor room
        this.counselorSocket.emit('join-counselor-room', testCounselor._id.toString());
        connectionsReady++;
        if (connectionsReady === 2) resolve();
      });

      this.counselorSocket.on('crisis_alert', (alertData) => {
        console.log('🚨 COUNSELOR RECEIVED CRISIS ALERT:', alertData);
        this.alertsReceived++;
      });

      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  async sendCrisisMessage(testStudent) {
    console.log('📤 Sending crisis message from student...');
    
    this.socket.emit('user-message', {
      message: 'I want to kill myself',
      userId: testStudent._id.toString(),
      sessionId: `test-session-${Date.now()}`
    });

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async runTest() {
    console.log('🔥 COLLEGE-SPECIFIC CRISIS ALERT TEST');
    console.log('=====================================');

    try {
      const { testStudent, testCounselor, testCollege } = await setupTestData();
      await this.connectSockets(testStudent, testCounselor);
      await this.sendCrisisMessage(testStudent);

      console.log('\n' + '='.repeat(50));
      console.log('🏁 TEST RESULTS');
      console.log('='.repeat(50));
      console.log(`🏫 College: ${testCollege.name}`);
      console.log(`👨‍🎓 Student: ${testStudent.name}`);
      console.log(`👨‍⚕️ Counselor: ${testCounselor.name}`);
      console.log(`🚨 Crisis alerts received by counselor: ${this.alertsReceived}`);

      if (this.alertsReceived > 0) {
        console.log('\n✅ COLLEGE-SPECIFIC CRISIS ALERTS WORKING!');
        console.log('   Counselors are receiving alerts for their college students');
      } else {
        console.log('\n❌ NO CRISIS ALERTS RECEIVED');
        console.log('   Check server logs and socket connections');
      }

    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    if (this.socket) this.socket.close();
    if (this.counselorSocket) this.counselorSocket.close();
    mongoose.connection.close();
  }
}

// Helper function to setup test data
async function setupTestData() {
  console.log('🏗️ Setting up test data...');
  
  // Create test college
  let testCollege = await College.findOne({ code: 'TEST' });
  if (!testCollege) {
    testCollege = new College({
      name: 'Test University',
      code: 'TEST',
      address: '123 Test Street',
      contactEmail: 'admin@test.edu'
    });
    await testCollege.save();
  }

  // Create test student
  let testStudent = await User.findOne({ email: 'student@test.com' });
  if (!testStudent) {
    testStudent = new User({
      name: 'Test Student',
      email: 'student@test.com',
      password: 'password123',
      role: 'student',
      college: testCollege._id
    });
    await testStudent.save();
  }

  // Create test counselor
  let testCounselor = await User.findOne({ email: 'counselor@test.com' });
  if (!testCounselor) {
    testCounselor = new User({
      name: 'Test Counselor',
      email: 'counselor@test.com',
      password: 'password123',
      role: 'counselor',
      college: testCollege._id,
      department: 'Psychology'
    });
    await testCounselor.save();
  }

  console.log('✅ Test data created');
  return { testStudent, testCounselor, testCollege };
}

// Run the test
if (require.main === module) {
  const tester = new CollegeCrisisTest();
  tester.runTest().catch(console.error);
}

module.exports = CollegeCrisisTest;
