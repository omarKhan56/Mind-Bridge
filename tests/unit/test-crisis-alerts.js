#!/usr/bin/env node

const io = require('socket.io-client');

class CrisisAlertTester {
  constructor() {
    this.socket = null;
  }

  async testCrisisAlertSystem() {
    console.log('🧪 TESTING CRISIS ALERT SYSTEM');
    console.log('==============================');

    try {
      // Connect to the server
      this.socket = io('http://localhost:5001', {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        
        // Simulate a counselor joining
        const counselorData = {
          counselorId: 'test-counselor-123',
          college: 'Straw Hat Pirate',
          role: 'counselor'
        };
        
        console.log('👨‍⚕️ Joining counselor room:', counselorData);
        this.socket.emit('join-counselor-room', counselorData);
        
        // Wait a bit then send a test crisis alert
        setTimeout(() => {
          this.sendTestCrisisAlert();
        }, 2000);
      });

      this.socket.on('crisis_alert', (alertData) => {
        console.log('🚨 Crisis alert received by test client:', alertData);
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error.message);
      });

    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  sendTestCrisisAlert() {
    const testAlert = {
      userId: '68b89eae952bdb572d8acbb8',
      studentName: 'Test Student',
      message: 'Test crisis detected - high risk language detected',
      timestamp: new Date().toISOString(),
      severity: 'high',
      college: 'Straw Hat Pirate',
      detectionMethod: 'ai_sentiment',
      urgency: 5,
      collegeName: 'Straw Hat Pirate'
    };

    console.log('📤 Sending test crisis alert:', testAlert);
    
    // Emit to the college-specific room
    this.socket.emit('send-crisis-alert', testAlert);
    
    // Also try broadcasting to all counselors
    this.socket.emit('crisis-alert-broadcast', testAlert);
    
    setTimeout(() => {
      console.log('🏁 Test completed');
      this.socket.disconnect();
      process.exit(0);
    }, 3000);
  }
}

// Run the test
if (require.main === module) {
  const tester = new CrisisAlertTester();
  tester.testCrisisAlertSystem().catch(console.error);
}

module.exports = CrisisAlertTester;
