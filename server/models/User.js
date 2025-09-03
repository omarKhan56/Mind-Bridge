const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'counselor', 'admin'], default: 'student' },
  college: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'College',
    required: function() { return this.role !== 'admin'; }
  },
  studentId: { type: String, sparse: true },
  department: String,
  year: Number,
  
  // Psychological screening data
  screeningData: {
    phq9Score: { type: Number, default: 0 }, // Depression screening
    gad7Score: { type: Number, default: 0 }, // Anxiety screening
    ghqScore: { type: Number, default: 0 },  // General health screening
    lastScreening: Date,
    riskLevel: { type: String, enum: ['low', 'moderate', 'high'], default: 'low' }
  },
  
  // Preferences
  language: { type: String, default: 'en' },
  anonymousMode: { type: Boolean, default: true },
  
  // Activity tracking
  lastActive: { type: Date, default: Date.now },
  resourcesAccessed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resource' }],
  
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
