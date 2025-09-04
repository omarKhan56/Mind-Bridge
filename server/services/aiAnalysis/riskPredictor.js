const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class RiskPredictor {
  constructor() {
    this.model = null;
  }

  getModel() {
    if (!this.model && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-google-gemini-api-key-here') {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    return this.model;
  }

  async predictRiskLevel(userData) {
    try {
      const model = this.getModel();
      if (!model) {
        return this.getFallbackRiskAnalysis(userData);
      }

      const prompt = `
        Analyze mental health risk. Return ONLY JSON:
        
        Data: ${JSON.stringify({
          wellness: userData.wellnessData?.slice(-5) || [],
          screening: userData.screeningData || {},
          usage: userData.usagePatterns || {}
        })}
        
        Return:
        {
          "currentRiskLevel": "low|moderate|high|critical",
          "riskScore": 50,
          "riskFactors": ["factor1", "factor2"],
          "protectiveFactors": ["factor1"],
          "alertCounselor": false,
          "confidenceLevel": 0.8
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean the response text
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (parseError) {
        console.log('JSON parse failed, using fallback');
        return this.getFallbackRiskAnalysis(userData);
      }
      
      return {
        ...analysis,
        analysisDate: new Date(),
        userId: userData.userId
      };
    } catch (error) {
      console.error('Risk prediction error:', error);
      return this.getFallbackRiskAnalysis(userData);
    }
  }

  calculateRiskScore(userData) {
    let score = 0;
    
    // Wellness data contribution (0-30 points)
    if (userData.wellnessData && userData.wellnessData.length > 0) {
      const avgMood = userData.wellnessData.reduce((sum, entry) => sum + entry.mood, 0) / userData.wellnessData.length;
      const avgStress = userData.wellnessData.reduce((sum, entry) => sum + entry.stress, 0) / userData.wellnessData.length;
      score += Math.max(0, 30 - (avgMood * 2) + (avgStress * 2));
    }
    
    // Screening data contribution (0-40 points)
    if (userData.screeningData) {
      score += (userData.screeningData.phq9Score || 0) * 2;
      score += (userData.screeningData.gad7Score || 0) * 2;
    }
    
    // Chat sentiment contribution (0-20 points)
    if (userData.chatSentiment) {
      score += Math.max(0, 20 - (userData.chatSentiment.overallSentiment * 2));
      if (userData.chatSentiment.crisisIndicators?.present) {
        score += 15;
      }
    }
    
    // Usage patterns contribution (0-10 points)
    if (userData.usagePatterns) {
      if (userData.usagePatterns.loginFrequency < 3) score += 5;
      if (userData.usagePatterns.sessionDuration < 10) score += 3;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  getFallbackRiskAnalysis(userData) {
    const riskScore = this.calculateRiskScore(userData);
    let riskLevel = 'low';
    
    if (riskScore >= 70) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'moderate';
    
    return {
      currentRiskLevel: riskLevel,
      riskScore,
      predictedRiskIn7Days: riskLevel,
      predictedRiskIn30Days: riskLevel,
      riskFactors: ['Limited data available'],
      protectiveFactors: ['Engaged with platform'],
      interventionRecommendations: [
        {
          type: 'short-term',
          action: 'Continue monitoring',
          priority: 2
        }
      ],
      alertCounselor: riskScore >= 70,
      confidenceLevel: 0.6,
      analysisDate: new Date(),
      userId: userData.userId
    };
  }
}

module.exports = RiskPredictor;
