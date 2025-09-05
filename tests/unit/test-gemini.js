const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('Usage: node test-gemini.js YOUR_API_KEY');
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent("Hello, can you help with mental health support?");
    const response = await result.response;
    
    console.log('✅ API Key is valid!');
    console.log('Test response:', response.text());
  } catch (error) {
    console.log('❌ API Key test failed:', error.message);
  }
}

testGeminiAPI();
