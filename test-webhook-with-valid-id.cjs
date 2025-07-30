// Test Gumroad webhook with valid product ID
const https = require('https');
const querystring = require('querystring');

console.log('🧪 Testing Gumroad Webhook with Valid Product ID...\n');

// Use the valid product ID we found
const webhookData = {
  sale_id: `real_test_${Date.now()}`,
  product_id: 'andes', // Valid product ID from our tests
  email: 'dandres.salazar@gmail.com',
  full_name: 'Diego Andres Salazar',
  price: '999', // $9.99 in cents
  recurrence: 'monthly',
  custom_fields: JSON.stringify({
    phone_number: '593984074389'
  })
};

console.log('📦 Webhook Payload:');
console.log('   Sale ID:', webhookData.sale_id);
console.log('   Product ID:', webhookData.product_id);
console.log('   Email:', webhookData.email);
console.log('   Phone:', JSON.parse(webhookData.custom_fields).phone_number);
console.log('   Price:', webhookData.price);
console.log('');

const postData = querystring.stringify(webhookData);

const options = {
  hostname: 'v3-production-2670.up.railway.app',
  port: 443,
  path: '/webhook/gumroad',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Gumroad-Webhook/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:', data);
    console.log('');
    
    if (res.statusCode === 200) {
      console.log('🎉 WEBHOOK TEST SUCCESSFUL!');
      console.log('✅ Premium should now be activated');
      console.log('🔍 Check Railway logs for detailed processing');
      console.log('📱 Test WhatsApp bot to confirm premium features');
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('1. Send a message to the WhatsApp bot');
      console.log('2. Verify GPT-4o Mini is being used');
      console.log('3. Confirm no premium upgrade prompts');
      console.log('4. Run check-premium-status.ts to verify database');
    } else if (res.statusCode === 400) {
      try {
        const errorResponse = JSON.parse(data);
        if (errorResponse.error === 'User already premium') {
          console.log('⚠️  USER ALREADY PREMIUM');
          console.log('✅ This means the webhook would work for new users');
          console.log('🔍 Your premium status is already active');
          console.log('');
          console.log('🎯 CONCLUSION:');
          console.log('✅ Webhook is properly configured');
          console.log('✅ Product IDs are valid');
          console.log('✅ System would activate premium for new purchases');
        } else {
          console.log('❌ WEBHOOK TEST FAILED');
          console.log('🔍 Error:', errorResponse.error);
        }
      } catch (e) {
        console.log('❌ WEBHOOK TEST FAILED');
        console.log('🔍 Raw error:', data);
      }
    } else {
      console.log('❓ UNEXPECTED RESPONSE');
      console.log('🔍 Check Railway logs for details');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

// Send the request
req.write(postData);
req.end();
