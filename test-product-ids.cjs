// Test different product IDs to see which ones are configured
const https = require('https');
const querystring = require('querystring');

// Common Gumroad product ID patterns to test
const testProductIds = [
  'andes',
  'andes-premium',
  'andes_premium',
  'andeslatam',
  'andes-latam',
  'andes_latam',
  'running-coach',
  'running_coach',
  // From the Gumroad link in .env
  'andes' // extracted from gumroad.com/l/andes
];

async function testProductId(productId, language = 'en') {
  return new Promise((resolve) => {
    console.log(`🧪 Testing Product ID: "${productId}" (${language})`);
    
    const webhookData = {
      sale_id: `test_sale_${Date.now()}`,
      product_id: productId,
      email: 'dandres.salazar@gmail.com',
      full_name: 'Diego Andres Salazar',
      price: '999',
      recurrence: 'monthly',
      custom_fields: JSON.stringify({
        phone_number: '593984074389'
      })
    };

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
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          productId,
          language,
          statusCode: res.statusCode,
          response: data
        };
        
        if (res.statusCode === 200) {
          console.log(`✅ SUCCESS: Product ID "${productId}" is valid!`);
        } else if (res.statusCode === 400 && data.includes('Product ID does not match')) {
          console.log(`❌ INVALID: Product ID "${productId}" not configured`);
        } else if (res.statusCode === 400 && data.includes('already premium')) {
          console.log(`⚠️  ALREADY PREMIUM: Product ID "${productId}" is valid but user already premium`);
        } else {
          console.log(`❓ OTHER: Product ID "${productId}" - Status: ${res.statusCode}, Response: ${data}`);
        }
        
        resolve(result);
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ERROR: Product ID "${productId}" - ${e.message}`);
      resolve({ productId, language, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing Gumroad Product IDs Configuration...\n');
  
  const results = [];
  
  // Test each product ID
  for (const productId of testProductIds) {
    const result = await testProductId(productId);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('=' .repeat(50));
  
  const validIds = results.filter(r => r.statusCode === 200 || (r.statusCode === 400 && r.response && r.response.includes('already premium')));
  const invalidIds = results.filter(r => r.statusCode === 400 && r.response && r.response.includes('Product ID does not match'));
  
  if (validIds.length > 0) {
    console.log('\n✅ VALID PRODUCT IDs:');
    validIds.forEach(r => {
      console.log(`   - "${r.productId}"`);
    });
  }
  
  if (invalidIds.length > 0) {
    console.log('\n❌ INVALID PRODUCT IDs:');
    invalidIds.forEach(r => {
      console.log(`   - "${r.productId}"`);
    });
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  if (validIds.length > 0) {
    console.log('✅ Product IDs are configured in Railway');
    console.log('✅ Webhook should work for future purchases');
    console.log('⚠️  Your current premium status was set manually');
    console.log('🔍 Check if you want to reset to test webhook flow');
  } else {
    console.log('❌ No valid Product IDs found');
    console.log('🔧 Need to configure GUMROAD_PRODUCT_ID_EN and GUMROAD_PRODUCT_ID_ES in Railway');
  }
}

runTests().catch(console.error);
