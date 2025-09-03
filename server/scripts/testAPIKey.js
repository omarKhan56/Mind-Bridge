const { GoogleGenerativeAI } = require('@google/generative-ai');

const testAPIKey = async (apiKey) => {
  try {
    console.log('🔑 Testing Gemini API Key...');
    console.log(`Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent('Hello, this is a test message. Please respond with "API key is working".');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ API Key is VALID');
    console.log('📝 Test Response:', text);
    console.log('🚀 Enhanced AI analysis is available!');
    
    return true;
  } catch (error) {
    console.log('❌ API Key is INVALID');
    console.log('Error:', error.message);
    console.log('⚠️  System will use fallback algorithms');
    
    return false;
  }
};

// Test the provided API key
const apiKey = 'AIzaSyCT7eXGz4b52frBHQajeUosGiJe4LFSt8c';
testAPIKey(apiKey);
