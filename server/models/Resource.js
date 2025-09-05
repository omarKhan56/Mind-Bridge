const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['article', 'video', 'worksheet', 'exercise', 'guide', 'tool'],
    required: true
  },
  category: {
    type: String,
    enum: ['anxiety', 'depression', 'stress', 'relationships', 'academic', 'general'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String
  }],
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  usage: {
    views: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

resourceSchema.index({ college: 1, category: 1 });
resourceSchema.index({ createdBy: 1, createdAt: -1 });
resourceSchema.index({ tags: 1 });

module.exports = mongoose.model('Resource', resourceSchema);
