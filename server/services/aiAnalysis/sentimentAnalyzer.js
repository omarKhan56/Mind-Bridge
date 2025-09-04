const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class SentimentAnalyzer {
  constructor() {
    this.model = null;
  }

  getModel() {
    if (!this.model && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    return this.model;
  }

  async analyzeChatSentiment(messages) {
    try {
      const model = this.getModel();
      if (!model) {
        return this.getFallbackAnalysis(messages);
      }

      const prompt = `
        Analyze these mental health chat messages for sentiment and risk indicators:
        
        Messages: ${JSON.stringify(messages)}
        
        Return a JSON response with:
        {
          "overallSentiment": number (1-10, where 1=very negative, 10=very positive),
          "emotionalTone": "positive|negative|neutral|mixed",
          "crisisIndicators": {
            "present": boolean,
            "confidence": number (0-1),
            "indicators": ["list of specific indicators found"]
          },
          "improvementSigns": ["list of positive indicators"],
          "keyThemes": ["main topics discussed"],
          "recommendedInterventions": ["suggested actions"],
          "urgencyLevel": number (1-5, where 5=immediate intervention needed)
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean and parse JSON with better error handling
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (parseError) {
        console.log('Sentiment analysis: JSON parse failed, using fallback');
        return this.getFallbackAnalysis(messages);
      }
      
      return {
        ...analysis,
        timestamp: new Date(),
        messageCount: messages.length
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return this.getFallbackAnalysis(messages);
    }
  }

  async analyzeForumSentiment(posts) {
    try {
      const model = this.getModel();
      if (!model) {
        return this.getFallbackForumAnalysis(posts);
      }

      const prompt = `
        Analyze these forum posts for community sentiment and support patterns:
        
        Posts: ${JSON.stringify(posts)}
        
        Return JSON with:
        {
          "communitySentiment": number (1-10),
          "supportLevel": number (1-10),
          "helpSeekingBehavior": "high|medium|low",
          "peerSupportQuality": number (1-10),
          "concerningPosts": ["list of post IDs with concerning content"],
          "positiveEngagement": ["list of helpful interactions"]
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (error) {
      console.error('Forum sentiment analysis error:', error);
      return this.getFallbackForumAnalysis(posts);
    }
  }

  getFallbackAnalysis(messages) {
    // Simple keyword-based fallback
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    const negativeWords = ['sad', 'depressed', 'anxious', 'hopeless', 'suicide', 'hurt'];
    const positiveWords = ['better', 'good', 'happy', 'improving', 'grateful'];
    
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    
    return {
      overallSentiment: Math.max(1, Math.min(10, 5 + positiveCount - negativeCount)),
      emotionalTone: negativeCount > positiveCount ? 'negative' : 'neutral',
      crisisIndicators: {
        present: text.includes('suicide') || text.includes('kill myself'),
        confidence: 0.7,
        indicators: []
      },
      improvementSigns: [],
      keyThemes: ['general support'],
      recommendedInterventions: ['continue monitoring'],
      urgencyLevel: negativeCount > 3 ? 4 : 2,
      timestamp: new Date(),
      messageCount: messages.length
    };
  }

  getFallbackForumAnalysis(posts) {
    return {
      communitySentiment: 6,
      supportLevel: 7,
      helpSeekingBehavior: 'medium',
      peerSupportQuality: 6,
      concerningPosts: [],
      positiveEngagement: []
    };
  }
}

module.exports = SentimentAnalyzer;
