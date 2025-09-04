const AISession = require('../models/AISession');

class BehavioralPatternAnalyzer {
  constructor() {
    this.patterns = {
      chat_frequency: {
        daily: 'high_engagement',
        weekly: 'regular_engagement', 
        biweekly: 'moderate_engagement',
        monthly: 'low_engagement',
        irregular: 'inconsistent_engagement'
      },
      response_patterns: {
        immediate: 'highly_engaged',
        quick: 'engaged',
        delayed: 'hesitant',
        very_delayed: 'disengaged'
      },
      mood_patterns: {
        improving: 'positive_trend',
        stable: 'stable_mood',
        declining: 'concerning_trend',
        volatile: 'unstable_mood'
      }
    };
  }

  async analyzeUserPatterns(userId) {
    try {
      const sessions = await AISession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

      if (!sessions || sessions.length === 0) {
        return { patterns: [], insights: [], anomalies: [] };
      }

      const analysis = {
        chatFrequency: this.analyzeChatFrequency(sessions),
        responsePatterns: this.analyzeResponsePatterns(sessions),
        moodProgression: this.analyzeMoodProgression(sessions),
        engagementLevel: this.analyzeEngagementLevel(sessions),
        anomalies: this.detectAnomalies(sessions),
        insights: []
      };

      analysis.insights = this.generateInsights(analysis);

      return analysis;
    } catch (error) {
      console.error('Behavioral pattern analysis error:', error);
      return { patterns: [], insights: [], anomalies: [], error: error.message };
    }
  }

  analyzeChatFrequency(sessions) {
    const now = new Date();
    const intervals = [];
    
    for (let i = 1; i < sessions.length; i++) {
      const interval = new Date(sessions[i-1].createdAt) - new Date(sessions[i].createdAt);
      intervals.push(interval / (1000 * 60 * 60 * 24)); // Convert to days
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    let frequency;
    if (avgInterval <= 1) frequency = 'daily';
    else if (avgInterval <= 7) frequency = 'weekly';
    else if (avgInterval <= 14) frequency = 'biweekly';
    else if (avgInterval <= 30) frequency = 'monthly';
    else frequency = 'irregular';

    return {
      frequency,
      averageInterval: avgInterval,
      pattern: this.patterns.chat_frequency[frequency],
      totalSessions: sessions.length,
      trend: this.calculateFrequencyTrend(intervals)
    };
  }

  analyzeResponsePatterns(sessions) {
    const responseTimes = [];
    
    sessions.forEach(session => {
      if (session.messages && session.messages.length > 1) {
        for (let i = 1; i < session.messages.length; i++) {
          const prevMsg = session.messages[i-1];
          const currMsg = session.messages[i];
          
          if (prevMsg.role === 'assistant' && currMsg.role === 'user') {
            const responseTime = new Date(currMsg.timestamp) - new Date(prevMsg.timestamp);
            responseTimes.push(responseTime / (1000 * 60)); // Convert to minutes
          }
        }
      }
    });

    if (responseTimes.length === 0) {
      return { pattern: 'insufficient_data', averageResponseTime: 0 };
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    let pattern;
    if (avgResponseTime <= 2) pattern = 'immediate';
    else if (avgResponseTime <= 10) pattern = 'quick';
    else if (avgResponseTime <= 60) pattern = 'delayed';
    else pattern = 'very_delayed';

    return {
      pattern: this.patterns.response_patterns[pattern],
      averageResponseTime: avgResponseTime,
      responseCount: responseTimes.length,
      trend: this.calculateResponseTrend(responseTimes)
    };
  }

  analyzeMoodProgression(sessions) {
    const moods = sessions.map(s => s.mood || 'neutral').reverse(); // Chronological order
    
    if (moods.length < 3) {
      return { pattern: 'insufficient_data', moods: moods };
    }

    const moodScores = moods.map(mood => this.moodToScore(mood));
    const trend = this.calculateMoodTrend(moodScores);
    
    return {
      pattern: this.patterns.mood_patterns[trend],
      moods: moods,
      moodScores: moodScores,
      trend: trend,
      volatility: this.calculateMoodVolatility(moodScores)
    };
  }

  analyzeEngagementLevel(sessions) {
    const recentSessions = sessions.slice(0, 10);
    let totalMessages = 0;
    let totalLength = 0;
    let sessionLengths = [];

    recentSessions.forEach(session => {
      const userMessages = (session.messages || []).filter(m => m.role === 'user');
      totalMessages += userMessages.length;
      
      const sessionLength = userMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
      totalLength += sessionLength;
      sessionLengths.push(sessionLength);
    });

    const avgMessagesPerSession = totalMessages / recentSessions.length;
    const avgMessageLength = totalLength / totalMessages || 0;
    
    let engagementLevel;
    if (avgMessagesPerSession >= 10 && avgMessageLength >= 50) engagementLevel = 'high';
    else if (avgMessagesPerSession >= 5 && avgMessageLength >= 25) engagementLevel = 'moderate';
    else engagementLevel = 'low';

    return {
      level: engagementLevel,
      averageMessagesPerSession: avgMessagesPerSession,
      averageMessageLength: avgMessageLength,
      trend: this.calculateEngagementTrend(sessionLengths)
    };
  }

  detectAnomalies(sessions) {
    const anomalies = [];
    
    // Sudden frequency changes
    const recentFreq = this.analyzeChatFrequency(sessions.slice(0, 5));
    const olderFreq = this.analyzeChatFrequency(sessions.slice(5, 15));
    
    if (recentFreq.averageInterval > olderFreq.averageInterval * 2) {
      anomalies.push({
        type: 'frequency_drop',
        severity: 'moderate',
        description: 'Significant decrease in chat frequency detected',
        data: { recent: recentFreq.averageInterval, previous: olderFreq.averageInterval }
      });
    }

    // Mood volatility
    const moodAnalysis = this.analyzeMoodProgression(sessions);
    if (moodAnalysis.volatility > 2) {
      anomalies.push({
        type: 'mood_volatility',
        severity: 'high',
        description: 'High mood volatility detected',
        data: { volatility: moodAnalysis.volatility }
      });
    }

    // Engagement drops
    const engagement = this.analyzeEngagementLevel(sessions);
    if (engagement.trend === 'declining' && engagement.level === 'low') {
      anomalies.push({
        type: 'engagement_drop',
        severity: 'moderate',
        description: 'Declining engagement pattern detected',
        data: engagement
      });
    }

    return anomalies;
  }

  generateInsights(analysis) {
    const insights = [];

    // Frequency insights
    if (analysis.chatFrequency.pattern === 'high_engagement') {
      insights.push({
        type: 'positive',
        category: 'engagement',
        message: 'User shows consistent high engagement with daily interactions'
      });
    } else if (analysis.chatFrequency.pattern === 'low_engagement') {
      insights.push({
        type: 'concern',
        category: 'engagement',
        message: 'User has infrequent interactions, may benefit from proactive outreach'
      });
    }

    // Mood insights
    if (analysis.moodProgression.trend === 'improving') {
      insights.push({
        type: 'positive',
        category: 'mood',
        message: 'User shows positive mood progression over recent sessions'
      });
    } else if (analysis.moodProgression.trend === 'declining') {
      insights.push({
        type: 'concern',
        category: 'mood',
        message: 'Declining mood trend detected, increased support may be needed'
      });
    }

    // Anomaly insights
    analysis.anomalies.forEach(anomaly => {
      insights.push({
        type: 'alert',
        category: 'anomaly',
        message: anomaly.description,
        severity: anomaly.severity
      });
    });

    return insights;
  }

  // Helper methods
  moodToScore(mood) {
    const scores = {
      'very_positive': 5, 'positive': 4, 'good': 4, 'better': 3,
      'neutral': 2, 'okay': 2,
      'negative': 1, 'sad': 1, 'anxious': 0, 'depressed': 0, 'stressed': 0
    };
    return scores[mood] || 2;
  }

  calculateMoodTrend(scores) {
    if (scores.length < 3) return 'insufficient_data';
    
    const recent = scores.slice(-5);
    const older = scores.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
    
    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    
    const volatility = this.calculateMoodVolatility(recent);
    return volatility > 1.5 ? 'volatile' : 'stable';
  }

  calculateMoodVolatility(scores) {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  calculateFrequencyTrend(intervals) {
    if (intervals.length < 3) return 'stable';
    
    const recent = intervals.slice(0, Math.floor(intervals.length / 2));
    const older = intervals.slice(Math.floor(intervals.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.3) return 'declining';
    if (recentAvg < olderAvg * 0.7) return 'increasing';
    return 'stable';
  }

  calculateResponseTrend(times) {
    if (times.length < 5) return 'stable';
    
    const recent = times.slice(-Math.floor(times.length / 2));
    const older = times.slice(0, Math.floor(times.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.5) return 'slowing';
    if (recentAvg < olderAvg * 0.7) return 'quickening';
    return 'stable';
  }

  calculateEngagementTrend(lengths) {
    if (lengths.length < 3) return 'stable';
    
    const recent = lengths.slice(0, Math.floor(lengths.length / 2));
    const older = lengths.slice(Math.floor(lengths.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.2) return 'increasing';
    if (recentAvg < olderAvg * 0.8) return 'declining';
    return 'stable';
  }
}

module.exports = BehavioralPatternAnalyzer;
