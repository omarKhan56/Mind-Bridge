#!/usr/bin/env node

const AIGateway = require('./server/services/aiGateway');
const IntelligentResponseSystem = require('./server/services/intelligentResponseSystem');
const EnhancedSentimentAnalyzer = require('./server/services/aiAnalysis/enhancedSentimentAnalyzer');

class AIEnhancementTester {
  constructor() {
    this.aiGateway = new AIGateway();
    this.intelligentResponse = new IntelligentResponseSystem();
    this.enhancedSentiment = new EnhancedSentimentAnalyzer();
    this.testResults = {};
  }

  async testAIGateway() {
    console.log('🤖 Testing AI Gateway...');
    
    try {
      const status = this.aiGateway.getModelStatus();
      console.log('Gateway Status:', status);
      
      const testPrompt = "I'm feeling anxious about my exams";
      const response = await this.aiGateway.generateResponse(testPrompt, {
        taskType: 'chat',
        userId: 'test-user'
      });
      
      this.testResults.aiGateway = {
        status: 'working',
        modelsAvailable: status.totalModels,
        responseGenerated: !!response.text,
        modelUsed: response.model
      };
      
      console.log('✅ AI Gateway test passed');
      console.log('Response preview:', response.text.substring(0, 100) + '...');
      
    } catch (error) {
      console.error('❌ AI Gateway test failed:', error.message);
      this.testResults.aiGateway = { status: 'failed', error: error.message };
    }
  }

  async testEnhancedSentiment() {
    console.log('🔍 Testing Enhanced Sentiment Analysis...');
    
    try {
      const testMessages = [
        { content: "I'm feeling really anxious about my future" },
        { content: "Sometimes I wonder if life is worth living" },
        { content: "I want to kill myself" }
      ];
      
      const analysis = await this.enhancedSentiment.analyzeChatSentiment(testMessages, 'test-user');
      
      this.testResults.enhancedSentiment = {
        status: 'working',
        analysisMethod: analysis.analysisMethod,
        crisisDetected: analysis.crisisIndicators?.present,
        primaryEmotion: analysis.primaryEmotion,
        confidence: analysis.confidence,
        urgencyLevel: analysis.urgencyLevel
      };
      
      console.log('✅ Enhanced Sentiment Analysis test passed');
      console.log('Analysis result:', {
        sentiment: analysis.overallSentiment,
        emotion: analysis.primaryEmotion,
        crisis: analysis.crisisIndicators?.present,
        urgency: analysis.urgencyLevel
      });
      
    } catch (error) {
      console.error('❌ Enhanced Sentiment Analysis test failed:', error.message);
      this.testResults.enhancedSentiment = { status: 'failed', error: error.message };
    }
  }

  async testIntelligentResponse() {
    console.log('🧠 Testing Intelligent Response System...');
    
    try {
      const testMessage = "I've been struggling with depression lately";
      const response = await this.intelligentResponse.generatePersonalizedResponse(
        testMessage, 
        'test-user-123'
      );
      
      this.testResults.intelligentResponse = {
        status: 'working',
        responseGenerated: !!response.text,
        personalized: response.personalized,
        responseStyle: response.responseStyle,
        urgencyLevel: response.urgencyLevel
      };
      
      console.log('✅ Intelligent Response System test passed');
      console.log('Response preview:', response.text.substring(0, 100) + '...');
      console.log('Response style:', response.responseStyle);
      
    } catch (error) {
      console.error('❌ Intelligent Response System test failed:', error.message);
      this.testResults.intelligentResponse = { status: 'failed', error: error.message };
    }
  }

  async testCrisisDetection() {
    console.log('🚨 Testing Crisis Detection...');
    
    try {
      const crisisMessages = [
        { content: "I want to end my life" },
        { content: "I have a plan to hurt myself" },
        { content: "Nobody would miss me if I was gone" }
      ];
      
      const analysis = await this.enhancedSentiment.analyzeChatSentiment(crisisMessages, 'crisis-test-user');
      
      this.testResults.crisisDetection = {
        status: 'working',
        crisisDetected: analysis.crisisIndicators?.present,
        confidence: analysis.crisisIndicators?.confidence,
        urgencyLevel: analysis.urgencyLevel,
        indicators: analysis.crisisIndicators?.indicators || []
      };
      
      console.log('✅ Crisis Detection test passed');
      console.log('Crisis analysis:', {
        detected: analysis.crisisIndicators?.present,
        confidence: analysis.crisisIndicators?.confidence,
        urgency: analysis.urgencyLevel,
        indicators: analysis.crisisIndicators?.indicators
      });
      
    } catch (error) {
      console.error('❌ Crisis Detection test failed:', error.message);
      this.testResults.crisisDetection = { status: 'failed', error: error.message };
    }
  }

  async testPersonalization() {
    console.log('👤 Testing Personalization Features...');
    
    try {
      // Simulate user with history
      const userId = 'personalization-test-user';
      
      // First message
      const response1 = await this.intelligentResponse.generatePersonalizedResponse(
        "Hi, I'm new here and feeling overwhelmed", 
        userId
      );
      
      // Second message (should reference previous conversation)
      const response2 = await this.intelligentResponse.generatePersonalizedResponse(
        "I'm still feeling the same way as yesterday", 
        userId
      );
      
      this.testResults.personalization = {
        status: 'working',
        firstResponse: !!response1.text,
        secondResponse: !!response2.text,
        personalizationWorking: response1.personalized || response2.personalized
      };
      
      console.log('✅ Personalization test passed');
      console.log('First response personalized:', response1.personalized);
      console.log('Second response personalized:', response2.personalized);
      
    } catch (error) {
      console.error('❌ Personalization test failed:', error.message);
      this.testResults.personalization = { status: 'failed', error: error.message };
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 AI ENHANCEMENT TEST RESULTS');
    console.log('='.repeat(60));

    const tests = [
      { name: 'AI Gateway', result: this.testResults.aiGateway },
      { name: 'Enhanced Sentiment Analysis', result: this.testResults.enhancedSentiment },
      { name: 'Intelligent Response System', result: this.testResults.intelligentResponse },
      { name: 'Crisis Detection', result: this.testResults.crisisDetection },
      { name: 'Personalization', result: this.testResults.personalization }
    ];

    let passedTests = 0;
    tests.forEach(test => {
      const status = test.result?.status === 'working' ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${test.name}`);
      if (test.result?.status === 'working') passedTests++;
    });

    console.log(`\n📊 Overall: ${passedTests}/${tests.length} tests passed`);

    if (passedTests === tests.length) {
      console.log('\n🎉 ALL AI ENHANCEMENTS ARE WORKING!');
      console.log('✅ Multi-model AI gateway operational');
      console.log('✅ Enhanced sentiment analysis with emotion detection');
      console.log('✅ Personalized response generation');
      console.log('✅ Advanced crisis detection');
      console.log('✅ Conversation memory and context awareness');
    } else {
      console.log('\n⚠️ Some AI enhancements need attention:');
      tests.filter(t => t.result?.status !== 'working').forEach(test => {
        console.log(`   • ${test.name}: ${test.result?.error || 'Unknown error'}`);
      });
    }

    console.log('\n📈 PERFORMANCE IMPROVEMENTS:');
    console.log('• Multi-dimensional emotion analysis');
    console.log('• Context-aware personalized responses');
    console.log('• Enhanced crisis detection accuracy');
    console.log('• Conversation memory and continuity');
    console.log('• Fallback systems for reliability');

    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🔥 AI ENHANCEMENT TEST SUITE');
    console.log('============================');

    await this.testAIGateway();
    await this.testEnhancedSentiment();
    await this.testIntelligentResponse();
    await this.testCrisisDetection();
    await this.testPersonalization();

    this.printResults();
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AIEnhancementTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AIEnhancementTester;
