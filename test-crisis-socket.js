#!/usr/bin/env node

const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5001';

class SocketCrisisTest {
  constructor() {
    this.socket = null;
    this.alertsReceived = 0;
    this.responsesReceived = 0;
  }

  async connectSocket() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to Socket.IO server...');
      
      this.socket = io(BASE_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection failed:', error.message);
        reject(error);
      });

      this.socket.on('crisis_alert', (data) => {
        console.log('🚨 CRISIS ALERT RECEIVED:', data);
        this.alertsReceived++;
      });

      this.socket.on('ai-response', (data) => {
        console.log('🤖 AI Response:', data.message?.substring(0, 100) + '...');
        this.responsesReceived++;
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from server');
      });
    });
  }

  async sendTestMessages() {
    const crisisMessages = [
      "I want to kill myself",
      "I'm going to end it all",
      "I can't take this anymore, I want to die",
      "I have a plan to hurt myself"
    ];

    console.log('\n🧪 Testing crisis detection...');
    
    for (let i = 0; i < crisisMessages.length; i++) {
      const message = crisisMessages[i];
      console.log(`\n📤 Sending: "${message}"`);
      
      this.socket.emit('user-message', {
        message,
        userId: 'test-user-123',
        sessionId: `crisis-test-${Date.now()}-${i}`
      });

      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Wait for final responses
    console.log('\n⏳ Waiting for final responses...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 CRISIS DETECTION TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`📤 Messages sent: 4`);
    console.log(`🚨 Crisis alerts received: ${this.alertsReceived}`);
    console.log(`🤖 AI responses received: ${this.responsesReceived}`);
    
    if (this.alertsReceived > 0) {
      console.log('\n✅ CRISIS DETECTION IS WORKING!');
      console.log('   Frontend should show crisis alerts and notifications');
    } else {
      console.log('\n❌ NO CRISIS ALERTS DETECTED');
      console.log('   Possible issues:');
      console.log('   • Gemini API not responding');
      console.log('   • Sentiment analysis failing');
      console.log('   • Crisis detection threshold too high');
    }
    
    console.log('='.repeat(50));
  }

  cleanup() {
    if (this.socket) {
      this.socket.close();
    }
  }

  async runTest() {
    console.log('🔥 SOCKET-BASED CRISIS DETECTION TEST');
    console.log('=====================================');
    
    try {
      await this.connectSocket();
      await this.sendTestMessages();
      this.printResults();
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new SocketCrisisTest();
  tester.runTest().catch(console.error);
}

module.exports = SocketCrisisTest;
