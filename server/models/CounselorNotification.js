const mongoose = require('mongoose');

const counselorNotificationSchema = new mongoose.Schema({
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  alertType: {
    type: String,
    enum: ['crisis_acknowledged', 'crisis_resolved', 'high_risk_detected', 'appointment_needed'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  message: {
    type: String,
    required: true
  },
  originalCrisisAlert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrisisAlert'
  },
  status: {
    type: String,
    enum: ['pending', 'read', 'acted_upon'],
    default: 'pending'
  },
  readAt: {
    type: Date
  },
  actedUponAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
counselorNotificationSchema.index({ counselor: 1, status: 1, createdAt: -1 });
counselorNotificationSchema.index({ college: 1, alertType: 1 });

module.exports = mongoose.model('CounselorNotification', counselorNotificationSchema);
