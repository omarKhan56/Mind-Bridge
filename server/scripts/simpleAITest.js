const mongoose = require('mongoose');
const User = require('../models/User');
const aiAnalysisService = require('../services/aiAnalysis');
require('dotenv').config();

const simpleTest = async () => {
  try {
    console.log('🧪 Simple AI Analysis Test');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    const testUser = await User.findOne({ role: 'student' });
    if (!testUser) {
      console.log('❌ No student found');
      return;
    }
    
    console.log(`Testing user: ${testUser.name}`);
    
    // Test core analysis
    const analysis = await aiAnalysisService.analyzeUser(testUser._id);
    
    console.log('✅ Results:');
    console.log(`Risk: ${analysis.risk.currentRiskLevel} (${analysis.risk.riskScore}/100)`);
    console.log(`Status: ${analysis.summary.overallStatus}`);
    console.log(`Insights: ${analysis.insights.keyInsights?.length || 0}`);
    
    // Test database storage
    const updatedUser = await User.findById(testUser._id);
    console.log(`Stored risk: ${updatedUser.aiAnalysis?.riskLevel || 'none'}`);
    
    console.log('✅ AI system working correctly!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

simpleTest();
