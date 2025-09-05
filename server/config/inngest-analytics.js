// Real-time Analytics Pipeline
const analyticsProcessor = inngest.createFunction(
  { 
    id: 'analytics-processor',
    concurrency: { limit: 5 },
    batchEvents: { maxSize: 100, timeout: '30s' }
  },
  { event: 'analytics/event' },
  async ({ events, step }) => {
    await step.run('process-batch', async () => {
      const Analytics = require('../models/Analytics');
      const eventsByType = {};
      
      events.forEach(({ data }) => {
        const { type, userId, metadata } = data;
        if (!eventsByType[type]) eventsByType[type] = [];
        eventsByType[type].push({ userId, metadata, timestamp: new Date() });
      });

      // Batch insert for performance
      const promises = Object.entries(eventsByType).map(([type, events]) =>
        Analytics.insertMany(events.map(e => ({ ...e, type })))
      );
      
      await Promise.all(promises);
      return { processedEvents: events.length };
    });

    // Real-time alerting
    await step.run('check-anomalies', async () => {
      const crisisEvents = events.filter(e => e.data.type === 'crisis_detected');
      
      if (crisisEvents.length > 10) { // Spike in crisis events
        await inngest.send({
          name: 'system/crisis-spike-detected',
          data: { count: crisisEvents.length, timestamp: Date.now() }
        });
      }
      
      return { anomaliesChecked: true };
    });
  }
);

// Predictive Analytics
const predictiveAnalysis = inngest.createFunction(
  { id: 'predictive-analysis' },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ step }) => {
    await step.run('analyze-patterns', async () => {
      const User = require('../models/User');
      const CrisisAlert = require('../models/CrisisAlert');
      
      // Find users with declining engagement
      const atRiskUsers = await User.aggregate([
        {
          $match: {
            role: 'student',
            lastLogin: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $lookup: {
            from: 'crisisalerts',
            localField: '_id',
            foreignField: 'user',
            as: 'alerts'
          }
        },
        {
          $match: { 'alerts.0': { $exists: true } }
        }
      ]);

      // Send proactive wellness checks
      for (const user of atRiskUsers) {
        await inngest.send({
          name: 'user/proactive-wellness-check',
          data: { userId: user._id, reason: 'declining-engagement' }
        });
      }

      return { atRiskUsers: atRiskUsers.length };
    });
  }
);

// System Health Monitoring
const systemHealthCheck = inngest.createFunction(
  { id: 'system-health-check' },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    const health = await step.run('check-health', async () => {
      const mongoose = require('mongoose');
      const Redis = require('ioredis');
      
      const checks = {
        database: mongoose.connection.readyState === 1,
        redis: false,
        apiResponse: false
      };

      try {
        const redis = new Redis(process.env.REDIS_URL);
        await redis.ping();
        checks.redis = true;
      } catch (e) {
        console.error('Redis health check failed:', e.message);
      }

      // Check API response time
      const start = Date.now();
      try {
        const User = require('../models/User');
        await User.findOne().limit(1);
        checks.apiResponse = (Date.now() - start) < 1000; // Under 1 second
      } catch (e) {
        console.error('API health check failed:', e.message);
      }

      return checks;
    });

    // Alert if any service is down
    if (!health.database || !health.redis || !health.apiResponse) {
      await step.run('alert-system-issues', async () => {
        await inngest.send({
          name: 'system/health-alert',
          data: { health, timestamp: Date.now() }
        });
        return { alerted: true };
      });
    }
  }
);

module.exports = {
  analyticsProcessor,
  predictiveAnalysis,
  systemHealthCheck
};
