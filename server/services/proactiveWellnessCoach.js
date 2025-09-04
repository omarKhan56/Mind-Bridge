const RiskPredictionEngine = require('./riskPredictionEngine');
const BehavioralPatternAnalyzer = require('./behavioralPatternAnalyzer');

class ProactiveWellnessCoach {
  constructor() {
    this.riskEngine = new RiskPredictionEngine();
    this.patternAnalyzer = new BehavioralPatternAnalyzer();
    
    this.interventions = {
      stress_management: {
        techniques: ['deep_breathing', 'progressive_relaxation', 'mindfulness'],
        resources: ['breathing_exercises', 'meditation_apps', 'stress_reduction_guides']
      },
      academic_support: {
        techniques: ['time_management', 'study_planning', 'goal_setting'],
        resources: ['study_guides', 'academic_counseling', 'tutoring_services']
      },
      social_connection: {
        techniques: ['peer_support', 'group_activities', 'communication_skills'],
        resources: ['support_groups', 'social_events', 'friendship_building']
      },
      sleep_hygiene: {
        techniques: ['sleep_schedule', 'relaxation_routine', 'environment_optimization'],
        resources: ['sleep_guides', 'relaxation_audio', 'sleep_tracking']
      }
    };

    this.wellnessGoals = {
      daily: ['mood_check', 'gratitude_practice', 'physical_activity'],
      weekly: ['social_connection', 'self_care_activity', 'progress_review'],
      monthly: ['goal_assessment', 'habit_evaluation', 'wellness_planning']
    };
  }

  async generateWellnessRecommendations(userId) {
    try {
      const [riskData, patterns] = await Promise.all([
        this.riskEngine.calculateRiskScore(userId),
        this.patternAnalyzer.analyzeUserPatterns(userId)
      ]);

      const recommendations = {
        immediate: [],
        shortTerm: [],
        longTerm: [],
        resources: [],
        goals: []
      };

      // Risk-based recommendations
      if (riskData.riskLevel === 'high' || riskData.riskLevel === 'critical') {
        recommendations.immediate.push({
          type: 'crisis_support',
          priority: 'urgent',
          message: 'Immediate professional support recommended',
          actions: ['contact_counselor', 'crisis_resources', 'safety_planning']
        });
      }

      // Pattern-based recommendations
      this.addPatternBasedRecommendations(patterns, recommendations);
      
      // Risk factor specific recommendations
      this.addRiskFactorRecommendations(riskData.factors, recommendations);

      // Wellness goals
      recommendations.goals = this.generatePersonalizedGoals(riskData, patterns);

      return {
        userId,
        recommendations,
        riskLevel: riskData.riskLevel,
        patterns: patterns,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Wellness recommendation error:', error);
      return { error: error.message, recommendations: { immediate: [], shortTerm: [], longTerm: [] } };
    }
  }

  addPatternBasedRecommendations(patterns, recommendations) {
    // Engagement patterns
    if (patterns.engagementLevel?.level === 'low') {
      recommendations.shortTerm.push({
        type: 'engagement_boost',
        message: 'Consider setting small, achievable daily check-in goals',
        techniques: ['daily_mood_tracking', 'brief_journaling', 'gratitude_practice']
      });
    }

    // Mood patterns
    if (patterns.moodProgression?.trend === 'declining') {
      recommendations.immediate.push({
        type: 'mood_support',
        message: 'Focus on mood stabilization techniques',
        techniques: this.interventions.stress_management.techniques,
        resources: this.interventions.stress_management.resources
      });
    }

    // Frequency patterns
    if (patterns.chatFrequency?.pattern === 'low_engagement') {
      recommendations.longTerm.push({
        type: 'consistency_building',
        message: 'Build a regular self-care routine',
        techniques: ['scheduled_check_ins', 'habit_stacking', 'reminder_systems']
      });
    }

    // Anomaly-based recommendations
    patterns.anomalies?.forEach(anomaly => {
      if (anomaly.type === 'mood_volatility') {
        recommendations.shortTerm.push({
          type: 'mood_stabilization',
          message: 'Focus on emotional regulation techniques',
          techniques: ['mindfulness', 'emotion_tracking', 'coping_strategies']
        });
      }
    });
  }

  addRiskFactorRecommendations(factors, recommendations) {
    factors.forEach(factor => {
      switch (factor.factor) {
        case 'academic_pressure':
          recommendations.shortTerm.push({
            type: 'academic_support',
            message: 'Academic stress management strategies',
            techniques: this.interventions.academic_support.techniques,
            resources: this.interventions.academic_support.resources
          });
          break;

        case 'isolation_mentions':
          recommendations.immediate.push({
            type: 'social_connection',
            message: 'Focus on building social connections',
            techniques: this.interventions.social_connection.techniques,
            resources: this.interventions.social_connection.resources
          });
          break;

        case 'sleep_issues':
          recommendations.shortTerm.push({
            type: 'sleep_improvement',
            message: 'Sleep hygiene and rest optimization',
            techniques: this.interventions.sleep_hygiene.techniques,
            resources: this.interventions.sleep_hygiene.resources
          });
          break;
      }
    });
  }

  generatePersonalizedGoals(riskData, patterns) {
    const goals = [];

    // Risk-based goals
    if (riskData.riskLevel === 'moderate' || riskData.riskLevel === 'high') {
      goals.push({
        type: 'daily',
        category: 'safety',
        goal: 'Daily mood and safety check-in',
        target: 'Complete daily mood assessment',
        timeframe: '7 days'
      });
    }

    // Pattern-based goals
    if (patterns.engagementLevel?.level === 'low') {
      goals.push({
        type: 'weekly',
        category: 'engagement',
        goal: 'Increase platform engagement',
        target: 'Have 2-3 meaningful conversations per week',
        timeframe: '2 weeks'
      });
    }

    if (patterns.moodProgression?.trend === 'declining') {
      goals.push({
        type: 'daily',
        category: 'mood',
        goal: 'Practice mood-boosting activities',
        target: 'Complete one stress-reduction technique daily',
        timeframe: '10 days'
      });
    }

    // General wellness goals
    goals.push({
      type: 'weekly',
      category: 'self_care',
      goal: 'Self-care practice',
      target: 'Engage in one enjoyable self-care activity',
      timeframe: 'ongoing'
    });

    return goals;
  }

  async generateProactiveIntervention(userId, triggerType, data) {
    const interventions = {
      risk_increase: {
        message: "I've noticed some changes in your recent interactions that suggest you might be going through a challenging time. Would you like to talk about what's been on your mind?",
        actions: ['offer_support', 'suggest_resources', 'schedule_check_in'],
        urgency: 'high'
      },
      engagement_drop: {
        message: "I haven't heard from you in a while and wanted to check in. How are you doing? Remember, I'm here whenever you need support.",
        actions: ['gentle_check_in', 'offer_conversation', 'share_resources'],
        urgency: 'medium'
      },
      mood_decline: {
        message: "I've noticed your mood has been lower recently. It's completely normal to have ups and downs. Would you like to explore some strategies that might help?",
        actions: ['mood_support', 'coping_strategies', 'professional_referral'],
        urgency: 'medium'
      },
      pattern_change: {
        message: "I've noticed some changes in your interaction patterns. Sometimes changes can indicate we're going through something. How are things going for you?",
        actions: ['pattern_discussion', 'support_offer', 'resource_sharing'],
        urgency: 'low'
      }
    };

    const intervention = interventions[triggerType] || interventions.pattern_change;

    return {
      userId,
      type: 'proactive_intervention',
      trigger: triggerType,
      message: intervention.message,
      suggestedActions: intervention.actions,
      urgency: intervention.urgency,
      data: data,
      createdAt: new Date()
    };
  }

  async trackGoalProgress(userId, goalId, progress) {
    // This would integrate with a goal tracking system
    return {
      userId,
      goalId,
      progress,
      updatedAt: new Date(),
      nextMilestone: this.calculateNextMilestone(progress)
    };
  }

  calculateNextMilestone(currentProgress) {
    const milestones = [25, 50, 75, 100];
    return milestones.find(milestone => milestone > currentProgress) || 100;
  }

  async generateCelebration(userId, achievement) {
    const celebrations = {
      goal_completed: "🎉 Congratulations! You've completed your wellness goal. This is a significant step in your mental health journey!",
      streak_milestone: "🔥 Amazing! You've maintained your wellness routine. Consistency is key to building lasting positive habits!",
      mood_improvement: "📈 I've noticed positive changes in your mood patterns. Your efforts are making a real difference!",
      engagement_increase: "💪 You've been more active in taking care of your mental health. Keep up the great work!"
    };

    return {
      userId,
      type: 'celebration',
      message: celebrations[achievement.type] || celebrations.goal_completed,
      achievement: achievement,
      createdAt: new Date()
    };
  }
}

module.exports = ProactiveWellnessCoach;
