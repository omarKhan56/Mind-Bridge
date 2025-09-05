const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const College = require('../models/College');
const Appointment = require('../models/Appointment');
const Resource = require('../models/Resource');
const SessionNote = require('../models/SessionNote');
const Alert = require('../models/Alert');
const CrisisAlert = require('../models/CrisisAlert');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const AISession = require('../models/AISession');
const { sendLoginCredentials } = require('../services/emailService');
const alertService = require('../services/alertService');
const router = express.Router();

// Middleware to verify token
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

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
    
    // Check if each appointment has session notes
    const appointmentsWithNotes = await Promise.all(
      appointments.map(async (appointment) => {
        const sessionNoteCount = await SessionNote.countDocuments({
          appointment: appointment._id
        });
        
        return {
          ...appointment.toObject(),
          hasSessionNote: sessionNoteCount > 0,
          sessionNoteCount
        };
      })
    );
    
    res.json(appointmentsWithNotes);
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
    
    // Get students with recent crisis alerts (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCrisisAlerts = await CrisisAlert.find({
      college: req.user.collegeId,
      createdAt: { $gte: twentyFourHoursAgo }
    }).populate('user');
    
    const crisisStudentIds = recentCrisisAlerts.map(alert => alert.user._id.toString());
    
    const highRiskStudents = collegeStudents.filter(student => 
      student.screeningData?.riskLevel === 'high' || 
      student.aiAnalysis?.riskLevel === 'high' || 
      student.aiAnalysis?.riskLevel === 'critical' ||
      crisisStudentIds.includes(student._id.toString())
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
    
    // Get total AI sessions for students in this college
    const totalSessions = await AISession.countDocuments({
      user: { $in: studentIds }
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
    
    // Get detailed high risk users data
    const highRiskUsersData = collegeStudents.filter(student => {
      const isHighRisk = student.screeningData?.riskLevel === 'high' || 
                        student.aiAnalysis?.riskLevel === 'high' || 
                        student.aiAnalysis?.riskLevel === 'critical';
      const hasCrisisAlert = crisisStudentIds.includes(student._id.toString());
      return isHighRisk || hasCrisisAlert;
    }).map(student => {
      // Calculate risk score
      let riskScore = 0;
      if (student.screeningData?.totalScore) riskScore += student.screeningData.totalScore;
      if (student.aiAnalysis?.riskScore) riskScore += student.aiAnalysis.riskScore;
      
      // Add crisis alert bonus
      if (crisisStudentIds.includes(student._id.toString())) {
        riskScore += 10;
      }
      
      // Get risk factors
      const riskFactors = [];
      if (crisisStudentIds.includes(student._id.toString())) riskFactors.push('crisis language');
      if (student.aiAnalysis?.concerns?.includes('academic')) riskFactors.push('academic pressure');
      if (student.aiAnalysis?.concerns?.includes('isolation')) riskFactors.push('isolation mentions');
      if (student.aiAnalysis?.riskLevel === 'high' || student.aiAnalysis?.riskLevel === 'critical') riskFactors.push('high');
      
      return {
        userId: student._id,
        name: student.name,
        riskScore: Math.min(riskScore, 20), // Cap at 20
        riskFactors: riskFactors
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
    
    res.json({
      totalStudents,
      pendingAppointments,
      highRiskStudents,
      completedToday,
      totalAppointments,
      completedAppointments,
      totalSessions,
      aiAnalysisSummary,
      recentAlerts,
      collegeName: req.user.collegeName || 'Unknown College',
      highRiskUsers: highRiskUsersData,
      riskDistribution: {
        critical: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'critical' || crisisStudentIds.includes(s._id.toString())).length,
        high: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'high').length,
        moderate: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'moderate').length,
        low: collegeStudents.filter(s => s.aiAnalysis?.riskLevel === 'low').length,
        minimal: collegeStudents.filter(s => !s.aiAnalysis?.riskLevel || s.aiAnalysis?.riskLevel === 'minimal').length
      }
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

// Get crisis alerts for counselor's college (last 24 hours)
router.get('/crisis-alerts', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId).populate('college');
    if (!counselor || counselor.role !== 'counselor' || !counselor.college) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const crisisAlerts = await CrisisAlert.find({
      college: counselor.college._id,
      createdAt: { $gte: twentyFourHoursAgo }
    })
    .populate('user', 'name email studentId department year')
    .populate('college', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(crisisAlerts);
  } catch (error) {
    console.error('Error fetching crisis alerts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Acknowledge crisis alert
router.patch('/crisis-alerts/:id/acknowledge', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const alert = await CrisisAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: 'acknowledged',
        acknowledgedBy: req.user.userId,
        acknowledgedAt: new Date()
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error acknowledging crisis alert:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve crisis alert
router.patch('/crisis-alerts/:id/resolve', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { notes } = req.body;
    const alert = await CrisisAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        notes: notes || ''
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error resolving crisis alert:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get individual student profile
router.get('/students/:id', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId).populate('college');
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const student = await User.findOne({
      _id: req.params.id,
      role: 'student',
      college: counselor.college._id
    }).populate('college');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get student's appointments
    const appointments = await Appointment.find({ student: student._id })
      .populate('counselor', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent crisis alerts
    const crisisAlerts = await CrisisAlert.find({ user: student._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      ...student.toObject(),
      appointments,
      crisisAlerts
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create appointment
router.post('/appointments', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { student, date, time, type, notes } = req.body;
    
    const appointment = new Appointment({
      student,
      counselor: req.user.userId,
      date: new Date(date + 'T' + time),
      type,
      notes,
      status: 'pending'
    });

    await appointment.save();
    res.json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to student (updated to use new messaging system)
router.post('/messages', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId).populate('college');
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { recipient, subject, message, priority } = req.body;
    
    // Create conversation if it doesn't exist
    let conversation = await Conversation.findOne({
      'participants.user': { $all: [req.user.userId, recipient] },
      status: 'active'
    });

    if (!conversation) {
      const student = await User.findById(recipient);
      conversation = new Conversation({
        participants: [
          { user: req.user.userId, role: 'counselor' },
          { user: recipient, role: 'student' }
        ],
        subject: subject || 'Counselor Message',
        college: counselor.college._id,
        priority: priority || 'normal'
      });
      await conversation.save();
    }

    // Create message
    const newMessage = new Message({
      conversation: conversation._id,
      sender: req.user.userId,
      recipient: recipient,
      content: message,
      priority: priority || 'normal'
    });
    
    await newMessage.save();
    
    // Update conversation
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: newMessage._id,
      lastActivity: new Date()
    });

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${recipient}`).emit('new_message', {
        ...newMessage.toObject(),
        sender: { name: counselor.name, role: 'counselor' }
      });
    }

    res.json({ success: true, message: 'Message sent successfully', messageId: newMessage._id });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status
router.patch('/appointments/:id', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, notes } = req.body;
    
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, counselor: req.user.userId },
      { status, notes, updatedAt: new Date() },
      { new: true }
    ).populate('student', 'name studentId email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resource Management
router.get('/resources', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId).populate('college');
    const resources = await Resource.find({
      $or: [
        { createdBy: req.user.userId },
        { college: counselor.college._id, isPublic: true }
      ]
    }).populate('createdBy', 'name').sort({ createdAt: -1 });
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/resources', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId).populate('college');
    const resource = new Resource({
      ...req.body,
      createdBy: req.user.userId,
      college: counselor.college._id
    });
    
    await resource.save();
    await resource.populate('createdBy', 'name');
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/resources/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.userId },
      req.body,
      { new: true }
    ).populate('createdBy', 'name');
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/resources/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.userId
    });
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    res.json({ message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/resources/:id/share', auth, async (req, res) => {
  try {
    const { studentIds } = req.body;
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const newShares = studentIds.map(studentId => ({
      student: studentId,
      sharedAt: new Date()
    }));
    
    resource.sharedWith.push(...newShares);
    resource.usage.shares += studentIds.length;
    await resource.save();
    
    res.json({ message: 'Resource shared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Session Notes Management
router.get('/session-notes', auth, async (req, res) => {
  try {
    const { studentId, page = 1, limit = 10 } = req.query;
    const query = { counselor: req.user.userId };
    if (studentId) query.student = studentId;
    
    const notes = await SessionNote.find(query)
      .populate('student', 'name studentId')
      .populate('appointment', 'date time type')
      .sort({ sessionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/session-notes', auth, async (req, res) => {
  try {
    const note = new SessionNote({
      ...req.body,
      counselor: req.user.userId
    });
    
    await note.save();
    await note.populate(['student', 'appointment']);
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/session-notes/:id', auth, async (req, res) => {
  try {
    const note = await SessionNote.findOneAndUpdate(
      { _id: req.params.id, counselor: req.user.userId },
      req.body,
      { new: true }
    ).populate(['student', 'appointment']);
    
    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session notes for a specific appointment
router.get('/appointments/:appointmentId/session-notes', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const notes = await SessionNote.find({
      appointment: appointmentId,
      counselor: req.user.userId
    })
      .populate('student', 'name studentId')
      .populate('appointment', 'date time type')
      .sort({ createdAt: -1 });
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Calendar and Availability
router.get('/calendar', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    const appointments = await Appointment.find({
      counselor: req.user.userId,
      date: {
        $gte: new Date(start),
        $lte: new Date(end)
      }
    }).populate('student', 'name studentId');
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/availability', auth, async (req, res) => {
  try {
    const counselor = await User.findById(req.user.userId);
    counselor.availability = req.body.availability;
    await counselor.save();
    
    res.json({ message: 'Availability updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reports and Analytics
router.get('/reports/student-progress/:studentId', auth, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { startDate, endDate } = req.query;
    
    // Verify counselor access
    const counselor = await User.findById(req.user.userId).populate('college');
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const student = await User.findById(studentId).populate('college');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Verify student is in counselor's college
    if (student.college._id.toString() !== counselor.college._id.toString()) {
      return res.status(403).json({ message: 'Access denied - student not in your college' });
    }
    
    const appointments = await Appointment.find({
      student: studentId,
      appointmentDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    
    const sessionNotes = await SessionNote.find({
      student: studentId,
      counselor: req.user.userId,
      sessionDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    
    const report = {
      student: student.name,
      studentId: student.studentId,
      department: student.department,
      period: { startDate, endDate },
      totalSessions: appointments.length,
      completedSessions: appointments.filter(a => a.status === 'completed').length,
      progressNotes: sessionNotes,
      riskAssessments: sessionNotes.map(n => n.riskAssessment).filter(Boolean),
      goals: sessionNotes.flatMap(n => n.goals || []),
      interventions: sessionNotes.flatMap(n => n.interventions || []).filter(Boolean)
    };
    
    res.json(report);
  } catch (error) {
    console.error('Student progress report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/reports/caseload-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get counselor info
    const counselor = await User.findById(req.user.userId).populate('college');
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get students from the same college
    const collegeStudents = await User.find({ 
      role: 'student',
      college: counselor.college._id
    }).select('_id');
    
    const studentIds = collegeStudents.map(student => student._id);
    
    // Get appointments in date range for college students
    const appointments = await Appointment.find({
      student: { $in: studentIds },
      appointmentDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('student', 'name department');
    
    const uniqueStudents = [...new Set(appointments.map(a => a.student._id.toString()))];
    const totalSessions = appointments.length;
    const completedSessions = appointments.filter(a => a.status === 'completed').length;
    
    // Get session notes for risk assessment
    const sessionNotes = await SessionNote.find({
      counselor: req.user.userId,
      sessionDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    
    // Calculate risk distribution
    const riskDistribution = sessionNotes.reduce((acc, note) => {
      const riskLevel = note.riskAssessment?.riskLevel || 'unknown';
      acc[riskLevel] = (acc[riskLevel] || 0) + 1;
      return acc;
    }, {});
    
    const riskLevels = Object.entries(riskDistribution).map(([level, count]) => ({
      _id: level,
      count
    }));
    
    res.json({
      period: { startDate, endDate },
      totalStudents: uniqueStudents.length,
      totalSessions,
      completedSessions,
      completionRate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(1) : '0',
      riskDistribution: riskLevels
    });
  } catch (error) {
    console.error('Caseload report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const CounselorNotification = require('../models/CounselorNotification');

// Get counselor notifications
router.get('/notifications', counselorAuth, async (req, res) => {
  try {
    const notifications = await CounselorNotification.find({ 
      counselor: req.user.id 
    })
    .populate('student', 'name studentId department')
    .populate('college', 'name')
    .populate('originalCrisisAlert', 'riskLevel urgency')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Failed to get counselor notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', counselorAuth, async (req, res) => {
  try {
    const notification = await CounselorNotification.findOneAndUpdate(
      { _id: req.params.id, counselor: req.user.id },
      { status: 'read', readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
