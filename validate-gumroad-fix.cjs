// Validation script to test the Gumroad webhook fix
const https = require('https');

console.log('🔧 Validating Gumroad Webhook Fix...');
console.log('');

// Test 1: Original working format (should still work)
const testOriginalFormat = () => {
  return new Promise((resolve) => {
    const webhookData = {
      sale_id: 'test_validation_1',
      product_id: 'andes',
      email: 'test@example.com',
      custom_fields: JSON.stringify({
        phone_number: '593984074389'
      }),
      price: '999',
      recurrence: 'monthly'
    };

    const postData = require('querystring').stringify(webhookData);
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

    console.log('📋 Test 1: Original format (custom_fields as JSON string)');
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const success = res.statusCode === 200;
        console.log(`   Status: ${res.statusCode} ${success ? '✅' : '❌'}`);
        if (!success) console.log(`   Error: ${data}`);
        resolve(success);
      });
    });

    req.on('error', (e) => {
      console.log(`   Error: ${e.message} ❌`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

// Test 2: Real Gumroad format (url_params with encoded key)
const testRealGumroadFormat = () => {
  return new Promise((resolve) => {
    const payload = {
      sale_id: "test_validation_2",
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

    console.log('📋 Test 2: Real Gumroad format (url_params with encoded key)');
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const success = res.statusCode === 200;
        console.log(`   Status: ${res.statusCode} ${success ? '✅' : '❌'}`);
        if (!success) console.log(`   Error: ${data}`);
        resolve(success);
      });
    });

    req.on('error', (e) => {
      console.log(`   Error: ${e.message} ❌`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

// Run validation tests
const runValidation = async () => {
  console.log('🧪 Running validation tests...');
  console.log('');

  const test1Result = await testOriginalFormat();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  
  const test2Result = await testRealGumroadFormat();
  
  console.log('');
  console.log('📊 Validation Results:');
  console.log(`   Original format: ${test1Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Real Gumroad format: ${test2Result ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (test1Result && test2Result) {
    console.log('🎉 ALL TESTS PASSED! Gumroad webhook fix is working correctly.');
    console.log('✅ Premium payment flow should now work for real Gumroad webhooks.');
  } else {
    console.log('❌ Some tests failed. Check Railway logs for details.');
    console.log('🔍 The webhook may need additional debugging or deployment time.');
  }
};

runValidation().catch(console.error);
