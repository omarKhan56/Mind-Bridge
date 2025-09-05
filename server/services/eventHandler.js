const CrisisAlert = require('../models/CrisisAlert');
const User = require('../models/User');

class EventHandler {
  constructor(inngest = null) {
    this.inngest = inngest;
    this.isInngestEnabled = !!inngest;
    this.metrics = {
      eventsProcessed: 0,
      errors: 0,
      lastProcessed: null
    };
  }

  async handleHighRiskUser(userId, riskLevel, screeningData) {
    try {
      this.metrics.eventsProcessed++;
      this.metrics.lastProcessed = new Date();

      if (this.isInngestEnabled) {
        await this.inngest.send({
          name: 'user/high-risk-detected',
          data: { userId, riskLevel, screeningData, timestamp: Date.now() }
        });
      } else {
        await this.processHighRiskUserDirect(userId, riskLevel, screeningData);
      }
    } catch (error) {
      this.metrics.errors++;
      console.error('Error handling high-risk user:', error);
      // Fallback to direct processing if Inngest fails
      if (this.isInngestEnabled) {
        await this.processHighRiskUserDirect(userId, riskLevel, screeningData);
      }
    }
  }

  async handleChatInteraction(userId, message, aiResponse) {
    try {
      this.metrics.eventsProcessed++;
      
      if (this.isInngestEnabled) {
        await this.inngest.send({
          name: 'chat/message-sent',
          data: { userId, message, aiResponse, timestamp: Date.now() }
        });
      } else {
        await this.processChatInteractionDirect(userId, message, aiResponse);
      }
    } catch (error) {
      this.metrics.errors++;
      console.error('Error handling chat interaction:', error);
      if (this.isInngestEnabled) {
        await this.processChatInteractionDirect(userId, message, aiResponse);
      }
    }
  }

  async processHighRiskUserDirect(userId, riskLevel, screeningData) {
    const user = await User.findById(userId).populate('college');
    if (!user) throw new Error('User not found');

    const crisisAlert = await CrisisAlert.create({
      user: userId,
      college: user.college?._id,
      riskLevel,
      screeningData,
      status: 'active',
      detectionMethod: screeningData.source || 'system'
    });

    await this.notifyCounselors(userId, riskLevel, user.college?._id);
    
    if (riskLevel === 'critical') {
      await this.triggerImmediateIntervention(userId);
    }

    return crisisAlert;
  }

  async processChatInteractionDirect(userId, message, aiResponse) {
    const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'hurt myself', 'want to die'];
    const urgentKeywords = ['emergency', 'help me', 'crisis', 'can\'t take it'];
    
    const messageText = message.toLowerCase();
    const hasCrisis = crisisKeywords.some(keyword => messageText.includes(keyword));
    const hasUrgent = urgentKeywords.some(keyword => messageText.includes(keyword));

    if (hasCrisis) {
      await this.handleHighRiskUser(userId, 'critical', {
        source: 'chat',
        message: message.substring(0, 200), // Limit message length
        trigger: 'crisis-keywords',
        confidence: 0.9
      });
    } else if (hasUrgent) {
      console.log(`Flagged message for counselor review: ${userId}`);
      // Could create a lower-priority alert or notification
    }
  }

  async notifyCounselors(userId, riskLevel, collegeId) {
    if (!collegeId) return;
    
    const counselors = await User.find({
      role: 'counselor',
      college: collegeId,
      isActive: true
    });

    console.log(`Notified ${counselors.length} counselors for ${riskLevel} risk user: ${userId}`);
    // Add actual notification logic (email, SMS, push notifications)
  }

  async triggerImmediateIntervention(userId) {
    console.log(`CRITICAL: Immediate intervention triggered for user ${userId}`);
    // Add emergency response logic
  }

  getMetrics() {
    return {
      ...this.metrics,
      inngestEnabled: this.isInngestEnabled,
      uptime: process.uptime()
    };
  }
}

module.exports = EventHandler;
