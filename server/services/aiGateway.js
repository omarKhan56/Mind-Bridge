const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class AIGateway {
  constructor() {
    this.model = null;
    this.fallbackResponses = new Map();
    this.requestCounts = new Map();
    this.initializeGemini();
  }

  initializeGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('🔍 Gemini API Key check:', apiKey ? 'Present' : 'Missing');
    
    if (apiKey && apiKey !== 'your-google-gemini-api-key-here' && apiKey.length > 10) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 150,
          }
        });
        console.log('✅ Gemini AI initialized successfully');
      } catch (error) {
        console.error('❌ Gemini initialization failed:', error.message);
      }
    } else {
      console.log('⚠️ Gemini API key not configured properly');
    }
  }

  async generateResponse(prompt, options = {}) {
    const { taskType = 'chat', userId = null } = options;

    // Try Gemini first
    if (this.model && !this.isRateLimited(userId)) {
      try {
        this.incrementRequestCount(userId);
        const enhancedPrompt = this.enhancePrompt(prompt, taskType);
        const result = await this.model.generateContent(enhancedPrompt);
        const response = await result.response;
        
        return {
          text: response.text(),
          model: 'gemini',
          confidence: 0.9,
          taskType
        };
      } catch (error) {
        console.error('❌ Gemini API call failed:', error.message);
      }
    }

    // Fallback to intelligent responses
    return this.getIntelligentFallback(prompt, taskType);
  }

  enhancePrompt(prompt, taskType) {
    const contexts = {
      chat: "You are Dr. Sarah Chen, a compassionate mental health counselor. Respond with empathy and provide helpful guidance.",
      analysis: "Analyze the following text for mental health indicators, sentiment, and risk factors. Provide structured insights.",
      crisis: "This is a potential crisis situation. Provide immediate support resources and empathetic response.",
      screening: "Evaluate mental health screening responses and provide risk assessment with recommendations."
    };

    const context = contexts[taskType] || contexts.chat;
    return `${context}\n\nUser input: ${prompt}`;
  }

  getIntelligentFallback(prompt, taskType) {
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'hurt myself'];
    const isCrisis = crisisKeywords.some(keyword => prompt.toLowerCase().includes(keyword));

    if (isCrisis) {
      return {
        text: `I'm very concerned about what you've shared. Your life has value and meaning. Please reach out for immediate help:

🚨 **Crisis Resources:**
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• Emergency Services: 911

I'm here to support you. Would you like to talk about what's troubling you?`,
        model: 'fallback',
        confidence: 0.9,
        taskType: 'crisis'
      };
    }

    const responses = [
      "I hear you, and I want you to know that your feelings are valid. Can you tell me more about what's on your mind?",
      "Thank you for sharing that with me. It takes courage to reach out. How are you feeling right now?",
      "I'm here to listen and support you. What would be most helpful for you today?",
      "Your wellbeing matters to me. Can you help me understand what you're experiencing?"
    ];

    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      model: 'fallback',
      confidence: 0.6,
      taskType
    };
  }

  isRateLimited(userId) {
    const key = `gemini_${userId || 'anonymous'}`;
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(time => now - time < 60000);
    
    // Limit: 30 requests per minute per user
    return recentRequests.length >= 30;
  }

  incrementRequestCount(userId) {
    const key = `gemini_${userId || 'anonymous'}`;
    const requests = this.requestCounts.get(key) || [];
    requests.push(Date.now());
    this.requestCounts.set(key, requests);
  }

  getModelStatus() {
    return {
      availableModels: this.model ? ['gemini'] : [],
      totalModels: this.model ? 1 : 0,
      fallbackEnabled: true,
      rateLimitingEnabled: true
    };
  }
}

module.exports = AIGateway;
