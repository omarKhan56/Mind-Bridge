const mongoose = require('mongoose');
const User = require('../models/User');
const College = require('../models/College');
require('dotenv').config();

const populateUserFields = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    // Get the college
    const college = await College.findOne();
    if (!college) {
      console.log('❌ No college found!');
      process.exit(1);
    }
    
    // Update students with missing profile data
    const students = await User.find({ role: 'student' });
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const updates = {};
      
      if (!student.studentId) {
        updates.studentId = `STU${String(i + 1).padStart(4, '0')}`;
      }
      
      if (!student.department) {
        const departments = ['Computer Science', 'Psychology', 'Engineering', 'Business Administration'];
        updates.department = departments[i % departments.length];
      }
      
      if (!student.year) {
        updates.year = Math.floor(Math.random() * 4) + 1; // 1-4
      }
      
      if (!student.college) {
        updates.college = college._id;
      }
      
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(student._id, updates);
        console.log(`✅ Updated ${student.name}: ${JSON.stringify(updates)}`);
      }
    }
    
    console.log('🎉 All users updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  }
};

populateUserFields();
