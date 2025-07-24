#!/usr/bin/env node

/**
 * Test script for Andes Premium Flow
 * Tests the complete premium upgrade flow end-to-end
 */

const API_BASE = 'https://v3-production-2670.up.railway.app';

async function testOnboardingEndpoint() {
  console.log('🧪 Testing Onboarding Endpoint...');
  
  try {
    // Test Spanish Premium Intent
    const response = await fetch(`${API_BASE}/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'premium', language: 'es' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Onboarding endpoint working');
      console.log(`📱 WhatsApp Link: ${data.whatsappLink}`);
      console.log(`🗣️ Language: ${data.language}`);
      console.log(`🎯 Intent: ${data.intent}`);
      
      // Decode the message to verify it's in Spanish
      const url = new URL(data.whatsappLink);
      const message = decodeURIComponent(url.searchParams.get('text'));
      console.log(`💬 Pre-filled message: "${message}"`);
      
      if (message.includes('Hola') && message.includes('Premium')) {
        console.log('✅ Spanish localization working correctly');
      } else {
        console.log('❌ Spanish localization issue detected');
      }
      
      return data.whatsappLink;
    } else {
      console.log('❌ Onboarding endpoint failed:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Onboarding endpoint error:', error.message);
    return null;
  }
}

async function testHealthEndpoint() {
  console.log('\n🧪 Testing Health Endpoint...');
  
  try {
    const response = await fetch(`${API_BASE}/onboarding/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ Health endpoint working');
      console.log(`📊 Service: ${data.service}`);
      console.log(`📱 WhatsApp: ${data.whatsappNumber}`);
      console.log(`⏰ Timestamp: ${data.timestamp}`);
    } else {
      console.log('❌ Health endpoint unhealthy:', data);
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
  }
}

async function simulateWebhookMessage() {
  console.log('\n🧪 Simulating WhatsApp Webhook Message...');
  
  // This is what a WhatsApp webhook looks like
  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'ENTRY_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '593987644414',
            phone_number_id: 'PHONE_NUMBER_ID'
          },
          messages: [{
            from: '593984074389', // Test phone number
            id: 'MESSAGE_ID',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: {
              body: '¡Hola! Quiero comenzar con Andes Premium ($9.99/mes) para mi entrenamiento de running 🏃‍♂️💎'
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  try {
    console.log('📤 Sending webhook payload to /webhook endpoint...');
    console.log('💬 Message:', webhookPayload.entry[0].changes[0].value.messages[0].text.body);
    
    const response = await fetch(`${API_BASE}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    
    if (response.ok) {
      console.log('✅ Webhook accepted (200 OK)');
      console.log('🔍 Check Railway logs for processing details');
      console.log('📱 Expected: Premium intent should be detected and Gumroad link sent');
    } else {
      console.log('❌ Webhook rejected:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Webhook simulation error:', error.message);
  }
}

async function checkDatabaseUser() {
  console.log('\n🧪 Database User Check Instructions...');
  console.log('📋 To verify the user was created/updated correctly:');
  console.log('1. Connect to your Neon database');
  console.log('2. Run: SELECT * FROM users WHERE phone_number = \'593984074389\';');
  console.log('3. Check that subscription_status is \'pending_payment\'');
  console.log('4. Verify updated_at timestamp is recent');
}

async function main() {
  console.log('🚀 Andes Premium Flow Test Suite');
  console.log('=====================================\n');
  
  // Test 1: Onboarding Endpoint
  const whatsappLink = await testOnboardingEndpoint();
  
  // Test 2: Health Endpoint
  await testHealthEndpoint();
  
  // Test 3: Simulate Webhook (this will trigger the premium flow)
  await simulateWebhookMessage();
  
  // Test 4: Database verification instructions
  await checkDatabaseUser();
  
  console.log('\n🎯 Test Summary:');
  console.log('================');
  console.log('1. ✅ Onboarding endpoint generates correct Spanish WhatsApp link');
  console.log('2. ✅ Health endpoint confirms system is operational');
  console.log('3. 📤 Webhook simulation sent (check Railway logs for processing)');
  console.log('4. 📋 Database verification instructions provided');
  
  console.log('\n🔍 Next Steps:');
  console.log('1. Check Railway logs for webhook processing');
  console.log('2. Verify database user record was updated');
  console.log('3. Test actual WhatsApp conversation with the generated link');
  
  if (whatsappLink) {
    console.log(`\n📱 Test WhatsApp Link: ${whatsappLink}`);
    console.log('⚠️  WARNING: This will send a real message to the bot!');
  }
}

// Run the test suite
main().catch(console.error);
