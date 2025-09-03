const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  target: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  current: {
    type: Number,
    default: 0,
    min: 0
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  weekStartDate: {
    type: Date,
    default: () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek;
      return new Date(now.setDate(diff));
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate progress before saving
goalSchema.pre('save', function(next) {
  this.progress = Math.round((this.current / this.target) * 100);
  next();
});

module.exports = mongoose.model('Goal', goalSchema);
