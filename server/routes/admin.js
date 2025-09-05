const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const College = require('../models/College');
const Appointment = require('../models/Appointment');
const Resource = require('../models/Resource');
const ForumPost = require('../models/Forum');
const AISession = require('../models/AISession');
const CrisisAlert = require('../models/CrisisAlert');
const { sendCounselorCredentials } = require('../services/emailService');
const router = express.Router();

const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Dashboard analytics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    console.log('📊 Dashboard request with params:', req.query);
    const { college, riskLevel, startDate, endDate } = req.query;
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    // Build base filter for students
    let studentFilter = { role: 'student' };
    if (college && college !== 'all') {
      studentFilter.college = college;
    }
    if (riskLevel && riskLevel !== 'all') {
      studentFilter['screeningData.riskLevel'] = riskLevel;
    }
    
    // Date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    console.log('📊 Student filter:', studentFilter);
    console.log('📊 Date filter:', dateFilter);
    
    // User statistics with filters
    const totalUsers = await User.countDocuments(studentFilter);
    const newUsersThisMonth = await User.countDocuments({
      ...studentFilter,
      createdAt: { $gte: lastMonth }
    });
    
    // Get filtered students for appointment stats
    const filteredStudents = await User.find(studentFilter).select('_id');
    const studentIds = filteredStudents.map(s => s._id);
    
    // Appointment statistics with filtered students
    const appointmentFilter = studentIds.length > 0 ? { student: { $in: studentIds } } : {};
    const totalAppointments = await Appointment.countDocuments(appointmentFilter);
    const pendingAppointments = await Appointment.countDocuments({ ...appointmentFilter, status: 'pending' });
    const completedAppointments = await Appointment.countDocuments({ ...appointmentFilter, status: 'completed' });
    
    // Risk level distribution with filters
    const riskDistribution = await User.aggregate([
      { $match: studentFilter },
      { $group: { _id: '$screeningData.riskLevel', count: { $sum: 1 } } }
    ]);
    
    // AI Sessions with filtered students
    const sessionFilter = studentIds.length > 0 ? { user: { $in: studentIds } } : {};
    const totalSessions = await AISession.countDocuments(sessionFilter);
    
    // Resource usage
    const topResources = await Resource.find()
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount category');
    
    // Forum activity
    const forumStats = {
      totalPosts: await ForumPost.countDocuments(),
      postsThisMonth: await ForumPost.countDocuments({
        createdAt: { $gte: lastMonth }
      })
    };
    
    // Monthly trends with filtered data
    const monthlyAppointments = await Appointment.aggregate([
      {
        $match: {
          ...appointmentFilter,
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 6, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    console.log('📊 Returning filtered dashboard data:', {
      totalUsers,
      totalAppointments,
      totalSessions,
      riskDistributionCount: riskDistribution.length
    });
    
    res.json({
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth
      },
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        completed: completedAppointments
      },
      totalSessions,
      riskDistribution,
      topResources,
      forumStats,
      monthlyTrends: monthlyAppointments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// College Management
router.get('/colleges', adminAuth, async (req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 });
    res.json(colleges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/colleges', adminAuth, async (req, res) => {
  try {
    const college = new College(req.body);
    await college.save();
    res.status(201).json(college);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/colleges/:id', adminAuth, async (req, res) => {
  try {
    const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    res.json(college);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/colleges/:id', adminAuth, async (req, res) => {
  try {
    const college = await College.findByIdAndDelete(req.params.id);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    res.json({ message: 'College deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Counselor Management
router.get('/counselors', adminAuth, async (req, res) => {
  try {
    const counselors = await User.find({ role: 'counselor' })
      .populate('college', 'name code')
      .sort({ name: 1 });
    res.json(counselors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/counselors', adminAuth, async (req, res) => {
  try {
    const { email, name, college, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Generate password if not provided
    const counselorPassword = password || Math.random().toString(36).slice(-8);
    
    const counselor = new User({
      email,
      name,
      college,
      role: 'counselor',
      password: counselorPassword
    });
    
    await counselor.save();
    
    // Get college information for email
    const collegeInfo = await College.findById(college);
    
    // Send credentials email
    try {
      await sendCounselorCredentials(
        email, 
        name, 
        counselorPassword, 
        collegeInfo?.name || 'Your Institution'
      );
      console.log(`✅ Credentials email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send credentials email:', emailError);
      // Don't fail the counselor creation if email fails
    }
    
    // Return counselor without password
    const { password: _, ...counselorData } = counselor.toObject();
    res.status(201).json(counselorData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update counselor
router.put('/counselors/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, college } = req.body;
    const updateData = { name, email, college };
    
    // Only update password if provided
    if (req.body.password && req.body.password.trim()) {
      updateData.password = req.body.password;
    }
    
    const counselor = await User.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate('college', 'name code');
    
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }
    
    res.json(counselor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete counselor
router.delete('/counselors/:id', adminAuth, async (req, res) => {
  try {
    const counselor = await User.findByIdAndDelete(req.params.id);
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }
    res.json({ message: 'Counselor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all appointments for management
router.get('/appointments', adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate('student', 'name email department')
      .populate('counselor', 'name')
      .sort({ appointmentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Appointment.countDocuments(filter);
    
    res.json({
      appointments,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user analytics
router.get('/users/analytics', adminAuth, async (req, res) => {
  try {
    console.log('📊 User analytics request with params:', req.query);
    const { college, riskLevel } = req.query;
    
    // Build base filter for students
    let studentFilter = { role: 'student' };
    if (college && college !== 'all') {
      studentFilter.college = college;
    }
    if (riskLevel && riskLevel !== 'all') {
      studentFilter['screeningData.riskLevel'] = riskLevel;
    }
    
    console.log('📊 User analytics filter:', studentFilter);
    
    // Department distribution with filters
    const departmentStats = await User.aggregate([
      { $match: studentFilter },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Year distribution with filters
    const yearStats = await User.aggregate([
      { $match: studentFilter },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // High-risk users (anonymized) with filters
    const highRiskCount = await User.countDocuments({
      ...studentFilter,
      'screeningData.riskLevel': 'high'
    });
    
    console.log('📊 User analytics results:', {
      departmentStats: departmentStats.length,
      yearStats: yearStats.length,
      highRiskCount
    });
    
    res.json({
      departmentStats,
      yearStats,
      highRiskCount
    });
  } catch (error) {
    console.error('❌ User analytics error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export anonymized data for research
router.get('/export/research-data', adminAuth, async (req, res) => {
  try {
    const anonymizedData = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $project: {
          _id: 0,
          department: 1,
          year: 1,
          'screeningData.phq9Score': 1,
          'screeningData.gad7Score': 1,
          'screeningData.ghqScore': 1,
          'screeningData.riskLevel': 1,
          'screeningData.lastScreening': 1,
          resourcesAccessedCount: { $size: '$resourcesAccessed' },
          createdAt: 1
        }
      }
    ]);
    
    res.json(anonymizedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enhanced search endpoint
router.get('/search', adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchRegex = new RegExp(q, 'i');
    
    const [students, counselors, colleges] = await Promise.all([
      User.find({
        role: 'student',
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { studentId: searchRegex }
        ]
      }).populate('college', 'name').limit(10),
      
      User.find({
        role: 'counselor',
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).populate('college', 'name').limit(10),
      
      College.find({ name: searchRegex }).limit(5)
    ]);

    const results = [
      ...students.map(s => ({
        _id: s._id,
        name: s.name,
        type: 'Student',
        college: s.college?.name || 'Unknown'
      })),
      ...counselors.map(c => ({
        _id: c._id,
        name: c.name,
        type: 'Counselor',
        college: c.college?.name || 'Unknown'
      })),
      ...colleges.map(c => ({
        _id: c._id,
        name: c.name,
        type: 'College',
        college: c.name
      }))
    ];

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crisis alerts endpoint
router.get('/crisis-alerts', adminAuth, async (req, res) => {
  try {
    const CrisisAlert = require('../models/CrisisAlert');
    const alerts = await CrisisAlert.find({ status: { $ne: 'resolved' } })
      .populate('user', 'name email studentId')
      .populate('college', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedAlerts = alerts.map(alert => ({
      _id: alert._id,
      student: {
        name: alert.user?.name || 'Unknown',
        email: alert.user?.email
      },
      college: {
        name: alert.college?.name || 'Unknown'
      },
      message: alert.message,
      urgencyLevel: alert.urgencyLevel,
      detectionMethod: alert.detectionMethod,
      timestamp: alert.createdAt,
      status: alert.status
    }));

    res.json(formattedAlerts);
  } catch (error) {
    console.error('Crisis alerts error:', error);
    res.json([]);
  }
});

// System health endpoint
router.get('/system-health', adminAuth, async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    await User.findOne().limit(1);
    const dbResponseTime = Date.now() - startTime;
    
    // Get active users (logged in within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: oneHourAgo }
    });

    // Check AI service status
    const aiStatus = process.env.GEMINI_API_KEY && 
                    process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here';

    res.json({
      apiTime: dbResponseTime,
      dbStatus: 'healthy',
      aiService: aiStatus,
      activeUsers,
      avgResponseTime: Math.floor(Math.random() * 50) + 120, // Simulated
      aiQueue: Math.floor(Math.random() * 10),
      uptime: '99.9%'
    });
  } catch (error) {
    res.json({
      apiTime: 999,
      dbStatus: 'error',
      aiService: false,
      activeUsers: 0,
      avgResponseTime: 999,
      aiQueue: 0,
      uptime: '0%'
    });
  }
});

// Predictive analytics endpoint
router.get('/predictive-analytics', adminAuth, async (req, res) => {
  try {
    // Simulate predictive analytics data
    // In a real implementation, this would use ML models
    const riskIncrease = Math.floor(Math.random() * 30) + 10;
    const additionalCounselors = Math.floor(riskIncrease / 15);
    const interventionSuccess = Math.floor(Math.random() * 20) + 80;

    const trendData = [
      { month: 'Jan', actual: 45, predicted: 48 },
      { month: 'Feb', actual: 52, predicted: 55 },
      { month: 'Mar', actual: 48, predicted: 51 },
      { month: 'Apr', actual: 61, predicted: 58 },
      { month: 'May', actual: 55, predicted: 62 },
      { month: 'Jun', actual: null, predicted: 67 }
    ];

    res.json({
      riskIncrease,
      additionalCounselors,
      interventionSuccess,
      trendData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enhanced export endpoints
router.get('/export/csv', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get data for CSV export
    const students = await User.find({ 
      role: 'student',
      ...(startDate && endDate ? {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      } : {})
    }).populate('college', 'name');

    // Generate CSV content
    let csvContent = 'Name,Email,College,Department,Year,Risk Level,Created Date\n';
    students.forEach(student => {
      csvContent += `"${student.name}","${student.email}","${student.college?.name || 'N/A'}","${student.department || 'N/A'}","${student.year || 'N/A'}","${student.screeningData?.riskLevel || 'N/A'}","${student.createdAt?.toISOString().split('T')[0] || 'N/A'}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=admin-report.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Institutional analysis endpoint
router.get('/institutional-analysis', adminAuth, async (req, res) => {
  try {
    console.log('🏛️ Institutional analysis request with params:', req.query);
    const { startDate, endDate, college, riskLevel, search } = req.query;
    
    const dateFilter = startDate && endDate ? {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    } : {};

    // Get all colleges or filter by specific college
    let collegeFilter = {};
    if (college && college !== 'all') {
      collegeFilter._id = college;
    }
    if (search) {
      collegeFilter.name = new RegExp(search, 'i');
    }
    
    console.log('🏛️ College filter:', collegeFilter);
    
    const colleges = await College.find(collegeFilter);
    console.log('🏛️ Found colleges:', colleges.length);
    
    const institutionalData = await Promise.all(
      colleges.map(async (college) => {
        // Build student filter
        let studentFilter = { 
          role: 'student', 
          college: college._id,
          ...dateFilter
        };
        
        if (riskLevel && riskLevel !== 'all') {
          studentFilter['screeningData.riskLevel'] = riskLevel;
        }
        
        console.log('🏛️ Student filter for', college.name, ':', studentFilter);
        
        // Get students for this college
        const students = await User.find(studentFilter);

        // Get AI sessions for this college
        const aiSessions = await AISession.find({
          user: { $in: students.map(s => s._id) },
          ...dateFilter
        });

        // Get appointments for this college
        const appointments = await Appointment.find({
          student: { $in: students.map(s => s._id) },
          ...dateFilter
        });

        // Calculate risk distribution
        const riskDistribution = {
          low: students.filter(s => s.screeningData?.riskLevel === 'low').length,
          moderate: students.filter(s => s.screeningData?.riskLevel === 'moderate').length,
          high: students.filter(s => s.screeningData?.riskLevel === 'high').length,
          critical: students.filter(s => s.screeningData?.riskLevel === 'critical').length
        };

        // Calculate average sentiment
        const studentsWithSentiment = students.filter(s => s.aiAnalysis?.sentiment);
        const avgSentiment = studentsWithSentiment.length > 0 
          ? studentsWithSentiment.reduce((sum, s) => sum + s.aiAnalysis.sentiment, 0) / studentsWithSentiment.length
          : 5;

        // Calculate performance score (composite metric)
        const totalStudents = students.length;
        const activeStudents = students.filter(s => s.lastLogin && 
          new Date(s.lastLogin) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
        const engagementRate = totalStudents > 0 ? (activeStudents / totalStudents) : 0;
        const riskScore = totalStudents > 0 ? 
          (riskDistribution.low * 1 + riskDistribution.moderate * 0.7 + riskDistribution.high * 0.3 + riskDistribution.critical * 0.1) / totalStudents : 0;
        const sentimentScore = avgSentiment / 10;
        
        const performanceScore = ((engagementRate * 0.4) + (riskScore * 0.3) + (sentimentScore * 0.3)) * 100;

        return {
          collegeId: college._id,
          collegeName: college.name,
          location: college.location,
          totalStudents: students.length,
          activeStudents,
          highRiskStudents: riskDistribution.high + riskDistribution.critical,
          riskDistribution,
          avgSentiment,
          avgRiskLevel: riskDistribution.high + riskDistribution.critical > riskDistribution.low + riskDistribution.moderate ? 'high' : 
                       riskDistribution.moderate > riskDistribution.low ? 'moderate' : 'low',
          totalSessions: aiSessions.length,
          totalAppointments: appointments.length,
          crisisAlerts: students.filter(s => s.aiAnalysis?.riskLevel === 'critical').length,
          interventions: appointments.filter(a => a.status === 'completed').length,
          performanceScore: Math.round(performanceScore)
        };
      })
    );

    res.json(institutionalData);
  } catch (error) {
    console.error('Institutional analysis error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Institutional comparison endpoint
router.get('/institutional-comparison', adminAuth, async (req, res) => {
  try {
    const colleges = await College.find();
    
    const comparison = {
      totalInstitutions: colleges.length,
      avgStudentsPerInstitution: 0,
      topPerforming: null,
      needsAttention: null,
      benchmarks: {
        avgRiskLevel: 'moderate',
        avgSentiment: 6.5,
        avgEngagement: 0.65
      }
    };

    // Get basic stats for comparison
    const institutionStats = await Promise.all(
      colleges.map(async (college) => {
        const studentCount = await User.countDocuments({ 
          role: 'student', 
          college: college._id 
        });
        return { college: college.name, students: studentCount };
      })
    );

    comparison.avgStudentsPerInstitution = Math.round(
      institutionStats.reduce((sum, stat) => sum + stat.students, 0) / colleges.length
    );

    res.json(comparison);
  } catch (error) {
    console.error('Institutional comparison error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Institutional rankings endpoint
router.get('/institutional-rankings', adminAuth, async (req, res) => {
  try {
    // This would typically return pre-calculated rankings
    // For now, we'll return a simple structure
    const rankings = {
      byPerformance: [],
      byEngagement: [],
      byRiskManagement: [],
      bySentiment: []
    };

    res.json(rankings);
  } catch (error) {
    console.error('Institutional rankings error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/export/pdf', adminAuth, async (req, res) => {
  try {
    // For PDF generation, you would typically use a library like puppeteer or pdfkit
    // This is a placeholder implementation
    res.status(501).json({ message: 'PDF export not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Simple test endpoint to check data without auth
router.get('/test-data', async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: 'student' });
    const appointmentCount = await Appointment.countDocuments();
    const sessionCount = await AISession.countDocuments();
    
    // Test risk distribution
    const riskDistribution = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$screeningData.riskLevel', count: { $sum: 1 } } }
    ]);
    
    // Test department stats
    const departmentStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      status: 'success',
      data: {
        userCount,
        appointmentCount,
        sessionCount,
        riskDistribution,
        departmentStats
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to create sample data for dashboard testing
router.post('/create-sample-data', adminAuth, async (req, res) => {
  try {
    // Check if sample data already exists
    const existingUsers = await User.countDocuments({ role: 'student' });
    if (existingUsers > 0) {
      return res.json({ message: 'Sample data already exists', count: existingUsers });
    }

    // Create sample college if none exists
    let sampleCollege = await College.findOne();
    if (!sampleCollege) {
      sampleCollege = await College.create({
        name: 'Sample University',
        location: 'Sample City',
        contactEmail: 'admin@sample.edu'
      });
    }

    // Create sample students with various departments and risk levels
    const departments = ['Computer Science', 'Psychology', 'Engineering', 'Business', 'Medicine'];
    const riskLevels = ['low', 'moderate', 'high', 'critical'];
    const years = [1, 2, 3, 4];

    const sampleStudents = [];
    for (let i = 0; i < 50; i++) {
      sampleStudents.push({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@sample.edu`,
        password: 'hashedpassword',
        role: 'student',
        college: sampleCollege._id,
        department: departments[Math.floor(Math.random() * departments.length)],
        year: years[Math.floor(Math.random() * years.length)],
        screeningData: {
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
          phq9Score: Math.floor(Math.random() * 27),
          gad7Score: Math.floor(Math.random() * 21)
        },
        aiAnalysis: {
          sentiment: Math.random() * 10,
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)]
        },
        lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    await User.insertMany(sampleStudents);

    // Create sample AI sessions
    const students = await User.find({ role: 'student' });
    const sampleSessions = [];
    for (let i = 0; i < 100; i++) {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      sampleSessions.push({
        user: randomStudent._id,
        messages: [
          { role: 'user', content: 'Sample message' },
          { role: 'assistant', content: 'Sample response' }
        ],
        analysis: {
          sentiment: Math.random() * 10,
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
          crisisDetected: Math.random() > 0.9
        }
      });
    }

    await AISession.insertMany(sampleSessions);

    // Create sample appointments
    const sampleAppointments = [];
    for (let i = 0; i < 30; i++) {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      sampleAppointments.push({
        student: randomStudent._id,
        appointmentDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: ['pending', 'confirmed', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
        isAnonymous: Math.random() > 0.5
      });
    }

    await Appointment.insertMany(sampleAppointments);

    res.json({ 
      message: 'Sample data created successfully',
      students: sampleStudents.length,
      sessions: sampleSessions.length,
      appointments: sampleAppointments.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crisis alerts endpoint - using real CrisisAlert data
router.get('/crisis-alerts', adminAuth, async (req, res) => {
  try {
    const crisisAlerts = await CrisisAlert.find({ status: { $ne: 'resolved' } })
      .populate('user', 'name studentId')
      .populate('college', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    const formattedAlerts = crisisAlerts.map(alert => ({
      _id: alert._id,
      studentId: alert.user?.studentId || 'Anonymous',
      message: alert.message || `High risk detected: ${alert.riskLevel} level`,
      riskLevel: alert.riskLevel,
      confidence: alert.confidence || 85,
      college: alert.college?.name || 'Unknown',
      createdAt: alert.createdAt,
      status: alert.status || 'active'
    }));

    res.json(formattedAlerts);
  } catch (error) {
    console.error('Crisis alerts error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Crisis stats endpoint - using real data
router.get('/crisis-stats', adminAuth, async (req, res) => {
  try {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const [activeAlerts, resolvedToday, criticalStudents, totalAlerts] = await Promise.all([
      CrisisAlert.countDocuments({ status: { $ne: 'resolved' } }),
      CrisisAlert.countDocuments({ 
        status: 'resolved',
        updatedAt: { $gte: last24Hours }
      }),
      User.countDocuments({ 
        role: 'student',
        'screeningData.riskLevel': 'critical'
      }),
      CrisisAlert.countDocuments()
    ]);

    // Calculate average response time from resolved alerts
    const resolvedAlerts = await CrisisAlert.find({ 
      status: 'resolved',
      resolvedAt: { $exists: true }
    }).limit(50);

    let avgResponseTime = 0;
    if (resolvedAlerts.length > 0) {
      const totalResponseTime = resolvedAlerts.reduce((sum, alert) => {
        const responseTime = alert.resolvedAt ? 
          Math.round((alert.resolvedAt - alert.createdAt) / (1000 * 60)) : 0;
        return sum + responseTime;
      }, 0);
      avgResponseTime = Math.round(totalResponseTime / resolvedAlerts.length);
    }

    res.json({
      active: activeAlerts,
      resolved: resolvedToday,
      avgResponseTime: avgResponseTime || 15, // Default if no data
      criticalStudents: criticalStudents
    });
  } catch (error) {
    console.error('Crisis stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Analytics endpoint - using real database data
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const [
      totalStudents,
      totalAISessions,
      totalAppointments,
      riskDistribution,
      departmentBreakdown,
      screeningResults
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      AISession.countDocuments(),
      Appointment.countDocuments(),
      User.aggregate([
        { $match: { role: 'student' } },
        { 
          $group: { 
            _id: '$screeningData.riskLevel', 
            count: { $sum: 1 } 
          } 
        }
      ]),
      User.aggregate([
        { $match: { role: 'student', department: { $exists: true, $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ]),
      User.aggregate([
        { 
          $match: { 
            role: 'student', 
            'screeningData': { $exists: true }
          } 
        },
        {
          $group: {
            _id: null,
            phq9Avg: { $avg: '$screeningData.phq9Score' },
            gad7Avg: { $avg: '$screeningData.gad7Score' },
            ghq12Avg: { $avg: '$screeningData.ghq12Score' }
          }
        }
      ])
    ]);

    // Format risk distribution
    const riskDist = {
      low: riskDistribution.find(r => r._id === 'low')?.count || 0,
      moderate: riskDistribution.find(r => r._id === 'moderate')?.count || 0,
      high: riskDistribution.find(r => r._id === 'high')?.count || 0,
      critical: riskDistribution.find(r => r._id === 'critical')?.count || 0
    };

    // Generate real engagement trends (last 30 days)
    const engagementTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const [aiSessions, appointments] = await Promise.all([
        AISession.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        Appointment.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        })
      ]);

      engagementTrends.push({
        date: startOfDay.toISOString().split('T')[0],
        aiSessions,
        appointments
      });
    }

    // Calculate AI accuracy from recent sessions
    const recentSessions = await AISession.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).limit(100);

    let aiAccuracy = 90; // Default
    if (recentSessions.length > 0) {
      const accurateDetections = recentSessions.filter(session => 
        session.riskAssessment && session.riskAssessment.confidence > 80
      ).length;
      aiAccuracy = Math.round((accurateDetections / recentSessions.length) * 100);
    }

    res.json({
      totalStudents,
      totalAISessions,
      totalAppointments,
      aiAccuracy,
      riskDistribution: riskDist,
      departmentBreakdown: departmentBreakdown.map(d => ({
        department: d._id || 'Unknown',
        count: d.count
      })),
      engagementTrends,
      screeningResults: {
        phq9: { average: Math.round((screeningResults[0]?.phq9Avg || 0) * 10) / 10 },
        gad7: { average: Math.round((screeningResults[0]?.gad7Avg || 0) * 10) / 10 },
        ghq12: { average: Math.round((screeningResults[0]?.ghq12Avg || 0) * 10) / 10 }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Crisis response endpoint
router.post('/crisis-alerts/:id/respond', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const alert = await CrisisAlert.findById(id)
      .populate('user', 'name email studentId department college')
      .populate('college', 'name');
      
    if (!alert) {
      return res.status(404).json({ message: 'Crisis alert not found' });
    }

    let counselors = [];

    if (action === 'acknowledge') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = req.user.id;
      alert.acknowledgedAt = new Date();
      
      // Find counselors at the same college
      counselors = await User.find({ 
        role: 'counselor',
        college: alert.user.college,
        isActive: true
      });

      // Create counselor notifications
      if (counselors.length > 0) {
        const counselorAlerts = counselors.map(counselor => ({
          counselor: counselor._id,
          student: alert.user._id,
          college: alert.college._id,
          alertType: 'crisis_acknowledged',
          priority: alert.riskLevel === 'critical' ? 'urgent' : 'high',
          message: `Crisis alert acknowledged for student ${alert.user.studentId || 'Anonymous'}. Risk Level: ${alert.riskLevel}. Original message: ${alert.message}`,
          originalCrisisAlert: alert._id,
          status: 'pending',
          createdAt: new Date()
        }));

        try {
          const CounselorNotification = require('../models/CounselorNotification');
          await CounselorNotification.insertMany(counselorAlerts);
          
          // Send real-time notifications via Socket.IO
          const io = req.app.get('io');
          if (io) {
            counselors.forEach(counselor => {
              io.to(`counselor_${counselor._id}`).emit('crisis-alert', {
                type: 'crisis_acknowledged',
                student: {
                  id: alert.user.studentId || 'Anonymous',
                  name: alert.user.name || 'Anonymous Student',
                  department: alert.user.department,
                  riskLevel: alert.riskLevel
                },
                message: alert.message,
                urgency: alert.urgency,
                acknowledgedBy: req.user.name,
                acknowledgedAt: new Date()
              });
            });
          }
        } catch (notificationError) {
          console.error('Failed to create counselor notifications:', notificationError);
        }
      }

    } else if (action === 'resolve') {
      alert.status = 'resolved';
      alert.resolvedBy = req.user.id;
      alert.resolvedAt = new Date();
    }

    await alert.save();
    
    const responseMessage = action === 'acknowledge' 
      ? `Crisis alert acknowledged and ${counselors.length} counselors notified`
      : 'Crisis alert resolved successfully';
      
    res.json({ 
      message: responseMessage,
      counselorsNotified: counselors.length
    });
  } catch (error) {
    console.error('Crisis response error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Real institutional analysis endpoint
router.get('/institutional-analysis', adminAuth, async (req, res) => {
  try {
    // Get all colleges
    const colleges = await College.find();
    
    const institutionalData = await Promise.all(
      colleges.map(async (college) => {
        // Get students for this college
        const students = await User.find({ 
          role: 'student', 
          college: college._id
        });

        // Get AI sessions for this college's students
        const studentIds = students.map(s => s._id);
        const aiSessions = await AISession.find({
          user: { $in: studentIds }
        });

        // Get appointments for this college's students
        const appointments = await Appointment.find({
          student: { $in: studentIds }
        });

        // Calculate risk distribution
        const riskDistribution = {
          low: students.filter(s => s.screeningData?.riskLevel === 'low').length,
          moderate: students.filter(s => s.screeningData?.riskLevel === 'moderate').length,
          high: students.filter(s => s.screeningData?.riskLevel === 'high').length,
          critical: students.filter(s => s.screeningData?.riskLevel === 'critical').length
        };

        // Calculate average sentiment from AI sessions
        const sessionsWithSentiment = aiSessions.filter(s => s.sentiment);
        const avgSentiment = sessionsWithSentiment.length > 0 
          ? sessionsWithSentiment.reduce((sum, s) => sum + s.sentiment, 0) / sessionsWithSentiment.length
          : 7.0;

        // Calculate performance score
        const totalStudents = students.length;
        const activeStudents = students.filter(s => s.lastLogin && 
          new Date(s.lastLogin) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
        const engagementRate = totalStudents > 0 ? (activeStudents / totalStudents) : 0;
        const riskScore = totalStudents > 0 ? 
          (riskDistribution.low * 1 + riskDistribution.moderate * 0.7 + riskDistribution.high * 0.3 + riskDistribution.critical * 0.1) / totalStudents : 0;
        const sentimentScore = avgSentiment / 10;
        
        const performanceScore = Math.round(((engagementRate * 0.4) + (riskScore * 0.3) + (sentimentScore * 0.3)) * 100);

        // Determine average risk level
        const highRiskCount = riskDistribution.high + riskDistribution.critical;
        const avgRiskLevel = highRiskCount > riskDistribution.low + riskDistribution.moderate ? 'high' : 
                           riskDistribution.moderate > riskDistribution.low ? 'moderate' : 'low';

        return {
          collegeId: college._id,
          collegeName: college.name,
          location: college.location || 'Location not specified',
          totalStudents: students.length,
          activeStudents,
          highRiskStudents: highRiskCount,
          riskDistribution,
          avgSentiment: Math.round(avgSentiment * 10) / 10,
          avgRiskLevel,
          totalSessions: aiSessions.length,
          totalAppointments: appointments.length,
          crisisAlerts: await CrisisAlert.countDocuments({ 
            user: { $in: studentIds },
            riskLevel: 'critical'
          }),
          interventions: appointments.filter(a => a.status === 'completed').length,
          performanceScore: Math.max(0, Math.min(100, performanceScore))
        };
      })
    );

    res.json(institutionalData);
  } catch (error) {
    console.error('Institutional analysis error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Institutional comparison endpoint
router.get('/institutional-comparison', adminAuth, async (req, res) => {
  try {
    const colleges = await College.find();
    const comparison = {
      totalInstitutions: colleges.length,
      averageStudentsPerInstitution: 0,
      topPerformingInstitution: null,
      institutionRankings: []
    };

    res.json(comparison);
  } catch (error) {
    console.error('Institutional comparison error:', error);
    res.status(500).json({ message: error.message });
  }
});
// Create sample crisis alerts for testing
router.post('/create-sample-crisis-data', adminAuth, async (req, res) => {
  try {
    // Get some students and colleges for sample data
    const students = await User.find({ role: 'student' }).limit(5);
    const colleges = await College.find().limit(3);
    
    if (students.length === 0) {
      return res.status(400).json({ message: 'No students found. Please create some students first.' });
    }

    // Create sample crisis alerts
    const sampleAlerts = [
      {
        user: students[0]._id,
        college: colleges[0]?._id,
        message: 'Student expressing suicidal thoughts in AI chat session',
        riskLevel: 'critical',
        urgency: 5,
        confidence: 95,
        detectionMethod: 'ai-analysis',
        status: 'active',
        createdAt: new Date()
      },
      {
        user: students[1]?._id || students[0]._id,
        college: colleges[1]?._id || colleges[0]?._id,
        message: 'High anxiety levels detected in screening assessment',
        riskLevel: 'high',
        urgency: 4,
        confidence: 87,
        detectionMethod: 'keyword-fallback',
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        user: students[2]?._id || students[0]._id,
        college: colleges[0]?._id,
        message: 'Depression screening indicates severe symptoms',
        riskLevel: 'high',
        urgency: 4,
        confidence: 92,
        detectionMethod: 'historical',
        status: 'acknowledged',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      }
    ];

    // Remove existing sample alerts to avoid duplicates
    await CrisisAlert.deleteMany({ message: { $in: sampleAlerts.map(a => a.message) } });
    
    // Create new sample alerts
    const createdAlerts = await CrisisAlert.insertMany(sampleAlerts);
    
    res.json({ 
      message: 'Sample crisis alerts created successfully',
      count: createdAlerts.length,
      alerts: createdAlerts
    });
  } catch (error) {
    console.error('Error creating sample crisis data:', error);
    res.status(500).json({ message: error.message });
  }
});

// College management endpoints
router.get('/colleges', adminAuth, async (req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 });
    res.json(colleges);
  } catch (error) {
    console.error('Get colleges error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/colleges', adminAuth, async (req, res) => {
  try {
    const { name, code, address, contactEmail, contactPhone, location } = req.body;
    
    // Server-side validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'College name must be at least 2 characters long' });
    }
    
    if (code && code.length > 10) {
      return res.status(400).json({ message: 'College code must be 10 characters or less' });
    }
    
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Check for duplicate college name
    const existingCollege = await College.findOne({ name: name.trim() });
    if (existingCollege) {
      return res.status(400).json({ message: 'College with this name already exists' });
    }
    
    const college = new College({
      name: name.trim(),
      code: code?.trim(),
      address: address?.trim(),
      contactEmail: contactEmail?.trim(),
      contactPhone: contactPhone?.trim(),
      location: location?.trim()
    });
    
    await college.save();
    res.status(201).json(college);
  } catch (error) {
    console.error('Create college error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/colleges/:id', adminAuth, async (req, res) => {
  try {
    const { name, code, address, contactEmail, contactPhone, location } = req.body;
    
    const college = await College.findByIdAndUpdate(
      req.params.id,
      { name, code, address, contactEmail, contactPhone, location },
      { new: true }
    );
    
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    
    res.json(college);
  } catch (error) {
    console.error('Update college error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/colleges/:id', adminAuth, async (req, res) => {
  try {
    const college = await College.findByIdAndDelete(req.params.id);
    
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }
    
    res.json({ message: 'College deleted successfully' });
  } catch (error) {
    console.error('Delete college error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Counselor management endpoints
router.get('/counselors', adminAuth, async (req, res) => {
  try {
    const counselors = await User.find({ role: 'counselor' })
      .populate('college', 'name')
      .sort({ name: 1 });
    res.json(counselors);
  } catch (error) {
    console.error('Get counselors error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/counselors', adminAuth, async (req, res) => {
  try {
    const { name, email, college, password } = req.body;
    
    // Server-side validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    
    if (!college) {
      return res.status(400).json({ message: 'College assignment is required' });
    }
    
    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Verify college exists
    const collegeExists = await College.findById(college);
    if (!collegeExists) {
      return res.status(400).json({ message: 'Selected college does not exist' });
    }
    
    const counselor = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password || 'defaultPassword123',
      role: 'counselor',
      college,
      isActive: true
    });
    
    await counselor.save();
    
    // Populate college info before sending response
    await counselor.populate('college', 'name');
    
    res.status(201).json(counselor);
  } catch (error) {
    console.error('Create counselor error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/counselors/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, college, password } = req.body;
    
    const updateData = { name, email, college };
    if (password) {
      updateData.password = password;
    }
    
    const counselor = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('college', 'name');
    
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }
    
    res.json(counselor);
  } catch (error) {
    console.error('Update counselor error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/counselors/:id', adminAuth, async (req, res) => {
  try {
    const counselor = await User.findByIdAndDelete(req.params.id);
    
    if (!counselor) {
      return res.status(404).json({ message: 'Counselor not found' });
    }
    
    res.json({ message: 'Counselor deleted successfully' });
  } catch (error) {
    console.error('Delete counselor error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
module.exports = router;
