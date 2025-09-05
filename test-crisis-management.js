#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5001';

class CrisisManagementTester {
  constructor() {
    this.adminSocket = null;
    this.counselorSocket = null;
    this.testResults = {
      sampleDataCreation: false,
      crisisAlertsLoaded: false,
      acknowledgeWorkflow: false,
      resolveWorkflow: false,
      realTimeNotifications: false
    };
  }

  async runTest() {
    console.log('🧪 TESTING CRISIS MANAGEMENT SYSTEM\n');
    console.log('=' .repeat(50));

    try {
      // Test 1: Create sample crisis data
      await this.testSampleDataCreation();
      
      // Test 2: Load crisis alerts
      await this.testCrisisAlertsLoading();
      
      // Test 3: Test acknowledge workflow
      await this.testAcknowledgeWorkflow();
      
      // Test 4: Test resolve workflow  
      await this.testResolveWorkflow();
      
      // Test 5: Test real-time notifications
      await this.testRealTimeNotifications();
      
      // Show final results
      this.showTestResults();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  async testSampleDataCreation() {
    console.log('\n📊 TEST 1: Sample Data Creation');
    console.log('-'.repeat(30));
    
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/create-sample-crisis-data`, {}, {
        headers: { 
          'Authorization': 'Bearer demo-admin-token',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Sample crisis data created successfully');
      console.log(`   Created: ${response.data.count} crisis alerts`);
      this.testResults.sampleDataCreation = true;
      
    } catch (error) {
      console.log('❌ Sample data creation failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   💡 Make sure the server is running on port 5001');
      }
    }
  }

  async testCrisisAlertsLoading() {
    console.log('\n🚨 TEST 2: Crisis Alerts Loading');
    console.log('-'.repeat(30));
    
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/crisis-alerts`, {
        headers: { 
          'Authorization': 'Bearer demo-admin-token'
        },
        timeout: 10000
      });
      
      console.log('✅ Crisis alerts loaded successfully');
      console.log(`   Found: ${response.data.length} active alerts`);
      
      if (response.data.length > 0) {
        const alert = response.data[0];
        console.log(`   Sample Alert:`);
        console.log(`     ID: ${alert._id}`);
        console.log(`     Student: ${alert.studentId}`);
        console.log(`     Risk Level: ${alert.riskLevel}`);
        console.log(`     Status: ${alert.status}`);
        console.log(`     College: ${alert.college}`);
        
        this.latestAlertId = alert._id;
        this.testResults.crisisAlertsLoaded = true;
      }
      
    } catch (error) {
      console.log('❌ Crisis alerts loading failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testAcknowledgeWorkflow() {
    console.log('\n👨‍💼 TEST 3: Acknowledge Workflow');
    console.log('-'.repeat(30));
    
    if (!this.latestAlertId) {
      console.log('⚠️  No alert ID available for testing');
      return;
    }
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/admin/crisis-alerts/${this.latestAlertId}/respond`,
        { action: 'acknowledge' },
        {
          headers: { 
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Crisis alert acknowledged successfully');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Counselors Notified: ${response.data.counselorsNotified}`);
      this.testResults.acknowledgeWorkflow = true;
      
    } catch (error) {
      console.log('❌ Acknowledge workflow failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testResolveWorkflow() {
    console.log('\n✅ TEST 4: Resolve Workflow');
    console.log('-'.repeat(30));
    
    if (!this.latestAlertId) {
      console.log('⚠️  No alert ID available for testing');
      return;
    }
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/admin/crisis-alerts/${this.latestAlertId}/respond`,
        { action: 'resolve' },
        {
          headers: { 
            'Authorization': 'Bearer demo-admin-token',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Crisis alert resolved successfully');
      console.log(`   Message: ${response.data.message}`);
      this.testResults.resolveWorkflow = true;
      
    } catch (error) {
      console.log('❌ Resolve workflow failed');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testRealTimeNotifications() {
    console.log('\n🔔 TEST 5: Real-time Notifications');
    console.log('-'.repeat(30));
    
    return new Promise((resolve) => {
      let adminConnected = false;
      let counselorConnected = false;
      
      // Test admin socket
      this.adminSocket = io(`${BASE_URL}/admin`, {
        auth: { token: 'demo-admin-token' },
        timeout: 5000
      });
      
      this.adminSocket.on('connect', () => {
        console.log('✅ Admin socket connected');
        adminConnected = true;
        checkCompletion();
      });
      
      this.adminSocket.on('crisis-alert', (data) => {
        console.log('🚨 Admin received crisis alert:');
        console.log(`   Type: ${data.type}`);
        console.log(`   Student: ${data.student?.name}`);
        this.testResults.realTimeNotifications = true;
      });
      
      this.adminSocket.on('connect_error', (error) => {
        console.log('⚠️  Admin socket connection failed');
        adminConnected = true; // Mark as done to continue
        checkCompletion();
      });
      
      // Test counselor socket
      this.counselorSocket = io(BASE_URL, {
        auth: { token: 'demo-counselor-token' },
        timeout: 5000
      });
      
      this.counselorSocket.on('connect', () => {
        console.log('✅ Counselor socket connected');
        counselorConnected = true;
        checkCompletion();
      });
      
      this.counselorSocket.on('crisis-alert', (data) => {
        console.log('🚨 Counselor received crisis alert:');
        console.log(`   Type: ${data.type}`);
        console.log(`   Student: ${data.student?.name}`);
      });
      
      this.counselorSocket.on('connect_error', (error) => {
        console.log('⚠️  Counselor socket connection failed');
        counselorConnected = true; // Mark as done to continue
        checkCompletion();
      });
      
      function checkCompletion() {
        if (adminConnected && counselorConnected) {
          setTimeout(() => {
            console.log('✅ Real-time notification test completed');
            resolve();
          }, 2000);
        }
      }
      
      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('⏰ Real-time notification test timed out');
        resolve();
      }, 10000);
    });
  }

  showTestResults() {
    console.log('\n📋 CRISIS MANAGEMENT TEST RESULTS');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'Sample Data Creation', result: this.testResults.sampleDataCreation },
      { name: 'Crisis Alerts Loading', result: this.testResults.crisisAlertsLoaded },
      { name: 'Acknowledge Workflow', result: this.testResults.acknowledgeWorkflow },
      { name: 'Resolve Workflow', result: this.testResults.resolveWorkflow },
      { name: 'Real-time Notifications', result: this.testResults.realTimeNotifications }
    ];
    
    let passedTests = 0;
    
    tests.forEach((test, index) => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${test.name}: ${status}`);
      if (test.result) passedTests++;
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Passed: ${passedTests}/${tests.length} tests`);
    console.log(`   Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
    
    if (passedTests === tests.length) {
      console.log('\n🎉 ALL TESTS PASSED! Crisis Management System is OPERATIONAL');
    } else {
      console.log('\n⚠️  Some tests failed. Check server status and configuration.');
    }
    
    console.log('\n💡 MANUAL TESTING INSTRUCTIONS:');
    console.log('1. Open http://localhost:3000/admin');
    console.log('2. Go to Crisis Management tab');
    console.log('3. Click "Create Sample Data" button');
    console.log('4. Test Acknowledge/Resolve buttons');
    console.log('5. Check real-time notifications');
  }

  cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.adminSocket) {
      this.adminSocket.disconnect();
    }
    
    if (this.counselorSocket) {
      this.counselorSocket.disconnect();
    }
    
    console.log('✅ Cleanup completed');
  }
}

// Run the test
const tester = new CrisisManagementTester();
tester.runTest().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
