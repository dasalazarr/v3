// Simple test to check if the new logging is active (indicating deployment is complete)
const https = require('https');

const payload = {
  sale_id: "deployment_test",
  product_id: "andes",
  email: "test@example.com",
  price: "999",
  url_params: {
    "custom_fields%5Bphone_number%5D": "593984074389"
  },
  recurrence: "monthly"
};

const postData = JSON.stringify(payload);

const options = {
  hostname: 'v3-production-2670.up.railway.app',
  port: 443,
  path: '/webhook/gumroad',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Gumroad-Webhook/1.0'
  }
};

console.log('🔍 Testing deployment status...');
console.log('📡 Sending test webhook to check for new logging patterns');
console.log('🔍 Look for "Found phone number with pattern" in Railway logs');
console.log('');

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:', data);
    console.log('');
    console.log('🔍 Check Railway logs for these new debug messages:');
    console.log('   - "Found phone number with pattern"');
    console.log('   - "URL params structure:"');
    console.log('   - "Parsed URL params structure:"');
    console.log('');
    console.log('If you see these messages, the deployment is complete.');
    console.log('If not, wait a few more minutes for deployment to finish.');
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
