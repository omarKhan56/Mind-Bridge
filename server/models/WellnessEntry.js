const mongoose = require('mongoose');

const wellnessEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  mood: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  stress: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  sleep: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Ensure one entry per user per day
wellnessEntrySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WellnessEntry', wellnessEntrySchema);
