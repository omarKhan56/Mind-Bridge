#!/usr/bin/env node

const axios = require('axios');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mindbridge');

const User = require('./server/models/User');
const College = require('./server/models/College');
const Appointment = require('./server/models/Appointment');

class CounselorDataTest {
  constructor() {
    this.testResults = {
      dataFiltering: false,
      realData: false,
      aiAnalysis: false,
      collegeSpecific: false
    };
  }

  async setupTestData() {
    console.log('🏗️ Setting up test data...');
    
    // Create two test colleges
    const college1 = await College.findOneAndUpdate(
      { code: 'TEST1' },
      {
        name: 'Test University 1',
        code: 'TEST1',
        address: '123 Test Street',
        contactEmail: 'admin@test1.edu'
      },
      { upsert: true, new: true }
    );

    const college2 = await College.findOneAndUpdate(
      { code: 'TEST2' },
      {
        name: 'Test University 2',
        code: 'TEST2',
        address: '456 Test Avenue',
        contactEmail: 'admin@test2.edu'
      },
      { upsert: true, new: true }
    );

    // Create counselors for each college
    const counselor1 = await User.findOneAndUpdate(
      { email: 'counselor1@test.com' },
      {
        name: 'Test Counselor 1',
        email: 'counselor1@test.com',
        password: 'password123',
        role: 'counselor',
        college: college1._id,
        department: 'Psychology'
      },
      { upsert: true, new: true }
    );

    const counselor2 = await User.findOneAndUpdate(
      { email: 'counselor2@test.com' },
      {
        name: 'Test Counselor 2',
        email: 'counselor2@test.com',
        password: 'password123',
        role: 'counselor',
        college: college2._id,
        department: 'Psychology'
      },
      { upsert: true, new: true }
    );

    // Create students for each college
    const student1 = await User.findOneAndUpdate(
      { email: 'student1@test.com' },
      {
        name: 'Test Student 1',
        email: 'student1@test.com',
        password: 'password123',
        role: 'student',
        college: college1._id,
        aiAnalysis: {
          riskLevel: 'high',
          sentiment: 3,
          trend: 'declining',
          lastAnalysis: new Date()
        },
        alerts: [{
          type: 'crisis_indicator',
          message: 'Crisis detected',
          timestamp: new Date(),
          acknowledged: false
        }]
      },
      { upsert: true, new: true }
    );

    const student2 = await User.findOneAndUpdate(
      { email: 'student2@test.com' },
      {
        name: 'Test Student 2',
        email: 'student2@test.com',
        password: 'password123',
        role: 'student',
        college: college2._id,
        aiAnalysis: {
          riskLevel: 'low',
          sentiment: 8,
          trend: 'improving',
          lastAnalysis: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Create appointments
    await Appointment.findOneAndUpdate(
      { student: student1._id },
      {
        student: student1._id,
        counselor: counselor1._id,
        appointmentDate: new Date(),
        appointmentTime: '10:00',
        status: 'pending',
        reason: 'Test appointment'
      },
      { upsert: true, new: true }
    );

    console.log('✅ Test data created');
    return { counselor1, counselor2, student1, student2, college1, college2 };
  }

  async loginCounselor(email, password) {
    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password
      });
      return response.data.token;
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCounselorAnalytics(token, expectedCollege) {
    try {
      const response = await axios.get('http://localhost:5001/api/counselor/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const analytics = response.data;
      console.log('📊 Analytics data:', analytics);

      // Check if data is real and filtered
      this.testResults.realData = analytics.totalStudents > 0;
      this.testResults.aiAnalysis = analytics.aiAnalysisSummary && 
                                   analytics.aiAnalysisSummary.riskDistribution;
      this.testResults.collegeSpecific = analytics.collegeName === expectedCollege;

      return analytics;
    } catch (error) {
      console.error('Analytics test failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCounselorStudents(token, expectedCollegeId) {
    try {
      const response = await axios.get('http://localhost:5001/api/counselor/students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const students = response.data;
      console.log(`👨‍🎓 Students data: ${students.length} students found`);

      // Check if all students belong to the same college
      const allSameCollege = students.every(student => 
        student.college._id === expectedCollegeId.toString()
      );

      this.testResults.dataFiltering = allSameCollege;

      return students;
    } catch (error) {
      console.error('Students test failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCounselorAppointments(token) {
    try {
      const response = await axios.get('http://localhost:5001/api/counselor/appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const appointments = response.data;
      console.log(`📅 Appointments data: ${appointments.length} appointments found`);

      return appointments;
    } catch (error) {
      console.error('Appointments test failed:', error.response?.data || error.message);
      return null;
    }
  }

  async runTest() {
    console.log('🔥 COUNSELOR DASHBOARD DATA TEST');
    console.log('=================================');

    try {
      const testData = await this.setupTestData();
      
      // Test counselor 1
      console.log('\n🧪 Testing Counselor 1 (College 1)...');
      const token1 = await this.loginCounselor('counselor1@test.com', 'password123');
      
      if (token1) {
        await this.testCounselorAnalytics(token1, 'Test University 1');
        await this.testCounselorStudents(token1, testData.college1._id);
        await this.testCounselorAppointments(token1);
      }

      // Test counselor 2
      console.log('\n🧪 Testing Counselor 2 (College 2)...');
      const token2 = await this.loginCounselor('counselor2@test.com', 'password123');
      
      if (token2) {
        await this.testCounselorAnalytics(token2, 'Test University 2');
        await this.testCounselorStudents(token2, testData.college2._id);
        await this.testCounselorAppointments(token2);
      }

      this.printResults();

    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      mongoose.connection.close();
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 COUNSELOR DASHBOARD TEST RESULTS');
    console.log('='.repeat(50));

    const tests = [
      { name: 'Real Data Usage', passed: this.testResults.realData },
      { name: 'College-Specific Filtering', passed: this.testResults.dataFiltering },
      { name: 'AI Analysis Integration', passed: this.testResults.aiAnalysis },
      { name: 'College Name Display', passed: this.testResults.collegeSpecific }
    ];

    tests.forEach(test => {
      const status = test.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${test.name}`);
    });

    const passedTests = tests.filter(t => t.passed).length;
    const totalTests = tests.length;

    console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Counselor dashboard is using real data');
      console.log('✅ Data is properly filtered by college');
      console.log('✅ AI analysis is integrated');
      console.log('✅ College-specific information is displayed');
    } else {
      console.log('\n⚠️ Some tests failed. Issues found:');
      tests.filter(t => !t.passed).forEach(test => {
        console.log(`   • ${test.name} needs attention`);
      });
    }

    console.log('='.repeat(50));
  }
}

// Run the test
if (require.main === module) {
  const tester = new CounselorDataTest();
  tester.runTest().catch(console.error);
}

module.exports = CounselorDataTest;
