const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Resource = require('../models/Resource');
const ForumPost = require('../models/Forum');

class AnalyticsService {
  async getUserAnalytics(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Mental health trends
      const mentalHealthTrend = this.calculateMentalHealthTrend(user.screeningData);
      
      // Activity metrics
      const appointments = await Appointment.find({ 
        student: userId,
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      const resourcesViewed = user.resourcesAccessed?.length || 0;
      
      const forumPosts = await ForumPost.find({
        author: userId,
        createdAt: { $gte: thirtyDaysAgo }
      });

      // Engagement score (0-100)
      const engagementScore = this.calculateEngagementScore({
        appointments: appointments.length,
        resourcesViewed,
        forumPosts: forumPosts.length,
        lastActive: user.lastActive
      });

      // Personalized recommendations
      const recommendations = this.generateRecommendations(user, {
        appointments,
        resourcesViewed,
        forumPosts: forumPosts.length
      });

      return {
        mentalHealthTrend,
        engagementScore,
        activitySummary: {
          appointmentsThisMonth: appointments.length,
          resourcesViewed,
          forumPostsThisMonth: forumPosts.length
        },
        recommendations,
        riskAssessment: this.assessCurrentRisk(user)
      };
    } catch (error) {
      console.error('Analytics error:', error);
      return null;
    }
  }

  calculateMentalHealthTrend(screeningData) {
    if (!screeningData?.lastScreening) return 'no-data';
    
    const { phq9Score, gad7Score, riskLevel } = screeningData;
    const totalScore = phq9Score + gad7Score;
    
    if (totalScore <= 10) return 'improving';
    if (totalScore <= 20) return 'stable';
    return 'needs-attention';
  }

  calculateEngagementScore({ appointments, resourcesViewed, forumPosts, lastActive }) {
    let score = 0;
    
    // Appointment engagement (0-40 points)
    score += Math.min(appointments * 10, 40);
    
    // Resource engagement (0-30 points)
    score += Math.min(resourcesViewed * 2, 30);
    
    // Forum engagement (0-20 points)
    score += Math.min(forumPosts * 5, 20);
    
    // Recent activity (0-10 points)
    const daysSinceActive = (Date.now() - new Date(lastActive)) / (1000 * 60 * 60 * 24);
    if (daysSinceActive <= 1) score += 10;
    else if (daysSinceActive <= 7) score += 5;
    
    return Math.min(score, 100);
  }

  generateRecommendations(user, activity) {
    const recommendations = [];
    const { screeningData } = user;
    
    if (screeningData?.riskLevel === 'high') {
      recommendations.push({
        type: 'urgent',
        title: 'Schedule Counseling Session',
        description: 'Your recent screening indicates you may benefit from professional support.',
        action: '/appointments'
      });
    }
    
    if (activity.appointments === 0) {
      recommendations.push({
        type: 'suggestion',
        title: 'Try AI Chat Support',
        description: 'Get 24/7 support and coping strategies from our AI assistant.',
        action: '/chat'
      });
    }
    
    if (activity.resourcesViewed < 3) {
      recommendations.push({
        type: 'suggestion',
        title: 'Explore Wellness Resources',
        description: 'Discover guided meditations, stress management techniques, and more.',
        action: '/resources'
      });
    }
    
    if (activity.forumPosts === 0) {
      recommendations.push({
        type: 'suggestion',
        title: 'Connect with Peers',
        description: 'Join our supportive community forum to share experiences.',
        action: '/forum'
      });
    }
    
    return recommendations;
  }

  assessCurrentRisk(user) {
    const { screeningData, lastActive } = user;
    
    if (!screeningData?.lastScreening) {
      return {
        level: 'unknown',
        message: 'Complete screening assessment for personalized insights'
      };
    }
    
    const daysSinceScreening = (Date.now() - new Date(screeningData.lastScreening)) / (1000 * 60 * 60 * 24);
    
    if (daysSinceScreening > 30) {
      return {
        level: 'outdated',
        message: 'Your screening data is over 30 days old. Consider retaking the assessment.'
      };
    }
    
    return {
      level: screeningData.riskLevel,
      message: this.getRiskMessage(screeningData.riskLevel)
    };
  }

  getRiskMessage(riskLevel) {
    switch (riskLevel) {
      case 'low':
        return 'You\'re doing well! Keep up with healthy habits and regular check-ins.';
      case 'moderate':
        return 'Consider using our resources and connecting with support when needed.';
      case 'high':
        return 'We recommend speaking with a counselor for additional support.';
      default:
        return 'Complete your screening for personalized insights.';
    }
  }
}

module.exports = new AnalyticsService();
