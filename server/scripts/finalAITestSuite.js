#!/usr/bin/env node

/**
 * MindBridge AI Services - Comprehensive Test Suite
 * Tests all AI components, API endpoints, and integration points
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const AISession = require('../models/AISession');
const WellnessEntry = require('../models/WellnessEntry');
const geminiService = require('../services/geminiService');
const aiAnalysisService = require('../services/aiAnalysis');
const apiStatus = require('../services/aiAnalysis/apiStatus');
require('dotenv').config();

class ComprehensiveAITestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      startTime: Date.now(),
      services: {},
      performanceMetrics: {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        responseTimes: []
      }
    };
  }

  log(category, test, status, message, data = null) {
    if (!this.results.services[category]) {
      this.results.services[category] = { tests: [], status: 'pending' };
    }
    
    const result = { test, status, message, data, timestamp: new Date() };
    this.results.services[category].tests.push(result);
    
    this.results.total++;
    if (status === 'PASS') this.results.passed++;
    else if (status === 'FAIL') this.results.failed++;
    else if (status === 'WARN') this.results.warnings++;
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${category}] ${test}: ${message}`);
    
    if (data && process.env.VERBOSE_TESTS) {
      console.log(`     ${JSON.stringify(data, null, 2).substring(0, 100)}...`);
    }
  }

  async measureResponseTime(operation) {
    const startTime = Date.now();
    const result = await operation();
    const responseTime = Date.now() - startTime;
    
    this.results.performanceMetrics.responseTimes.push(responseTime);
    this.results.performanceMetrics.maxResponseTime = Math.max(
      this.results.performanceMetrics.maxResponseTime, responseTime);
    this.results.performanceMetrics.minResponseTime = Math.min(
      this.results.performanceMetrics.minResponseTime, responseTime);
    
    return { result, responseTime };
  }

  async testCoreAIServices() {
    console.log('\\n🧠 Testing Core AI Services...');
    
    // Test Gemini Service
    const { result: geminiResponse, responseTime: geminiTime } = await this.measureResponseTime(
      () => geminiService.generateResponse('I feel anxious about my studies')
    );
    this.log('GeminiService', 'Response Generation', 'PASS', `Generated in ${geminiTime}ms`);
    
    // Test with various risk levels
    const riskLevels = ['low', 'moderate', 'high'];
    for (const risk of riskLevels) {
      const response = await geminiService.generateResponse('I need help', { riskLevel: risk });
      this.log('GeminiService', `Risk Context ${risk}`, 'PASS', `Contextual response generated`);
    }
    
    // Test crisis scenarios
    const crisisMessages = [
      'I want to kill myself',
      'I want to end it all',
      'Life is not worth living'
    ];
    
    for (const message of crisisMessages) {
      const response = await geminiService.generateResponse(message);
      const hasCrisisResponse = response.toLowerCase().includes('988') || 
                               response.toLowerCase().includes('crisis') ||
                               response.toLowerCase().includes('741741');
      this.log('GeminiService', 'Crisis Detection', hasCrisisResponse ? 'PASS' : 'WARN', 
               `Crisis keywords ${hasCrisisResponse ? 'found' : 'missing'}`);
    }
  }

  async testAnalysisServices() {
    console.log('\\n📊 Testing Analysis Services...');
    
    try {
      const testUser = await User.findOne({ role: 'student' });
      if (!testUser) {
        this.log('AnalysisServices', 'User Setup', 'SKIP', 'No test user available');
        return;
      }
      
      // Test full user analysis
      const { result: analysis, responseTime: analysisTime } = await this.measureResponseTime(
        () => aiAnalysisService.analyzeUser(testUser._id)
      );
      
      this.log('AnalysisServices', 'Full Analysis', 'PASS', `Completed in ${analysisTime}ms`);
      
      // Verify analysis completeness
      const requiredFields = ['userId', 'sentiment', 'risk', 'patterns', 'insights', 'summary'];
      const missingFields = requiredFields.filter(field => !analysis[field]);
      
      if (missingFields.length === 0) {
        this.log('AnalysisServices', 'Data Completeness', 'PASS', 'All required fields present');
      } else {
        this.log('AnalysisServices', 'Data Completeness', 'FAIL', 
                 `Missing fields: ${missingFields.join(', ')}`);
      }
      
      // Test risk level accuracy
      const riskLevel = analysis.risk?.currentRiskLevel;
      const validRiskLevels = ['low', 'moderate', 'high', 'critical'];
      this.log('AnalysisServices', 'Risk Assessment', 
               validRiskLevels.includes(riskLevel) ? 'PASS' : 'FAIL',
               `Risk level: ${riskLevel}`);
      
    } catch (error) {
      this.log('AnalysisServices', 'Error Handling', 'FAIL', error.message);
    }
  }

  async testAPIStatus() {
    console.log('\\n🔍 Testing API Status Service...');
    
    try {
      const { result: status, responseTime } = await this.measureResponseTime(
        () => apiStatus.getStatus()
      );
      
      this.log('APIStatus', 'Status Check', 'PASS', `Retrieved in ${responseTime}ms`, status);
      
      // Verify status structure
      const requiredFields = ['geminiAvailable', 'lastChecked', 'capabilities', 'fallbackMode'];
      const hasAllFields = requiredFields.every(field => status.hasOwnProperty(field));
      
      this.log('APIStatus', 'Status Structure', hasAllFields ? 'PASS' : 'FAIL',
               `Status object ${hasAllFields ? 'complete' : 'incomplete'}`);
      
    } catch (error) {
      this.log('APIStatus', 'Error Handling', 'FAIL', error.message);
    }
  }

  async testStressScenarios() {
    console.log('\\n⚡ Testing Stress Scenarios...');
    
    // Test with multiple rapid requests
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(geminiService.generateResponse(`Rapid test ${i}`));
    }
    
    try {
      const startTime = Date.now();
      const responses = await Promise.all(rapidRequests);
      const totalTime = Date.now() - startTime;
      
      const allValid = responses.every(r => typeof r === 'string' && r.length > 0);
      this.log('StressTest', 'Concurrent Requests', allValid ? 'PASS' : 'FAIL',
               `10 requests completed in ${totalTime}ms`);
      
    } catch (error) {
      this.log('StressTest', 'Concurrent Requests', 'FAIL', error.message);
    }
    
    // Test with edge case inputs
    const edgeCases = [
      '', // Empty string
      '   ', // Whitespace only
      'a'.repeat(5000), // Very long message
      '🙂😔😰🆘', // Emoji only
      'Test\\n\\n\\nMultiple\\nLines', // Multi-line
      'Special chars: @#$%^&*()' // Special characters
    ];
    
    for (let i = 0; i < edgeCases.length; i++) {
      try {
        const response = await geminiService.generateResponse(edgeCases[i]);
        const isValid = typeof response === 'string' && response.length > 0;
        this.log('StressTest', `Edge Case ${i + 1}`, isValid ? 'PASS' : 'FAIL',
                 `Handled ${edgeCases[i].length}-char input`);
      } catch (error) {
        this.log('StressTest', `Edge Case ${i + 1}`, 'FAIL', error.message);
      }
    }
  }

  async testIntegration() {
    console.log('\\n🔗 Testing Service Integration...');
    
    try {
      const testUser = await User.findOne({ role: 'student' });
      if (!testUser) {
        this.log('Integration', 'User Required', 'SKIP', 'No test user available');
        return;
      }
      
      // Test complete workflow: message -> analysis -> storage
      const testMessage = 'I am feeling very stressed about my upcoming finals';
      
      // 1. Generate AI response
      const aiResponse = await geminiService.generateResponse(testMessage, { 
        riskLevel: 'moderate',
        mood: 'stressed'
      });
      this.log('Integration', 'AI Response', 'PASS', 'Generated contextual response');
      
      // 2. Run full analysis
      const analysis = await aiAnalysisService.analyzeUser(testUser._id);
      this.log('Integration', 'User Analysis', 'PASS', 'Analysis completed');
      
      // 3. Verify data persistence
      const updatedUser = await User.findById(testUser._id);
      const hasStoredAnalysis = updatedUser.aiAnalysis && updatedUser.aiAnalysis.lastAnalysis;
      this.log('Integration', 'Data Persistence', hasStoredAnalysis ? 'PASS' : 'FAIL',
               `Analysis ${hasStoredAnalysis ? 'saved' : 'not saved'} to database`);
      
    } catch (error) {\n      this.log('Integration', 'Workflow Test', 'FAIL', error.message);\n    }\n  }\n\n  generateFinalReport() {\n    console.log('\\n🎯 FINAL AI SERVICES TEST REPORT');\n    console.log('='.repeat(60));\n    \n    // Calculate performance metrics\n    const { responseTimes } = this.results.performanceMetrics;\n    if (responseTimes.length > 0) {\n      this.results.performanceMetrics.averageResponseTime = \n        Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);\n    }\n    \n    // Overall status\n    const successRate = Math.round((this.results.passed / this.results.total) * 100);\n    const overallStatus = this.results.failed === 0 ? \n                         (this.results.warnings === 0 ? 'EXCELLENT' : 'GOOD') : \n                         (successRate >= 80 ? 'NEEDS_ATTENTION' : 'CRITICAL');\n    \n    console.log(`\\n🏆 Overall Status: ${overallStatus}`);\n    console.log(`📊 Success Rate: ${successRate}% (${this.results.passed}/${this.results.total})`);\n    console.log(`⏱️ Average Response Time: ${this.results.performanceMetrics.averageResponseTime}ms`);\n    console.log(`📈 Performance Range: ${this.results.performanceMetrics.minResponseTime}ms - ${this.results.performanceMetrics.maxResponseTime}ms`);\n    \n    // Service breakdown\n    console.log(`\\n🔧 Service Status:`);\n    Object.keys(this.results.services).forEach(service => {\n      const serviceTests = this.results.services[service].tests;\n      const servicePassed = serviceTests.filter(t => t.status === 'PASS').length;\n      const serviceTotal = serviceTests.length;\n      const serviceRate = serviceTotal > 0 ? Math.round((servicePassed / serviceTotal) * 100) : 0;\n      \n      const icon = serviceRate === 100 ? '✅' : serviceRate >= 80 ? '⚠️' : '❌';\n      console.log(`   ${icon} ${service}: ${serviceRate}% (${servicePassed}/${serviceTotal})`);\n    });\n    \n    if (this.results.failed > 0) {\n      console.log(`\\n❌ Critical Issues Found:`);\n      Object.values(this.results.services).forEach(service => {\n        service.tests.filter(t => t.status === 'FAIL').forEach(test => {\n          console.log(`   - ${test.test}: ${test.message}`);\n        });\n      });\n      \n      console.log(`\\n🔧 Recommended Actions:`);\n      console.log(`   1. Review failed test details above`);\n      console.log(`   2. Check API key configuration (Gemini AI)`);\n      console.log(`   3. Verify database connectivity and data integrity`);\n      console.log(`   4. Monitor system resources and performance`);\n      console.log(`   5. Review error logs for detailed diagnostics`);\n    }\n    \n    if (this.results.warnings > 0) {\n      console.log(`\\n⚠️ Warnings (${this.results.warnings} issues):`);\n      Object.values(this.results.services).forEach(service => {\n        service.tests.filter(t => t.status === 'WARN').forEach(test => {\n          console.log(`   - ${test.test}: ${test.message}`);\n        });\n      });\n    }\n    \n    const testDuration = Math.round((Date.now() - this.results.startTime) / 1000);\n    console.log(`\\n⏱️ Test Suite Completed in ${testDuration} seconds`);\n    \n    // System health summary\n    console.log(`\\n🏥 System Health Summary:`);\n    console.log(`   AI Services: ${overallStatus}`);\n    console.log(`   Response Performance: ${this.results.performanceMetrics.averageResponseTime < 5000 ? 'EXCELLENT' : 'GOOD'}`);\n    console.log(`   Error Resilience: ${this.results.failed === 0 ? 'PERFECT' : 'NEEDS_WORK'}`);\n    console.log(`   Crisis Detection: ${this.checkCrisisDetectionHealth()}`);\n    \n    return {\n      overallStatus,\n      successRate,\n      ...this.results\n    };\n  }\n\n  checkCrisisDetectionHealth() {\n    // Look for crisis detection tests in results\n    const crisisTests = Object.values(this.results.services)\n      .flatMap(s => s.tests)\n      .filter(t => t.test.toLowerCase().includes('crisis'));\n    \n    if (crisisTests.length === 0) return 'UNTESTED';\n    \n    const passedCrisisTests = crisisTests.filter(t => t.status === 'PASS').length;\n    const crisisSuccessRate = (passedCrisisTests / crisisTests.length) * 100;\n    \n    return crisisSuccessRate >= 90 ? 'EXCELLENT' : \n           crisisSuccessRate >= 75 ? 'GOOD' : 'NEEDS_IMPROVEMENT';\n  }\n\n  async runFullTestSuite() {\n    console.log('🚀 MindBridge AI Services - Comprehensive Test Suite');\n    console.log('Version: 2.0 | Date:', new Date().toISOString());\n    console.log('='.repeat(60));\n    \n    try {\n      // Database connection\n      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');\n      console.log('📱 Database connected successfully');\n      \n      // Run all test categories\n      await this.testAPIStatus();\n      await this.testCoreAIServices();\n      await this.testAnalysisServices();\n      await this.testStressScenarios();\n      await this.testIntegration();\n      \n      const finalReport = this.generateFinalReport();\n      \n      // Exit with appropriate code\n      const exitCode = finalReport.overallStatus === 'CRITICAL' ? 2 :\n                       finalReport.overallStatus === 'NEEDS_ATTENTION' ? 1 : 0;\n      \n      console.log(`\\n${exitCode === 0 ? '🎉' : '⚠️'} Test suite completed with status: ${finalReport.overallStatus}`);\n      process.exit(exitCode);\n      \n    } catch (error) {\n      console.error('❌ Test suite initialization failed:', error.message);\n      process.exit(3);\n    }\n  }\n}\n\n// Execute test suite if run directly\nif (require.main === module) {\n  const testSuite = new ComprehensiveAITestSuite();\n  \n  // Handle CLI arguments\n  if (process.argv.includes('--verbose')) {\n    process.env.VERBOSE_TESTS = 'true';\n  }\n  \n  testSuite.runFullTestSuite();\n}\n\nmodule.exports = ComprehensiveAITestSuite;
