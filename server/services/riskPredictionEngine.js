const User = require('../models/User');
const AISession = require('../models/AISession');

class RiskPredictionEngine {
  constructor() {
    this.riskFactors = {
      // Crisis indicators
      crisis_language: 10,
      self_harm_mentions: 9,
      hopelessness: 8,
      
      // Behavioral patterns
      session_frequency_drop: 7,
      engagement_decline: 6,
      mood_deterioration: 8,
      
      // Academic stress
      exam_period: 5,
      grade_concerns: 4,
      academic_pressure: 5,
      
      // Social factors
      isolation_mentions: 6,
      relationship_issues: 4,
      family_problems: 5,
      
      // Sleep and health
      sleep_issues: 4,
      appetite_changes: 3,
      energy_loss: 5
    };
    
    this.protectiveFactors = {
      regular_sessions: -3,
      positive_coping: -4,
      social_support: -5,
      help_seeking: -3,
      improvement_trend: -6,
      goal_achievement: -4
    };
  }

  async calculateRiskScore(userId) {
    try {
      const user = await User.findById(userId).populate('college');
      const sessions = await AISession.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      if (!sessions || sessions.length === 0) {
        return { riskScore: 0, riskLevel: 'unknown', factors: [] };
      }

      let riskScore = 0;
      const detectedFactors = [];

      // Analyze recent sessions for risk factors
      const recentSessions = sessions.slice(0, 10);
      const allMessages = recentSessions.flatMap(s => s.messages || []);
      const combinedText = allMessages.map(m => m.content || '').join(' ').toLowerCase();

      // Crisis language detection
      const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'want to die', 'hurt myself'];
      if (crisisKeywords.some(keyword => combinedText.includes(keyword))) {
        riskScore += this.riskFactors.crisis_language;
        detectedFactors.push({ factor: 'crisis_language', weight: this.riskFactors.crisis_language });
      }

      // Mood deterioration analysis
      const moodProgression = recentSessions.map(s => s.mood || 'neutral');
      const negativeMoods = moodProgression.filter(m => ['sad', 'anxious', 'depressed', 'stressed'].includes(m));
      if (negativeMoods.length > moodProgression.length * 0.7) {
        riskScore += this.riskFactors.mood_deterioration;
        detectedFactors.push({ factor: 'mood_deterioration', weight: this.riskFactors.mood_deterioration });
      }

      // Session frequency analysis
      const sessionFrequency = this.analyzeSessionFrequency(sessions);
      if (sessionFrequency.trend === 'declining') {
        riskScore += this.riskFactors.session_frequency_drop;
        detectedFactors.push({ factor: 'session_frequency_drop', weight: this.riskFactors.session_frequency_drop });
      }

      // Academic stress detection
      const academicKeywords = ['exam', 'grade', 'fail', 'assignment', 'study', 'academic pressure'];
      if (academicKeywords.some(keyword => combinedText.includes(keyword))) {
        riskScore += this.riskFactors.academic_pressure;
        detectedFactors.push({ factor: 'academic_pressure', weight: this.riskFactors.academic_pressure });
      }

      // Isolation indicators
      const isolationKeywords = ['alone', 'lonely', 'isolated', 'no friends', 'nobody understands'];
      if (isolationKeywords.some(keyword => combinedText.includes(keyword))) {
        riskScore += this.riskFactors.isolation_mentions;
        detectedFactors.push({ factor: 'isolation_mentions', weight: this.riskFactors.isolation_mentions });
      }

      // Sleep issues
      const sleepKeywords = ['can\'t sleep', 'insomnia', 'tired', 'exhausted', 'sleep problems'];
      if (sleepKeywords.some(keyword => combinedText.includes(keyword))) {
        riskScore += this.riskFactors.sleep_issues;
        detectedFactors.push({ factor: 'sleep_issues', weight: this.riskFactors.sleep_issues });
      }

      // Protective factors
      if (sessions.length >= 5) {
        riskScore += this.protectiveFactors.regular_sessions;
        detectedFactors.push({ factor: 'regular_sessions', weight: this.protectiveFactors.regular_sessions });
      }

      const copingKeywords = ['breathing', 'meditation', 'exercise', 'therapy', 'coping'];
      if (copingKeywords.some(keyword => combinedText.includes(keyword))) {
        riskScore += this.protectiveFactors.positive_coping;
        detectedFactors.push({ factor: 'positive_coping', weight: this.protectiveFactors.positive_coping });
      }

      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);

      return {
        riskScore: Math.max(0, riskScore),
        riskLevel,
        factors: detectedFactors,
        lastUpdated: new Date(),
        sessionCount: sessions.length,
        trend: sessionFrequency.trend
      };

    } catch (error) {
      console.error('Risk calculation error:', error);
      return { riskScore: 0, riskLevel: 'unknown', factors: [], error: error.message };
    }
  }

  analyzeSessionFrequency(sessions) {
    if (sessions.length < 3) return { trend: 'insufficient_data' };

    const recent = sessions.slice(0, 5);
    const older = sessions.slice(5, 10);

    const recentAvgInterval = this.calculateAverageInterval(recent);
    const olderAvgInterval = this.calculateAverageInterval(older);

    if (recentAvgInterval > olderAvgInterval * 1.5) {
      return { trend: 'declining', recentInterval: recentAvgInterval, olderInterval: olderAvgInterval };
    } else if (recentAvgInterval < olderAvgInterval * 0.7) {
      return { trend: 'increasing', recentInterval: recentAvgInterval, olderInterval: olderAvgInterval };
    }

    return { trend: 'stable', recentInterval: recentAvgInterval, olderInterval: olderAvgInterval };
  }

  calculateAverageInterval(sessions) {
    if (sessions.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < sessions.length; i++) {
      const interval = new Date(sessions[i-1].createdAt) - new Date(sessions[i].createdAt);
      intervals.push(interval);
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  determineRiskLevel(score) {
    if (score >= 15) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'moderate';
    if (score >= 1) return 'low';
    return 'minimal';
  }

  async generateRiskAlert(userId, riskData) {
    if (riskData.riskLevel === 'critical' || riskData.riskLevel === 'high') {
      return {
        type: 'risk_alert',
        userId,
        riskLevel: riskData.riskLevel,
        riskScore: riskData.riskScore,
        message: `High risk detected for user. Risk score: ${riskData.riskScore}. Immediate attention recommended.`,
        factors: riskData.factors.map(f => f.factor),
        timestamp: new Date(),
        priority: riskData.riskLevel === 'critical' ? 'urgent' : 'high'
      };
    }
    return null;
  }

  async batchCalculateRisks(userIds) {
    const results = [];
    for (const userId of userIds) {
      const riskData = await this.calculateRiskScore(userId);
      results.push({ userId, ...riskData });
    }
    return results;
  }
}

module.exports = RiskPredictionEngine;
