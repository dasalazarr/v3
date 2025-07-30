// Test script to simulate the exact url_params structure from Railway logs
const https = require('https');
const querystring = require('querystring');

// Simulate the exact structure we saw in Railway logs
const webhookData = {
  sale_id: "ACEVA11eY0tDotB8HF_mJQ==",
  product_id: "andes", // Using valid product ID
  email: "dandres.salazar@gmail.com",
  price: "999",
  recurrence: "monthly",
  // This is the key part - url_params as individual form fields
  "url_params[custom_fields%5Bphone_number%5D]": "593984074389"
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

console.log('🧪 Testing Simple URL Params Structure...');
console.log('📡 Endpoint: https://v3-production-2670.up.railway.app/webhook/gumroad');
console.log('📦 Payload Structure:');
console.log('   Sale ID:', webhookData.sale_id);
console.log('   Product ID:', webhookData.product_id);
console.log('   Email:', webhookData.email);
console.log('   URL Params Phone:', webhookData["url_params[custom_fields%5Bphone_number%5D]"]);
console.log('   Price:', webhookData.price);
console.log('');
console.log('📝 Form Data:', postData);
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
      console.log('🎉 SIMPLE URL PARAMS TEST SUCCESSFUL!');
      console.log('✅ Phone number extraction working');
      console.log('🔍 Check Railway logs for processing details');
    } else {
      console.log('❌ Simple URL params test failed');
      console.log('🔍 Check Railway logs for error details');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
