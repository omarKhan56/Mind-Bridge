const express = require('express');
const AISession = require('../models/AISession');
const Alert = require('../models/Alert');
const alertService = require('../services/alertService');
const router = express.Router();

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Get user's AI sessions
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await AISession.find({ user: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('title mood tags isActive createdAt updatedAt messages');
    
    const sessionsWithSummary = sessions.map(session => ({
      ...session.toObject(),
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1]?.content.substring(0, 100) + '...'
    }));
    
    res.json(sessionsWithSummary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific session
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await AISession.findOne({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new session
router.post('/', auth, async (req, res) => {
  try {
    const { title, mood, initialMessage } = req.body;
    
    const session = new AISession({
      user: req.user.userId,
      title: title || `Session ${new Date().toLocaleDateString()}`,
      mood: mood || 'neutral',
      messages: initialMessage ? [{
        role: 'user',
        content: initialMessage
      }] : []
    });
    
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add message to session
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { role, content } = req.body;
    
    const session = await AISession.findOne({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    session.messages.push({ role, content });
    await session.save();
    
    // Check for alerts after user messages
    if (role === 'user') {
      try {
        const alerts = await alertService.checkForAlerts(req.user.userId);
        for (const alertData of alerts) {
          // Check if similar alert already exists
          const existingAlert = await Alert.findOne({
            student: req.user.userId,
            type: alertData.type,
            isResolved: false
          });
          
          if (!existingAlert) {
            await Alert.create({
              student: req.user.userId,
              ...alertData
            });
          }
        }
      } catch (alertError) {
        console.error('Alert check failed:', alertError);
      }
    }
    
    res.json({ message: 'Message added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update session
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, mood, tags, isActive } = req.body;
    
    const session = await AISession.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { title, mood, tags, isActive },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete session
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await AISession.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.userId 
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a specific session
router.get('/:sessionId/messages', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await AISession.findOne({
      _id: sessionId,
      user: req.user.userId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({
      sessionId: session._id,
      messages: session.messages || []
    });
  } catch (error) {
    console.error('Error fetching session messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a session
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await AISession.findOneAndDelete({
      _id: sessionId,
      user: req.user.userId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
