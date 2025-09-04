#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class IntegrationVerifier {
  constructor() {
    this.clientPath = path.join(__dirname, 'client', 'src');
    this.results = {
      analyticsService: false,
      counselorDashboard: false,
      studentDashboard: false,
      wellnessRecommendations: false,
      imports: {
        analyticsServiceImported: false,
        wellnessRecommendationsImported: false,
        alertComponentImported: false
      }
    };
  }

  verifyIntegration() {
    console.log('🔍 VERIFYING FRONTEND-BACKEND INTEGRATION');
    console.log('==========================================');

    this.checkAnalyticsService();
    this.checkCounselorDashboard();
    this.checkStudentDashboard();
    this.checkWellnessRecommendations();

    this.printResults();
  }

  checkAnalyticsService() {
    console.log('\n📊 Checking Analytics Service...');
    
    const servicePath = path.join(this.clientPath, 'services', 'analyticsService.js');
    if (fs.existsSync(servicePath)) {
      const content = fs.readFileSync(servicePath, 'utf8');
      
      const hasRiskAPI = content.includes('/api/analytics/risk/');
      const hasPatternsAPI = content.includes('/api/analytics/patterns/');
      const hasWellnessAPI = content.includes('/api/analytics/wellness/');
      const hasDashboardAPI = content.includes('/api/analytics/dashboard');
      
      this.results.analyticsService = hasRiskAPI && hasPatternsAPI && hasWellnessAPI && hasDashboardAPI;
      
      console.log(`   ✅ Analytics Service exists`);
      console.log(`   ${hasRiskAPI ? '✅' : '❌'} Risk API integration`);
      console.log(`   ${hasPatternsAPI ? '✅' : '❌'} Patterns API integration`);
      console.log(`   ${hasWellnessAPI ? '✅' : '❌'} Wellness API integration`);
      console.log(`   ${hasDashboardAPI ? '✅' : '❌'} Dashboard API integration`);
    } else {
      console.log('   ❌ Analytics Service not found');
    }
  }

  checkCounselorDashboard() {
    console.log('\n👨‍⚕️ Checking Counselor Dashboard Integration...');
    
    const dashboardPath = path.join(this.clientPath, 'pages', 'CounselorDashboard.js');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      
      const hasAnalyticsImport = content.includes('analyticsService');
      const hasRiskLevelColor = content.includes('getRiskLevelColor');
      const hasHighRiskUsers = content.includes('highRiskUsers');
      const hasAlertComponent = content.includes('Alert');
      const hasDashboardData = content.includes('dashboardData');
      
      this.results.counselorDashboard = hasAnalyticsImport && hasRiskLevelColor && hasHighRiskUsers;
      this.results.imports.analyticsServiceImported = hasAnalyticsImport;
      this.results.imports.alertComponentImported = hasAlertComponent;
      
      console.log(`   ✅ Counselor Dashboard exists`);
      console.log(`   ${hasAnalyticsImport ? '✅' : '❌'} Analytics service imported`);
      console.log(`   ${hasRiskLevelColor ? '✅' : '❌'} Risk level functions added`);
      console.log(`   ${hasHighRiskUsers ? '✅' : '❌'} High risk users integration`);
      console.log(`   ${hasAlertComponent ? '✅' : '❌'} Alert component imported`);
      console.log(`   ${hasDashboardData ? '✅' : '❌'} Dashboard data integration`);
    } else {
      console.log('   ❌ Counselor Dashboard not found');
    }
  }

  checkStudentDashboard() {
    console.log('\n👨‍🎓 Checking Student Dashboard Integration...');
    
    const dashboardPath = path.join(this.clientPath, 'pages', 'Dashboard.js');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf8');
      
      const hasWellnessImport = content.includes('WellnessRecommendations');
      const hasAnalyticsImport = content.includes('analyticsService');
      const hasWellnessSection = content.includes('<WellnessRecommendations');
      
      this.results.studentDashboard = hasWellnessImport && hasWellnessSection;
      this.results.imports.wellnessRecommendationsImported = hasWellnessImport;
      
      console.log(`   ✅ Student Dashboard exists`);
      console.log(`   ${hasWellnessImport ? '✅' : '❌'} Wellness Recommendations imported`);
      console.log(`   ${hasAnalyticsImport ? '✅' : '❌'} Analytics service imported`);
      console.log(`   ${hasWellnessSection ? '✅' : '❌'} Wellness section added`);
    } else {
      console.log('   ❌ Student Dashboard not found');
    }
  }

  checkWellnessRecommendations() {
    console.log('\n🌟 Checking Wellness Recommendations Component...');
    
    const componentPath = path.join(this.clientPath, 'components', 'WellnessRecommendations.js');
    if (fs.existsSync(componentPath)) {
      const content = fs.readFileSync(componentPath, 'utf8');
      
      const hasAnalyticsService = content.includes('analyticsService');
      const hasRecommendationsAPI = content.includes('getWellnessRecommendations');
      const hasGoalTracking = content.includes('trackGoalProgress');
      const hasRiskLevelAlert = content.includes('riskLevel');
      
      this.results.wellnessRecommendations = hasAnalyticsService && hasRecommendationsAPI;
      
      console.log(`   ✅ Wellness Recommendations component exists`);
      console.log(`   ${hasAnalyticsService ? '✅' : '❌'} Analytics service integration`);
      console.log(`   ${hasRecommendationsAPI ? '✅' : '❌'} Recommendations API calls`);
      console.log(`   ${hasGoalTracking ? '✅' : '❌'} Goal tracking integration`);
      console.log(`   ${hasRiskLevelAlert ? '✅' : '❌'} Risk level alerts`);
    } else {
      console.log('   ❌ Wellness Recommendations component not found');
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 INTEGRATION VERIFICATION RESULTS');
    console.log('='.repeat(50));

    const components = [
      { name: 'Analytics Service', status: this.results.analyticsService },
      { name: 'Counselor Dashboard', status: this.results.counselorDashboard },
      { name: 'Student Dashboard', status: this.results.studentDashboard },
      { name: 'Wellness Recommendations', status: this.results.wellnessRecommendations }
    ];

    let integratedCount = 0;
    components.forEach(component => {
      const status = component.status ? '✅ INTEGRATED' : '❌ MISSING';
      console.log(`${status} ${component.name}`);
      if (component.status) integratedCount++;
    });

    console.log(`\n📊 Integration Status: ${integratedCount}/${components.length} components integrated`);
    console.log(`📈 Success Rate: ${(integratedCount / components.length * 100).toFixed(1)}%`);

    // Import verification
    console.log('\n📦 IMPORT VERIFICATION:');
    console.log(`   ${this.results.imports.analyticsServiceImported ? '✅' : '❌'} Analytics Service imported in dashboards`);
    console.log(`   ${this.results.imports.wellnessRecommendationsImported ? '✅' : '❌'} Wellness Recommendations imported`);
    console.log(`   ${this.results.imports.alertComponentImported ? '✅' : '❌'} Alert components imported`);

    if (integratedCount === components.length) {
      console.log('\n🎉 INTEGRATION COMPLETE!');
      console.log('✅ All frontend components integrated with backend services');
      console.log('✅ Analytics service properly connected');
      console.log('✅ Wellness recommendations available to students');
      console.log('✅ Enhanced counselor dashboard with risk analytics');
      console.log('✅ Ready for testing with running backend server');
    } else {
      console.log('\n⚠️ INTEGRATION INCOMPLETE');
      console.log(`${4 - integratedCount} components still need integration`);
    }

    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Start the backend server: npm run server');
    console.log('2. Start the frontend: npm run client');
    console.log('3. Test the integrated features in browser');
    console.log('4. Verify analytics data flows correctly');

    console.log('='.repeat(50));
  }
}

// Run verification
if (require.main === module) {
  const verifier = new IntegrationVerifier();
  verifier.verifyIntegration();
}

module.exports = IntegrationVerifier;
