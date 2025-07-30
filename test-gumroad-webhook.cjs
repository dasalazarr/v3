// Test script to simulate Gumroad webhook
const https = require('https');
const querystring = require('querystring');

// Simulate Gumroad webhook payload
const webhookData = {
  sale_id: 'test_sale_12345',
  product_id: 'andes_premium',
  email: 'dandres.salazar@gmail.com',
  full_name: 'Diego Andres Salazar',
  price: '999', // $9.99 in cents
  recurrence: 'monthly',
  custom_fields: JSON.stringify({
    phone_number: '593984074389'
  })
};

// Convert to form-encoded data (as Gumroad sends)
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

console.log('🧪 Testing Gumroad Webhook...');
console.log('📡 Endpoint: https://v3-production-2670.up.railway.app/webhook/gumroad');
console.log('📦 Payload:', webhookData);
console.log('');

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook test successful!');
      console.log('🔍 Check Railway logs for processing details');
    } else {
      console.log('❌ Webhook test failed');
      console.log('🔍 Check Railway logs for error details');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

// Send the request
req.write(postData);
req.end();
