const cron = require('node-cron');
const aiAnalysisService = require('./aiAnalysis');
const User = require('../models/User');

class AIScheduler {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log('🤖 Starting AI Analysis Scheduler...');

    // Daily analysis at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🔍 Running daily AI analysis...');
      await this.runDailyAnalysis();
    });

    // Weekly campus analysis on Sundays at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      console.log('🏫 Running weekly campus analysis...');
      await this.runWeeklyCampusAnalysis();
    });

    // Real-time risk monitoring every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⚠️ Running risk monitoring...');
      await this.runRiskMonitoring();
    });

    console.log('✅ AI Analysis Scheduler started');
  }

  async runDailyAnalysis() {
    if (this.isRunning) {
      console.log('⏳ Analysis already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      
      // Get active students (logged in within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const activeStudents = await User.find({
        role: 'student',
        lastActive: { $gte: sevenDaysAgo }
      }).limit(50); // Limit to prevent overload

      console.log(`📊 Analyzing ${activeStudents.length} active students...`);

      let successCount = 0;
      let errorCount = 0;

      for (const student of activeStudents) {
        try {
          await aiAnalysisService.analyzeUser(student._id);
          successCount++;
          
          // Small delay to prevent API rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Analysis failed for ${student.name}:`, error.message);
          errorCount++;
        }
      }

      console.log(`✅ Daily analysis completed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ Daily analysis failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runWeeklyCampusAnalysis() {
    try {
      console.log('🏫 Running campus-wide analysis...');
      
      const colleges = await User.distinct('college', { role: 'student' });
      
      for (const collegeId of colleges) {
        if (collegeId) {
          try {
            const campusAnalysis = await aiAnalysisService.analyzeCampus(collegeId);
            console.log(`📊 Campus analysis completed for college ${collegeId}`);
            
            // Store campus insights for admin dashboard
            // This could be saved to a separate collection if needed
            
          } catch (error) {
            console.error(`❌ Campus analysis failed for ${collegeId}:`, error.message);
          }
        }
      }
      
      console.log('✅ Weekly campus analysis completed');
    } catch (error) {
      console.error('❌ Weekly campus analysis failed:', error);
    }
  }

  async runRiskMonitoring() {
    try {
      // Find users with high risk levels or recent crisis indicators
      const highRiskUsers = await User.find({
        role: 'student',
        $or: [
          { 'aiAnalysis.riskLevel': { $in: ['high', 'critical'] } },
          { 'alerts.type': 'crisis_indicator', 'alerts.acknowledged': false }
        ]
      }).populate('college', 'name');

      if (highRiskUsers.length > 0) {
        console.log(`⚠️ Monitoring ${highRiskUsers.length} high-risk users`);
        
        for (const user of highRiskUsers) {
          // Re-analyze high-risk users more frequently
          try {
            const analysis = await aiAnalysisService.analyzeUser(user._id);
            
            // Check if risk level has changed
            if (analysis.risk.currentRiskLevel !== user.aiAnalysis?.riskLevel) {
              console.log(`📈 Risk level changed for ${user.name}: ${user.aiAnalysis?.riskLevel} → ${analysis.risk.currentRiskLevel}`);
              
              // Could trigger notifications to counselors here
              if (analysis.risk.alertCounselor) {
                await this.alertCounselors(user, analysis);
              }
            }
          } catch (error) {
            console.error(`❌ Risk monitoring failed for ${user.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Risk monitoring failed:', error);
    }
  }

  async alertCounselors(user, analysis) {
    try {
      // Find counselors for this user's college
      const counselors = await User.find({
        role: 'counselor',
        college: user.college
      });

      // In a real implementation, this would send emails or push notifications
      console.log(`🚨 ALERT: High-risk student ${user.name} needs attention`);
      console.log(`   Risk Level: ${analysis.risk.currentRiskLevel}`);
      console.log(`   Risk Score: ${analysis.risk.riskScore}/100`);
      console.log(`   Counselors to notify: ${counselors.length}`);
      
      // Store alert in database
      await User.findByIdAndUpdate(user._id, {
        $push: {
          alerts: {
            type: 'risk_increase',
            message: `Risk level elevated to ${analysis.risk.currentRiskLevel}`,
            timestamp: new Date(),
            severity: analysis.risk.currentRiskLevel === 'critical' ? 5 : 4,
            acknowledged: false
          }
        }
      });

    } catch (error) {
      console.error('❌ Failed to alert counselors:', error);
    }
  }

  // Manual trigger for testing
  async runManualAnalysis(userId) {
    try {
      console.log(`🔍 Running manual analysis for user ${userId}`);
      const analysis = await aiAnalysisService.analyzeUser(userId);
      console.log('✅ Manual analysis completed');
      return analysis;
    } catch (error) {
      console.error('❌ Manual analysis failed:', error);
      throw error;
    }
  }
}

module.exports = new AIScheduler();
