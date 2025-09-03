// Test AI API endpoints from frontend
export const testAIEndpoints = async () => {
  const token = localStorage.getItem('token');
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Testing AI API Endpoints from Frontend...');

  try {
    // Test 1: Get AI status
    const statusResponse = await fetch(`${baseURL}/api/ai-analysis/status`, { headers });
    const status = await statusResponse.json();
    console.log('✅ AI Status:', status.mode, status.message);

    // Test 2: Get user insights
    const insightsResponse = await fetch(`${baseURL}/api/ai-analysis/insights`, { headers });
    const insights = await insightsResponse.json();
    console.log('✅ User Insights:', insights.personalInsights?.length || 0, 'insights loaded');

    // Test 3: Get analysis history
    const historyResponse = await fetch(`${baseURL}/api/ai-analysis/history`, { headers });
    const history = await historyResponse.json();
    console.log('✅ Analysis History:', history.riskLevel || 'No data');

    // Test 4: Real-time message analysis
    const messageResponse = await fetch(`${baseURL}/api/ai-analysis/analyze-message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'I feel anxious about my exams',
        sessionId: 'test-session'
      })
    });
    const messageAnalysis = await messageResponse.json();
    console.log('✅ Message Analysis:', messageAnalysis.sentiment + '/10 sentiment');

    return {
      status: 'success',
      aiMode: status.mode,
      insightsCount: insights.personalInsights?.length || 0,
      riskLevel: history.riskLevel,
      sentiment: messageAnalysis.sentiment
    };

  } catch (error) {
    console.error('❌ Frontend AI Test Failed:', error);
    return { status: 'error', error: error.message };
  }
};

// Usage: Call this in browser console
// import { testAIEndpoints } from './utils/testAI';
// testAIEndpoints().then(console.log);
