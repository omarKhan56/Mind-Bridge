const mongoose = require('mongoose');
const User = require('../models/User');
const College = require('../models/College');
require('dotenv').config();

const assignStudentsToCollege = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    // Find Dr. Alex Chen counselor
    const counselor = await User.findOne({ 
      email: 'counselor@example.com',
      role: 'counselor' 
    }).populate('college');
    
    if (!counselor) {
      console.log('❌ Dr. Alex Chen counselor not found!');
      process.exit(1);
    }
    
    if (!counselor.college) {
      console.log('❌ Dr. Alex Chen is not assigned to any college!');
      process.exit(1);
    }
    
    // Update all students to assign them to the same college
    const result = await User.updateMany(
      { role: 'student' },
      { $set: { college: counselor.college._id } }
    );
    
    console.log('✅ Successfully assigned students to college!');
    console.log(`📊 Updated ${result.modifiedCount} students`);
    console.log(`🏫 College: ${counselor.college.name} (${counselor.college.code})`);
    console.log(`👨‍⚕️ Counselor: ${counselor.name}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error assigning students to college:', error);
    process.exit(1);
  }
};

assignStudentsToCollege();
