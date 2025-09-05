#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Starting Inngest Services Test Suite...\n');

// Test configuration
const testFiles = [
  'tests/inngest.test.js',
  'tests/inngest-ai.test.js', 
  'tests/inngest-e2e.test.js'
];

const testConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};

// Create Jest configuration
const jestConfig = {
  ...testConfig,
  testMatch: testFiles.map(file => `<rootDir>/${file}`)
};

// Write temporary Jest config
const fs = require('fs');
const configPath = path.join(__dirname, '../jest.inngest.config.js');
fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);

// Run tests
const jest = spawn('npx', ['jest', '--config', configPath], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

jest.on('close', (code) => {
  // Cleanup
  fs.unlinkSync(configPath);
  
  if (code === 0) {
    console.log('\n✅ All Inngest tests passed!');
    
    // Run additional checks
    console.log('\n🔍 Running additional service checks...');
    runServiceChecks();
  } else {
    console.log('\n❌ Some tests failed. Check the output above.');
    process.exit(1);
  }
});

async function runServiceChecks() {
  console.log('📊 Checking Inngest configuration...');
  
  try {
    const { inngestEnabled, eventHandler } = require('../config/inngest');
    
    console.log(`- Inngest enabled: ${inngestEnabled ? '✅' : '❌'}`);
    console.log(`- Event handler initialized: ${eventHandler ? '✅' : '❌'}`);
    
    if (eventHandler) {
      const metrics = eventHandler.getMetrics();
      console.log(`- Events processed: ${metrics.eventsProcessed}`);
      console.log(`- Errors: ${metrics.errors}`);
      console.log(`- Inngest mode: ${metrics.inngestEnabled ? 'Background' : 'Direct'}`);
    }
    
    // Test database connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      console.log('- Database connection: ✅');
    } else {
      console.log('- Database connection: ❌');
    }
    
    console.log('\n🎉 Service checks completed!');
    
  } catch (error) {
    console.error('❌ Service check failed:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(1);
});
