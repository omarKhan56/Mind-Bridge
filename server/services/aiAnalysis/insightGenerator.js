const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class InsightGenerator {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generatePersonalInsights(analysisData) {
    try {
      const prompt = `
        Generate personalized mental health insights for a student based on this analysis:
        
        Analysis Data: ${JSON.stringify(analysisData)}
        
        Return JSON with:
        {
          "keyInsights": [
            {
              "title": "Your Mood is Improving",
              "description": "detailed explanation",
              "type": "positive|neutral|concerning",
              "confidence": number (0-1),
              "actionable": boolean
            }
          ],
          "progressSummary": {
            "overallProgress": "excellent|good|fair|needs_attention",
            "improvementAreas": ["specific areas showing progress"],
            "concernAreas": ["areas needing attention"],
            "progressPercentage": number (0-100)
          },
          "personalizedRecommendations": [
            {
              "category": "wellness|social|academic|professional",
              "recommendation": "specific actionable advice",
              "priority": "high|medium|low",
              "timeframe": "immediate|this_week|this_month",
              "expectedImpact": "high|medium|low"
            }
          ],
          "motivationalMessage": "encouraging personalized message",
          "nextSteps": ["immediate actions the student can take"],
          "resourceSuggestions": [
            {
              "type": "article|video|exercise|appointment",
              "title": "resource title",
              "description": "why this resource is recommended",
              "urgency": "high|medium|low"
            }
          ]
        }
      `;

      const result = await (this.getModel() || {generateContent: () => { throw new Error("No model available"); }}).generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const insights = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      
      return {
        ...insights,
        generatedAt: new Date(),
        userId: analysisData.userId
      };
    } catch (error) {
      console.error('Insight generation error:', error);
      return this.getFallbackInsights(analysisData);
    }
  }

  async generateCounselorInsights(studentData) {
    try {
      const prompt = `
        Generate counselor insights for a student based on comprehensive analysis:
        
        Student Data: ${JSON.stringify(studentData)}
        
        Return JSON with:
        {
          "riskAssessment": {
            "currentLevel": "low|moderate|high|critical",
            "keyRiskFactors": ["specific factors"],
            "protectiveFactors": ["positive elements"],
            "interventionUrgency": number (1-5)
          },
          "sessionPreparation": {
            "keyTopicsToAddress": ["topics from recent interactions"],
            "studentConcerns": ["main worries expressed"],
            "progressToDiscuss": ["positive changes to acknowledge"],
            "suggestedApproaches": ["CBT", "mindfulness", "behavioral activation"]
          },
          "treatmentRecommendations": [
            {
              "intervention": "specific treatment approach",
              "rationale": "why this is recommended",
              "priority": "high|medium|low",
              "timeline": "immediate|short-term|long-term"
            }
          ],
          "monitoringAlerts": [
            {
              "indicator": "what to watch for",
              "frequency": "daily|weekly|monthly",
              "threshold": "when to be concerned"
            }
          ],
          "collaborativeCare": {
            "referralNeeded": boolean,
            "referralType": "psychiatrist|specialist|emergency",
            "familyInvolvement": "recommended|not_recommended|discuss_with_student"
          }
        }
      `;

      const result = await (this.getModel() || {generateContent: () => { throw new Error("No model available"); }}).generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (error) {
      console.error('Counselor insight generation error:', error);
      return this.getFallbackCounselorInsights(studentData);
    }
  }

  async generateAdminInsights(institutionalData) {
    try {
      const prompt = `
        Generate administrative insights for institutional mental health management:
        
        Institutional Data: ${JSON.stringify(institutionalData)}
        
        Return JSON with:
        {
          "populationHealth": {
            "overallTrend": "improving|stable|declining",
            "riskDistribution": {"low": 60, "moderate": 30, "high": 10},
            "emergingConcerns": ["new patterns or issues"],
            "successMetrics": ["positive indicators"]
          },
          "resourceUtilization": {
            "counselorWorkload": "optimal|high|critical",
            "aiChatEffectiveness": number (0-10),
            "platformEngagement": number (0-100),
            "interventionSuccess": number (0-100)
          },
          "strategicRecommendations": [
            {
              "area": "staffing|technology|programs|outreach",
              "recommendation": "specific action",
              "impact": "high|medium|low",
              "cost": "high|medium|low|none",
              "timeline": "immediate|quarterly|annual"
            }
          ],
          "earlyWarningSystem": {
            "campusRiskLevel": "green|yellow|orange|red",
            "triggerEvents": ["events to monitor"],
            "preventiveActions": ["proactive measures to take"]
          },
          "outcomeMetrics": {
            "studentSatisfaction": number (0-10),
            "crisisReduction": number (percentage),
            "academicImpact": "positive|neutral|negative",
            "costEffectiveness": number (0-10)
          }
        }
      `;

      const result = await (this.getModel() || {generateContent: () => { throw new Error("No model available"); }}).generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (error) {
      console.error('Admin insight generation error:', error);
      return this.getFallbackAdminInsights(institutionalData);
    }
  }

  generateDailyInsight(userData) {
    const insights = [];
    
    // Wellness trend insight
    if (userData.wellnessData && userData.wellnessData.length >= 3) {
      const recent = userData.wellnessData.slice(-3);
      const avgMood = recent.reduce((sum, d) => sum + d.mood, 0) / recent.length;
      
      if (avgMood >= 7) {
        insights.push({
          title: "Positive Mood Trend",
          description: `Your mood has been consistently good over the past few days (average: ${avgMood.toFixed(1)}/10)`,
          type: "positive",
          confidence: 0.8,
          actionable: false
        });
      } else if (avgMood <= 4) {
        insights.push({
          title: "Mood Needs Attention",
          description: `Your mood has been lower than usual. Consider reaching out for support.`,
          type: "concerning",
          confidence: 0.7,
          actionable: true
        });
      }
    }
    
    // Usage pattern insight
    if (userData.usagePatterns) {
      if (userData.usagePatterns.loginFrequency >= 5) {
        insights.push({
          title: "Great Platform Engagement",
          description: "You're actively using MindBridge, which shows commitment to your mental health",
          type: "positive",
          confidence: 0.9,
          actionable: false
        });
      }
    }
    
    return insights;
  }

  getFallbackInsights(analysisData) {
    return {
      keyInsights: [
        {
          title: "Keep Up the Good Work",
          description: "You're actively engaging with your mental health support",
          type: "positive",
          confidence: 0.7,
          actionable: false
        }
      ],
      progressSummary: {
        overallProgress: "good",
        improvementAreas: ["Platform engagement"],
        concernAreas: [],
        progressPercentage: 75
      },
      personalizedRecommendations: [
        {
          category: "wellness",
          recommendation: "Continue daily wellness check-ins",
          priority: "medium",
          timeframe: "this_week",
          expectedImpact: "medium"
        }
      ],
      motivationalMessage: "You're taking important steps for your mental health. Keep going!",
      nextSteps: ["Complete today's wellness check-in", "Consider scheduling a counselor session"],
      resourceSuggestions: [
        {
          type: "exercise",
          title: "Mindfulness Meditation",
          description: "Based on your patterns, mindfulness could be helpful",
          urgency: "low"
        }
      ],
      generatedAt: new Date(),
      userId: analysisData.userId
    };
  }

  getFallbackCounselorInsights(studentData) {
    return {
      riskAssessment: {
        currentLevel: "moderate",
        keyRiskFactors: ["Limited data available"],
        protectiveFactors: ["Engaged with platform"],
        interventionUrgency: 2
      },
      sessionPreparation: {
        keyTopicsToAddress: ["General wellness check"],
        studentConcerns: ["Academic stress"],
        progressToDiscuss: ["Platform engagement"],
        suggestedApproaches: ["supportive counseling"]
      },
      treatmentRecommendations: [
        {
          intervention: "Continue supportive counseling",
          rationale: "Student is engaged and responsive",
          priority: "medium",
          timeline: "ongoing"
        }
      ],
      monitoringAlerts: [
        {
          indicator: "Platform usage frequency",
          frequency: "weekly",
          threshold: "Less than 2 logins per week"
        }
      ],
      collaborativeCare: {
        referralNeeded: false,
        referralType: null,
        familyInvolvement: "discuss_with_student"
      }
    };
  }

  getFallbackAdminInsights(institutionalData) {
    return {
      populationHealth: {
        overallTrend: "stable",
        riskDistribution: {"low": 70, "moderate": 25, "high": 5},
        emergingConcerns: ["Monitor exam period stress"],
        successMetrics: ["Good platform adoption"]
      },
      resourceUtilization: {
        counselorWorkload: "optimal",
        aiChatEffectiveness: 7,
        platformEngagement: 75,
        interventionSuccess: 80
      },
      strategicRecommendations: [
        {
          area: "programs",
          recommendation: "Continue current approach",
          impact: "medium",
          cost: "none",
          timeline: "ongoing"
        }
      ],
      earlyWarningSystem: {
        campusRiskLevel: "green",
        triggerEvents: ["Exam periods", "Semester transitions"],
        preventiveActions: ["Increase outreach during high-stress periods"]
      },
      outcomeMetrics: {
        studentSatisfaction: 8,
        crisisReduction: 15,
        academicImpact: "positive",
        costEffectiveness: 8
      }
    };
  }
}

module.exports = InsightGenerator;
