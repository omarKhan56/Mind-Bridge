const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const assignStudentsToCounselor = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    // Find Dr. Alex Chen counselor
    const counselor = await User.findOne({ 
      email: 'counselor@example.com',
      role: 'counselor' 
    });
    
    if (!counselor) {
      console.log('❌ Dr. Alex Chen counselor not found!');
      process.exit(1);
    }
    
    // Update all students to assign them to this counselor
    const result = await User.updateMany(
      { role: 'student' },
      { $set: { assignedCounselor: counselor._id } }
    );
    
    console.log('✅ Successfully assigned students to Dr. Alex Chen!');
    console.log(`📊 Updated ${result.modifiedCount} students`);
    console.log(`👨‍⚕️ Counselor: ${counselor.name} (${counselor.email})`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error assigning students:', error);
    process.exit(1);
  }
};

assignStudentsToCounselor();
