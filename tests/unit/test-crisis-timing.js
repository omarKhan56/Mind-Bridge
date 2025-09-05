#!/usr/bin/env node

const io = require('socket.io-client');
const axios = require('axios');

// Test configuration
const SERVER_URL = 'http://localhost:5001';
const TEST_COLLEGE_ID = '68b89e31952bdb572d8acb55'; // Straw Hat Pirate
const TEST_COUNSELOR_ID = '68b89e52952bdb572d8acb5b'; // Dr. Tony Tony Chopper

console.log('🧪 Starting Crisis Alert Timing Test\n');

async function testCrisisAlertTiming() {
  let counselorSocket;
  let alertReceived = false;
  let roomJoined = false;
  
  try {
    // Step 1: Connect counselor socket
    console.log('1️⃣ Connecting counselor socket...');
    counselorSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });

    // Step 2: Set up event listeners
    counselorSocket.on('connect', () => {
      console.log('✅ Counselor socket connected:', counselorSocket.id);
      
      // Join counselor room
      const roomData = {
        counselorId: TEST_COUNSELOR_ID,
        college: TEST_COLLEGE_ID,
        role: 'counselor'
      };
      
      console.log('2️⃣ Joining counselor room with data:', roomData);
      counselorSocket.emit('join-counselor-room', roomData);
    });

    counselorSocket.on('room_joined', (data) => {
      console.log('✅ Room joined successfully:', data);
      roomJoined = true;
      
      // Step 3: Wait a moment then trigger test crisis alert
      setTimeout(async () => {
        console.log('3️⃣ Sending test crisis alert...');
        try {
          const response = await axios.post(`${SERVER_URL}/api/test-crisis-alert`, {
            collegeId: TEST_COLLEGE_ID
          });
          console.log('📤 Test alert sent:', response.data);
        } catch (error) {
          console.error('❌ Failed to send test alert:', error.message);
        }
      }, 1000); // Wait 1 second after room join
    });

    counselorSocket.on('crisis_alert', (alertData) => {
      console.log('🚨 Crisis alert received!');
      console.log('📋 Alert data:', JSON.stringify(alertData, null, 2));
      alertReceived = true;
      
      // Test completed successfully
      setTimeout(() => {
        console.log('\n✅ TEST RESULTS:');
        console.log(`   Room Joined: ${roomJoined ? '✅' : '❌'}`);
        console.log(`   Alert Received: ${alertReceived ? '✅' : '❌'}`);
        console.log(`   Timing Issue Fixed: ${roomJoined && alertReceived ? '✅' : '❌'}`);
        
        counselorSocket.disconnect();
        process.exit(0);
      }, 2000);
    });

    counselorSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    counselorSocket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached');
      console.log('📊 FINAL RESULTS:');
      console.log(`   Room Joined: ${roomJoined ? '✅' : '❌'}`);
      console.log(`   Alert Received: ${alertReceived ? '❌ TIMEOUT' : '❌'}`);
      
      if (!roomJoined) {
        console.log('🔍 Issue: Counselor failed to join room');
      } else if (!alertReceived) {
        console.log('🔍 Issue: Crisis alert not received (possible timing issue)');
      }
      
      counselorSocket.disconnect();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (counselorSocket) counselorSocket.disconnect();
    process.exit(1);
  }
}

// Run the test
testCrisisAlertTiming();
