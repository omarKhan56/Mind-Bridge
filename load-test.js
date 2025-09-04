#!/usr/bin/env node

const axios = require('axios');
const cluster = require('cluster');
const os = require('os');

const BASE_URL = 'http://localhost:5001';
const LOAD_CONFIG = {
  DURATION_MINUTES: 5,
  REQUESTS_PER_SECOND: 100,
  CONCURRENT_WORKERS: os.cpus().length
};

class LoadTester {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errors: {}
    };
    this.startTime = Date.now();
  }

  async makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
    const requestStart = Date.now();
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers,
        timeout: 10000
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      const responseTime = Date.now() - requestStart;
      
      this.stats.totalRequests++;
      this.stats.successfulRequests++;
      this.stats.responseTimes.push(responseTime);
      
      return { success: true, responseTime, status: response.status };
    } catch (error) {
      const responseTime = Date.now() - requestStart;
      this.stats.totalRequests++;
      this.stats.failedRequests++;
      
      const errorKey = error.response?.status || error.code || 'UNKNOWN';
      this.stats.errors[errorKey] = (this.stats.errors[errorKey] || 0) + 1;
      
      return { success: false, responseTime, error: errorKey };
    }
  }

  async runLoadTest() {
    console.log(`🚀 Starting Load Test - ${LOAD_CONFIG.REQUESTS_PER_SECOND} RPS for ${LOAD_CONFIG.DURATION_MINUTES} minutes`);
    
    const endTime = Date.now() + (LOAD_CONFIG.DURATION_MINUTES * 60 * 1000);
    const interval = 1000 / LOAD_CONFIG.REQUESTS_PER_SECOND;
    
    // Create test user first
    const testUser = await this.createTestUser();
    
    const testEndpoints = [
      { endpoint: '/api/wellness', method: 'GET', headers: { Authorization: `Bearer ${testUser.token}` }},
      { endpoint: '/api/goals', method: 'GET', headers: { Authorization: `Bearer ${testUser.token}` }},
      { endpoint: '/api/forum/posts', method: 'GET' },
      { endpoint: '/api/resources', method: 'GET' },
      { 
        endpoint: '/api/chat/message', 
        method: 'POST', 
        data: { message: 'Load test message' },
        headers: { Authorization: `Bearer ${testUser.token}` }
      }
    ];

    while (Date.now() < endTime) {
      const promises = [];
      
      for (let i = 0; i < LOAD_CONFIG.REQUESTS_PER_SECOND; i++) {
        const testCase = testEndpoints[Math.floor(Math.random() * testEndpoints.length)];
        promises.push(this.makeRequest(testCase.endpoint, testCase.method, testCase.data, testCase.headers));
        
        if (i < LOAD_CONFIG.REQUESTS_PER_SECOND - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
      
      await Promise.allSettled(promises);
      this.printProgress();
    }
    
    this.printFinalResults();
  }

  async createTestUser() {
    const userData = {
      name: 'Load Test User',
      email: `loadtest${Date.now()}@test.com`,
      password: 'password123',
      role: 'student'
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
      return { ...userData, token: response.data.token };
    } catch (error) {
      console.error('Failed to create test user:', error.message);
      process.exit(1);
    }
  }

  printProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rps = this.stats.totalRequests / elapsed;
    const successRate = (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2);
    
    process.stdout.write(`\r📊 Elapsed: ${elapsed.toFixed(1)}s | Requests: ${this.stats.totalRequests} | RPS: ${rps.toFixed(1)} | Success: ${successRate}%`);
  }

  printFinalResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 LOAD TEST RESULTS');
    console.log('='.repeat(80));
    
    const totalTime = (Date.now() - this.startTime) / 1000;
    const avgResponseTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
    const p95ResponseTime = this.stats.responseTimes.sort((a, b) => a - b)[Math.floor(this.stats.responseTimes.length * 0.95)];
    const p99ResponseTime = this.stats.responseTimes.sort((a, b) => a - b)[Math.floor(this.stats.responseTimes.length * 0.99)];
    
    console.log(`⏱️  Total Duration: ${totalTime.toFixed(2)} seconds`);
    console.log(`📈 Total Requests: ${this.stats.totalRequests}`);
    console.log(`✅ Successful: ${this.stats.successfulRequests}`);
    console.log(`❌ Failed: ${this.stats.failedRequests}`);
    console.log(`📊 Success Rate: ${(this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)}%`);
    console.log(`🚀 Average RPS: ${(this.stats.totalRequests / totalTime).toFixed(2)}`);
    console.log(`⚡ Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`📈 95th Percentile: ${p95ResponseTime}ms`);
    console.log(`📈 99th Percentile: ${p99ResponseTime}ms`);
    
    if (Object.keys(this.stats.errors).length > 0) {
      console.log('\n🔍 ERROR BREAKDOWN:');
      Object.entries(this.stats.errors).forEach(([error, count]) => {
        console.log(`  • ${error}: ${count} occurrences`);
      });
    }
    
    console.log('='.repeat(80));
  }
}

// Multi-process load testing
if (cluster.isMaster) {
  console.log(`🔥 Starting ${LOAD_CONFIG.CONCURRENT_WORKERS} worker processes`);
  
  for (let i = 0; i < LOAD_CONFIG.CONCURRENT_WORKERS; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  const loadTester = new LoadTester();
  loadTester.runLoadTest().catch(console.error);
}
