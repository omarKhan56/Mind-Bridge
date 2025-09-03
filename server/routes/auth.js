const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const analyticsService = require('../services/analyticsService');
const userAnalysisService = require('../services/userAnalysisService');
const router = express.Router();

// Middleware to verify token
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    user.lastActive = new Date();
    await user.save();
    
    // Populate college information
    await user.populate('college', 'name code');
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        college: user.college,
        screeningData: user.screeningData,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update screening data
router.post('/screening', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const { phq9Score, gad7Score, ghqScore } = req.body;
    
    // Calculate risk level based on scores
    let riskLevel = 'low';
    if (phq9Score >= 15 || gad7Score >= 15 || ghqScore >= 12) riskLevel = 'high';
    else if (phq9Score >= 10 || gad7Score >= 10 || ghqScore >= 8) riskLevel = 'moderate';
    
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        screeningData: {
          phq9Score,
          gad7Score,
          ghqScore,
          lastScreening: new Date(),
          riskLevel
        }
      },
      { new: true }
    );
    
    // Trigger Inngest workflow for high-risk users
    if (riskLevel === 'high') {
      const { inngest } = require('../lib/inngest');
      await inngest.send({
        name: 'user/high-risk-detected',
        data: {
          userId: decoded.userId,
          riskLevel,
          screeningData: { phq9Score, gad7Score, ghqScore }
        }
      });
    }
    
    res.json({ screeningData: user.screeningData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const analytics = await analyticsService.getUserAnalytics(req.user.userId);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user analysis based on conversations and posts
router.get('/analysis', auth, async (req, res) => {
  try {
    const analysis = await userAnalysisService.generateUserAnalysis(req.user.userId);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
