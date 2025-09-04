const AIGateway = require('./aiGateway');
const User = require('../models/User');

class IntelligentResponseSystem {
  constructor() {
    this.aiGateway = new AIGateway();
    this.conversationMemory = new Map(); // In-memory storage for session context
    this.responseTemplates = this.initializeTemplates();
  }

  async generatePersonalizedResponse(message, userId, sessionContext = {}) {
    try {
      // Get user profile and history
      const userProfile = await this.getUserProfile(userId);
      const conversationHistory = this.getConversationHistory(userId);
      
      // Analyze current message context
      const messageContext = await this.analyzeMessageContext(message, userProfile);
      
      // Generate contextual response
      const response = await this.generateContextualResponse(
        message, 
        userProfile, 
        conversationHistory, 
        messageContext,
        sessionContext
      );

      // Update conversation memory
      this.updateConversationMemory(userId, message, response);

      return response;
    } catch (error) {
      console.error('Intelligent response generation failed:', error);
      return this.getFallbackResponse(message);
    }
  }

  async getUserProfile(userId) {
    try {
      // Validate ObjectId format
      if (!userId || typeof userId !== 'string' || userId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.log('Invalid userId format, using default profile');
        return { name: 'there', college: 'your college' };
      }

      const user = await User.findById(userId).populate('college');
      
      return {
        name: user?.name || 'there',
        college: user?.college?.name || 'your college',
        previousSessions: user?.aiSessions?.length || 0,
        riskLevel: user?.aiAnalysis?.riskLevel || 'unknown',
        preferredTopics: user?.aiAnalysis?.preferredTopics || [],
        communicationStyle: user?.aiAnalysis?.communicationStyle || 'supportive',
        lastInteraction: user?.aiAnalysis?.lastAnalysis || null,
        screeningData: user?.screeningData || null
      };
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      return { name: 'there', college: 'your college' };
    }
  }

  getConversationHistory(userId) {
    const history = this.conversationMemory.get(userId) || [];
    return history.slice(-10); // Keep last 10 exchanges
  }

  async analyzeMessageContext(message, userProfile) {
    const prompt = `Analyze this message for context and intent:
Message: "${message}"
User background: ${JSON.stringify(userProfile)}

Determine:
1. Primary intent (seeking_help, sharing_feelings, asking_question, crisis, casual)
2. Emotional state (1-10)
3. Topic category (academic, relationships, family, health, career, general)
4. Response style needed (empathetic, informational, crisis_intervention, motivational)
5. Urgency level (1-5)

JSON response:
{
  "intent": "string",
  "emotionalState": number,
  "topicCategory": "string",
  "responseStyle": "string",
  "urgencyLevel": number,
  "keyTopics": ["array"]
}`;

    const analysis = await this.aiGateway.generateResponse(prompt, {
      taskType: 'analysis',
      userId: userProfile.userId
    });

    try {
      const cleanText = analysis.text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error) {
      return this.getBasicMessageContext(message);
    }
  }

  async generateContextualResponse(message, userProfile, history, messageContext, sessionContext) {
    // Build comprehensive context
    const contextPrompt = this.buildContextPrompt(message, userProfile, history, messageContext, sessionContext);
    
    // Generate response with Gemini
    const response = await this.aiGateway.generateResponse(contextPrompt, {
      taskType: messageContext.responseStyle === 'crisis_intervention' ? 'crisis' : 'chat',
      userId: userProfile.userId
    });

    // Enhance response with personalization
    return this.personalizeResponse(response.text, userProfile, messageContext);
  }

  buildContextPrompt(message, userProfile, history, messageContext, sessionContext) {
    const historyText = history.length > 0 
      ? `Previous conversation:\n${history.map(h => `User: ${h.message}\nYou: ${h.response}`).join('\n')}\n\n`
      : '';

    const contextInfo = `
User Profile:
- Name: ${userProfile.name}
- College: ${userProfile.college}
- Previous sessions: ${userProfile.previousSessions}
- Risk level: ${userProfile.riskLevel}
- Communication style preference: ${userProfile.communicationStyle}

Current Context:
- Intent: ${messageContext.intent}
- Emotional state: ${messageContext.emotionalState}/10
- Topic: ${messageContext.topicCategory}
- Urgency: ${messageContext.urgencyLevel}/5
- Response style needed: ${messageContext.responseStyle}

${historyText}Current message: "${message}"

Instructions:
- You are Dr. Sarah Chen, a warm and experienced mental health counselor
- Respond with empathy and understanding
- Reference previous conversations when relevant
- Adapt your communication style to the user's needs
- Provide practical, actionable advice when appropriate
- If crisis indicators are present, prioritize safety and resources
- Keep responses conversational and supportive (100-150 words)
`;

    return contextInfo;
  }

  personalizeResponse(responseText, userProfile, messageContext) {
    let personalizedResponse = responseText;

    // Add personal touches
    if (userProfile.name && userProfile.name !== 'there') {
      personalizedResponse = personalizedResponse.replace(/\bthere\b/g, userProfile.name);
    }

    // Add college-specific context if relevant
    if (messageContext.topicCategory === 'academic' && userProfile.college !== 'your college') {
      personalizedResponse += `\n\nI know ${userProfile.college} can be demanding, but remember that your campus counseling services are also available if you need additional support.`;
    }

    // Add continuity references
    if (userProfile.previousSessions > 0) {
      const continuityPhrases = [
        "I'm glad you're continuing our conversations.",
        "It's good to hear from you again.",
        "I appreciate you sharing more with me."
      ];
      
      if (Math.random() < 0.3) { // 30% chance to add continuity
        personalizedResponse = continuityPhrases[Math.floor(Math.random() * continuityPhrases.length)] + " " + personalizedResponse;
      }
    }

    return {
      text: personalizedResponse,
      responseStyle: messageContext.responseStyle,
      urgencyLevel: messageContext.urgencyLevel,
      personalized: true,
      timestamp: new Date()
    };
  }

  updateConversationMemory(userId, message, response) {
    const history = this.conversationMemory.get(userId) || [];
    history.push({
      message,
      response: response.text,
      timestamp: new Date(),
      responseStyle: response.responseStyle
    });

    // Keep only last 10 exchanges
    if (history.length > 10) {
      history.shift();
    }

    this.conversationMemory.set(userId, history);
  }

  getBasicMessageContext(message) {
    const lowerMessage = message.toLowerCase();
    
    // Basic intent detection
    let intent = 'sharing_feelings';
    if (lowerMessage.includes('?')) intent = 'asking_question';
    if (lowerMessage.includes('help')) intent = 'seeking_help';
    if (lowerMessage.includes('suicide') || lowerMessage.includes('kill myself')) intent = 'crisis';

    // Basic emotional state
    const negativeWords = ['sad', 'depressed', 'anxious', 'worried', 'scared'];
    const positiveWords = ['happy', 'good', 'better', 'grateful'];
    
    let emotionalState = 5;
    if (negativeWords.some(word => lowerMessage.includes(word))) emotionalState = 3;
    if (positiveWords.some(word => lowerMessage.includes(word))) emotionalState = 7;

    return {
      intent,
      emotionalState,
      topicCategory: 'general',
      responseStyle: intent === 'crisis' ? 'crisis_intervention' : 'empathetic',
      urgencyLevel: intent === 'crisis' ? 5 : 2,
      keyTopics: ['general_support']
    };
  }

  getFallbackResponse(message) {
    const templates = this.responseTemplates.general;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    return {
      text: randomTemplate,
      responseStyle: 'empathetic',
      urgencyLevel: 2,
      personalized: false,
      timestamp: new Date()
    };
  }

  initializeTemplates() {
    return {
      general: [
        "I hear you, and I want you to know that your feelings are completely valid. Can you tell me more about what's on your mind?",
        "Thank you for sharing that with me. It takes courage to reach out. How are you feeling right now?",
        "I'm here to listen and support you. What would be most helpful for you today?",
        "Your wellbeing matters to me. Can you help me understand what you're experiencing?"
      ],
      crisis: [
        "I'm very concerned about what you've shared, and I want you to know that your life has value and meaning. Please reach out for immediate help: National Suicide Prevention Lifeline: 988, Crisis Text Line: Text HOME to 741741, Emergency Services: 911. I'm here to support you through this.",
        "What you're feeling right now is overwhelming, but you don't have to face this alone. There are people who want to help you right now: 988 for immediate crisis support. Your life matters, and there are ways through this pain."
      ]
    };
  }

  // Cleanup method for memory management
  cleanupMemory() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [userId, history] of this.conversationMemory.entries()) {
      const recentHistory = history.filter(entry => 
        new Date(entry.timestamp) > oneHourAgo
      );
      
      if (recentHistory.length === 0) {
        this.conversationMemory.delete(userId);
      } else {
        this.conversationMemory.set(userId, recentHistory);
      }
    }
  }
}

module.exports = IntelligentResponseSystem;
