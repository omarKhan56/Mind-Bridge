const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Resource = require('../models/Resource');
const Alert = require('../models/Alert');
const { sendLoginCredentials } = require('../services/emailService');
const alertService = require('../services/alertService');
const router = express.Router();

// Generate strong password
const generatePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

const counselorAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const user = await User.findById(decoded.userId).populate('college');
    if (!user || user.role !== 'counselor') {
      return res.status(403).json({ message: 'Counselor access required' });
    }
    
    req.user = { ...decoded, collegeId: user.college?._id, collegeName: user.college?.name };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Student Management
router.post('/students', counselorAuth, async (req, res) => {
  try {
    const { email, name, studentId, department, year } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Get counselor's college
    const counselor = await User.findById(req.user.userId).populate('college');
    if (!counselor || !counselor.college) {
      return res.status(400).json({ message: 'Counselor must be associated with a college' });
    }
    
    // Generate strong password
    const generatedPassword = generatePassword();
    
    const newStudent = new User({
      email,
      password: generatedPassword,
      name,
      studentId,
      department,
      year,
      role: 'student',
      college: counselor.college._id
    });
    
    await newStudent.save();
    
    // Send email with login credentials
    const emailSent = await sendLoginCredentials(email, name, generatedPassword);
    
    // Return student data with generated password (for counselor to share with student)
    res.status(201).json({
      student: {
        _id: newStudent._id,
        email: newStudent.email,
        name: newStudent.name,
        studentId: newStudent.studentId,
        department: newStudent.department,
        year: newStudent.year,
        role: newStudent.role,
        college: counselor.college.name
      },
      generatedPassword, // Only returned once for counselor to share
      emailSent // Indicate if email was sent successfully
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/students/:id', counselorAuth, async (req, res) => {
  try {
    const student = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/students/:id', counselorAuth, async (req, res) => {
  try {
    const student = await User.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/students', counselorAuth, async (req, res) => {
  try {
    if (!req.user.collegeId) {
      return res.status(400).json({ message: 'Counselor must be associated with a college' });
    }
    
    const students = await User.find({ 
      role: 'student',
      college: req.user.collegeId
    }).populate('college', 'name code');
    
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Appointment Management
router.get('/appointments', counselorAuth, async (req, res) => {
  try {
    if (!req.user.collegeId) {
      return res.status(400).json({ message: 'Counselor must be associated with a college' });
    }
    
    // Find students from the same college
    const collegeStudents = await User.find({ 
      role: 'student',
      college: req.user.collegeId
    }).select('_id');
    
    const studentIds = collegeStudents.map(student => student._id);
    
    const appointments = await Appointment.find({
      student: { $in: studentIds }
    })
      .populate('student', 'name email department year college')
      .populate('counselor', 'name')
      .sort({ appointmentDate: 1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/appointments/:id/confirm', counselorAuth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', counselor: req.user.userId },
      { new: true }
    ).populate('student', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/appointments/:id/cancel', counselorAuth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    ).populate('student', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/appointments/:id/complete', counselorAuth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    ).populate('student', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/appointments/:id/approve', counselorAuth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', counselor: req.user.userId },
      { new: true }
    ).populate('student', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/appointments/:id/reschedule', counselorAuth, async (req, res) => {
  try {
    const { appointmentDate, appointmentTime } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { appointmentDate, appointmentTime, status: 'confirmed', counselor: req.user.userId },
      { new: true }
    ).populate('student', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard Analytics
router.get('/analytics', counselorAuth, async (req, res) => {
  try {
    // College info is now available from auth middleware
    if (!req.user.collegeId) {
      return res.status(400).json({ message: 'Counselor must be associated with a college' });
    }
    
    // Get students from the same college
    const collegeStudents = await User.find({ 
      role: 'student',
      college: req.user.collegeId
    });
    
    const studentIds = collegeStudents.map(student => student._id);
    
    const totalStudents = collegeStudents.length;
    
    const pendingAppointments = await Appointment.countDocuments({ 
      student: { $in: studentIds },
      status: 'pending' 
    });
    
    const highRiskStudents = collegeStudents.filter(student => 
      student.screeningData?.riskLevel === 'high' || 
      student.aiAnalysis?.riskLevel === 'high' || 
      student.aiAnalysis?.riskLevel === 'critical'
    ).length;
    
    const totalAppointments = await Appointment.countDocuments({
      student: { $in: studentIds }
    });
    
    const completedAppointments = await Appointment.countDocuments({
      student: { $in: studentIds },
      status: 'completed'
    });
    
    // Get today's completed appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const completedToday = await Appointment.countDocuments({
      student: { $in: studentIds },
      status: 'completed',
      updatedAt: { $gte: today, $lt: tomorrow }
    });
    
    // AI Analysis Summary
    const aiAnalysisSummary = {
      totalAnalyzed: collegeStudents.filter(s => s.aiAnalysis?.lastAnalysis).length,
      riskDistribution: {
        low: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'low').length,
        moderate: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'moderate').length,
        high: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'high').length,
        critical: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'critical').length
      },
      trendAnalysis: {
        improving: collegeStudents.filter(s => s.aiAnalysis?.trend === 'improving').length,
        stable: collegeStudents.filter(s => s.aiAnalysis?.trend === 'stable').length,
        declining: collegeStudents.filter(s => s.aiAnalysis?.trend === 'declining').length
      },
      averageSentiment: totalStudents > 0 ? collegeStudents.reduce((acc, s) => {
        return acc + (s.aiAnalysis?.sentiment || 5);
      }, 0) / totalStudents : 5
    };
    
    // Recent alerts for college students
    const recentAlerts = collegeStudents.reduce((acc, student) => {
      if (student.alerts && student.alerts.length > 0) {
        const unacknowledgedAlerts = student.alerts.filter(alert => !alert.acknowledged);
        return acc + unacknowledgedAlerts.length;
      }
      return acc;
    }, 0);
    
    res.json({
      totalStudents,
      pendingAppointments,
      highRiskStudents,
      completedToday,
      totalAppointments,
      completedAppointments,
      aiAnalysisSummary,
      recentAlerts,
      collegeName: req.user.collegeName || 'Unknown College'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Alert Management
router.get('/alerts', counselorAuth, async (req, res) => {
  try {
    if (!req.user.collegeId) {
      return res.status(400).json({ message: 'Counselor must be associated with a college' });
    }
    
    // Get students from the same college
    const collegeStudents = await User.find({ 
      role: 'student',
      college: req.user.collegeId
    }).select('_id');
    
    const studentIds = collegeStudents.map(student => student._id);
    
    const alerts = await Alert.find({ 
      student: { $in: studentIds },
      isResolved: false 
    })
      .populate('student', 'name studentId email college')
      .sort({ priority: -1, createdAt: -1 });
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/alerts/student/:studentId', counselorAuth, async (req, res) => {
  try {
    const summary = await alertService.generateAlertSummary(req.params.studentId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/alerts/:alertId/read', counselorAuth, async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.alertId, { isRead: true });
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/alerts/:alertId/resolve', counselorAuth, async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.alertId, { isResolved: true });
    res.json({ message: 'Alert resolved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resource Management
router.post('/resources', counselorAuth, async (req, res) => {
  try {
    const resource = new Resource({
      ...req.body,
      createdBy: req.user.userId
    });
    await resource.save();
    res.status(201).json(resource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/resources', counselorAuth, async (req, res) => {
  try {
    const resources = await Resource.find().populate('createdBy', 'name');
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/resources/:id', counselorAuth, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/resources/:id', counselorAuth, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
