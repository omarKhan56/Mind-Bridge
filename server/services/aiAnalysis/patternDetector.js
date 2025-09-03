const { GoogleGenerativeAI } = require('@google/generative-ai');

class PatternDetector {
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

  async detectBehavioralPatterns(userData) {
    try {
      const model = this.getModel();
      if (!model) {
        return this.getFallbackPatterns(userData);
      }

      const prompt = `
        Analyze behavioral patterns. Return ONLY JSON:
        
        Data: ${JSON.stringify({
          wellness: userData.wellnessEntries?.slice(-7) || [],
          usage: userData.usagePatterns || {}
        })}
        
        Return:
        {
          "weeklyPatterns": {
            "bestDays": ["Friday", "Saturday"],
            "worstDays": ["Monday"]
          },
          "usagePatterns": {
            "engagementLevel": "medium"
          }
        }
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean and try to parse JSON
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        const patterns = JSON.parse(text);
        return { ...patterns, analysisDate: new Date(), userId: userData.userId };
      } catch (parseError) {
        console.log('Pattern detection: AI response not JSON, using fallback');
        return this.getFallbackPatterns(userData);
      }
    } catch (error) {
      console.error('Pattern detection error:', error);
      return this.getFallbackPatterns(userData);
    }
  }

  getFallbackPatterns(userData) {
    return {
      weeklyPatterns: { bestDays: ['Friday'], worstDays: ['Monday'] },
      usagePatterns: { engagementLevel: 'medium' },
      analysisDate: new Date(),
      userId: userData.userId
    };
  }
}

module.exports = PatternDetector;
