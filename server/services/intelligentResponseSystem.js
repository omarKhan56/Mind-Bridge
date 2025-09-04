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
      
      // Check if this is the first message in a new session
      const isFirstMessage = conversationHistory.length === 0 && 
                             (!sessionContext.sessionId || sessionContext.isNewSession);
      
      // Analyze current message context
      const messageContext = await this.analyzeMessageContext(message, userProfile);
      
      // Generate contextual response
      const response = await this.generateContextualResponse(
        message, 
        userProfile, 
        conversationHistory, 
        messageContext,
        sessionContext,
        isFirstMessage
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
        return { name: 'there', college: 'your college', historicalContext: null };
      }

      const user = await User.findById(userId).populate('college');
      
      // Fetch historical session context
      const historicalContext = await this.getHistoricalContext(userId);
      
      return {
        name: user?.name || 'there',
        college: user?.college?.name || 'your college',
        previousSessions: user?.aiSessions?.length || 0,
        riskLevel: user?.aiAnalysis?.riskLevel || 'unknown',
        preferredTopics: user?.aiAnalysis?.preferredTopics || [],
        communicationStyle: user?.aiAnalysis?.communicationStyle || 'supportive',
        lastInteraction: user?.aiAnalysis?.lastAnalysis || null,
        screeningData: user?.screeningData || null,
        historicalContext
      };
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      return { name: 'there', college: 'your college', historicalContext: null };
    }
  }

  async getHistoricalContext(userId) {
    try {
      const AISession = require('../models/AISession');
      
      // Fetch last 10 sessions with messages
      const sessions = await AISession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title mood messages createdAt')
        .lean();

      if (!sessions || sessions.length === 0) {
        return null;
      }

      // Process sessions to extract key context
      const contextSummary = {
        totalSessions: sessions.length,
        recentSessions: [],
        recurringThemes: [],
        moodProgression: [],
        keyInsights: []
      };

      // Process each session
      sessions.forEach((session, index) => {
        const sessionSummary = {
          date: new Date(session.createdAt).toLocaleDateString(),
          title: session.title || 'General conversation',
          mood: session.mood || 'neutral',
          messageCount: session.messages?.length || 0,
          keyTopics: this.extractKeyTopics(session.messages || [])
        };

        contextSummary.recentSessions.push(sessionSummary);
        contextSummary.moodProgression.push(session.mood || 'neutral');
      });

      // Extract recurring themes
      const allTopics = contextSummary.recentSessions.flatMap(s => s.keyTopics);
      const topicCounts = {};
      allTopics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
      
      contextSummary.recurringThemes = Object.entries(topicCounts)
        .filter(([topic, count]) => count >= 2)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic]) => topic);

      // Generate key insights
      contextSummary.keyInsights = this.generateInsights(contextSummary);

      return contextSummary;
    } catch (error) {
      console.error('Error fetching historical context:', error.message);
      return null;
    }
  }

  extractKeyTopics(messages) {
    const topics = [];
    const topicKeywords = {
      'academic_stress': ['exam', 'study', 'grade', 'assignment', 'test', 'homework'],
      'anxiety': ['anxious', 'worried', 'nervous', 'panic', 'stress'],
      'depression': ['sad', 'depressed', 'hopeless', 'down', 'empty'],
      'relationships': ['friend', 'family', 'relationship', 'social', 'lonely'],
      'sleep': ['sleep', 'tired', 'insomnia', 'rest', 'exhausted'],
      'career': ['job', 'career', 'future', 'work', 'internship']
    };

    const allText = messages.map(m => m.content || '').join(' ').toLowerCase();
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  generateInsights(contextSummary) {
    const insights = [];
    
    // Mood trend analysis
    const recentMoods = contextSummary.moodProgression.slice(0, 5);
    const positiveMoods = recentMoods.filter(m => ['good', 'better', 'positive'].includes(m)).length;
    const negativeMoods = recentMoods.filter(m => ['sad', 'anxious', 'stressed'].includes(m)).length;
    
    if (positiveMoods > negativeMoods) {
      insights.push('showing_improvement');
    } else if (negativeMoods > positiveMoods) {
      insights.push('needs_support');
    }

    // Recurring theme insights
    if (contextSummary.recurringThemes.includes('academic_stress')) {
      insights.push('academic_challenges');
    }
    if (contextSummary.recurringThemes.includes('anxiety')) {
      insights.push('anxiety_management_needed');
    }

    // Engagement insights
    if (contextSummary.totalSessions >= 5) {
      insights.push('regular_user');
    }

    return insights;
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

  async generateContextualResponse(message, userProfile, history, messageContext, sessionContext, isFirstMessage = false) {
    // Build comprehensive context
    const contextPrompt = this.buildContextPrompt(message, userProfile, history, messageContext, sessionContext, isFirstMessage);
    
    // Generate response with Gemini
    const response = await this.aiGateway.generateResponse(contextPrompt, {
      taskType: messageContext.responseStyle === 'crisis_intervention' ? 'crisis' : 'chat',
      userId: userProfile.userId
    });

    // Enhance response with personalization
    return this.personalizeResponse(response.text, userProfile, messageContext, isFirstMessage);
  }

  buildContextPrompt(message, userProfile, history, messageContext, sessionContext, isFirstMessage = false) {
    const historyText = history.length > 0 
      ? `Current session history:\n${history.map(h => `User: ${h.message}\nYou: ${h.response}`).join('\n')}\n\n`
      : '';

    // Build historical context summary
    const historicalContextText = this.buildHistoricalContextText(userProfile.historicalContext);

    const greetingInstruction = isFirstMessage 
      ? `This is the first message in a new session. Start with a brief, warm greeting introducing yourself as Dr. Sarah Chen, then respond to their message. Keep the greeting natural and brief (1-2 sentences max).`
      : `This is a continuing conversation. Do not introduce yourself again. Respond directly to their message.`;

    const contextInfo = `
User Profile:
- Name: ${userProfile.name}
- College: ${userProfile.college}
- Previous sessions: ${userProfile.previousSessions}
- Risk level: ${userProfile.riskLevel}
- Communication style preference: ${userProfile.communicationStyle}

${historicalContextText}

Current Context:
- Intent: ${messageContext.intent}
- Emotional state: ${messageContext.emotionalState}/10
- Topic: ${messageContext.topicCategory}
- Urgency: ${messageContext.urgencyLevel}/5
- Response style needed: ${messageContext.responseStyle}

${historyText}Current message: "${message}"

Instructions:
- You are Dr. Sarah Chen, a warm and experienced mental health counselor
- ${greetingInstruction}
- Use historical context to provide continuity and reference previous progress
- Acknowledge recurring themes and patterns when relevant
- Reference successful interventions from past sessions when applicable
- Respond with empathy and understanding
- Adapt your communication style to the user's needs
- Provide practical, actionable advice when appropriate
- If crisis indicators are present, prioritize safety and resources
- Keep responses conversational and supportive (150-200 words)
`;

    return contextInfo;
  }

  buildHistoricalContextText(historicalContext) {
    if (!historicalContext) {
      return 'Historical Context: This appears to be a new user with no previous sessions.';
    }

    const { totalSessions, recentSessions, recurringThemes, moodProgression, keyInsights } = historicalContext;

    let contextText = `Historical Context (${totalSessions} previous sessions):\n`;
    
    // Recent sessions summary
    if (recentSessions.length > 0) {
      contextText += `Recent Sessions:\n`;
      recentSessions.slice(0, 3).forEach(session => {
        contextText += `- ${session.date}: ${session.title} (${session.mood} mood, ${session.keyTopics.join(', ')})\n`;
      });
    }

    // Recurring themes
    if (recurringThemes.length > 0) {
      contextText += `Recurring Themes: ${recurringThemes.join(', ')}\n`;
    }

    // Mood progression
    if (moodProgression.length > 0) {
      const recentMoods = moodProgression.slice(0, 5);
      contextText += `Recent Mood Trend: ${recentMoods.join(' → ')}\n`;
    }

    // Key insights
    if (keyInsights.length > 0) {
      const insightDescriptions = {
        'showing_improvement': 'User has been showing positive progress',
        'needs_support': 'User may need additional support',
        'academic_challenges': 'Ongoing academic stress patterns',
        'anxiety_management_needed': 'Recurring anxiety concerns',
        'regular_user': 'Engaged user with consistent sessions'
      };
      
      contextText += `Key Insights: ${keyInsights.map(insight => insightDescriptions[insight] || insight).join(', ')}\n`;
    }

    return contextText;
  }

  personalizeResponse(responseText, userProfile, messageContext, isFirstMessage = false) {
    let personalizedResponse = responseText;

    // Add personal touches (but not for first message greeting)
    if (userProfile.name && userProfile.name !== 'there' && !isFirstMessage) {
      personalizedResponse = personalizedResponse.replace(/\bthere\b/g, userProfile.name);
    }

    // Add college-specific context if relevant
    if (messageContext.topicCategory === 'academic' && userProfile.college !== 'your college') {
      personalizedResponse += `\n\nI know ${userProfile.college} can be demanding, but remember that your campus counseling services are also available if you need additional support.`;
    }

    // Add continuity references (only for non-first messages)
    if (userProfile.previousSessions > 0 && !isFirstMessage) {
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
      isFirstMessage,
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
