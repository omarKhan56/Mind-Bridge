import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { Users, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Eye, TrendingUp, Brain, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import CounselorAIInsights from '../components/CounselorAIInsights';
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

const StatCard = ({ icon: Icon, title, value, color }) => (
  <motion.div whileHover={{ y: -5, transition: { duration: 0.2 } }}>
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`w-5 h-5 ${color || 'text-gray-500'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  </motion.div>
);

const CounselorDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({});
  const [students, setStudents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [crisisAlerts, setCrisisAlerts] = useState([]);
  
  // New analytics state
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [socket, setSocket] = useState(null);

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
    fetchData();
    loadAnalyticsData();
    
    // Setup crisis alert socket connection for counselors
    if (user && user.role === 'counselor') {
      const newSocket = io('http://localhost:5001', {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });
      
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        console.log('✅ Counselor connected to crisis alert system');
        // Join counselor room for crisis alerts based on college
        const roomData = {
          counselorId: user.id,
          college: user.college,
          role: user.role
        };
        console.log('🏥 Joining counselor room with data:', roomData);
        newSocket.emit('join-counselor-room', roomData);
      });
      
      newSocket.on('crisis_alert', (alertData) => {
        console.log('🚨 Crisis alert received:', alertData);
        
        // Add to crisis alerts list
        setCrisisAlerts(prev => {
          const newAlerts = [alertData, ...prev.slice(0, 9)]; // Keep last 10 alerts
          console.log('📋 Updated crisis alerts count:', newAlerts.length);
          return newAlerts;
        });
        
        // Show browser notification
        if (window.Notification && Notification.permission === 'granted') {
          new Notification('🚨 Crisis Alert', {
            body: `${alertData.studentName || 'A student'} needs immediate attention`,
            icon: '/favicon.ico',
            tag: 'crisis-alert'
          });
        } else if (window.Notification && Notification.permission === 'default') {
          // Request permission if not granted
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('🚨 Crisis Alert', {
                body: `${alertData.studentName || 'A student'} needs immediate attention`,
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
      
      // Request notification permission
      if (window.Notification && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [analyticsRes, studentsRes, appointmentsRes, alertsRes] = await Promise.all([
        axios.get('/api/counselor/analytics', config),
        axios.get('/api/counselor/students', config),
        axios.get('/api/counselor/appointments', config),
        axios.get('/api/counselor/alerts', config)
      ]);
      
      setAnalytics(analyticsRes.data);
      setStudents(studentsRes.data);
      setAppointments(appointmentsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error("Failed to load counselor data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Counselor Dashboard</h1>
          <p className="text-gray-600">Welcome, {user?.name}</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <StatCard icon={Users} title="Total Students" value={analytics?.totalStudents || 0} color="text-blue-500" />
          <StatCard icon={Clock} title="Pending Appointments" value={analytics?.pendingAppointments || 0} color="text-yellow-500" />
          <StatCard icon={CheckCircle} title="Completed Today" value={analytics?.completedToday || 0} color="text-green-500" />
          <StatCard icon={AlertTriangle} title="High-Risk Students" value={analytics?.highRiskStudents || 0} color="text-red-500" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
              <Alert className="border-red-200 bg-red-50 mb-6">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{dashboardData.highRiskUsers.length} students</strong> require immediate attention due to high risk scores.
                </AlertDescription>
              </Alert>
            )}

            {/* High Risk Students and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>High Risk Students</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.highRiskUsers?.slice(0, 5).map((student, index) => (
                      <div key={student.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Student #{student.userId.slice(-6)}</p>
                          <p className="text-sm text-gray-600">Risk Score: {student.riskScore}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {student.factors?.slice(0, 3).map(factor => (
                              <Badge key={factor} variant="secondary" className="text-xs">
                                {factor.replace('_', ' ')}
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
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span>Predictive Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Risk Score</span>
                      <span className="font-semibold">{dashboardData.trends?.averageRiskScore?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Alerts</span>
                      <span className="font-semibold">{dashboardData.trends?.totalAlerts || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Students</span>
                      <span className="font-semibold">{dashboardData.totalUsers || 0}</span>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Brain className="h-4 w-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Crisis Alerts Section */}
        {crisisAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8"
          >
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Crisis Alerts ({crisisAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {crisisAlerts.map((alert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-4 rounded-lg border border-red-200 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive" className="text-xs">
                              URGENT
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">
                              {alert.studentName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {alert.collegeName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                            <span>
                              Method: {alert.detectionMethod}
                            </span>
                            <span>
                              Urgency: {alert.urgency}/5
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline" className="text-xs">
                            Contact
                          </Button>
                          <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700">
                            Respond
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Test Crisis Alert Button (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8"
          >
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Crisis Alert Testing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={testCrisisAlert}
                    variant="outline"
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    🧪 Test Crisis Alert
                  </Button>
                  <p className="text-sm text-yellow-700">
                    Click to test the crisis alert system (Development only)
                  </p>
                </div>
                <div className="mt-3 text-xs text-yellow-600">
                  Socket Status: {socket?.connected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
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
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {alerts.length}
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
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointment Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Appointment Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAppointmentStatusData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getAppointmentStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {getAppointmentStatusData().map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm capitalize">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Student Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Student Risk Levels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getRiskDistributionData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="students" 
                          fill={COLORS.primary}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Total Students</span>
                      </div>
                      <Badge variant="secondary">{analytics.totalStudents || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Completed Sessions</span>
                      </div>
                      <Badge variant="secondary">{analytics.completedAppointments || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium">Pending Appointments</span>
                      </div>
                      <Badge variant="secondary">{analytics.pendingAppointments || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium">High Risk Students</span>
                      </div>
                      <Badge variant="secondary">{analytics.highRiskStudents || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {appointments
                      .filter(apt => apt.status === 'confirmed' || apt.status === 'pending')
                      .slice(0, 4)
                      .map((appointment) => (
                        <div key={appointment._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{appointment.student?.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.appointmentTime}
                            </p>
                          </div>
                          <Badge 
                            variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}
                          >
                            {appointment.status}
                          </Badge>
                        </div>
                      ))}
                    {appointments.filter(apt => apt.status === 'confirmed' || apt.status === 'pending').length === 0 && (
                      <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Student Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <p>No active alerts. All students are doing well!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert._id}
                        className={`p-4 rounded-lg border-l-4 ${
                          alert.priority === 'urgent' ? 'border-red-500 bg-red-50' :
                          alert.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                          alert.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                          'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                alert.priority === 'urgent' ? 'destructive' :
                                alert.priority === 'high' ? 'secondary' :
                                'outline'
                              }>
                                {alert.priority.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(alert.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {alert.student?.name} ({alert.student?.studentId})
                            </h4>
                            <p className="text-gray-700 mb-2">{alert.message}</p>
                            {alert.details && (
                              <p className="text-sm text-gray-600">{alert.details}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('token');
                                  await axios.patch(`/api/counselor/alerts/${alert._id}/resolve`, {}, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  setAlerts(alerts.filter(a => a._id !== alert._id));
                                  toast.success('Alert resolved');
                                } catch (error) {
                                  toast.error('Failed to resolve alert');
                                }
                              }}
                            >
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {appointments.map((appointment) => (
                        <tr key={appointment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{appointment.student?.name}</div>
                            <div className="text-sm text-gray-500">{appointment.student?.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(appointment.appointmentDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">{appointment.appointmentTime}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="capitalize text-sm text-gray-900">{appointment.type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(appointment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {appointment.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAppointmentAction(appointment._id, 'confirm')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAppointmentAction(appointment._id, 'cancel')}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                            {appointment.status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => handleAppointmentAction(appointment._id, 'complete')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Mark Complete
                              </Button>
                            )}
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
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Student List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.department || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.year || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRiskBadge(student.screeningData?.riskLevel)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
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

        {/* AI Insights Tab */}
        {activeTab === 'ai-insights' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  AI-Powered Student Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Student Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student for AI Analysis
                  </label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    value={selectedStudentId || ''}
                  >
                    <option value="">Choose a student...</option>
                    {students.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.name} - {student.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* AI Insights Component */}
                {selectedStudentId && (
                  <CounselorAIInsights studentId={selectedStudentId} />
                )}
                
                {!selectedStudentId && (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a student to view AI-powered insights and analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CounselorDashboard;
