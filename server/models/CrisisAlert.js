const mongoose = require('mongoose');

const crisisAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  detectionMethod: {
    type: String,
    enum: ['ai-analysis', 'keyword-fallback', 'emergency-fallback', 'historical'],
    required: true
  },
  urgency: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: Date,
  resolvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
crisisAlertSchema.index({ college: 1, createdAt: -1 });
crisisAlertSchema.index({ user: 1, createdAt: -1 });
crisisAlertSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CrisisAlert', crisisAlertSchema);
