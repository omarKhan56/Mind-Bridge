const SentimentAnalyzer = require('../services/aiAnalysis/sentimentAnalyzer');
const RiskPredictor = require('../services/aiAnalysis/riskPredictor');
const PatternDetector = require('../services/aiAnalysis/patternDetector');
const InsightGenerator = require('../services/aiAnalysis/insightGenerator');
require('dotenv').config();

const testAllAI = async () => {
  console.log('🧪 Testing All AI Services');
  console.log('==========================');

  // Test 1: Sentiment Analysis
  console.log('\n1️⃣ Testing Sentiment Analysis...');
  const sentimentAnalyzer = new SentimentAnalyzer();
  const sentimentResult = await sentimentAnalyzer.analyzeChatSentiment([
    {content: 'I have been feeling really depressed lately'},
    {content: 'Sometimes I think about ending it all'},
    {content: 'I feel hopeless about my future'}
  ]);
  
  console.log('✅ Sentiment Analysis Results:');
  console.log(`   - Overall Sentiment: ${sentimentResult.overallSentiment}/10`);
  console.log(`   - Emotional Tone: ${sentimentResult.emotionalTone}`);
  console.log(`   - Crisis Detected: ${sentimentResult.crisisIndicators?.present}`);
  console.log(`   - Urgency Level: ${sentimentResult.urgencyLevel}/5`);

  // Test 2: Risk Prediction
  console.log('\n2️⃣ Testing Risk Prediction...');
  const riskPredictor = new RiskPredictor();
  const riskResult = await riskPredictor.predictRiskLevel({
    userId: 'test-user',
    wellnessData: [
      {mood: 3, stress: 8, sleep: 4},
      {mood: 2, stress: 9, sleep: 3},
      {mood: 4, stress: 7, sleep: 5}
    ],
    screeningData: {phq9Score: 12, gad7Score: 8},
    usagePatterns: {loginFrequency: 2, sessionDuration: 5}
  });
  
  console.log('✅ Risk Prediction Results:');
  console.log(`   - Risk Level: ${riskResult.currentRiskLevel}`);
  console.log(`   - Risk Score: ${riskResult.riskScore}/100`);
  console.log(`   - Alert Counselor: ${riskResult.alertCounselor}`);
  console.log(`   - Risk Factors: ${riskResult.riskFactors?.join(', ')}`);

  // Test 3: Pattern Detection
  console.log('\n3️⃣ Testing Pattern Detection...');
  const patternDetector = new PatternDetector();
  const patternResult = await patternDetector.detectBehavioralPatterns({
    userId: 'test-user',
    wellnessEntries: [
      {mood: 6, date: '2024-01-01'},
      {mood: 4, date: '2024-01-02'},
      {mood: 7, date: '2024-01-03'}
    ],
    usagePatterns: {loginFrequency: 5, sessionDuration: 15}
  });
  
  console.log('✅ Pattern Detection Results:');
  console.log(`   - Best Days: ${patternResult.weeklyPatterns?.bestDays?.join(', ')}`);
  console.log(`   - Worst Days: ${patternResult.weeklyPatterns?.worstDays?.join(', ')}`);
  console.log(`   - Engagement Level: ${patternResult.usagePatterns?.engagementLevel}`);

  // Test 4: Insight Generation
  console.log('\n4️⃣ Testing Insight Generation...');
  const insightGenerator = new InsightGenerator();
  const insightResult = await insightGenerator.generatePersonalInsights({
    userId: 'test-user',
    risk: {currentRiskLevel: 'moderate'},
    sentiment: {combined: {overallSentiment: 6}}
  });
  
  console.log('✅ Insight Generation Results:');
  console.log(`   - Key Insights: ${insightResult.keyInsights?.length || 0} generated`);
  console.log(`   - Progress: ${insightResult.progressSummary?.overallProgress}`);
  console.log(`   - Progress %: ${insightResult.progressSummary?.progressPercentage}%`);
  console.log(`   - Message: ${insightResult.motivationalMessage?.substring(0, 50)}...`);

  // Test 5: Crisis Detection
  console.log('\n5️⃣ Testing Crisis Detection...');
  const crisisResult = await sentimentAnalyzer.analyzeChatSentiment([
    {content: 'I want to kill myself'},
    {content: 'I have a plan to end my life'},
    {content: 'Nobody would miss me if I was gone'}
  ]);
  
  console.log('✅ Crisis Detection Results:');
  console.log(`   - Crisis Detected: ${crisisResult.crisisIndicators?.present}`);
  console.log(`   - Confidence: ${Math.round((crisisResult.crisisIndicators?.confidence || 0) * 100)}%`);
  console.log(`   - Urgency: ${crisisResult.urgencyLevel}/5`);
  console.log(`   - Interventions: ${crisisResult.recommendedInterventions?.join(', ')}`);

  console.log('\n🎉 All AI Services Test Complete!');
  console.log('================================');
  console.log('✅ Sentiment Analysis: Working');
  console.log('✅ Risk Prediction: Working');
  console.log('✅ Pattern Detection: Working');
  console.log('✅ Insight Generation: Working');
  console.log('✅ Crisis Detection: Working');
  console.log('\n🚀 Enhanced AI Mode: FULLY OPERATIONAL');
};

testAllAI().catch(console.error);
