#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5001';

// Test crisis messages
const CRISIS_MESSAGES = [
  "I want to kill myself. I can't take this anymore.",
  "I'm going to end it all tonight. Nobody cares about me.",
  "I want to hurt myself. There's no point in living.",
  "I'm thinking about suicide. I feel hopeless."
];

class CrisisAlertTester {
  constructor() {
    this.studentToken = null;
    this.counselorToken = null;
    this.adminToken = null;
    this.counselorSocket = null;
    this.adminSocket = null;
  }

  async runTest() {
    console.log('🧪 Starting Crisis Alert System Test...\n');

    try {
      // Step 1: Setup test users
      await this.setupTestUsers();
      
      // Step 2: Connect counselor socket
      await this.connectCounselorSocket();
      
      // Step 3: Connect admin socket
      await this.connectAdminSocket();
      
      // Step 4: Send crisis message
      await this.sendCrisisMessage();
      
      // Step 5: Check admin dashboard
      await this.checkAdminDashboard();
      
      // Step 6: Test acknowledge workflow
      await this.testAcknowledgeWorkflow();
      
      console.log('\n✅ Crisis Alert System Test COMPLETED');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  async setupTestUsers() {
    console.log('👥 Setting up test users...');
    
    try {
      // Login as student
      const studentLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'student@test.com',
        password: 'password123'
      });
      this.studentToken = studentLogin.data.token;
      console.log('✅ Student logged in');

      // Login as counselor
      const counselorLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'counselor@test.com',
        password: 'password123'
      });
      this.counselorToken = counselorLogin.data.token;
      console.log('✅ Counselor logged in');

      // Login as admin
      const adminLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@test.com',
        password: 'password123'
      });
      this.adminToken = adminLogin.data.token;
      console.log('✅ Admin logged in');

    } catch (error) {
      console.log('⚠️  Using demo tokens (login failed)');
      this.studentToken = 'demo-student-token';
      this.counselorToken = 'demo-counselor-token';
      this.adminToken = 'demo-admin-token';
    }
  }

  async connectCounselorSocket() {
    console.log('\n🔌 Connecting counselor socket...');
    
    return new Promise((resolve) => {
      this.counselorSocket = io(BASE_URL, {
        auth: { token: this.counselorToken }
      });

      this.counselorSocket.on('connect', () => {
        console.log('✅ Counselor socket connected');
        
        // Listen for crisis alerts
        this.counselorSocket.on('crisis-alert', (data) => {
          console.log('🚨 COUNSELOR RECEIVED CRISIS ALERT:');
          console.log(`   Student: ${data.student?.id || 'Unknown'}`);
          console.log(`   Risk Level: ${data.student?.riskLevel || 'Unknown'}`);
          console.log(`   Message: ${data.message}`);
          console.log(`   Confidence: ${data.confidence}%`);
          console.log(`   Type: ${data.type}`);
        });

        resolve();
      });

      this.counselorSocket.on('connect_error', (error) => {
        console.log('⚠️  Counselor socket connection failed:', error.message);
        resolve();
      });
    });
  }

  async connectAdminSocket() {
    console.log('🔌 Connecting admin socket...');
    
    return new Promise((resolve) => {
      this.adminSocket = io(`${BASE_URL}/admin`, {
        auth: { token: this.adminToken }
      });

      this.adminSocket.on('connect', () => {
        console.log('✅ Admin socket connected');
        
        // Listen for crisis alerts
        this.adminSocket.on('crisis-alert', (data) => {
          console.log('🚨 ADMIN RECEIVED CRISIS ALERT:');
          console.log(`   Message: ${data.message}`);
          console.log(`   Student: ${data.student?.id || 'Unknown'}`);
        });

        resolve();
      });

      this.adminSocket.on('connect_error', (error) => {
        console.log('⚠️  Admin socket connection failed:', error.message);
        resolve();
      });
    });
  }

  async sendCrisisMessage() {
    console.log('\n💬 Sending crisis message...');
    
    const crisisMessage = CRISIS_MESSAGES[0];
    console.log(`Message: "${crisisMessage}"`);

    try {
      const response = await axios.post(`${BASE_URL}/api/ai-analysis/analyze-message`, {
        message: crisisMessage,
        sessionId: 'test-session-' + Date.now()
      }, {
        headers: { Authorization: `Bearer ${this.studentToken}` }
      });

      console.log('✅ Message sent for analysis');
      console.log(`   Crisis Detected: ${response.data.crisisDetected}`);
      console.log(`   Urgency Level: ${response.data.urgencyLevel}`);
      
      // Wait for real-time processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log('❌ Failed to send crisis message:', error.response?.data?.message || error.message);
    }
  }

  async checkAdminDashboard() {
    console.log('\n📊 Checking admin dashboard...');

    try {
      // Check crisis alerts
      const alertsResponse = await axios.get(`${BASE_URL}/api/admin/crisis-alerts`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      console.log(`✅ Found ${alertsResponse.data.length} crisis alerts`);
      
      if (alertsResponse.data.length > 0) {
        const latestAlert = alertsResponse.data[0];
        console.log(`   Latest Alert ID: ${latestAlert._id}`);
        console.log(`   Risk Level: ${latestAlert.riskLevel}`);
        console.log(`   Status: ${latestAlert.status}`);
        console.log(`   Student: ${latestAlert.studentId}`);
        
        this.latestAlertId = latestAlert._id;
      }

      // Check crisis stats
      const statsResponse = await axios.get(`${BASE_URL}/api/admin/crisis-stats`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      console.log(`✅ Crisis Stats:`);
      console.log(`   Active: ${statsResponse.data.active}`);
      console.log(`   Resolved Today: ${statsResponse.data.resolved}`);
      console.log(`   Critical Students: ${statsResponse.data.criticalStudents}`);

    } catch (error) {
      console.log('❌ Failed to check admin dashboard:', error.response?.data?.message || error.message);
    }
  }

  async testAcknowledgeWorkflow() {
    if (!this.latestAlertId) {
      console.log('\n⚠️  No alert ID available for acknowledge test');
      return;
    }

    console.log('\n👨‍💼 Testing acknowledge workflow...');

    try {
      const response = await axios.post(`${BASE_URL}/api/admin/crisis-alerts/${this.latestAlertId}/respond`, {
        action: 'acknowledge'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      console.log('✅ Alert acknowledged successfully');
      console.log(`   ${response.data.message}`);
      console.log(`   Counselors Notified: ${response.data.counselorsNotified}`);

      // Wait for notifications to process
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log('❌ Failed to acknowledge alert:', error.response?.data?.message || error.message);
    }
  }

  cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.counselorSocket) {
      this.counselorSocket.disconnect();
      console.log('✅ Counselor socket disconnected');
    }
    
    if (this.adminSocket) {
      this.adminSocket.disconnect();
      console.log('✅ Admin socket disconnected');
    }
  }
}

// Run the test
const tester = new CrisisAlertTester();
tester.runTest().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
