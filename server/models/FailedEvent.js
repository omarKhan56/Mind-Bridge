const mongoose = require('mongoose');

const failedEventSchema = new mongoose.Schema({
  functionId: { type: String, required: true },
  originalEvent: { type: Object, required: true },
  error: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending_review', 'investigating', 'resolved'], 
    default: 'pending_review' 
  },
  retryCount: { type: Number, default: 0 },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('FailedEvent', failedEventSchema);
