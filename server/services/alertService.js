const User = require('../models/User');
const userAnalysisService = require('./userAnalysisService');

class AlertService {
  async checkForAlerts(userId) {
    try {
      const analysis = await userAnalysisService.generateUserAnalysis(userId);
      const user = await User.findById(userId);
      
      const alerts = [];
      
      // High-risk screening alert
      if (user.screeningData?.riskLevel === 'high') {
        alerts.push({
          type: 'high_risk',
          priority: 'urgent',
          message: `${user.name} has high-risk screening scores`,
          details: `PHQ-9: ${user.screeningData.phq9Score}, GAD-7: ${user.screeningData.gad7Score}`
        });
      }
      
      // Declining trend alert
      if (analysis.progressIndicators.overallTrend === 'declining') {
        alerts.push({
          type: 'declining_trend',
          priority: 'high',
          message: `${user.name} shows declining mental health trends`,
          details: `Recent communication patterns indicate worsening condition`
        });
      }
      
      // Crisis keywords alert
      const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'no point', 'give up'];
      const hasCrisisContent = this.checkForCrisisKeywords(analysis, crisisKeywords);
      if (hasCrisisContent) {
        alerts.push({
          type: 'crisis_keywords',
          priority: 'urgent',
          message: `${user.name} used concerning language in recent sessions`,
          details: 'Immediate intervention may be required'
        });
      }
      
      // Sudden inactivity alert
      if (analysis.overview.totalSessions > 5 && this.checkInactivity(user)) {
        alerts.push({
          type: 'sudden_inactivity',
          priority: 'medium',
          message: `${user.name} has been inactive for over a week`,
          details: 'Previously active user has stopped engaging'
        });
      }
      
      return alerts;
    } catch (error) {
      console.error('Alert check failed:', error);
      return [];
    }
  }
  
  checkForCrisisKeywords(analysis, keywords) {
    return analysis.topConcerns.some(concern => 
      keywords.some(keyword => concern.concern.toLowerCase().includes(keyword))
    );
  }
  
  checkInactivity(user) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return user.lastActivity && new Date(user.lastActivity) < oneWeekAgo;
  }
  
  async generateAlertSummary(userId) {
    const analysis = await userAnalysisService.generateUserAnalysis(userId);
    const user = await User.findById(userId);
    const alerts = await this.checkForAlerts(userId);
    
    return {
      studentName: user.name,
      studentId: user.studentId,
      riskLevel: user.screeningData?.riskLevel || 'low',
      alerts: alerts,
      summary: {
        recentActivity: analysis.overview.lastActivity,
        primaryConcerns: analysis.topConcerns.slice(0, 3),
        trend: analysis.progressIndicators.overallTrend,
        engagementLevel: analysis.progressIndicators.engagementLevel
      },
      recommendations: analysis.recommendations.slice(0, 2)
    };
  }
}

module.exports = new AlertService();
