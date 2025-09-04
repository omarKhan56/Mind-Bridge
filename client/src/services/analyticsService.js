import axios from 'axios';

class AnalyticsService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '';
  }

  // Get authorization headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // Risk Prediction Services
  async getRiskScore(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/analytics/risk/${userId}`, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Risk score fetch failed:', error);
      throw error;
    }
  }

  // Behavioral Pattern Services
  async getBehavioralPatterns(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/analytics/patterns/${userId}`, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Behavioral patterns fetch failed:', error);
      throw error;
    }
  }

  // Wellness Recommendations
  async getWellnessRecommendations(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/analytics/wellness/${userId}`, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Wellness recommendations fetch failed:', error);
      throw error;
    }
  }

  // Dashboard Analytics
  async getDashboardAnalytics() {
    try {
      const response = await axios.get(`${this.baseURL}/api/analytics/dashboard`, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Dashboard analytics fetch failed:', error);
      throw error;
    }
  }

  // Trend Analysis
  async getTrends(timeframe = '30d', userId = null) {
    try {
      const params = { timeframe };
      if (userId) params.userId = userId;
      
      const response = await axios.get(`${this.baseURL}/api/analytics/trends`, {
        ...this.getAuthHeaders(),
        params
      });
      return response.data;
    } catch (error) {
      console.error('Trends fetch failed:', error);
      throw error;
    }
  }

  // Proactive Interventions
  async generateIntervention(userId, triggerType, data) {
    try {
      const response = await axios.post(`${this.baseURL}/api/analytics/intervention`, {
        userId,
        triggerType,
        data
      }, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Intervention generation failed:', error);
      throw error;
    }
  }

  // Goal Progress Tracking
  async trackGoalProgress(goalId, progress) {
    try {
      const response = await axios.post(`${this.baseURL}/api/analytics/goals/${goalId}/progress`, {
        progress
      }, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Goal progress tracking failed:', error);
      throw error;
    }
  }

  // Institutional Analytics (Admin only)
  async getInstitutionalInsights() {
    try {
      const response = await axios.get(`${this.baseURL}/api/analytics/institutional`, this.getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Institutional insights fetch failed:', error);
      throw error;
    }
  }

  // Batch Analytics for Multiple Users
  async getBatchAnalytics(userIds) {
    try {
      const promises = userIds.map(userId => Promise.all([
        this.getRiskScore(userId).catch(() => null),
        this.getBehavioralPatterns(userId).catch(() => null),
        this.getWellnessRecommendations(userId).catch(() => null)
      ]));

      const results = await Promise.all(promises);
      
      return userIds.map((userId, index) => ({
        userId,
        riskData: results[index][0],
        patterns: results[index][1],
        wellness: results[index][2]
      }));
    } catch (error) {
      console.error('Batch analytics fetch failed:', error);
      throw error;
    }
  }

  // Real-time Analytics Updates
  async getRealtimeUpdates(userId) {
    try {
      const [riskData, patterns, wellness] = await Promise.all([
        this.getRiskScore(userId).catch(() => null),
        this.getBehavioralPatterns(userId).catch(() => null),
        this.getWellnessRecommendations(userId).catch(() => null)
      ]);

      return {
        userId,
        riskData,
        patterns,
        wellness,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Real-time updates fetch failed:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
