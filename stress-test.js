#!/usr/bin/env node

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:5001';
const WS_URL = 'ws://localhost:5001';

// Test configuration
const STRESS_CONFIG = {
  CONCURRENT_USERS: 50,
  MESSAGES_PER_USER: 20,
  SCREENING_TESTS: 100,
  APPOINTMENT_BOOKINGS: 30,
  FORUM_POSTS: 50
};

class MindBridgeStressTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.tokens = [];
    this.users = [];
  }

  log(message, type = 'INFO') {
    console.log(`[${new Date().toISOString()}] ${type}: ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`Starting: ${name}`);
      await testFn();
      this.results.passed++;
      this.log(`✅ PASSED: ${name}`, 'PASS');
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: name, error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, 'FAIL');
    }
  }

  // 1. Authentication Stress Test
  async testMassUserRegistration() {
    const promises = [];
    for (let i = 0; i < STRESS_CONFIG.CONCURRENT_USERS; i++) {
      promises.push(this.registerUser(i));
    }
    await Promise.all(promises);
    this.log(`Created ${this.users.length} users`);
  }

  async registerUser(id) {
    const userData = {
      name: `Test User ${id}`,
      email: `testuser${id}@test.com`,
      password: 'password123',
      role: 'student',
      studentId: `STU${id.toString().padStart(6, '0')}`
    };

    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
    this.users.push({ id, ...userData, token: response.data.token });
    this.tokens.push(response.data.token);
  }

  // 2. AI Chat Stress Test
  async testAIChatFlood() {
    const promises = [];
    const stressMessages = [
      "I'm feeling very anxious about my exams",
      "I can't sleep and feel overwhelmed",
      "I'm having thoughts of self-harm",
      "Everything feels hopeless",
      "I need help with depression",
      "I'm stressed about my future",
      "I feel isolated and alone",
      "My anxiety is getting worse",
      "I'm having panic attacks",
      "I need someone to talk to"
    ];

    for (let i = 0; i < STRESS_CONFIG.CONCURRENT_USERS; i++) {
      if (this.tokens[i]) {
        promises.push(this.sendMultipleMessages(this.tokens[i], stressMessages, i));
      }
    }

    await Promise.all(promises);
  }

  async sendMultipleMessages(token, messages, userId) {
    for (let i = 0; i < STRESS_CONFIG.MESSAGES_PER_USER; i++) {
      const message = messages[i % messages.length] + ` (User ${userId}, Message ${i})`;
      await axios.post(`${BASE_URL}/api/chat/message`, 
        { message },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
  }

  // 3. Mental Health Screening Stress Test
  async testMassScreening() {
    const promises = [];
    const screeningData = {
      phq9: [2, 1, 3, 2, 1, 2, 3, 1, 2], // Depression screening
      gad7: [1, 2, 1, 3, 2, 1, 2], // Anxiety screening
      ghq12: [1, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 2] // General health
    };

    for (let i = 0; i < STRESS_CONFIG.SCREENING_TESTS; i++) {
      const token = this.tokens[i % this.tokens.length];
      if (token) {
        promises.push(this.submitScreening(token, screeningData, i));
      }
    }

    await Promise.all(promises);
  }

  async submitScreening(token, data, testId) {
    // Randomize scores for variety
    const randomizedData = {
      phq9: data.phq9.map(score => Math.floor(Math.random() * 4)),
      gad7: data.gad7.map(score => Math.floor(Math.random() * 4)),
      ghq12: data.ghq12.map(score => Math.floor(Math.random() * 4))
    };

    await axios.post(`${BASE_URL}/api/auth/screening`, randomizedData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // 4. Database Stress Test
  async testDatabaseOperations() {
    const promises = [];
    
    // Concurrent wellness entries
    for (let i = 0; i < 100; i++) {
      const token = this.tokens[i % this.tokens.length];
      if (token) {
        promises.push(this.createWellnessEntry(token));
      }
    }

    // Concurrent goal creation
    for (let i = 0; i < 50; i++) {
      const token = this.tokens[i % this.tokens.length];
      if (token) {
        promises.push(this.createGoal(token, i));
      }
    }

    await Promise.all(promises);
  }

  async createWellnessEntry(token) {
    const wellnessData = {
      mood: Math.floor(Math.random() * 10) + 1,
      stress: Math.floor(Math.random() * 10) + 1,
      sleep: Math.floor(Math.random() * 12) + 1,
      notes: `Stress test wellness entry ${Date.now()}`
    };

    await axios.post(`${BASE_URL}/api/wellness`, wellnessData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async createGoal(token, id) {
    const goalData = {
      title: `Stress Test Goal ${id}`,
      description: `This is a stress test goal created at ${new Date().toISOString()}`,
      category: ['academic', 'health', 'social', 'personal'][Math.floor(Math.random() * 4)],
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    await axios.post(`${BASE_URL}/api/goals`, goalData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // 5. WebSocket Stress Test
  async testWebSocketConnections() {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(this.createWebSocketConnection(i));
    }
    await Promise.all(promises);
  }

  async createWebSocketConnection(id) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;

      ws.on('open', () => {
        // Send rapid messages
        const interval = setInterval(() => {
          if (messageCount < 10) {
            ws.send(JSON.stringify({
              type: 'chat',
              message: `WebSocket stress test message ${messageCount} from connection ${id}`
            }));
            messageCount++;
          } else {
            clearInterval(interval);
            ws.close();
          }
        }, 100);
      });

      ws.on('close', () => resolve());
      ws.on('error', reject);

      setTimeout(() => {
        ws.close();
        resolve();
      }, 5000);
    });
  }

  // 6. API Rate Limiting Test
  async testRateLimiting() {
    const token = this.tokens[0];
    const promises = [];

    // Rapid fire requests to test rate limiting
    for (let i = 0; i < 200; i++) {
      promises.push(
        axios.get(`${BASE_URL}/api/wellness`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => {
          if (err.response?.status === 429) {
            this.log(`Rate limiting working: ${err.response.status}`);
          }
        })
      );
    }

    await Promise.allSettled(promises);
  }

  // 7. Memory and Performance Test
  async testLargeDataOperations() {
    const token = this.tokens[0];
    
    // Create large forum posts
    const largeContent = 'A'.repeat(10000); // 10KB content
    
    for (let i = 0; i < 10; i++) {
      await axios.post(`${BASE_URL}/api/forum/posts`, {
        title: `Large Post ${i}`,
        content: largeContent,
        category: 'general',
        anonymous: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  }

  // 8. Error Handling Test
  async testErrorScenarios() {
    const invalidToken = 'invalid.jwt.token';
    
    // Test invalid authentication
    try {
      await axios.get(`${BASE_URL}/api/wellness`, {
        headers: { Authorization: `Bearer ${invalidToken}` }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        this.log('✅ Invalid token properly rejected');
      }
    }

    // Test malformed requests
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        invalidField: 'test'
      });
    } catch (error) {
      if (error.response?.status >= 400) {
        this.log('✅ Malformed request properly rejected');
      }
    }
  }

  // 9. Crisis Detection Test
  async testCrisisDetection() {
    const crisisMessages = [
      "I want to kill myself",
      "I'm going to end it all",
      "I can't take this anymore, I want to die",
      "Nobody would miss me if I was gone",
      "I have a plan to hurt myself"
    ];

    const token = this.tokens[0];
    
    for (const message of crisisMessages) {
      await axios.post(`${BASE_URL}/api/chat/message`, 
        { message },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 10. Admin Dashboard Stress Test
  async testAdminOperations() {
    // Create admin user
    const adminData = {
      name: 'Admin Test User',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'admin'
    };

    const adminResponse = await axios.post(`${BASE_URL}/api/auth/register`, adminData);
    const adminToken = adminResponse.data.token;

    // Test admin analytics
    await axios.get(`${BASE_URL}/api/ai-analysis/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Test admin user management
    await axios.get(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting MindBridge Stress Test Suite');
    this.log(`Configuration: ${JSON.stringify(STRESS_CONFIG, null, 2)}`);

    await this.test('Mass User Registration', () => this.testMassUserRegistration());
    await this.test('AI Chat Flood Test', () => this.testAIChatFlood());
    await this.test('Mass Mental Health Screening', () => this.testMassScreening());
    await this.test('Database Operations Stress', () => this.testDatabaseOperations());
    await this.test('WebSocket Connections', () => this.testWebSocketConnections());
    await this.test('API Rate Limiting', () => this.testRateLimiting());
    await this.test('Large Data Operations', () => this.testLargeDataOperations());
    await this.test('Error Handling', () => this.testErrorScenarios());
    await this.test('Crisis Detection', () => this.testCrisisDetection());
    await this.test('Admin Operations', () => this.testAdminOperations());

    this.printResults();
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 STRESS TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`📊 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🔍 FAILED TESTS:');
      this.results.errors.forEach(error => {
        console.log(`  • ${error.test}: ${error.error}`);
      });
    }

    console.log(`\n📈 PERFORMANCE METRICS:`);
    console.log(`  • Users Created: ${this.users.length}`);
    console.log(`  • Total Messages Sent: ${STRESS_CONFIG.CONCURRENT_USERS * STRESS_CONFIG.MESSAGES_PER_USER}`);
    console.log(`  • Screening Tests: ${STRESS_CONFIG.SCREENING_TESTS}`);
    console.log('='.repeat(60));
  }
}

// Run the stress test
if (require.main === module) {
  const tester = new MindBridgeStressTester();
  tester.runAllTests().catch(console.error);
}

module.exports = MindBridgeStressTester;
