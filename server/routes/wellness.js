const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WellnessEntry = require('../models/WellnessEntry');
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

// Get wellness trends
router.get('/trends', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const entries = await WellnessEntry.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update wellness entry
router.post('/entry', auth, async (req, res) => {
  try {
    const { mood, stress, sleep, notes } = req.body;
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entry = await WellnessEntry.findOneAndUpdate(
      { user: userId, date: today },
      { mood, stress, sleep, notes },
      { upsert: true, new: true }
    );
    
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get today's entry
router.get('/today', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entry = await WellnessEntry.findOne({
      user: userId,
      date: today
    });
    
    res.json(entry || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
