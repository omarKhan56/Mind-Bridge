const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const geminiService = require('./services/geminiService');
const { inngest, functions, serve, eventHandler, inngestEnabled } = require('./config/inngest');
const aiScheduler = require('./services/aiScheduler');
const userAnalysisService = require('./services/userAnalysisService');
const User = require('./models/User');
const AISession = require('./models/AISession');
const CrisisAlert = require('./models/CrisisAlert');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Helper function to emit dashboard updates to counselors
function emitDashboardUpdate(collegeId, updateType, data = {}) {
  if (collegeId) {
    io.to(`college_${collegeId}_counselors`).emit(updateType, {
      timestamp: new Date(),
      ...data
    });
    console.log(`📊 Emitted ${updateType} to college ${collegeId} counselors`);
  }
}

// Helper function to generate comprehensive crisis alert data
async function generateCrisisAlertData(userId, detectionMethod, urgency, message) {
  try {
    const user = await User.findById(userId).populate('college');
    const analysis = await userAnalysisService.generateUserAnalysis(userId);
    
    return {
      userId,
      studentInfo: {
        name: user.name,
        email: user.email,
        ...(user.studentId && { studentId: user.studentId }),
        ...(user.year && { year: user.year }),
        ...(user.department && { department: user.department }),
        ...(user.phone && { phone: user.phone })
      },
      collegeInfo: {
        name: user.college?.name,
        id: user.college?._id
      },
      summary: {
        totalSessions: analysis.overview.totalSessions,
        recentActivity: analysis.overview.lastActivity,
        primaryConcerns: analysis.topConcerns.slice(0, 3),
        mentalHealthTrend: analysis.progressIndicators.overallTrend,
        riskLevel: user.screeningData?.riskLevel || 'unknown',
        engagementLevel: analysis.progressIndicators.engagementLevel
      },
      crisis: {
        message,
        urgency,
        timestamp: new Date(),
        detectionMethod
      }
    };
  } catch (error) {
    console.error('Error generating crisis alert data:', error);
    return null;
  }
}

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const forumRoutes = require('./routes/forum');
const aiSessionRoutes = require('./routes/aiSessions');
const goalRoutes = require('./routes/goals');
const counselorRoutes = require('./routes/counselor');
const adminRoutes = require('./routes/admin');
const wellnessRoutes = require('./routes/wellness');
const aiAnalysisRoutes = require('./routes/aiAnalysis');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());

// Debug endpoint to check current user
app.get('/api/debug/current-user', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    res.json({
      decoded,
      userId: decoded.userId,
      userIdType: typeof decoded.userId
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/ai-sessions', aiSessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/counselor', counselorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', require('./routes/messages'));
// Admin WebSocket namespace for real-time dashboard updates
const adminNamespace = io.of('/admin');

adminNamespace.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    if (decoded.role !== 'admin') {
      return next(new Error('Admin access required'));
    }
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

adminNamespace.on('connection', (socket) => {
  console.log(`👨‍💼 Admin connected: ${socket.userId}`);
  
  // Send initial system health data
  socket.emit('system-health', {
    apiTime: 150,
    dbStatus: 'healthy',
    aiService: true,
    activeUsers: 247,
    avgResponseTime: 145,
    aiQueue: 3,
    uptime: '99.9%'
  });
  
  socket.on('disconnect', () => {
    console.log(`👨‍💼 Admin disconnected: ${socket.userId}`);
  });
});

// Function to broadcast dashboard updates to all admin clients
const broadcastDashboardUpdate = (data) => {
  adminNamespace.emit('dashboard-update', data);
};

// Function to broadcast crisis alerts to admin clients
const broadcastCrisisAlert = (alert) => {
  adminNamespace.emit('crisis-alert', alert);
};

// Function to broadcast institutional updates to admin clients
const broadcastInstitutionalUpdate = (data) => {
  adminNamespace.emit('institutional-update', data);
};

// Export functions for use in other parts of the application
global.broadcastDashboardUpdate = broadcastDashboardUpdate;
global.broadcastCrisisAlert = broadcastCrisisAlert;
global.broadcastInstitutionalUpdate = broadcastInstitutionalUpdate;

// Test crisis alert endpoint
app.post('/api/test-crisis-alert', async (req, res) => {
  try {
    const { collegeId } = req.body;
    
    const testAlert = {
      userId: 'test-user-123',
      studentName: 'Test Student',
      studentEmail: 'test@example.com',
      collegeName: 'Test College',
      message: 'Test crisis alert via Socket.IO',
      urgency: 5,
      timestamp: new Date(),
      detectionMethod: 'manual-test'
    };
    
    io.to(`college_${collegeId}_counselors`).emit('crisis_alert', testAlert);
    console.log(`🧪 Test crisis alert sent to college ${collegeId}`);
    
    res.json({ success: true, message: 'Test alert sent' });
  } catch (error) {
    console.error('Test crisis alert error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.use('/api/wellness', wellnessRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/analytics', analyticsRoutes);

// Test endpoint for AI service
app.post('/api/test-ai', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await geminiService.generateResponse(message || 'Hello', {
      riskLevel: 'low',
      mood: 'neutral'
    });
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inngest endpoint (only if enabled)
if (inngestEnabled && serve) {
  app.use('/api/inngest', serve({ client: inngest, functions }));
}

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('join-chat', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`🏠 User ${userId} joined chat room`);
  });

  // Counselor joins college-specific room for crisis alerts
  // Handle user joining their personal room for messages
  socket.on('join-user-room', (data) => {
    const { userId, role } = data;
    const userRoom = `user_${userId}`;
    socket.join(userRoom);
    console.log(`🏠 User ${userId} (${role}) joined room: ${userRoom}`);
    socket.emit('room_joined', { room: userRoom, userId });
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, senderId, recipientId, content, priority } = data;
      
      // Create message
      const message = new Message({
        conversation: conversationId,
        sender: senderId,
        recipient: recipientId,
        content,
        priority: priority || 'normal'
      });
      
      await message.save();
      
      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastActivity: new Date()
      });
      
      // Populate message for real-time delivery
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name role')
        .populate('recipient', 'name role');
      
      // Emit to recipient's room
      io.to(`user_${recipientId}`).emit('new_message', populatedMessage);
      
      // Emit back to sender for confirmation
      socket.emit('message_sent', populatedMessage);
      
      console.log(`💬 Message sent from ${senderId} to ${recipientId}`);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle message read status
  socket.on('mark-message-read', async (data) => {
    try {
      const { messageId, userId } = data;
      
      await Message.findByIdAndUpdate(messageId, {
        status: 'read',
        readAt: new Date()
      });
      
      // Notify sender that message was read
      const message = await Message.findById(messageId);
      io.to(`user_${message.sender}`).emit('message_read', { messageId, readBy: userId });
      
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  socket.on('join-counselor-room', async (data) => {
    try {
      const userId = typeof data === 'string' ? data : data.counselorId;
      const user = await User.findById(userId).populate('college');
      if (user && user.role === 'counselor' && user.college) {
        socket.join(`user_${userId}`);
        socket.join(`college_${user.college._id}_counselors`);
        console.log(`👨‍⚕️ Counselor ${user.name} joined ${user.college.name} crisis alert room`);
        
        // Confirm room join to client
        socket.emit('room_joined', {
          room: `college_${user.college._id}_counselors`,
          collegeName: user.college.name
        });

        // Send any recent crisis alerts from the last 24 hours
        const recentAlerts = await AISession.find({
          'analysis.crisisDetected': true,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).populate('user').sort({ createdAt: -1 }).limit(10);

        for (const session of recentAlerts) {
          if (session.user && session.user.college && session.user.college.toString() === user.college._id.toString()) {
            const alertData = await generateCrisisAlertData(
              session.user._id,
              'historical',
              5,
              'Recent crisis alert (last 24h)'
            );
            if (alertData) {
              socket.emit('crisis_alert', alertData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error joining counselor room:', error);
    }
  });

  socket.on('user-message', async (data) => {
    console.log('📨 Received user message:', data.message?.substring(0, 50) + '...');
    console.log('📊 Message data:', { userId: data.userId, sessionId: data.sessionId, hasMessage: !!data.message });
    console.log('🔍 User ID type and value:', typeof data.userId, data.userId);
    
    try {
      const { message, userId, sessionId, context } = data;
      
      if (!message || !userId) {
        throw new Error('Missing message or userId');
      }

      // Save user message to session if sessionId provided
      if (sessionId) {
        try {
          console.log('💾 Saving user message to session:', sessionId);
          const updatedSession = await AISession.findByIdAndUpdate(sessionId, {
            $push: {
              messages: {
                role: 'user',
                content: message,
                timestamp: new Date()
              }
            }
          }, { new: true });
          
          if (updatedSession) {
            console.log('✅ User message saved. Total messages:', updatedSession.messages.length);
          } else {
            console.log('❌ Session not found:', sessionId);
          }
        } catch (sessionError) {
          console.log('⚠️ Failed to save user message to session:', sessionError.message);
        }
      } else {
        console.log('⚠️ No sessionId provided, message not saved');
      }
      
      // Get user context for personalized responses
      let user = null;
      let userContext = {
        riskLevel: 'low',
        screeningData: {},
        mood: context?.mood || 'neutral',
        previousMessages: context?.previousMessages || []
      };
      
      try {
        user = await User.findById(userId);
        if (user) {
          userContext = {
            riskLevel: user.screeningData?.riskLevel || 'low',
            screeningData: user.screeningData || {},
            mood: context?.mood || 'neutral',
            previousMessages: context?.previousMessages || []
          };
        }
      } catch (userError) {
        console.log('⚠️ User lookup failed, using defaults:', userError.message);
      }

      console.log('🤖 Generating AI response...');
      
      // Enhanced AI response generation
      const IntelligentResponseSystem = require('./services/intelligentResponseSystem');
      const EnhancedSentimentAnalyzer = require('./services/aiAnalysis/enhancedSentimentAnalyzer');
      
      const intelligentResponse = new IntelligentResponseSystem();
      const enhancedSentimentAnalyzer = new EnhancedSentimentAnalyzer();

      // Check if this is a new session (no existing messages)
      let isNewSession = false;
      if (sessionId) {
        try {
          const existingSession = await AISession.findById(sessionId);
          isNewSession = !existingSession || existingSession.messages.length === 0;
        } catch (error) {
          console.log('Could not check session status:', error.message);
          isNewSession = true;
        }
      } else {
        isNewSession = true;
      }

      // Generate personalized AI response
      const aiResponse = await intelligentResponse.generatePersonalizedResponse(
        message, 
        userId, 
        { sessionId, context, isNewSession }
      );

      // Save AI response to session if sessionId provided
      if (sessionId) {
        try {
          console.log('💾 Saving AI response to session:', sessionId);
          const updatedSession = await AISession.findByIdAndUpdate(sessionId, {
            $push: {
              messages: {
                role: 'assistant',
                content: aiResponse.text,
                timestamp: new Date()
              }
            }
          }, { new: true });
          
          if (updatedSession) {
            console.log('✅ AI response saved. Total messages:', updatedSession.messages.length);
          } else {
            console.log('❌ Session not found for AI response:', sessionId);
          }
        } catch (sessionError) {
          console.log('⚠️ Failed to save AI response to session:', sessionError.message);
        }
      } else {
        console.log('⚠️ No sessionId provided for AI response, not saved');
      }

      // Store the AI response
      const responseMessage = {
        sender: 'ai',
        message: aiResponse.text,
        timestamp: new Date(),
        therapistName: 'Dr. Sarah Chen',
        responseType: aiResponse.responseStyle || 'therapeutic',
        personalized: aiResponse.personalized || false,
        urgencyLevel: aiResponse.urgencyLevel || 2
      };

      socket.emit('ai-response', responseMessage);

      // Enhanced sentiment analysis for crisis detection
      try {
        const sentiment = await enhancedSentimentAnalyzer.analyzeChatSentiment([{ content: message }], userId);
        console.log('🔍 Enhanced sentiment analysis:', {
          sentiment: sentiment.overallSentiment,
          emotion: sentiment.primaryEmotion,
          crisis: sentiment.crisisIndicators?.present,
          method: sentiment.analysisMethod
        });

        // Emit student activity update to counselors
        const user = await User.findById(userId).populate('college');
        if (user && user.college) {
          io.to(`college_${user.college._id}_counselors`).emit('student_activity', {
            userId,
            activity: 'ai_session',
            timestamp: new Date()
          });
        }
        
        // Check for crisis indicators
        if (sentiment.crisisIndicators?.present && sentiment.crisisIndicators.confidence > 0.7) {
          console.log(`🚨 Crisis indicator detected for user ${userId}`);
          
          // Store alert
          await User.findByIdAndUpdate(userId, {
            $push: {
              alerts: {
                type: 'crisis_indicator',
                message: 'Crisis language detected in chat',
                timestamp: new Date(),
                severity: sentiment.urgencyLevel || 4,
                acknowledged: false
              }
            }
          });
          
          // Get user's college and alert counselors from same college
          const user = await User.findById(userId).populate('college');
          console.log('🔍 Crisis detection - User found:', user ? user.name : 'NOT FOUND');
          console.log('🔍 Crisis detection - College:', user?.college?.name || 'NO COLLEGE');
          if (user && user.college) {
            // Save crisis alert to database
            const crisisAlert = new CrisisAlert({
              user: userId,
              college: user.college._id,
              message: 'Crisis indicator detected',
              detectionMethod: 'ai-analysis',
              urgency: sentiment.urgencyLevel || 5
            });
            await crisisAlert.save();
            
            // Generate comprehensive crisis alert data
            const alertData = await generateCrisisAlertData(
              userId, 
              'ai-analysis', 
              sentiment.urgencyLevel, 
              'Crisis indicator detected'
            );
            
            if (alertData) {
              // Emit alert to all counselors in the college room
              console.log('🚨 Emitting crisis alert to room:', `college_${user.college._id}_counselors`);
              io.to(`college_${user.college._id}_counselors`).emit('crisis_alert', alertData);
              console.log(`🚨 Crisis alert sent to counselors at ${user.college.name}`);
              
              // Emit analytics update
              emitDashboardUpdate(user.college._id, 'analytics_update', { type: 'crisis_alert' });
            }
          }
        }
        
        // Fallback crisis detection using keywords
        const crisisKeywords = ['kill myself', 'suicide', 'end it all', 'want to die', 'hurt myself', 'end my life'];
        const messageText = message.toLowerCase();
        const hasCrisisKeywords = crisisKeywords.some(keyword => messageText.includes(keyword));
        
        if (hasCrisisKeywords) {
          console.log(`🚨 FALLBACK: Crisis keywords detected for user ${userId}`);
          
          // Get user's college and alert counselors from same college
          const user = await User.findById(userId).populate('college');
          if (user && user.college) {
            // Save crisis alert to database
            const crisisAlert = new CrisisAlert({
              user: userId,
              college: user.college._id,
              message: 'Crisis keywords detected in message',
              detectionMethod: 'keyword-fallback',
              urgency: 5
            });
            await crisisAlert.save();
            
            // Generate comprehensive crisis alert data
            const alertData = await generateCrisisAlertData(
              userId, 
              'keyword-fallback', 
              5, 
              'Crisis keywords detected in message'
            );
            
            if (alertData) {
              // Emit alert to all counselors in the college room
              io.to(`college_${user.college._id}_counselors`).emit('crisis_alert', alertData);
              console.log(`🚨 Fallback crisis alert sent to counselors at ${user.college.name}`);
              
              // Emit analytics update
              emitDashboardUpdate(user.college._id, 'analytics_update', { type: 'crisis_alert' });
            }
          }
        }
        
      } catch (sentimentError) {
        console.log('⚠️ Sentiment analysis failed (non-critical):', sentimentError.message);
        
        // Emergency fallback crisis detection
        const crisisKeywords = ['kill myself', 'suicide', 'end it all', 'want to die', 'hurt myself'];
        const messageText = message.toLowerCase();
        const hasCrisisKeywords = crisisKeywords.some(keyword => messageText.includes(keyword));
        
        if (hasCrisisKeywords) {
          console.log(`🚨 EMERGENCY FALLBACK: Crisis keywords detected for user ${userId}`);
          
          // Get user's college and alert counselors from same college
          const user = await User.findById(userId).populate('college');
          if (user && user.college) {
            // Generate comprehensive crisis alert data
            const alertData = await generateCrisisAlertData(
              userId, 
              'emergency-fallback', 
              5, 
              'Crisis keywords detected (emergency fallback)'
            );
            
            if (alertData) {
              // Emit alert to all counselors in the college room
              io.to(`college_${user.college._id}_counselors`).emit('crisis_alert', alertData);
              console.log(`🚨 Emergency crisis alert sent to counselors at ${user.college.name}`);
              
              // Emit analytics update
              emitDashboardUpdate(user.college._id, 'analytics_update', { type: 'crisis_alert' });
            }
          }
        }
      }

      // Process chat interaction through event handler
      await eventHandler.handleChatInteraction(userId, message, aiResponse);

    } catch (error) {
      console.error('❌ AI chat error:', error.message);
      
      // Provide immediate fallback response
      const fallbackResponse = geminiService.getEnhancedFallback(data.message || 'help', {
        riskLevel: 'low',
        mood: 'neutral'
      });
      
      console.log('🔄 Sending fallback response');
      
      socket.emit('ai-response', {
        message: fallbackResponse,
        timestamp: new Date(),
        therapistName: "Dr. Sarah Chen",
        responseType: "fallback"
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge')
  .then(() => {
    console.log('Connected to MongoDB');
    // Create a demo counselor if one doesn't exist
    const createDemoCounselor = async () => {
      try {
        const existingCounselor = await User.findOne({ email: 'counselor@example.com' });
        if (!existingCounselor) {
          // Create demo college if it doesn't exist
          const College = require('./models/College');
          let demoCollege = await College.findOne({ code: 'DEMO' });
          if (!demoCollege) {
            demoCollege = new College({
              name: 'Demo University',
              code: 'DEMO',
              address: '123 Demo Street, Demo City',
              contactEmail: 'admin@demo.edu'
            });
            await demoCollege.save();
          }

          const counselor = new User({
            name: 'Dr. Alex Chen',
            email: 'counselor@example.com',
            password: 'password123', // This will be hashed by the pre-save hook
            role: 'counselor',
            college: demoCollege._id,
            department: 'Psychology'
          });
          await counselor.save();
          console.log('Demo counselor created');
        }
      } catch (error) {
        console.error('Error creating demo counselor:', error);
      }
    };
    createDemoCounselor();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start AI analysis scheduler
  if (process.env.NODE_ENV !== 'test') {
    aiScheduler.start();
  }
});
