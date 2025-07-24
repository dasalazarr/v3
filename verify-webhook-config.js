#!/usr/bin/env node

/**
 * Script to verify WhatsApp webhook configuration
 * This helps diagnose why webhooks aren't reaching Railway
 */

const API_BASE = 'https://v3-production-2670.up.railway.app';

async function testWebhookVerification() {
  console.log('🔍 Testing WhatsApp Webhook Verification...');
  
  // This simulates what Meta does when verifying the webhook
  const verifyParams = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'YOUR_VERIFY_TOKEN', // You need to replace this
    'hub.challenge': 'test_challenge_123'
  });
  
  try {
    const response = await fetch(`${API_BASE}/webhook?${verifyParams}`);
    const text = await response.text();
    
    if (response.ok && text === 'test_challenge_123') {
      console.log('✅ Webhook verification endpoint working correctly');
      console.log('📋 Response:', text);
    } else {
      console.log('❌ Webhook verification failed');
      console.log('📋 Status:', response.status);
      console.log('📋 Response:', text);
    }
  } catch (error) {
    console.log('❌ Webhook verification error:', error.message);
  }
}

async function testWebhookPost() {
  console.log('\n🔍 Testing WhatsApp Webhook POST endpoint...');
  
  // Simulate a real WhatsApp webhook
  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'ENTRY_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '593987644414',
            phone_number_id: 'YOUR_PHONE_NUMBER_ID'
          },
          messages: [{
            from: '593984074389',
            id: 'test_message_' + Date.now(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: {
              body: 'Hi! I want to upgrade to Andes Premium 🏃‍♂️💎'
            },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };
  
  try {
    console.log('📤 Sending test webhook to Railway...');
    const response = await fetch(`${API_BASE}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });
    
    if (response.ok) {
      console.log('✅ Webhook POST endpoint accepting requests');
      console.log('📋 Status:', response.status);
      console.log('🔍 Check Railway logs for processing details');
    } else {
      console.log('❌ Webhook POST endpoint failed');
      console.log('📋 Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Webhook POST error:', error.message);
  }
}

async function checkMetaWebhookConfig() {
  console.log('\n📋 Meta Business Webhook Configuration Checklist:');
  console.log('=================================================');
  
  console.log('\n1. 🌐 Webhook URL Configuration:');
  console.log('   Go to: https://developers.facebook.com/apps/');
  console.log('   Select your app → WhatsApp → Configuration');
  console.log('   Webhook URL should be: https://v3-production-2670.up.railway.app/webhook');
  
  console.log('\n2. 🔑 Verify Token:');
  console.log('   The verify token in Meta must match your VERIFY_TOKEN environment variable');
  console.log('   Current Railway endpoint expects this token for verification');
  
  console.log('\n3. 📱 Webhook Fields:');
  console.log('   Make sure these fields are subscribed:');
  console.log('   ✅ messages');
  console.log('   ✅ message_deliveries (optional)');
  console.log('   ✅ message_reads (optional)');
  
  console.log('\n4. 🔄 Webhook Status:');
  console.log('   Webhook should show as "Active" in Meta Business');
  console.log('   If showing as "Failed", check the verification step');
  
  console.log('\n5. 🧪 Test from Meta:');
  console.log('   Use the "Test" button in Meta Business webhook configuration');
  console.log('   This should trigger logs in Railway');
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Environment Variables Check:');
  console.log('================================');
  
  console.log('Required for WhatsApp webhook:');
  console.log('- JWT_TOKEN: For sending messages back to WhatsApp');
  console.log('- NUMBER_ID: Your WhatsApp Business phone number ID');
  console.log('- VERIFY_TOKEN: Must match what you set in Meta Business');
  
  console.log('\n⚠️  If any of these are missing or incorrect:');
  console.log('1. Webhook verification will fail');
  console.log('2. Messages won\'t be processed');
  console.log('3. Bot won\'t respond to users');
}

async function main() {
  console.log('🔧 WhatsApp Webhook Configuration Diagnostic');
  console.log('===========================================\n');
  
  // Test webhook endpoints
  await testWebhookVerification();
  await testWebhookPost();
  
  // Show configuration checklist
  await checkMetaWebhookConfig();
  await checkEnvironmentVariables();
  
  console.log('\n🎯 Next Steps:');
  console.log('==============');
  console.log('1. Verify Meta Business webhook URL points to Railway');
  console.log('2. Check that VERIFY_TOKEN matches between Meta and Railway');
  console.log('3. Test webhook from Meta Business dashboard');
  console.log('4. Monitor Railway logs for webhook activity');
  console.log('5. If still not working, check Meta Business app permissions');
  
  console.log('\n🚨 Common Issues:');
  console.log('=================');
  console.log('- Webhook URL not updated after Railway deployment');
  console.log('- VERIFY_TOKEN mismatch between Meta and Railway');
  console.log('- WhatsApp Business API not properly configured');
  console.log('- App not approved for production use');
  console.log('- Phone number not verified in Meta Business');
}

main().catch(console.error);
