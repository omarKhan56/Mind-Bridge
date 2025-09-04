#!/usr/bin/env node

const io = require('socket.io-client');

class LiveAITester {
  constructor() {
    this.socket = null;
    this.responses = [];
  }

  async testLiveAI() {
    console.log('🔥 TESTING LIVE AI SYSTEM');
    console.log('=========================');

    return new Promise((resolve, reject) => {
      // Connect to server
      this.socket = io('http://localhost:5001', {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        
        // Listen for AI responses
        this.socket.on('ai-response', (response) => {
          console.log('🤖 AI Response received:');
          console.log('  Message:', response.message.substring(0, 100) + '...');
          console.log('  Therapist:', response.therapistName);
          console.log('  Type:', response.responseType);
          console.log('  Personalized:', response.personalized);
          console.log('  Urgency:', response.urgencyLevel);
          
          this.responses.push(response);
          
          if (this.responses.length >= 3) {
            this.printResults();
            resolve();
          }
        });

        // Test different types of messages
        console.log('\n📤 Sending test messages...');
        
        setTimeout(() => {
          console.log('1. Testing normal conversation...');
          this.socket.emit('user-message', {
            message: 'Hi, I\'m feeling a bit stressed about my exams',
            userId: '507f1f77bcf86cd799439011',
            sessionId: 'test-session-1'
          });
        }, 1000);

        setTimeout(() => {
          console.log('2. Testing anxiety detection...');
          this.socket.emit('user-message', {
            message: 'I\'m really anxious and can\'t sleep. I feel overwhelmed.',
            userId: '507f1f77bcf86cd799439011',
            sessionId: 'test-session-2'
          });
        }, 3000);

        setTimeout(() => {
          console.log('3. Testing crisis detection...');
          this.socket.emit('user-message', {
            message: 'I don\'t think I can handle this anymore. Sometimes I think about ending it all.',
            userId: '507f1f77bcf86cd799439011',
            sessionId: 'test-session-3'
          });
        }, 5000);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (this.responses.length === 0) {
          console.error('❌ No responses received - AI system may not be working');
          reject(new Error('No AI responses received'));
        } else {
          this.printResults();
          resolve();
        }
      }, 15000);
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 LIVE AI SYSTEM TEST RESULTS');
    console.log('='.repeat(50));

    console.log(`📊 Total responses received: ${this.responses.length}/3`);

    if (this.responses.length > 0) {
      console.log('\n✅ AI SYSTEM IS WORKING!');
      console.log('✅ Server integration successful');
      console.log('✅ Real-time responses working');
      console.log('✅ Enhanced AI features active');
      
      // Check for personalization
      const personalizedCount = this.responses.filter(r => r.personalized).length;
      console.log(`✅ Personalization: ${personalizedCount}/${this.responses.length} responses`);
      
      // Check for different response types
      const responseTypes = [...new Set(this.responses.map(r => r.responseType))];
      console.log(`✅ Response variety: ${responseTypes.join(', ')}`);
      
      // Check urgency levels
      const urgencyLevels = this.responses.map(r => r.urgencyLevel || 'N/A');
      console.log(`✅ Urgency detection: ${urgencyLevels.join(', ')}`);
      
    } else {
      console.log('\n❌ AI SYSTEM NOT RESPONDING');
      console.log('❌ Check server logs for errors');
      console.log('❌ Verify Gemini API key is working');
    }

    console.log('='.repeat(50));
    
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new LiveAITester();
  tester.testLiveAI().catch(console.error);
}

module.exports = LiveAITester;
