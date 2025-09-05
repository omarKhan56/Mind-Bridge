const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  sessionType: {
    type: String,
    enum: ['individual', 'group', 'crisis', 'follow-up', 'assessment'],
    required: true
  },
  presentingConcerns: {
    type: String,
    required: true
  },
  sessionSummary: {
    type: String,
    required: true
  },
  interventions: [{
    type: String,
    description: String
  }],
  studentResponse: {
    type: String
  },
  progressNotes: {
    type: String
  },
  riskAssessment: {
    suicidalIdeation: {
      type: String,
      enum: ['none', 'passive', 'active', 'plan', 'intent']
    },
    selfHarm: {
      type: String,
      enum: ['none', 'thoughts', 'history', 'recent']
    },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'imminent']
    },
    safetyPlan: String
  },
  goals: [{
    description: String,
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'achieved', 'modified']
    },
    targetDate: Date
  }],
  homework: [{
    task: String,
    dueDate: Date,
    completed: { type: Boolean, default: false }
  }],
  nextSteps: {
    type: String
  },
  followUpDate: {
    type: Date
  },
  referrals: [{
    type: String,
    provider: String,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'declined']
    }
  }],
  confidentialityNotes: {
    type: String
  }
}, {
  timestamps: true
});

sessionNoteSchema.index({ student: 1, sessionDate: -1 });
sessionNoteSchema.index({ counselor: 1, sessionDate: -1 });
sessionNoteSchema.index({ appointment: 1 });

module.exports = mongoose.model('SessionNote', sessionNoteSchema);
