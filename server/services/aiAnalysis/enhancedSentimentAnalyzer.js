const AIGateway = require('../aiGateway');

class EnhancedSentimentAnalyzer {
  constructor() {
    this.aiGateway = new AIGateway();
    this.emotionKeywords = {
      anxiety: ['anxious', 'worried', 'nervous', 'panic', 'stress', 'overwhelmed'],
      depression: ['sad', 'hopeless', 'empty', 'worthless', 'depressed', 'down'],
      anger: ['angry', 'furious', 'mad', 'irritated', 'frustrated', 'rage'],
      joy: ['happy', 'excited', 'joyful', 'elated', 'cheerful', 'content'],
      fear: ['scared', 'afraid', 'terrified', 'frightened', 'worried', 'anxious'],
      disgust: ['disgusted', 'revolted', 'sick', 'nauseated', 'repulsed'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned']
    };
  }

  async analyzeChatSentiment(messages, userId = null) {
    try {
      const combinedText = messages.map(m => m.content || m.text || m.message).join(' ');
      
      // Multi-dimensional analysis
      const [aiAnalysis, keywordAnalysis, patternAnalysis] = await Promise.all([
        this.getAIAnalysis(combinedText, userId),
        this.getKeywordAnalysis(combinedText),
        this.getPatternAnalysis(messages)
      ]);

      // Combine results
      const result = this.combineAnalyses(aiAnalysis, keywordAnalysis, patternAnalysis);
      
      return {
        ...result,
        timestamp: new Date(),
        messageCount: messages.length,
        analysisVersion: '2.0'
      };
    } catch (error) {
      console.error('Enhanced sentiment analysis error:', error);
      return this.getFallbackAnalysis(messages);
    }
  }

  async getAIAnalysis(text, userId) {
    const prompt = `Analyze this mental health conversation for:
1. Overall sentiment (1-10 scale)
2. Emotional state (primary and secondary emotions)
3. Crisis indicators (present/absent, confidence 0-1)
4. Urgency level (1-5)
5. Key themes and concerns
6. Recommended interventions

Text: "${text}"

Respond in JSON format:
{
  "overallSentiment": number,
  "primaryEmotion": "string",
  "secondaryEmotions": ["array"],
  "crisisIndicators": {
    "present": boolean,
    "confidence": number,
    "indicators": ["array"]
  },
  "urgencyLevel": number,
  "keyThemes": ["array"],
  "recommendedInterventions": ["array"],
  "riskFactors": ["array"],
  "protectiveFactors": ["array"]
}`;

    const response = await this.aiGateway.generateResponse(prompt, {
      taskType: 'analysis',
      userId
    });

    try {
      const cleanText = response.text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (parseError) {
      console.log('Gemini analysis JSON parse failed, using keyword analysis');
      return null;
    }
  }

  getKeywordAnalysis(text) {
    const lowerText = text.toLowerCase();
    const emotions = {};
    let totalEmotionScore = 0;

    // Analyze emotions
    Object.entries(this.emotionKeywords).forEach(([emotion, keywords]) => {
      const matches = keywords.filter(keyword => lowerText.includes(keyword));
      emotions[emotion] = {
        score: matches.length,
        keywords: matches
      };
      totalEmotionScore += matches.length;
    });

    // Crisis detection
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'hurt myself', 'end my life'];
    const crisisMatches = crisisKeywords.filter(keyword => lowerText.includes(keyword));

    // Sentiment calculation
    const positiveWords = ['good', 'better', 'happy', 'grateful', 'hopeful', 'improving'];
    const negativeWords = ['bad', 'worse', 'terrible', 'awful', 'hopeless', 'failing'];
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    const sentiment = Math.max(1, Math.min(10, 5 + positiveCount - negativeCount));

    return {
      emotions,
      overallSentiment: sentiment,
      crisisIndicators: {
        present: crisisMatches.length > 0,
        confidence: Math.min(1, crisisMatches.length * 0.3),
        indicators: crisisMatches
      },
      urgencyLevel: crisisMatches.length > 0 ? 5 : Math.max(1, negativeCount),
      totalEmotionScore
    };
  }

  getPatternAnalysis(messages) {
    if (messages.length < 2) {
      return { trend: 'insufficient_data', patterns: [] };
    }

    const patterns = [];
    
    // Message length pattern
    const lengths = messages.map(m => (m.content || m.text || m.message || '').length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    if (avgLength < 20) patterns.push('short_responses');
    if (avgLength > 200) patterns.push('verbose_responses');

    // Repetitive language
    const words = messages.join(' ').toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    const repetitiveWords = Object.entries(wordCounts)
      .filter(([word, count]) => count > 3)
      .map(([word]) => word);

    if (repetitiveWords.length > 0) patterns.push('repetitive_language');

    // Time-based patterns (if timestamps available)
    const timestamps = messages.filter(m => m.timestamp).map(m => new Date(m.timestamp));
    if (timestamps.length > 1) {
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      if (avgInterval < 5000) patterns.push('rapid_messaging');
      if (avgInterval > 300000) patterns.push('delayed_responses');
    }

    return {
      patterns,
      averageMessageLength: avgLength,
      repetitiveWords: repetitiveWords.slice(0, 5),
      messageFrequency: timestamps.length > 1 ? 'analyzed' : 'insufficient_data'
    };
  }

  combineAnalyses(aiAnalysis, keywordAnalysis, patternAnalysis) {
    // Use AI analysis as primary, keyword as fallback
    const primary = aiAnalysis || keywordAnalysis;
    
    return {
      overallSentiment: primary.overallSentiment || 5,
      primaryEmotion: primary.primaryEmotion || this.getPrimaryEmotion(keywordAnalysis.emotions),
      secondaryEmotions: primary.secondaryEmotions || this.getSecondaryEmotions(keywordAnalysis.emotions),
      emotionalTone: this.getEmotionalTone(primary.overallSentiment || 5),
      crisisIndicators: primary.crisisIndicators || keywordAnalysis.crisisIndicators,
      urgencyLevel: primary.urgencyLevel || keywordAnalysis.urgencyLevel,
      keyThemes: primary.keyThemes || ['general_support'],
      recommendedInterventions: primary.recommendedInterventions || this.getDefaultInterventions(primary.urgencyLevel || 2),
      riskFactors: primary.riskFactors || [],
      protectiveFactors: primary.protectiveFactors || [],
      patterns: patternAnalysis.patterns || [],
      analysisMethod: aiAnalysis ? 'ai_enhanced' : 'keyword_based',
      confidence: aiAnalysis ? 0.9 : 0.7
    };
  }

  getPrimaryEmotion(emotions) {
    const sorted = Object.entries(emotions)
      .sort(([,a], [,b]) => b.score - a.score);
    return sorted.length > 0 && sorted[0][1].score > 0 ? sorted[0][0] : 'neutral';
  }

  getSecondaryEmotions(emotions) {
    return Object.entries(emotions)
      .filter(([,data]) => data.score > 0)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(1, 4)
      .map(([emotion]) => emotion);
  }

  getEmotionalTone(sentiment) {
    if (sentiment >= 7) return 'positive';
    if (sentiment <= 3) return 'negative';
    return 'neutral';
  }

  getDefaultInterventions(urgencyLevel) {
    const interventions = {
      1: ['continue_monitoring', 'positive_reinforcement'],
      2: ['active_listening', 'coping_strategies'],
      3: ['structured_support', 'regular_check_ins'],
      4: ['immediate_attention', 'crisis_resources'],
      5: ['emergency_intervention', 'crisis_hotline']
    };
    return interventions[urgencyLevel] || interventions[2];
  }

  getFallbackAnalysis(messages) {
    const text = messages.map(m => m.content || m.text || m.message || '').join(' ').toLowerCase();
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'hurt myself'];
    const hasCrisis = crisisKeywords.some(keyword => text.includes(keyword));

    return {
      overallSentiment: hasCrisis ? 1 : 5,
      primaryEmotion: hasCrisis ? 'crisis' : 'neutral',
      secondaryEmotions: [],
      emotionalTone: hasCrisis ? 'crisis' : 'neutral',
      crisisIndicators: {
        present: hasCrisis,
        confidence: hasCrisis ? 0.8 : 0.1,
        indicators: crisisKeywords.filter(keyword => text.includes(keyword))
      },
      urgencyLevel: hasCrisis ? 5 : 2,
      keyThemes: ['general_support'],
      recommendedInterventions: hasCrisis ? ['emergency_intervention'] : ['continue_monitoring'],
      riskFactors: hasCrisis ? ['crisis_language'] : [],
      protectiveFactors: [],
      patterns: [],
      analysisMethod: 'fallback',
      confidence: 0.5,
      timestamp: new Date(),
      messageCount: messages.length
    };
  }
}

module.exports = EnhancedSentimentAnalyzer;
