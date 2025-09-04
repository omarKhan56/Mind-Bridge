import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, TrendingUp, Users, Brain, Target, Bell } from '../components/Icons';
import analyticsService from '../services/analyticsService';

const EnhancedCounselorDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboard, trendsData] = await Promise.all([
        analyticsService.getDashboardAnalytics(),
        analyticsService.getTrends(selectedTimeframe)
      ]);
      
      setDashboardData(dashboard);
      setTrends(trendsData);
    } catch (error) {
      console.error('Dashboard data load failed:', error);
    } finally {
      setLoading(false);
    }
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Analytics Dashboard</h1>
          <p className="text-gray-600">Predictive insights and risk assessment</p>
        </div>
        <div className="flex space-x-2">
          {['7d', '30d', '90d'].map(timeframe => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {dashboardData?.riskDistribution && Object.entries(dashboardData.riskDistribution).map(([level, count]) => (
          <motion.div
            key={level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
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
          </motion.div>
        ))}
      </div>

      {/* High Risk Alerts */}
      {dashboardData?.highRiskUsers && dashboardData.highRiskUsers.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{dashboardData.highRiskUsers.length} students</strong> require immediate attention due to high risk scores.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>High Risk Students</span>
            </CardTitle>
            <CardDescription>Students requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.highRiskUsers?.slice(0, 5).map((student, index) => (
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

        {/* Trends Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>Trends Overview</span>
            </CardTitle>
            <CardDescription>Key metrics and patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Risk Score</span>
                <span className="font-semibold">{dashboardData?.trends?.averageRiskScore?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Alerts</span>
                <span className="font-semibold">{dashboardData?.trends?.totalAlerts || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Students</span>
                <span className="font-semibold">{dashboardData?.totalUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Charts */}
      {trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Score Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.riskScores?.map((point, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{point.date}</span>
                    <span className="font-medium">{point.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mood Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.moodTrends?.map((point, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{point.date}</span>
                    <span className="font-medium">{point.mood}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.engagementLevels?.map((point, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{point.date}</span>
                    <span className="font-medium">{(point.engagement * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and interventions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Send Wellness Check</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Create Intervention</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>View AI Insights</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCounselorDashboard;
