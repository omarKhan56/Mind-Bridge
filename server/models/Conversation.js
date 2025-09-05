const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['student', 'counselor'],
      required: true
    },
    lastRead: {
      type: Date,
      default: Date.now
    }
  }],
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active'
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  tags: [String],
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Index for efficient queries
conversationSchema.index({ 'participants.user': 1, lastActivity: -1 });
conversationSchema.index({ college: 1, lastActivity: -1 });
conversationSchema.index({ status: 1, lastActivity: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
