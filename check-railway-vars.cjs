// Script to check Railway environment variables
const https = require('https');

console.log('🔍 Checking Railway Environment Variables...\n');

// Create a test endpoint request to see what variables are loaded
const options = {
  hostname: 'v3-production-2670.up.railway.app',
  port: 443,
  path: '/debug/webhook',
  method: 'GET',
  headers: {
    'User-Agent': 'Environment-Check/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📄 Debug Response:', JSON.stringify(response, null, 2));
      
      // Check if webhook is properly configured
      if (response.webhook_url) {
        console.log('\n✅ Webhook endpoint is configured');
        console.log(`🔗 URL: ${response.webhook_url}`);
      }
      
      // Check token configurations
      console.log('\n🔑 Token Configurations:');
      console.log(`📱 Verify Token: ${response.verify_token_configured ? '✅ Configured' : '❌ Missing'}`);
      console.log(`🔐 JWT Token: ${response.jwt_token_configured ? '✅ Configured' : '❌ Missing'}`);
      console.log(`📞 Number ID: ${response.number_id_configured ? '✅ Configured' : '❌ Missing'}`);
      
    } catch (error) {
      console.log('📄 Raw Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.end();

// Also test the Gumroad webhook endpoint with a simple GET
console.log('\n🧪 Testing Gumroad Webhook Endpoint...');

const gumroadOptions = {
  hostname: 'v3-production-2670.up.railway.app',
  port: 443,
  path: '/webhook/gumroad',
  method: 'GET',
  headers: {
    'User-Agent': 'Webhook-Test/1.0'
  }
};

const gumroadReq = https.request(gumroadOptions, (res) => {
  console.log(`📊 Gumroad Webhook Status: ${res.statusCode}`);
  
  let gumroadData = '';
  res.on('data', (chunk) => {
    gumroadData += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 405) {
      console.log('✅ Gumroad webhook endpoint exists (Method Not Allowed for GET is expected)');
    } else {
      console.log('📄 Gumroad Response:', gumroadData);
    }
  });
});

gumroadReq.on('error', (e) => {
  console.error('❌ Gumroad request error:', e.message);
});

gumroadReq.end();
