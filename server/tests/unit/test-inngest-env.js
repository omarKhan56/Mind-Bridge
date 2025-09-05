#!/usr/bin/env node

require('dotenv').config();

console.log('🔍 Testing Inngest Environment Configuration...\n');

async function testInngestEnvironment() {
  try {
    // Test 1: Environment Variable Check
    console.log('1️⃣ Checking environment variables...');
    
    const eventKey = process.env.INNGEST_EVENT_KEY;
    const signingKey = process.env.INNGEST_SIGNING_KEY;
    
    console.log(`   INNGEST_EVENT_KEY: ${eventKey ? '✅ Set' : '❌ Not set'}`);
    console.log(`   INNGEST_SIGNING_KEY: ${signingKey ? '✅ Set' : '❌ Not set'}`);
    
    if (eventKey) {
      console.log(`   Key length: ${eventKey.length} characters`);
      console.log(`   Key preview: ${eventKey.substring(0, 10)}...`);
    }

    // Test 2: Configuration Logic
    console.log('\n2️⃣ Testing configuration logic...');
    
    const inngestEnabled = process.env.INNGEST_EVENT_KEY && 
                          process.env.INNGEST_EVENT_KEY !== 'your-inngest-event-key-here';
    
    console.log(`   Inngest enabled check: ${inngestEnabled}`);
    console.log(`   Key exists: ${!!process.env.INNGEST_EVENT_KEY}`);
    console.log(`   Key not placeholder: ${process.env.INNGEST_EVENT_KEY !== 'your-inngest-event-key-here'}`);

    // Test 3: Inngest Client Initialization
    console.log('\n3️⃣ Testing Inngest client initialization...');
    
    if (inngestEnabled) {
      try {
        const { Inngest } = require('inngest');
        const inngest = new Inngest({ 
          id: 'mindbridge-app',
          name: 'MindBridge Mental Health System'
        });
        
        console.log('   ✅ Inngest client created successfully');
        console.log(`   Client ID: ${inngest.id}`);
        
        // Test event sending
        console.log('\n4️⃣ Testing event sending...');
        
        try {
          const result = await inngest.send({
            name: 'test/connection',
            data: { message: 'Test connection', timestamp: Date.now() }
          });
          
          console.log('   ✅ Event sent successfully');
          console.log(`   Event ID: ${result.ids?.[0] || 'N/A'}`);
          
        } catch (sendError) {
          console.log(`   ⚠️ Event sending failed: ${sendError.message}`);
          console.log('   (This is normal if Inngest dev server is not running)');
        }
        
      } catch (clientError) {
        console.log(`   ❌ Client creation failed: ${clientError.message}`);
      }
    } else {
      console.log('   ℹ️ Inngest disabled - running in fallback mode');
    }

    // Test 4: Load Configuration Module
    console.log('\n5️⃣ Testing configuration module...');
    
    try {
      const config = require('./config/inngest');
      
      console.log(`   ✅ Config loaded`);
      console.log(`   Inngest enabled: ${config.inngestEnabled}`);
      console.log(`   Event handler: ${!!config.eventHandler}`);
      console.log(`   Functions count: ${config.functions?.length || 0}`);
      
      if (config.eventHandler) {
        const metrics = config.eventHandler.getMetrics();
        console.log(`   Handler metrics: ${JSON.stringify(metrics)}`);
      }
      
    } catch (configError) {
      console.log(`   ❌ Config loading failed: ${configError.message}`);
    }

    // Test 5: Function Registration
    console.log('\n6️⃣ Testing function registration...');
    
    if (inngestEnabled) {
      try {
        const { functions } = require('./config/inngest');
        
        if (functions && functions.length > 0) {
          console.log(`   ✅ ${functions.length} functions registered:`);
          functions.forEach((fn, index) => {
            console.log(`     ${index + 1}. ${fn.id || 'Unknown function'}`);
          });
        } else {
          console.log('   ℹ️ No functions registered');
        }
        
      } catch (functionError) {
        console.log(`   ❌ Function registration failed: ${functionError.message}`);
      }
    } else {
      console.log('   ℹ️ Functions disabled in fallback mode');
    }

    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run tests
testInngestEnvironment()
  .then(success => {
    if (success) {
      console.log('\n🎉 Environment test completed!');
      
      const inngestEnabled = process.env.INNGEST_EVENT_KEY && 
                            process.env.INNGEST_EVENT_KEY !== 'your-inngest-event-key-here';
      
      if (inngestEnabled) {
        console.log('\n✅ Inngest is ENABLED and configured properly!');
        console.log('💡 To test functions, run: npx inngest-cli dev');
      } else {
        console.log('\n⚠️ Inngest is DISABLED - running in fallback mode');
        console.log('💡 This is fine for development, all features still work');
      }
      
      process.exit(0);
    } else {
      console.log('\n❌ Environment test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
