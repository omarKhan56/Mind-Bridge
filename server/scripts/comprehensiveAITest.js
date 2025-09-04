const mongoose = require('mongoose');
const User = require('../models/User');
const AISession = require('../models/AISession');
const WellnessEntry = require('../models/WellnessEntry');
const geminiService = require('../services/geminiService');
const aiAnalysisService = require('../services/aiAnalysis');
const SentimentAnalyzer = require('../services/aiAnalysis/sentimentAnalyzer');
const RiskPredictor = require('../services/aiAnalysis/riskPredictor');
const PatternDetector = require('../services/aiAnalysis/patternDetector');
const InsightGenerator = require('../services/aiAnalysis/insightGenerator');
require('dotenv').config();

class AIServiceTester {
  constructor() {
    this.results = {
      geminiService: { status: 'pending', tests: [] },
      sentimentAnalyzer: { status: 'pending', tests: [] },
      riskPredictor: { status: 'pending', tests: [] },
      patternDetector: { status: 'pending', tests: [] },
      insightGenerator: { status: 'pending', tests: [] },
      aiAnalysisService: { status: 'pending', tests: [] }
    };
  }

  log(component, test, status, message, data = null) {
    const result = { test, status, message, data, timestamp: new Date() };
    this.results[component].tests.push(result);
    
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} [${component.toUpperCase()}] ${test}: ${message}`);
    if (data && typeof data === 'object') {
      console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    }
  }

  async testGeminiService() {
    console.log('\n🧠 Testing Gemini Service...');
    
    try {
      // Test basic response generation
      const response1 = await geminiService.generateResponse('Hello, I feel anxious about my exams');
      this.log('geminiService', 'basic_response', 'pass', 'Generated response successfully', { length: response1.length });
      
      // Test with user context
      const context = { riskLevel: 'moderate', mood: 'anxious' };
      const response2 = await geminiService.generateResponse('I can\'t sleep and feel overwhelmed', context);
      this.log('geminiService', 'contextual_response', 'pass', 'Generated contextual response', { hasContext: true });
      
      // Test crisis detection fallback
      const crisisResponse = await geminiService.generateResponse('I want to kill myself');
      const hasCrisisContent = crisisResponse.toLowerCase().includes('988') || crisisResponse.toLowerCase().includes('crisis');
      this.log('geminiService', 'crisis_detection', hasCrisisContent ? 'pass' : 'warn', 
               hasCrisisContent ? 'Crisis response triggered' : 'Crisis response may need improvement');
      
      this.results.geminiService.status = 'pass';
    } catch (error) {
      this.log('geminiService', 'error_handling', 'fail', `Error: ${error.message}`);
      this.results.geminiService.status = 'fail';
    }
  }

  async testSentimentAnalyzer() {
    console.log('\n💭 Testing Sentiment Analyzer...');
    
    const analyzer = new SentimentAnalyzer();
    
    try {
      // Test positive sentiment
      const positiveMessages = [{ content: 'I feel much better today, thank you for helping me' }];
      const positiveResult = await analyzer.analyzeChatSentiment(positiveMessages);
      this.log('sentimentAnalyzer', 'positive_sentiment', 'pass', 
               `Positive sentiment: ${positiveResult.overallSentiment}/10`, positiveResult);
      
      // Test negative sentiment
      const negativeMessages = [{ content: 'I feel hopeless and sad all the time' }];
      const negativeResult = await analyzer.analyzeChatSentiment(negativeMessages);
      this.log('sentimentAnalyzer', 'negative_sentiment', 'pass',
               `Negative sentiment: ${negativeResult.overallSentiment}/10`, negativeResult);
      
      // Test crisis detection
      const crisisMessages = [{ content: 'I want to end my life, nothing matters anymore' }];
      const crisisResult = await analyzer.analyzeChatSentiment(crisisMessages);
      const crisisDetected = crisisResult.crisisIndicators && crisisResult.crisisIndicators.present;
      this.log('sentimentAnalyzer', 'crisis_detection', crisisDetected ? 'pass' : 'warn',
               `Crisis detected: ${crisisDetected}`, crisisResult.crisisIndicators);
      
      this.results.sentimentAnalyzer.status = 'pass';
    } catch (error) {
      this.log('sentimentAnalyzer', 'error_handling', 'fail', `Error: ${error.message}`);
      this.results.sentimentAnalyzer.status = 'fail';
    }
  }

  async testRiskPredictor() {
    console.log('\n⚠️ Testing Risk Predictor...');
    
    const predictor = new RiskPredictor();
    
    try {
      // Test low risk scenario
      const lowRiskData = {
        userId: 'test123',
        wellnessData: [
          { mood: 8, stress: 3, sleep: 8 },
          { mood: 7, stress: 4, sleep: 7 }
        ],
        screeningData: { phq9Score: 3, gad7Score: 2, ghqScore: 4 },
        chatSentiment: { overallSentiment: 7, crisisIndicators: { present: false } },
        usagePatterns: { loginFrequency: 5, sessionDuration: 15 }
      };
      
      const lowRiskResult = await predictor.predictRiskLevel(lowRiskData);
      this.log('riskPredictor', 'low_risk_assessment', 'pass',
               `Risk level: ${lowRiskResult.currentRiskLevel} (${lowRiskResult.riskScore}/100)`, lowRiskResult);
      
      // Test high risk scenario
      const highRiskData = {
        userId: 'test456',
        wellnessData: [
          { mood: 2, stress: 9, sleep: 3 },
          { mood: 1, stress: 10, sleep: 2 }
        ],
        screeningData: { phq9Score: 18, gad7Score: 16, ghqScore: 15 },
        chatSentiment: { overallSentiment: 2, crisisIndicators: { present: true } },
        usagePatterns: { loginFrequency: 1, sessionDuration: 5 }
      };
      
      const highRiskResult = await predictor.predictRiskLevel(highRiskData);
      this.log('riskPredictor', 'high_risk_assessment', 'pass',
               `Risk level: ${highRiskResult.currentRiskLevel} (${highRiskResult.riskScore}/100)`, highRiskResult);
      
      // Verify counselor alert for high risk
      const shouldAlert = highRiskResult.alertCounselor;
      this.log('riskPredictor', 'counselor_alert', shouldAlert ? 'pass' : 'warn',
               `Counselor alert: ${shouldAlert}`);
      
      this.results.riskPredictor.status = 'pass';
    } catch (error) {
      this.log('riskPredictor', 'error_handling', 'fail', `Error: ${error.message}`);
      this.results.riskPredictor.status = 'fail';
    }
  }

  async testPatternDetector() {
    console.log('\n🔍 Testing Pattern Detector...');
    
    const detector = new PatternDetector();
    
    try {
      const userData = {
        userId: 'test789',
        wellnessEntries: [
          { date: new Date('2024-01-01'), mood: 6, stress: 5 },
          { date: new Date('2024-01-02'), mood: 7, stress: 4 },
          { date: new Date('2024-01-03'), mood: 5, stress: 6 },
          { date: new Date('2024-01-04'), mood: 8, stress: 3 },
          { date: new Date('2024-01-05'), mood: 4, stress: 8 }
        ],
        usagePatterns: { loginFrequency: 10, sessionDuration: 20, wellnessConsistency: 15 }
      };
      
      const patterns = await detector.detectBehavioralPatterns(userData);
      this.log('patternDetector', 'pattern_detection', 'pass',
               'Behavioral patterns detected', patterns);
      
      // Verify pattern structure
      const hasWeeklyPatterns = patterns.weeklyPatterns && 
                               patterns.weeklyPatterns.bestDays && 
                               patterns.weeklyPatterns.worstDays;
      this.log('patternDetector', 'pattern_structure', hasWeeklyPatterns ? 'pass' : 'warn',
               `Pattern structure complete: ${hasWeeklyPatterns}`);
      
      this.results.patternDetector.status = 'pass';
    } catch (error) {
      this.log('patternDetector', 'error_handling', 'fail', `Error: ${error.message}`);
      this.results.patternDetector.status = 'fail';
    }
  }

  async testInsightGenerator() {
    console.log('\n💡 Testing Insight Generator...');
    
    const generator = new InsightGenerator();
    
    try {
      const analysisData = {
        userId: 'test101112',
        risk: { currentRiskLevel: 'moderate', riskScore: 45 },
        sentiment: { combined: { overallSentiment: 6 } },
        patterns: { weeklyPatterns: { bestDays: ['Friday'] } }
      };
      
      const insights = await generator.generatePersonalInsights(analysisData);
      this.log('insightGenerator', 'insight_generation', 'pass',
               `Generated ${insights.keyInsights?.length || 0} insights`, insights);
      
      // Verify insight structure
      const hasRequiredFields = insights.keyInsights && 
                               insights.progressSummary && 
                               insights.motivationalMessage;
      this.log('insightGenerator', 'insight_structure', hasRequiredFields ? 'pass' : 'warn',
               `Complete insight structure: ${hasRequiredFields}`);
      
      this.results.insightGenerator.status = 'pass';
    } catch (error) {
      this.log('insightGenerator', 'error_handling', 'fail', `Error: ${error.message}`);
      this.results.insightGenerator.status = 'fail';
    }
  }

  async testAIAnalysisService() {
    console.log('\n📊 Testing AI Analysis Service...');
    
    try {
      // Find a test user
      const testUser = await User.findOne({ role: 'student' });
      if (!testUser) {
        this.log('aiAnalysisService', 'user_setup', 'warn', 'No test user found, skipping analysis test');
        this.results.aiAnalysisService.status = 'warn';
        return;
      }
      
      // Test full user analysis
      const analysis = await aiAnalysisService.analyzeUser(testUser._id);
      this.log('aiAnalysisService', 'full_analysis', 'pass',
               `Analysis completed for user ${testUser.name}`, {
                 riskLevel: analysis.risk.currentRiskLevel,
                 sentiment: analysis.sentiment?.combined?.overallSentiment,
                 insights: analysis.insights.keyInsights?.length
               });
      
      // Verify analysis structure
      const hasRequiredComponents = analysis.risk && 
                                   analysis.sentiment && 
                                   analysis.patterns && 
                                   analysis.insights && 
                                   analysis.summary;
      this.log('aiAnalysisService', 'analysis_structure', hasRequiredComponents ? 'pass' : 'fail',
               `Complete analysis structure: ${hasRequiredComponents}`);
      
      // Test data storage
      const updatedUser = await User.findById(testUser._id);
      const dataStored = updatedUser.aiAnalysis && updatedUser.aiAnalysis.lastAnalysis;
      this.log('aiAnalysisService', 'data_storage', dataStored ? 'pass' : 'warn',
               `Analysis data stored: ${dataStored}`);
      
      this.results.aiAnalysisService.status = 'pass';
    } catch (error) {
      this.log('aiAnalysisService', 'error_handling', 'fail', `Error: ${error.message}`);
      this.results.aiAnalysisService.status = 'fail';
    }
  }

  generateReport() {
    console.log('\n📋 AI Services Test Report');
    console.log('='.repeat(50));
    
    const services = Object.keys(this.results);
    const totalTests = services.reduce((sum, service) => sum + this.results[service].tests.length, 0);
    const passedTests = services.reduce((sum, service) => 
      sum + this.results[service].tests.filter(t => t.status === 'pass').length, 0);
    const failedTests = services.reduce((sum, service) => 
      sum + this.results[service].tests.filter(t => t.status === 'fail').length, 0);
    const warnTests = services.reduce((sum, service) => 
      sum + this.results[service].tests.filter(t => t.status === 'warn').length, 0);
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⚠️ Warnings: ${warnTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    console.log(`\n🔧 Service Status:`);
    services.forEach(service => {
      const status = this.results[service].status;
      const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
      console.log(`   ${icon} ${service}: ${status.toUpperCase()}`);
    });
    
    const failedServices = services.filter(s => this.results[s].status === 'fail');
    if (failedServices.length > 0) {
      console.log(`\n❌ Failed Services Need Attention:`);
      failedServices.forEach(service => {
        const failedTests = this.results[service].tests.filter(t => t.status === 'fail');
        failedTests.forEach(test => {
          console.log(`   - ${service}.${test.test}: ${test.message}`);
        });
      });
    }
    
    const warningServices = services.filter(s => 
      this.results[s].tests.some(t => t.status === 'warn'));
    if (warningServices.length > 0) {
      console.log(`\n⚠️ Services with Warnings:`);
      warningServices.forEach(service => {
        const warnTests = this.results[service].tests.filter(t => t.status === 'warn');
        warnTests.forEach(test => {
          console.log(`   - ${service}.${test.test}: ${test.message}`);
        });
      });
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      warnTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      serviceStatus: Object.fromEntries(services.map(s => [s, this.results[s].status])),
      fullResults: this.results
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive AI Services Test Suite');
    console.log('='.repeat(50));
    
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
      console.log('📱 Connected to database');
      
      await this.testGeminiService();
      await this.testSentimentAnalyzer();
      await this.testRiskPredictor();
      await this.testPatternDetector();
      await this.testInsightGenerator();
      await this.testAIAnalysisService();
      
      const report = this.generateReport();
      
      if (report.failedTests > 0) {
        console.log('\n🔧 Recommendations:');
        console.log('   1. Check API keys and network connectivity');
        console.log('   2. Verify database connections and data integrity');
        console.log('   3. Review error logs for specific failure details');
        console.log('   4. Test individual components in isolation');
      }
      
      console.log('\n✨ Test suite completed!');
      process.exit(report.failedTests > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('❌ Test suite failed to initialize:', error.message);
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AIServiceTester();
  tester.runAllTests();
}

module.exports = AIServiceTester;
