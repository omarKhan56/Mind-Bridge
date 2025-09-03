const express = require('express');
const jwt = require('jsonwebtoken');
const Goal = require('../models/Goal');

const router = express.Router();

// Auth middleware
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

// Get user's current week goals
router.get('/', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ 
      user: req.user.userId, 
      isActive: true 
    }).sort({ createdAt: -1 });
    
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new goal
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating goal for user:', req.user.userId);
    console.log('Goal data:', req.body);
    
    const { title, target } = req.body;
    
    if (!title || !target) {
      return res.status(400).json({ message: 'Title and target are required' });
    }
    
    const goal = new Goal({
      user: req.user.userId,
      title,
      target,
      current: 0
    });
    
    const savedGoal = await goal.save();
    console.log('Goal saved:', savedGoal);
    
    res.status(201).json(savedGoal);
  } catch (error) {
    console.error('Goal creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update goal progress
router.put('/:id/progress', auth, async (req, res) => {
  try {
    const { increment } = req.body;
    const goal = await Goal.findOne({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    goal.current = Math.max(0, Math.min(goal.target, goal.current + increment));
    await goal.save();
    
    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
