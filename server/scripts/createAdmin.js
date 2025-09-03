const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindbridge');
    
    const adminData = {
      email: 'admin@mindbridge.com',
      password: 'admin123',
      name: 'System Administrator',
      role: 'admin'
    };
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('Admin account already exists!');
      process.exit(0);
    }
    
    const admin = new User(adminData);
    await admin.save();
    
    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@mindbridge.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
