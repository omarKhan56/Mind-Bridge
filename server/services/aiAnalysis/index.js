const SentimentAnalyzer = require('./sentimentAnalyzer');
const RiskPredictor = require('./riskPredictor');
const PatternDetector = require('./patternDetector');
const InsightGenerator = require('./insightGenerator');
const User = require('../../models/User');
const College = require('../../models/College');
const AISession = require('../../models/AISession');
const WellnessEntry = require('../../models/WellnessEntry');
const Appointment = require('../../models/Appointment');
const ForumPost = require('../../models/Forum');

class AIAnalysisService {
  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.riskPredictor = new RiskPredictor();
    this.patternDetector = new PatternDetector();
    this.insightGenerator = new InsightGenerator();
  }

  async analyzeUser(userId) {
    try {
      console.log(`🔍 Starting AI analysis for user ${userId}`);
      
      // Collect user data
      const userData = await this.collectUserData(userId);
      
      // Run parallel analysis
      const [sentimentAnalysis, riskAnalysis, patternAnalysis] = await Promise.all([
        this.analyzeSentiment(userData),
        this.analyzeRisk(userData),
        this.analyzePatterns(userData)
      ]);
      
      // Generate insights
      const insights = await this.generateInsights({
        userId,
        sentiment: sentimentAnalysis,
        risk: riskAnalysis,
        patterns: patternAnalysis,
        userData
      });
      
      // Store analysis results
      await this.storeAnalysisResults(userId, {
        sentiment: sentimentAnalysis,
        risk: riskAnalysis,
        patterns: patternAnalysis,
        insights
      });
      
      console.log(`✅ AI analysis completed for user ${userId}`);
      
      return {
        userId,
        analysisDate: new Date(),
        sentiment: sentimentAnalysis,
        risk: riskAnalysis,
        patterns: patternAnalysis,
        insights,
        summary: this.generateSummary(sentimentAnalysis, riskAnalysis, insights)
      };
    } catch (error) {
      console.error(`❌ AI analysis failed for user ${userId}:`, error);
      return this.getFallbackAnalysis(userId);
    }
  }

  async collectUserData(userId) {
    const [user, aiSessions, wellnessEntries, appointments, forumPosts] = await Promise.all([
      User.findById(userId).populate('college'),
      AISession.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
      WellnessEntry.find({ user: userId }).sort({ date: -1 }).limit(30),
      Appointment.find({ student: userId }).sort({ createdAt: -1 }).limit(20),
      ForumPost.find({ author: userId }).sort({ createdAt: -1 }).limit(20)
    ]);

    return {
      userId,
      user,
      aiSessions,
      wellnessEntries,
      appointments,
      forumPosts,
      usagePatterns: await this.calculateUsagePatterns(userId),
      screeningData: user?.screeningData
    };
  }

  async calculateUsagePatterns(userId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [aiSessions, wellnessEntries, appointments] = await Promise.all([
      AISession.find({ user: userId, createdAt: { $gte: thirtyDaysAgo } }),
      WellnessEntry.find({ user: userId, date: { $gte: thirtyDaysAgo } }),
      Appointment.find({ student: userId, createdAt: { $gte: thirtyDaysAgo } })
    ]);
    
    return {
      loginFrequency: aiSessions.length + wellnessEntries.length,
      sessionDuration: aiSessions.reduce((sum, s) => sum + (s.messages?.length || 0), 0) / Math.max(aiSessions.length, 1),
      wellnessConsistency: wellnessEntries.length,
      appointmentEngagement: appointments.length,
      lastActivity: Math.max(
        aiSessions[0]?.createdAt || 0,
        wellnessEntries[0]?.date || 0,
        appointments[0]?.createdAt || 0
      )
    };
  }

  async analyzeSentiment(userData) {
    const messages = userData.aiSessions.flatMap(session => 
      session.messages?.filter(m => m.sender === 'user') || []
    );
    
    const forumPosts = userData.forumPosts.map(post => ({
      content: post.content,
      createdAt: post.createdAt
    }));
    
    if (messages.length === 0 && forumPosts.length === 0) {
      return { overallSentiment: 5, emotionalTone: 'neutral', messageCount: 0 };
    }
    
    const [chatSentiment, forumSentiment] = await Promise.all([
      messages.length > 0 ? this.sentimentAnalyzer.analyzeChatSentiment(messages) : null,
      forumPosts.length > 0 ? this.sentimentAnalyzer.analyzeForumSentiment(forumPosts) : null
    ]);
    
    return {
      chat: chatSentiment,
      forum: forumSentiment,
      combined: this.combineSentimentAnalysis(chatSentiment, forumSentiment)
    };
  }

  async analyzeRisk(userData) {
    const riskData = {
      userId: userData.userId,
      wellnessData: userData.wellnessEntries,
      screeningData: userData.screeningData,
      chatSentiment: userData.sentiment?.chat,
      usagePatterns: userData.usagePatterns,
      appointments: userData.appointments
    };
    
    return await this.riskPredictor.predictRiskLevel(riskData);
  }

  async analyzePatterns(userData) {
    return await this.patternDetector.detectBehavioralPatterns(userData);
  }

  async generateInsights(analysisData) {
    return await this.insightGenerator.generatePersonalInsights(analysisData);
  }

  combineSentimentAnalysis(chatSentiment, forumSentiment) {
    if (!chatSentiment && !forumSentiment) return null;
    if (!chatSentiment) return forumSentiment;
    if (!forumSentiment) return chatSentiment;
    
    return {
      overallSentiment: (chatSentiment.overallSentiment + forumSentiment.communitySentiment) / 2,
      emotionalTone: chatSentiment.emotionalTone,
      crisisIndicators: chatSentiment.crisisIndicators,
      combinedScore: (chatSentiment.overallSentiment * 0.7) + (forumSentiment.communitySentiment * 0.3)
    };
  }

  generateSummary(sentiment, risk, insights) {
    return {
      overallStatus: this.determineOverallStatus(sentiment, risk),
      keyPoints: [
        `Risk Level: ${risk.currentRiskLevel}`,
        `Sentiment: ${sentiment.combined?.emotionalTone || 'neutral'}`,
        `Insights Generated: ${insights.keyInsights?.length || 0}`
      ],
      actionRequired: risk.alertCounselor || false,
      lastAnalysis: new Date()
    };
  }

  determineOverallStatus(sentiment, risk) {
    if (risk.currentRiskLevel === 'critical') return 'critical';
    if (risk.currentRiskLevel === 'high') return 'needs_attention';
    if (sentiment.combined?.emotionalTone === 'negative') return 'monitoring';
    return 'stable';
  }

  async storeAnalysisResults(userId, results) {
    // Store in user document for quick access
    await User.findByIdAndUpdate(userId, {
      $set: {
        'aiAnalysis.lastAnalysis': new Date(),
        'aiAnalysis.riskLevel': results.risk.currentRiskLevel,
        'aiAnalysis.sentiment': results.sentiment.combined?.overallSentiment || 5,
        'aiAnalysis.insights': results.insights.keyInsights?.slice(0, 3) || []
      }
    });
  }

  getFallbackAnalysis(userId) {
    return {
      userId,
      analysisDate: new Date(),
      sentiment: { overallSentiment: 5, emotionalTone: 'neutral' },
      risk: { currentRiskLevel: 'moderate', riskScore: 50, alertCounselor: false },
      patterns: { weeklyPatterns: {}, usagePatterns: {} },
      insights: { keyInsights: [], progressSummary: { overallProgress: 'fair' } },
      summary: {
        overallStatus: 'stable',
        keyPoints: ['Limited data available'],
        actionRequired: false,
        lastAnalysis: new Date()
      }
    };
  }

  // Batch analysis for multiple users
  async analyzeCampus(collegeId) {
    try {
      const users = await User.find({ college: collegeId, role: 'student' });
      const analyses = [];
      
      for (const user of users) {
        const analysis = await this.analyzeUser(user._id);
        analyses.push(analysis);
      }
      
      return {
        collegeId,
        totalStudents: users.length,
        analysisDate: new Date(),
        analyses,
        summary: this.generateCampusSummary(analyses)
      };
    } catch (error) {
      console.error('Campus analysis error:', error);
      return null;
    }
  }

  generateCampusSummary(analyses) {
    const riskDistribution = analyses.reduce((acc, analysis) => {
      const risk = analysis.risk.currentRiskLevel;
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});
    
    const avgSentiment = analyses.reduce((sum, analysis) => 
      sum + (analysis.sentiment.combined?.overallSentiment || 5), 0
    ) / analyses.length;
    
    return {
      riskDistribution,
      averageSentiment: avgSentiment,
      highRiskCount: (riskDistribution.high || 0) + (riskDistribution.critical || 0),
      overallTrend: avgSentiment >= 6 ? 'positive' : avgSentiment >= 4 ? 'stable' : 'concerning'
    };
  }
}

module.exports = new AIAnalysisService();
