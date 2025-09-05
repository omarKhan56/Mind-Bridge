#!/usr/bin/env node

const AIGateway = require('./server/services/aiGateway');

async function debugGateway() {
  console.log('🔧 DEBUGGING AI GATEWAY');
  console.log('========================');

  const gateway = new AIGateway();
  const status = gateway.getModelStatus();
  
  console.log('Gateway Status:', status);
  console.log('Available Models:', status.availableModels);
  console.log('Total Models:', status.totalModels);
  
  if (status.totalModels === 0) {
    console.log('❌ No models initialized - checking Gemini setup...');
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);
    console.log('API Key length:', process.env.GEMINI_API_KEY?.length);
    console.log('API Key starts with:', process.env.GEMINI_API_KEY?.substring(0, 10));
  } else {
    console.log('✅ Models initialized successfully');
  }
}

debugGateway();
