const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class PatternDetector {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async detectBehavioralPatterns(userData) {
    try {
      const prompt = `
        Analyze behavioral patterns in this student's mental health data:
        
        Data: ${JSON.stringify(userData)}
        
        Return JSON with:
        {
          "weeklyPatterns": {
            "bestDays": ["Monday", "Tuesday"],
            "worstDays": ["Sunday", "Wednesday"],
            "patterns": ["description of weekly cycles"]
          },
          "dailyPatterns": {
            "bestTimes": ["morning", "afternoon", "evening"],
            "worstTimes": ["late night", "early morning"],
            "patterns": ["description of daily cycles"]
          },
          "seasonalPatterns": {
            "trends": ["seasonal affective patterns"],
            "triggers": ["exam periods", "holidays"]
          },
          "usagePatterns": {
            "engagementLevel": "high|medium|low",
            "preferredFeatures": ["AI chat", "wellness tracking"],
            "avoidedFeatures": ["forum", "appointments"],
            "sessionPatterns": ["short frequent", "long infrequent"]
          },
          "improvementIndicators": ["signs of positive change"],
          "warningSignals": ["early indicators of decline"],
          "personalizedRecommendations": [
            {
              "category": "timing|activity|intervention",
              "recommendation": "specific actionable advice",
              "confidence": number (0-1)
            }
          ]
        }
      `;

      const result = await (this.getModel() || {generateContent: () => { throw new Error("No model available"); }}).generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const patterns = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      
      return {
        ...patterns,
        analysisDate: new Date(),
        userId: userData.userId
      };
    } catch (error) {
      console.error('Pattern detection error:', error);
      return this.getFallbackPatterns(userData);
    }
  }

  async detectCommunityPatterns(communityData) {
    try {
      const prompt = `
        Analyze community-wide mental health patterns:
        
        Community Data: ${JSON.stringify(communityData)}
        
        Return JSON with:
        {
          "campusWidePatterns": {
            "overallMentalHealthTrend": "improving|stable|declining",
            "highRiskPeriods": ["exam weeks", "semester start"],
            "peakUsageTimes": ["times when platform usage spikes"],
            "commonConcerns": ["top mental health issues"]
          },
          "demographicPatterns": {
            "byDepartment": {"CS": "high stress", "Psychology": "moderate"},
            "byYear": {"1": "adjustment issues", "4": "career anxiety"},
            "byGender": {"patterns by gender if any"}
          },
          "interventionEffectiveness": {
            "aiChatSuccess": number (0-10),
            "peerSupportImpact": number (0-10),
            "counselingOutcomes": number (0-10)
          },
          "resourceOptimization": [
            {
              "resource": "counselors|AI|peer support",
              "currentUtilization": number (0-100),
              "recommendedAdjustment": "increase|decrease|maintain",
              "reasoning": "explanation"
            }
          ],
          "earlyWarningSignals": ["campus-wide indicators to monitor"]
        }
      `;

      const result = await (this.getModel() || {generateContent: () => { throw new Error("No model available"); }}).generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (error) {
      console.error('Community pattern detection error:', error);
      return this.getFallbackCommunityPatterns();
    }
  }

  analyzeWellnessTrends(wellnessData) {
    if (!wellnessData || wellnessData.length === 0) {
      return { trend: 'insufficient_data', patterns: [] };
    }

    const trends = {
      mood: this.calculateTrend(wellnessData.map(d => d.mood)),
      stress: this.calculateTrend(wellnessData.map(d => d.stress)),
      sleep: this.calculateTrend(wellnessData.map(d => d.sleep))
    };

    return {
      trends,
      overallDirection: this.getOverallTrend(trends),
      volatility: this.calculateVolatility(wellnessData),
      patterns: this.identifyPatterns(wellnessData)
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  getOverallTrend(trends) {
    const avgTrend = (trends.mood - trends.stress + trends.sleep) / 3;
    if (avgTrend > 0.1) return 'improving';
    if (avgTrend < -0.1) return 'declining';
    return 'stable';
  }

  calculateVolatility(data) {
    if (data.length < 2) return 0;
    
    const changes = data.slice(1).map((curr, i) => {
      const prev = data[i];
      return Math.abs(curr.mood - prev.mood) + 
             Math.abs(curr.stress - prev.stress) + 
             Math.abs(curr.sleep - prev.sleep);
    });
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  identifyPatterns(data) {
    const patterns = [];
    
    // Weekly patterns
    const dayOfWeek = data.map(d => new Date(d.date).getDay());
    const weekendData = data.filter((_, i) => [0, 6].includes(dayOfWeek[i]));
    const weekdayData = data.filter((_, i) => ![0, 6].includes(dayOfWeek[i]));
    
    if (weekendData.length > 0 && weekdayData.length > 0) {
      const weekendAvg = weekendData.reduce((sum, d) => sum + d.mood, 0) / weekendData.length;
      const weekdayAvg = weekdayData.reduce((sum, d) => sum + d.mood, 0) / weekdayData.length;
      
      if (Math.abs(weekendAvg - weekdayAvg) > 1) {
        patterns.push({
          type: 'weekly',
          description: weekendAvg > weekdayAvg ? 'Better mood on weekends' : 'Better mood on weekdays',
          strength: Math.abs(weekendAvg - weekdayAvg)
        });
      }
    }
    
    return patterns;
  }

  getFallbackPatterns(userData) {
    return {
      weeklyPatterns: {
        bestDays: ['Friday', 'Saturday'],
        worstDays: ['Monday', 'Sunday'],
        patterns: ['Typical weekend improvement pattern']
      },
      dailyPatterns: {
        bestTimes: ['morning'],
        worstTimes: ['late night'],
        patterns: ['Morning mood tends to be better']
      },
      seasonalPatterns: {
        trends: ['No clear seasonal patterns detected'],
        triggers: ['Exam periods may increase stress']
      },
      usagePatterns: {
        engagementLevel: 'medium',
        preferredFeatures: ['AI chat'],
        avoidedFeatures: [],
        sessionPatterns: ['Regular usage']
      },
      improvementIndicators: ['Consistent platform engagement'],
      warningSignals: ['Monitor for usage drops'],
      personalizedRecommendations: [
        {
          category: 'timing',
          recommendation: 'Continue morning wellness check-ins',
          confidence: 0.7
        }
      ],
      analysisDate: new Date(),
      userId: userData.userId
    };
  }

  getFallbackCommunityPatterns() {
    return {
      campusWidePatterns: {
        overallMentalHealthTrend: 'stable',
        highRiskPeriods: ['exam weeks', 'semester transitions'],
        peakUsageTimes: ['evening hours', 'weekends'],
        commonConcerns: ['academic stress', 'social anxiety']
      },
      demographicPatterns: {
        byDepartment: {},
        byYear: {},
        byGender: {}
      },
      interventionEffectiveness: {
        aiChatSuccess: 7,
        peerSupportImpact: 8,
        counselingOutcomes: 9
      },
      resourceOptimization: [
        {
          resource: 'AI chat',
          currentUtilization: 75,
          recommendedAdjustment: 'maintain',
          reasoning: 'Good utilization rate'
        }
      ],
      earlyWarningSignals: ['Decreased platform engagement', 'Increased crisis chat sessions']
    };
  }
}

module.exports = PatternDetector;
