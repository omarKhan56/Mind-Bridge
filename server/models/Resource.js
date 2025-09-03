const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  
  type: { 
    type: String, 
    enum: ['video', 'audio', 'article', 'guide', 'exercise'], 
    required: true 
  },
  
  category: { 
    type: String, 
    enum: ['anxiety', 'depression', 'stress', 'sleep', 'relationships', 'academic', 'general'], 
    required: true 
  },
  
  language: { type: String, default: 'en' },
  
  content: {
    url: String,
    filePath: String,
    text: String,
    duration: Number // for audio/video in seconds
  },
  
  tags: [String],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  
  // Analytics
  viewCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  
  // Access control
  isPublic: { type: Boolean, default: true },
  requiredRole: { type: String, enum: ['student', 'counselor', 'admin'] },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resource', resourceSchema);
