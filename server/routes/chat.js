const express = require('express');
const jwt = require('jsonwebtoken');
const { eventHandler } = require('../config/inngest');
const router = express.Router();

// Simple chat history storage (in production, use a proper database)
const chatSessions = new Map();

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

// Get chat history
router.get('/history', auth, async (req, res) => {
  try {
    const history = chatSessions.get(req.user.userId) || [];
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save chat message
router.post('/message', auth, async (req, res) => {
  try {
    const { message, type, aiResponse } = req.body; // type: 'user' or 'ai'
    
    if (!chatSessions.has(req.user.userId)) {
      chatSessions.set(req.user.userId, []);
    }
    
    const userHistory = chatSessions.get(req.user.userId);
    userHistory.push({
      message,
      type,
      timestamp: new Date()
    });
    
    // Keep only last 50 messages
    if (userHistory.length > 50) {
      userHistory.splice(0, userHistory.length - 50);
    }

    // Process chat interaction for crisis detection
    if (type === 'user' && message) {
      await eventHandler.handleChatInteraction(req.user.userId, message, aiResponse);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get crisis resources
router.get('/crisis-resources', async (req, res) => {
  try {
    const resources = [
      {
        name: "National Suicide Prevention Lifeline",
        phone: "988",
        available: "24/7"
      },
      {
        name: "Crisis Text Line",
        text: "Text HOME to 741741",
        available: "24/7"
      },
      {
        name: "Campus Counseling Center",
        phone: "Your campus number here",
        available: "Mon-Fri 9AM-5PM"
      }
    ];
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
