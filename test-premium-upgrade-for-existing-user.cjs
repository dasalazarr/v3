// Test script to upgrade the existing user to premium via Gumroad webhook
const https = require('https');

// Test the real Gumroad format with the existing user
const payload = {
  "sale_id": "premium_upgrade_test_" + Date.now(),
  "product_id": "andes", // Valid product ID
  "email": "dandres.salazar@gmail.com",
  "price": "999",
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389" // Existing user phone
  },
  "recurrence": "monthly"
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

console.log('🎯 Testing Premium Upgrade for Existing User...');
console.log('📱 Target phone: 593984074389');
console.log('💎 Expected result: User upgraded to premium status');
console.log('');

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:', data);
    
    if (res.statusCode === 200) {
      console.log('');
      console.log('🎉 WEBHOOK PROCESSED SUCCESSFULLY!');
      console.log('✅ User should now be upgraded to premium');
      console.log('');
      console.log('🔍 Next steps:');
      console.log('1. Run: npx tsx packages/database/src/scripts/check-premium-status.ts');
      console.log('2. Verify user status changed from "free" to "premium"');
      console.log('3. Check that premiumActivatedAt timestamp is set');
      console.log('4. Confirm WhatsApp confirmation message was sent');
    } else {
      console.log('');
      console.log('❌ WEBHOOK PROCESSING FAILED');
      console.log('🔍 Check Railway logs for error details');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
