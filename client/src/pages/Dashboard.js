import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Heart, Users, Shield, MessageCircle, Calendar, BookOpen, TrendingUp, Bell, Target, Activity, User, Sparkles, Award, Plus } from '../components/Icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import WellnessTracker from '../components/WellnessTracker';
import WellnessButton from '../components/WellnessButton';
import WellnessRecommendations from '../components/WellnessRecommendations';
import AIInsights from '../components/AIInsights';
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
  Cell
} from 'recharts';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [goals, setGoals] = useState([]);
  const [aiSessions, setAiSessions] = useState([]);
  const [wellnessData, setWellnessData] = useState([]);
  const [showWellnessTracker, setShowWellnessTracker] = useState(false);

  // Chart colors
  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#8B5CF6',
    warning: '#F59E0B'
  };

  // Process wellness data for chart
  const getWellnessTrendData = () => {
    if (wellnessData.length === 0) {
      // Fallback data if no wellness data available
      return [
        { date: new Date().toLocaleDateString(), mood: 7, stress: 4, sleep: 8 }
      ];
    }
    return wellnessData.map(entry => ({
      date: new Date(entry.date).toLocaleDateString(),
      mood: entry.mood || 5,
      stress: entry.stress || 5,
      sleep: entry.sleep || 5
    }));
  };

  // Process appointment data for chart
  const getAppointmentData = () => {
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return [{ name: 'No appointments', value: 1, color: '#E5E7EB' }];
    }
    
    const statusCounts = appointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'completed' ? COLORS.secondary : 
             status === 'pending' ? COLORS.warning : COLORS.primary
    }));
  };
  const [analysis, setAnalysis] = useState(null);
  const [dailyMood, setDailyMood] = useState(null);
  const [currentGoals, setCurrentGoals] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [todaysTip, setTodaysTip] = useState('');

  useEffect(() => {
    loadUserAnalysis();
    loadDashboardData();
    loadAppointments();
    loadGoals();
    loadWellnessData();
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
    const completedGoals = goals.filter(goal => goal.progress >= 100);
    if (completedGoals.length > 0) {
      notifications.push({
        type: 'achievement',
        message: `🎉 Congratulations! You've completed ${completedGoals.length} goal(s) this week!`,
        priority: 'high'
      });
    }
    
    // Check for goals behind schedule
    const behindGoals = goals.filter(goal => goal.progress < 50);
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

  const handleMoodCheck = (mood) => {
    setDailyMood(mood);
  };

  const MoodTracker = () => (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <span>🎭</span>
          Daily Mood Check
        </CardTitle>
        <CardDescription className="text-base">
          How are you feeling today?
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <div className="flex gap-4 justify-center">
          {[
            { emoji: '😊', mood: 'happy', label: 'Happy' },
            { emoji: '😐', mood: 'neutral', label: 'Neutral' },
            { emoji: '😰', mood: 'anxious', label: 'Anxious' },
            { emoji: '😢', mood: 'sad', label: 'Sad' },
            { emoji: '😤', mood: 'stressed', label: 'Stressed' }
          ].map(({ emoji, mood, label }) => (
            <Button
              key={mood}
              variant={dailyMood === mood ? "default" : "outline"}
              size="lg"
              className="h-20 w-20 rounded-full text-2xl hover:scale-105 transition-transform flex items-center justify-center p-0"
              onClick={() => handleMoodCheck(mood)}
              title={label}
            >
              <span className="leading-none">{emoji}</span>
            </Button>
          ))}
        </div>
        {dailyMood && (
          <p className="text-center mt-6 text-sm text-muted-foreground leading-relaxed">
            Feeling {dailyMood} today. Remember, it's okay to have ups and downs.
          </p>
        )}
      </CardContent>
    </Card>
  );

  const QuickActions = () => (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <span>⚡</span>
          Quick Actions
        </CardTitle>
        <CardDescription className="text-base">
          Access your wellness tools instantly
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: 'AI Chat', icon: MessageCircle, variant: 'default', link: '/chat' },
            { title: 'Breathing', icon: Heart, variant: 'secondary' },
            { title: 'Journal', icon: BookOpen, variant: 'outline' },
            { title: 'SOS', icon: Shield, variant: 'destructive' }
          ].map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="h-24 flex-col gap-3 hover:scale-105 transition-transform"
              asChild={!!action.link}
            >
              {action.link ? (
                <Link to={action.link}>
                  <action.icon size={24} />
                  <span className="text-sm font-medium">{action.title}</span>
                </Link>
              ) : (
                <>
                  <action.icon size={24} />
                  <span className="text-sm font-medium">{action.title}</span>
                </>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const GoalTracker = () => (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Target size={24} />
          Weekly Goals
        </CardTitle>
        <CardDescription className="text-base">
          Track your wellness objectives
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-8">
        {currentGoals.length > 0 ? (
          currentGoals.slice(0, 3).map(goal => (
            <div key={goal._id} className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium">{goal.title}</span>
                <Badge variant="secondary" className="px-3 py-1">{goal.current}/{goal.target}</Badge>
              </div>
              <Progress value={goal.progress} className="h-3" />
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Target size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No goals set yet</p>
            <p className="text-xs text-muted-foreground">Visit your profile to add goals</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const NotificationCenter = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell size={20} />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notif, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              notif.priority === 'high' ? 'bg-red-50 border-red-200' :
              notif.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
              'bg-blue-50 border-blue-200'
            }`}
          >
            <p className="text-sm">{notif.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const RecentActivity = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity size={20} />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentActivity.length > 0 ? (
          recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{activity.icon}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                )}
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <Activity size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs text-muted-foreground">Start a chat session to see activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const MindfulnessCorner = () => (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <span>🧘</span>
          Mindfulness Corner
        </CardTitle>
        <CardDescription className="text-blue-700">
          Take a moment for yourself
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { title: '5-Min Meditation', duration: '5 min', icon: '🧘‍♀️' },
            { title: 'Breathing Exercise', duration: '3 min', icon: '🫁' },
            { title: 'Gratitude Journal', duration: '2 min', icon: '📝' },
            { title: 'Body Scan', duration: '10 min', icon: '🔍' }
          ].map((exercise, index) => (
            <Button
              key={index}
              variant="ghost"
              className="h-20 flex-col gap-1 bg-white/50 hover:bg-white/80"
            >
              <span className="text-lg">{exercise.icon}</span>
              <span className="text-xs font-medium">{exercise.title}</span>
              <span className="text-xs text-muted-foreground">{exercise.duration}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Brain size={32} className="text-white" />
            </div>
            <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="py-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 ring-4 ring-blue-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Heart className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {getWelcomeMessage()} 👋
                  </h1>
                  <p className="text-gray-600 mt-1">How are you feeling today? Let's check in on your wellness journey.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </Button>
                <WellnessButton onOpenTracker={() => setShowWellnessTracker(true)} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Quick Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">AI Sessions</p>
                        <p className="text-3xl font-bold">{aiSessions.length}</p>
                        <p className="text-blue-100 text-xs mt-1">This month</p>
                      </div>
                      <Brain className="h-12 w-12 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Wellness Score</p>
                        <p className="text-3xl font-bold">{wellnessData.length > 0 ? Math.round(wellnessData[wellnessData.length - 1]?.mood * 20) || 75 : 75}%</p>
                        <p className="text-green-100 text-xs mt-1">Keep it up!</p>
                      </div>
                      <Heart className="h-12 w-12 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Goals Completed</p>
                        <p className="text-3xl font-bold">{goals.filter(g => g.completed).length}</p>
                        <p className="text-purple-100 text-xs mt-1">This week</p>
                      </div>
                      <Target className="h-12 w-12 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Wellness Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <WellnessRecommendations />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/ai-chat" className="block">
                    <Button className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                      <Brain className="h-4 w-4 mr-3" />
                      Chat with AI Counselor
                    </Button>
                  </Link>
                  <Link to="/appointments" className="block">
                    <Button variant="outline" className="w-full justify-start hover:bg-green-50 hover:border-green-300">
                      <Calendar className="h-4 w-4 mr-3 text-green-600" />
                      Book Appointment
                    </Button>
                  </Link>
                  <Link to="/resources" className="block">
                    <Button variant="outline" className="w-full justify-start hover:bg-purple-50 hover:border-purple-300">
                      <BookOpen className="h-4 w-4 mr-3 text-purple-600" />
                      Browse Resources
                    </Button>
                  </Link>
                  <Link to="/forum" className="block">
                    <Button variant="outline" className="w-full justify-start hover:bg-orange-50 hover:border-orange-300">
                      <Users className="h-4 w-4 mr-3 text-orange-600" />
                      Join Community
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Goals Progress */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <span>Your Goals</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {goals.slice(0, 3).map((goal, index) => (
                      <div key={goal._id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{goal.title}</p>
                          <Badge variant={goal.completed ? "default" : "secondary"} className="text-xs">
                            {goal.completed ? "Complete" : "In Progress"}
                          </Badge>
                        </div>
                        <Progress value={goal.progress || (goal.completed ? 100 : 30)} className="h-2" />
                      </div>
                    ))}
                    {goals.length === 0 && (
                      <div className="text-center py-6">
                        <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No goals set yet</p>
                        <Button size="sm" className="mt-2">Set Your First Goal</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <AIInsights />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Wellness Tracker Modal */}
      <WellnessTracker 
        isOpen={showWellnessTracker} 
        onClose={() => setShowWellnessTracker(false)} 
      />
    </div>
  );
};

export default Dashboard;
                      {stat.value}
                    </motion.div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Wellness Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Wellness Trends
              </CardTitle>
              <CardDescription>
                Track your mood, stress, and sleep patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getWellnessTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="mood" 
                      stroke={COLORS.primary} 
                      strokeWidth={3}
                      name="Mood"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="stress" 
                      stroke={COLORS.warning} 
                      strokeWidth={3}
                      name="Stress"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sleep" 
                      stroke={COLORS.secondary} 
                      strokeWidth={3}
                      name="Sleep Quality"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.primary }}></div>
                  <span className="text-sm">Mood</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.warning }}></div>
                  <span className="text-sm">Stress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.secondary }}></div>
                  <span className="text-sm">Sleep Quality</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Dashboard Layout */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {/* Left Column - Main Content */}
          <motion.div 
            className="lg:col-span-3 space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            {/* Wellness Check-in Button */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <WellnessButton onOpenTracker={() => setShowWellnessTracker(true)} />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              whileHover={{ scale: 1.01 }}
            >
              <QuickActions />
            </motion.div>

            {/* Current Goals */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              whileHover={{ scale: 1.01 }}
            >
              <GoalTracker />
            </motion.div>

            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
              whileHover={{ scale: 1.01 }}
            >
              <AIInsights />
            </motion.div>
          </motion.div>

          {/* Right Sidebar - Charts & Support */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <NotificationCenter />

            {/* User Profile Card */}
            {/* Appointment Status Chart */}
            {appointments.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    My Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAppointmentData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {getAppointmentData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-3 mt-4">
                    {getAppointmentData().map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs capitalize">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emergency Resources */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-red-900 text-xl">
                  <span>🚨</span>
                  Emergency Support
                </CardTitle>
                <CardDescription className="text-red-700">
                  Available 24/7 when you need immediate help
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Crisis Hotline', value: '988', icon: '📞' },
                  { label: 'Emergency', value: '911', icon: '🚑' },
                  { label: 'Crisis Text', value: 'HOME to 741741', icon: '💬' }
                ].map((contact, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start bg-white/80 hover:bg-white p-4 h-auto"
                  >
                    <span className="mr-4 text-xl">{contact.icon}</span>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground font-medium">{contact.label}</div>
                      <div className="text-base font-bold text-red-700">{contact.value}</div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Today's Tip */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-blue-900 text-xl">
                  <span>💡</span>
                  Today's Wellness Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {todaysTip || "Practice the 4-7-8 breathing technique: Breathe in for 4 counts, hold for 7, exhale for 8."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Wellness Recommendations Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="mt-8"
      >
        <WellnessRecommendations />
      </motion.div>

      {/* Wellness Tracker Modal */}
      <WellnessTracker 
        isOpen={showWellnessTracker} 
        onClose={() => setShowWellnessTracker(false)} 
      />
    </div>
  );
};

export default Dashboard;
