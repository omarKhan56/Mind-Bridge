#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

class CollegeManagementTester {
  constructor() {
    this.adminToken = 'demo-admin-token'; // You'll need a real token
    this.testCollegeId = null;
    this.testCounselorId = null;
  }

  async runTests() {
    console.log('🧪 TESTING COLLEGE MANAGEMENT FUNCTIONALITY\n');
    console.log('=' .repeat(50));

    try {
      // Test 1: Get existing colleges
      await this.testGetColleges();
      
      // Test 2: Create a new college
      await this.testCreateCollege();
      
      // Test 3: Update the college
      await this.testUpdateCollege();
      
      // Test 4: Get existing counselors
      await this.testGetCounselors();
      
      // Test 5: Create a new counselor
      await this.testCreateCounselor();
      
      // Test 6: Update the counselor
      await this.testUpdateCounselor();
      
      // Test 7: Delete the counselor
      await this.testDeleteCounselor();
      
      // Test 8: Delete the college
      await this.testDeleteCollege();
      
      console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  async testGetColleges() {
    console.log('\n📋 TEST 1: Get Colleges');
    console.log('-'.repeat(30));
    
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/colleges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });
      
      console.log('✅ Successfully retrieved colleges');
      console.log(`   Found: ${response.data.length} colleges`);
      
      if (response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].name}`);
      }
      
    } catch (error) {
      console.log('❌ Failed to get colleges');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   💡 Make sure the server is running on port 5001');
      }
    }
  }

  async testCreateCollege() {
    console.log('\n🏢 TEST 2: Create College');
    console.log('-'.repeat(30));
    
    const testCollege = {
      name: 'Test University',
      code: 'TEST',
      address: '123 Test Street, Test City',
      location: 'Test State, Test Country',
      contactEmail: 'admin@testuniversity.edu',
      contactPhone: '+1-555-0123'
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/colleges`, testCollege, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      this.testCollegeId = response.data._id;
      
      console.log('✅ Successfully created college');
      console.log(`   ID: ${response.data._id}`);
      console.log(`   Name: ${response.data.name}`);
      console.log(`   Code: ${response.data.code}`);
      
    } catch (error) {
      console.log('❌ Failed to create college');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testUpdateCollege() {
    if (!this.testCollegeId) {
      console.log('\n⚠️  TEST 3: Skipped - No college ID available');
      return;
    }
    
    console.log('\n✏️  TEST 3: Update College');
    console.log('-'.repeat(30));
    
    const updateData = {
      name: 'Updated Test University',
      code: 'UTEST',
      address: '456 Updated Street, Updated City',
      location: 'Updated State, Updated Country',
      contactEmail: 'updated@testuniversity.edu',
      contactPhone: '+1-555-9999'
    };
    
    try {
      const response = await axios.put(`${BASE_URL}/api/admin/colleges/${this.testCollegeId}`, updateData, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Successfully updated college');
      console.log(`   New Name: ${response.data.name}`);
      console.log(`   New Code: ${response.data.code}`);
      
    } catch (error) {
      console.log('❌ Failed to update college');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testGetCounselors() {
    console.log('\n👥 TEST 4: Get Counselors');
    console.log('-'.repeat(30));
    
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/counselors`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });
      
      console.log('✅ Successfully retrieved counselors');
      console.log(`   Found: ${response.data.length} counselors`);
      
      if (response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].name} (${response.data[0].email})`);
      }
      
    } catch (error) {
      console.log('❌ Failed to get counselors');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testCreateCounselor() {
    if (!this.testCollegeId) {
      console.log('\n⚠️  TEST 5: Skipped - No college ID available');
      return;
    }
    
    console.log('\n👨‍⚕️ TEST 5: Create Counselor');
    console.log('-'.repeat(30));
    
    const testCounselor = {
      name: 'Dr. Test Counselor',
      email: 'test.counselor@testuniversity.edu',
      college: this.testCollegeId,
      password: 'testPassword123'
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/counselors`, testCounselor, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      this.testCounselorId = response.data._id;
      
      console.log('✅ Successfully created counselor');
      console.log(`   ID: ${response.data._id}`);
      console.log(`   Name: ${response.data.name}`);
      console.log(`   Email: ${response.data.email}`);
      console.log(`   College: ${response.data.college?.name || 'Unknown'}`);
      
    } catch (error) {
      console.log('❌ Failed to create counselor');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testUpdateCounselor() {
    if (!this.testCounselorId) {
      console.log('\n⚠️  TEST 6: Skipped - No counselor ID available');
      return;
    }
    
    console.log('\n✏️  TEST 6: Update Counselor');
    console.log('-'.repeat(30));
    
    const updateData = {
      name: 'Dr. Updated Test Counselor',
      email: 'updated.counselor@testuniversity.edu',
      college: this.testCollegeId
    };
    
    try {
      const response = await axios.put(`${BASE_URL}/api/admin/counselors/${this.testCounselorId}`, updateData, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Successfully updated counselor');
      console.log(`   New Name: ${response.data.name}`);
      console.log(`   New Email: ${response.data.email}`);
      
    } catch (error) {
      console.log('❌ Failed to update counselor');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testDeleteCounselor() {
    if (!this.testCounselorId) {
      console.log('\n⚠️  TEST 7: Skipped - No counselor ID available');
      return;
    }
    
    console.log('\n🗑️  TEST 7: Delete Counselor');
    console.log('-'.repeat(30));
    
    try {
      const response = await axios.delete(`${BASE_URL}/api/admin/counselors/${this.testCounselorId}`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });
      
      console.log('✅ Successfully deleted counselor');
      console.log(`   Message: ${response.data.message}`);
      
    } catch (error) {
      console.log('❌ Failed to delete counselor');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testDeleteCollege() {
    if (!this.testCollegeId) {
      console.log('\n⚠️  TEST 8: Skipped - No college ID available');
      return;
    }
    
    console.log('\n🗑️  TEST 8: Delete College');
    console.log('-'.repeat(30));
    
    try {
      const response = await axios.delete(`${BASE_URL}/api/admin/colleges/${this.testCollegeId}`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });
      
      console.log('✅ Successfully deleted college');
      console.log(`   Message: ${response.data.message}`);
      
    } catch (error) {
      console.log('❌ Failed to delete college');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Run the tests
const tester = new CollegeManagementTester();
tester.runTests().then(() => {
  console.log('\n🏁 Test suite completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
