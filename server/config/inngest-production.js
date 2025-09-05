const { Inngest } = require('inngest');
const { serve } = require('inngest/express');

const inngest = new Inngest({ 
  id: 'mindbridge-app',
  name: 'MindBridge Mental Health System',
  eventKey: process.env.INNGEST_EVENT_KEY
});

// Dead Letter Queue Handler
const handleFailedEvents = inngest.createFunction(
  { 
    id: 'handle-failed-events',
    retries: 0 // Don't retry DLQ processing
  },
  { event: 'inngest/function.failed' },
  async ({ event, step }) => {
    const { function_id, error, original_event } = event.data;
    
    await step.run('log-failure', async () => {
      console.error(`Function ${function_id} failed:`, error);
      
      // Store in database for manual review
      const FailedEvent = require('../models/FailedEvent');
      await FailedEvent.create({
        functionId: function_id,
        originalEvent: original_event,
        error: error.message,
        timestamp: new Date(),
        status: 'pending_review'
      });
      
      return { logged: true };
    });

    // Critical alerts need immediate manual intervention
    if (function_id === 'alert-high-risk-user') {
      await step.run('emergency-notification', async () => {
        // Send emergency notification to system admins
        console.log('EMERGENCY: Crisis alert system failed - manual intervention required');
        return { emergencyNotified: true };
      });
    }
  }
);

// Enhanced Crisis Alert with Circuit Breaker
const alertHighRiskUser = inngest.createFunction(
  { 
    id: 'alert-high-risk-user',
    retries: 3,
    concurrency: { limit: 20, key: 'event.data.collegeId' }, // Per-college limits
    cancelOn: [{ event: 'user/alert-cancelled', match: 'data.userId' }]
  },
  { event: 'user/high-risk-detected' },
  async ({ event, step }) => {
    const { userId, riskLevel, screeningData, collegeId } = event.data;
    
    // Rate limiting check
    const rateLimitCheck = await step.run('rate-limit-check', async () => {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      
      const key = `crisis_alerts:${collegeId}:${new Date().toISOString().split('T')[0]}`;
      const count = await redis.incr(key);
      await redis.expire(key, 86400); // 24 hours
      
      if (count > 50) { // Max 50 alerts per college per day
        throw new Error('Rate limit exceeded for college');
      }
      
      return { alertCount: count };
    });

    const alert = await step.run('create-alert', async () => {
      const CrisisAlert = require('../models/CrisisAlert');
      return await CrisisAlert.create({
        user: userId,
        college: collegeId,
        riskLevel,
        screeningData,
        status: 'active',
        priority: riskLevel === 'critical' ? 1 : 2,
        createdAt: new Date()
      });
    });

    // Multi-channel notifications
    await step.run('notify-counselors', async () => {
      const NotificationService = require('../services/notifications');
      const User = require('../models/User');
      
      const counselors = await User.find({ 
        role: 'counselor', 
        college: collegeId, 
        isActive: true 
      });

      await Promise.all([
        NotificationService.sendEmail(counselors, alert),
        NotificationService.sendSMS(counselors.filter(c => c.emergencyContact), alert),
        NotificationService.sendPushNotification(counselors, alert)
      ]);

      return { counselorsNotified: counselors.length };
    });

    // Escalation for critical cases
    if (riskLevel === 'critical') {
      await step.run('escalate-critical', async () => {
        await inngest.send({
          name: 'crisis/immediate-response',
          data: { alertId: alert._id, userId, escalationLevel: 1 }
        });
        return { escalated: true };
      });
    }

    // Compliance logging
    await step.run('compliance-log', async () => {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        action: 'crisis_alert_created',
        userId,
        metadata: { alertId: alert._id, riskLevel },
        timestamp: new Date()
      });
      return { logged: true };
    });

    // Schedule follow-up with exponential backoff
    await step.sleep('initial-wait', '1h');
    
    await step.run('schedule-followup', async () => {
      await inngest.send({
        name: 'user/followup-check',
        data: { 
          userId, 
          alertId: alert._id, 
          attempt: 1,
          maxAttempts: 3 
        }
      });
      return { followupScheduled: true };
    });
  }
);

// Smart Follow-up System
const followupCheck = inngest.createFunction(
  { id: 'followup-check', retries: 2 },
  { event: 'user/followup-check' },
  async ({ event, step }) => {
    const { userId, alertId, attempt, maxAttempts } = event.data;
    
    const status = await step.run('check-status', async () => {
      const User = require('../models/User');
      const CrisisAlert = require('../models/CrisisAlert');
      
      const [user, alert] = await Promise.all([
        User.findById(userId),
        CrisisAlert.findById(alertId)
      ]);

      const daysSinceAlert = (Date.now() - alert.createdAt) / (1000 * 60 * 60 * 24);
      const hasRecentActivity = user.lastLogin > alert.createdAt;
      
      return { 
        alertResolved: alert.status === 'resolved',
        hasRecentActivity,
        daysSinceAlert,
        userEngagement: user.engagementScore || 0
      };
    });

    if (!status.alertResolved && !status.hasRecentActivity) {
      if (attempt < maxAttempts) {
        // Schedule next follow-up with exponential backoff
        const delay = Math.pow(2, attempt) * 24; // 2, 4, 8 days
        await step.sleep('backoff-wait', `${delay}h`);
        
        await step.run('reschedule-followup', async () => {
          await inngest.send({
            name: 'user/followup-check',
            data: { userId, alertId, attempt: attempt + 1, maxAttempts }
          });
          return { rescheduled: true };
        });
      } else {
        // Escalate to human intervention
        await step.run('escalate-to-human', async () => {
          await inngest.send({
            name: 'crisis/human-intervention-required',
            data: { userId, alertId, reason: 'no-response-after-followups' }
          });
          return { escalated: true };
        });
      }
    }
  }
);

module.exports = {
  inngest,
  functions: [handleFailedEvents, alertHighRiskUser, followupCheck],
  serve
};
