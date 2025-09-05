#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

// Import User model
const User = require('./server/models/User');

async function getTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a counselor
    const counselor = await User.findOne({ role: 'counselor' }).populate('college');
    console.log('\n👨‍⚕️ COUNSELOR FOUND:');
    if (counselor) {
      console.log(`   ID: ${counselor._id}`);
      console.log(`   Name: ${counselor.name}`);
      console.log(`   Email: ${counselor.email}`);
      console.log(`   College: ${counselor.college ? counselor.college.name : 'No college assigned'}`);
      console.log(`   College ID: ${counselor.college ? counselor.college._id : 'N/A'}`);
    } else {
      console.log('   No counselor found');
    }

    // Find a student
    const student = await User.findOne({ role: 'student' }).populate('college');
    console.log('\n👨‍🎓 STUDENT FOUND:');
    if (student) {
      console.log(`   ID: ${student._id}`);
      console.log(`   Name: ${student.name}`);
      console.log(`   Email: ${student.email}`);
      console.log(`   College: ${student.college ? student.college.name : 'No college assigned'}`);
      console.log(`   College ID: ${student.college ? student.college._id : 'N/A'}`);
    } else {
      console.log('   No student found');
    }

    // Find all colleges
    const College = require('./server/models/College');
    const colleges = await College.find().limit(3);
    console.log('\n🏫 COLLEGES FOUND:');
    colleges.forEach((college, index) => {
      console.log(`   ${index + 1}. ${college.name} (ID: ${college._id})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getTestUsers();
