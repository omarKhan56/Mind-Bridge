const { GoogleGenerativeAI } = require('@google/generative-ai');

const testAPIKey = async (apiKey) => {
  try {
    console.log('🔑 Testing Gemini API Key...');
    console.log(`Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const modelName of modelNames) {
      try {
        console.log(`🧪 Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent('Test');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ API Key is VALID with model: ${modelName}`);
        console.log('📝 Test Response:', text.substring(0, 100) + '...');
        console.log('🚀 Enhanced AI analysis is available!');
        
        return { valid: true, model: modelName };
      } catch (modelError) {
        console.log(`❌ Model ${modelName} failed:`, modelError.message.substring(0, 100));
        continue;
      }
    }
    
    throw new Error('No working models found');
    
  } catch (error) {
    console.log('❌ API Key is INVALID or no models available');
    console.log('Error:', error.message);
    console.log('⚠️  System will use fallback algorithms');
    
    return { valid: false, error: error.message };
  }
};

// Test the provided API key
const apiKey = 'AIzaSyCT7eXGz4b52frBHQajeUosGiJe4LFSt8c';
testAPIKey(apiKey).then(result => {
  if (result.valid) {
    console.log(`\n🎯 Recommended: Update your AI services to use model "${result.model}"`);
  } else {
    console.log('\n💡 To get a valid API key:');
    console.log('1. Visit: https://makersuite.google.com/app/apikey');
    console.log('2. Create a new API key');
    console.log('3. Update server/.env with the new key');
  }
});
