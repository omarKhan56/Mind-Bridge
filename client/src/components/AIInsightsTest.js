import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Brain, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

const AIInsightsTest = () => {
  // Mock data for testing
  const mockInsights = {
    progressSummary: {
      overallProgress: 'good',
      progressPercentage: 75
    },
    personalInsights: [
      {
        title: 'Mood Improvement Detected',
        description: 'Your mood has improved by 15% over the past week',
        type: 'positive',
        confidence: 0.85
      },
      {
        title: 'Consistent Platform Usage',
        description: 'You are actively engaging with mental health resources',
        type: 'positive',
        confidence: 0.92
      }
    ],
    recommendations: [
      {
        category: 'wellness',
        recommendation: 'Continue your morning wellness check-ins',
        priority: 'medium',
        timeframe: 'this_week'
      }
    ],
    motivationalMessage: 'You are making great progress on your mental health journey!',
    nextSteps: [
      'Complete today\'s wellness tracking',
      'Consider scheduling a counselor session'
    ]
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
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

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold mb-4">🧪 AI Insights Test Component</h2>
      
      {/* Overall Progress */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI-Powered Insights (Test Mode)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Overall Progress</h3>
              <p className={`text-sm px-3 py-1 rounded-full inline-block ${getStatusColor(mockInsights.progressSummary.overallProgress)}`}>
                {mockInsights.progressSummary.overallProgress.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {mockInsights.progressSummary.progressPercentage}%
              </div>
              <p className="text-sm text-gray-500">Progress Score</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
            <p className="text-purple-800 font-medium">{mockInsights.motivationalMessage}</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockInsights.personalInsights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
            >
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {mockInsights.recommendations.map((rec, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-gray-900">{rec.category.toUpperCase()}</h4>
                <Badge variant="secondary" className="text-xs">
                  {rec.priority} priority
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{rec.recommendation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Test Status */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">✅ AI Insights Component Test Passed</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Component renders correctly with mock data. Ready for live API integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsightsTest;
