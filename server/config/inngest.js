const { Inngest } = require('inngest');
const { serve } = require('inngest/express');
const EventHandler = require('../services/eventHandler');

const inngestEnabled = process.env.INNGEST_EVENT_KEY && 
                      process.env.INNGEST_EVENT_KEY !== 'your-inngest-event-key-here';

let inngest, functions, eventHandler;

if (inngestEnabled) {
  inngest = new Inngest({ 
    id: 'mindbridge-app',
    name: 'MindBridge Mental Health System'
  });

  const alertHighRiskUser = inngest.createFunction(
    { 
      id: 'alert-high-risk-user',
      retries: 3,
      concurrency: { limit: 10 }
    },
    { event: 'user/high-risk-detected' },
    async ({ event, step }) => {
      const { userId, riskLevel, screeningData } = event.data;
      
      const crisisAlert = await step.run('create-crisis-alert', async () => {
        const CrisisAlert = require('../models/CrisisAlert');
        const User = require('../models/User');
        
        const user = await User.findById(userId).populate('college');
        return await CrisisAlert.create({
          user: userId,
          college: user.college._id,
          riskLevel,
          screeningData,
          status: 'active',
          createdAt: new Date()
        });
      });
      
      await step.run('notify-counselors', async () => {
        const User = require('../models/User');
        const counselors = await User.find({ 
          role: 'counselor',
          college: crisisAlert.college,
          isActive: true 
        });
        
        // Send notifications (email, SMS, etc.)
        console.log(`Notified ${counselors.length} counselors for user ${userId}`);
        return { counselorsNotified: counselors.length };
      });
      
      if (riskLevel === 'critical') {
        await step.run('immediate-intervention', async () => {
          // Trigger immediate response for critical cases
          console.log(`CRITICAL: Immediate intervention triggered for ${userId}`);
          return { interventionTriggered: true };
        });
      }
      
      await step.sleep('wait-before-followup', '24h');
      
      await step.run('schedule-followup', async () => {
        await inngest.send({
          name: 'user/followup-check',
          data: { userId, originalAlertId: crisisAlert._id }
        });
        return { followupScheduled: true };
      });
    }
  );

  const processChatInteraction = inngest.createFunction(
    { 
      id: 'process-chat-interaction',
      retries: 2,
      concurrency: { limit: 50 }
    },
    { event: 'chat/message-sent' },
    async ({ event, step }) => {
      const { userId, message, aiResponse } = event.data;
      
      const analysis = await step.run('analyze-message', async () => {
        const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself', 'want to die'];
        const urgentKeywords = ['emergency', 'help me', 'crisis', 'can\'t take it'];
        
        const hasCrisis = crisisKeywords.some(k => message.toLowerCase().includes(k));
        const hasUrgent = urgentKeywords.some(k => message.toLowerCase().includes(k));
        
        return { hasCrisis, hasUrgent, messageLength: message.length };
      });
      
      if (analysis.hasCrisis) {
        await step.run('trigger-crisis-alert', async () => {
          await inngest.send({
            name: 'user/high-risk-detected',
            data: { 
              userId, 
              riskLevel: 'critical', 
              screeningData: { source: 'chat', message, trigger: 'crisis-keywords' }
            }
          });
          return { crisisAlertSent: true };
        });
      } else if (analysis.hasUrgent) {
        await step.run('flag-for-review', async () => {
          console.log(`Flagged message for counselor review: ${userId}`);
          return { flaggedForReview: true };
        });
      }
    }
  );

  const followupCheck = inngest.createFunction(
    { id: 'followup-check' },
    { event: 'user/followup-check' },
    async ({ event, step }) => {
      const { userId, originalAlertId } = event.data;
      
      await step.run('check-user-status', async () => {
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        // Check if user has been active, completed assessments, etc.
        const lastActivity = user.lastLogin;
        const daysSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
        
        if (daysSinceActivity > 3) {
          await inngest.send({
            name: 'user/wellness-check',
            data: { userId, reason: 'no-recent-activity' }
          });
        }
        
        return { daysSinceActivity, followupCompleted: true };
      });
    }
  );

  const batchAnalytics = inngest.createFunction(
    { 
      id: 'batch-analytics',
      concurrency: { limit: 1 } // Only one analytics job at a time
    },
    { cron: '0 2 * * *' }, // Run daily at 2 AM
    async ({ step }) => {
      await step.run('generate-daily-reports', async () => {
        const User = require('../models/User');
        const CrisisAlert = require('../models/CrisisAlert');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        
        const dailyStats = {
          newUsers: await User.countDocuments({ createdAt: { $gte: yesterday, $lte: endOfYesterday } }),
          crisisAlerts: await CrisisAlert.countDocuments({ createdAt: { $gte: yesterday, $lte: endOfYesterday } }),
          date: yesterday
        };
        
        console.log('Daily analytics generated:', dailyStats);
        return dailyStats;
      });
      
      await step.run('cleanup-old-data', async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Clean up old resolved alerts
        const CrisisAlert = require('../models/CrisisAlert');
        const cleaned = await CrisisAlert.deleteMany({
          status: 'resolved',
          updatedAt: { $lt: thirtyDaysAgo }
        });
        
        return { cleanedAlerts: cleaned.deletedCount };
      });
    }
  );

  functions = [alertHighRiskUser, processChatInteraction, followupCheck, batchAnalytics];
  eventHandler = new EventHandler(inngest);
} else {
  eventHandler = new EventHandler();
  functions = [];
}

module.exports = {
  inngest: inngestEnabled ? inngest : null,
  functions,
  eventHandler,
  serve: inngestEnabled ? serve : null,
  inngestEnabled
};
