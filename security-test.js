#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5001';

class SecurityTester {
  constructor() {
    this.vulnerabilities = [];
    this.testResults = [];
  }

  log(message, type = 'INFO') {
    console.log(`[${new Date().toISOString()}] ${type}: ${message}`);
  }

  addVulnerability(test, severity, description) {
    this.vulnerabilities.push({ test, severity, description });
    this.log(`🚨 VULNERABILITY: ${test} - ${description}`, 'VULN');
  }

  async testSQLInjection() {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#"
    ];

    for (const payload of payloads) {
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          email: payload,
          password: 'test'
        });
      } catch (error) {
        if (error.response?.data?.message?.includes('SQL') || 
            error.response?.data?.message?.includes('database')) {
          this.addVulnerability('SQL Injection', 'HIGH', 
            `SQL error exposed with payload: ${payload}`);
        }
      }
    }
  }

  async testXSS() {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "javascript:alert('XSS')",
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ];

    // Test user registration
    for (const payload of xssPayloads) {
      try {
        await axios.post(`${BASE_URL}/api/auth/register`, {
          name: payload,
          email: `test${Date.now()}@test.com`,
          password: 'password123'
        });
      } catch (error) {
        // Check if payload is reflected in error message
        if (error.response?.data?.message?.includes(payload)) {
          this.addVulnerability('XSS', 'MEDIUM', 
            `XSS payload reflected: ${payload}`);
        }
      }
    }
  }

  async testAuthenticationBypass() {
    // Test JWT manipulation
    const fakeTokens = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'null',
      'undefined',
      '',
      'Bearer admin'
    ];

    for (const token of fakeTokens) {
      try {
        const response = await axios.get(`${BASE_URL}/api/wellness`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
          this.addVulnerability('Authentication Bypass', 'CRITICAL', 
            `Bypassed auth with token: ${token}`);
        }
      } catch (error) {
        // Expected behavior
      }
    }
  }

  async testRateLimiting() {
    const promises = [];
    
    // Rapid fire login attempts
    for (let i = 0; i < 1000; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'test@test.com',
          password: 'wrongpassword'
        }).catch(err => err.response)
      );
    }

    const responses = await Promise.allSettled(promises);
    const rateLimited = responses.some(r => 
      r.value?.status === 429 || 
      r.value?.data?.message?.includes('rate')
    );

    if (!rateLimited) {
      this.addVulnerability('No Rate Limiting', 'HIGH', 
        'No rate limiting detected on login endpoint');
    }
  }

  async testCSRF() {
    // Test if CSRF tokens are required
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'CSRF Test',
        email: `csrf${Date.now()}@test.com`,
        password: 'password123'
      }, {
        headers: {
          'Origin': 'http://malicious-site.com',
          'Referer': 'http://malicious-site.com'
        }
      });

      if (response.status === 200 || response.status === 201) {
        this.addVulnerability('CSRF', 'MEDIUM', 
          'No CSRF protection detected');
      }
    } catch (error) {
      // Expected if CSRF protection is in place
    }
  }

  async testDirectoryTraversal() {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
    ];

    for (const payload of payloads) {
      try {
        await axios.get(`${BASE_URL}/api/resources/${payload}`);
      } catch (error) {
        if (error.response?.data?.includes('root:') || 
            error.response?.data?.includes('# Copyright')) {
          this.addVulnerability('Directory Traversal', 'HIGH', 
            `File system access with payload: ${payload}`);
        }
      }
    }
  }

  async testPasswordSecurity() {
    const weakPasswords = [
      'password',
      '123456',
      'admin',
      'test',
      'password123'
    ];

    for (const password of weakPasswords) {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/register`, {
          name: 'Weak Password Test',
          email: `weak${Date.now()}@test.com`,
          password: password
        });

        if (response.status === 200 || response.status === 201) {
          this.addVulnerability('Weak Password Policy', 'MEDIUM', 
            `Weak password accepted: ${password}`);
        }
      } catch (error) {
        // Expected if password policy is enforced
      }
    }
  }

  async testInformationDisclosure() {
    const endpoints = [
      '/api/admin/users',
      '/api/admin/analytics',
      '/api/counselor/students',
      '/.env',
      '/package.json',
      '/server.js',
      '/config.json'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        
        if (response.status === 200 && response.data) {
          this.addVulnerability('Information Disclosure', 'MEDIUM', 
            `Sensitive endpoint accessible: ${endpoint}`);
        }
      } catch (error) {
        // Expected behavior for protected endpoints
      }
    }
  }

  async testSessionSecurity() {
    // Test session fixation
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@test.com',
        password: 'password123'
      });

      const token = loginResponse.data.token;
      
      // Test if token expires
      setTimeout(async () => {
        try {
          await axios.get(`${BASE_URL}/api/wellness`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          this.addVulnerability('Session Management', 'MEDIUM', 
            'JWT tokens may not have proper expiration');
        } catch (error) {
          // Expected if token expires
        }
      }, 1000);
      
    } catch (error) {
      // Handle login failure
    }
  }

  async testInputValidation() {
    const maliciousInputs = [
      'A'.repeat(10000), // Buffer overflow attempt
      '${7*7}', // Template injection
      '{{7*7}}', // Template injection
      '<%= 7*7 %>', // Template injection
      'eval("alert(1)")', // Code injection
      'require("child_process").exec("ls")', // Command injection
    ];

    for (const input of maliciousInputs) {
      try {
        await axios.post(`${BASE_URL}/api/forum/posts`, {
          title: input,
          content: input,
          category: 'general'
        });
      } catch (error) {
        if (error.response?.data?.message?.includes('49') || // 7*7 = 49
            error.response?.data?.message?.includes('executed')) {
          this.addVulnerability('Code Injection', 'CRITICAL', 
            `Code execution detected with input: ${input.substring(0, 50)}...`);
        }
      }
    }
  }

  async runAllSecurityTests() {
    this.log('🔒 Starting Security Penetration Test Suite');

    const tests = [
      { name: 'SQL Injection', fn: () => this.testSQLInjection() },
      { name: 'XSS (Cross-Site Scripting)', fn: () => this.testXSS() },
      { name: 'Authentication Bypass', fn: () => this.testAuthenticationBypass() },
      { name: 'Rate Limiting', fn: () => this.testRateLimiting() },
      { name: 'CSRF Protection', fn: () => this.testCSRF() },
      { name: 'Directory Traversal', fn: () => this.testDirectoryTraversal() },
      { name: 'Password Security', fn: () => this.testPasswordSecurity() },
      { name: 'Information Disclosure', fn: () => this.testInformationDisclosure() },
      { name: 'Session Security', fn: () => this.testSessionSecurity() },
      { name: 'Input Validation', fn: () => this.testInputValidation() }
    ];

    for (const test of tests) {
      try {
        this.log(`Running: ${test.name}`);
        await test.fn();
        this.testResults.push({ name: test.name, status: 'COMPLETED' });
      } catch (error) {
        this.log(`Error in ${test.name}: ${error.message}`, 'ERROR');
        this.testResults.push({ name: test.name, status: 'ERROR', error: error.message });
      }
    }

    this.printSecurityReport();
  }

  printSecurityReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 SECURITY PENETRATION TEST REPORT');
    console.log('='.repeat(80));

    if (this.vulnerabilities.length === 0) {
      console.log('✅ No vulnerabilities detected!');
    } else {
      console.log(`🚨 ${this.vulnerabilities.length} vulnerabilities found:`);
      
      const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      this.vulnerabilities.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      this.vulnerabilities.forEach((vuln, index) => {
        const icon = vuln.severity === 'CRITICAL' ? '🔴' : 
                    vuln.severity === 'HIGH' ? '🟠' : 
                    vuln.severity === 'MEDIUM' ? '🟡' : '🟢';
        
        console.log(`\n${index + 1}. ${icon} ${vuln.severity} - ${vuln.test}`);
        console.log(`   ${vuln.description}`);
      });
    }

    console.log('\n📊 TEST SUMMARY:');
    this.testResults.forEach(result => {
      const status = result.status === 'COMPLETED' ? '✅' : '❌';
      console.log(`  ${status} ${result.name}`);
    });

    console.log('='.repeat(80));
  }
}

// Run security tests
if (require.main === module) {
  const securityTester = new SecurityTester();
  securityTester.runAllSecurityTests().catch(console.error);
}

module.exports = SecurityTester;
