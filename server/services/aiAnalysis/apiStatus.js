const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class APIStatusService {
  constructor() {
    this.status = {
      geminiAvailable: false,
      lastChecked: null,
      capabilities: {
        chatCompletion: false,
        sentimentAnalysis: false,
        riskPrediction: true // Always available with fallback
      },
      fallbackMode: true
    };
    this.checkInterval = null;
  }

  async checkGeminiStatus() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your-google-gemini-api-key-here') {
        return false;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: { maxOutputTokens: 10 }
      });
      
      // Simple test prompt with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const testPromise = model.generateContent('Hello');
      const result = await Promise.race([testPromise, timeoutPromise]);
      const response = await result.response;
      
      return response.text().length > 0;
    } catch (error) {
      console.log('Gemini API status check failed:', error.message);
      return false;
    }
  }

  async updateStatus() {
    const geminiAvailable = await this.checkGeminiStatus();
    
    this.status = {
      geminiAvailable,
      lastChecked: new Date(),
      capabilities: {
        chatCompletion: geminiAvailable,
        sentimentAnalysis: geminiAvailable,
        riskPrediction: true // Always available with fallback
      },
      fallbackMode: !geminiAvailable
    };
    
    return this.status;
  }

  async getStatus() {
    // Update status if it's never been checked or is older than 5 minutes
    if (!this.status.lastChecked || 
        (Date.now() - this.status.lastChecked.getTime()) > 300000) {
      await this.updateStatus();
    }
    
    return this.status;
  }

  startPeriodicCheck(intervalMs = 300000) { // 5 minutes
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(async () => {
      await this.updateStatus();
    }, intervalMs);
  }

  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

module.exports = new APIStatusService();
