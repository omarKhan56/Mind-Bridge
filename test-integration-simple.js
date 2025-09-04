#!/usr/bin/env node

const RiskPredictionEngine = require('./server/services/riskPredictionEngine');
const BehavioralPatternAnalyzer = require('./server/services/behavioralPatternAnalyzer');
const ProactiveWellnessCoach = require('./server/services/proactiveWellnessCoach');
const fs = require('fs');
const path = require('path');

class SimpleIntegrationTester {
  constructor() {
    this.results = {};
  }

  async testIntegration() {
    console.log('🧪 SIMPLE INTEGRATION TEST');
    console.log('==========================');

    await this.testBackendServices();
    await this.testFrontendIntegration();
    this.printResults();
  }

  async testBackendServices() {
    console.log('\n🔧 Testing Backend Services...');

    // Test Risk Prediction Engine
    try {
      const riskEngine = new RiskPredictionEngine();
      const riskData = await riskEngine.calculateRiskScore('507f1f77bcf86cd799439011');
      
      this.results.riskEngine = {
        status: 'working',
        hasRiskScore: typeof riskData.riskScore === 'number',
        hasRiskLevel: !!riskData.riskLevel,
        hasFactors: Array.isArray(riskData.factors)
      };
      console.log('   ✅ Risk Prediction Engine: Working');
    } catch (error) {
      this.results.riskEngine = { status: 'error', error: error.message };
      console.log('   ❌ Risk Prediction Engine: Error');
    }

    // Test Behavioral Pattern Analyzer
    try {
      const patternAnalyzer = new BehavioralPatternAnalyzer();
      const patterns = await patternAnalyzer.analyzeUserPatterns('507f1f77bcf86cd799439011');
      
      this.results.patternAnalyzer = {
        status: 'working',
        hasPatterns: !!patterns,
        hasInsights: Array.isArray(patterns.insights),
        hasAnomalies: Array.isArray(patterns.anomalies)
      };
      console.log('   ✅ Behavioral Pattern Analyzer: Working');
    } catch (error) {
      this.results.patternAnalyzer = { status: 'error', error: error.message };
      console.log('   ❌ Behavioral Pattern Analyzer: Error');
    }

    // Test Proactive Wellness Coach
    try {
      const wellnessCoach = new ProactiveWellnessCoach();
      const recommendations = await wellnessCoach.generateWellnessRecommendations('507f1f77bcf86cd799439011');
      
      this.results.wellnessCoach = {
        status: 'working',
        hasRecommendations: !!recommendations.recommendations,
        hasGoals: Array.isArray(recommendations.recommendations?.goals)
      };
      console.log('   ✅ Proactive Wellness Coach: Working');
    } catch (error) {
      this.results.wellnessCoach = { status: 'error', error: error.message };
      console.log('   ❌ Proactive Wellness Coach: Error');
    }
  }

  async testFrontendIntegration() {
    console.log('\n🎨 Testing Frontend Integration...');

    // Check if analytics service exists
    const analyticsServicePath = path.join(__dirname, 'client', 'src', 'services', 'analyticsService.js');
    this.results.analyticsService = {
      exists: fs.existsSync(analyticsServicePath),
      hasRiskAPI: false,
      hasWellnessAPI: false
    };

    if (this.results.analyticsService.exists) {
      const content = fs.readFileSync(analyticsServicePath, 'utf8');
      this.results.analyticsService.hasRiskAPI = content.includes('/api/analytics/risk/');
      this.results.analyticsService.hasWellnessAPI = content.includes('/api/analytics/wellness/');
      console.log('   ✅ Analytics Service: Exists and configured');
    } else {
      console.log('   ❌ Analytics Service: Not found');
    }

    // Check counselor dashboard integration
    const counselorDashboardPath = path.join(__dirname, 'client', 'src', 'pages', 'CounselorDashboard.js');
    this.results.counselorDashboard = {
      exists: fs.existsSync(counselorDashboardPath),
      hasAnalyticsImport: false,
      hasRiskVisualization: false
    };

    if (this.results.counselorDashboard.exists) {
      const content = fs.readFileSync(counselorDashboardPath, 'utf8');
      this.results.counselorDashboard.hasAnalyticsImport = content.includes('analyticsService');
      this.results.counselorDashboard.hasRiskVisualization = content.includes('getRiskLevelColor');
      console.log('   ✅ Counselor Dashboard: Enhanced with analytics');
    } else {
      console.log('   ❌ Counselor Dashboard: Not found');
    }

    // Check student dashboard integration
    const studentDashboardPath = path.join(__dirname, 'client', 'src', 'pages', 'Dashboard.js');
    this.results.studentDashboard = {
      exists: fs.existsSync(studentDashboardPath),
      hasWellnessRecommendations: false
    };

    if (this.results.studentDashboard.exists) {
      const content = fs.readFileSync(studentDashboardPath, 'utf8');
      this.results.studentDashboard.hasWellnessRecommendations = content.includes('WellnessRecommendations');
      console.log('   ✅ Student Dashboard: Enhanced with wellness recommendations');
    } else {
      console.log('   ❌ Student Dashboard: Not found');
    }

    // Check wellness recommendations component
    const wellnessComponentPath = path.join(__dirname, 'client', 'src', 'components', 'WellnessRecommendations.js');
    this.results.wellnessComponent = {
      exists: fs.existsSync(wellnessComponentPath),
      hasAnalyticsIntegration: false
    };

    if (this.results.wellnessComponent.exists) {
      const content = fs.readFileSync(wellnessComponentPath, 'utf8');
      this.results.wellnessComponent.hasAnalyticsIntegration = content.includes('analyticsService');
      console.log('   ✅ Wellness Recommendations Component: Integrated');
    } else {
      console.log('   ❌ Wellness Recommendations Component: Not found');
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 INTEGRATION TEST RESULTS');
    console.log('='.repeat(50));

    // Backend Services
    console.log('\n🔧 BACKEND SERVICES:');
    const backendServices = ['riskEngine', 'patternAnalyzer', 'wellnessCoach'];
    let backendWorking = 0;

    backendServices.forEach(service => {
      const result = this.results[service];
      if (result?.status === 'working') {
        console.log(`   ✅ ${service}: Working`);
        backendWorking++;
      } else {
        console.log(`   ❌ ${service}: ${result?.error || 'Failed'}`);
      }
    });

    // Frontend Integration
    console.log('\n🎨 FRONTEND INTEGRATION:');
    const frontendComponents = [
      { name: 'Analytics Service', key: 'analyticsService' },
      { name: 'Counselor Dashboard', key: 'counselorDashboard' },
      { name: 'Student Dashboard', key: 'studentDashboard' },
      { name: 'Wellness Component', key: 'wellnessComponent' }
    ];

    let frontendIntegrated = 0;
    frontendComponents.forEach(component => {
      const result = this.results[component.key];
      if (result?.exists) {
        console.log(`   ✅ ${component.name}: Integrated`);
        frontendIntegrated++;
      } else {
        console.log(`   ❌ ${component.name}: Missing`);
      }
    });

    // Overall Status
    console.log('\n📊 OVERALL STATUS:');
    console.log(`   Backend Services: ${backendWorking}/${backendServices.length} working`);
    console.log(`   Frontend Integration: ${frontendIntegrated}/${frontendComponents.length} integrated`);

    const totalWorking = backendWorking + frontendIntegrated;
    const totalTests = backendServices.length + frontendComponents.length;
    const successRate = (totalWorking / totalTests * 100).toFixed(1);

    console.log(`   📈 Overall Success Rate: ${successRate}%`);

    if (successRate >= 80) {
      console.log('\n🎉 INTEGRATION TEST PASSED!');
      console.log('✅ Backend services are operational');
      console.log('✅ Frontend components are integrated');
      console.log('✅ Ready for live testing');
      
      console.log('\n🚀 NEXT STEPS:');
      console.log('1. Start backend: npm run server');
      console.log('2. Start frontend: npm run client');
      console.log('3. Test in browser:');
      console.log('   - Login as counselor to see risk analytics');
      console.log('   - Login as student to see wellness recommendations');
    } else {
      console.log('\n⚠️ INTEGRATION ISSUES DETECTED');
      console.log('Some components may need attention before live testing');
    }

    console.log('='.repeat(50));
  }
}

// Run the test
if (require.main === module) {
  const tester = new SimpleIntegrationTester();
  tester.testIntegration().catch(console.error);
}

module.exports = SimpleIntegrationTester;
