const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const debugAI = async () => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('🔍 Testing AI Response Format...');
    
    const prompt = `
      Analyze this student's mental health data to predict risk level:
      
      User Data: {"mood": 5, "stress": 7}
      
      Return ONLY a JSON response with:
      {
        "currentRiskLevel": "moderate",
        "riskScore": 50,
        "riskFactors": ["high stress"],
        "alertCounselor": false
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📝 Raw AI Response:');
    console.log('==================');
    console.log(text);
    console.log('==================');
    
    // Try to parse
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      console.log('✅ Successfully parsed JSON:', parsed);
    } catch (error) {
      console.log('❌ JSON parse failed:', error.message);
      console.log('🔧 Cleaned text:', text.replace(/```json\n?|\n?```/g, '').trim());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

debugAI();
