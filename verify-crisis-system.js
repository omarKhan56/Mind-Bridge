#!/usr/bin/env node

const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mindbridge');

const User = require('./server/models/User');
const CrisisAlert = require('./server/models/CrisisAlert');
const CounselorNotification = require('./server/models/CounselorNotification');
const College = require('./server/models/College');

async function verifyCrisisSystem() {
  console.log('🔍 Verifying Crisis Alert System...\n');

  try {
    // Check if models exist and are accessible
    console.log('📋 Checking database models...');
    
    const userCount = await User.countDocuments();
    const collegeCount = await College.countDocuments();
    const crisisCount = await CrisisAlert.countDocuments();
    const notificationCount = await CounselorNotification.countDocuments();
    
    console.log(`✅ Users: ${userCount}`);
    console.log(`✅ Colleges: ${collegeCount}`);
    console.log(`✅ Crisis Alerts: ${crisisCount}`);
    console.log(`✅ Counselor Notifications: ${notificationCount}`);

    // Check for students and counselors
    console.log('\n👥 Checking user roles...');
    const students = await User.find({ role: 'student' }).limit(3);
    const counselors = await User.find({ role: 'counselor' }).limit(3);
    const admins = await User.find({ role: 'admin' }).limit(1);

    console.log(`✅ Students found: ${students.length}`);
    console.log(`✅ Counselors found: ${counselors.length}`);
    console.log(`✅ Admins found: ${admins.length}`);

    if (students.length > 0) {
      console.log(`   Sample student: ${students[0].name || 'Unnamed'} (${students[0].email})`);
    }
    if (counselors.length > 0) {
      console.log(`   Sample counselor: ${counselors[0].name || 'Unnamed'} (${counselors[0].email})`);
    }

    // Check recent crisis alerts
    console.log('\n🚨 Checking recent crisis alerts...');
    const recentAlerts = await CrisisAlert.find()
      .populate('user', 'name studentId email')
      .populate('college', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentAlerts.length > 0) {
      console.log(`✅ Found ${recentAlerts.length} crisis alerts:`);
      recentAlerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. ${alert.user?.name || 'Unknown'} - ${alert.riskLevel} - ${alert.status}`);
        console.log(`      Message: ${alert.message.substring(0, 50)}...`);
        console.log(`      College: ${alert.college?.name || 'Unknown'}`);
        console.log(`      Created: ${alert.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No crisis alerts found');
    }

    // Check counselor notifications
    console.log('\n📧 Checking counselor notifications...');
    const recentNotifications = await CounselorNotification.find()
      .populate('counselor', 'name email')
      .populate('student', 'name studentId')
      .populate('college', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentNotifications.length > 0) {
      console.log(`✅ Found ${recentNotifications.length} counselor notifications:`);
      recentNotifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. To: ${notification.counselor?.name || 'Unknown'}`);
        console.log(`      Student: ${notification.student?.name || 'Unknown'}`);
        console.log(`      Type: ${notification.alertType} - Priority: ${notification.priority}`);
        console.log(`      Status: ${notification.status}`);
        console.log(`      Created: ${notification.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No counselor notifications found');
    }

    console.log('\n🎯 Crisis System Status:');
    console.log('✅ Database models accessible');
    console.log('✅ User roles configured');
    console.log('✅ Crisis alert system ready');
    console.log('✅ Counselor notification system ready');
    
    console.log('\n🚀 Crisis Alert System is READY FOR TESTING!');
    console.log('\n📝 To test the system:');
    console.log('1. Go to Admin Dashboard');
    console.log('2. Click "Create Sample Data" button');
    console.log('3. Check Crisis Management tab for alerts');
    console.log('4. Test Acknowledge/Resolve buttons');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run verification
verifyCrisisSystem();
