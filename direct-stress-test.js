#!/usr/bin/env node

const http = require('http');
const cluster = require('cluster');
const os = require('os');

const SERVER_HOST = 'localhost';
const SERVER_PORT = 5001;

class DirectStressTester {
  constructor() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: {},
      startTime: Date.now()
    };
  }

  async makeRequest(path = '/', method = 'GET', data = null) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const options = {
        hostname: SERVER_HOST,
        port: SERVER_PORT,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StressTest/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.stats.totalRequests++;
          this.stats.responseTimes.push(responseTime);
          
          if (res.statusCode >= 200 && res.statusCode < 400) {
            this.stats.successfulRequests++;
          } else {
            this.stats.failedRequests++;
            const errorKey = `HTTP_${res.statusCode}`;
            this.stats.errors[errorKey] = (this.stats.errors[errorKey] || 0) + 1;
          }
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            dataLength: responseData.length
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        this.stats.totalRequests++;
        this.stats.failedRequests++;
        this.stats.responseTimes.push(responseTime);
        
        const errorKey = error.code || 'UNKNOWN_ERROR';
        this.stats.errors[errorKey] = (this.stats.errors[errorKey] || 0) + 1;
        
        resolve({
          statusCode: 0,
          responseTime,
          error: error.message
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        this.stats.totalRequests++;
        this.stats.failedRequests++;
        this.stats.responseTimes.push(responseTime);
        this.stats.errors['TIMEOUT'] = (this.stats.errors['TIMEOUT'] || 0) + 1;
        
        resolve({
          statusCode: 0,
          responseTime,
          error: 'Timeout'
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async runConcurrentRequests(concurrency, duration) {
    console.log(`🚀 Starting stress test: ${concurrency} concurrent requests for ${duration}ms`);
    
    const endTime = Date.now() + duration;
    const promises = [];

    // Test different endpoints
    const testPaths = [
      '/',
      '/api',
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/nonexistent',
      '/api/wellness',
      '/api/chat',
      '/api/forum'
    ];

    while (Date.now() < endTime) {
      // Launch concurrent requests
      for (let i = 0; i < concurrency; i++) {
        const path = testPaths[Math.floor(Math.random() * testPaths.length)];
        promises.push(this.makeRequest(path));
      }
      
      // Wait a bit before next batch
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Print progress
      this.printProgress();
    }

    // Wait for all requests to complete
    await Promise.allSettled(promises);
    this.printFinalResults();
  }

  async runMemoryStressTest() {
    console.log('🧠 Running Memory Stress Test...');
    
    const largeData = 'A'.repeat(100000); // 100KB payload
    const promises = [];
    
    for (let i = 0; i < 1000; i++) {
      promises.push(this.makeRequest('/api/auth/register', 'POST', {
        name: `User${i}`,
        email: `user${i}@test.com`,
        password: 'password123',
        largeField: largeData
      }));
      
      if (i % 100 === 0) {
        console.log(`📊 Sent ${i} large requests...`);
      }
    }
    
    await Promise.allSettled(promises);
    console.log('✅ Memory stress test completed');
  }

  async runConnectionFloodTest() {
    console.log('🌊 Running Connection Flood Test...');
    
    const promises = [];
    
    // Create 1000 simultaneous connections
    for (let i = 0; i < 1000; i++) {
      promises.push(this.makeRequest('/'));
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.value?.statusCode > 0).length;
    
    console.log(`📊 Connection flood: ${successful}/1000 connections successful`);
  }

  printProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const rps = this.stats.totalRequests / elapsed;
    const successRate = this.stats.totalRequests > 0 ? 
      (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(1) : 0;
    
    process.stdout.write(`\r📊 ${elapsed.toFixed(1)}s | Requests: ${this.stats.totalRequests} | RPS: ${rps.toFixed(1)} | Success: ${successRate}%`);
  }

  printFinalResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 DIRECT STRESS TEST RESULTS');
    console.log('='.repeat(80));
    
    const totalTime = (Date.now() - this.stats.startTime) / 1000;
    const avgRps = this.stats.totalRequests / totalTime;
    const successRate = this.stats.totalRequests > 0 ? 
      (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) : 0;
    
    if (this.stats.responseTimes.length > 0) {
      const avgResponseTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
      const sortedTimes = this.stats.responseTimes.sort((a, b) => a - b);
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
      const maxTime = Math.max(...sortedTimes);
      const minTime = Math.min(...sortedTimes);
      
      console.log(`⏱️  Duration: ${totalTime.toFixed(2)}s`);
      console.log(`📈 Total Requests: ${this.stats.totalRequests}`);
      console.log(`✅ Successful: ${this.stats.successfulRequests}`);
      console.log(`❌ Failed: ${this.stats.failedRequests}`);
      console.log(`📊 Success Rate: ${successRate}%`);
      console.log(`🚀 Average RPS: ${avgRps.toFixed(2)}`);
      console.log(`⚡ Avg Response: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`📈 95th Percentile: ${p95}ms`);
      console.log(`📈 99th Percentile: ${p99}ms`);
      console.log(`⏱️  Min/Max Response: ${minTime}ms / ${maxTime}ms`);
    }
    
    if (Object.keys(this.stats.errors).length > 0) {
      console.log('\n🔍 ERROR BREAKDOWN:');
      Object.entries(this.stats.errors)
        .sort(([,a], [,b]) => b - a)
        .forEach(([error, count]) => {
          console.log(`  • ${error}: ${count} occurrences`);
        });
    }
    
    console.log('='.repeat(80));
  }

  async runFullStressTest() {
    console.log('🔥 MINDBRIDGE DIRECT STRESS TEST 🔥');
    console.log('Pushing the server to its absolute limits...\n');
    
    // Test 1: Moderate concurrent load
    await this.runConcurrentRequests(10, 10000); // 10 concurrent for 10 seconds
    
    console.log('\n');
    
    // Test 2: High concurrent load
    await this.runConcurrentRequests(50, 15000); // 50 concurrent for 15 seconds
    
    console.log('\n');
    
    // Test 3: Extreme concurrent load
    await this.runConcurrentRequests(100, 10000); // 100 concurrent for 10 seconds
    
    console.log('\n');
    
    // Test 4: Memory stress
    await this.runMemoryStressTest();
    
    console.log('\n');
    
    // Test 5: Connection flood
    await this.runConnectionFloodTest();
    
    console.log('\n🎉 All stress tests completed!');
  }
}

// Multi-process stress testing
if (cluster.isMaster) {
  const numWorkers = Math.min(4, os.cpus().length); // Limit to 4 workers
  console.log(`🔥 Starting ${numWorkers} stress test workers`);
  
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    worker.send({ workerId: i });
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} finished`);
  });
} else {
  process.on('message', (msg) => {
    console.log(`Worker ${msg.workerId} starting stress test...`);
    const tester = new DirectStressTester();
    tester.runFullStressTest().catch(console.error);
  });
}
