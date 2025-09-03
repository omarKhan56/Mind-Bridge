const mongoose = require('mongoose');
const User = require('../models/User');
const College = require('../models/College');
require('dotenv').config();

const updateUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    // Get the college
    const college = await College.findOne();
    
    // Update the specific user
    const result = await User.findOneAndUpdate(
      { email: 'amaanmoinoddinshaikh@rahmanimission.org' },
      {
        studentId: 'STU2024001',
        department: 'Computer Science',
        year: 3,
        college: college?._id
      },
      { new: true }
    );
    
    if (result) {
      console.log('✅ User updated successfully:', {
        name: result.name,
        studentId: result.studentId,
        department: result.department,
        year: result.year,
        college: college?.name
      });
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateUser();
