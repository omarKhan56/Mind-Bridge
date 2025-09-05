const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
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

// Get user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.user': req.user.userId,
      status: 'active'
    })
    .populate('participants.user', 'name role')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.user': req.user.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name role')
      .populate('recipient', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    const { recipientId, subject, initialMessage, priority } = req.body;
    
    const sender = await User.findById(req.user.userId).populate('college');
    const recipient = await User.findById(recipientId).populate('college');
    
    if (!sender || !recipient) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      'participants.user': { $all: [req.user.userId, recipientId] },
      status: 'active'
    });

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [
          { user: req.user.userId, role: sender.role },
          { user: recipientId, role: recipient.role }
        ],
        subject,
        college: sender.college._id,
        priority: priority || 'normal'
      });
      
      await conversation.save();
    }

    // Create initial message only if provided
    if (initialMessage && initialMessage.trim()) {
      const message = new Message({
        conversation: conversation._id,
        sender: req.user.userId,
        recipient: recipientId,
        content: initialMessage,
        priority: priority || 'normal'
      });
      
      await message.save();
      
      // Update conversation with last message
      conversation.lastMessage = message._id;
      conversation.lastActivity = new Date();
      await conversation.save();

      res.json({ conversation, message });
    } else {
      res.json({ conversation, message: null });
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to existing conversation
router.post('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const { content, priority } = req.body;
    
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.user': req.user.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Get recipient
    const recipient = conversation.participants.find(p => 
      p.user.toString() !== req.user.userId
    );

    const message = new Message({
      conversation: req.params.id,
      sender: req.user.userId,
      recipient: recipient.user,
      content,
      priority: priority || 'normal'
    });
    
    await message.save();
    
    // Update conversation
    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: message._id,
      lastActivity: new Date()
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name role')
      .populate('recipient', 'name role');

    res.json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.patch('/messages/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { status: 'read', readAt: new Date() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user.userId,
      status: { $ne: 'read' }
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
