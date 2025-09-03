const AISession = require('../models/AISession');
const ForumPost = require('../models/Forum');
const User = require('../models/User');

class UserAnalysisService {
  async generateUserAnalysis(userId) {
    try {
      const user = await User.findById(userId);
      const sessions = await AISession.find({ user: userId }).sort({ createdAt: -1 });
      const posts = await ForumPost.find({ author: userId }).sort({ createdAt: -1 });
      
      const analysis = {
        overview: this.generateOverview(user, sessions, posts),
        mentalHealthTrends: this.analyzeMentalHealthTrends(sessions, posts),
        communicationPatterns: this.analyzeCommunicationPatterns(sessions, posts),
        topConcerns: this.identifyTopConcerns(sessions, posts),
        progressIndicators: this.calculateProgress(sessions, user),
        recommendations: this.generateRecommendations(sessions, posts, user)
      };
      
      return analysis;
    } catch (error) {
      console.error('Analysis generation error:', error);
      return this.getDefaultAnalysis();
    }
  }
  
  generateOverview(user, sessions, posts) {
    const totalSessions = sessions.length;
    const totalPosts = posts.length;
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const avgSessionLength = totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0;
    
    return {
      totalSessions,
      totalPosts,
      totalMessages,
      avgSessionLength,
      memberSince: user.createdAt,
      lastActivity: sessions[0]?.updatedAt || posts[0]?.createdAt || user.createdAt
    };
  }
  
  analyzeMentalHealthTrends(sessions, posts) {
    const moodCounts = {};
    const concerns = {};
    
    // Analyze session moods
    sessions.forEach(session => {
      moodCounts[session.mood] = (moodCounts[session.mood] || 0) + 1;
    });
    
    // Analyze message content for concerns
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.role === 'user') {
          const content = msg.content.toLowerCase();
          if (content.includes('anxious') || content.includes('anxiety')) {
            concerns.anxiety = (concerns.anxiety || 0) + 1;
          }
          if (content.includes('stress') || content.includes('overwhelmed')) {
            concerns.stress = (concerns.stress || 0) + 1;
          }
          if (content.includes('sad') || content.includes('depressed')) {
            concerns.depression = (concerns.depression || 0) + 1;
          }
          if (content.includes('sleep') || content.includes('tired')) {
            concerns.sleep = (concerns.sleep || 0) + 1;
          }
        }
      });
    });
    
    return {
      moodDistribution: moodCounts,
      primaryConcerns: Object.entries(concerns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([concern, count]) => ({ concern, count }))
    };
  }
  
  analyzeCommunicationPatterns(sessions, posts) {
    const hourlyActivity = new Array(24).fill(0);
    const weeklyActivity = new Array(7).fill(0);
    
    [...sessions, ...posts].forEach(item => {
      const date = new Date(item.createdAt);
      hourlyActivity[date.getHours()]++;
      weeklyActivity[date.getDay()]++;
    });
    
    const mostActiveHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const mostActiveDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      weeklyActivity.indexOf(Math.max(...weeklyActivity))
    ];
    
    return {
      mostActiveHour,
      mostActiveDay,
      hourlyPattern: hourlyActivity,
      weeklyPattern: weeklyActivity,
      avgSessionsPerWeek: sessions.length > 0 ? Math.round(sessions.length / 4) : 0
    };
  }
  
  identifyTopConcerns(sessions, posts) {
    const keywords = {
      'Academic Stress': ['exam', 'study', 'grade', 'assignment', 'test', 'homework'],
      'Social Anxiety': ['social', 'friends', 'people', 'awkward', 'embarrassed'],
      'Sleep Issues': ['sleep', 'tired', 'insomnia', 'exhausted', 'rest'],
      'Relationship Problems': ['relationship', 'boyfriend', 'girlfriend', 'family', 'conflict'],
      'General Anxiety': ['anxious', 'worry', 'nervous', 'panic', 'fear'],
      'Depression': ['sad', 'hopeless', 'empty', 'worthless', 'depressed']
    };
    
    const concernCounts = {};
    
    const analyzeContent = (content) => {
      Object.entries(keywords).forEach(([concern, words]) => {
        const matches = words.filter(word => content.toLowerCase().includes(word)).length;
        if (matches > 0) {
          concernCounts[concern] = (concernCounts[concern] || 0) + matches;
        }
      });
    };
    
    sessions.forEach(session => {
      session.messages.forEach(msg => {
        if (msg.role === 'user') analyzeContent(msg.content);
      });
    });
    
    posts.forEach(post => {
      analyzeContent(post.title + ' ' + post.content);
    });
    
    return Object.entries(concernCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([concern, intensity]) => ({ concern, intensity }));
  }
  
  calculateProgress(sessions, user) {
    const recentSessions = sessions.slice(0, 5);
    const olderSessions = sessions.slice(5, 10);
    
    const calculatePositivity = (sessionGroup) => {
      let positiveWords = 0;
      let totalWords = 0;
      
      const positive = ['better', 'good', 'helped', 'thanks', 'improved', 'progress'];
      
      sessionGroup.forEach(session => {
        session.messages.forEach(msg => {
          if (msg.role === 'user') {
            const words = msg.content.toLowerCase().split(' ');
            totalWords += words.length;
            positiveWords += words.filter(word => positive.includes(word)).length;
          }
        });
      });
      
      return totalWords > 0 ? (positiveWords / totalWords) * 100 : 0;
    };
    
    const recentPositivity = calculatePositivity(recentSessions);
    const pastPositivity = calculatePositivity(olderSessions);
    const trend = recentPositivity - pastPositivity;
    
    return {
      overallTrend: trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable',
      engagementLevel: sessions.length > 10 ? 'high' : sessions.length > 5 ? 'moderate' : 'low',
      consistencyScore: this.calculateConsistency(sessions),
      riskLevel: user.screeningData?.riskLevel || 'low'
    };
  }
  
  calculateConsistency(sessions) {
    if (sessions.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < sessions.length; i++) {
      const diff = new Date(sessions[i-1].createdAt) - new Date(sessions[i].createdAt);
      intervals.push(diff / (1000 * 60 * 60 * 24)); // days
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    return Math.max(0, 100 - variance); // Lower variance = higher consistency
  }
  
  generateRecommendations(sessions, posts, user) {
    const analysis = this.analyzeMentalHealthTrends(sessions, posts);
    const concerns = this.identifyTopConcerns(sessions, posts);
    const recommendations = [];
    
    // Based on primary concerns
    if (concerns.find(c => c.concern === 'Academic Stress')) {
      recommendations.push({
        type: 'resource',
        title: 'Study Skills Workshop',
        description: 'Learn effective study techniques and time management',
        priority: 'high'
      });
    }
    
    if (concerns.find(c => c.concern === 'Sleep Issues')) {
      recommendations.push({
        type: 'lifestyle',
        title: 'Sleep Hygiene Program',
        description: 'Improve your sleep quality with proven techniques',
        priority: 'high'
      });
    }
    
    if (analysis.moodDistribution.anxious > 3) {
      recommendations.push({
        type: 'therapy',
        title: 'Anxiety Management Sessions',
        description: 'Professional support for anxiety management',
        priority: 'medium'
      });
    }
    
    // General recommendations
    recommendations.push({
      type: 'community',
      title: 'Peer Support Groups',
      description: 'Connect with others facing similar challenges',
      priority: 'low'
    });
    
    return recommendations.slice(0, 4);
  }
  
  getDefaultAnalysis() {
    return {
      overview: {
        totalSessions: 0,
        totalPosts: 0,
        totalMessages: 0,
        avgSessionLength: 0
      },
      mentalHealthTrends: {
        moodDistribution: {},
        primaryConcerns: []
      },
      communicationPatterns: {
        mostActiveHour: 12,
        mostActiveDay: 'Monday',
        avgSessionsPerWeek: 0
      },
      topConcerns: [],
      progressIndicators: {
        overallTrend: 'stable',
        engagementLevel: 'low',
        consistencyScore: 0,
        riskLevel: 'low'
      },
      recommendations: []
    };
  }
}

module.exports = new UserAnalysisService();
