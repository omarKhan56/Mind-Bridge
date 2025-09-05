const { inngest, inngestEnabled } = require('./inngest');

let aiAnalysisProcessor, analyticsAggregator, aiModelMonitor, aiResultHandler;

if (inngestEnabled && inngest) {
  // Background AI Analysis Pipeline
  aiAnalysisProcessor = inngest.createFunction(
    { 
      id: 'ai-analysis-processor',
      concurrency: { limit: 10 },
      batchEvents: { maxSize: 20, timeout: '10s' }
    },
    { event: 'ai/analyze-request' },
    async ({ events, step }) => {
      // Batch process multiple AI requests
      const results = await step.run('batch-ai-analysis', async () => {
        const aiAnalysisService = require('../services/aiAnalysis');
        const batchResults = [];
        
        for (const event of events) {
          const { userId, message, sessionId } = event.data;
          try {
            const analysis = await aiAnalysisService.analyzeMessage(message, userId);
            batchResults.push({ userId, sessionId, analysis, success: true });
          } catch (error) {
            batchResults.push({ userId, sessionId, error: error.message, success: false });
          }
        }
        
        return batchResults;
      });

      // Process results and trigger follow-up actions
      await step.run('process-results', async () => {
        const { eventHandler } = require('./inngest');
        
        for (const result of results) {
          if (result.success && result.analysis.risk?.alertCounselor) {
            await eventHandler.handleHighRiskUser(
              result.userId, 
              result.analysis.risk.riskLevel,
              { source: 'ai-analysis', confidence: result.analysis.risk.confidence }
            );
          }
          
          // Send result back to user session
          await inngest.send({
            name: 'ai/analysis-complete',
            data: { 
              userId: result.userId, 
              sessionId: result.sessionId,
              result: result.success ? result.analysis : { error: result.error }
            }
          });
        }
        
        return { processed: results.length };
      });
    }
  );

  // Other functions...
  analyticsAggregator = inngest.createFunction(
    { 
      id: 'analytics-aggregator',
      concurrency: { limit: 3 },
      batchEvents: { maxSize: 100, timeout: '30s' }
    },
    { event: 'analytics/user-action' },
    async ({ events, step }) => {
      // Implementation here...
      return { processed: events.length };
    }
  );

  aiModelMonitor = inngest.createFunction(
    { id: 'ai-model-monitor' },
    { cron: '*/15 * * * *' },
    async ({ step }) => {
      // Implementation here...
      return { monitored: true };
    }
  );

  aiResultHandler = inngest.createFunction(
    { id: 'ai-result-handler' },
    { event: 'ai/analysis-complete' },
    async ({ event, step }) => {
      // Implementation here...
      return { handled: true };
    }
  );
} else {
  // Fallback mode - no Inngest functions
  console.log('ℹ️ AI services running in fallback mode (no Inngest)');
  
  aiAnalysisProcessor = null;
  analyticsAggregator = null;
  aiModelMonitor = null;
  aiResultHandler = null;
}

module.exports = {
  aiAnalysisProcessor,
  analyticsAggregator,
  aiModelMonitor,
  aiResultHandler,
  inngestEnabled
};

// Background AI Analysis Pipeline
const aiAnalysisProcessor = inngest.createFunction(
  { 
    id: 'ai-analysis-processor',
    concurrency: { limit: 10 },
    batchEvents: { maxSize: 20, timeout: '10s' }
  },
  { event: 'ai/analyze-request' },
  async ({ events, step }) => {
    // Batch process multiple AI requests
    const results = await step.run('batch-ai-analysis', async () => {
      const aiAnalysisService = require('../services/aiAnalysis');
      const batchResults = [];
      
      for (const event of events) {
        const { userId, message, sessionId } = event.data;
        try {
          const analysis = await aiAnalysisService.analyzeMessage(message, userId);
          batchResults.push({ userId, sessionId, analysis, success: true });
        } catch (error) {
          batchResults.push({ userId, sessionId, error: error.message, success: false });
        }
      }
      
      return batchResults;
    });

    // Process results and trigger follow-up actions
    await step.run('process-results', async () => {
      const { eventHandler } = require('./inngest');
      
      for (const result of results) {
        if (result.success && result.analysis.risk?.alertCounselor) {
          await eventHandler.handleHighRiskUser(
            result.userId, 
            result.analysis.risk.riskLevel,
            { source: 'ai-analysis', confidence: result.analysis.risk.confidence }
          );
        }
        
        // Send result back to user session
        await inngest.send({
          name: 'ai/analysis-complete',
          data: { 
            userId: result.userId, 
            sessionId: result.sessionId,
            result: result.success ? result.analysis : { error: result.error }
          }
        });
      }
      
      return { processed: results.length };
    });
  }
);

// Smart Analytics Aggregator
const analyticsAggregator = inngest.createFunction(
  { 
    id: 'analytics-aggregator',
    concurrency: { limit: 3 },
    batchEvents: { maxSize: 100, timeout: '30s' }
  },
  { event: 'analytics/user-action' },
  async ({ events, step }) => {
    await step.run('aggregate-metrics', async () => {
      const Analytics = require('../models/Analytics');
      const aggregated = {};
      
      // Group events by type and time window
      events.forEach(({ data }) => {
        const { type, userId, metadata, timestamp } = data;
        const hour = new Date(timestamp).getHours();
        const key = `${type}_${hour}`;
        
        if (!aggregated[key]) {
          aggregated[key] = { type, hour, count: 0, users: new Set(), metadata: [] };
        }
        
        aggregated[key].count++;
        aggregated[key].users.add(userId);
        aggregated[key].metadata.push(metadata);
      });

      // Store aggregated data
      const records = Object.values(aggregated).map(agg => ({
        type: agg.type,
        hour: agg.hour,
        count: agg.count,
        uniqueUsers: agg.users.size,
        date: new Date().toISOString().split('T')[0],
        metadata: agg.metadata
      }));

      await Analytics.insertMany(records);
      return { aggregatedRecords: records.length };
    });

    // Trigger real-time insights
    await step.run('generate-insights', async () => {
      const crisisEvents = events.filter(e => e.data.type === 'crisis_detected');
      const chatEvents = events.filter(e => e.data.type === 'chat_interaction');
      
      if (crisisEvents.length > 5) {
        await inngest.send({
          name: 'analytics/crisis-spike',
          data: { count: crisisEvents.length, timestamp: Date.now() }
        });
      }

      return { insights: { crisisEvents: crisisEvents.length, chatEvents: chatEvents.length } };
    });
  }
);

// AI Model Performance Monitor
const aiModelMonitor = inngest.createFunction(
  { id: 'ai-model-monitor' },
  { cron: '*/15 * * * *' }, // Every 15 minutes
  async ({ step }) => {
    await step.run('check-ai-performance', async () => {
      const AISession = require('../models/AISession');
      const last15Min = new Date(Date.now() - 15 * 60 * 1000);
      
      const metrics = await AISession.aggregate([
        { $match: { createdAt: { $gte: last15Min } } },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            totalRequests: { $sum: 1 },
            errorRate: { 
              $avg: { $cond: [{ $ne: ['$error', null] }, 1, 0] }
            }
          }
        }
      ]);

      const performance = metrics[0] || { avgResponseTime: 0, totalRequests: 0, errorRate: 0 };
      
      // Alert if performance degrades
      if (performance.avgResponseTime > 5000 || performance.errorRate > 0.1) {
        await inngest.send({
          name: 'system/ai-performance-alert',
          data: { metrics: performance, timestamp: Date.now() }
        });
      }

      return performance;
    });
  }
);

// Handle completed AI analysis results
const aiResultHandler = inngest.createFunction(
  { id: 'ai-result-handler' },
  { event: 'ai/analysis-complete' },
  async ({ event, step }) => {
    const { userId, sessionId, result } = event.data;
    
    await step.run('store-result', async () => {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      
      // Store result in Redis for 5 minutes (for polling)
      await redis.setex(`analysis:${sessionId}`, 300, JSON.stringify(result));
      
      // Store in database for history
      if (result.analysis) {
        const AISession = require('../models/AISession');
        await AISession.create({
          user: userId,
          sessionId,
          analysis: result.analysis,
          responseTime: result.processingTime || 0,
          createdAt: new Date()
        });
      }
      
      return { stored: true };
    });

    // Send real-time notification to user if connected
    await step.run('notify-user', async () => {
      const io = require('../socket');
      io.to(`user_${userId}`).emit('analysis_complete', {
        sessionId,
        result: result.success ? result.analysis : { error: result.error }
      });
      
      return { notified: true };
    });
  }
);

module.exports = {
  aiAnalysisProcessor,
  analyticsAggregator,
  aiModelMonitor,
  aiResultHandler
};
