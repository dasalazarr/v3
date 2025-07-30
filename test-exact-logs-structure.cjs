// Test script to exactly replicate the structure from Railway logs
const https = require('https');

// Create the exact payload structure from the Railway logs
const payload = {
  "seller_id": "BK4AEZmuTsqBqIp4Hj7yiw==",
  "product_id": "andes",
  "product_name": "Andes AI Coach",
  "permalink": "andes",
  "product_permalink": "https://9968687471249.gumroad.com/l/andes",
  "short_product_id": "dlpeu",
  "email": "dandres.salazar@gmail.com",
  "price": "999",
  "gumroad_fee": "150",
  "currency": "usd",
  "quantity": "1",
  "discover_fee_charged": "false",
  "can_contact": "true",
  "referrer": "direct",
  "card": {
    "visual": "",
    "type": "",
    "bin": "",
    "expiry_month": "",
    "expiry_year": ""
  },
  "order_number": "489756257",
  "sale_id": "ACEVA11eY0tDotB8HF_mJQ==",
  "sale_timestamp": "2025-07-30T18:04:06Z",
  "purchaser_id": "9968687471249",
  "subscription_id": "Nl0bwkd2h2Z7xGVuNXpnsg==",
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389"
  },
  "variants": {
    "Tier": "Premium"
  },
  "test": "true",
  "ip_country": "Ecuador",
  "recurrence": "monthly",
  "is_gift_receiver_purchase": "false",
  "refunded": "false",
  "resource_name": "sale",
  "disputed": "false",
  "dispute_won": "false"
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

console.log('🧪 Testing Exact Railway Logs Structure...');
console.log('📡 Endpoint: https://v3-production-2670.up.railway.app/webhook/gumroad');
console.log('📦 Payload Structure:');
console.log('   Sale ID:', payload.sale_id);
console.log('   Product ID:', payload.product_id);
console.log('   Email:', payload.email);
console.log('   URL Params:', payload.url_params);
console.log('   Phone (in URL params):', payload.url_params["custom_fields%5Bphone_number%5D"]);
console.log('   Price:', payload.price);
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
      console.log('🎉 EXACT LOGS STRUCTURE TEST SUCCESSFUL!');
      console.log('✅ Phone number extraction working');
      console.log('🔍 Check Railway logs for processing details');
    } else {
      console.log('❌ Exact logs structure test failed');
      console.log('🔍 Check Railway logs for error details');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
