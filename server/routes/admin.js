const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const College = require('../models/College');
const Appointment = require('../models/Appointment');
const Resource = require('../models/Resource');
const ForumPost = require('../models/Forum');
const AISession = require('../models/AISession');
const router = express.Router();

const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Dashboard analytics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    // User statistics
    const totalUsers = await User.countDocuments({ role: 'student' });
    const newUsersThisMonth = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: lastMonth }
    });
    
    // Appointment statistics
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    
    // Risk level distribution
    const riskDistribution = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$screeningData.riskLevel', count: { $sum: 1 } } }
    ]);
    
    // Resource usage
    const topResources = await Resource.find()
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount category');
    
    // Forum activity
    const forumStats = {
      totalPosts: await ForumPost.countDocuments(),
      postsThisMonth: await ForumPost.countDocuments({
        createdAt: { $gte: lastMonth }
      })
    };

    // AI Sessions
    const totalSessions = await AISession.countDocuments();
    
    // Monthly trends
    const monthlyAppointments = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth
      },
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        completed: completedAppointments
      },
      totalSessions,
      riskDistribution,
      topResources,
      forumStats,
      monthlyTrends: monthlyAppointments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// College Management
router.get('/colleges', adminAuth, async (req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 });
    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/colleges', adminAuth, async (req, res) => {
  try {
    const college = new College(req.body);
    await college.save();
    res.status(201).json(college);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/colleges/:id', adminAuth, async (req, res) => {
  try {
    const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    res.json(college);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/colleges/:id', adminAuth, async (req, res) => {
  try {
    const college = await College.findByIdAndDelete(req.params.id);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    res.json({ message: 'College deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Counselor Management
router.get('/counselors', adminAuth, async (req, res) => {
  try {
    const counselors = await User.find({ role: 'counselor' })
      .populate('college', 'name code')
      .sort({ name: 1 });
    res.json(counselors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/counselors', adminAuth, async (req, res) => {
  try {
    const { email, name, college, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    const counselor = new User({
      email,
      name,
      college,
      role: 'counselor',
      password: password || Math.random().toString(36).slice(-8)
    });
    
    await counselor.save();
    res.status(201).json(counselor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update counselor
router.put('/counselors/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, college } = req.body;
    const updateData = { name, email, college };
    
    // Only update password if provided
    if (req.body.password && req.body.password.trim()) {
      updateData.password = req.body.password;
    }
    
    const counselor = await User.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate('college', 'name code');
    
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }
    
    res.json(counselor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete counselor
router.delete('/counselors/:id', adminAuth, async (req, res) => {
  try {
    const counselor = await User.findByIdAndDelete(req.params.id);
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }
    res.json({ message: 'Counselor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all appointments for management
router.get('/appointments', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate('student', 'name email department')
      .populate('counselor', 'name')
      .sort({ appointmentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Appointment.countDocuments(filter);
    
    res.json({
      appointments,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user analytics
router.get('/users/analytics', adminAuth, async (req, res) => {
  try {
    // Department distribution
    const departmentStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Year distribution
    const yearStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // High-risk users (anonymized)
    const highRiskCount = await User.countDocuments({
      'screeningData.riskLevel': 'high'
    });
    
    res.json({
      departmentStats,
      yearStats,
      highRiskCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export anonymized data for research
router.get('/export/research-data', adminAuth, async (req, res) => {
  try {
    const anonymizedData = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $project: {
          _id: 0,
          department: 1,
          year: 1,
          'screeningData.phq9Score': 1,
          'screeningData.gad7Score': 1,
          'screeningData.ghqScore': 1,
          'screeningData.riskLevel': 1,
          'screeningData.lastScreening': 1,
          resourcesAccessedCount: { $size: '$resourcesAccessed' },
          createdAt: 1
        }
      }
    ]);
    
    res.json(anonymizedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
