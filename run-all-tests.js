#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      stress: null,
      load: null,
      security: null
    };
  }

  log(message, type = 'INFO') {
    console.log(`[${new Date().toISOString()}] ${type}: ${message}`);
  }

  async runTest(testName, scriptPath) {
    return new Promise((resolve, reject) => {
      this.log(`🚀 Starting ${testName} test...`);
      
      const child = spawn('node', [scriptPath], {
        stdio: 'inherit',
        cwd: __dirname
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.log(`✅ ${testName} test completed successfully`);
          resolve({ success: true, code });
        } else {
          this.log(`❌ ${testName} test failed with code ${code}`, 'ERROR');
          resolve({ success: false, code });
        }
      });

      child.on('error', (error) => {
        this.log(`❌ ${testName} test error: ${error.message}`, 'ERROR');
        reject(error);
      });
    });
  }

  async checkServerHealth() {
    const axios = require('axios');
    try {
      await axios.get('http://localhost:5001/api/health', { timeout: 5000 });
      return true;
    } catch (error) {
      this.log('❌ Server health check failed. Make sure the server is running on port 5001', 'ERROR');
      return false;
    }
  }

  async runAllTests() {
    console.log('🔥 MINDBRIDGE COMPREHENSIVE TEST SUITE 🔥');
    console.log('='.repeat(60));
    
    // Check if server is running
    const serverHealthy = await this.checkServerHealth();
    if (!serverHealthy) {
      console.log('\n❌ Please start the MindBridge server first:');
      console.log('   npm run dev');
      process.exit(1);
    }

    this.log('✅ Server is running and healthy');
    
    // Run tests sequentially to avoid conflicts
    try {
      // 1. Security Test (least resource intensive)
      this.results.security = await this.runTest('Security Penetration', './security-test.js');
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Stress Test (medium resource usage)
      this.results.stress = await this.runTest('Stress', './stress-test.js');
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Load Test (highest resource usage)
      this.results.load = await this.runTest('Load', './load-test.js');
      
    } catch (error) {
      this.log(`Test execution error: ${error.message}`, 'ERROR');
    }

    this.printFinalReport();
  }

  printFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🏆 FINAL TEST REPORT - MINDBRIDGE SYSTEM');
    console.log('='.repeat(80));
    
    const tests = [
      { name: 'Security Penetration Test', result: this.results.security },
      { name: 'Stress Test', result: this.results.stress },
      { name: 'Load Test', result: this.results.load }
    ];

    let totalPassed = 0;
    let totalTests = tests.length;

    tests.forEach(test => {
      const status = test.result?.success ? '✅ PASSED' : '❌ FAILED';
      const code = test.result?.code !== undefined ? ` (Exit Code: ${test.result.code})` : '';
      console.log(`${status} ${test.name}${code}`);
      
      if (test.result?.success) totalPassed++;
    });

    console.log('\n📊 OVERALL RESULTS:');
    console.log(`   Tests Passed: ${totalPassed}/${totalTests}`);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (totalPassed === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! MindBridge is performing excellently! 🎉');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the logs above for details.');
    }

    console.log('\n🔍 SYSTEM STRESS TEST SUMMARY:');
    console.log('   • Authentication & Authorization');
    console.log('   • AI Chat System Load');
    console.log('   • Database Operations');
    console.log('   • WebSocket Connections');
    console.log('   • Mental Health Screening');
    console.log('   • Crisis Detection');
    console.log('   • Security Vulnerabilities');
    console.log('   • Rate Limiting');
    console.log('   • Error Handling');
    console.log('   • Performance Under Load');
    
    console.log('='.repeat(80));
  }
}

// Run all tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;
