import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import axios from 'axios';

const AIInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ai-analysis/insights', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      setError('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'needs_attention': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'concerning': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Lightbulb className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Analyzing your data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>AI insights will be available after more data is collected</p>
            <Button onClick={loadInsights} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Overall Progress */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Overall Progress</h3>
              <p className={`text-sm px-3 py-1 rounded-full inline-block ${getStatusColor(insights.progressSummary?.overallProgress)}`}>
                {insights.progressSummary?.overallProgress?.replace('_', ' ').toUpperCase() || 'STABLE'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {insights.progressSummary?.progressPercentage || 75}%
              </div>
              <p className="text-sm text-gray-500">Progress Score</p>
            </div>
          </div>
          
          {insights.motivationalMessage && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
              <p className="text-purple-800 font-medium">{insights.motivationalMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Insights */}
      {insights.personalInsights && insights.personalInsights.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.personalInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  {insight.confidence && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border-l-4 border-blue-500 pl-4 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900">{rec.category?.toUpperCase()}</h4>
                  <div className="flex gap-2">
                    <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                      {rec.priority} priority
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rec.timeframe?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{rec.recommendation}</p>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {insights.nextSteps && insights.nextSteps.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.nextSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-semibold">
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{step}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wellness Trend */}
      {insights.wellnessTrend && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Wellness Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {insights.wellnessTrend.bestDays && (
                <div>
                  <h4 className="font-medium text-green-600 mb-2">Best Days</h4>
                  <div className="space-y-1">
                    {insights.wellnessTrend.bestDays.map((day, index) => (
                      <Badge key={index} variant="outline" className="mr-1 text-green-600">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {insights.wellnessTrend.worstDays && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Challenging Days</h4>
                  <div className="space-y-1">
                    {insights.wellnessTrend.worstDays.map((day, index) => (
                      <Badge key={index} variant="outline" className="mr-1 text-red-600">
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button onClick={loadInsights} variant="outline">
          <Brain className="h-4 w-4 mr-2" />
          Refresh Insights
        </Button>
      </div>
    </motion.div>
  );
};

export default AIInsights;
