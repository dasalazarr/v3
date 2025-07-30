// Debug script to test phone number extraction logic locally
const testPayload = {
  "seller_id": "BK4AEZmuTsqBqIp4Hj7yiw==",
  "product_id": "andes",
  "email": "dandres.salazar@gmail.com",
  "price": "999",
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389"
  },
  "recurrence": "monthly"
};

console.log('🔍 Testing phone number extraction logic...');
console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));

// Simulate the extraction logic from the webhook handler
const {
  custom_fields,
  url_params
} = testPayload;

// Parse custom_fields if it's a string (sometimes Gumroad sends it as JSON string)
let parsedCustomFields;
try {
  parsedCustomFields = typeof custom_fields === 'string'
    ? JSON.parse(custom_fields)
    : custom_fields;
} catch (error) {
  console.log('🔥 [GUMROAD] Custom fields not JSON, using as-is:', custom_fields);
  parsedCustomFields = custom_fields;
}

// Extract phone number from multiple possible locations
let phoneNumber = parsedCustomFields?.phone_number;

console.log('📞 Phone from custom_fields:', phoneNumber);

// If not found in custom_fields, check url_params (Gumroad sometimes sends it there)
if (!phoneNumber && url_params) {
  // Parse url_params if it's a JSON string
  let parsedUrlParams;
  try {
    parsedUrlParams = typeof url_params === 'string' ? JSON.parse(url_params) : url_params;
  } catch (error) {
    console.log('🔥 [GUMROAD] URL params not JSON, using as-is:', url_params);
    parsedUrlParams = url_params;
  }
  
  console.log('🔍 Parsed URL params:', parsedUrlParams);
  console.log('🔍 URL params type:', typeof url_params);
  console.log('🔍 URL params keys:', url_params ? Object.keys(url_params) : 'none');
  
  // Check for URL-encoded custom field: custom_fields[phone_number] or custom_fields%5Bphone_number%5D
  phoneNumber = parsedUrlParams?.['custom_fields[phone_number]'] || 
                parsedUrlParams?.['custom_fields%5Bphone_number%5D'] ||
                url_params?.['custom_fields[phone_number]'] ||
                url_params?.['custom_fields%5Bphone_number%5D'];
  
  console.log('📞 Phone from url_params (method 1):', phoneNumber);
  console.log('🔍 Checking specific key:', url_params?.['custom_fields%5Bphone_number%5D']);
}

console.log('');
console.log('🎯 Final extracted phone number:', phoneNumber);

if (phoneNumber) {
  console.log('✅ Phone number extraction SUCCESSFUL!');
} else {
  console.log('❌ Phone number extraction FAILED!');
  console.log('🔍 Available data:');
  console.log('   - custom_fields:', custom_fields);
  console.log('   - url_params:', url_params);
  console.log('   - url_params keys:', url_params ? Object.keys(url_params) : 'none');
}
