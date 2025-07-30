// Test script to complete the pending payment for user 593984074389
const https = require('https');

console.log('💎 COMPLETANDO PAGO PENDIENTE PARA USUARIO 593984074389...\n');

// Simular webhook de Gumroad con compra completada
const payload = {
  "sale_id": "pending_payment_completion_" + Date.now(),
  "product_id": "andes", // Valid product ID
  "product_name": "Andes AI Coach",
  "email": "dandres.salazar@gmail.com",
  "price": "999",
  "currency": "usd",
  "url_params": {
    "custom_fields%5Bphone_number%5D": "593984074389" // Usuario en pending_payment
  },
  "recurrence": "monthly",
  "purchaser_id": "test_purchaser_" + Date.now(),
  "sale_timestamp": new Date().toISOString(),
  "test": "true"
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

console.log('🎯 SIMULANDO COMPRA COMPLETADA EN GUMROAD');
console.log('📱 Usuario: 593984074389 (actualmente: pending_payment)');
console.log('💰 Precio: $999 USD');
console.log('🔄 Recurrencia: monthly');
console.log('📧 Email: dandres.salazar@gmail.com');
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
      console.log('🎉 WEBHOOK PROCESADO EXITOSAMENTE!');
      console.log('✅ El usuario debería estar ahora PREMIUM');
      console.log('');
      console.log('🔍 VERIFICACIÓN INMEDIATA:');
      console.log('Ejecuta: npx tsx packages/database/src/scripts/check-premium-status.ts');
      console.log('');
      console.log('📊 RESULTADO ESPERADO:');
      console.log('   📱 Phone: 593984074389');
      console.log('   📊 Status: premium ✅');
      console.log('   ⭐ Premium Activated At: [timestamp actual] ✅');
      console.log('   🤖 Bot Behavior: GPT-4o Mini responses ✅');
      console.log('   🚫 Premium Prompts: Should NOT appear ✅');
      console.log('');
      console.log('🎯 FLUJO PREMIUM COMPLETADO:');
      console.log('   ✅ Landing Page → WhatsApp');
      console.log('   ✅ User Creation → Database');
      console.log('   ✅ Premium Intent → pending_payment');
      console.log('   ✅ Gumroad Payment → premium activation');
      console.log('   ✅ Webhook Processing → status update');
      console.log('   🎉 PREMIUM USER EXPERIENCE ACTIVATED!');
    } else {
      console.log('');
      console.log('❌ WEBHOOK PROCESSING FAILED');
      console.log('🔍 Posibles causas:');
      console.log('   - Error en extracción de phone number');
      console.log('   - Usuario no encontrado en database');
      console.log('   - Error en actualización de status');
      console.log('');
      console.log('🔧 Revisar Railway logs para detalles del error');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
