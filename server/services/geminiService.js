const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('Initializing Gemini with API key:', apiKey ? 'Present' : 'Missing');
    
    if (apiKey && apiKey !== 'REPLACE_WITH_YOUR_REAL_GEMINI_API_KEY' && apiKey !== 'your-gemini-api-key-here') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          }
        });
        this.enabled = true;
        console.log('✅ Gemini API initialized successfully');
      } catch (error) {
        console.error('❌ Gemini API initialization failed:', error.message);
        this.enabled = false;
      }
    } else {
      console.log('⚠️ Gemini API key not configured, using enhanced fallback responses');
      this.enabled = false;
    }
  }

  async generateResponse(message, userContext = {}) {
    if (!this.enabled) {
      return this.getEnhancedFallback(message, userContext);
    }

    try {
      // Input validation
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return this.getEnhancedFallback('I need help', userContext);
      }

      // Rate limiting - simple implementation
      const now = Date.now();
      if (this.lastRequest && (now - this.lastRequest) < 1000) {
        console.log('⚠️ Rate limiting - using fallback');
        return this.getEnhancedFallback(message, userContext);
      }
      this.lastRequest = now;

      const prompt = this.buildPrompt(message, userContext);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), 8000)
      );
      
      const apiPromise = this.model.generateContent(prompt);
      const result = await Promise.race([apiPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();
      
      // Validate response
      if (!text || text.trim().length === 0) {
        console.log('⚠️ Empty Gemini response, using fallback');
        return this.getEnhancedFallback(message, userContext);
      }
      
      console.log('✅ Gemini AI response generated');
      return text;
    } catch (error) {
      console.error('Gemini API error:', error.message);
      // Enhanced error logging
      if (error.message.includes('quota')) {
        console.log('⚠️ Gemini API quota exceeded - using fallback');
      } else if (error.message.includes('timeout')) {
        console.log('⚠️ Gemini API timeout - using fallback');
      }
      return this.getEnhancedFallback(message, userContext);
    }
  }

  buildPrompt(message, userContext) {
    const { riskLevel, mood, previousMessages } = userContext;
    
    return `You are Dr. Sarah Chen, a licensed clinical psychologist with 15 years of experience. You're having a therapy session with a college student. Respond exactly as a real therapist would.

THERAPEUTIC APPROACH:
- Use first person ("I hear you saying...", "It sounds like...", "I'm wondering if...")
- Validate emotions before offering guidance
- Ask thoughtful, open-ended questions
- Reference therapeutic techniques naturally (CBT, mindfulness, grounding)
- Show genuine warmth and professional concern
- Keep responses conversational and personal (2-4 sentences)

CLIENT CONTEXT:
- Current emotional state: ${mood || 'neutral'}
- Risk assessment: ${riskLevel || 'low'}
- Session context: University counseling center

CLIENT STATEMENT: "${message}"

Respond as Dr. Sarah Chen would in an actual therapy session - with empathy, validation, and therapeutic insight. Make it feel like a real human conversation with a caring professional.`;
  }

  getEnhancedFallback(message, userContext = {}) {
    const keywords = message.toLowerCase();
    const { riskLevel, mood } = userContext;
    
    if (keywords.includes('suicide') || keywords.includes('kill myself') || keywords.includes('end it all')) {
      return "I'm deeply concerned about what you're sharing with me right now. These feelings you're having are a sign that you're in real pain, and I want you to get immediate support. Can you please call 988 or text HOME to 741741 right now? You don't have to go through this alone.";
    }
    
    if (keywords.includes('anxious') || keywords.includes('panic') || keywords.includes('worried')) {
      return "I can hear the anxiety in what you're telling me, and I want you to know that what you're experiencing is very real and valid. When anxiety feels overwhelming, sometimes it helps to ground ourselves in the present moment. Can you tell me three things you can see around you right now?";
    }
    
    if (keywords.includes('depressed') || keywords.includes('sad') || keywords.includes('hopeless')) {
      return "It takes a lot of courage to share these heavy feelings with me, and I'm honored that you trust me with them. Depression can make everything feel so much harder, but I want you to know that you're not alone in this. What's one small thing that brought you even a moment of comfort today?";
    }
    
    if (keywords.includes('stress') || keywords.includes('overwhelmed') || keywords.includes('pressure')) {
      return "I can sense how much pressure you're carrying right now, and it sounds exhausting. When we're overwhelmed, our minds can feel scattered and everything seems urgent. Let's take a breath together - what feels like the most pressing thing on your mind today?";
    }
    
    if (keywords.includes('sleep') || keywords.includes('tired') || keywords.includes('insomnia')) {
      return "Sleep struggles can affect everything - your mood, your energy, your ability to cope with stress. I'm wondering what your evenings look like lately. Are there things racing through your mind when you try to rest, or is it more about the physical restlessness?";
    }
    
    // General therapeutic responses
    const generalResponses = [
      "I'm really glad you felt comfortable sharing that with me. Sometimes just putting our thoughts and feelings into words can be the first step toward understanding them better. What's been weighing most heavily on your heart lately?",
      
      "Thank you for trusting me with what you're going through. I can sense there's a lot beneath the surface of what you're sharing. What would it feel like to have someone really understand what you're experiencing right now?",
      
      "I hear you, and I want you to know that your feelings make complete sense given what you're dealing with. Sometimes when we're struggling, it can help to remember that we don't have to figure everything out at once. What's one thing that's felt particularly hard today?",
      
      "It sounds like you're going through something really significant, and I appreciate you bringing it here to talk about. In my experience, when students reach out like this, there's usually something important they need to process. What drew you to want to talk today?",
      
      "I can feel the emotion in what you're sharing, and I want you to know that whatever you're experiencing is valid and important. Sometimes the hardest part is just feeling heard and understood. What would be most helpful for you to explore right now?"
    ];
    
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  }
}

module.exports = new GeminiService();
