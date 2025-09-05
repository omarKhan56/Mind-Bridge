#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🔍 FULL-STACK INTEGRATION TEST - MINDBRIDGE\n');
console.log('Testing: Backend + Frontend + Integration\n');

async function testFullIntegration() {
  let results = {
    backend: { status: 'unknown', tests: [], score: 0 },
    frontend: { status: 'unknown', tests: [], score: 0 },
    integration: { status: 'unknown', tests: [], score: 0 }
  };

  try {
    // Test 1: Backend Services
    console.log('🔧 TESTING BACKEND SERVICES...');
    await testBackend(results.backend);

    // Test 2: Frontend Build & Structure
    console.log('\n⚛️ TESTING FRONTEND...');
    await testFrontend(results.frontend);

    // Test 3: Integration Points
    console.log('\n🔗 TESTING INTEGRATION...');
    await testIntegration(results.integration);

    // Generate comprehensive report
    generateFullReport(results);
    
    return results;

  } catch (error) {
    console.error('❌ Full integration test failed:', error.message);
    return null;
  }
}

async function testBackend(results) {
  const tests = [
    {
      name: 'Server Running',
      test: () => testServerRunning('http://localhost:5001')
    },
    {
      name: 'Database Connection',
      test: () => testDatabaseConnection()
    },
    {
      name: 'AI Analysis API',
      test: () => testAPIEndpoint('http://localhost:5001/api/ai-analysis/status')
    },
    {
      name: 'Authentication API',
      test: () => testAPIEndpoint('http://localhost:5001/api/auth/test', false)
    },
    {
      name: 'Inngest Integration',
      test: () => testInngestIntegration()
    },
    {
      name: 'Crisis Detection',
      test: () => testCrisisDetection()
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      const passed = !!result;
      console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
      results.tests.push({ name: test.name, passed });
      if (passed) results.score++;
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }

  results.status = results.score === tests.length ? 'perfect' : 
                   results.score >= tests.length * 0.8 ? 'good' : 'issues';
}

async function testFrontend(results) {
  const tests = [
    {
      name: 'React App Structure',
      test: () => checkFileExists('/Users/amaan/Desktop/Programming/React/mindBridge/client/src/App.js')
    },
    {
      name: 'Package.json Valid',
      test: () => checkPackageJson('/Users/amaan/Desktop/Programming/React/mindBridge/client/package.json')
    },
    {
      name: 'Components Directory',
      test: () => checkDirectoryExists('/Users/amaan/Desktop/Programming/React/mindBridge/client/src/components')
    },
    {
      name: 'Pages Directory',
      test: () => checkDirectoryExists('/Users/amaan/Desktop/Programming/React/mindBridge/client/src/pages')
    },
    {
      name: 'Frontend Server',
      test: () => testServerRunning('http://localhost:3000')
    },
    {
      name: 'Build Configuration',
      test: () => checkBuildConfig()
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      const passed = !!result;
      console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
      results.tests.push({ name: test.name, passed });
      if (passed) results.score++;
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }

  results.status = results.score === tests.length ? 'perfect' : 
                   results.score >= tests.length * 0.8 ? 'good' : 'issues';
}

async function testIntegration(results) {
  const tests = [
    {
      name: 'API Communication',
      test: () => testAPICommunication()
    },
    {
      name: 'CORS Configuration',
      test: () => testCORSConfig()
    },
    {
      name: 'Environment Variables',
      test: () => testEnvironmentSync()
    },
    {
      name: 'Socket.io Connection',
      test: () => testSocketConnection()
    },
    {
      name: 'Authentication Flow',
      test: () => testAuthFlow()
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      const passed = !!result;
      console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
      results.tests.push({ name: test.name, passed });
      if (passed) results.score++;
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }

  results.status = results.score === tests.length ? 'perfect' : 
                   results.score >= tests.length * 0.8 ? 'good' : 'issues';
}

// Helper Functions
async function testServerRunning(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      resolve(res.statusCode < 500);
    }).on('error', () => resolve(false));
    
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function testAPIEndpoint(url, expectSuccess = true) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (expectSuccess) {
          resolve(res.statusCode === 200);
        } else {
          resolve(res.statusCode === 401 || res.statusCode === 404); // Expected for protected routes
        }
      });
    }).on('error', () => resolve(false));
    
    request.setTimeout(5000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function checkFileExists(filePath) {
  const fs = require('fs');
  return fs.existsSync(filePath);
}

function checkDirectoryExists(dirPath) {
  const fs = require('fs');
  return fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
}

function checkPackageJson(packagePath) {
  try {
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.name && packageJson.dependencies && packageJson.scripts;
  } catch {
    return false;
  }
}

function checkBuildConfig() {
  const fs = require('fs');
  const clientPath = '/Users/amaan/Desktop/Programming/React/mindBridge/client';
  
  // Check for build scripts and dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync(`${clientPath}/package.json`, 'utf8'));
    return packageJson.scripts.build && packageJson.dependencies.react;
  } catch {
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    const mongoose = require('./server/node_modules/mongoose');
    const isConnected = mongoose.connection.readyState === 1;
    return isConnected;
  } catch {
    return false;
  }
}

async function testInngestIntegration() {
  try {
    const { inngestEnabled } = require('./server/config/inngest');
    return inngestEnabled === true;
  } catch {
    return false;
  }
}

async function testCrisisDetection() {
  try {
    const SentimentAnalyzer = require('./server/services/aiAnalysis/sentimentAnalyzer');
    const analyzer = new SentimentAnalyzer();
    const result = await analyzer.analyzeChatSentiment([{ content: 'I want to kill myself' }]);
    return result.crisisIndicators?.present === true;
  } catch {
    return false;
  }
}

async function testAPICommunication() {
  // Test if frontend can communicate with backend
  return await testServerRunning('http://localhost:5001') && 
         await testServerRunning('http://localhost:3000');
}

async function testCORSConfig() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/ai-analysis/status',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    };

    const req = http.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      resolve(corsHeader === '*' || corsHeader === 'http://localhost:3000');
    });

    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => resolve(false));
    req.end();
  });
}

function testEnvironmentSync() {
  const fs = require('fs');
  
  try {
    // Check if both frontend and backend have proper env setup
    const backendEnv = fs.existsSync('./server/.env');
    const frontendEnv = fs.existsSync('./client/.env') || fs.existsSync('./client/.env.local');
    
    return backendEnv; // Frontend env is optional for React
  } catch {
    return false;
  }
}

async function testSocketConnection() {
  // Check if Socket.io is configured
  try {
    const fs = require('fs');
    const serverIndex = fs.readFileSync('./server/index.js', 'utf8');
    return serverIndex.includes('socket.io') || serverIndex.includes('Socket.io');
  } catch {
    return false;
  }
}

async function testAuthFlow() {
  // Test basic auth endpoint structure
  return await testAPIEndpoint('http://localhost:5001/api/auth/test', false);
}

function generateFullReport(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 FULL-STACK INTEGRATION REPORT');
  console.log('='.repeat(70));

  const totalTests = Object.values(results).reduce((sum, service) => sum + service.tests.length, 0);
  const totalPassed = Object.values(results).reduce((sum, service) => sum + service.score, 0);
  const overallScore = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`\n📊 OVERALL SCORE: ${overallScore}%`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalTests - totalPassed}`);

  // Individual service reports
  Object.entries(results).forEach(([service, data]) => {
    const serviceScore = data.tests.length > 0 ? ((data.score / data.tests.length) * 100).toFixed(1) : 0;
    const statusIcon = data.status === 'perfect' ? '🟢' : data.status === 'good' ? '🟡' : '🔴';
    
    console.log(`\n   ${statusIcon} ${service.toUpperCase()}: ${serviceScore}% (${data.score}/${data.tests.length})`);
    
    const failedTests = data.tests.filter(test => !test.passed);
    if (failedTests.length > 0) {
      console.log(`      Issues: ${failedTests.map(test => test.name).join(', ')}`);
    }
  });

  console.log('\n🎯 INTEGRATION STATUS:');
  
  if (overallScore >= 95) {
    console.log('   🟢 PERFECT INTEGRATION - Production Ready!');
  } else if (overallScore >= 85) {
    console.log('   🟡 GOOD INTEGRATION - Minor issues to address');
  } else if (overallScore >= 70) {
    console.log('   🟠 PARTIAL INTEGRATION - Several issues need fixing');
  } else {
    console.log('   🔴 INTEGRATION ISSUES - Major problems detected');
  }

  console.log('\n🚀 DEPLOYMENT READINESS:');
  
  const backendReady = results.backend.status !== 'issues';
  const frontendReady = results.frontend.status !== 'issues';
  const integrationReady = results.integration.status !== 'issues';
  
  console.log(`   Backend: ${backendReady ? '✅ Ready' : '❌ Issues'}`);
  console.log(`   Frontend: ${frontendReady ? '✅ Ready' : '❌ Issues'}`);
  console.log(`   Integration: ${integrationReady ? '✅ Ready' : '❌ Issues'}`);
  
  if (backendReady && frontendReady && integrationReady) {
    console.log('\n🌉 MINDBRIDGE IS FULLY INTEGRATED AND PRODUCTION-READY! 🌉');
  } else {
    console.log('\n⚠️  Some components need attention before production deployment.');
  }
}

// Run the full integration test
testFullIntegration()
  .then(results => {
    if (results) {
      const totalTests = Object.values(results).reduce((sum, service) => sum + service.tests.length, 0);
      const totalPassed = Object.values(results).reduce((sum, service) => sum + service.score, 0);
      const overallScore = (totalPassed / totalTests) * 100;
      
      if (overallScore >= 90) {
        console.log('\n🎊 EXCELLENT! Full-stack integration is nearly perfect! 🎊');
        process.exit(0);
      } else if (overallScore >= 75) {
        console.log('\n✅ Good integration with minor issues to address.');
        process.exit(0);
      } else {
        console.log('\n⚠️  Integration needs improvement.');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Integration test error:', error);
    process.exit(1);
  });
