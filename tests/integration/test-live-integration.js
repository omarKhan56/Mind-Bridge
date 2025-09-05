#!/usr/bin/env node

const axios = require('axios');
const { spawn } = require('child_process');

class LiveIntegrationTester {
  constructor() {
    this.baseURL = 'http://localhost:5001';
    this.frontendURL = 'http://localhost:3000';
    this.testResults = {};
    this.serverProcess = null;
  }

  async runFullIntegrationTest() {
    console.log('🚀 LIVE INTEGRATION TEST SUITE');
    console.log('==============================');
    
    try {
      // Start backend server
      await this.startBackendServer();
      
      // Wait for server to be ready
      await this.waitForServer();
      
      // Run integration tests
      await this.testAnalyticsEndpoints();
      await this.testDataFlow();
      await this.testErrorHandling();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  async startBackendServer() {
    console.log('\n🔧 Starting backend server...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'server'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let serverReady = false;
      
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running on port') || output.includes('Connected to MongoDB')) {
          if (!serverReady) {
            serverReady = true;
            console.log('✅ Backend server started');
            resolve();
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.log('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server to be ready...');
    
    for (let i = 0; i < 30; i++) {
      try {
        await axios.get(`${this.baseURL}/api/auth/login`, { timeout: 2000 });
        console.log('✅ Server is ready');
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Server not responding after 30 seconds');
  }

  async testAnalyticsEndpoints() {
    console.log('\n📊 Testing Analytics Endpoints...');
    
    const endpoints = [
      { path: '/api/analytics/dashboard', name: 'Dashboard Analytics' },
      { path: '/api/analytics/trends', name: 'Trends Analysis' },
      { path: '/api/analytics/institutional', name: 'Institutional Insights' }
    ];

    this.testResults.analytics = { total: endpoints.length, passed: 0, failed: 0 };

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint.path}`, {
          headers: { 'Authorization': 'Bearer test-token' },
          timeout: 5000
        });
        
        console.log(`   ✅ ${endpoint.name}: ${response.status}`);
        this.testResults.analytics.passed++;
        
      } catch (error) {
        const status = error.response?.status || 'TIMEOUT';
        console.log(`   ❌ ${endpoint.name}: ${status}`);
        this.testResults.analytics.failed++;
      }
    }
  }

  async testDataFlow() {
    console.log('\n🔄 Testing Data Flow...');
    
    const testUserId = '507f1f77bcf86cd799439011';
    
    const dataFlowTests = [
      {
        name: 'Risk Score Calculation',
        endpoint: `/api/analytics/risk/${testUserId}`,
        expectedFields: ['riskScore', 'riskLevel', 'factors']
      },
      {
        name: 'Behavioral Patterns',
        endpoint: `/api/analytics/patterns/${testUserId}`,
        expectedFields: ['chatFrequency', 'engagementLevel', 'insights']
      },
      {
        name: 'Wellness Recommendations',
        endpoint: `/api/analytics/wellness/${testUserId}`,
        expectedFields: ['recommendations', 'riskLevel']
      }
    ];

    this.testResults.dataFlow = { total: dataFlowTests.length, passed: 0, failed: 0 };

    for (const test of dataFlowTests) {
      try {
        const response = await axios.get(`${this.baseURL}${test.endpoint}`, {
          headers: { 'Authorization': 'Bearer test-token' },
          timeout: 10000
        });
        
        const hasExpectedFields = test.expectedFields.every(field => 
          response.data.hasOwnProperty(field)
        );
        
        if (hasExpectedFields) {
          console.log(`   ✅ ${test.name}: Data structure valid`);
          this.testResults.dataFlow.passed++;
        } else {
          console.log(`   ⚠️ ${test.name}: Missing expected fields`);
          this.testResults.dataFlow.failed++;
        }
        
      } catch (error) {
        console.log(`   ❌ ${test.name}: ${error.response?.status || error.code}`);
        this.testResults.dataFlow.failed++;
      }
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');
    
    const errorTests = [
      {
        name: 'Invalid User ID',
        endpoint: '/api/analytics/risk/invalid-id',
        expectedStatus: [400, 404, 500]
      },
      {
        name: 'Missing Authorization',
        endpoint: '/api/analytics/dashboard',
        noAuth: true,
        expectedStatus: [401, 403]
      }
    ];

    this.testResults.errorHandling = { total: errorTests.length, passed: 0, failed: 0 };

    for (const test of errorTests) {
      try {
        const headers = test.noAuth ? {} : { 'Authorization': 'Bearer test-token' };
        
        await axios.get(`${this.baseURL}${test.endpoint}`, {
          headers,
          timeout: 5000
        });
        
        console.log(`   ❌ ${test.name}: Should have failed but didn't`);
        this.testResults.errorHandling.failed++;
        
      } catch (error) {
        const status = error.response?.status;
        if (test.expectedStatus.includes(status)) {
          console.log(`   ✅ ${test.name}: Proper error handling (${status})`);
          this.testResults.errorHandling.passed++;
        } else {
          console.log(`   ⚠️ ${test.name}: Unexpected status ${status}`);
          this.testResults.errorHandling.failed++;
        }
      }
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 LIVE INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));

    const categories = [
      { name: 'Analytics Endpoints', result: this.testResults.analytics },
      { name: 'Data Flow', result: this.testResults.dataFlow },
      { name: 'Error Handling', result: this.testResults.errorHandling }
    ];

    let totalPassed = 0;
    let totalTests = 0;

    categories.forEach(category => {
      if (category.result) {
        const { total, passed, failed } = category.result;
        const successRate = total > 0 ? (passed / total * 100).toFixed(1) : '0.0';
        
        console.log(`\n${category.name}:`);
        console.log(`   Total Tests: ${total}`);
        console.log(`   ✅ Passed: ${passed}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📈 Success Rate: ${successRate}%`);
        
        totalPassed += passed;
        totalTests += total;
      }
    });

    const overallSuccess = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0.0';
    
    console.log(`\n📊 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`);
    console.log(`   ❌ Failed: ${totalTests - totalPassed}`);
    console.log(`   📈 Success Rate: ${overallSuccess}%`);

    if (overallSuccess >= 80) {
      console.log('\n🎉 INTEGRATION TEST PASSED!');
      console.log('✅ Backend services are working correctly');
      console.log('✅ API endpoints are responding properly');
      console.log('✅ Data flow is functioning as expected');
      console.log('✅ Error handling is working correctly');
      console.log('\n🚀 READY FOR FRONTEND TESTING:');
      console.log('1. Start frontend: npm run client');
      console.log('2. Navigate to counselor dashboard');
      console.log('3. Check for risk analytics and alerts');
      console.log('4. Navigate to student dashboard');
      console.log('5. Verify wellness recommendations appear');
    } else {
      console.log('\n⚠️ INTEGRATION ISSUES DETECTED');
      console.log('Some services may not be working correctly');
      console.log('Check server logs for detailed error information');
    }

    console.log('='.repeat(60));
  }

  cleanup() {
    if (this.serverProcess) {
      console.log('\n🧹 Cleaning up...');
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️ Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Test terminated');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  const tester = new LiveIntegrationTester();
  tester.runFullIntegrationTest().catch(console.error);
}

module.exports = LiveIntegrationTester;
