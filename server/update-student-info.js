#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const College = require('./models/College');

async function updateStudentInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update the counselor to have more complete information
    const counselorUpdate = await User.findByIdAndUpdate(
      '68b89e52952bdb572d8acb5b',
      {
        studentId: 'COUN001',
        department: 'Psychology',
        year: 4,
        phone: '+1-555-0123'
      },
      { new: true }
    );

    console.log('✅ Updated counselor info:', {
      name: counselorUpdate.name,
      studentId: counselorUpdate.studentId,
      department: counselorUpdate.department,
      year: counselorUpdate.year
    });

    // Update the student to have more complete information and same college as counselor
    const studentUpdate = await User.findByIdAndUpdate(
      '68b7384998dbc12c3a114304',
      {
        studentId: 'STU2024001',
        department: 'Computer Science',
        year: 2,
        phone: '+1-555-0456',
        college: '68b89e31952bdb572d8acb55' // Same college as counselor (Straw Hat Pirate)
      },
      { new: true }
    ).populate('college');

    console.log('✅ Updated student info:', {
      name: studentUpdate.name,
      studentId: studentUpdate.studentId,
      department: studentUpdate.department,
      year: studentUpdate.year
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateStudentInfo();
