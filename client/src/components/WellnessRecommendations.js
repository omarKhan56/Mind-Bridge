import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Heart, Target, Sparkles, Check, Clock, Award } from '../components/Icons';
import analyticsService from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';

const WellnessRecommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedGoals, setCompletedGoals] = useState(new Set());

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getWellnessRecommendations(user.id);
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to load wellness recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalComplete = async (goalId) => {
    try {
      await analyticsService.trackGoalProgress(goalId, 100);
      setCompletedGoals(prev => new Set([...prev, goalId]));
    } catch (error) {
      console.error('Failed to track goal completion:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[priority] || colors.medium;
  };

  const getTypeIcon = (type) => {
    const icons = {
      crisis_support: <Heart className="h-4 w-4 text-red-500" />,
      mood_support: <Heart className="h-4 w-4 text-blue-500" />,
      academic_support: <Target className="h-4 w-4 text-green-500" />,
      social_connection: <Award className="h-4 w-4 text-purple-500" />,
      sleep_improvement: <Clock className="h-4 w-4 text-indigo-500" />,
      engagement_boost: <Sparkles className="h-4 w-4 text-yellow-500" />
    };
    return icons[type] || <Sparkles className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">No wellness recommendations available at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Wellness Journey</h2>
        <p className="text-gray-600">Personalized recommendations based on your patterns and progress</p>
      </div>

      {/* Risk Level Alert */}
      {recommendations.riskLevel && recommendations.riskLevel !== 'minimal' && (
        <Alert className={`border-2 ${
          recommendations.riskLevel === 'critical' || recommendations.riskLevel === 'high' 
            ? 'border-red-200 bg-red-50' 
            : 'border-yellow-200 bg-yellow-50'
        }`}>
          <Heart className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Risk Level: {recommendations.riskLevel}</strong>
            {recommendations.riskLevel === 'critical' || recommendations.riskLevel === 'high' 
              ? ' - We recommend speaking with a counselor soon.'
              : ' - Let\'s work together on some wellness strategies.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Immediate Actions */}
      {recommendations.recommendations?.immediate?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <Heart className="h-5 w-5" />
              <span>Immediate Actions</span>
            </CardTitle>
            <CardDescription>These recommendations need your attention right away</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.recommendations.immediate.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(rec.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900">{rec.message}</h4>
                      {rec.techniques && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.techniques.map(technique => (
                            <Badge key={technique} variant="secondary" className="text-xs">
                              {technique.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Short-term Recommendations */}
      {recommendations.recommendations?.shortTerm?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>This Week's Focus</span>
            </CardTitle>
            <CardDescription>Short-term strategies to improve your wellbeing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {recommendations.recommendations.shortTerm.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(rec.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900">{rec.message}</h4>
                      {rec.techniques && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.techniques.map(technique => (
                            <Badge key={technique} variant="outline" className="text-xs">
                              {technique.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wellness Goals */}
      {recommendations.recommendations?.goals?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span>Your Wellness Goals</span>
            </CardTitle>
            <CardDescription>Personalized goals to track your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.recommendations.goals.map((goal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 border rounded-lg transition-all ${
                    completedGoals.has(`goal-${index}`) 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{goal.goal}</h4>
                      <p className="text-sm text-gray-600 mt-1">{goal.target}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {goal.category}
                        </Badge>
                        <span className="text-xs text-gray-500">{goal.timeframe}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={completedGoals.has(`goal-${index}`) ? "default" : "outline"}
                      onClick={() => handleGoalComplete(`goal-${index}`)}
                      disabled={completedGoals.has(`goal-${index}`)}
                      className="ml-4"
                    >
                      {completedGoals.has(`goal-${index}`) ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Done
                        </>
                      ) : (
                        'Mark Complete'
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Long-term Recommendations */}
      {recommendations.recommendations?.longTerm?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-green-500" />
              <span>Long-term Wellness</span>
            </CardTitle>
            <CardDescription>Building lasting habits for sustained wellbeing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.recommendations.longTerm.map((rec, index) => (
                <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(rec.type)}
                    <div>
                      <h4 className="font-medium text-green-900">{rec.message}</h4>
                      {rec.techniques && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.techniques.map(technique => (
                            <Badge key={technique} variant="secondary" className="text-xs">
                              {technique.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <Button onClick={loadRecommendations} variant="outline">
          Refresh Recommendations
        </Button>
      </div>
    </div>
  );
};

export default WellnessRecommendations;
