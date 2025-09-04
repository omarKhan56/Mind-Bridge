const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RiskPredictionEngine = require('../services/riskPredictionEngine');
const BehavioralPatternAnalyzer = require('../services/behavioralPatternAnalyzer');
const ProactiveWellnessCoach = require('../services/proactiveWellnessCoach');
const User = require('../models/User');

const riskEngine = new RiskPredictionEngine();
const patternAnalyzer = new BehavioralPatternAnalyzer();
const wellnessCoach = new ProactiveWellnessCoach();

// Get risk score for a specific user
router.get('/risk/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user has permission to view this data
    if (req.user.role !== 'counselor' && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const riskData = await riskEngine.calculateRiskScore(userId);
    res.json(riskData);
  } catch (error) {
    console.error('Risk analysis error:', error);
    res.status(500).json({ message: 'Risk analysis failed', error: error.message });
  }
});

// Get behavioral patterns for a user
router.get('/patterns/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.role !== 'counselor' && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const patterns = await patternAnalyzer.analyzeUserPatterns(userId);
    res.json(patterns);
  } catch (error) {
    console.error('Pattern analysis error:', error);
    res.status(500).json({ message: 'Pattern analysis failed', error: error.message });
  }
});

// Get wellness recommendations
router.get('/wellness/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.role !== 'counselor' && req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const recommendations = await wellnessCoach.generateWellnessRecommendations(userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Wellness recommendation error:', error);
    res.status(500).json({ message: 'Wellness recommendation failed', error: error.message });
  }
});

// Get dashboard analytics for counselors
router.get('/dashboard', auth, async (req, res) => {
  try {
    if (req.user.role !== 'counselor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get users from same college for counselors
    let userQuery = {};
    if (req.user.role === 'counselor') {
      userQuery.college = req.user.college;
    }

    const users = await User.find(userQuery).select('_id name email').limit(50);
    const userIds = users.map(u => u._id.toString());

    // Calculate risk scores for all users
    const riskAnalyses = await riskEngine.batchCalculateRisks(userIds);
    
    // Aggregate statistics
    const stats = {
      totalUsers: users.length,
      riskDistribution: {
        critical: riskAnalyses.filter(r => r.riskLevel === 'critical').length,
        high: riskAnalyses.filter(r => r.riskLevel === 'high').length,
        moderate: riskAnalyses.filter(r => r.riskLevel === 'moderate').length,
        low: riskAnalyses.filter(r => r.riskLevel === 'low').length,
        minimal: riskAnalyses.filter(r => r.riskLevel === 'minimal').length
      },
      highRiskUsers: riskAnalyses
        .filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical')
        .map(r => ({
          userId: r.userId,
          riskScore: r.riskScore,
          riskLevel: r.riskLevel,
          factors: r.factors.map(f => f.factor)
        })),
      trends: {
        averageRiskScore: riskAnalyses.reduce((sum, r) => sum + r.riskScore, 0) / riskAnalyses.length,
        totalAlerts: riskAnalyses.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Dashboard analytics failed', error: error.message });
  }
});

// Get trend data for charts
router.get('/trends', auth, async (req, res) => {
  try {
    if (req.user.role !== 'counselor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { timeframe = '30d', userId } = req.query;
    
    // This would typically query historical data
    // For now, we'll return mock trend data
    const trends = {
      riskScores: [
        { date: '2024-11-01', score: 3.2 },
        { date: '2024-11-08', score: 4.1 },
        { date: '2024-11-15', score: 3.8 },
        { date: '2024-11-22', score: 2.9 },
        { date: '2024-11-29', score: 3.5 }
      ],
      moodTrends: [
        { date: '2024-11-01', mood: 3.1 },
        { date: '2024-11-08', mood: 2.8 },
        { date: '2024-11-15', mood: 3.4 },
        { date: '2024-11-22', mood: 3.7 },
        { date: '2024-11-29', mood: 3.2 }
      ],
      engagementLevels: [
        { date: '2024-11-01', engagement: 0.7 },
        { date: '2024-11-08', engagement: 0.6 },
        { date: '2024-11-15', engagement: 0.8 },
        { date: '2024-11-22', engagement: 0.9 },
        { date: '2024-11-29', engagement: 0.75 }
      ]
    };

    res.json(trends);
  } catch (error) {
    console.error('Trends analysis error:', error);
    res.status(500).json({ message: 'Trends analysis failed', error: error.message });
  }
});

// Generate proactive intervention
router.post('/intervention', auth, async (req, res) => {
  try {
    if (req.user.role !== 'counselor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { userId, triggerType, data } = req.body;
    
    const intervention = await wellnessCoach.generateProactiveIntervention(userId, triggerType, data);
    
    // Here you would typically save the intervention and potentially send notifications
    
    res.json(intervention);
  } catch (error) {
    console.error('Intervention generation error:', error);
    res.status(500).json({ message: 'Intervention generation failed', error: error.message });
  }
});

// Track goal progress
router.post('/goals/:goalId/progress', auth, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { progress } = req.body;
    const userId = req.user.id;

    const result = await wellnessCoach.trackGoalProgress(userId, goalId, progress);
    
    res.json(result);
  } catch (error) {
    console.error('Goal tracking error:', error);
    res.status(500).json({ message: 'Goal tracking failed', error: error.message });
  }
});

// Get institutional insights (admin only)
router.get('/institutional', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // This would aggregate data across all colleges
    const insights = {
      totalUsers: 1250,
      totalSessions: 8430,
      averageRiskScore: 3.2,
      interventionSuccessRate: 0.78,
      resourceUtilization: {
        aiChat: 0.85,
        counselorSessions: 0.62,
        screeningTools: 0.71,
        forums: 0.43
      },
      trends: {
        userGrowth: 0.15,
        engagementIncrease: 0.23,
        riskReduction: 0.18
      }
    };

    res.json(insights);
  } catch (error) {
    console.error('Institutional insights error:', error);
    res.status(500).json({ message: 'Institutional insights failed', error: error.message });
  }
});

module.exports = router;
