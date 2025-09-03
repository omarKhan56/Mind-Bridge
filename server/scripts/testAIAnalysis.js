const mongoose = require('mongoose');
const User = require('../models/User');
const AISession = require('../models/AISession');
const WellnessEntry = require('../models/WellnessEntry');
const aiAnalysisService = require('../services/aiAnalysis');
require('dotenv').config();

const testAIAnalysis = async () => {
  try {
    console.log('🔍 Starting AI Analysis Test...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    console.log('✅ Connected to database');
    
    // Find a test user
    const testUser = await User.findOne({ role: 'student' });
    if (!testUser) {
      console.log('❌ No student users found for testing');
      process.exit(1);
    }
    
    console.log(`🧪 Testing AI analysis for user: ${testUser.name} (${testUser.email})`);
    
    // Create some test data if needed
    await createTestData(testUser._id);
    
    // Run AI analysis
    console.log('🤖 Running AI analysis...');
    const analysis = await aiAnalysisService.analyzeUser(testUser._id);
    
    console.log('📊 Analysis Results:');
    console.log('==================');
    console.log(`Risk Level: ${analysis.risk.currentRiskLevel}`);
    console.log(`Risk Score: ${analysis.risk.riskScore}/100`);
    console.log(`Sentiment: ${analysis.sentiment.combined?.overallSentiment || 'N/A'}/10`);
    console.log(`Overall Status: ${analysis.summary.overallStatus}`);
    console.log(`Insights Generated: ${analysis.insights.keyInsights?.length || 0}`);
    
    if (analysis.insights.keyInsights?.length > 0) {
      console.log('\n💡 Key Insights:');
      analysis.insights.keyInsights.forEach((insight, i) => {
        console.log(`${i + 1}. ${insight.title}: ${insight.description}`);
      });
    }
    
    if (analysis.insights.personalizedRecommendations?.length > 0) {
      console.log('\n🎯 Recommendations:');
      analysis.insights.personalizedRecommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority}] ${rec.recommendation}`);
      });
    }
    
    console.log('\n✅ AI Analysis test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ AI Analysis test failed:', error);
    process.exit(1);
  }
};

const createTestData = async (userId) => {
  console.log('📝 Creating test data...');
  
  // Create test AI session with messages
  const existingSessions = await AISession.find({ user: userId });
  if (existingSessions.length === 0) {
    await AISession.create({
      user: userId,
      messages: [
        { sender: 'user', content: 'I have been feeling really anxious about my exams lately', timestamp: new Date() },
        { sender: 'ai', content: 'I understand exam anxiety can be overwhelming. Can you tell me more about what specifically worries you?', timestamp: new Date() },
        { sender: 'user', content: 'I feel like I am not prepared enough and I might fail', timestamp: new Date() },
        { sender: 'ai', content: 'Those feelings are valid. Let me suggest some study strategies and stress management techniques.', timestamp: new Date() }
      ],
      mood: 'anxious',
      createdAt: new Date()
    });
    console.log('✅ Created test AI session');
  }
  
  // Create test wellness entries
  const existingWellness = await WellnessEntry.find({ user: userId });
  if (existingWellness.length === 0) {
    const dates = [];
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    const wellnessEntries = dates.map((date, index) => ({
      user: userId,
      date,
      mood: Math.max(1, Math.min(10, 5 + Math.sin(index) * 2)), // Varying mood
      stress: Math.max(1, Math.min(10, 6 + Math.cos(index) * 2)), // Varying stress
      sleep: Math.max(1, Math.min(10, 7 + Math.sin(index + 1) * 1.5)), // Varying sleep
      notes: index % 3 === 0 ? 'Feeling better today' : index % 3 === 1 ? 'Bit stressed about work' : ''
    }));
    
    await WellnessEntry.insertMany(wellnessEntries);
    console.log('✅ Created test wellness entries');
  }
  
  // Update user with screening data if missing
  if (!userId.screeningData || !userId.screeningData.phq9Score) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        'screeningData.phq9Score': 8, // Mild depression
        'screeningData.gad7Score': 6, // Mild anxiety
        'screeningData.ghqScore': 12, // Some distress
        'screeningData.riskLevel': 'moderate',
        'screeningData.lastScreening': new Date()
      }
    });
    console.log('✅ Updated user screening data');
  }
};

testAIAnalysis();
