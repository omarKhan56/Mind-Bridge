#!/usr/bin/env node

const io = require('socket.io-client');

// Test configuration - using users from same college
const SERVER_URL = 'http://localhost:5001';
const TEST_STUDENT_ID = '68b7384998dbc12c3a114304'; // Amaan (actual student)
const TEST_COUNSELOR_ID = '68b89e52952bdb572d8acb5b'; // Dr. Tony Tony Chopper

console.log('🧪 Starting Same College Crisis Detection Test\n');

async function testSameCollegeCrisis() {
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
      
      // Step 2: Connect student and send crisis message
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
          
          // Step 3: Send multiple crisis messages to trigger detection
          setTimeout(() => {
            console.log('3️⃣ Sending crisis messages...');
            
            // Send multiple crisis messages
            const crisisMessages = [
              "I want to kill myself. I can't take this anymore.",
              "I want to end it all. There's no point in living.",
              "I'm going to hurt myself tonight. Nobody cares about me."
            ];
            
            crisisMessages.forEach((msg, index) => {
              setTimeout(() => {
                console.log(`📤 Sending crisis message ${index + 1}: "${msg.substring(0, 30)}..."`);
                studentSocket.emit('user-message', {
                  message: msg,
                  userId: TEST_STUDENT_ID, // Using actual student ID
                  sessionId: null,
                  context: {
                    mood: 'very_sad',
                    stressLevel: 'extreme'
                  }
                });
              }, index * 2000); // Send messages 2 seconds apart
            });
          }, 1000);
        });

        studentSocket.on('ai-response', (response) => {
          console.log('🤖 AI Response received');
        });

      }, 2000); // Wait 2 seconds after counselor joins room
    });

    counselorSocket.on('crisis_alert', (alertData) => {
      console.log('🚨 CRISIS ALERT RECEIVED BY COUNSELOR!');
      console.log('📋 Comprehensive Alert Details:');
      console.log(`   Student: ${alertData.studentInfo?.name}`);
      console.log(`   Student ID: ${alertData.studentInfo?.studentId}`);
      console.log(`   Email: ${alertData.studentInfo?.email}`);
      console.log(`   Department: ${alertData.studentInfo?.department}`);
      console.log(`   Year: ${alertData.studentInfo?.year}`);
      console.log(`   College: ${alertData.collegeInfo?.name}`);
      console.log(`   Crisis Message: ${alertData.crisis?.message}`);
      console.log(`   Urgency: ${alertData.crisis?.urgency}`);
      console.log(`   Detection: ${alertData.crisis?.detectionMethod}`);
      console.log('📊 Student Summary:');
      console.log(`   Total Sessions: ${alertData.summary?.totalSessions}`);
      console.log(`   Risk Level: ${alertData.summary?.riskLevel}`);
      console.log(`   Mental Health Trend: ${alertData.summary?.mentalHealthTrend}`);
      console.log(`   Engagement Level: ${alertData.summary?.engagementLevel}`);
      console.log(`   Primary Concerns: ${alertData.summary?.primaryConcerns?.map(c => c.concern).join(', ')}`);
      alertReceived = true;
      
      // Test completed successfully
      setTimeout(() => {
        console.log('\n🎯 SAME COLLEGE CRISIS TEST RESULTS:');
        console.log(`   Counselor Room Joined: ${counselorRoomJoined ? '✅' : '❌'}`);
        console.log(`   Crisis Alert Received: ${alertReceived ? '✅' : '❌'}`);
        console.log(`   Crisis Detection Working: ${counselorRoomJoined && alertReceived ? '✅ SUCCESS' : '❌ FAILED'}`);
        
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

    // Timeout after 20 seconds
    setTimeout(() => {
      console.log('\n⏰ Test timeout reached');
      console.log('📊 FINAL RESULTS:');
      console.log(`   Counselor Room Joined: ${counselorRoomJoined ? '✅' : '❌'}`);
      console.log(`   Crisis Alert Received: ${alertReceived ? '❌ TIMEOUT' : '❌'}`);
      
      if (!counselorRoomJoined) {
        console.log('🔍 Issue: Counselor failed to join room');
      } else if (!alertReceived) {
        console.log('🔍 Issue: Crisis not detected - possible AI service issue or college mismatch');
        console.log('💡 Suggestion: Check if student and counselor are in same college');
      }
      
      if (studentSocket) studentSocket.disconnect();
      if (counselorSocket) counselorSocket.disconnect();
      process.exit(1);
    }, 20000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (studentSocket) studentSocket.disconnect();
    if (counselorSocket) counselorSocket.disconnect();
    process.exit(1);
  }
}

// Run the test
testSameCollegeCrisis();
