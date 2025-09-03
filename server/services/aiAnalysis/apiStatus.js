const { GoogleGenerativeAI } = require('@google/generative-ai');

class APIStatusChecker {
  constructor() {
    this.geminiAvailable = false;
    this.lastCheck = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
  }

  async checkGeminiAPI() {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-google-gemini-api-key-here') {
        this.geminiAvailable = false;
        return false;
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Simple test request
      const result = await model.generateContent('Test');
      await result.response;
      
      this.geminiAvailable = true;
      this.lastCheck = new Date();
      return true;
    } catch (error) {
      this.geminiAvailable = false;
      this.lastCheck = new Date();
      return false;
    }
  }

  async getStatus() {
    // Check if we need to refresh status
    if (!this.lastCheck || (Date.now() - this.lastCheck.getTime()) > this.checkInterval) {
      await this.checkGeminiAPI();
    }

    return {
      geminiAvailable: this.geminiAvailable,
      lastCheck: this.lastCheck,
      mode: this.geminiAvailable ? 'enhanced' : 'fallback',
      capabilities: this.getCapabilities()
    };
  }

  getCapabilities() {
    if (this.geminiAvailable) {
      return {
        sentimentAnalysis: 'advanced',
        crisisDetection: 'high-accuracy',
        insightGeneration: 'personalized',
        riskPrediction: 'enhanced',
        patternDetection: 'complex'
      };
    } else {
      return {
        sentimentAnalysis: 'keyword-based',
        crisisDetection: 'basic-keywords',
        insightGeneration: 'template-based',
        riskPrediction: 'mathematical',
        patternDetection: 'statistical'
      };
    }
  }

  isGeminiAvailable() {
    return this.geminiAvailable;
  }
}

module.exports = new APIStatusChecker();
