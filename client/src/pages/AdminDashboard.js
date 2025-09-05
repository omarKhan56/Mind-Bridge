import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Users, 
  Activity, 
  FileText, 
  Download, 
  Settings, 
  RefreshCw,
  Clock,
  Shield,
  Zap,
  Target,
  Eye,
  Building,
  Brain,
  BarChart3,
  PieChart,
  LineChart,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar as ChartJSBar, Line as ChartJSLine, Pie as ChartJSPie, Doughnut as ChartJSDoughnut } from 'react-chartjs-2';
import { toast } from 'sonner';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// Analytics Tab Component
const AnalyticsTab = () => {
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data from server');
      
      // Set empty data structure
      setAnalyticsData({
        totalStudents: 0,
        totalAISessions: 0,
        totalAppointments: 0,
        aiAccuracy: 0,
        riskDistribution: { low: 0, moderate: 0, high: 0, critical: 0 },
        departmentBreakdown: [],
        engagementTrends: [],
        screeningResults: {
          phq9: { average: 0 },
          gad7: { average: 0 },
          ghq12: { average: 0 }
        }
      });
    }
  };

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
        <span>Loading analytics...</span>
      </div>
    );
  }

  // Chart data
  const riskDistributionData = {
    labels: ['Low Risk', 'Moderate Risk', 'High Risk', 'Critical Risk'],
    datasets: [{
      data: [
        analyticsData.riskDistribution?.low || 0,
        analyticsData.riskDistribution?.moderate || 0,
        analyticsData.riskDistribution?.high || 0,
        analyticsData.riskDistribution?.critical || 0
      ],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#7C2D12'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const engagementTrendsData = {
    labels: analyticsData.engagementTrends?.map(item => item.date) || [],
    datasets: [
      {
        label: 'AI Sessions',
        data: analyticsData.engagementTrends?.map(item => item.aiSessions) || [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Appointments',
        data: analyticsData.engagementTrends?.map(item => item.appointments) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  };

  const departmentBreakdownData = {
    labels: analyticsData.departmentBreakdown?.map(item => item.department) || [],
    datasets: [{
      label: 'Students',
      data: analyticsData.departmentBreakdown?.map(item => item.count) || [],
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
      ]
    }]
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Students</p>
                <p className="text-3xl font-bold text-blue-900">{analyticsData.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">AI Sessions</p>
                <p className="text-3xl font-bold text-green-900">{analyticsData.totalAISessions}</p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Appointments</p>
                <p className="text-3xl font-bold text-purple-900">{analyticsData.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">AI Accuracy</p>
                <p className="text-3xl font-bold text-orange-900">{analyticsData.aiAccuracy}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Risk Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ChartJSPie 
                data={riskDistributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Students by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ChartJSBar 
                data={departmentBreakdownData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Trends Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Engagement Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartJSLine 
              data={engagementTrendsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mental Health Screening Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Mental Health Screening Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">PHQ-9 (Depression)</h4>
              <p className="text-2xl font-bold">{analyticsData.screeningResults?.phq9?.average || 0}</p>
              <p className="text-sm text-gray-600">Average Score</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">GAD-7 (Anxiety)</h4>
              <p className="text-2xl font-bold">{analyticsData.screeningResults?.gad7?.average || 0}</p>
              <p className="text-sm text-gray-600">Average Score</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">GHQ-12 (General)</h4>
              <p className="text-2xl font-bold">{analyticsData.screeningResults?.ghq12?.average || 0}</p>
              <p className="text-sm text-gray-600">Average Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminDashboard = () => {
// Institutional Analysis Tab Component
const InstitutionalAnalysisTab = () => {
  const [institutionalData, setInstitutionalData] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    loadInstitutionalData();
  }, []);

  const loadInstitutionalData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [institutionalRes, comparisonRes] = await Promise.all([
        axios.get('/api/admin/institutional-analysis', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/institutional-comparison', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setInstitutionalData(institutionalRes.data);
      setComparisonData(comparisonRes.data);
    } catch (error) {
      console.error('Failed to load institutional data:', error);
      toast.error('Failed to load institutional data from server');
      
      // Set empty data
      setInstitutionalData([]);
      setComparisonData({});
    }
  };

  const performanceComparisonData = {
    labels: institutionalData.map(item => item.collegeName),
    datasets: [
      {
        label: 'Total Students',
        data: institutionalData.map(item => item.totalStudents),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'High Risk Students',
        data: institutionalData.map(item => item.highRiskStudents),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      }
    ]
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Institution Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Institution Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ChartJSBar 
              data={performanceComparisonData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Institution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {institutionalData.map((institution) => (
          <Card key={institution.collegeId} className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{institution.collegeName}</span>
                <Badge className={`px-3 py-1 ${getPerformanceColor(institution.performanceScore)}`}>
                  {institution.performanceScore}% Performance
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{institution.totalStudents}</p>
                  <p className="text-sm text-gray-600">Total Students</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{institution.highRiskStudents}</p>
                  <p className="text-sm text-gray-600">High Risk</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{institution.totalSessions}</p>
                  <p className="text-sm text-gray-600">AI Sessions</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{institution.totalAppointments}</p>
                  <p className="text-sm text-gray-600">Appointments</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">📍 Location:</span>
                  <span className="text-sm font-medium">{institution.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">😊 Avg Sentiment:</span>
                  <span className="text-sm font-medium">{institution.avgSentiment}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">⚠️ Risk Level:</span>
                  <Badge className={`text-xs ${
                    institution.avgRiskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    institution.avgRiskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {institution.avgRiskLevel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">Total Institutions</h4>
              <p className="text-3xl font-bold">{institutionalData.length}</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">Total Students</h4>
              <p className="text-3xl font-bold">
                {institutionalData.reduce((sum, inst) => sum + inst.totalStudents, 0)}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">Total Sessions</h4>
              <p className="text-3xl font-bold">
                {institutionalData.reduce((sum, inst) => sum + inst.totalSessions, 0)}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <h4 className="font-semibold text-orange-600 mb-2">Crisis Interventions</h4>
              <p className="text-3xl font-bold">
                {institutionalData.reduce((sum, inst) => sum + inst.interventions, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

  // Core state
  const [activeTab, setActiveTab] = useState('crisis');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Initialize dashboard
  useEffect(() => {
    initializeDashboard();
    setupWebSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(false);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      toast.error('Failed to load dashboard');
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/admin/create-sample-crisis-data', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Created ${response.data.count} sample crisis alerts`);
      
      // Refresh data after creating samples
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to create sample data:', error);
      toast.error('Failed to create sample data: ' + (error.response?.data?.message || error.message));
    }
  };

  const setupWebSocket = () => {
    const newSocket = io('http://localhost:5001/admin', {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Admin WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Admin WebSocket disconnected');
    });

    newSocket.on('crisis-alert', (alert) => {
      console.log('🚨 Real-time crisis alert received:', alert);
      
      // Show immediate notification
      toast.error(`🚨 CRISIS DETECTED: ${alert.student?.name || 'Student'} at ${alert.student?.college || 'Unknown College'}`, {
        duration: 15000,
        action: {
          label: 'View Crisis',
          onClick: () => setActiveTab('crisis')
        }
      });
      
      // Auto-refresh crisis data if on crisis tab
      if (activeTab === 'crisis') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });

    newSocket.on('dashboard-update', () => {
      setLastUpdate(new Date());
    });

    setSocket(newSocket);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🧠 MindBridge Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Mental Health Platform Administration • Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={createSampleData}
                className="bg-green-50 hover:bg-green-100 text-green-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Create Sample Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'crisis', label: 'Crisis Management', icon: AlertTriangle },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'institutional', label: 'Institutional Analysis', icon: Building }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
            <span className="text-lg text-gray-600">Loading dashboard data...</span>
          </div>
        )}

        {/* Tab Content */}
        {!loading && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Crisis Management Tab */}
            {activeTab === 'crisis' && <CrisisManagementTab socket={socket} />}
            
            {/* Analytics Tab */}
            {activeTab === 'analytics' && <AnalyticsTab />}
            
            {/* Institutional Analysis Tab */}
            {activeTab === 'institutional' && <InstitutionalAnalysisTab />}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

// Crisis Management Tab Component
const CrisisManagementTab = ({ socket }) => {
  const [crisisAlerts, setCrisisAlerts] = useState([]);
  const [crisisStats, setCrisisStats] = useState({
    active: 0,
    resolved: 0,
    avgResponseTime: 0,
    criticalStudents: 0
  });

  useEffect(() => {
    loadCrisisData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadCrisisData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time crisis alerts
  useEffect(() => {
    const handleCrisisAlert = (alertData) => {
      console.log('🚨 Real-time crisis alert received in Crisis tab:', alertData);
      
      // Immediately refresh crisis data
      loadCrisisData();
      
      // Show notification
      toast.error(`🚨 NEW CRISIS: ${alertData.student?.name || 'Student'} needs immediate attention!`, {
        duration: 10000,
        action: {
          label: 'Refresh',
          onClick: () => loadCrisisData()
        }
      });
    };

    // Listen for crisis alerts if socket exists
    if (socket) {
      socket.on('crisis-alert', handleCrisisAlert);
      
      return () => {
        socket.off('crisis-alert', handleCrisisAlert);
      };
    }
  }, [socket]);

  const loadCrisisData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [alertsRes, statsRes] = await Promise.all([
        axios.get('/api/admin/crisis-alerts', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/admin/crisis-stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setCrisisAlerts(alertsRes.data);
      setCrisisStats(statsRes.data);
      
      console.log(`✅ Crisis data refreshed: ${alertsRes.data.length} alerts, ${statsRes.data.active} active`);
    } catch (error) {
      console.error('Failed to load crisis data:', error);
      toast.error('Failed to load crisis data from server');
      
      // Set empty data instead of fallback
      setCrisisAlerts([]);
      setCrisisStats({
        active: 0,
        resolved: 0,
        avgResponseTime: 0,
        criticalStudents: 0
      });
    }
  };

  const handleCrisisResponse = async (alertId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/admin/crisis-alerts/${alertId}/respond`, 
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (action === 'acknowledge') {
        toast.success(`Crisis alert acknowledged! ${response.data.counselorsNotified} counselors notified.`, {
          duration: 5000
        });
      } else {
        toast.success(`Crisis alert ${action}ed successfully`);
      }
      
      // Immediately refresh crisis data
      await loadCrisisData();
      
    } catch (error) {
      console.error('Failed to respond to crisis:', error);
      toast.error('Failed to respond to crisis alert');
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Crisis Management</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live Updates</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCrisisData}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Now
        </Button>
      </div>

      {/* Crisis Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Active Crisis Alerts</p>
                <p className="text-3xl font-bold text-red-900">{crisisStats.active}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Resolved Today</p>
                <p className="text-3xl font-bold text-green-900">{crisisStats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Avg Response Time</p>
                <p className="text-3xl font-bold text-blue-900">{crisisStats.avgResponseTime}m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Critical Students</p>
                <p className="text-3xl font-bold text-purple-900">{crisisStats.criticalStudents}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Crisis Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Active Crisis Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {crisisAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No active crisis alerts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {crisisAlerts.map((alert) => (
                <div key={alert._id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getRiskColor(alert.riskLevel)}>
                          {(alert.riskLevel || 'unknown').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Student ID: {String(alert.studentId || 'Anonymous')}
                      </h4>
                      <p className="text-gray-700 mb-3">{String(alert.message || 'No message available')}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>📍 {String(typeof alert.college === 'object' ? alert.college?.name || 'Unknown College' : alert.college || 'Unknown College')}</span>
                        <span>🎯 Confidence: {Number(alert.confidence || 0)}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCrisisResponse(alert._id, 'acknowledge')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCrisisResponse(alert._id, 'resolve')}
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

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-red-600 mb-2">Crisis Hotline</h4>
              <p className="text-2xl font-bold">988</p>
              <p className="text-sm text-gray-600">24/7 National Suicide Prevention</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">Campus Security</h4>
              <p className="text-2xl font-bold">911</p>
              <p className="text-sm text-gray-600">Emergency Services</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">Crisis Text Line</h4>
              <p className="text-2xl font-bold">741741</p>
              <p className="text-sm text-gray-600">Text HOME for support</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
