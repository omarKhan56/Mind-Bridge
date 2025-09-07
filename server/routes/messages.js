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

    // Create counselor notification if recipient is a counselor
    const recipientUser = await User.findById(recipient.user);
    if (recipientUser && recipientUser.role === 'counselor') {
      const CounselorNotification = require('../models/CounselorNotification');
      
      await CounselorNotification.create({
        counselor: recipient.user,
        type: 'new_message',
        title: 'New Message from Student',
        message: `You have a new message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        priority: priority || 'normal',
        data: {
          conversationId: req.params.id,
          messageId: message._id,
          studentId: req.user.userId
        }
      });
    }

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

// Send message to all counselors from same college
router.post('/send-to-counselors', auth, async (req, res) => {
  try {
    const { message, messageType = 'counselor_broadcast' } = req.body;
    
    const student = await User.findById(req.user.userId).populate('college');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find all counselors from the same college
    const counselors = await User.find({
      college: student.college._id,
      role: 'counselor',
      status: 'active'
    });

    if (counselors.length === 0) {
      return res.status(404).json({ message: 'No counselors available' });
    }

    // Create messages for each counselor
    const messages = [];
    for (const counselor of counselors) {
      // Find or create conversation
      let conversation = await Conversation.findOne({
        'participants.user': { $all: [req.user.userId, counselor._id] },
        status: 'active'
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [
            { user: req.user.userId, role: 'student' },
            { user: counselor._id, role: 'counselor' }
          ],
          subject: 'Student Support Request',
          college: student.college._id,
          priority: 'normal'
        });
        await conversation.save();
      }

      // Create message
      const newMessage = new Message({
        conversation: conversation._id,
        sender: req.user.userId,
        recipient: counselor._id,
        content: message,
        messageType: 'text',
        priority: 'normal'
      });
      
      await newMessage.save();
      messages.push(newMessage);

      // Update conversation
      conversation.lastMessage = newMessage._id;
      conversation.lastActivity = new Date();
      await conversation.save();
    }

    res.json({ success: true, messagesSent: messages.length });
  } catch (error) {
    console.error('Error sending message to counselors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get counselor chat for student
router.get('/counselor-chat', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.userId).populate('college');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all conversations with counselors
    const conversations = await Conversation.find({
      'participants.user': req.user.userId,
      status: 'active'
    }).populate('participants.user', 'name role');

    // Get all messages from these conversations and deduplicate
    const conversationIds = conversations.map(c => c._id);
    const allMessages = await Message.find({
      conversation: { $in: conversationIds }
    })
    .populate('sender', 'name role')
    .sort({ createdAt: 1 });

    // Deduplicate messages by content and timestamp (within 1 minute)
    const uniqueMessages = [];
    const seenMessages = new Map();

    for (const msg of allMessages) {
      const key = `${msg.content}_${msg.sender._id}_${Math.floor(new Date(msg.createdAt).getTime() / 60000)}`;
      
      if (!seenMessages.has(key)) {
        seenMessages.set(key, true);
        uniqueMessages.push(msg);
      }
    }

    // Format messages for frontend
    const formattedMessages = uniqueMessages.map(msg => ({
      message: msg.content,
      sender: msg.sender.role,
      counselorName: msg.sender.role === 'counselor' ? msg.sender.name : null,
      createdAt: msg.createdAt,
      messageId: msg._id,
      canEdit: msg.sender._id.toString() === req.user.userId,
      status: msg.status,
      isEdited: msg.isEdited || false
    }));

    // Count unread messages
    const unreadCount = await Message.countDocuments({
      recipient: req.user.userId,
      status: { $ne: 'read' }
    });

    res.json({
      messages: formattedMessages,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching counselor chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit message
router.put('/messages/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user.userId
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    // Check if message is not too old (allow editing within 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ message: 'Message too old to edit' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name role');

    res.json(populatedMessage);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete message
router.delete('/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user.userId
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or unauthorized' });
    }

    // Check if message is not too old (allow deletion within 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ message: 'Message too old to delete' });
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to specific counselor (student to counselor)
router.post('/send-to-counselor', auth, async (req, res) => {
  try {
    const { counselorId, subject, message, priority } = req.body;
    
    const student = await User.findById(req.user.userId).populate('college');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const counselor = await User.findById(counselorId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(404).json({ message: 'Counselor not found' });
    }

    // Create conversation if it doesn't exist
    let conversation = await Conversation.findOne({
      'participants.user': { $all: [req.user.userId, counselorId] },
      status: 'active'
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [
          { user: req.user.userId, role: 'student' },
          { user: counselorId, role: 'counselor' }
        ],
        subject: subject || 'Student Message',
        college: student.college._id,
        priority: priority || 'normal'
      });
      await conversation.save();
    }

    // Create message
    const newMessage = new Message({
      conversation: conversation._id,
      sender: req.user.userId,
      recipient: counselorId,
      content: message,
      priority: priority || 'normal'
    });
    
    await newMessage.save();
    
    // Update conversation
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: newMessage._id,
      lastActivity: new Date()
    });

    // Create counselor notification
    const CounselorNotification = require('../models/CounselorNotification');
    
    await CounselorNotification.create({
      counselor: counselorId,
      type: 'new_message',
      title: 'New Message from Student',
      message: `You have a new message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      priority: priority || 'normal',
      data: {
        conversationId: conversation._id,
        messageId: newMessage._id,
        studentId: req.user.userId
      }
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name role')
      .populate('recipient', 'name role');

    res.json(populatedMessage);
  } catch (error) {
    console.error('Error sending message to counselor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available counselors for messaging
router.get('/available-counselors', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.userId).populate('college');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('Student college:', student.college); // Debug log

    // Find all counselors from the same college
    const counselors = await User.find({
      college: student.college._id,
      role: 'counselor'
    }).select('name email specialization isOnline lastActive');

    console.log('Found counselors:', counselors.length); // Debug log

    // If no counselors found, also try without college filter for testing
    if (counselors.length === 0) {
      const allCounselors = await User.find({
        role: 'counselor'
      }).select('name email specialization isOnline lastActive college');
      
      console.log('All counselors in system:', allCounselors.length); // Debug log
      
      // For now, return all counselors if none from same college
      res.json(allCounselors);
    } else {
      res.json(counselors);
    }
  } catch (error) {
    console.error('Error fetching available counselors:', error);
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
