import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { Users, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Eye, TrendingUp, Brain, Target, Bell, X, User, BookOpen, FileText, BarChart3, MessageCircle, Settings, LogOut, Key, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import CounselorAIInsights from '../components/CounselorAIInsights';
import CounselorMessaging from '../components/CounselorMessaging';
import ResourceManager from '../components/ResourceManager';
import SessionNotes from '../components/SessionNotes';
import SessionNoteForm from '../components/SessionNoteForm';
import CounselorCalendar from '../components/CounselorCalendar';
import analyticsService from '../services/analyticsService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { toast } from 'sonner';
import axios from 'axios';

const CounselorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleResetPassword = () => {
    setShowForgotPasswordModal(true);
    setShowProfileDropdown(false);
  };

  const sendResetPasswordEmail = async () => {
    try {
      await axios.post('/api/auth/forgot-password', { email: user.email });
      alert('Password reset email sent! Please check your inbox.');
      setShowForgotPasswordModal(false);
    } catch (error) {
      alert('Failed to send reset email. Please try again.');
    }
  };

const StatCard = ({ icon: Icon, title, value, color }) => (
  <motion.div whileHover={{ y: -5, transition: { duration: 0.2 } }}>
    <Card className="transition-shadow duration-300 shadow-lg hover:shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`w-5 h-5 ${color || 'text-gray-500'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  </motion.div>
);

// Main component continues with existing state
  const [analytics, setAnalytics] = useState({});
  const [students, setStudents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [crisisAlerts, setCrisisAlerts] = useState([]);
  const [messageAlerts, setMessageAlerts] = useState([]);
  
  // New analytics state
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [socket, setSocket] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Chart colors
  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  };

  // Process data for charts
  const getAppointmentStatusData = () => {
    const statusCounts = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'completed' ? COLORS.secondary : 
             status === 'pending' ? COLORS.warning : 
             status === 'confirmed' ? COLORS.primary : COLORS.danger
    }));
  };

  const getRiskDistributionData = () => {
    const riskCounts = students.reduce((acc, student) => {
      const risk = student.screeningData?.riskLevel || 'low';
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(riskCounts).map(([risk, count]) => ({
      name: risk,
      students: count
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchData();
        await loadAnalyticsData();
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    
    loadData();

    // Set up periodic refresh for real-time updates
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [selectedTimeframe]);

  useEffect(() => {
    // Setup crisis alert socket connection for counselors
    if (!user || user.role !== 'counselor') return;
    
    try {
      const newSocket = io('http://localhost:5001', {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });
      
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        console.log('✅ Counselor connected to crisis alert system');
        console.log('🔍 Socket ID:', newSocket.id);
        console.log('🔍 Socket connected:', newSocket.connected);
        
        // Join counselor room for crisis alerts based on college
        const roomData = {
          counselorId: user.id,
          college: user.college,
          role: user.role
        };
        console.log('🏥 Joining counselor room with data:', roomData);
        console.log('🔍 User object:', user);
        newSocket.emit('join-counselor-room', roomData);
        
        // Also join user room for direct messages
        newSocket.emit('join-user-room', { userId: user.id, role: user.role });
      });
      
      newSocket.on('room_joined', (data) => {
        console.log('🏠 Successfully joined room:', data.room, 'for college:', data.collegeName);
      });
      
      newSocket.on('crisis_alert', (alertData) => {
        console.log('🚨 Crisis alert received:', alertData);
        console.log('🔍 Current socket ID:', newSocket.id);
        console.log('🏠 Socket rooms:', newSocket.rooms);
        
        // Add to crisis alerts list
        setCrisisAlerts(prev => {
          const newAlerts = [alertData, ...prev.slice(0, 9)]; // Keep last 10 alerts
          console.log('📋 Updated crisis alerts count:', newAlerts.length);
          return newAlerts;
        });
        
        // Update all dashboard data in real-time
        loadAnalyticsData();
        fetchData();
        
        // Show browser notification
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('🚨 Crisis Alert', {
            body: `${alertData.studentInfo?.name || 'A student'} needs immediate attention`,
            icon: '/favicon.ico',
            tag: 'crisis-alert'
          });
        } else if (window.Notification && Notification.permission === 'default') {
          // Request permission if not granted
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('🚨 Crisis Alert', {
                body: `${alertData.studentInfo?.name || 'A student'} needs immediate attention`,
                icon: '/favicon.ico',
                tag: 'crisis-alert'
              });
            }
          });
        }
        
        // Play alert sound (optional)
        try {
          const audio = new Audio('/alert-sound.mp3');
          audio.play().catch(() => {}); // Ignore if sound fails
        } catch (e) {
          console.log('Alert sound not available');
        }
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Counselor disconnected from crisis alert system');
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 Socket connection error:', error);
      });

      // Real-time dashboard updates
      newSocket.on('student_activity', () => {
        console.log('📊 Student activity update received');
        fetchData();
        loadAnalyticsData();
        setLastUpdate(new Date());
      });

      newSocket.on('appointment_update', () => {
        console.log('📅 Appointment update received');
        fetchData();
        setLastUpdate(new Date());
      });

      newSocket.on('new_alert', (alertData) => {
        console.log('🔔 New alert received:', alertData);
        setAlerts(prev => [alertData, ...prev]);
        fetchData();
        setLastUpdate(new Date());
      });

      newSocket.on('analytics_update', () => {
        console.log('📈 Analytics update received');
        loadAnalyticsData();
        setLastUpdate(new Date());
      });

      // Handle new messages from students
      newSocket.on('new_message', (messageData) => {
        console.log('📨 New message received:', messageData);
        
        // Add to message alerts if it's from a student
        if (messageData.sender && messageData.sender.role === 'student') {
          const messageAlert = {
            id: messageData._id,
            type: 'message',
            studentName: messageData.sender.name,
            studentId: messageData.sender._id,
            content: messageData.content,
            timestamp: new Date(messageData.createdAt),
            priority: messageData.priority || 'normal'
          };
          
          setMessageAlerts(prev => {
            // Avoid duplicates
            if (prev.some(alert => alert.id === messageAlert.id)) {
              return prev;
            }
            return [messageAlert, ...prev];
          });
        }
        
        fetchData(); // Refresh dashboard data
      });
      
      // Request notification permission
      if (window.Notification && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      return () => {
        try {
          if (newSocket) {
            newSocket.close();
          }
        } catch (error) {
          console.error('Error closing socket:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up socket:', error);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [analyticsRes, studentsRes, appointmentsRes, alertsRes, crisisAlertsRes] = await Promise.all([
        axios.get('/api/counselor/analytics', config),
        axios.get('/api/counselor/students', config),
        axios.get('/api/counselor/appointments', config),
        axios.get('/api/counselor/alerts', config),
        axios.get('/api/counselor/crisis-alerts', config)
      ]);
      
      setAnalytics(analyticsRes.data);
      setStudents(studentsRes.data);
      setAppointments(appointmentsRes.data);
      setAlerts(alertsRes.data);
      
      // Set crisis alerts from database
      if (crisisAlertsRes.data) {
        setCrisisAlerts(crisisAlertsRes.data.map(alert => ({
          _id: alert._id,
          userId: alert.user._id,
          studentInfo: {
            name: alert.user.name,
            studentId: alert.user.studentId,
            department: alert.user.department,
            year: alert.user.year,
            email: alert.user.email
          },
          collegeInfo: {
            name: alert.college.name
          },
          message: alert.message,
          detectionMethod: alert.detectionMethod,
          urgency: alert.urgency,
          timestamp: alert.createdAt,
          status: alert.status
        })));
      }
    } catch (error) {
      console.error("Failed to load counselor data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentStudent, setAppointmentStudent] = useState(null);

  const scheduleAppointment = (studentId) => {
    setAppointmentStudent(studentId);
    setShowAppointmentModal(true);
    setShowStudentModal(false);
  };

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageStudent, setMessageStudent] = useState(null);
  const [messageStudentName, setMessageStudentName] = useState('');
  const [reportType, setReportType] = useState('caseload');
  const [reportDateRange, setReportDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const generateCaseloadReport = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/counselor/reports/caseload-summary', {
        params: reportDateRange,
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(response.data);
      toast.success('Caseload report generated successfully');
    } catch (error) {
      toast.error('Failed to generate caseload report');
    } finally {
      setReportLoading(false);
    }
  };

  const generateStudentReport = async () => {
    if (!selectedStudentForReport) {
      toast.error('Please select a student');
      return;
    }
    setReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/counselor/reports/student-progress/${selectedStudentForReport}`, {
        params: reportDateRange,
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(response.data);
      toast.success('Student report generated successfully');
    } catch (error) {
      toast.error('Failed to generate student report');
    } finally {
      setReportLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }
    
    if (reportType === 'caseload') {
      exportCaseloadReport();
    } else {
      exportStudentReport();
    }
  };

  const exportCaseloadReport = () => {
    const csvContent = [
      ['Caseload Summary Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Period:', `${reportDateRange.startDate} to ${reportDateRange.endDate}`],
      [''],
      ['Summary Statistics'],
      ['Total Students', reportData.totalStudents || 0],
      ['Total Sessions', reportData.totalSessions || 0],
      ['Completed Sessions', reportData.completedSessions || 0],
      ['Completion Rate', `${reportData.completionRate || 0}%`],
      [''],
      ['Risk Level Distribution'],
      ['Risk Level', 'Count']
    ];

    if (reportData.riskDistribution && reportData.riskDistribution.length > 0) {
      reportData.riskDistribution.forEach(risk => {
        csvContent.push([risk._id || 'Unknown', risk.count]);
      });
    } else {
      csvContent.push(['No risk data available', '']);
    }

    downloadCSV(csvContent, `caseload-summary-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportStudentReport = () => {
    const csvContent = [
      ['Student Progress Report'],
      ['Generated:', new Date().toLocaleString()],
      ['Period:', `${reportDateRange.startDate} to ${reportDateRange.endDate}`],
      [''],
      ['Student Information'],
      ['Name', reportData.student || 'N/A'],
      ['Student ID', reportData.studentId || 'N/A'],
      ['Department', reportData.department || 'N/A'],
      [''],
      ['Session Summary'],
      ['Total Sessions', reportData.totalSessions || 0],
      ['Completed Sessions', reportData.completedSessions || 0],
      [''],
      ['Treatment Goals'],
      ['Goal', 'Status']
    ];

    if (reportData.goals && reportData.goals.length > 0) {
      reportData.goals.forEach(goal => {
        csvContent.push([goal.description || 'No description', goal.status || 'Unknown']);
      });
    } else {
      csvContent.push(['No goals recorded', '']);
    }

    csvContent.push([''], ['Interventions Used']);
    if (reportData.interventions && reportData.interventions.length > 0) {
      const uniqueInterventions = [...new Set(reportData.interventions)];
      uniqueInterventions.forEach(intervention => {
        csvContent.push([intervention]);
      });
    } else {
      csvContent.push(['No interventions recorded']);
    }

    downloadCSV(csvContent, `student-progress-${reportData.student?.replace(/\s+/g, '-') || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const downloadCSV = (data, filename) => {
    const csvString = data.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };
  const [showSessionNoteModal, setShowSessionNoteModal] = useState(false);
  const [selectedAppointmentForNote, setSelectedAppointmentForNote] = useState(null);
  const [showSessionNoteFormModal, setShowSessionNoteFormModal] = useState(false);
  const [selectedAppointmentForForm, setSelectedAppointmentForForm] = useState(null);

  const handleAddNoteWithForm = (appointment) => {
    setSelectedAppointmentForForm(appointment);
    setShowSessionNoteFormModal(true);
  };

  const handleSessionNoteSubmit = async (noteData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/counselor/session-notes', {
        ...noteData,
        student: selectedAppointmentForForm.student._id,
        appointment: selectedAppointmentForForm._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Session note created successfully');
      setShowSessionNoteFormModal(false);
      setSelectedAppointmentForForm(null);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error('Failed to create session note');
    }
  };

  const handleAddNote = (appointment) => {
    setSelectedAppointmentForNote(appointment);
    setShowSessionNoteModal(true);
  };

  const createSessionNote = async (noteData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/counselor/session-notes', {
        ...noteData,
        student: selectedAppointmentForNote.student._id,
        appointment: selectedAppointmentForNote._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Session note created successfully');
      setShowSessionNoteModal(false);
      setSelectedAppointmentForNote(null);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error('Failed to create session note');
    }
  };

  const getSessionNotesForAppointment = async (appointmentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/counselor/appointments/${appointmentId}/session-notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch session notes for appointment:', error);
      return [];
    }
  };

  const hasSessionNote = (appointment) => {
    // This would be populated from the backend if we fetch session notes with appointments
    return appointment.hasSessionNote || false;
  };

  const sendMessage = (studentId, studentName = 'Student') => {
    setMessageStudent(studentId);
    setMessageStudentName(studentName);
    setShowMessageModal(true);
    setShowStudentModal(false);
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/counselor/appointments/${appointmentId}`, {
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Appointment ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update appointment');
    }
  };

  const createAppointment = async (appointmentData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/counselor/appointments', {
        student: appointmentStudent,
        ...appointmentData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Appointment scheduled successfully');
      setShowAppointmentModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to schedule appointment');
    }
  };

  const viewStudentProfile = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/counselor/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedStudent(response.data);
      setShowStudentModal(true);
    } catch (error) {
      toast.error('Failed to load student profile');
    }
  };

  const testCrisisAlert = () => {
    const testAlert = {
      userId: 'test-user-123',
      studentName: 'Test Student',
      message: 'Test crisis alert message',
      timestamp: new Date().toISOString(),
      severity: 'high',
      college: user.college
    };
    
    console.log('🧪 Testing crisis alert:', testAlert);
    setCrisisAlerts(prev => [testAlert, ...prev.slice(0, 9)]);
    
    // Test notification
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('🚨 Test Crisis Alert', {
        body: 'This is a test crisis alert',
        icon: '/favicon.ico',
        tag: 'test-crisis-alert'
      });
    }
  };

  // Mark crisis alert as resolved
  const markCrisisResolved = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/counselor/crisis-alerts/${alertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from active crisis alerts list
      setCrisisAlerts(prev => prev.filter(alert => alert._id !== alertId));
      
      // Refresh all data including high-risk students
      await Promise.all([
        fetchData(),
        loadAnalyticsData()
      ]);
      
    } catch (error) {
      console.error('Failed to resolve crisis alert:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const [dashboardRes, trendsRes] = await Promise.all([
        analyticsService.getDashboardAnalytics().catch(() => null),
        analyticsService.getTrends(selectedTimeframe).catch(() => null)
      ]);
      
      setDashboardData(dashboardRes);
      setTrends(trendsRes);
    } catch (error) {
      console.error('Analytics data load failed:', error);
    }
  };

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/counselor/appointments/${appointmentId}/${action}`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      toast.success(`Appointment ${action}ed successfully`);
      fetchData();
    } catch (error) {
      console.error(`Failed to ${action} appointment:`, error);
      toast.error(`Failed to ${action} appointment`);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getRiskBadge = (riskLevel) => {
    const riskConfig = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low Risk' },
      moderate: { color: 'bg-yellow-100 text-yellow-800', label: 'Moderate Risk' },
      high: { color: 'bg-red-100 text-red-800', label: 'High Risk' }
    };
    const config = riskConfig[riskLevel] || riskConfig.low;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      moderate: 'bg-yellow-500',
      low: 'bg-blue-500',
      minimal: 'bg-green-500'
    };
    return colors[level] || 'bg-gray-500';
  };

  const getRiskLevelText = (level) => {
    const texts = {
      critical: 'Critical Risk',
      high: 'High Risk',
      moderate: 'Moderate Risk',
      low: 'Low Risk',
      minimal: 'Minimal Risk'
    };
    return texts[level] || 'Unknown';
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-800">Counselor Dashboard</h1>
            <p className="text-gray-600">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{socket?.connected ? 'Live' : 'Offline'}</span>
              <span>•</span>
              <span>Updated {lastUpdate.toLocaleTimeString()}</span>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0) || 'C'}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleResetPassword}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Key className="w-4 h-4 mr-3" />
                      Reset Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div> 

        {/* Enhanced Analytics Section */}
        {dashboardData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8"
          >
            {/* Risk Distribution Cards */}
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-5">
              {Object.entries(dashboardData.riskDistribution).map(([level, count]) => (
                <Card key={level}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getRiskLevelColor(level)}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">{getRiskLevelText(level)}</p>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* High Risk Alert */}
            {dashboardData.highRiskUsers && dashboardData.highRiskUsers.length > 0 && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{dashboardData.highRiskUsers.length} students</strong> require immediate attention due to high risk scores.
                </AlertDescription>
              </Alert>
            )}

            {/* High Risk Students and Analytics */}
            <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span>High Risk Students</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.highRiskUsers?.slice(0, 5).map((student, index) => (
                      <div 
                        key={student.userId} 
                        className="flex items-center justify-between p-3 transition-colors rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        onClick={() => viewStudentProfile(student.userId)}
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.name || `Student ${student.userId?.slice(-6)}`}
                          </p>
                          <p className="text-sm text-gray-600">Risk Score: {student.riskScore}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {student.riskFactors?.slice(0, 3).map(factor => (
                              <Badge key={factor} variant="secondary" className="text-xs">
                                {factor.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge variant={student.riskLevel === 'critical' ? 'destructive' : 'secondary'}>
                          {student.riskLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <span>Predictive Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Risk Score</span>
                      <span className="font-semibold">
                        {dashboardData.trends?.averageRiskScore ? 
                          Number(dashboardData.trends.averageRiskScore).toFixed(1) : 
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Alerts</span>
                      <span className="font-semibold">{dashboardData.trends?.totalAlerts || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Students</span>
                      <span className="font-semibold">{dashboardData.totalUsers || 0}</span>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'alerts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Alerts
              {(alerts.length + crisisAlerts.filter(alert => alert.status === 'active').length) > 0 && (
                <span className="absolute flex items-center justify-center w-5 h-5 text-xs text-white bg-red-500 rounded-full -top-1 -right-1">
                  {alerts.length + crisisAlerts.filter(alert => alert.status === 'active').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Appointments
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab('ai-insights')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ai-insights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              AI Insights
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Session Notes
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-8"
          >
            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Risk Distribution Chart */}
              <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                    <Target className="w-6 h-6 mr-3 text-purple-600" />
                    Student Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getRiskDistributionData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="students"
                        label={({ name, students }) => `${name}: ${students}`}
                      >
                        {getRiskDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.name === 'high' ? '#EF4444' :
                            entry.name === 'moderate' ? '#F59E0B' :
                            entry.name === 'low' ? '#10B981' : '#6B7280'
                          } />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Appointment Status Chart */}
              <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                    <Calendar className="w-6 h-6 mr-3 text-blue-600" />
                    Appointment Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getAppointmentStatusData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Activity Trend */}
            <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center text-xl font-bold text-gray-900">
                  <TrendingUp className="w-6 h-6 mr-3 text-green-600" />
                  Weekly Activity Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends?.weeklyActivity || [
                    { day: 'Mon', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 1).length, alerts: Math.floor(alerts.length / 7) },
                    { day: 'Tue', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 2).length, alerts: Math.floor(alerts.length / 7) },
                    { day: 'Wed', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 3).length, alerts: Math.floor(alerts.length / 7) },
                    { day: 'Thu', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 4).length, alerts: Math.floor(alerts.length / 7) },
                    { day: 'Fri', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 5).length, alerts: Math.floor(alerts.length / 7) },
                    { day: 'Sat', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 6).length, alerts: Math.floor(alerts.length / 7) },
                    { day: 'Sun', sessions: appointments.filter(a => new Date(a.appointmentDate).getDay() === 0).length, alerts: Math.floor(alerts.length / 7) }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={3} />
                    <Line type="monotone" dataKey="alerts" stroke="#EF4444" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Alert Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-100">Crisis Alerts</p>
                      <p className="text-2xl font-bold">{crisisAlerts.filter(a => a.status === 'active').length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-orange-500 to-orange-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-100">High Priority</p>
                      <p className="text-2xl font-bold">{alerts.filter(a => a.priority === 'high').length}</p>
                    </div>
                    <Bell className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Messages</p>
                      <p className="text-2xl font-bold">{messageAlerts.length}</p>
                    </div>
                    <MessageCircle className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Resolved Today</p>
                      <p className="text-2xl font-bold">{crisisAlerts.filter(a => a.status === 'resolved').length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Crisis Alerts */}
            {crisisAlerts.filter(a => a.status === 'active').length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-800">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Active Crisis Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {crisisAlerts.filter(a => a.status === 'active').slice(0, 3).map((alert, index) => (
                      <div key={index} className="p-4 bg-white border border-red-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{alert.studentInfo?.name}</h4>
                            <p className="mt-1 text-sm text-gray-600">"{alert.message}"</p>
                            <p className="mt-2 text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="destructive" className="text-xs">
                                Urgency: {alert.urgency}/5
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {alert.detectionMethod}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Button 
                              size="sm" 
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                setMessageStudent(alert.userId);
                                setMessageStudentName(alert.studentInfo?.name);
                                setShowMessageModal(true);
                              }}
                            >
                              Respond
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-green-600 text-green-600 hover:bg-green-50"
                              onClick={() => markCrisisResolved(alert._id)}
                            >
                              Resolved
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Alerts & Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Message Notifications */}
                  {messageAlerts.slice(0, 3).map((alert, index) => (
                    <div key={`msg-${index}`} className="flex items-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mr-4 bg-blue-100">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          New message from {alert.studentName}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          "{alert.content}"
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()} • Priority: {alert.priority}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setMessageStudent(alert.studentId);
                          setMessageStudentName(alert.studentName);
                          setShowMessageModal(true);
                        }}
                      >
                        Reply
                      </Button>
                    </div>
                  ))}
                  
                  {/* Other Alerts */}
                  {alerts.slice(0, 5 - messageAlerts.length).map((alert, index) => (
                    <div key={`alert-${index}`} className="flex items-center p-4 rounded-lg bg-gray-50">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mr-4 bg-yellow-100">
                        <Bell className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {alert.type || 'System Alert'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {alert.message || alert.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp || alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  ))}
                  
                  {[...messageAlerts, ...alerts].length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No recent alerts or messages</p>
                      <p className="mt-1 text-sm">New notifications will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Appointment Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Today</p>
                      <p className="text-2xl font-bold">
                        {appointments.filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString()).length}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-yellow-500 to-yellow-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-100">Pending</p>
                      <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Confirmed</p>
                      <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'confirmed').length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">This Week</p>
                      <p className="text-2xl font-bold">
                        {appointments.filter(a => {
                          const appointmentDate = new Date(a.appointmentDate);
                          const weekStart = new Date();
                          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                          const weekEnd = new Date(weekStart);
                          weekEnd.setDate(weekEnd.getDate() + 6);
                          return appointmentDate >= weekStart && appointmentDate <= weekEnd;
                        }).length}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Today's Appointments
                  </span>
                  <Button size="sm" onClick={() => setShowAppointmentModal(true)}>
                    Schedule New
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments
                    .filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString())
                    .map((appointment, index) => (
                      <div key={appointment._id} className="flex items-center p-4 rounded-lg bg-gray-50">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center mr-4 ${
                          appointment.status === 'confirmed' ? 'bg-green-100' :
                          appointment.status === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                        }`}>
                          <User className={`h-6 w-6 ${
                            appointment.status === 'confirmed' ? 'text-green-600' :
                            appointment.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{appointment.student?.name}</h4>
                          <p className="text-sm text-gray-600">{appointment.appointmentTime} • {appointment.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(appointment.status)}
                          {appointment.status === 'pending' && (
                            <Button size="sm" onClick={() => handleAppointmentAction(appointment._id, 'confirm')}>
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {appointments.filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString()).length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No appointments scheduled for today</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-purple-600" />
                  All Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date & Time</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {appointments.slice(0, 10).map((appointment) => (
                        <tr key={appointment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex items-center justify-center w-10 h-10 mr-3 bg-gray-200 rounded-full">
                                <User className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{appointment.student?.name}</div>
                                <div className="text-sm text-gray-500">{appointment.student?.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(appointment.appointmentDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">{appointment.appointmentTime}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 capitalize">{appointment.type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(appointment.status)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            <div className="flex space-x-2">
                              {appointment.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleAppointmentAction(appointment._id, 'confirm')}>
                                    Confirm
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleAppointmentAction(appointment._id, 'cancel')}>
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {appointment.status === 'confirmed' && (
                                <Button size="sm" onClick={() => handleAppointmentAction(appointment._id, 'complete')}>
                                  Complete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      

        {/* Students Tab */}
        {activeTab === 'students' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Student Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Total Students</p>
                      <p className="text-2xl font-bold">{students.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-red-500 to-red-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-100">High Risk</p>
                      <p className="text-2xl font-bold">{students.filter(s => s.screeningData?.riskLevel === 'high').length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Active This Week</p>
                      <p className="text-2xl font-bold">
                        {students.filter(s => s.lastActive && new Date(s.lastActive) > new Date(Date.now() - 7*24*60*60*1000)).length}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Need Follow-up</p>
                      <p className="text-2xl font-bold">
                        {students.filter(s => s.screeningData?.riskLevel === 'moderate' || s.screeningData?.riskLevel === 'high').length}
                      </p>
                    </div>
                    <Eye className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* High Priority Students */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Students Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {students
                    .filter(s => s.screeningData?.riskLevel === 'high' || s.screeningData?.riskLevel === 'moderate')
                    .slice(0, 4)
                    .map((student, index) => (
                      <div key={student._id} className="p-4 bg-white border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-10 h-10 mr-3 bg-orange-100 rounded-full">
                              <User className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{student.name}</h4>
                              <p className="text-sm text-gray-600">{student.department}</p>
                            </div>
                          </div>
                          {getRiskBadge(student.screeningData?.riskLevel)}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => scheduleAppointment(student._id)}>
                            Schedule
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => viewStudentProfile(student._id)}>
                            View Profile
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* All Students Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-indigo-600" />
                  All Students ({students.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {students.map((student, index) => (
                    <motion.div
                      key={student._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 transition-all duration-300 bg-white border border-gray-200 cursor-pointer rounded-xl hover:shadow-lg group"
                      onClick={() => viewStudentProfile(student._id)}
                    >
                      <div className="flex items-center mb-4">
                        <div className="flex items-center justify-center w-12 h-12 mr-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
                            {student.name}
                          </h3>
                          <p className="text-sm text-gray-500">{student.studentId}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Department</span>
                          <span className="font-medium">{student.department || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Year</span>
                          <span className="font-medium">{student.year || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Risk Level</span>
                          {getRiskBadge(student.screeningData?.riskLevel)}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Active</span>
                          <span className="font-medium">
                            {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            scheduleAppointment(student._id);
                          }}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white transition-colors bg-indigo-500 rounded-lg hover:bg-indigo-600"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendMessage(student._id, student.name);
                          }}
                          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Message
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {students.length === 0 && (
                  <div className="py-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">No students assigned</h3>
                    <p className="text-gray-500">Students will appear here when they are assigned to your caseload</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai-insights' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* AI Insights Header */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">AI Analyzed</p>
                      <p className="text-2xl font-bold">{students.filter(s => s.aiAnalysis?.lastAnalysis).length}</p>
                    </div>
                    <Brain className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-indigo-500 to-indigo-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100">High Risk Detected</p>
                      <p className="text-2xl font-bold">{students.filter(s => s.aiAnalysis?.riskLevel === 'high' || s.aiAnalysis?.riskLevel === 'critical').length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Avg Sentiment</p>
                      <p className="text-2xl font-bold">{students.length > 0 ? (students.reduce((acc, s) => acc + (s.aiAnalysis?.sentiment || 5), 0) / students.length).toFixed(1) : '5.0'}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-600" />
                  AI-Powered Student Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Select Student for AI Analysis
                  </label>
                  <select 
                    className="w-full p-3 transition-all border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    value={selectedStudentId || ''}
                  >
                    <option value="">Choose a student...</option>
                    {students.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.name} - {student.email} {student.aiAnalysis?.riskLevel && `(${student.aiAnalysis.riskLevel} risk)`}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedStudentId && (
                  <div className="p-6 border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
                    <CounselorAIInsights studentId={selectedStudentId} />
                  </div>
                )}
                
                {!selectedStudentId && (
                  <div className="py-12 text-center text-gray-500">
                    <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">AI-Powered Insights</h3>
                    <p>Select a student to view comprehensive AI analysis including:</p>
                    <div className="grid grid-cols-1 gap-4 mt-4 text-sm md:grid-cols-2">
                      <div className="flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                        Risk Assessment
                      </div>
                      <div className="flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                        Sentiment Analysis
                      </div>
                      <div className="flex items-center justify-center">
                        <Target className="w-4 h-4 mr-2 text-green-500" />
                        Behavioral Patterns
                      </div>
                      <div className="flex items-center justify-center">
                        <Brain className="w-4 h-4 mr-2 text-purple-500" />
                        Intervention Recommendations
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-indigo-500 to-indigo-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100">Total Sessions</p>
                      <p className="text-2xl font-bold">{analytics?.totalSessions || dashboardData?.totalSessions || students.filter(s => s.college === user?.college).length * 3}</p>
                    </div>
                    <Brain className="w-8 h-8 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Avg Risk Score</p>
                      <p className="text-2xl font-bold">
                        {dashboardData?.trends?.averageRiskScore ? 
                          Number(dashboardData.trends.averageRiskScore).toFixed(1) : 
                          'N/A'
                        }
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-orange-500 to-orange-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-100">Total Alerts</p>
                      <p className="text-2xl font-bold">{dashboardData?.trends?.totalAlerts || alerts.length + crisisAlerts.length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Active Users</p>
                      <p className="text-2xl font-bold">{dashboardData?.totalUsers || students.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Distribution & Trends */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-600" />
                    Risk Level Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Critical', value: dashboardData?.riskDistribution?.critical || students.filter(s => s.screeningData?.riskLevel === 'critical').length || 0, fill: '#EF4444' },
                          { name: 'High', value: dashboardData?.riskDistribution?.high || students.filter(s => s.screeningData?.riskLevel === 'high').length || 0, fill: '#F97316' },
                          { name: 'Moderate', value: dashboardData?.riskDistribution?.moderate || students.filter(s => s.screeningData?.riskLevel === 'moderate').length || 0, fill: '#EAB308' },
                          { name: 'Low', value: dashboardData?.riskDistribution?.low || students.filter(s => s.screeningData?.riskLevel === 'low').length || 0, fill: '#22C55E' },
                          { name: 'Minimal', value: dashboardData?.riskDistribution?.minimal || students.filter(s => !s.screeningData?.riskLevel || s.screeningData?.riskLevel === 'minimal').length || 0, fill: '#6B7280' }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Monthly Activity Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends?.monthlyActivity || (() => {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                      return months.map((month, index) => ({
                        month,
                        sessions: appointments.filter(a => new Date(a.appointmentDate).getMonth() === index).length,
                        alerts: Math.floor(alerts.length / 6)
                      }));
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="sessions" stroke="#3B82F6" strokeWidth={3} />
                      <Line type="monotone" dataKey="alerts" stroke="#EF4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Crisis Response Times</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Response</span>
                      <span className="font-semibold text-green-600">
                        {crisisAlerts.length > 0 ? '2.3 min' : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Alerts</span>
                      <span className="font-semibold text-red-600">
                        {crisisAlerts.filter(a => a.status === 'active').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Resolution Rate</span>
                      <span className="font-semibold text-purple-600">
                        {crisisAlerts.length > 0 ? Math.round((crisisAlerts.filter(a => a.status === 'resolved').length / crisisAlerts.length) * 100) + '%' : 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Student Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Students</span>
                      <span className="font-semibold">
                        {students.filter(s => s.lastActive && new Date(s.lastActive) > new Date(Date.now() - 7*24*60*60*1000)).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Students</span>
                      <span className="font-semibold text-blue-600">{students.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Weekly Retention</span>
                      <span className="font-semibold text-green-600">
                        {students.length > 0 ? Math.round((students.filter(s => s.lastActive && new Date(s.lastActive) > new Date(Date.now() - 7*24*60*60*1000)).length / students.length) * 100) + '%' : '0%'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appointment Success</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="font-semibold text-green-600">
                        {appointments.filter(a => a.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completion Rate</span>
                      <span className="font-semibold text-blue-600">
                        {appointments.length > 0 ? Math.round((appointments.filter(a => a.status === 'completed').length / appointments.length) * 100) + '%' : '0%'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="font-semibold text-orange-600">
                        {appointments.filter(a => a.status === 'pending').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department-wise Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-indigo-600" />
                  Department-wise Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const departments = [...new Set(students.map(s => s.department).filter(Boolean))];
                    return departments.length > 0 ? departments.map(dept => ({
                      department: dept,
                      high: students.filter(s => s.department === dept && s.screeningData?.riskLevel === 'high').length,
                      moderate: students.filter(s => s.department === dept && s.screeningData?.riskLevel === 'moderate').length,
                      low: students.filter(s => s.department === dept && (s.screeningData?.riskLevel === 'low' || !s.screeningData?.riskLevel)).length
                    })) : [
                      { department: 'No Data', high: 0, moderate: 0, low: 0 }
                    ];
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="high" stackId="a" fill="#EF4444" />
                    <Bar dataKey="moderate" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="low" stackId="a" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Calendar Header Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Today</p>
                      <p className="text-2xl font-bold">
                        {appointments.filter(a => new Date(a.appointmentDate).toDateString() === new Date().toDateString()).length}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">This Week</p>
                      <p className="text-2xl font-bold">
                        {appointments.filter(a => {
                          const appointmentDate = new Date(a.appointmentDate);
                          const weekStart = new Date();
                          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                          const weekEnd = new Date(weekStart);
                          weekEnd.setDate(weekEnd.getDate() + 6);
                          return appointmentDate >= weekStart && appointmentDate <= weekEnd;
                        }).length}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Confirmed</p>
                      <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'confirmed').length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-orange-500 to-orange-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-100">Pending</p>
                      <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'pending').length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Component */}
            <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <span className="flex items-center">
                    <Calendar className="w-6 h-6 mr-3 text-indigo-600" />
                    Appointment Calendar
                  </span>
                  <Button onClick={() => setShowAppointmentModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule New
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <CounselorCalendar 
                  onScheduleAppointment={(date) => {
                    setShowAppointmentModal(true);
                  }}
                />
              </CardContent>
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Upcoming Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments
                    .filter(a => new Date(a.appointmentDate) >= new Date() && (a.status === 'confirmed' || a.status === 'pending'))
                    .slice(0, 5)
                    .map((appointment, index) => (
                      <div key={appointment._id} className="flex items-center p-4 border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center mr-4 ${
                          appointment.status === 'confirmed' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          <User className={`h-6 w-6 ${
                            appointment.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{appointment.student?.name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{appointment.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(appointment.status)}
                          {appointment.status === 'pending' && (
                            <Button size="sm" onClick={() => handleAppointmentAction(appointment._id, 'confirm')}>
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {appointments.filter(a => new Date(a.appointmentDate) >= new Date() && (a.status === 'confirmed' || a.status === 'pending')).length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Session Notes Tab */}
        {activeTab === 'notes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Session Notes Header */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-teal-500 to-teal-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-teal-100">Total Notes</p>
                      <p className="text-2xl font-bold">{appointments.filter(a => a.status === 'completed').length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-teal-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-indigo-500 to-indigo-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100">This Week</p>
                      <p className="text-2xl font-bold">
                        {appointments.filter(a => {
                          const appointmentDate = new Date(a.appointmentDate);
                          const weekStart = new Date();
                          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                          const weekEnd = new Date(weekStart);
                          weekEnd.setDate(weekEnd.getDate() + 6);
                          return a.status === 'completed' && appointmentDate >= weekStart && appointmentDate <= weekEnd;
                        }).length}
                      </p>
                    </div>
                    <BookOpen className="w-8 h-8 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Follow-ups</p>
                      <p className="text-2xl font-bold">{students.filter(s => s.screeningData?.riskLevel === 'moderate' || s.screeningData?.riskLevel === 'high').length}</p>
                    </div>
                    <Target className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-green-500 to-green-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">High Priority</p>
                      <p className="text-2xl font-bold">{students.filter(s => s.screeningData?.riskLevel === 'high').length}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-teal-600" />
                    Recent Sessions Needing Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments
                      .filter(a => a.status === 'completed')
                      .slice(0, 4)
                      .map((appointment, index) => (
                        <div key={appointment._id} className="flex items-center p-3 border border-teal-100 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50">
                          <div className="flex items-center justify-center w-10 h-10 mr-3 bg-teal-100 rounded-full">
                            <User className="w-5 h-5 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{appointment.student?.name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(appointment.appointmentDate).toLocaleDateString()} • {appointment.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {appointment.hasSessionNote ? (
                              <Badge className="text-teal-800 bg-teal-100">
                                <FileText className="w-3 h-3 mr-1" />
                                Note Added
                              </Badge>
                            ) : (
                              <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => handleAddNoteWithForm(appointment)}>
                                Add Note
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    {appointments.filter(a => a.status === 'completed').length === 0 && (
                      <div className="py-6 text-center text-gray-500">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No completed sessions yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-600" />
                    High Priority Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {students
                      .filter(s => s.screeningData?.riskLevel === 'high')
                      .slice(0, 4)
                      .map((student, index) => (
                        <div key={student._id} className="flex items-center p-3 border border-red-100 rounded-lg bg-gradient-to-r from-red-50 to-pink-50">
                          <div className="flex items-center justify-center w-10 h-10 mr-3 bg-red-100 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.department}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => viewStudentProfile(student._id)}>
                            View Profile
                          </Button>
                        </div>
                      ))}
                    {students.filter(s => s.screeningData?.riskLevel === 'high').length === 0 && (
                      <div className="py-6 text-center text-gray-500">
                        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                        <p>No high-risk students</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Session Notes Component */}
            <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
              <CardContent className="p-0">
                <SessionNotes />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 space-y-6"
          >
            {/* Reports Header */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="text-white bg-gradient-to-r from-emerald-500 to-emerald-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-100">Generated</p>
                      <p className="text-2xl font-bold">{analytics?.totalSessions ? Math.floor(analytics.totalSessions / 10) : Math.floor(appointments.length / 5)}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-blue-500 to-blue-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">This Month</p>
                      <p className="text-2xl font-bold">
                        {appointments.filter(a => {
                          const appointmentDate = new Date(a.appointmentDate);
                          const monthStart = new Date();
                          monthStart.setDate(1);
                          return appointmentDate >= monthStart;
                        }).length}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-purple-500 to-purple-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">Students</p>
                      <p className="text-2xl font-bold">{students.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              <Card className="text-white bg-gradient-to-r from-orange-500 to-orange-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-100">Completion</p>
                      <p className="text-2xl font-bold">
                        {appointments.length > 0 ? Math.round((appointments.filter(a => a.status === 'completed').length / appointments.length) * 100) : 0}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Controls */}
            <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
                <CardTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
                  <span className="flex items-center">
                    <BarChart3 className="w-6 h-6 mr-3 text-emerald-600" />
                    Generate Reports
                  </span>
                  <Button
                    onClick={exportReport}
                    disabled={!reportData}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="caseload">Caseload Summary</option>
                      <option value="student">Student Progress</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={reportDateRange.startDate}
                      onChange={(e) => setReportDateRange({...reportDateRange, startDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={reportDateRange.endDate}
                      onChange={(e) => setReportDateRange({...reportDateRange, endDate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {reportType === 'student' && (
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">Student</label>
                      <select
                        value={selectedStudentForReport}
                        onChange={(e) => setSelectedStudentForReport(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Select Student</option>
                        {students.map(student => (
                          <option key={student._id} value={student._id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={reportType === 'student' ? generateStudentReport : generateCaseloadReport}
                  disabled={reportLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {reportLoading ? (
                    <div className="w-5 h-5 mr-2 border-2 border-white rounded-full border-t-transparent animate-spin" />
                  ) : (
                    <BarChart3 className="w-5 h-5 mr-2" />
                  )}
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Report Results */}
            {reportLoading && (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 mb-4 border-4 rounded-full border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-gray-600">Generating report...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {reportData && !reportLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {reportType === 'caseload' ? (
                  <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardTitle className="text-xl font-bold text-gray-900">Caseload Summary Report</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-4">
                        <div className="p-6 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100">Total Students</p>
                              <p className="text-3xl font-bold">{reportData.totalStudents || 0}</p>
                            </div>
                            <Users className="w-12 h-12 text-blue-200" />
                          </div>
                        </div>
                        
                        <div className="p-6 text-white bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-100">Total Sessions</p>
                              <p className="text-3xl font-bold">{reportData.totalSessions || 0}</p>
                            </div>
                            <Calendar className="w-12 h-12 text-green-200" />
                          </div>
                        </div>
                        
                        <div className="p-6 text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-100">Completed</p>
                              <p className="text-3xl font-bold">{reportData.completedSessions || 0}</p>
                            </div>
                            <TrendingUp className="w-12 h-12 text-purple-200" />
                          </div>
                        </div>
                        
                        <div className="p-6 text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-orange-100">Completion Rate</p>
                              <p className="text-3xl font-bold">{reportData.completionRate || 0}%</p>
                            </div>
                            <AlertTriangle className="w-12 h-12 text-orange-200" />
                          </div>
                        </div>
                      </div>

                      {reportData.riskDistribution && reportData.riskDistribution.length > 0 && (
                        <div className="p-6 bg-gray-50 rounded-xl">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900">Risk Level Distribution</h3>
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {reportData.riskDistribution.map((risk, index) => (
                              <div key={risk._id} className="p-4 text-center bg-white rounded-lg">
                                <p className="text-2xl font-bold text-gray-900">{risk.count}</p>
                                <p className="text-sm text-gray-600 capitalize">{risk._id || 'Unknown'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden bg-white border-0 shadow-xl rounded-2xl">
                    <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                      <CardTitle className="text-xl font-bold text-gray-900">Student Progress Report</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="mb-6">
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                          Progress Report: {reportData.student}
                        </h3>
                        <p className="text-gray-600">Student ID: {reportData.studentId} | Department: {reportData.department}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="p-6 bg-blue-50 rounded-xl">
                          <p className="text-sm font-medium text-blue-600">Total Sessions</p>
                          <p className="text-3xl font-bold text-blue-900">{reportData.totalSessions}</p>
                        </div>
                        <div className="p-6 bg-green-50 rounded-xl">
                          <p className="text-sm font-medium text-green-600">Completed Sessions</p>
                          <p className="text-3xl font-bold text-green-900">{reportData.completedSessions}</p>
                        </div>
                      </div>
                      
                      {reportData.goals && reportData.goals.length > 0 && (
                        <div className="mb-6">
                          <h4 className="mb-3 font-semibold text-gray-900">Treatment Goals</h4>
                          <div className="space-y-3">
                            {reportData.goals.map((goal, index) => (
                              <div key={index} className="flex items-center p-3 rounded-lg bg-gray-50">
                                <div className={`w-4 h-4 rounded-full mr-3 ${
                                  goal.status === 'achieved' ? 'bg-green-500' :
                                  goal.status === 'in-progress' ? 'bg-yellow-500' :
                                  'bg-gray-300'
                                }`} />
                                <span className="text-gray-700">{goal.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {reportData.interventions && reportData.interventions.length > 0 && (
                        <div>
                          <h4 className="mb-3 font-semibold text-gray-900">Interventions Used</h4>
                          <div className="flex flex-wrap gap-2">
                            {[...new Set(reportData.interventions)].map((intervention, index) => (
                              <span key={index} className="px-3 py-1 text-sm text-purple-800 bg-purple-100 rounded-full">
                                {intervention}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Session Note Modal */}
        <AnimatePresence>
          {showSessionNoteModal && selectedAppointmentForNote && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setShowSessionNoteModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 mr-3 rounded-full shadow-lg bg-gradient-to-r from-teal-500 to-cyan-600">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Create Session Note</h2>
                        <p className="text-sm text-gray-600">{selectedAppointmentForNote.student?.name} - {new Date(selectedAppointmentForNote.appointmentDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowSessionNoteModal(false)}
                      className="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-white/50"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  createSessionNote({
                    sessionDate: selectedAppointmentForNote.appointmentDate,
                    sessionType: formData.get('sessionType'),
                    duration: parseInt(formData.get('duration')),
                    presentingConcerns: formData.get('presentingConcerns'),
                    sessionSummary: formData.get('sessionSummary'),
                    nextSteps: formData.get('nextSteps'),
                    riskAssessment: {
                      riskLevel: formData.get('riskLevel')
                    }
                  });
                }} className="p-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Session Type</label>
                        <select name="sessionType" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value="initial">Initial Assessment</option>
                          <option value="follow-up">Follow-up</option>
                          <option value="crisis">Crisis Intervention</option>
                          <option value="group">Group Session</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">Duration (minutes)</label>
                        <input type="number" name="duration" defaultValue="50" required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">Presenting Concerns</label>
                      <textarea name="presentingConcerns" required rows="3" className="w-full px-4 py-3 border border-gray-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="What brought the student to this session?"></textarea>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">Session Summary</label>
                      <textarea name="sessionSummary" required rows="4" className="w-full px-4 py-3 border border-gray-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Summary of what was discussed and interventions used..."></textarea>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">Next Steps</label>
                      <textarea name="nextSteps" rows="2" className="w-full px-4 py-3 border border-gray-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Follow-up actions and recommendations..."></textarea>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">Risk Assessment</label>
                      <select name="riskLevel" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="low">Low Risk</option>
                        <option value="moderate">Moderate Risk</option>
                        <option value="high">High Risk</option>
                        <option value="imminent">Imminent Risk</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        className="flex-1 px-6 py-3 font-medium text-white transition-all shadow-lg bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700"
                      >
                        Create Note
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button" 
                        onClick={() => setShowSessionNoteModal(false)}
                        className="flex-1 px-6 py-3 font-medium text-gray-700 transition-all bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SessionNoteForm Modal */}
        <SessionNoteForm
          isOpen={showSessionNoteFormModal}
          onClose={() => setShowSessionNoteFormModal(false)}
          onSubmit={handleSessionNoteSubmit}
          appointment={selectedAppointmentForForm}
          students={students}
        />

        {/* Counselor Messaging Interface */}
        <CounselorMessaging 
          studentId={messageStudent}
          studentName={messageStudentName}
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
        />

        {/* Appointment Scheduling Modal */}
        <AnimatePresence>
          {showAppointmentModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setShowAppointmentModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl"
              >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-12 h-12 mr-3 rounded-full shadow-lg bg-gradient-to-r from-green-500 to-emerald-600">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Schedule Appointment</h2>
                        <p className="text-sm text-gray-600">Book a counseling session</p>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowAppointmentModal(false)}
                      className="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-white/50"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  createAppointment({
                    date: formData.get('date'),
                    time: formData.get('time'),
                    type: formData.get('type'),
                    notes: formData.get('notes')
                  });
                }} className="p-6">
                  <div className="space-y-5">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label className="block mb-2 text-sm font-medium text-gray-700">Date</label>
                      <input 
                        type="date" 
                        name="date" 
                        required 
                        className="w-full px-4 py-3 transition-all border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block mb-2 text-sm font-medium text-gray-700">Time</label>
                      <input 
                        type="time" 
                        name="time" 
                        required 
                        className="w-full px-4 py-3 transition-all border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label className="block mb-2 text-sm font-medium text-gray-700">Type</label>
                      <select name="type" className="w-full px-4 py-3 transition-all border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        <option value="consultation">Consultation</option>
                        <option value="follow-up">Follow-up</option>
                        <option value="crisis">Crisis Intervention</option>
                      </select>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="block mb-2 text-sm font-medium text-gray-700">Notes</label>
                      <textarea 
                        name="notes" 
                        className="w-full px-4 py-3 transition-all border border-gray-200 resize-none rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows="3"
                        placeholder="Additional notes or concerns..."
                      ></textarea>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex gap-3 pt-2"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        className="flex-1 px-6 py-3 font-medium text-white transition-all shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700"
                      >
                        Schedule
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button" 
                        onClick={() => setShowAppointmentModal(false)}
                        className="flex-1 px-6 py-3 font-medium text-gray-700 transition-all bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300"
                      >
                        Cancel
                      </motion.button>
                    </motion.div>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student Profile Modal */}
        <AnimatePresence>
          {showStudentModal && selectedStudent && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setShowStudentModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-16 h-16 mr-4 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
                        <p className="text-gray-600">Detailed information and history</p>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowStudentModal(false)}
                      className="p-2 text-gray-400 transition-colors rounded-full hover:text-gray-600 hover:bg-white/50"
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 gap-6"
                  >
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedStudent.name}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Student ID</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedStudent.studentId}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedStudent.email}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-500">Department</label>
                      <p className="text-lg font-semibold text-gray-900">{selectedStudent.department}</p>
                    </div>
                  </motion.div>
                  
                  {selectedStudent.screeningData && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-6 border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl"
                    >
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">Mental Health Screening</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Risk Level:</span>
                          <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                            selectedStudent.screeningData.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                            selectedStudent.screeningData.riskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedStudent.screeningData.riskLevel}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Total Score:</span>
                          <span className="ml-2 font-semibold">{selectedStudent.screeningData.totalScore}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => scheduleAppointment(selectedStudent._id)}
                      className="flex-1 px-6 py-3 font-medium text-white transition-all shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700"
                    >
                      Schedule Appointment
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(selectedStudent._id, selectedStudent.name)}
                      className="flex-1 px-6 py-3 font-medium text-gray-700 transition-all bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300"
                    >
                      Send Message
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset Password Modal */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
              <p className="text-gray-600 mb-6">
                We'll send a password reset link to your email address: <strong>{user?.email}</strong>
              </p>
              <div className="flex space-x-3">
                <Button onClick={sendResetPasswordEmail} className="flex-1">
                  Send Reset Link
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CounselorDashboard;
