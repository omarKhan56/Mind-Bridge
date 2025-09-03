const { GoogleGenerativeAI } = require('@google/generative-ai');

class InsightGenerator {
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

  async generatePersonalInsights(analysisData) {
    try {
      const model = this.getModel();
      if (!model) {
        return this.getFallbackInsights(analysisData);
      }

      const prompt = `
        Generate mental health insights. Return ONLY JSON:
        
        Analysis: ${JSON.stringify({
          risk: analysisData.risk?.currentRiskLevel || 'moderate',
          sentiment: analysisData.sentiment?.combined?.overallSentiment || 5
        })}
        
        Return:
        {
          "keyInsights": [
            {
              "title": "Progress Update",
              "description": "Your mental health journey shows positive signs",
              "type": "positive"
            }
          ],
          "progressSummary": {
            "overallProgress": "good",
            "progressPercentage": 75
          },
          "motivationalMessage": "Keep up the great work on your mental health journey!"
        }
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean and try to parse JSON
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      
      try {
        const insights = JSON.parse(text);
        return { ...insights, generatedAt: new Date(), userId: analysisData.userId };
      } catch (parseError) {
        console.log('Insight generation: AI response not JSON, using fallback');
        return this.getFallbackInsights(analysisData);
      }
    } catch (error) {
      console.error('Insight generation error:', error);
      return this.getFallbackInsights(analysisData);
    }
  }

  getFallbackInsights(analysisData) {
    return {
      keyInsights: [{ title: 'Keep Up the Good Work', description: 'You are actively engaging with your mental health support', type: 'positive', confidence: 0.7 }],
      progressSummary: { overallProgress: 'good', progressPercentage: 75 },
      personalizedRecommendations: [{ category: 'wellness', recommendation: 'Continue daily wellness check-ins', priority: 'medium' }],
      motivationalMessage: 'You are making great progress!',
      nextSteps: ['Complete wellness tracking'],
      generatedAt: new Date(),
      userId: analysisData.userId
    };
  }
}

module.exports = InsightGenerator;
