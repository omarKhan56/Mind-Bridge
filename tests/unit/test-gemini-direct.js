#!/usr/bin/env node

const AIGateway = require('./server/services/aiGateway');

async function testGeminiDirect() {
  console.log('🔍 TESTING GEMINI DIRECTLY');
  console.log('==========================');

  const gateway = new AIGateway();
  
  const prompt = `Analyze this text and return ONLY valid JSON:

"I'm feeling anxious about my exams"

JSON format:
{"overallSentiment":5,"primaryEmotion":"anxiety","urgencyLevel":2}`;

  try {
    const response = await gateway.generateResponse(prompt, { taskType: 'analysis' });
    
    console.log('Raw Gemini response:');
    console.log('Model:', response.model);
    console.log('Text:', response.text);
    console.log('Length:', response.text.length);
    console.log('First 200 chars:', response.text.substring(0, 200));
    
    // Try to parse it
    let cleanText = response.text.trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('\nExtracted JSON:', jsonMatch[0]);
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed:', parsed);
      } catch (e) {
        console.log('❌ Parse failed:', e.message);
      }
    } else {
      console.log('❌ No JSON found in response');
    }
    
  } catch (error) {
    console.error('❌ Gemini test failed:', error.message);
  }
}

testGeminiDirect();
