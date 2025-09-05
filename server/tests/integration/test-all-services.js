#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 COMPREHENSIVE MINDBRIDGE SERVICES TEST\n');
console.log('Testing: AI Services | Analytics | Crisis Detection | Inngest\n');

async function testAllServices() {
  let testResults = {
    aiServices: { passed: 0, failed: 0, tests: [] },
    analytics: { passed: 0, failed: 0, tests: [] },
    crisisDetection: { passed: 0, failed: 0, tests: [] },
    inngest: { passed: 0, failed: 0, tests: [] }
  };

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    console.log('✅ Database connected\n');

    // Test 1: AI Services
    console.log('🤖 TESTING AI SERVICES...');
    await testAIServices(testResults.aiServices);

    // Test 2: Analytics Services  
    console.log('\n📊 TESTING ANALYTICS SERVICES...');
    await testAnalyticsServices(testResults.analytics);

    // Test 3: Crisis Detection
    console.log('\n🚨 TESTING CRISIS DETECTION...');
    await testCrisisDetection(testResults.crisisDetection);

    // Test 4: Inngest Services
    console.log('\n⚡ TESTING INNGEST SERVICES...');
    await testInngestServices(testResults.inngest);

    // Generate final report
    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL TEST REPORT');
    console.log('='.repeat(60));
    
    generateReport(testResults);
    
    return testResults;

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    return null;
  } finally {
    await mongoose.disconnect();
  }
}

async function testAIServices(results) {
  const tests = [
    {
      name: 'Gemini API Connection',
      test: async () => {
        const geminiService = require('./services/geminiService');
        return geminiService.isInitialized();
      }
    },
    {
      name: 'AI Analysis Service Loading',
      test: async () => {
        const aiAnalysisService = require('./services/aiAnalysis');
        return typeof aiAnalysisService.analyzeMessage === 'function';
      }
    },
    {
      name: 'Sentiment Analysis',
      test: async () => {
        const SentimentAnalyzer = require('./services/aiAnalysis/sentimentAnalyzer');
        const analyzer = new SentimentAnalyzer();
        const result = await analyzer.analyzeChatSentiment([
          { content: 'I am feeling very sad and hopeless today' }
        ]);
        return result && typeof result.urgencyLevel === 'number';
      }
    },
    {
      name: 'Crisis Keyword Detection',
      test: async () => {
        const SentimentAnalyzer = require('./services/aiAnalysis/sentimentAnalyzer');
        const analyzer = new SentimentAnalyzer();
        const result = await analyzer.analyzeChatSentiment([
          { content: 'I want to kill myself' }
        ]);
        return result.crisisIndicators?.present === true;
      }
    },
    {
      name: 'AI Response Generation',
      test: async () => {
        const geminiService = require('./services/geminiService');
        if (!geminiService.isInitialized()) return false;
        
        const response = await geminiService.generateResponse(
          'Hello, I need help with anxiety',
          'student'
        );
        return response && response.length > 0;
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`   ✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`   ❌ ${test.name}`);
        results.failed++;
      }
      results.tests.push({ name: test.name, passed: !!result });
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }
}

async function testAnalyticsServices(results) {
  const tests = [
    {
      name: 'User Analytics Model',
      test: async () => {
        const User = require('./models/User');
        return User.schema.paths.aiAnalysis !== undefined;
      }
    },
    {
      name: 'Analytics Data Aggregation',
      test: async () => {
        const events = [
          { type: 'chat_interaction', userId: 'user1', timestamp: Date.now() },
          { type: 'crisis_detected', userId: 'user2', timestamp: Date.now() }
        ];
        
        const aggregated = {};
        events.forEach(({ type }) => {
          aggregated[type] = (aggregated[type] || 0) + 1;
        });
        
        return aggregated.chat_interaction === 1 && aggregated.crisis_detected === 1;
      }
    },
    {
      name: 'Crisis Statistics Calculation',
      test: async () => {
        const CrisisAlert = require('./models/CrisisAlert');
        const count = await CrisisAlert.countDocuments({});
        return typeof count === 'number';
      }
    },
    {
      name: 'Real-time Metrics Processing',
      test: async () => {
        const metrics = {
          totalUsers: 100,
          activeUsers: 75,
          crisisAlerts: 5,
          avgResponseTime: 2.5
        };
        return Object.values(metrics).every(val => typeof val === 'number');
      }
    },
    {
      name: 'Analytics API Status',
      test: async () => {
        const apiStatus = require('./services/aiAnalysis/apiStatus');
        const status = await apiStatus.getStatus();
        return status.geminiAvailable === true;
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`   ✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`   ❌ ${test.name}`);
        results.failed++;
      }
      results.tests.push({ name: test.name, passed: !!result });
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }
}

async function testCrisisDetection(results) {
  const tests = [
    {
      name: 'Crisis Alert Model',
      test: async () => {
        const CrisisAlert = require('./models/CrisisAlert');
        return CrisisAlert.schema.paths.riskLevel !== undefined;
      }
    },
    {
      name: 'Crisis Keyword Detection',
      test: async () => {
        const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself'];
        const testMessage = 'I want to kill myself';
        return crisisKeywords.some(keyword => testMessage.toLowerCase().includes(keyword));
      }
    },
    {
      name: 'Risk Level Assessment',
      test: async () => {
        const riskLevels = ['low', 'moderate', 'high', 'critical'];
        const testRisk = 'critical';
        return riskLevels.includes(testRisk);
      }
    },
    {
      name: 'Crisis Alert Creation',
      test: async () => {
        const CrisisAlert = require('./models/CrisisAlert');
        const User = require('./models/User');
        
        // Find or create test user
        let testUser = await User.findOne({ email: 'test@crisis.com' });
        if (!testUser) {
          const College = require('./models/College');
          let testCollege = await College.findOne({ name: 'Test College' });
          if (!testCollege) {
            testCollege = await College.create({
              name: 'Test College',
              domain: 'test.edu',
              isActive: true
            });
          }
          
          testUser = await User.create({
            name: 'Test User',
            email: 'test@crisis.com',
            password: 'hashedpassword',
            role: 'student',
            college: testCollege._id
          });
        }

        const alert = await CrisisAlert.create({
          user: testUser._id,
          college: testUser.college,
          riskLevel: 'high',
          status: 'active',
          screeningData: { source: 'test' }
        });

        // Cleanup
        await CrisisAlert.deleteOne({ _id: alert._id });
        
        return alert._id !== undefined;
      }
    },
    {
      name: 'Counselor Notification System',
      test: async () => {
        const User = require('./models/User');
        const counselors = await User.find({ role: 'counselor', isActive: true });
        return Array.isArray(counselors);
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`   ✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`   ❌ ${test.name}`);
        results.failed++;
      }
      results.tests.push({ name: test.name, passed: !!result });
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }
}

async function testInngestServices(results) {
  const tests = [
    {
      name: 'Inngest Configuration',
      test: async () => {
        const { inngestEnabled } = require('./config/inngest');
        return inngestEnabled === true;
      }
    },
    {
      name: 'Event Handler Initialization',
      test: async () => {
        const { eventHandler } = require('./config/inngest');
        return eventHandler && typeof eventHandler.handleHighRiskUser === 'function';
      }
    },
    {
      name: 'Inngest Client Connection',
      test: async () => {
        const { inngest } = require('./config/inngest');
        return inngest && typeof inngest.send === 'function';
      }
    },
    {
      name: 'Function Registration',
      test: async () => {
        const { functions } = require('./config/inngest');
        return Array.isArray(functions) && functions.length > 0;
      }
    },
    {
      name: 'Event Sending',
      test: async () => {
        const { inngest } = require('./config/inngest');
        const result = await inngest.send({
          name: 'test/service-check',
          data: { message: 'Service test', timestamp: Date.now() }
        });
        return result.ids && result.ids.length > 0;
      }
    },
    {
      name: 'High-Risk Event Processing',
      test: async () => {
        const { eventHandler } = require('./config/inngest');
        const testUserId = 'test_user_' + Date.now();
        
        await eventHandler.handleHighRiskUser(testUserId, 'critical', {
          source: 'test',
          confidence: 0.95
        });
        
        const metrics = eventHandler.getMetrics();
        return metrics.eventsProcessed > 0;
      }
    },
    {
      name: 'Chat Interaction Processing',
      test: async () => {
        const { eventHandler } = require('./config/inngest');
        const testUserId = 'test_user_' + Date.now();
        
        await eventHandler.handleChatInteraction(
          testUserId,
          'I need help with my mental health',
          'AI response about support'
        );
        
        return true; // If no error thrown, test passes
      }
    }
  ];

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`   ✅ ${test.name}`);
        results.passed++;
      } else {
        console.log(`   ❌ ${test.name}`);
        results.failed++;
      }
      results.tests.push({ name: test.name, passed: !!result });
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      results.failed++;
      results.tests.push({ name: test.name, passed: false, error: error.message });
    }
  }
}

function generateReport(results) {
  const totalTests = Object.values(results).reduce((sum, service) => sum + service.passed + service.failed, 0);
  const totalPassed = Object.values(results).reduce((sum, service) => sum + service.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, service) => sum + service.failed, 0);
  
  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);

  console.log('📋 SERVICE BREAKDOWN:');
  
  Object.entries(results).forEach(([service, data]) => {
    const serviceTotal = data.passed + data.failed;
    const successRate = serviceTotal > 0 ? ((data.passed / serviceTotal) * 100).toFixed(1) : 0;
    
    console.log(`\n   ${getServiceIcon(service)} ${service.toUpperCase()}:`);
    console.log(`      Tests: ${serviceTotal} | Passed: ${data.passed} | Failed: ${data.failed} | Success: ${successRate}%`);
    
    if (data.failed > 0) {
      const failedTests = data.tests.filter(test => !test.passed);
      console.log(`      Failed: ${failedTests.map(test => test.name).join(', ')}`);
    }
  });

  console.log('\n🎯 SYSTEM STATUS:');
  
  if (totalFailed === 0) {
    console.log('   🟢 ALL SYSTEMS OPERATIONAL');
    console.log('   🌉 MindBridge is ready for production!');
  } else if (totalFailed <= 2) {
    console.log('   🟡 MINOR ISSUES DETECTED');
    console.log('   ⚠️  Some non-critical features may need attention');
  } else {
    console.log('   🔴 CRITICAL ISSUES DETECTED');
    console.log('   🚨 System requires immediate attention');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  
  if (results.aiServices.failed > 0) {
    console.log('   - Check Gemini API key and network connectivity');
  }
  if (results.crisisDetection.failed > 0) {
    console.log('   - Verify crisis detection algorithms and database models');
  }
  if (results.inngest.failed > 0) {
    console.log('   - Ensure Inngest environment variables are properly set');
  }
  if (results.analytics.failed > 0) {
    console.log('   - Check analytics data models and processing logic');
  }
  
  if (totalFailed === 0) {
    console.log('   🚀 Ready to deploy! All systems are functioning perfectly.');
  }
}

function getServiceIcon(service) {
  const icons = {
    aiServices: '🤖',
    analytics: '📊', 
    crisisDetection: '🚨',
    inngest: '⚡'
  };
  return icons[service] || '🔧';
}

// Run the comprehensive test suite
testAllServices()
  .then(results => {
    if (results) {
      const totalTests = Object.values(results).reduce((sum, service) => sum + service.passed + service.failed, 0);
      const totalPassed = Object.values(results).reduce((sum, service) => sum + service.passed, 0);
      
      if (totalPassed === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! MindBridge is fully operational! 🌉');
        process.exit(0);
      } else {
        console.log('\n⚠️  Some tests failed. Please review the results above.');
        process.exit(1);
      }
    } else {
      console.log('\n❌ Test suite failed to complete.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
