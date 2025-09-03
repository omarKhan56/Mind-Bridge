import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, TrendingUp, Users, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import axios from 'axios';

const CounselorAIInsights = ({ studentId }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) {
      loadCounselorInsights();
    }
  }, [studentId]);

  const loadCounselorInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/ai-analysis/counselor-insights/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to load counselor insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2">Analyzing student data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No AI insights available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(insights.riskAssessment?.currentLevel)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">
                {insights.riskAssessment?.currentLevel?.toUpperCase() || 'UNKNOWN'}
              </span>
              <Badge variant={insights.alertLevel === 'high' ? 'destructive' : 'secondary'}>
                {insights.alertLevel === 'high' ? 'Immediate Attention' : 'Monitor'}
              </Badge>
            </div>
            
            {insights.riskAssessment?.riskScore && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Risk Score</span>
                  <span>{insights.riskAssessment.riskScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full" 
                    style={{ width: `${insights.riskAssessment.riskScore}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {insights.riskAssessment?.keyRiskFactors?.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">Risk Factors:</p>
                <div className="flex flex-wrap gap-1">
                  {insights.riskAssessment.keyRiskFactors.map((factor, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {insights.riskAssessment?.protectiveFactors?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Protective Factors:</p>
                <div className="flex flex-wrap gap-1">
                  {insights.riskAssessment.protectiveFactors.map((factor, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-green-600">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Preparation */}
      {insights.sessionPreparation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Session Preparation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.sessionPreparation.keyTopics?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Key Topics to Address:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {insights.sessionPreparation.keyTopics.map((topic, index) => (
                    <li key={index}>{topic.title || topic}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {insights.sessionPreparation.riskFactors?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Current Concerns:</h4>
                <div className="flex flex-wrap gap-2">
                  {insights.sessionPreparation.riskFactors.map((factor, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {insights.sessionPreparation.recommendations?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommended Interventions:</h4>
                <div className="space-y-2">
                  {insights.sessionPreparation.recommendations.map((rec, index) => (
                    <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                      <span className="font-medium">{rec.intervention || rec.action}:</span>
                      <span className="ml-2">{rec.rationale || rec.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Behavioral Patterns */}
      {insights.behavioralPatterns && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Behavioral Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {insights.behavioralPatterns.weeklyPatterns?.bestDays && (
                <div>
                  <h5 className="font-medium text-green-600 mb-1">Better Days:</h5>
                  <p>{insights.behavioralPatterns.weeklyPatterns.bestDays.join(', ')}</p>
                </div>
              )}
              
              {insights.behavioralPatterns.weeklyPatterns?.worstDays && (
                <div>
                  <h5 className="font-medium text-red-600 mb-1">Challenging Days:</h5>
                  <p>{insights.behavioralPatterns.weeklyPatterns.worstDays.join(', ')}</p>
                </div>
              )}
              
              {insights.behavioralPatterns.usagePatterns?.engagementLevel && (
                <div>
                  <h5 className="font-medium mb-1">Platform Engagement:</h5>
                  <Badge variant="outline">
                    {insights.behavioralPatterns.usagePatterns.engagementLevel}
                  </Badge>
                </div>
              )}
              
              {insights.behavioralPatterns.usagePatterns?.preferredFeatures && (
                <div>
                  <h5 className="font-medium mb-1">Preferred Features:</h5>
                  <p>{insights.behavioralPatterns.usagePatterns.preferredFeatures.join(', ')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sentiment Analysis */}
      {insights.sentimentAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Communication Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.sentimentAnalysis.combined && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Overall Sentiment:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(insights.sentimentAnalysis.combined.overallSentiment / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{insights.sentimentAnalysis.combined.overallSentiment}/10</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Emotional Tone:</span>
                  <Badge variant={
                    insights.sentimentAnalysis.combined.emotionalTone === 'positive' ? 'default' :
                    insights.sentimentAnalysis.combined.emotionalTone === 'negative' ? 'destructive' : 'secondary'
                  }>
                    {insights.sentimentAnalysis.combined.emotionalTone}
                  </Badge>
                </div>
                
                {insights.sentimentAnalysis.combined.crisisIndicators?.present && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Crisis Indicators Detected</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      Confidence: {Math.round((insights.sentimentAnalysis.combined.crisisIndicators.confidence || 0) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button onClick={loadCounselorInsights} variant="outline">
          <Brain className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
};

export default CounselorAIInsights;
