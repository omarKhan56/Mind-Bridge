const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const geminiService = require('./services/geminiService');
const { inngest, functions, serve } = require('./lib/inngest');
const User = require('./models/User');
const AISession = require('./models/AISession');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const forumRoutes = require('./routes/forum');
const aiSessionRoutes = require('./routes/aiSessions');
const goalRoutes = require('./routes/goals');
const counselorRoutes = require('./routes/counselor');
const adminRoutes = require('./routes/admin');
const wellnessRoutes = require('./routes/wellness');

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/ai-sessions', aiSessionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/counselor', counselorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wellness', wellnessRoutes);

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

// Inngest endpoint
app.use('/api/inngest', serve({ client: inngest, functions }));

// Socket.io for real-time chat
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('join-chat', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`🏠 User ${userId} joined chat room`);
  });

  socket.on('user-message', async (data) => {
    console.log('📨 Received user message:', data.message?.substring(0, 50) + '...');
    console.log('📊 Message data:', { userId: data.userId, sessionId: data.sessionId, hasMessage: !!data.message });
    
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
      
      // Generate AI response with timeout
      const responsePromise = geminiService.generateResponse(message, userContext);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Response timeout')), 8000)
      );

      const aiResponse = await Promise.race([responsePromise, timeoutPromise]);
      
      console.log('✅ AI response generated:', aiResponse.substring(0, 50) + '...');

      // Save AI response to session if sessionId provided
      if (sessionId) {
        try {
          console.log('💾 Saving AI response to session:', sessionId);
          const updatedSession = await AISession.findByIdAndUpdate(sessionId, {
            $push: {
              messages: {
                role: 'assistant',
                content: aiResponse,
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
      
      // Send response back to user
      socket.emit('ai-response', {
        message: aiResponse,
        timestamp: new Date(),
        therapistName: "Dr. Sarah Chen",
        responseType: "therapeutic"
      });

      // Send event to Inngest for processing (non-blocking)
      inngest.send({
        name: 'chat/message-sent',
        data: { userId, message, aiResponse }
      }).catch(err => console.log('📊 Inngest error (non-critical):', err.message));

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
          const counselor = new User({
            name: 'Dr. Alex Chen',
            email: 'counselor@example.com',
            password: 'password123', // This will be hashed by the pre-save hook
            role: 'counselor',
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
});
