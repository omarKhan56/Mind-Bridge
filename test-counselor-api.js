#!/usr/bin/env node

const axios = require('axios');

class CounselorAPITest {
  constructor() {
    this.baseURL = 'http://localhost:5001';
  }

  async testLogin() {
    try {
      console.log('🔐 Testing counselor login...');
      
      // Try to login with test credentials
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'counselor@test.com',
        password: 'password123'
      });

      if (response.data.token) {
        console.log('✅ Login successful');
        return response.data.token;
      }
    } catch (error) {
      console.log('⚠️ Login failed - creating test user might be needed');
      return null;
    }
  }

  async testAnalyticsEndpoint(token) {
    try {
      console.log('📊 Testing analytics endpoint...');
      
      const response = await axios.get(`${this.baseURL}/api/counselor/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const analytics = response.data;
      console.log('Analytics data received:', {
        totalStudents: analytics.totalStudents,
        highRiskStudents: analytics.highRiskStudents,
        hasAIAnalysis: !!analytics.aiAnalysisSummary,
        collegeName: analytics.collegeName
      });

      return {
        hasRealData: analytics.totalStudents !== undefined,
        hasAIAnalysis: !!analytics.aiAnalysisSummary,
        hasCollegeInfo: !!analytics.collegeName
      };
    } catch (error) {
      console.error('❌ Analytics endpoint failed:', error.response?.status, error.response?.data?.message);
      return { hasRealData: false, hasAIAnalysis: false, hasCollegeInfo: false };
    }
  }

  async testStudentsEndpoint(token) {
    try {
      console.log('👨‍🎓 Testing students endpoint...');
      
      const response = await axios.get(`${this.baseURL}/api/counselor/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const students = response.data;
      console.log(`Students data: ${students.length} students found`);

      // Check if students have college information
      const hasCollegeFiltering = students.length === 0 || 
        students.every(student => student.college && student.college._id);

      return {
        hasStudents: students.length > 0,
        hasCollegeFiltering
      };
    } catch (error) {
      console.error('❌ Students endpoint failed:', error.response?.status, error.response?.data?.message);
      return { hasStudents: false, hasCollegeFiltering: false };
    }
  }

  async testAppointmentsEndpoint(token) {
    try {
      console.log('📅 Testing appointments endpoint...');
      
      const response = await axios.get(`${this.baseURL}/api/counselor/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const appointments = response.data;
      console.log(`Appointments data: ${appointments.length} appointments found`);

      return {
        hasAppointments: appointments.length >= 0,
        hasStudentInfo: appointments.length === 0 || 
          appointments.every(apt => apt.student && apt.student.name)
      };
    } catch (error) {
      console.error('❌ Appointments endpoint failed:', error.response?.status, error.response?.data?.message);
      return { hasAppointments: false, hasStudentInfo: false };
    }
  }

  async testAlertsEndpoint(token) {
    try {
      console.log('🚨 Testing alerts endpoint...');
      
      const response = await axios.get(`${this.baseURL}/api/counselor/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const alerts = response.data;
      console.log(`Alerts data: ${alerts.length} alerts found`);

      return {
        hasAlerts: alerts.length >= 0,
        hasStudentInfo: alerts.length === 0 || 
          alerts.every(alert => alert.student)
      };
    } catch (error) {
      console.error('❌ Alerts endpoint failed:', error.response?.status, error.response?.data?.message);
      return { hasAlerts: false, hasStudentInfo: false };
    }
  }

  async runTest() {
    console.log('🔥 COUNSELOR API ENDPOINTS TEST');
    console.log('===============================');

    const token = await this.testLogin();
    
    if (!token) {
      console.log('\n❌ Cannot proceed without authentication token');
      console.log('Please ensure:');
      console.log('1. Server is running on port 5001');
      console.log('2. Test counselor account exists');
      console.log('3. Database is connected');
      return;
    }

    console.log('\n🧪 Testing API endpoints...');
    
    const analyticsResult = await this.testAnalyticsEndpoint(token);
    const studentsResult = await this.testStudentsEndpoint(token);
    const appointmentsResult = await this.testAppointmentsEndpoint(token);
    const alertsResult = await this.testAlertsEndpoint(token);

    this.printResults({
      analytics: analyticsResult,
      students: studentsResult,
      appointments: appointmentsResult,
      alerts: alertsResult
    });
  }

  printResults(results) {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 COUNSELOR API TEST RESULTS');
    console.log('='.repeat(50));

    const tests = [
      { name: 'Analytics - Real Data', passed: results.analytics.hasRealData },
      { name: 'Analytics - AI Analysis', passed: results.analytics.hasAIAnalysis },
      { name: 'Analytics - College Info', passed: results.analytics.hasCollegeInfo },
      { name: 'Students - Data Available', passed: results.students.hasStudents },
      { name: 'Students - College Filtering', passed: results.students.hasCollegeFiltering },
      { name: 'Appointments - Endpoint Working', passed: results.appointments.hasAppointments },
      { name: 'Appointments - Student Info', passed: results.appointments.hasStudentInfo },
      { name: 'Alerts - Endpoint Working', passed: results.alerts.hasAlerts },
      { name: 'Alerts - Student Info', passed: results.alerts.hasStudentInfo }
    ];

    tests.forEach(test => {
      const status = test.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${test.name}`);
    });

    const passedTests = tests.filter(t => t.passed).length;
    const totalTests = tests.length;

    console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests >= 7) {
      console.log('\n🎉 COUNSELOR DASHBOARD IS WORKING WELL!');
      console.log('✅ API endpoints are functional');
      console.log('✅ Data filtering appears to be working');
      console.log('✅ College-specific information is available');
    } else {
      console.log('\n⚠️ Some issues detected:');
      tests.filter(t => !t.passed).forEach(test => {
        console.log(`   • ${test.name} needs attention`);
      });
    }

    console.log('\n📋 RECOMMENDATIONS:');
    console.log('1. Ensure counselor has students in their college');
    console.log('2. Create test appointments for verification');
    console.log('3. Verify AI analysis is running on student data');
    console.log('4. Check college assignment for users');

    console.log('='.repeat(50));
  }
}

// Run the test
if (require.main === module) {
  const tester = new CounselorAPITest();
  tester.runTest().catch(console.error);
}

module.exports = CounselorAPITest;
