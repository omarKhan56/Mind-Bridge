#!/usr/bin/env node

const io = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:5001';
const TEST_STUDENT_ID = '68b7384998dbc12c3a114304'; // Amaan
const TEST_COUNSELOR_ID = '68b89e52952bdb572d8acb5b'; // Dr. Tony Tony Chopper

console.log('🧪 Starting Comprehensive Crisis Detection Flow Test\n');

async function testCrisisDetectionFlow() {
  let studentSocket;
  let counselorSocket;
  let alertReceived = false;
  let counselorRoomJoined = false;
  
  try {
    // Step 1: Connect counselor first
    console.log('1️⃣ Connecting counselor socket...');
    counselorSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });

    counselorSocket.on('connect', () => {
      console.log('✅ Counselor connected:', counselorSocket.id);
      
      // Join counselor room
      counselorSocket.emit('join-counselor-room', {
        counselorId: TEST_COUNSELOR_ID
      });
    });

    counselorSocket.on('room_joined', (data) => {
      console.log('✅ Counselor joined room:', data);
      counselorRoomJoined = true;
      
      // Step 2: Now connect student and send crisis message
      setTimeout(() => {
        console.log('2️⃣ Connecting student socket...');
        studentSocket = io(SERVER_URL, {
          transports: ['websocket', 'polling'],
          timeout: 5000
        });

        studentSocket.on('connect', () => {
          console.log('✅ Student connected:', studentSocket.id);
          
          // Join student chat
          studentSocket.emit('join-chat', TEST_STUDENT_ID);
          
          // Step 3: Send crisis message after a short delay
          setTimeout(() => {
            console.log('3️⃣ Sending crisis message...');
            const crisisMessage = {
              message: "I can't take this anymore. I want to end it all. There's no point in living.",
              userId: TEST_STUDENT_ID,
              sessionId: null,
              context: {
                mood: 'very_sad',
                stressLevel: 'high'
              }
            };
            
            studentSocket.emit('user-message', crisisMessage);
          }, 1000);
        });

        studentSocket.on('ai-response', (response) => {
          console.log('🤖 AI Response received:', response.message?.substring(0, 100) + '...');
        });

      }, 2000); // Wait 2 seconds after counselor joins room
    });

    counselorSocket.on('crisis_alert', (alertData) => {
      console.log('🚨 CRISIS ALERT RECEIVED BY COUNSELOR!');
      console.log('📋 Alert details:');
      console.log(`   Student: ${alertData.studentName}`);
      console.log(`   Type: ${alertData.type}`);
      console.log(`   Urgency: ${alertData.urgencyLevel}`);
      console.log(`   Detection: ${alertData.detectionMethod}`);
      alertReceived = true;
      
      // Test completed
      setTimeout(() => {
        console.log('\n🎯 COMPREHENSIVE TEST RESULTS:');
        console.log(`   Counselor Room Joined: ${counselorRoomJoined ? '✅' : '❌'}`);
        console.log(`   Crisis Alert Received: ${alertReceived ? '✅' : '❌'}`);
        console.log(`   End-to-End Flow: ${counselorRoomJoined && alertReceived ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (studentSocket) studentSocket.disconnect();
        if (counselorSocket) counselorSocket.disconnect();
        process.exit(0);
      }, 3000);
    });

    // Error handlers
    [counselorSocket, studentSocket].forEach(socket => {
      if (socket) {
        socket.on('connect_error', (error) => {
          console.error('❌ Connection error:', error.message);
        });
      }
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached');
      console.log('📊 FINAL RESULTS:');
      console.log(`   Counselor Room Joined: ${counselorRoomJoined ? '✅' : '❌'}`);
      console.log(`   Crisis Alert Received: ${alertReceived ? '❌ TIMEOUT' : '❌'}`);
      
      if (!counselorRoomJoined) {
        console.log('🔍 Issue: Counselor failed to join room - check user ID and database');
      } else if (!alertReceived) {
        console.log('🔍 Issue: Crisis not detected or alert not sent - check AI service');
      }
      
      if (studentSocket) studentSocket.disconnect();
      if (counselorSocket) counselorSocket.disconnect();
      process.exit(1);
    }, 15000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (studentSocket) studentSocket.disconnect();
    if (counselorSocket) counselorSocket.disconnect();
    process.exit(1);
  }
}

// Run the test
testCrisisDetectionFlow();
