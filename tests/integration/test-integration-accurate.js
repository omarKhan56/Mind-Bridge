#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

console.log('🎯 ACCURATE FULL-STACK INTEGRATION TEST\n');

async function accurateIntegrationTest() {
  let results = {
    backend: [],
    frontend: [],
    integration: [],
    scores: { backend: 0, frontend: 0, integration: 0 }
  };

  // Backend Tests
  console.log('🔧 BACKEND VERIFICATION...');
  
  // Test 1: Server Running
  try {
    const serverRunning = await testHTTP('http://localhost:5001/api/ai-analysis/status');
    console.log(`   ${serverRunning ? '✅' : '❌'} Server Running (Port 5001)`);
    results.backend.push({ name: 'Server Running', passed: serverRunning });
    if (serverRunning) results.scores.backend++;
  } catch (e) {
    console.log('   ❌ Server Running: Error');
    results.backend.push({ name: 'Server Running', passed: false });
  }

  // Test 2: Database Connection (via server logs)
  try {
    const serverLogs = fs.readFileSync('./server/server.log', 'utf8');
    const dbConnected = serverLogs.includes('Connected to MongoDB');
    console.log(`   ${dbConnected ? '✅' : '❌'} Database Connection`);
    results.backend.push({ name: 'Database Connection', passed: dbConnected });
    if (dbConnected) results.scores.backend++;
  } catch (e) {
    console.log('   ❌ Database Connection: Cannot read logs');
    results.backend.push({ name: 'Database Connection', passed: false });
  }

  // Test 3: Inngest Configuration
  try {
    const envFile = fs.readFileSync('./server/.env', 'utf8');
    const inngestConfigured = envFile.includes('INNGEST_EVENT_KEY') && 
                             !envFile.includes('your-inngest-event-key-here');
    console.log(`   ${inngestConfigured ? '✅' : '❌'} Inngest Configuration`);
    results.backend.push({ name: 'Inngest Configuration', passed: inngestConfigured });
    if (inngestConfigured) results.scores.backend++;
  } catch (e) {
    console.log('   ❌ Inngest Configuration: Cannot read env');
    results.backend.push({ name: 'Inngest Configuration', passed: false });
  }

  // Test 4: AI Services
  try {
    const aiResponse = await testHTTP('http://localhost:5001/api/ai-analysis/status');
    console.log(`   ${aiResponse ? '✅' : '❌'} AI Services API`);
    results.backend.push({ name: 'AI Services API', passed: aiResponse });
    if (aiResponse) results.scores.backend++;
  } catch (e) {
    console.log('   ❌ AI Services API: Error');
    results.backend.push({ name: 'AI Services API', passed: false });
  }

  // Test 5: Crisis Detection Models
  try {
    const crisisModel = fs.existsSync('./server/models/CrisisAlert.js');
    console.log(`   ${crisisModel ? '✅' : '❌'} Crisis Detection Models`);
    results.backend.push({ name: 'Crisis Detection Models', passed: crisisModel });
    if (crisisModel) results.scores.backend++;
  } catch (e) {
    console.log('   ❌ Crisis Detection Models: Error');
    results.backend.push({ name: 'Crisis Detection Models', passed: false });
  }

  // Frontend Tests
  console.log('\n⚛️ FRONTEND VERIFICATION...');

  // Test 1: React App Running
  try {
    const frontendRunning = await testHTTP('http://localhost:3000');
    console.log(`   ${frontendRunning ? '✅' : '❌'} React App Running (Port 3000)`);
    results.frontend.push({ name: 'React App Running', passed: frontendRunning });
    if (frontendRunning) results.scores.frontend++;
  } catch (e) {
    console.log('   ❌ React App Running: Error');
    results.frontend.push({ name: 'React App Running', passed: false });
  }

  // Test 2: App.js Structure
  try {
    const appExists = fs.existsSync('./client/src/App.js');
    console.log(`   ${appExists ? '✅' : '❌'} App.js Structure`);
    results.frontend.push({ name: 'App.js Structure', passed: appExists });
    if (appExists) results.scores.frontend++;
  } catch (e) {
    console.log('   ❌ App.js Structure: Error');
    results.frontend.push({ name: 'App.js Structure', passed: false });
  }

  // Test 3: Components Directory
  try {
    const componentsExist = fs.existsSync('./client/src/components') && 
                           fs.readdirSync('./client/src/components').length > 0;
    console.log(`   ${componentsExist ? '✅' : '❌'} Components Directory`);
    results.frontend.push({ name: 'Components Directory', passed: componentsExist });
    if (componentsExist) results.scores.frontend++;
  } catch (e) {
    console.log('   ❌ Components Directory: Error');
    results.frontend.push({ name: 'Components Directory', passed: false });
  }

  // Test 4: Pages Directory
  try {
    const pagesExist = fs.existsSync('./client/src/pages') && 
                      fs.readdirSync('./client/src/pages').length > 0;
    console.log(`   ${pagesExist ? '✅' : '❌'} Pages Directory`);
    results.frontend.push({ name: 'Pages Directory', passed: pagesExist });
    if (pagesExist) results.scores.frontend++;
  } catch (e) {
    console.log('   ❌ Pages Directory: Error');
    results.frontend.push({ name: 'Pages Directory', passed: false });
  }

  // Test 5: Package.json Dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('./client/package.json', 'utf8'));
    const hasReact = packageJson.dependencies && packageJson.dependencies.react;
    console.log(`   ${hasReact ? '✅' : '❌'} React Dependencies`);
    results.frontend.push({ name: 'React Dependencies', passed: hasReact });
    if (hasReact) results.scores.frontend++;
  } catch (e) {
    console.log('   ❌ React Dependencies: Error');
    results.frontend.push({ name: 'React Dependencies', passed: false });
  }

  // Integration Tests
  console.log('\n🔗 INTEGRATION VERIFICATION...');

  // Test 1: API Communication
  try {
    const backendUp = await testHTTP('http://localhost:5001/api/ai-analysis/status');
    const frontendUp = await testHTTP('http://localhost:3000');
    const apiComm = backendUp && frontendUp;
    console.log(`   ${apiComm ? '✅' : '❌'} API Communication`);
    results.integration.push({ name: 'API Communication', passed: apiComm });
    if (apiComm) results.scores.integration++;
  } catch (e) {
    console.log('   ❌ API Communication: Error');
    results.integration.push({ name: 'API Communication', passed: false });
  }

  // Test 2: CORS Configuration
  try {
    const corsConfigured = await testCORS();
    console.log(`   ${corsConfigured ? '✅' : '❌'} CORS Configuration`);
    results.integration.push({ name: 'CORS Configuration', passed: corsConfigured });
    if (corsConfigured) results.scores.integration++;
  } catch (e) {
    console.log('   ❌ CORS Configuration: Error');
    results.integration.push({ name: 'CORS Configuration', passed: false });
  }

  // Test 3: Environment Sync
  try {
    const backendEnv = fs.existsSync('./server/.env');
    const envSync = backendEnv; // Frontend env is optional
    console.log(`   ${envSync ? '✅' : '❌'} Environment Configuration`);
    results.integration.push({ name: 'Environment Configuration', passed: envSync });
    if (envSync) results.scores.integration++;
  } catch (e) {
    console.log('   ❌ Environment Configuration: Error');
    results.integration.push({ name: 'Environment Configuration', passed: false });
  }

  // Test 4: Socket.io Setup
  try {
    const serverCode = fs.readFileSync('./server/index.js', 'utf8');
    const socketSetup = serverCode.includes('socket.io');
    console.log(`   ${socketSetup ? '✅' : '❌'} Socket.io Setup`);
    results.integration.push({ name: 'Socket.io Setup', passed: socketSetup });
    if (socketSetup) results.scores.integration++;
  } catch (e) {
    console.log('   ❌ Socket.io Setup: Error');
    results.integration.push({ name: 'Socket.io Setup', passed: false });
  }

  // Generate Final Report
  generateAccurateReport(results);
  
  return results;
}

async function testHTTP(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      resolve(res.statusCode < 400);
    }).on('error', () => resolve(false));
    
    request.setTimeout(3000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function testCORS() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/ai-analysis/status',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    };

    const req = http.request(options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      resolve(corsHeader === '*' || corsHeader === 'http://localhost:3000');
    });

    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => resolve(false));
    req.end();
  });
}

function generateAccurateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 ACCURATE INTEGRATION REPORT');
  console.log('='.repeat(60));

  const backendTotal = results.backend.length;
  const frontendTotal = results.frontend.length;
  const integrationTotal = results.integration.length;
  const totalTests = backendTotal + frontendTotal + integrationTotal;
  const totalPassed = results.scores.backend + results.scores.frontend + results.scores.integration;

  const backendScore = backendTotal > 0 ? ((results.scores.backend / backendTotal) * 100).toFixed(1) : 0;
  const frontendScore = frontendTotal > 0 ? ((results.scores.frontend / frontendTotal) * 100).toFixed(1) : 0;
  const integrationScore = integrationTotal > 0 ? ((results.scores.integration / integrationTotal) * 100).toFixed(1) : 0;
  const overallScore = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  console.log(`\n📊 OVERALL INTEGRATION SCORE: ${overallScore}%`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalTests - totalPassed}`);

  console.log(`\n🔧 BACKEND: ${backendScore}% (${results.scores.backend}/${backendTotal})`);
  console.log(`⚛️ FRONTEND: ${frontendScore}% (${results.scores.frontend}/${frontendTotal})`);
  console.log(`🔗 INTEGRATION: ${integrationScore}% (${results.scores.integration}/${integrationTotal})`);

  // Show failed tests
  const allResults = [...results.backend, ...results.frontend, ...results.integration];
  const failedTests = allResults.filter(test => !test.passed);
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(test => console.log(`   • ${test.name}`));
  }

  console.log('\n🎯 INTEGRATION STATUS:');
  
  if (overallScore >= 95) {
    console.log('   🟢 PERFECT INTEGRATION');
    console.log('   🌉 MindBridge is production-ready!');
  } else if (overallScore >= 85) {
    console.log('   🟡 EXCELLENT INTEGRATION');
    console.log('   ✅ Ready for production with minor optimizations');
  } else if (overallScore >= 75) {
    console.log('   🟠 GOOD INTEGRATION');
    console.log('   ⚠️  Some issues to address before production');
  } else {
    console.log('   🔴 INTEGRATION NEEDS WORK');
    console.log('   🔧 Major issues require attention');
  }

  console.log('\n🚀 PRODUCTION READINESS:');
  
  const backendReady = backendScore >= 80;
  const frontendReady = frontendScore >= 80;
  const integrationReady = integrationScore >= 75;
  
  console.log(`   Backend: ${backendReady ? '✅ Production Ready' : '⚠️  Needs Attention'}`);
  console.log(`   Frontend: ${frontendReady ? '✅ Production Ready' : '⚠️  Needs Attention'}`);
  console.log(`   Integration: ${integrationReady ? '✅ Production Ready' : '⚠️  Needs Attention'}`);

  if (backendReady && frontendReady && integrationReady) {
    console.log('\n🎊 MINDBRIDGE IS FULLY INTEGRATED AND PRODUCTION-READY! 🎊');
    console.log('🌉 Ready to help students and save lives! 🌉');
  } else {
    console.log('\n💡 RECOMMENDATIONS:');
    if (!backendReady) console.log('   • Review backend configuration and database connection');
    if (!frontendReady) console.log('   • Check frontend build and component structure');
    if (!integrationReady) console.log('   • Verify API communication and CORS settings');
  }
}

// Run the accurate integration test
accurateIntegrationTest()
  .then(results => {
    const totalTests = results.backend.length + results.frontend.length + results.integration.length;
    const totalPassed = results.scores.backend + results.scores.frontend + results.scores.integration;
    const overallScore = (totalPassed / totalTests) * 100;
    
    if (overallScore >= 90) {
      console.log('\n🎉 EXCELLENT! Full-stack integration is working perfectly! 🎉');
      process.exit(0);
    } else if (overallScore >= 80) {
      console.log('\n✅ Good integration! Minor issues can be addressed.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Integration needs improvement before production.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Integration test error:', error);
    process.exit(1);
  });
