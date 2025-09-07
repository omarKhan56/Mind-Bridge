import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Heart, Users, Shield, MessageCircle, Calendar, BookOpen, TrendingUp, Bell, Target, Activity, User, Sparkles, Award, Plus } from '../components/Icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import axios from 'axios';
import io from 'socket.io-client';
import StudentMessaging from '../components/StudentMessaging';
import WellnessTracker from '../components/WellnessTracker';
import WellnessButton from '../components/WellnessButton';
import WellnessRecommendations from '../components/WellnessRecommendations';
import AIInsights from '../components/AIInsights';
import StudentMessages from '../components/StudentMessages';
import analyticsService from '../services/analyticsService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  
  // Socket connection state
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Simple messaging modal state
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Helper function to safely render values
  const safeRender = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (value.progressPercentage !== undefined) return value.progressPercentage;
      if (value.overallProgress !== undefined) return value.overallProgress;
      if (value.title !== undefined) return value.title;
      if (value.description !== undefined) return value.description;
      return JSON.stringify(value);
    }
    return value;
  };

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [aiSessions, setAiSessions] = useState([]);
  const [wellnessData, setWellnessData] = useState([]);
  const [showWellnessTracker, setShowWellnessTracker] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [dailyMood, setDailyMood] = useState(null);
  const [currentGoals, setCurrentGoals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [todaysTip, setTodaysTip] = useState('');

  // Chart colors
  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#8B5CF6',
    warning: '#F59E0B',
    danger: '#EF4444',
    success: '#22C55E',
    info: '#06B6D4'
  };

  // Enhanced chart data processing
  const getWellnessTrendData = () => {
    if (!Array.isArray(wellnessData) || wellnessData.length === 0) {
      return []; // Return empty array instead of sample data
    }
    return wellnessData.slice(-7).map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mood: entry.mood || 0,
      stress: entry.stress || 0,
      sleep: entry.sleep || 0,
      energy: entry.energy || 0
    }));
  };

  const getAppointmentStatusData = () => {
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return []; // Return empty array instead of sample data
    }
    
    const statusCounts = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'completed' ? COLORS.success : 
             status === 'pending' ? COLORS.warning : 
             status === 'cancelled' ? COLORS.danger : COLORS.primary
    }));
  };

  const getGoalProgressData = () => {
    if (!Array.isArray(currentGoals) || currentGoals.length === 0) {
      return []; // Return empty array instead of sample data
    }
    return currentGoals.slice(0, 4).map(goal => {
      const progress = typeof goal.progress === 'number' ? goal.progress : 
                      (typeof goal.progress === 'object' && goal.progress?.progressPercentage) ? goal.progress.progressPercentage : 0;
      
      return {
        name: goal.title.length > 10 ? goal.title.substring(0, 10) + '...' : goal.title,
        progress: progress,
        target: 100,
        color: progress >= 80 ? COLORS.success : 
               progress >= 50 ? COLORS.warning : COLORS.danger
      };
    });
  };

  const getWeeklyActivityData = () => {
    // Return empty array - will be populated by real API data when available
    return [];
  };

  const getMoodDistributionData = () => {
    // Return empty array - will be populated by real API data when available  
    return [];
  };

  // Load AI insights with real backend data
  const loadAiInsights = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get comprehensive AI analysis from backend
      const [insightsResponse, analysisResponse] = await Promise.all([
        axios.get('/api/ai-analysis/insights', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/ai-analysis/user', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Combine real data from both endpoints
      const insights = insightsResponse.data;
      const analysis = analysisResponse.data;

      setAiInsights({
        // Real insights from backend
        personalInsights: insights.personalInsights || analysis.insights?.keyInsights || [],
        progressSummary: insights.progressSummary || analysis.insights?.progressSummary || "Analysis in progress...",
        recommendations: insights.recommendations || analysis.insights?.personalizedRecommendations || [],
        motivationalMessage: insights.motivationalMessage || analysis.insights?.motivationalMessage || "",
        overallStatus: insights.overallStatus || analysis.summary?.overallStatus || "stable",
        
        // Real detailed analysis from backend
        detailedAnalysis: {
          moodTrends: {
            current: analysis.patterns?.moodPatterns?.averageMood || 0,
            previous: analysis.patterns?.moodPatterns?.previousAverage || 0,
            trend: analysis.patterns?.moodPatterns?.trend || "stable",
            insights: analysis.patterns?.moodPatterns?.insights || ""
          },
          stressManagement: {
            level: analysis.patterns?.stressPatterns?.averageLevel || "unknown",
            triggers: analysis.patterns?.stressPatterns?.commonTriggers || [],
            copingStrategies: analysis.patterns?.copingStrategies || [],
            effectiveness: analysis.patterns?.copingEffectiveness || 0
          },
          sleepQuality: {
            average: analysis.patterns?.sleepPatterns?.averageQuality || 0,
            consistency: analysis.patterns?.sleepPatterns?.consistency || 0,
            optimalRange: analysis.patterns?.sleepPatterns?.optimalRange || "7-8 hours",
            impact: analysis.patterns?.sleepPatterns?.moodCorrelation || ""
          },
          engagementMetrics: {
            aiChatSessions: analysis.overview?.totalSessions || 0,
            wellnessEntries: analysis.overview?.wellnessEntries || 0,
            resourcesAccessed: analysis.overview?.resourcesAccessed || 0,
            consistencyScore: analysis.progressIndicators?.engagementLevel || 0
          },
          riskFactors: {
            level: analysis.riskAssessment?.currentLevel || "unknown",
            factors: analysis.riskAssessment?.riskFactors || [],
            protectiveFactors: analysis.riskAssessment?.protectiveFactors || []
          },
          personalGrowth: {
            emotionalAwareness: analysis.progressIndicators?.emotionalAwareness || 0,
            copingSkills: analysis.progressIndicators?.copingSkills || 0,
            selfAdvocacy: analysis.progressIndicators?.selfAdvocacy || 0,
            resilience: analysis.progressIndicators?.resilience || 0
          }
        },
        
        // Real next steps and achievements
        nextSteps: insights.nextSteps || analysis.insights?.nextSteps || [],
        achievements: analysis.achievements || []
      });

    } catch (error) {
      console.error('Failed to load AI insights:', error);
      
      // Only show error state, no mock data
      setAiInsights({
        error: true,
        message: "Unable to load AI insights. Please try again later.",
        personalInsights: [],
        recommendations: [],
        progressSummary: "AI analysis temporarily unavailable",
        motivationalMessage: "Keep up the great work with your wellness journey!",
        overallStatus: "unknown",
        detailedAnalysis: null,
        nextSteps: [],
        achievements: []
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    loadUserAnalysis();
    loadDashboardData();
    loadAppointments();
    loadGoals();
    loadWellnessData();
    loadAiInsights(); // Add AI insights loading
  }, []);

  const loadWellnessData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wellness/trends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWellnessData(response.data);
    } catch (error) {
      console.error('Failed to load wellness data:', error);
      setWellnessData([]);
    }
  };

  // Refresh wellness data when component mounts or when new entries are added
  useEffect(() => {
    const handleWellnessUpdate = () => {
      loadWellnessData();
    };
    
    window.addEventListener('wellnessUpdated', handleWellnessUpdate);
    return () => window.removeEventListener('wellnessUpdated', handleWellnessUpdate);
  }, []);

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/appointments/my-appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  };

  const loadGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/goals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const loadUserAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/analysis', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalysis(response.data);
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load goals
      const goalsResponse = await axios.get('/api/goals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentGoals(goalsResponse.data);

      // Load recent AI sessions for activity
      const sessionsResponse = await axios.get('/api/ai-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Convert sessions to activity format
      const activities = sessionsResponse.data.slice(0, 3).map(session => ({
        type: 'chat',
        title: `AI Session - ${session.mood || 'General'} support`,
        time: new Date(session.createdAt).toLocaleDateString(),
        icon: '💬',
        description: `${session.messages?.length || 0} messages exchanged`
      }));
      
      setRecentActivity(activities);
      
      // Generate notifications based on user data
      generateNotifications(sessionsResponse.data, goalsResponse.data);
      
      // Set today's tip based on user concerns
      generateTodaysTip();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Fallback to empty data
      setCurrentGoals([]);
      setRecentActivity([]);
      setNotifications([]);
    }
  };

  const generateNotifications = (sessions, goals) => {
    const notifications = [];
    
    // Check for recent sessions
    const recentSession = sessions[0];
    if (recentSession) {
      const daysSinceLastSession = Math.floor((Date.now() - new Date(recentSession.createdAt)) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSession > 3) {
        notifications.push({
          type: 'reminder',
          message: `It's been ${daysSinceLastSession} days since your last AI session. How are you feeling?`,
          priority: 'medium'
        });
      }
    }
    
    // Check goal progress
    const completedGoals = goals.filter(goal => {
      const progress = typeof goal.progress === 'number' ? goal.progress : 
                      (typeof goal.progress === 'object' && goal.progress?.progressPercentage) ? goal.progress.progressPercentage : 0;
      return progress >= 100;
    });
    if (completedGoals.length > 0) {
      notifications.push({
        type: 'achievement',
        message: `🎉 Congratulations! You've completed ${completedGoals.length} goal(s) this week!`,
        priority: 'high'
      });
    }
    
    // Check for goals behind schedule
    const behindGoals = goals.filter(goal => {
      const progress = typeof goal.progress === 'number' ? goal.progress : 
                      (typeof goal.progress === 'object' && goal.progress?.progressPercentage) ? goal.progress.progressPercentage : 0;
      return progress < 50;
    });
    if (behindGoals.length > 0) {
      notifications.push({
        type: 'reminder',
        message: `You have ${behindGoals.length} goal(s) that could use some attention this week.`,
        priority: 'low'
      });
    }
    
    setNotifications(notifications);
  };

  const generateTodaysTip = () => {
    const tips = [
      "Practice the 4-7-8 breathing technique: Breathe in for 4 counts, hold for 7, exhale for 8.",
      "Take a 5-minute walk outside to boost your mood and energy levels.",
      "Write down three things you're grateful for today.",
      "Try the 5-4-3-2-1 grounding technique when feeling anxious.",
      "Set a small, achievable goal for today and celebrate when you complete it."
    ];
    
    // Use analysis data to personalize tip
    if (analysis?.topConcerns?.length > 0) {
      const primaryConcern = analysis.topConcerns[0].concern;
      
      if (primaryConcern.includes('Anxiety')) {
        setTodaysTip("Try the 5-4-3-2-1 grounding technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.");
      } else if (primaryConcern.includes('Sleep')) {
        setTodaysTip("Create a bedtime routine: No screens 1 hour before bed, dim lights, and try reading or gentle stretching.");
      } else if (primaryConcern.includes('Stress')) {
        setTodaysTip("Take regular breaks today. Even 2-3 minutes of deep breathing can help reset your stress levels.");
      } else {
        setTodaysTip(tips[Math.floor(Math.random() * tips.length)]);
      }
    } else {
      setTodaysTip(tips[Math.floor(Math.random() * tips.length)]);
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    const userName = user?.name?.split(' ')[0] || 'there';
    
    if (!analysis || !analysis.overview.totalSessions) {
      return `${timeOfDay}, ${userName}! 🌟`;
    }
    
    const { progressIndicators } = analysis;
    
    if (progressIndicators.overallTrend === 'improving') {
      return `${timeOfDay}, ${userName}! 📈`;
    } else if (progressIndicators.overallTrend === 'declining') {
      return `${timeOfDay}, ${userName} 💙`;
    } else {
      return `${timeOfDay}, ${userName}! ✨`;
    }
  };

  // Edit message function
  const editMessage = async (messageId, newContent) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/messages/${messageId}`, {
        content: newContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.messageId === messageId 
          ? { ...msg, message: newContent, isEdited: true }
          : msg
      ));
      
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message. ' + (error.response?.data?.message || 'Please try again.'));
    }
  };

  // Delete message function
  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/messages/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. ' + (error.response?.data?.message || 'Please try again.'));
    }
  };

  // Initialize Socket.IO connection for notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user) {
      const newSocket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');
        setIsConnected(true);
        
        // Join user room for receiving messages
        newSocket.emit('join-user-room', {
          userId: user.id,
          role: user.role
        });
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
        setIsConnected(false);
      });

      // Listen for new messages to update unread count
      newSocket.on('new_message', (message) => {
        console.log('📨 New message received:', message);
        setUnreadCount(prev => prev + 1);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Add messaging state

  // Add counselor selection state
  const [availableCounselors, setAvailableCounselors] = useState([]);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messagePriority, setMessagePriority] = useState('normal');

  // Load available counselors
  const loadAvailableCounselors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/available-counselors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableCounselors(response.data || []);
    } catch (error) {
      console.error('Failed to load counselors:', error);
      setAvailableCounselors([]);
    }
  };

  // Send message to specific counselor with real-time Socket.IO
  const sendMessageToCounselor = async () => {
    if (!newMessage.trim() || !selectedCounselor) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // First create the conversation and message via API
      const response = await axios.post('/api/messages/send-to-counselor', {
        counselorId: selectedCounselor._id,
        subject: messageSubject || 'Student Message',
        message: newMessage,
        priority: messagePriority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add message to local state immediately
      const newMsg = {
        message: newMessage,
        sender: 'student',
        createdAt: new Date().toISOString(),
        messageId: response.data._id,
        canEdit: true,
        status: 'sending'
      };
      
      setMessages(prev => [...prev, newMsg]);
      
      // Send via Socket.IO for real-time delivery
      if (socket && isConnected) {
        socket.emit('send-message', {
          conversationId: response.data.conversation,
          senderId: user.id,
          recipientId: selectedCounselor._id,
          content: newMessage,
          priority: messagePriority
        });
      }
      
      setNewMessage('');
      setMessageSubject('');
      
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Add edit/delete message states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Add AI insights state
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  // Load messages on component mount only
  useEffect(() => {
    // Messages are now handled by StudentMessaging component
  }, []); // Only load once on mount

  // Only refresh when modal opens (to get latest messages)
  useEffect(() => {
    if (showMessagingModal) {
      // Messages are now handled by StudentMessaging component
    }
  }, [showMessagingModal]); // Only when modal state changes

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Send message to all counselors from the same college
      await axios.post('/api/messages/send-to-counselors', {
        message: newMessage,
        sender: 'student',
        messageType: 'counselor_broadcast'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage('');
      // Messages are now handled by StudentMessaging component
      
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const AIInsightsCard = () => (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, purple 2px, transparent 2px)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <motion.div 
              className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Brain className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                AI Insights
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">Powered by advanced AI</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          </CardTitle>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        {insightsLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div 
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
            </motion.div>
            <p className="mt-4 text-purple-600 font-medium">Analyzing your wellness data...</p>
            <p className="text-sm text-gray-500 mt-1">Processing real-time insights from your activities</p>
          </div>
        ) : aiInsights?.error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-red-600 font-medium mb-2">{aiInsights.message}</p>
            <Button 
              onClick={loadAiInsights} 
              variant="outline" 
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Retry Analysis
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, staggerChildren: 0.1 }}
            className="space-y-6"
          >
            {/* Progress Summary with Enhanced Visual */}
            <motion.div 
              className="relative p-6 bg-gradient-to-r from-white/80 to-purple-50/80 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start justify-between mb-4">
                <h4 className="font-bold text-purple-900 text-lg flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  Your Progress Journey
                </h4>
                <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                  aiInsights?.overallStatus === 'improving' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                  aiInsights?.overallStatus === 'stable' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' :
                  'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                }`}>
                  {aiInsights?.overallStatus === 'improving' ? '📈 Improving' :
                   aiInsights?.overallStatus === 'stable' ? '➡️ Stable' : '⚠️ Focus Needed'}
                </div>
              </div>
              <p className="text-purple-800 leading-relaxed">{safeRender(aiInsights?.progressSummary)}</p>
              
              {/* Progress Visualization */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: aiInsights?.overallStatus === 'improving' ? '85%' : '65%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-sm font-semibold text-purple-700">
                  {aiInsights?.overallStatus === 'improving' ? '85%' : '65%'}
                </span>
              </div>
            </motion.div>

            {/* Detailed Metrics Dashboard - Only show if real data available */}
            {aiInsights?.detailedAnalysis && (
            <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Mood Trends */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-blue-900 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Mood Trends
                  </h5>
                  <span className="text-2xl font-bold text-blue-700">
                    {aiInsights?.detailedAnalysis?.moodTrends?.current || '7.2'}/10
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Previous</span>
                    <span className="text-blue-800">{aiInsights?.detailedAnalysis?.moodTrends?.previous || '6.1'}/10</span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    {aiInsights?.detailedAnalysis?.moodTrends?.insights || 'Mood stability improving'}
                  </p>
                </div>
              </div>

              {/* Sleep Quality */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-indigo-900 flex items-center gap-2">
                    <span>😴</span>
                    Sleep Quality
                  </h5>
                  <span className="text-2xl font-bold text-indigo-700">
                    {aiInsights?.detailedAnalysis?.sleepQuality?.average || '7.1'}/10
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-600">Consistency</span>
                    <span className="text-indigo-800">{aiInsights?.detailedAnalysis?.sleepQuality?.consistency || '82'}%</span>
                  </div>
                  <div className="w-full bg-indigo-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                  <p className="text-xs text-indigo-700 mt-2">
                    Optimal: {aiInsights?.detailedAnalysis?.sleepQuality?.optimalRange || '7-8 hours'}
                  </p>
                </div>
              </div>

              {/* Stress Management */}
              <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-orange-900 flex items-center gap-2">
                    <span>⚡</span>
                    Stress Level
                  </h5>
                  <span className="text-sm font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                    {aiInsights?.detailedAnalysis?.stressManagement?.level || 'Moderate'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">Coping Effectiveness</span>
                    <span className="text-orange-800">{aiInsights?.detailedAnalysis?.stressManagement?.effectiveness || '75'}%</span>
                  </div>
                  <div className="w-full bg-orange-100 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-orange-700 mt-2">
                    Top triggers: Academic deadlines, Social situations
                  </p>
                </div>
              </div>

              {/* Engagement Score */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-green-900 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Engagement
                  </h5>
                  <span className="text-2xl font-bold text-green-700">
                    {aiInsights?.detailedAnalysis?.engagementMetrics?.consistencyScore || '85'}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">AI Sessions</span>
                    <span className="text-green-800">{aiInsights?.detailedAnalysis?.engagementMetrics?.aiChatSessions || '12'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Wellness Entries</span>
                    <span className="text-green-800">{aiInsights?.detailedAnalysis?.engagementMetrics?.wellnessEntries || '18'}</span>
                  </div>
                  <div className="w-full bg-green-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>
            )}

            {/* Personal Growth Assessment - Only show if real data available */}
            {aiInsights?.detailedAnalysis?.personalGrowth && (
            <motion.div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 mb-6">
              <h4 className="font-bold text-teal-900 text-lg mb-4 flex items-center gap-2">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                Personal Growth Assessment
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Emotional Awareness', value: aiInsights?.detailedAnalysis?.personalGrowth?.emotionalAwareness || 78, color: 'bg-teal-500' },
                  { label: 'Coping Skills', value: aiInsights?.detailedAnalysis?.personalGrowth?.copingSkills || 72, color: 'bg-blue-500' },
                  { label: 'Self Advocacy', value: aiInsights?.detailedAnalysis?.personalGrowth?.selfAdvocacy || 85, color: 'bg-purple-500' },
                  { label: 'Resilience', value: aiInsights?.detailedAnalysis?.personalGrowth?.resilience || 80, color: 'bg-green-500' }
                ].map((skill, index) => (
                  <div key={index} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="2"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${skill.value}, 100`}
                          className={`text-teal-500`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-teal-700">{skill.value}%</span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-teal-800">{skill.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            )}

            {/* Achievements Section - Only show if real data available */}
            {aiInsights?.achievements && aiInsights.achievements.length > 0 && (
            <motion.div className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100 mb-6">
              <h4 className="font-bold text-yellow-900 text-lg mb-4 flex items-center gap-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                Recent Achievements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(aiInsights?.achievements || []).map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">🏆</span>
                    </div>
                    <p className="text-yellow-800 font-medium text-sm">{safeRender(achievement)}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            )}

            {/* Next Steps & Action Plan - Only show if real data available */}
            {aiInsights?.nextSteps && aiInsights.nextSteps.length > 0 && (
            <motion.div className="p-6 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-slate-100 mb-6">
              <h4 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Target className="w-5 h-5 text-slate-600" />
                </div>
                Your Action Plan
              </h4>
              <div className="space-y-3">
                {(aiInsights?.nextSteps || []).map((step, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white/80 rounded-lg border border-slate-100">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 font-medium">{safeRender(step)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50">
                      Schedule
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
            )}

            {/* Enhanced Key Insights */}
            <motion.div>
              <h4 className="font-bold text-purple-900 text-lg mb-4 flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                Key Insights
              </h4>
              <div className="grid gap-3">
                {(aiInsights?.personalInsights || []).slice(0, 3).map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group p-4 bg-gradient-to-r from-white/70 to-indigo-50/70 rounded-xl border border-indigo-100 hover:border-indigo-200 hover:shadow-md transition-all duration-300 cursor-pointer"
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <p className="text-indigo-800 leading-relaxed group-hover:text-indigo-900 transition-colors">
                        {safeRender(insight)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recommendations with Action-Oriented Design */}
            <motion.div>
              <h4 className="font-bold text-purple-900 text-lg mb-4 flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                Personalized Recommendations
              </h4>
              <div className="space-y-3">
                {(aiInsights?.recommendations || []).slice(0, 3).map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className="group p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-xl border border-green-100 hover:border-green-200 hover:shadow-lg transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm group-hover:shadow-md transition-shadow">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="text-green-800 font-medium leading-relaxed">
                          {safeRender(rec)}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-700 hover:bg-green-100"
                      >
                        Try Now
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Enhanced Motivational Message */}
            {aiInsights?.motivationalMessage && (
              <motion.div 
                className="relative p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 rounded-2xl border border-orange-100 shadow-sm overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-pink-200/30 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-orange-900 text-lg">Daily Motivation</span>
                  </div>
                  <blockquote className="text-orange-800 text-lg font-medium italic leading-relaxed">
                    "{safeRender(aiInsights.motivationalMessage)}"
                  </blockquote>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={loadAiInsights} 
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
              >
                <Brain className="w-5 h-5 mr-2" />
                Refresh Insights
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat with AI
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );

  const MessagingModal = () => (
    <div className={`fixed inset-0 z-50 ${showMessagingModal ? 'block' : 'hidden'}`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setShowMessagingModal(false)}
      ></div>
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-6xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Counselor Chat</h3>
                  <p className="text-sm text-blue-100">Secure & confidential messaging</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessagingModal(false)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <span className="text-white text-lg">×</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Counselor List Sidebar */}
            <div className="w-1/3 bg-gray-50 border-r overflow-y-auto">
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Available Counselors</h4>
                {availableCounselors.length > 0 ? (
                  <div className="space-y-2">
                    {availableCounselors.map((counselor) => (
                      <div
                        key={counselor._id}
                        onClick={() => setSelectedCounselor(counselor)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedCounselor?._id === counselor._id
                            ? 'bg-blue-100 border-blue-300'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {counselor.name.charAt(0)}
                              </span>
                            </div>
                            {counselor.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{counselor.name}</p>
                            <p className="text-xs text-gray-500 truncate">{counselor.specialization || 'General Counseling'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No counselors available</p>
                    <p className="text-gray-400 text-xs mt-1">Please try again later</p>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedCounselor ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {selectedCounselor.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">{selectedCounselor.name}</h5>
                        <p className="text-sm text-gray-500">{selectedCounselor.specialization}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((message, index) => (
                          <motion.div
                            key={message.messageId || index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative group ${
                              message.sender === 'student'
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-white border shadow-sm rounded-bl-md'
                            }`}>
                              {/* Show counselor name for counselor messages */}
                              {message.sender !== 'student' && message.counselorName && (
                                <p className="text-xs font-semibold text-blue-600 mb-1">
                                  {message.counselorName}
                                </p>
                              )}
                              
                              {/* Message content or edit input */}
                              {editingMessageId === message.messageId ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingText}
                                    onChange={(e) => setEditingText(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        editMessage(message.messageId, editingText);
                                      } else if (e.key === 'Escape') {
                                        setEditingMessageId(null);
                                        setEditingText('');
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => editMessage(message.messageId, editingText)}
                                      className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditingText('');
                                      }}
                                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm leading-relaxed">
                                    {message.message}
                                    {message.isEdited && (
                                      <span className={`text-xs ml-2 ${
                                        message.sender === 'student' ? 'text-blue-200' : 'text-gray-400'
                                      }`}>
                                        (edited)
                                      </span>
                                    )}
                                  </p>
                                  
                                  {/* Message actions - show on hover for own messages */}
                                  {message.canEdit && (
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingMessageId(message.messageId);
                                            setEditingText(message.message);
                                          }}
                                          className="w-6 h-6 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-xs"
                                          title="Edit message"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => deleteMessage(message.messageId)}
                                          className="w-6 h-6 bg-black/20 hover:bg-red-500 rounded-full flex items-center justify-center text-xs"
                                          title="Delete message"
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              
                              <p className={`text-xs mt-2 ${
                                message.sender === 'student' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                                {message.status && message.sender === 'student' && (
                                  <span className="ml-2">
                                    {message.status === 'sent' ? '✓' : message.status === 'delivered' ? '✓✓' : ''}
                                  </span>
                                )}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                          <MessageCircle className="w-8 h-8 text-blue-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h4>
                        <p className="text-gray-500 text-sm max-w-sm">
                          Send a message to {selectedCounselor.name} to begin your confidential chat.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 bg-white border-t">
                    {/* Message Options */}
                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        placeholder="Subject (optional)"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={messagePriority}
                        onChange={(e) => setMessagePriority(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && newMessage.trim() && selectedCounselor) {
                            e.preventDefault();
                            sendMessageToCounselor();
                          }
                        }}
                        autoComplete="off"
                        spellCheck="false"
                        disabled={!selectedCounselor}
                      />
                      <button
                        onClick={sendMessageToCounselor}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!newMessage.trim() || !selectedCounselor}
                        type="button"
                      >
                        Send
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Messages are encrypted and confidential
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Select a Counselor</h4>
                    <p className="text-gray-500 text-sm">
                      Choose a counselor from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  const CounselorMessaging = () => (
    <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 cursor-pointer"
          onClick={() => setShowMessagingModal(true)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{unreadCount}</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Counselor Messages</h4>
              <p className="text-sm text-blue-600">
                {unreadCount > 0 ? 
                  `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 
                  'No new messages'
                }
              </p>
            </div>
          </div>
          <div className="text-blue-500">
            <span className="text-sm font-medium">Open Chat</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  const WellnessTrendChart = () => (
    <Card className="col-span-2 border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Wellness Trends
            </span>
            <span className="text-sm text-gray-500 block font-normal">Last 7 Days</span>
          </div>
        </CardTitle>
        <CardDescription className="text-base text-gray-600 mt-2">
          Track your mood, stress, sleep, and energy levels over time
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-700">Mood</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-gray-700">Stress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-gray-700">Sleep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm font-medium text-gray-700">Energy</span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={350}>
          {getWellnessTrendData().length > 0 ? (
          <AreaChart data={getWellnessTrendData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.6} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              dy={10}
            />
            <YAxis 
              domain={[0, 10]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '16px'
              }}
              labelStyle={{ color: '#374151', fontWeight: '600', marginBottom: '8px' }}
              formatter={(value, name) => [
                `${value}/10`,
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Area
              type="monotone"
              dataKey="mood"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#moodGradient)"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="#f97316"
              strokeWidth={3}
              fill="url(#energyGradient)"
              dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2, fill: 'white' }}
            />
            <Area
              type="monotone"
              dataKey="sleep"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#sleepGradient)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'white' }}
            />
            <Area
              type="monotone"
              dataKey="stress"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#stressGradient)"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: 'white' }}
            />
          </AreaChart>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium">No wellness data yet</p>
                <p className="text-sm text-gray-400 mt-1">Start tracking your wellness to see trends</p>
              </div>
            </div>
          )}
        </ResponsiveContainer>
        
        {/* Quick Insights */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const data = getWellnessTrendData();
            const latest = data[data.length - 1] || {};
            const previous = data[data.length - 2] || {};
            
            return [
              { key: 'mood', label: 'Mood', color: 'text-green-600', bg: 'bg-green-50' },
              { key: 'energy', label: 'Energy', color: 'text-orange-600', bg: 'bg-orange-50' },
              { key: 'sleep', label: 'Sleep', color: 'text-blue-600', bg: 'bg-blue-50' },
              { key: 'stress', label: 'Stress', color: 'text-red-600', bg: 'bg-red-50' }
            ].map(({ key, label, color, bg }) => {
              const current = latest[key] || 0;
              const prev = previous[key] || 0;
              const change = current - prev;
              const isImproving = key === 'stress' ? change < 0 : change > 0;
              
              return (
                <div key={key} className={`p-3 rounded-lg ${bg} border border-opacity-20`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <span className={`text-xs ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
                      {change > 0 ? '↗' : change < 0 ? '↘' : '→'}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${color} mt-1`}>
                    {current.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {change !== 0 && `${change > 0 ? '+' : ''}${change.toFixed(1)} from yesterday`}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </CardContent>
    </Card>
  );

  const AppointmentStatusChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Appointments
        </CardTitle>
        <CardDescription>Your appointment history</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={getAppointmentStatusData()}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
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
        <div className="flex justify-center gap-4 mt-4">
          {getAppointmentStatusData().map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm text-gray-600">{entry.name}</span>
              <span className="text-sm font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const WeeklyActivityChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Weekly Activity
        </CardTitle>
        <CardDescription>Your wellness activities this week</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={getWeeklyActivityData()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px' 
              }} 
            />
            <Bar dataKey="aiChats" stackId="a" fill={COLORS.primary} radius={[0, 0, 0, 0]} />
            <Bar dataKey="exercises" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} />
            <Bar dataKey="journaling" stackId="a" fill={COLORS.accent} radius={[0, 0, 0, 0]} />
            <Bar dataKey="meditation" stackId="a" fill={COLORS.info} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-blue-500`}></div>
            <span className="text-sm text-gray-600">AI Chats</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-green-500`}></div>
            <span className="text-sm text-gray-600">Exercise</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-purple-500`}></div>
            <span className="text-sm text-gray-600">Journaling</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-cyan-500`}></div>
            <span className="text-sm text-gray-600">Meditation</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MoodDistributionChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" />
          Mood Distribution
        </CardTitle>
        <CardDescription>Your emotional patterns this month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={getMoodDistributionData()} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" stroke="#666" fontSize={12} />
            <YAxis dataKey="mood" type="category" stroke="#666" fontSize={12} width={60} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px' 
              }} 
            />
            <Bar dataKey="count" fill={(entry) => entry.color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm border-gray-200/50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div 
            className="py-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute flex items-center justify-center w-6 h-6 bg-green-500 border-2 border-white rounded-full -bottom-1 -right-1">
                    <Heart className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text">
                    {getWelcomeMessage()} 👋
                  </h1>
                  <p className="mt-1 text-gray-600">Track your wellness journey with detailed insights</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Bell className="w-4 h-4 mr-2" />
                  {notifications.length + unreadCount}
                </Button>
                <Button onClick={() => setShowWellnessTracker(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Wellness
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 py-8 mx-auto max-w-[1400px] sm:px-6 lg:px-8">
        {/* Stats Cards - Full Width Priority */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <Card className="text-white transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl hover:scale-105">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-blue-100">AI Sessions</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{aiSessions.length || 0}</p>
                    <p className="mt-1 text-xs text-blue-100">Total sessions</p>
                  </div>
                  <Brain className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="text-white transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 hover:shadow-xl hover:scale-105">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-green-100">Wellness Score</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      {(() => {
                        if (!Array.isArray(wellnessData) || wellnessData.length === 0) return '0%';
                        const latestEntry = wellnessData[wellnessData.length - 1];
                        const moodValue = typeof latestEntry?.mood === 'number' ? latestEntry.mood : 0;
                        return `${Math.round(moodValue * 10)}%`;
                      })()}
                    </p>
                    <p className="mt-1 text-xs text-green-100">Current wellness</p>
                  </div>
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="text-white transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-xl hover:scale-105">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-purple-100">Goals Completed</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{goals.filter(g => g.completed).length || 0}</p>
                    <p className="mt-1 text-xs text-purple-100">Completed goals</p>
                  </div>
                  <Target className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="text-white transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 hover:shadow-xl hover:scale-105">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-orange-100">Streak Days</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      {(() => {
                        if (!Array.isArray(wellnessData) || wellnessData.length === 0) return '0';
                        let streak = 0;
                        const today = new Date();
                        for (let i = wellnessData.length - 1; i >= 0; i--) {
                          const entryDate = new Date(wellnessData[i].date);
                          const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
                          if (daysDiff === streak) {
                            streak++;
                          } else {
                            break;
                          }
                        }
                        return streak;
                      })()}
                    </p>
                    <p className="mt-1 text-xs text-orange-100">Day streak</p>
                  </div>
                  <Award className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Main Dashboard Grid - Improved Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8">
          
          {/* Primary Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Wellness Trends Chart - Top Priority */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="grid grid-cols-1 gap-4 lg:gap-6">
                <WellnessTrendChart />
              </div>
            </motion.div>

            {/* AI Insights - Second Priority */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <AIInsightsCard />
            </motion.div>

            {/* Secondary Charts */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
                <AppointmentStatusChart />
                <WeeklyActivityChart />
              </div>
            </motion.div>

            {/* Additional Charts Row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="grid grid-cols-1 gap-4 lg:gap-6">
                <MoodDistributionChart />
              </div>
            </motion.div>

            {/* Today's Tip - Bottom of Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Today's Wellness Tip
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-indigo-800 leading-relaxed">{todaysTip}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Sticky on Desktop */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              
              {/* Counselor Messaging - Top Priority */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <CounselorMessaging />
              </motion.div>
              
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <span>Quick Actions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <Button className="justify-start w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 h-11 text-sm">
                      <Brain className="w-4 h-4 mr-3" />
                      Chat with AI Counselor
                    </Button>
                    <Button variant="outline" className="justify-start w-full hover:bg-green-50 hover:border-green-300 h-11 text-sm">
                      <Calendar className="w-4 h-4 mr-3 text-green-600" />
                      Book Appointment
                    </Button>
                    <Button variant="outline" className="justify-start w-full hover:bg-purple-50 hover:border-purple-300 h-11 text-sm">
                      <BookOpen className="w-4 h-4 mr-3 text-purple-600" />
                      Browse Resources
                    </Button>
                    <Button variant="outline" className="justify-start w-full hover:bg-orange-50 hover:border-orange-300 h-11 text-sm">
                      <Users className="w-4 h-4 mr-3 text-orange-600" />
                      Join Community
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Goals Progress */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
              <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 20% 80%, emerald 2px, transparent 2px)`,
                    backgroundSize: '20px 20px'
                  }}></div>
                </div>

                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div 
                        className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg"
                        whileHover={{ scale: 1.05, rotate: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Target className="w-7 h-7 text-white" />
                      </motion.div>
                      <div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                          Your Goals
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500">Progress tracking</span>
                          <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                            {currentGoals.length} Active
                          </div>
                        </div>
                      </div>
                    </CardTitle>
                    
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Goal
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-4">
                  {currentGoals.length > 0 ? (
                    <>
                      {/* Goals Overview Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white/60 rounded-xl border border-emerald-100">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-700">
                            {currentGoals.filter(g => {
                              const progress = typeof g.progress === 'number' ? g.progress : 
                                             (typeof g.progress === 'object' && g.progress?.progressPercentage) ? g.progress.progressPercentage : 0;
                              return progress >= 100 || g.completed;
                            }).length}
                          </div>
                          <div className="text-xs text-emerald-600 font-medium">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-700">
                            {currentGoals.filter(g => {
                              const progress = typeof g.progress === 'number' ? g.progress : 
                                             (typeof g.progress === 'object' && g.progress?.progressPercentage) ? g.progress.progressPercentage : 0;
                              return progress > 0 && progress < 100 && !g.completed;
                            }).length}
                          </div>
                          <div className="text-xs text-blue-600 font-medium">In Progress</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-700">
                            {(() => {
                              const totalProgress = currentGoals.reduce((sum, g) => {
                                const progress = typeof g.progress === 'number' ? g.progress : 
                                               (typeof g.progress === 'object' && g.progress?.progressPercentage) ? g.progress.progressPercentage : 0;
                                return sum + progress;
                              }, 0);
                              return currentGoals.length > 0 ? Math.round(totalProgress / currentGoals.length) : 0;
                            })()}%
                          </div>
                          <div className="text-xs text-orange-600 font-medium">Avg Progress</div>
                        </div>
                      </div>

                      {/* Individual Goals */}
                      <div className="space-y-4">
                        {currentGoals.slice(0, 4).map((goal, index) => {
                          const progress = typeof goal.progress === 'number' ? goal.progress : 
                                         (typeof goal.progress === 'object' && goal.progress?.progressPercentage) ? goal.progress.progressPercentage : 0;
                          const isCompleted = progress >= 100 || goal.completed;
                          
                          return (
                            <motion.div
                              key={goal._id || index}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="group p-5 bg-gradient-to-r from-white/80 to-emerald-50/80 rounded-2xl border border-emerald-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300"
                              whileHover={{ scale: 1.02, x: 5 }}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-3 h-3 rounded-full ${
                                      isCompleted ? 'bg-green-500' : 
                                      progress > 50 ? 'bg-blue-500' : 
                                      progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                    }`}></div>
                                    <h4 className="font-bold text-gray-900 group-hover:text-emerald-800 transition-colors">
                                      {safeRender(goal.title)}
                                    </h4>
                                  </div>
                                  {goal.description && (
                                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                      {safeRender(goal.description)}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 ml-4">
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-emerald-700">
                                      {Math.round(progress)}%
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {goal.target ? `${goal.current || 0}/${goal.target}` : 'Progress'}
                                    </div>
                                  </div>
                                  {isCompleted && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                                    >
                                      <span className="text-white text-sm">✓</span>
                                    </motion.div>
                                  )}
                                </div>
                              </div>

                              {/* Enhanced Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Progress</span>
                                  <span className={`font-medium ${
                                    isCompleted ? 'text-green-600' : 
                                    progress > 75 ? 'text-blue-600' : 
                                    progress > 50 ? 'text-yellow-600' : 'text-gray-600'
                                  }`}>
                                    {Math.round(progress)}% Complete
                                  </span>
                                </div>
                                
                                <div className="relative">
                                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div 
                                      className={`h-full rounded-full ${
                                        isCompleted ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                        progress > 75 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                                        progress > 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                        progress > 25 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                                        'bg-gradient-to-r from-gray-400 to-gray-500'
                                      }`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 1, delay: index * 0.2 }}
                                    />
                                  </div>
                                  
                                  {/* Progress milestones */}
                                  <div className="absolute top-0 w-full h-3 flex justify-between items-center px-1">
                                    {[25, 50, 75].map(milestone => (
                                      <div
                                        key={milestone}
                                        className={`w-1 h-1 rounded-full ${
                                          progress >= milestone ? 'bg-white' : 'bg-gray-400'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Goal Actions */}
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-100">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {goal.deadline && (
                                    <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                                  )}
                                  {goal.category && (
                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                      {goal.category}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50">
                                    Update
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50">
                                    View
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* View All Goals */}
                      {currentGoals.length > 4 && (
                        <motion.div 
                          className="text-center pt-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            View All {currentGoals.length} Goals
                          </Button>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    /* Empty State */
                    <motion.div 
                      className="py-12 text-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Set Yet</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Start your wellness journey by setting meaningful, achievable goals
                      </p>
                      <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg">
                        <Plus className="w-4 h-4 mr-2" />
                        Set Your First Goal
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

              
            </div>
          </div>
        </div>
      </div>

      {/* Student Messaging Component */}
      <StudentMessaging 
        isOpen={showMessagingModal}
        onClose={() => setShowMessagingModal(false)}
      />

      {/* Wellness Tracker Modal */}
      <WellnessTracker 
        isOpen={showWellnessTracker} 
        onClose={() => setShowWellnessTracker(false)} 
      />
    </div>
  );
};

export default Dashboard;
