const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const testAIEndpoints = async () => {
  try {
    console.log('🔍 Testing AI Analysis API Endpoints...');
    
    // Connect to database to get a test user
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    // Get test user and create token
    const testUser = await User.findOne({ role: 'student' });
    if (!testUser) {
      console.log('❌ No test user found');
      process.exit(1);
    }
    
    // Create a test JWT token (simplified for testing)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: testUser._id, role: testUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const baseURL = 'http://localhost:5001/api/ai-analysis';
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log(`🧪 Testing with user: ${testUser.name}`);
    
    // Test 1: Get user insights
    console.log('\n📊 Test 1: User Insights Endpoint');
    try {
      const response = await axios.get(`${baseURL}/insights`, { headers });
      console.log('✅ User insights loaded successfully');
      console.log(`   - Insights: ${response.data.personalInsights?.length || 0}`);
      console.log(`   - Status: ${response.data.overallStatus}`);
      console.log(`   - Recommendations: ${response.data.recommendations?.length || 0}`);
    } catch (error) {
      console.log('❌ User insights failed:', error.response?.data?.message || error.message);
    }
    
    // Test 2: Get analysis history
    console.log('\n📈 Test 2: Analysis History Endpoint');
    try {
      const response = await axios.get(`${baseURL}/history`, { headers });
      console.log('✅ Analysis history loaded successfully');
      console.log(`   - Last Analysis: ${response.data.lastAnalysis || 'None'}`);
      console.log(`   - Risk Level: ${response.data.riskLevel || 'Unknown'}`);
      console.log(`   - Sentiment: ${response.data.sentiment || 'N/A'}/10`);
    } catch (error) {
      console.log('❌ Analysis history failed:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Real-time message analysis
    console.log('\n💬 Test 3: Real-time Message Analysis');
    try {
      const response = await axios.post(`${baseURL}/analyze-message`, {
        message: 'I have been feeling really anxious and overwhelmed lately',
        sessionId: 'test-session'
      }, { headers });
      console.log('✅ Message analysis completed');
      console.log(`   - Sentiment: ${response.data.sentiment}/10`);
      console.log(`   - Crisis Detected: ${response.data.crisisDetected}`);
      console.log(`   - Urgency Level: ${response.data.urgencyLevel}/5`);
    } catch (error) {
      console.log('❌ Message analysis failed:', error.response?.data?.message || error.message);
    }
    
    // Test 4: Full user analysis
    console.log('\n🧠 Test 4: Full User Analysis');
    try {
      const response = await axios.get(`${baseURL}/user`, { headers });
      console.log('✅ Full analysis completed');
      console.log(`   - Risk Level: ${response.data.risk?.currentRiskLevel}`);
      console.log(`   - Risk Score: ${response.data.risk?.riskScore}/100`);
      console.log(`   - Alert Counselor: ${response.data.risk?.alertCounselor}`);
      console.log(`   - Patterns Detected: ${Object.keys(response.data.patterns || {}).length}`);
    } catch (error) {
      console.log('❌ Full analysis failed:', error.response?.data?.message || error.message);
    }
    
    // Test 5: Test with counselor role (if available)
    const counselor = await User.findOne({ role: 'counselor' });
    if (counselor) {
      console.log('\n👨‍⚕️ Test 5: Counselor Insights');
      const counselorToken = jwt.sign(
        { userId: counselor._id, role: counselor.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      
      try {
        const response = await axios.get(`${baseURL}/counselor-insights/${testUser._id}`, {
          headers: { Authorization: `Bearer ${counselorToken}` }
        });
        console.log('✅ Counselor insights loaded');
        console.log(`   - Risk Assessment: ${response.data.riskAssessment?.currentLevel}`);
        console.log(`   - Alert Level: ${response.data.alertLevel}`);
        console.log(`   - Session Prep Topics: ${response.data.sessionPreparation?.keyTopics?.length || 0}`);
      } catch (error) {
        console.log('❌ Counselor insights failed:', error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n✅ AI Endpoints testing completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ API testing failed:', error.message);
    process.exit(1);
  }
};

testAIEndpoints();
