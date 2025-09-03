import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { User, TrendingUp, Activity, Calendar, Award, Settings, Target, Plus, Edit, Trash2, MessageCircle, Users, Heart } from '../components/Icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const GoalManager = ({ goals, setGoals }) => {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: 7, current: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  const addGoal = async () => {
    if (!newGoal.title.trim()) return;
    
    try {
      console.log('Adding goal:', newGoal);
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const response = await axios.post('/api/goals', {
        title: newGoal.title,
        target: parseInt(newGoal.target)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Goal added successfully:', response.data);
      setGoals([...goals, response.data]);
      setNewGoal({ title: '', target: 7, current: 0 });
      setShowAddGoal(false);
      toast.success('Goal added successfully!');
    } catch (error) {
      console.error('Failed to add goal:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(`Failed to add goal: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateGoalProgress = async (goalId, increment = 1) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/goals/${goalId}/progress`, {
        increment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGoals(goals.map(goal => 
        goal._id === goalId ? response.data : goal
      ));
      toast.success('Goal updated successfully!');
    } catch (error) {
      console.error('Failed to update goal:', error);
      toast.error('Failed to update goal. Please try again.');
    }
  };

  const deleteGoal = (goal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/goals/${goalToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGoals(goals.filter(goal => goal._id !== goalToDelete._id));
      toast.success('Goal deleted successfully!');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      toast.error('Failed to delete goal. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Target size={28} />
              Weekly Goals
            </CardTitle>
            <CardDescription className="text-base">
              Set and track your wellness objectives
            </CardDescription>
          </div>
          <Button 
            onClick={() => {
              console.log('Add Goal button clicked');
              setShowAddGoal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Goal Form */}
        {showAddGoal && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Goal Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  placeholder="e.g., Daily meditation, Exercise, Read books"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Weekly Target</label>
                <input
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({...newGoal, target: e.target.value})}
                  min="1"
                  max="7"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addGoal} className="flex-1">
                  Add Goal
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddGoal(false);
                    setNewGoal({ title: '', target: 7, current: 0 });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals List */}
        {goals.map(goal => (
          <div key={goal._id} className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-base font-medium">{goal.title}</span>
                  <Badge variant="secondary" className="px-3 py-1">
                    {goal.current}/{goal.target}
                  </Badge>
                </div>
                <Progress value={goal.progress} className="h-3 mb-3" />
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateGoalProgress(goal._id, -1)}
                  disabled={goal.current === 0}
                  className="h-8 w-8 p-0"
                >
                  -
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateGoalProgress(goal._id, 1)}
                  disabled={goal.current >= goal.target}
                  className="h-8 w-8 p-0"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteGoal(goal)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            {goal.progress === 100 && (
              <div className="text-sm text-green-600 font-medium">
                🎉 Goal completed! Great job!
              </div>
            )}
          </div>
        ))}

        {goals.length === 0 && !showAddGoal && (
          <div className="text-center py-8 text-gray-500">
            <Target size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No goals set yet</p>
            <p className="text-sm">Add your first wellness goal to start tracking progress</p>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{goalToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGoal}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    loadUserAnalysis();
    loadProfileData();
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/goals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(response.data);
    } catch (error) {
      console.error('Failed to load goals:', error);
      // Fallback to empty array
      setGoals([]);
    }
  };

  useEffect(() => {
    loadUserAnalysis();
    loadProfileData();
  }, []);

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

  const loadProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load real activity data
      const [appointmentsRes, aiSessionsRes, wellnessRes] = await Promise.all([
        axios.get('/api/appointments/my-appointments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/ai-sessions', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/wellness/trends', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      // Convert real data to activity format
      const activities = [];
      
      // Add recent appointments
      appointmentsRes.data.slice(0, 2).forEach(apt => {
        activities.push({
          type: 'appointment',
          title: `Counseling Session with ${apt.counselor?.name || 'Counselor'}`,
          time: new Date(apt.appointmentDate).toLocaleDateString(),
          icon: '🗓️',
          description: `${apt.type} session - ${apt.status}`
        });
      });
      
      // Add recent AI sessions
      aiSessionsRes.data.slice(0, 2).forEach(session => {
        activities.push({
          type: 'chat',
          title: `AI Therapy Session`,
          time: new Date(session.createdAt).toLocaleDateString(),
          icon: '💬',
          description: `Discussed ${session.mood || 'general'} support`
        });
      });
      
      // Add recent wellness entries
      wellnessRes.data.slice(-2).forEach(entry => {
        activities.push({
          type: 'wellness',
          title: 'Wellness Check-in',
          time: new Date(entry.date).toLocaleDateString(),
          icon: '❤️',
          description: `Mood: ${entry.mood}/10, Stress: ${entry.stress}/10`
        });
      });
      
      // Sort by most recent
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 5));
      
      // Generate achievements based on real data
      const realAchievements = [];
      
      if (appointmentsRes.data.length > 0) {
        realAchievements.push({
          title: 'First Step',
          description: 'Booked your first counseling session',
          icon: '🎯',
          earned: true,
          date: new Date(appointmentsRes.data[0].createdAt).toLocaleDateString()
        });
      }
      
      if (aiSessionsRes.data.length >= 5) {
        realAchievements.push({
          title: 'AI Companion',
          description: 'Completed 5+ AI therapy sessions',
          icon: '🤖',
          earned: true,
          date: 'Recently'
        });
      }
      
      if (wellnessRes.data.length >= 7) {
        realAchievements.push({
          title: 'Wellness Warrior',
          description: 'Logged wellness data for 7+ days',
          icon: '💪',
          earned: true,
          date: 'Recently'
        });
      }
      
      if (user?.screeningData?.riskLevel === 'low') {
        realAchievements.push({
          title: 'Mental Health Champion',
          description: 'Maintaining low risk level',
          icon: '🏆',
          earned: true,
          date: 'Current'
        });
      }
      
      setAchievements(realAchievements);
      
    } catch (error) {
      console.error('Failed to load profile data:', error);
      // Fallback to empty arrays
      setRecentActivity([]);
      setAchievements([]);
    }
  };

  const RecentActivity = () => (
    <Card className="shadow-lg">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <Activity size={28} />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-base">
          Your latest interactions and progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recentActivity.map((activity, index) => (
          <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">{activity.icon}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base text-gray-900">{activity.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-2">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const Achievements = () => (
    <Card className="shadow-lg">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <Award size={28} />
          Achievements
        </CardTitle>
        <CardDescription className="text-base">
          Milestones in your wellness journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {achievements.map((achievement, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
              achievement.earned 
                ? 'bg-green-50 border-green-200 shadow-sm' 
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}
          >
            <div className={`text-2xl ${achievement.earned ? '' : 'grayscale'}`}>
              {achievement.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-base">{achievement.title}</h4>
              <p className="text-sm text-gray-600">{achievement.description}</p>
            </div>
            {achievement.earned && (
              <Badge variant="default" className="bg-green-600">
                Earned
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <User size={32} className="text-white" />
            </div>
            <p className="text-lg text-muted-foreground">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <motion.div 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar className="h-32 w-32 shadow-2xl ring-4 ring-white">
                <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {user?.name || 'Your Profile'}
              </h1>
              <p className="text-lg text-gray-600">
                {user?.department} • {user?.college?.name}
              </p>
              <p className="text-sm text-gray-500">
                Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analysis?.overview.totalSessions || 0}
              </div>
              <div className="text-sm font-medium text-gray-700">AI Sessions</div>
              <div className="text-xs text-gray-500 mt-1">
                Avg {analysis?.overview.avgSessionLength || 0} messages
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analysis?.overview.totalPosts || 0}
              </div>
              <div className="text-sm font-medium text-gray-700">Forum Posts</div>
              <div className="text-xs text-gray-500 mt-1">
                Community contributions
              </div>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analysis?.progressIndicators.consistencyScore?.toFixed(0) || 0}%
              </div>
              <div className="text-sm font-medium text-gray-700">Consistency</div>
              <div className="text-xs text-gray-500 mt-1">
                Engagement regularity
              </div>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-red-600 mb-2">
                {user?.screeningData?.riskLevel || 'N/A'}
              </div>
              <div className="text-sm font-medium text-gray-700">Risk Level</div>
              <div className="text-xs text-gray-500 mt-1">
                Current assessment
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {/* Left Column - User Info */}
          <div className="space-y-6">
            {/* Personal Information */}
            <Card className="shadow-xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Full Name', value: user?.name },
                  { label: 'Email', value: user?.email },
                  { label: 'Student ID', value: user?.studentId },
                  { label: 'Department', value: user?.department },
                  { label: 'Year', value: user?.year },
                  { label: 'College', value: user?.college?.name }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600 font-medium text-sm">{item.label}</span>
                    <span className="font-semibold text-gray-900 text-sm">{item.value || 'Not provided'}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 pt-4">
                  <span className="text-gray-600 font-medium text-sm">Risk Level</span>
                  <Badge variant={
                    user?.screeningData?.riskLevel === 'high' ? 'destructive' :
                    user?.screeningData?.riskLevel === 'moderate' ? 'secondary' : 'default'
                  } className="text-xs">
                    {user?.screeningData?.riskLevel || 'Not assessed'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <GoalManager goals={goals} setGoals={setGoals} />
          </div>

          {/* Middle Column */}
          <div className="space-y-6">
            <RecentActivity />
          </div>

          {/* Right Column - Analysis */}
          <div className="space-y-8">
            <Achievements />
            
            {/* Mental Health Insights */}
            {analysis && (
              <Card className="shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <span>📊</span>
                    Mental Health Insights
                  </CardTitle>
                  <CardDescription className="text-base">
                    Personalized analysis based on your activity and progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Progress Trend */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Overall Progress</h4>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={analysis.progressIndicators.overallTrend === 'improving' ? 'default' : 'secondary'}
                        className="px-4 py-2 text-base"
                      >
                        {analysis.progressIndicators.overallTrend === 'improving' ? '📈 Improving' : 
                         analysis.progressIndicators.overallTrend === 'declining' ? '📉 Needs Attention' : '➡️ Stable'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Engagement: {analysis.progressIndicators.engagementLevel}
                      </span>
                    </div>
                  </div>

                  {/* Top Concerns */}
                  {analysis.topConcerns.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Areas of Focus</h4>
                      <div className="flex flex-wrap gap-3">
                        {analysis.topConcerns.slice(0, 4).map((concern, index) => (
                          <Badge key={index} variant="outline" className="px-4 py-2 text-sm">
                            {concern.concern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Communication Patterns */}
                  {analysis.communicationPatterns && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Activity Patterns</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="font-medium text-gray-700">Most Active</div>
                          <div className="text-lg font-semibold text-blue-600">
                            {analysis.communicationPatterns.mostActiveDay}s
                          </div>
                          <div className="text-xs text-muted-foreground">
                            at {analysis.communicationPatterns.mostActiveHour}:00
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="font-medium text-gray-700">Weekly Sessions</div>
                          <div className="text-lg font-semibold text-green-600">
                            {analysis.communicationPatterns.avgSessionsPerWeek}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            average per week
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis?.recommendations.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <span>💡</span>
                    Personalized Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.recommendations.map((rec, index) => (
                    <Card key={index} className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.priority} priority
                          </div>
                        </div>
                        <h5 className="font-semibold text-blue-900 mb-2 text-base mt-2">{rec.title}</h5>
                        <p className="text-sm text-blue-700 leading-relaxed">{rec.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
