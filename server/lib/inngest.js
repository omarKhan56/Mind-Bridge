const { Inngest } = require('inngest');
const { serve } = require('inngest/express');

// Check if Inngest is configured
const inngestEnabled = process.env.INNGEST_EVENT_KEY && 
                      process.env.INNGEST_EVENT_KEY !== 'your-inngest-event-key-here';

let inngest, functions;

if (inngestEnabled) {
  inngest = new Inngest({ 
    id: 'mindbridge-app',
    name: 'MindBridge Mental Health System'
  });

  // Function to handle high-risk user alerts
  const alertHighRiskUser = inngest.createFunction(
    { id: 'alert-high-risk-user' },
    { event: 'user/high-risk-detected' },
    async ({ event, step }) => {
      const { userId, riskLevel, screeningData } = event.data;
      
      await step.run('log-alert', async () => {
        console.log(`High risk user detected: ${userId}, Risk: ${riskLevel}`);
        return { logged: true };
      });
      
      await step.run('notify-counselors', async () => {
        console.log('Counselors notified of high-risk user');
        return { notified: true };
      });
      
      await step.run('schedule-followup', async () => {
        await inngest.send({
          name: 'user/followup-check',
          data: { userId },
          ts: Date.now() + (24 * 60 * 60 * 1000)
        });
        return { scheduled: true };
      });
    }
  );

  const processChatInteraction = inngest.createFunction(
    { id: 'process-chat-interaction' },
    { event: 'chat/message-sent' },
    async ({ event, step }) => {
      const { userId, message, aiResponse } = event.data;
      
      await step.run('crisis-detection', async () => {
        const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself'];
        const hasCrisisContent = crisisKeywords.some(keyword => 
          message.toLowerCase().includes(keyword)
        );
        
        if (hasCrisisContent) {
          await inngest.send({
            name: 'user/crisis-detected',
            data: { userId, message, timestamp: new Date() }
          });
        }
        
        return { crisisDetected: hasCrisisContent };
      });
    }
  );

  const handleCrisis = inngest.createFunction(
    { id: 'handle-crisis' },
    { event: 'user/crisis-detected' },
    async ({ event, step }) => {
      const { userId, message } = event.data;
      
      await step.run('emergency-alert', async () => {
        console.log(`CRISIS ALERT: User ${userId} needs immediate attention`);
        return { alerted: true };
      });
    }
  );

  functions = [alertHighRiskUser, processChatInteraction, handleCrisis];
} else {
  console.log('Inngest not configured, using mock functions');
  
  // Mock inngest for development
  inngest = {
    send: async (event) => {
      console.log('Mock Inngest event:', event.name);
      return Promise.resolve();
    }
  };
  
  functions = [];
}

module.exports = { inngest, functions, serve };
