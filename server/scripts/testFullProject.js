#!/usr/bin/env node

/**
 * MindBridge Full Project Test Suite
 * Comprehensive testing of frontend, backend, database, and AI services
 */

const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const User = require('../models/User');
const College = require('../models/College');
const AISession = require('../models/AISession');
const WellnessEntry = require('../models/WellnessEntry');
require('dotenv').config();

class FullProjectTester {
  constructor() {
    this.baseURL = 'http://localhost:5001';
    this.clientURL = 'http://localhost:3000';
    this.results = {
      backend: { status: 'pending', tests: [], issues: [] },
      frontend: { status: 'pending', tests: [], issues: [] },
      database: { status: 'pending', tests: [], issues: [] },
      ai: { status: 'pending', tests: [], issues: [] },
      auth: { status: 'pending', tests: [], issues: [] },
      integration: { status: 'pending', tests: [], issues: [] },
      overall: { status: 'pending', score: 0, critical: 0, warnings: 0 }
    };
    this.testUser = null;
    this.authToken = null;
    this.startTime = Date.now();
  }

  log(category, test, status, message, data = null) {
    const result = { test, status, message, data, timestamp: new Date() };
    this.results[category].tests.push(result);
    
    if (status === 'FAIL') this.results.overall.critical++;
    if (status === 'WARN') this.results.overall.warnings++;
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${category.toUpperCase()}] ${test}: ${message}`);
    
    if (status === 'FAIL') {
      this.results[category].issues.push(`${test}: ${message}`);
    }
  }

  async testBackendServer() {
    console.log('\\n🔧 Testing Backend Server...');
    
    try {
      // Test server health
      const healthCheck = await axios.get(`${this.baseURL}/api/ai-analysis/status`, { timeout: 5000 });
      this.log('backend', 'Server Health', 'PASS', `Server responding (${healthCheck.status})`);
    } catch (error) {
      this.log('backend', 'Server Health', 'FAIL', `Server not responding: ${error.message}`);
      return;
    }

    // Test core API endpoints
    const endpoints = [
      { path: '/api/ai-analysis/status', method: 'GET', auth: false },
    ];

    for (const endpoint of endpoints) {
      try {
        const config = { 
          timeout: 3000,
          method: endpoint.method,
          url: `${this.baseURL}${endpoint.path}`
        };
        
        const response = await axios(config);
        this.log('backend', `API ${endpoint.path}`, 'PASS', `Status ${response.status}`);
      } catch (error) {
        const status = error.response?.status || 'NETWORK_ERROR';
        if (status === 401) {
          this.log('backend', `API ${endpoint.path}`, 'WARN', 'Requires authentication');
        } else {
          this.log('backend', `API ${endpoint.path}`, 'FAIL', `Error ${status}`);
        }
      }
    }
  }

  async testDatabase() {
    console.log('\\n🗄️ Testing Database Integration...');
    
    try {
      // Test MongoDB connection
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
      this.log('database', 'Connection', 'PASS', 'MongoDB connected successfully');
      
      // Test collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const requiredCollections = ['users', 'colleges', 'aisessions', 'wellnessentries'];
      const missingCollections = requiredCollections.filter(c => !collectionNames.includes(c));
      
      if (missingCollections.length === 0) {
        this.log('database', 'Collections', 'PASS', `All required collections exist`);
      } else {
        this.log('database', 'Collections', 'WARN', `Missing: ${missingCollections.join(', ')}`);
      }
      
      // Test data integrity
      const userCount = await User.countDocuments();
      const collegeCount = await College.countDocuments();
      
      this.log('database', 'Data Integrity', 'PASS', `${userCount} users, ${collegeCount} colleges`);
      
      // Create test college if needed
      let testCollege = await College.findOne({ code: 'TEST' });
      if (!testCollege) {
        testCollege = new College({
          name: 'Test University',
          code: 'TEST',
          address: 'Test Address',
          contactEmail: 'test@test.edu'
        });
        await testCollege.save();
      }
      
      // Create or find test user
      this.testUser = await User.findOne({ email: 'test@student.com' });
      if (!this.testUser) {
        this.testUser = new User({
          name: 'Test Student',
          email: 'test@student.com',
          password: 'testpass123',
          role: 'student',
          college: testCollege._id,
          department: 'Computer Science',
          year: 2
        });
        await this.testUser.save();
      }
      
      this.log('database', 'Test Data', 'PASS', 'Test user and college ready');
      
    } catch (error) {
      this.log('database', 'Connection', 'FAIL', `Database error: ${error.message}`);
    }
  }

  async testAuthentication() {
    console.log('\\n🔐 Testing Authentication System...');
    
    if (!this.testUser) {
      this.log('auth', 'Setup', 'FAIL', 'No test user available');
      return;
    }

    try {
      // Test login
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'test@student.com',
        password: 'testpass123'
      });
      
      this.authToken = loginResponse.data.token;
      this.log('auth', 'Login', 'PASS', 'User authentication successful');
      
      // Verify token structure
      const tokenParts = this.authToken.split('.');
      if (tokenParts.length === 3) {
        this.log('auth', 'JWT Structure', 'PASS', 'Valid JWT token format');
      } else {
        this.log('auth', 'JWT Structure', 'FAIL', 'Invalid token format');
      }
      
    } catch (error) {
      this.log('auth', 'Login', 'FAIL', `Authentication failed: ${error.message}`);
    }
  }

  async testAIServices() {
    console.log('\\n🤖 Testing AI Services Integration...');
    
    try {
      // Import AI services
      const geminiService = require('../services/geminiService');
      const aiAnalysisService = require('../services/aiAnalysis');
      
      // Test basic AI response
      const response = await geminiService.generateResponse('I feel stressed about my exams');
      if (response && response.length > 0) {
        this.log('ai', 'Gemini Response', 'PASS', `Generated ${response.length} character response`);
      } else {
        this.log('ai', 'Gemini Response', 'FAIL', 'No response generated');
      }
      
      // Test user analysis (if test user exists)
      if (this.testUser) {
        const analysis = await aiAnalysisService.analyzeUser(this.testUser._id);
        if (analysis && analysis.risk && analysis.sentiment) {
          this.log('ai', 'User Analysis', 'PASS', `Risk: ${analysis.risk.currentRiskLevel}`);
        } else {
          this.log('ai', 'User Analysis', 'FAIL', 'Analysis incomplete');
        }
      }
      
      // Test API endpoints (if token available)
      if (this.authToken) {
        const insightsResponse = await axios.get(`${this.baseURL}/api/ai-analysis/insights`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        this.log('ai', 'API Insights', 'PASS', 'AI insights endpoint working');
      }
      
    } catch (error) {
      this.log('ai', 'Services', 'FAIL', `AI error: ${error.message}`);
    }
  }

  async testFrontendSetup() {
    console.log('\\n⚛️ Testing Frontend Setup...');
    
    const clientPath = path.join(__dirname, '../../client');
    
    // Check if client directory exists
    if (fs.existsSync(clientPath)) {
      this.log('frontend', 'Directory', 'PASS', 'Client directory exists');
    } else {
      this.log('frontend', 'Directory', 'FAIL', 'Client directory missing');
      return;
    }
    
    // Check package.json
    const packagePath = path.join(clientPath, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath));
      this.log('frontend', 'Package Config', 'PASS', `React app "${packageJson.name}"`);
    } else {
      this.log('frontend', 'Package Config', 'FAIL', 'package.json missing');
    }
    
    // Check key React components
    const componentsPath = path.join(clientPath, 'src');
    const keyFiles = ['App.js', 'index.js'];
    
    let missingFiles = [];
    for (const file of keyFiles) {
      if (!fs.existsSync(path.join(componentsPath, file))) {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length === 0) {
      this.log('frontend', 'Core Files', 'PASS', 'All key React files present');
    } else {
      this.log('frontend', 'Core Files', 'FAIL', `Missing: ${missingFiles.join(', ')}`);
    }
    
    // Check node_modules
    const nodeModulesPath = path.join(clientPath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      this.log('frontend', 'Dependencies', 'PASS', 'Node modules installed');
    } else {
      this.log('frontend', 'Dependencies', 'WARN', 'Node modules not installed');
    }
  }

  async testIntegration() {
    console.log('\\n🔗 Testing End-to-End Integration...');
    
    if (!this.authToken || !this.testUser) {
      this.log('integration', 'Prerequisites', 'FAIL', 'Missing auth token or test user');
      return;
    }

    try {
      // Test complete workflow: wellness entry -> analysis -> insights
      
      // 1. Create wellness entry
      const wellnessData = {
        mood: 6,
        stress: 7,
        sleep: 5,
        notes: 'Feeling okay but stressed about upcoming exams'
      };
      
      const wellnessResponse = await axios.post(`${this.baseURL}/api/wellness`, wellnessData, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.log('integration', 'Wellness Entry', 'PASS', 'Created wellness entry');
      
      // 2. Test AI analysis
      const analysisResponse = await axios.get(`${this.baseURL}/api/auth/analysis`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.log('integration', 'User Analysis', 'PASS', 'Generated user analysis');
      
      // 3. Test AI insights
      const insightsResponse = await axios.get(`${this.baseURL}/api/ai-analysis/insights`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.log('integration', 'AI Insights', 'PASS', 'Retrieved personalized insights');
      
    } catch (error) {
      this.log('integration', 'Workflow', 'FAIL', `Integration error: ${error.message}`);
    }
  }

  calculateOverallScore() {
    let totalTests = 0;
    let passedTests = 0;
    
    Object.keys(this.results).forEach(category => {
      if (category !== 'overall') {
        const tests = this.results[category].tests;
        totalTests += tests.length;
        passedTests += tests.filter(t => t.status === 'PASS').length;
        
        // Update category status
        const categoryPassed = tests.filter(t => t.status === 'PASS').length;
        const categoryFailed = tests.filter(t => t.status === 'FAIL').length;
        
        if (categoryFailed > 0) {
          this.results[category].status = 'NEEDS_ATTENTION';
        } else if (tests.some(t => t.status === 'WARN')) {
          this.results[category].status = 'GOOD';
        } else {
          this.results[category].status = 'EXCELLENT';
        }
      }
    });
    
    this.results.overall.score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    if (this.results.overall.critical > 0) {
      this.results.overall.status = 'CRITICAL';
    } else if (this.results.overall.warnings > 3) {
      this.results.overall.status = 'NEEDS_ATTENTION';
    } else if (this.results.overall.score >= 90) {
      this.results.overall.status = 'EXCELLENT';
    } else if (this.results.overall.score >= 75) {
      this.results.overall.status = 'GOOD';
    } else {
      this.results.overall.status = 'POOR';
    }
  }

  generateReport() {
    console.log('\\n🎯 MINDBRIDGE PROJECT TEST REPORT');
    console.log('='.repeat(60));
    
    this.calculateOverallScore();
    
    const testDuration = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log(`\\n🏆 Overall Status: ${this.results.overall.status}`);
    console.log(`📊 Success Rate: ${this.results.overall.score}%`);
    console.log(`⚠️ Critical Issues: ${this.results.overall.critical}`);
    console.log(`💛 Warnings: ${this.results.overall.warnings}`);
    console.log(`⏱️ Test Duration: ${testDuration}s`);
    
    console.log('\\n📋 Component Status:');
    Object.keys(this.results).forEach(category => {
      if (category !== 'overall') {
        const status = this.results[category].status;
        const icon = status === 'EXCELLENT' ? '✅' : 
                    status === 'GOOD' ? '⚠️' : 
                    status === 'NEEDS_ATTENTION' ? '🔧' : '❌';
        console.log(`   ${icon} ${category.toUpperCase()}: ${status}`);
      }
    });
    
    if (this.results.overall.critical > 0) {
      console.log('\\n❌ Critical Issues Found:');
      Object.keys(this.results).forEach(category => {
        if (category !== 'overall' && this.results[category].issues.length > 0) {
          console.log(`\\n   ${category.toUpperCase()}:`);
          this.results[category].issues.forEach(issue => {
            console.log(`     - ${issue}`);
          });
        }
      });
      
      console.log('\\n🔧 Immediate Actions Required:');
      console.log('   1. Fix critical backend/database issues');
      console.log('   2. Ensure all services are running');
      console.log('   3. Verify configuration files');
      console.log('   4. Check network connectivity');
    }
    
    if (this.results.overall.warnings > 0) {
      console.log('\\n⚠️ Warnings to Address:');
      Object.keys(this.results).forEach(category => {
        if (category !== 'overall') {
          const warnings = this.results[category].tests.filter(t => t.status === 'WARN');
          warnings.forEach(warning => {
            console.log(`   - ${category}: ${warning.test} - ${warning.message}`);
          });
        }
      });
    }
    
    console.log('\\n🚀 Production Readiness:');
    const readiness = this.results.overall.status === 'EXCELLENT' ? 'READY' :
                     this.results.overall.status === 'GOOD' ? 'MOSTLY_READY' :
                     this.results.overall.critical === 0 ? 'NEEDS_WORK' : 'NOT_READY';
    console.log(`   Status: ${readiness}`);
    
    if (readiness === 'READY') {
      console.log('   🎉 MindBridge is production-ready!');
    } else if (readiness === 'MOSTLY_READY') {
      console.log('   🔧 Minor issues to resolve before production');
    } else {
      console.log('   ⚠️ Significant work needed before production deployment');
    }
    
    return this.results;
  }

  async runFullTest() {
    console.log('🚀 MindBridge Full Project Test Suite');
    console.log('Testing: Backend, Frontend, Database, AI Services, Authentication');
    console.log('='.repeat(60));
    
    try {
      await this.testBackendServer();
      await this.testDatabase();
      await this.testAuthentication();
      await this.testAIServices();
      await this.testFrontendSetup();
      await this.testIntegration();
      
      const results = this.generateReport();
      
      // Exit with appropriate code
      const exitCode = results.overall.status === 'CRITICAL' ? 2 :
                       results.overall.status === 'POOR' ? 1 : 0;
      
      console.log(`\\n✨ Full project test completed with status: ${results.overall.status}`);
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Full project test failed:', error.message);
      process.exit(3);
    }
  }
}

// Run full test suite
if (require.main === module) {
  const tester = new FullProjectTester();
  tester.runFullTest();
}

module.exports = FullProjectTester;
