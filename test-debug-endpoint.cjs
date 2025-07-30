// Test script to hit the debug endpoint and see raw data
const https = require('https');

// Create the exact payload structure from the Railway logs
const payload = {
  "seller_id": "BK4AEZmuTsqBqIp4Hj7yiw==",
  "product_id": "andes",
  "product_name": "Andes AI Coach",
  "email": "dandres.salazar@gmail.com",
  "price": "999",
  "sale_id": "ACEVA11eY0tDotB8HF_mJQ==",
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389"
  },
  "recurrence": "monthly"
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 'v3-production-2670.up.railway.app',
  port: 443,
  path: '/debug/gumroad',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Gumroad-Webhook/1.0'
  }
};

console.log('🔍 Testing Debug Endpoint...');
console.log('📡 Endpoint: https://v3-production-2670.up.railway.app/debug/gumroad');
console.log('📦 Payload:', payload);
console.log('');

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Debug endpoint working');
      console.log('🔍 Check Railway logs for raw data details');
    } else {
      console.log('❌ Debug endpoint failed');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
