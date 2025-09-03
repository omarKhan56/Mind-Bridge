const express = require('express');
const jwt = require('jsonwebtoken');
const aiAnalysisService = require('../services/aiAnalysis');
const apiStatus = require('../services/aiAnalysis/apiStatus');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify JWT token
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin/Counselor auth middleware
const counselorAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !['admin', 'counselor'].includes(user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get API status and capabilities
router.get('/status', async (req, res) => {
  try {
    const status = await apiStatus.getStatus();
    res.json({
      ...status,
      message: status.geminiAvailable ? 
        'Enhanced AI analysis available' : 
        'Using fallback algorithms - system fully functional'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check API status' });
  }
});

// Get user's AI analysis
router.get('/user/:userId?', auth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;
    
    // Students can only access their own analysis
    if (req.user.userId !== userId) {
      const user = await User.findById(req.user.userId);
      if (!['admin', 'counselor'].includes(user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const analysis = await aiAnalysisService.analyzeUser(userId);
    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ message: 'Analysis failed', error: error.message });
  }
});

// Get personal insights for student
router.get('/insights', auth, async (req, res) => {
  try {
    const analysis = await aiAnalysisService.analyzeUser(req.user.userId);
    
    // Return student-friendly insights
    const studentInsights = {
      personalInsights: analysis.insights.keyInsights,
      progressSummary: analysis.insights.progressSummary,
      recommendations: analysis.insights.personalizedRecommendations,
      motivationalMessage: analysis.insights.motivationalMessage,
      nextSteps: analysis.insights.nextSteps,
      wellnessTrend: analysis.patterns.weeklyPatterns,
      overallStatus: analysis.summary.overallStatus
    };
    
    res.json(studentInsights);
  } catch (error) {
    console.error('Insights generation error:', error);
    res.status(500).json({ message: 'Failed to generate insights' });
  }
});

// Get counselor insights for a student
router.get('/counselor-insights/:studentId', auth, counselorAuth, async (req, res) => {
  try {
    const analysis = await aiAnalysisService.analyzeUser(req.params.studentId);
    
    // Generate counselor-specific insights
    const counselorInsights = {
      riskAssessment: analysis.risk,
      sentimentAnalysis: analysis.sentiment,
      behavioralPatterns: analysis.patterns,
      sessionPreparation: {
        keyTopics: analysis.insights.keyInsights.filter(i => i.actionable),
        riskFactors: analysis.risk.riskFactors,
        protectiveFactors: analysis.risk.protectiveFactors,
        recommendations: analysis.risk.interventionRecommendations
      },
      alertLevel: analysis.risk.alertCounselor ? 'high' : 'normal',
      lastAnalysis: analysis.analysisDate
    };
    
    res.json(counselorInsights);
  } catch (error) {
    console.error('Counselor insights error:', error);
    res.status(500).json({ message: 'Failed to generate counselor insights' });
  }
});

// Get campus-wide analysis (Admin only)
router.get('/campus/:collegeId?', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const collegeId = req.params.collegeId || user.college;
    const campusAnalysis = await aiAnalysisService.analyzeCampus(collegeId);
    
    res.json(campusAnalysis);
  } catch (error) {
    console.error('Campus analysis error:', error);
    res.status(500).json({ message: 'Campus analysis failed' });
  }
});

// Trigger real-time analysis (for chat messages)
router.post('/analyze-message', auth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Quick sentiment analysis for real-time alerts
    const sentimentAnalyzer = new (require('../services/aiAnalysis/sentimentAnalyzer'))();
    const sentiment = await sentimentAnalyzer.analyzeChatSentiment([{ content: message }]);
    
    // Check for crisis indicators
    if (sentiment.crisisIndicators?.present && sentiment.crisisIndicators.confidence > 0.7) {
      // Trigger immediate alert
      console.log(`🚨 Crisis indicator detected for user ${req.user.userId}`);
      
      // Store alert in user record
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          'alerts': {
            type: 'crisis_indicator',
            message: 'Crisis language detected in chat',
            timestamp: new Date(),
            severity: sentiment.urgencyLevel
          }
        }
      });
    }
    
    res.json({
      sentiment: sentiment.overallSentiment,
      crisisDetected: sentiment.crisisIndicators?.present || false,
      urgencyLevel: sentiment.urgencyLevel,
      recommendations: sentiment.recommendedInterventions
    });
  } catch (error) {
    console.error('Real-time analysis error:', error);
    res.status(500).json({ message: 'Analysis failed' });
  }
});

// Get analysis history
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const analysisHistory = user.aiAnalysis || {};
    
    res.json({
      lastAnalysis: analysisHistory.lastAnalysis,
      riskLevel: analysisHistory.riskLevel,
      sentiment: analysisHistory.sentiment,
      insights: analysisHistory.insights,
      trend: analysisHistory.trend || 'stable'
    });
  } catch (error) {
    console.error('Analysis history error:', error);
    res.status(500).json({ message: 'Failed to get analysis history' });
  }
});

// Batch analysis trigger (Admin only)
router.post('/batch-analyze', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { userIds } = req.body;
    const results = [];
    
    for (const userId of userIds) {
      try {
        const analysis = await aiAnalysisService.analyzeUser(userId);
        results.push({ userId, status: 'success', analysis });
      } catch (error) {
        results.push({ userId, status: 'error', error: error.message });
      }
    }
    
    res.json({
      message: 'Batch analysis completed',
      results,
      summary: {
        total: userIds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ message: 'Batch analysis failed' });
  }
});

module.exports = router;
