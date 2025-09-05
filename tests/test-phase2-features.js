#!/usr/bin/env node

const RiskPredictionEngine = require('./server/services/riskPredictionEngine');
const BehavioralPatternAnalyzer = require('./server/services/behavioralPatternAnalyzer');
const ProactiveWellnessCoach = require('./server/services/proactiveWellnessCoach');

class Phase2Tester {
  constructor() {
    this.riskEngine = new RiskPredictionEngine();
    this.patternAnalyzer = new BehavioralPatternAnalyzer();
    this.wellnessCoach = new ProactiveWellnessCoach();
    this.testResults = {};
  }

  async testRiskPredictionEngine() {
    console.log('🎯 Testing Risk Prediction Engine...');
    
    try {
      const testUserId = '507f1f77bcf86cd799439011';
      const riskData = await this.riskEngine.calculateRiskScore(testUserId);
      
      this.testResults.riskPrediction = {
        status: 'working',
        riskScore: riskData.riskScore,
        riskLevel: riskData.riskLevel,
        factorsDetected: riskData.factors?.length || 0,
        hasSessionAnalysis: !!riskData.sessionCount
      };
      
      console.log('✅ Risk Prediction Engine test passed');
      console.log('   Risk Score:', riskData.riskScore);
      console.log('   Risk Level:', riskData.riskLevel);
      console.log('   Factors:', riskData.factors?.length || 0);
      
    } catch (error) {
      console.error('❌ Risk Prediction Engine test failed:', error.message);
      this.testResults.riskPrediction = { status: 'failed', error: error.message };
    }
  }

  async testBehavioralPatternAnalyzer() {
    console.log('\n🔍 Testing Behavioral Pattern Analyzer...');
    
    try {
      const testUserId = '507f1f77bcf86cd799439011';
      const patterns = await this.patternAnalyzer.analyzeUserPatterns(testUserId);
      
      this.testResults.behavioralPatterns = {
        status: 'working',
        hasFrequencyAnalysis: !!patterns.chatFrequency,
        hasResponsePatterns: !!patterns.responsePatterns,
        hasMoodProgression: !!patterns.moodProgression,
        hasEngagementLevel: !!patterns.engagementLevel,
        anomaliesDetected: patterns.anomalies?.length || 0,
        insightsGenerated: patterns.insights?.length || 0
      };
      
      console.log('✅ Behavioral Pattern Analyzer test passed');
      console.log('   Chat Frequency Pattern:', patterns.chatFrequency?.pattern || 'N/A');
      console.log('   Engagement Level:', patterns.engagementLevel?.level || 'N/A');
      console.log('   Anomalies Detected:', patterns.anomalies?.length || 0);
      console.log('   Insights Generated:', patterns.insights?.length || 0);
      
    } catch (error) {
      console.error('❌ Behavioral Pattern Analyzer test failed:', error.message);
      this.testResults.behavioralPatterns = { status: 'failed', error: error.message };
    }
  }

  async testProactiveWellnessCoach() {
    console.log('\n🌟 Testing Proactive Wellness Coach...');
    
    try {
      const testUserId = '507f1f77bcf86cd799439011';
      const recommendations = await this.wellnessCoach.generateWellnessRecommendations(testUserId);
      
      this.testResults.wellnessCoach = {
        status: 'working',
        hasRecommendations: !!recommendations.recommendations,
        immediateActions: recommendations.recommendations?.immediate?.length || 0,
        shortTermActions: recommendations.recommendations?.shortTerm?.length || 0,
        longTermActions: recommendations.recommendations?.longTerm?.length || 0,
        goalsGenerated: recommendations.recommendations?.goals?.length || 0,
        riskLevel: recommendations.riskLevel
      };
      
      console.log('✅ Proactive Wellness Coach test passed');
      console.log('   Risk Level:', recommendations.riskLevel);
      console.log('   Immediate Actions:', recommendations.recommendations?.immediate?.length || 0);
      console.log('   Short-term Actions:', recommendations.recommendations?.shortTerm?.length || 0);
      console.log('   Goals Generated:', recommendations.recommendations?.goals?.length || 0);
      
    } catch (error) {
      console.error('❌ Proactive Wellness Coach test failed:', error.message);
      this.testResults.wellnessCoach = { status: 'failed', error: error.message };
    }
  }

  async testProactiveInterventions() {
    console.log('\n🚨 Testing Proactive Interventions...');
    
    try {
      const testUserId = '507f1f77bcf86cd799439011';
      
      // Test different intervention types
      const interventions = await Promise.all([
        this.wellnessCoach.generateProactiveIntervention(testUserId, 'risk_increase', { riskScore: 8 }),
        this.wellnessCoach.generateProactiveIntervention(testUserId, 'engagement_drop', { daysSinceLastSession: 7 }),
        this.wellnessCoach.generateProactiveIntervention(testUserId, 'mood_decline', { moodTrend: 'declining' })
      ]);
      
      this.testResults.proactiveInterventions = {
        status: 'working',
        interventionsGenerated: interventions.length,
        hasRiskIntervention: interventions.some(i => i.trigger === 'risk_increase'),
        hasEngagementIntervention: interventions.some(i => i.trigger === 'engagement_drop'),
        hasMoodIntervention: interventions.some(i => i.trigger === 'mood_decline')
      };
      
      console.log('✅ Proactive Interventions test passed');
      console.log('   Interventions Generated:', interventions.length);
      console.log('   Risk Intervention:', interventions[0].urgency);
      console.log('   Engagement Intervention:', interventions[1].urgency);
      
    } catch (error) {
      console.error('❌ Proactive Interventions test failed:', error.message);
      this.testResults.proactiveInterventions = { status: 'failed', error: error.message };
    }
  }

  async testGoalTracking() {
    console.log('\n🎯 Testing Goal Tracking...');
    
    try {
      const testUserId = '507f1f77bcf86cd799439011';
      const goalId = 'test-goal-123';
      
      const progress = await this.wellnessCoach.trackGoalProgress(testUserId, goalId, 75);
      
      this.testResults.goalTracking = {
        status: 'working',
        progressTracked: progress.progress,
        nextMilestone: progress.nextMilestone,
        hasTimestamp: !!progress.updatedAt
      };
      
      console.log('✅ Goal Tracking test passed');
      console.log('   Progress Tracked:', progress.progress + '%');
      console.log('   Next Milestone:', progress.nextMilestone + '%');
      
    } catch (error) {
      console.error('❌ Goal Tracking test failed:', error.message);
      this.testResults.goalTracking = { status: 'failed', error: error.message };
    }
  }

  async testCelebrationSystem() {
    console.log('\n🎉 Testing Celebration System...');
    
    try {
      const testUserId = '507f1f77bcf86cd799439011';
      
      const celebration = await this.wellnessCoach.generateCelebration(testUserId, {
        type: 'goal_completed',
        goalName: 'Daily mood tracking',
        completionDate: new Date()
      });
      
      this.testResults.celebrationSystem = {
        status: 'working',
        celebrationGenerated: !!celebration.message,
        hasAchievement: !!celebration.achievement,
        messageLength: celebration.message?.length || 0
      };
      
      console.log('✅ Celebration System test passed');
      console.log('   Celebration Message:', celebration.message.substring(0, 50) + '...');
      
    } catch (error) {
      console.error('❌ Celebration System test failed:', error.message);
      this.testResults.celebrationSystem = { status: 'failed', error: error.message };
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 PHASE 2 FEATURES TEST RESULTS');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Risk Prediction Engine', result: this.testResults.riskPrediction },
      { name: 'Behavioral Pattern Analyzer', result: this.testResults.behavioralPatterns },
      { name: 'Proactive Wellness Coach', result: this.testResults.wellnessCoach },
      { name: 'Proactive Interventions', result: this.testResults.proactiveInterventions },
      { name: 'Goal Tracking', result: this.testResults.goalTracking },
      { name: 'Celebration System', result: this.testResults.celebrationSystem }
    ];

    let passedTests = 0;
    tests.forEach(test => {
      const status = test.result?.status === 'working' ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${test.name}`);
      if (test.result?.status === 'working') passedTests++;
    });

    console.log(`\n📊 Overall: ${passedTests}/${tests.length} tests passed`);

    if (passedTests === tests.length) {
      console.log('\n🎉 ALL PHASE 2 FEATURES ARE WORKING!');
      console.log('✅ Risk prediction and scoring');
      console.log('✅ Behavioral pattern analysis');
      console.log('✅ Proactive wellness coaching');
      console.log('✅ Automated interventions');
      console.log('✅ Goal tracking and progress');
      console.log('✅ Achievement celebrations');
    } else {
      console.log('\n⚠️ Some Phase 2 features need attention:');
      tests.filter(t => t.result?.status !== 'working').forEach(test => {
        console.log(`   • ${test.name}: ${test.result?.error || 'Unknown error'}`);
      });
    }

    console.log('\n📈 PHASE 2 CAPABILITIES:');
    console.log('• Predictive risk assessment with ML-based scoring');
    console.log('• Multi-dimensional behavioral pattern analysis');
    console.log('• Proactive wellness recommendations and interventions');
    console.log('• Automated anomaly detection and alerts');
    console.log('• Personalized goal setting and progress tracking');
    console.log('• Achievement recognition and celebration system');

    console.log('\n🎯 IMPACT:');
    console.log('• Early intervention through predictive analytics');
    console.log('• Personalized wellness coaching at scale');
    console.log('• Proactive mental health support');
    console.log('• Data-driven intervention strategies');
    console.log('• Enhanced user engagement and motivation');

    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🚀 PHASE 2: PREDICTIVE ANALYTICS & ADVANCED FEATURES TEST SUITE');
    console.log('================================================================');

    await this.testRiskPredictionEngine();
    await this.testBehavioralPatternAnalyzer();
    await this.testProactiveWellnessCoach();
    await this.testProactiveInterventions();
    await this.testGoalTracking();
    await this.testCelebrationSystem();

    this.printResults();
  }
}

// Run the tests
if (require.main === module) {
  const tester = new Phase2Tester();
  tester.runAllTests().catch(console.error);
}

module.exports = Phase2Tester;
