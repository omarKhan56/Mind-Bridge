const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const analyticsService = require('../services/analyticsService');
const userAnalysisService = require('../services/userAnalysisService');
const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'mindbridge@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

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

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours instead of 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'mindbridge@gmail.com',
      to: user.email,
      subject: 'MindBridge - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset for your MindBridge account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #6B7280;">${resetUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 14px;">MindBridge Mental Health Platform</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log('Reset password attempt with token:', token);
    console.log('Current time:', new Date());

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    console.log('User found:', !!user);
    if (user) {
      console.log('Token expires at:', new Date(user.resetPasswordExpires));
    }

    if (!user) {
      // Check if token exists but is expired
      const expiredUser = await User.findOne({ resetPasswordToken: token });
      if (expiredUser) {
        console.log('Token found but expired. Expires at:', new Date(expiredUser.resetPasswordExpires));
        return res.status(400).json({ message: 'Reset token has expired. Please request a new password reset.' });
      }
      return res.status(400).json({ message: 'Invalid reset token. Please request a new password reset.' });
    }

    // Set new password (let the pre-save hook handle hashing)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log('Password reset successful for user:', user.email);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
