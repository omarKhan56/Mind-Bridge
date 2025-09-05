#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 MINDBRIDGE TEST RUNNER\n');

const testCategories = {
  unit: '🔬 Unit Tests',
  integration: '🔗 Integration Tests', 
  e2e: '🎯 End-to-End Tests'
};

async function runTests() {
  const args = process.argv.slice(2);
  const category = args[0] || 'all';
  
  console.log(`Running: ${category === 'all' ? 'All Tests' : testCategories[category] || category}\n`);

  if (category === 'all') {
    await runAllTests();
  } else if (testCategories[category]) {
    await runTestCategory(category);
  } else {
    await runSpecificTest(category);
  }
}

async function runAllTests() {
  console.log('🚀 Running Complete Test Suite...\n');
  
  for (const [cat, name] of Object.entries(testCategories)) {
    console.log(`\n${name}:`);
    await runTestCategory(cat);
  }
  
  console.log('\n✅ All test categories completed!');
}

async function runTestCategory(category) {
  const testDirs = [
    `./tests/${category}`,
    `./server/tests/${category}`,
    `./client/tests/${category}`
  ];
  
  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
      
      if (files.length > 0) {
        console.log(`  📁 ${dir}:`);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          console.log(`    🔍 ${file}`);
          
          try {
            await runSingleTest(filePath);
            console.log(`    ✅ ${file} - PASSED`);
          } catch (error) {
            console.log(`    ❌ ${file} - FAILED: ${error.message}`);
          }
        }
      }
    }
  }
}

async function runSpecificTest(testName) {
  // Find test file by name
  const testDirs = [
    './tests/unit', './tests/integration', './tests/e2e',
    './server/tests/unit', './server/tests/integration', './server/tests/e2e',
    './client/tests/unit', './client/tests/integration', './client/tests/e2e'
  ];
  
  let testFile = null;
  
  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const found = files.find(f => f.includes(testName) || f === `${testName}.js`);
      if (found) {
        testFile = path.join(dir, found);
        break;
      }
    }
  }
  
  if (testFile) {
    console.log(`🔍 Running: ${testFile}\n`);
    await runSingleTest(testFile);
  } else {
    console.log(`❌ Test not found: ${testName}`);
    console.log('\nAvailable tests:');
    listAvailableTests();
  }
}

async function runSingleTest(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [filePath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

function listAvailableTests() {
  const testDirs = [
    './tests/unit', './tests/integration', './tests/e2e',
    './server/tests/unit', './server/tests/integration', './server/tests/e2e'
  ];
  
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
      if (files.length > 0) {
        console.log(`\n  ${dir}:`);
        files.forEach(file => console.log(`    • ${file}`));
      }
    }
  });
}

function showUsage() {
  console.log('Usage:');
  console.log('  node run-tests.js [category|test-name]');
  console.log('');
  console.log('Categories:');
  Object.entries(testCategories).forEach(([key, name]) => {
    console.log(`  ${key.padEnd(12)} - ${name}`);
  });
  console.log('  all          - Run all tests');
  console.log('');
  console.log('Examples:');
  console.log('  node run-tests.js unit');
  console.log('  node run-tests.js integration');
  console.log('  node run-tests.js inngest');
  console.log('  node run-tests.js all');
}

// Handle help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
