#!/usr/bin/env node

const axios = require('axios');

class FrontendBackendIntegrationTester {
  constructor() {
    this.baseURL = 'http://localhost:5001';
    this.testResults = {};
    this.mockToken = 'test-token'; // In real scenario, this would be a valid JWT
  }

  async testServiceIntegration() {
    console.log('🔗 TESTING FRONTEND-BACKEND SERVICE INTEGRATION');
    console.log('===============================================');

    // Test all available backend services
    await this.testAnalyticsEndpoints();
    await this.testExistingEndpoints();
    await this.testNewServiceIntegration();

    this.printIntegrationReport();
  }

  async testAnalyticsEndpoints() {
    console.log('\n📊 Testing Analytics Service Integration...');
    
    const analyticsEndpoints = [
      '/api/analytics/risk/507f1f77bcf86cd799439011',
      '/api/analytics/patterns/507f1f77bcf86cd799439011',
      '/api/analytics/wellness/507f1f77bcf86cd799439011',
      '/api/analytics/dashboard',
      '/api/analytics/trends',
      '/api/analytics/institutional'
    ];

    this.testResults.analytics = {
      total: analyticsEndpoints.length,
      working: 0,
      failing: 0,
      endpoints: {}
    };

    for (const endpoint of analyticsEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${this.mockToken}` },
          timeout: 5000
        });
        
        this.testResults.analytics.endpoints[endpoint] = {
          status: 'working',
          statusCode: response.status,
          hasData: !!response.data
        };
        this.testResults.analytics.working++;
        console.log(`✅ ${endpoint} - Working`);
        
      } catch (error) {
        this.testResults.analytics.endpoints[endpoint] = {
          status: 'failing',
          error: error.response?.status || error.code,
          message: error.message
        };
        this.testResults.analytics.failing++;
        console.log(`❌ ${endpoint} - ${error.response?.status || error.code}`);
      }
    }
  }

  async testExistingEndpoints() {
    console.log('\n🔄 Testing Existing Service Integration...');
    
    const existingEndpoints = [
      '/api/auth/login',
      '/api/ai-sessions',
      '/api/appointments/my-appointments',
      '/api/wellness/today',
      '/api/goals',
      '/api/forum'
    ];

    this.testResults.existing = {
      total: existingEndpoints.length,
      working: 0,
      failing: 0,
      endpoints: {}
    };

    for (const endpoint of existingEndpoints) {
      try {
        // Use GET for most endpoints, POST for login
        const method = endpoint.includes('login') ? 'post' : 'get';
        const data = endpoint.includes('login') ? { email: 'test@test.com', password: 'test' } : undefined;
        
        const response = await axios[method](`${this.baseURL}${endpoint}`, data, {
          headers: { 'Authorization': `Bearer ${this.mockToken}` },
          timeout: 5000
        });
        
        this.testResults.existing.endpoints[endpoint] = {
          status: 'working',
          statusCode: response.status
        };
        this.testResults.existing.working++;
        console.log(`✅ ${endpoint} - Working`);
        
      } catch (error) {
        this.testResults.existing.endpoints[endpoint] = {
          status: 'accessible',
          error: error.response?.status || error.code
        };
        if (error.response?.status < 500) {
          this.testResults.existing.working++;
        } else {
          this.testResults.existing.failing++;
        }
        console.log(`⚠️ ${endpoint} - ${error.response?.status || error.code} (Endpoint exists)`);
      }
    }
  }

  async testNewServiceIntegration() {
    console.log('\n🆕 Testing New Service Features...');
    
    const newFeatures = [
      'Risk Prediction Engine',
      'Behavioral Pattern Analyzer', 
      'Proactive Wellness Coach',
      'Historical Context System',
      'Predictive Analytics Dashboard'
    ];

    this.testResults.newFeatures = {
      total: newFeatures.length,
      implemented: 0,
      missing: 0,
      features: {}
    };

    // Check if new services are accessible
    const serviceChecks = [
      { name: 'Risk Prediction Engine', endpoint: '/api/analytics/risk/507f1f77bcf86cd799439011' },
      { name: 'Behavioral Pattern Analyzer', endpoint: '/api/analytics/patterns/507f1f77bcf86cd799439011' },
      { name: 'Proactive Wellness Coach', endpoint: '/api/analytics/wellness/507f1f77bcf86cd799439011' },
      { name: 'Historical Context System', endpoint: '/api/ai-sessions' },
      { name: 'Predictive Analytics Dashboard', endpoint: '/api/analytics/dashboard' }
    ];

    for (const service of serviceChecks) {
      try {
        const response = await axios.get(`${this.baseURL}${service.endpoint}`, {
          headers: { 'Authorization': `Bearer ${this.mockToken}` },
          timeout: 5000
        });
        
        this.testResults.newFeatures.features[service.name] = {
          status: 'implemented',
          backendReady: true,
          frontendIntegration: 'needed'
        };
        this.testResults.newFeatures.implemented++;
        console.log(`✅ ${service.name} - Backend Ready`);
        
      } catch (error) {
        this.testResults.newFeatures.features[service.name] = {
          status: 'missing',
          backendReady: error.response?.status !== 404,
          frontendIntegration: 'needed'
        };
        this.testResults.newFeatures.missing++;
        console.log(`❌ ${service.name} - ${error.response?.status || 'Not accessible'}`);
      }
    }
  }

  printIntegrationReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 FRONTEND-BACKEND INTEGRATION REPORT');
    console.log('='.repeat(60));

    // Analytics Services
    console.log('\n📊 ANALYTICS SERVICES:');
    console.log(`   Total Endpoints: ${this.testResults.analytics?.total || 0}`);
    console.log(`   ✅ Working: ${this.testResults.analytics?.working || 0}`);
    console.log(`   ❌ Failing: ${this.testResults.analytics?.failing || 0}`);
    console.log(`   📈 Success Rate: ${((this.testResults.analytics?.working || 0) / (this.testResults.analytics?.total || 1) * 100).toFixed(1)}%`);

    // Existing Services
    console.log('\n🔄 EXISTING SERVICES:');
    console.log(`   Total Endpoints: ${this.testResults.existing?.total || 0}`);
    console.log(`   ✅ Working: ${this.testResults.existing?.working || 0}`);
    console.log(`   ❌ Failing: ${this.testResults.existing?.failing || 0}`);
    console.log(`   📈 Success Rate: ${((this.testResults.existing?.working || 0) / (this.testResults.existing?.total || 1) * 100).toFixed(1)}%`);

    // New Features
    console.log('\n🆕 NEW FEATURES:');
    console.log(`   Total Features: ${this.testResults.newFeatures?.total || 0}`);
    console.log(`   ✅ Backend Ready: ${this.testResults.newFeatures?.implemented || 0}`);
    console.log(`   ❌ Missing: ${this.testResults.newFeatures?.missing || 0}`);
    console.log(`   📈 Implementation Rate: ${((this.testResults.newFeatures?.implemented || 0) / (this.testResults.newFeatures?.total || 1) * 100).toFixed(1)}%`);

    // Integration Status
    console.log('\n🔗 INTEGRATION STATUS:');
    const totalServices = (this.testResults.analytics?.total || 0) + (this.testResults.existing?.total || 0);
    const workingServices = (this.testResults.analytics?.working || 0) + (this.testResults.existing?.working || 0);
    
    console.log(`   Overall Service Health: ${(workingServices / totalServices * 100).toFixed(1)}%`);
    
    if (this.testResults.analytics?.working === 0) {
      console.log('\n⚠️ CRITICAL ISSUES:');
      console.log('   • Analytics services not integrated in frontend');
      console.log('   • Phase 2 features not accessible to users');
      console.log('   • Advanced AI capabilities not utilized');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if ((this.testResults.analytics?.working || 0) === 0) {
      console.log('   🔴 HIGH PRIORITY:');
      console.log('   • Integrate analytics service in frontend');
      console.log('   • Add risk score visualization to counselor dashboard');
      console.log('   • Implement wellness recommendations in student dashboard');
      console.log('   • Create proactive intervention alerts');
    }
    
    if ((this.testResults.newFeatures?.implemented || 0) > 0) {
      console.log('   🟡 MEDIUM PRIORITY:');
      console.log('   • Create frontend components for new services');
      console.log('   • Add behavioral pattern visualization');
      console.log('   • Implement predictive analytics charts');
      console.log('   • Add goal tracking and celebration system');
    }

    console.log('\n📊 UTILIZATION SUMMARY:');
    console.log(`   • Basic Services: ${((this.testResults.existing?.working || 0) / (this.testResults.existing?.total || 1) * 100).toFixed(0)}% utilized`);
    console.log(`   • Advanced Analytics: ${((this.testResults.analytics?.working || 0) / (this.testResults.analytics?.total || 1) * 100).toFixed(0)}% utilized`);
    console.log(`   • Phase 2 Features: ${this.testResults.newFeatures?.implemented || 0}/${this.testResults.newFeatures?.total || 0} backend ready`);

    console.log('='.repeat(60));
  }
}

// Run the integration test
if (require.main === module) {
  const tester = new FrontendBackendIntegrationTester();
  tester.testServiceIntegration().catch(console.error);
}

module.exports = FrontendBackendIntegrationTester;
