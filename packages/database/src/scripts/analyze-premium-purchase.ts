#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load environment variables
config();

async function analyzePremiumPurchase() {
  console.log('💎 ANÁLISIS DE COMPRA PREMIUM - USUARIO 593984074389...\n');

  console.log('📊 SITUACIÓN ACTUAL:');
  console.log('=' .repeat(50));
  console.log('📱 Teléfono: 593984074389');
  console.log('💳 Estado reportado: "Adquirí premium"');
  console.log('🔍 Base de datos local: Usuario no encontrado');
  console.log('🌐 Railway logs: Usuario existe con ID 4315f4f9-f4b1-46a6-994b-c2f71221ae9e');

  console.log('\n🚨 DISCREPANCIA IDENTIFICADA:');
  console.log('=' .repeat(50));
  console.log('❌ Usuario no aparece en consulta local de base de datos');
  console.log('✅ Usuario SÍ aparece en logs de Railway (producción)');
  console.log('💡 Esto indica diferencia entre entorno local y producción');

  console.log('\n📋 INFORMACIÓN DE LOGS DE RAILWAY:');
  console.log('=' .repeat(50));
  console.log('🆔 User ID: 4315f4f9-f4b1-46a6-994b-c2f71221ae9e');
  console.log('📊 Subscription Status: pending_payment');
  console.log('🎯 Onboarding Completed: true');
  console.log('🌐 Preferred Language: es');

  console.log('\n🔍 ANÁLISIS DEL ESTADO "pending_payment":');
  console.log('=' .repeat(50));
  console.log('⏳ SIGNIFICADO:');
  console.log('   - Has iniciado el proceso de compra');
  console.log('   - El pago puede estar siendo procesado');
  console.log('   - El webhook de Gumroad puede estar pendiente');
  console.log('   - Aún no se ha confirmado el pago completamente');

  console.log('\n💳 PROCESO DE VALIDACIÓN DE GUMROAD:');
  console.log('=' .repeat(50));
  console.log('1️⃣ COMPRA INICIADA:');
  console.log('   - Usuario hace clic en link de Gumroad');
  console.log('   - Completa el proceso de pago');
  console.log('   - Gumroad procesa la transacción');

  console.log('\n2️⃣ WEBHOOK PROCESSING:');
  console.log('   - Gumroad envía webhook a nuestro sistema');
  console.log('   - Sistema recibe confirmación de pago');
  console.log('   - Estado cambia de "pending_payment" a "premium"');
  console.log('   - Se activa premiumActivatedAt timestamp');

  console.log('\n3️⃣ ACTIVACIÓN COMPLETA:');
  console.log('   - subscriptionStatus = "premium"');
  console.log('   - gumroadCustomerId establecido');
  console.log('   - gumroadOrderId registrado');
  console.log('   - Acceso a funciones premium activado');

  console.log('\n🎯 MÉTODOS DE VERIFICACIÓN:');
  console.log('=' .repeat(50));

  console.log('📱 MÉTODO 1: Consulta directa al bot');
  console.log('   Envía: "¿Cuál es mi contador de mensajes?"');
  console.log('   Respuesta esperada si premium:');
  console.log('   "¡Tienes Andes Premium! 💎 Disfruta de mensajes ilimitados"');

  console.log('\n📊 MÉTODO 2: Observar logs de Railway');
  console.log('   Buscar en logs:');
  console.log('   🔍 [TOOL_REGISTRY] Executing tool: check_message_counter');
  console.log('   🔍 [MESSAGE_COUNTER_TOOL] subscriptionStatus: premium/pending_payment');

  console.log('\n🔄 MÉTODO 3: Probar funcionalidad premium');
  console.log('   - Envía múltiples mensajes (más de 40)');
  console.log('   - Si eres premium: Sin restricciones');
  console.log('   - Si pending: Aparecerán prompts de upgrade');

  console.log('\n⏰ TIEMPOS ESPERADOS:');
  console.log('=' .repeat(50));
  console.log('🚀 Webhook inmediato: 1-5 minutos');
  console.log('⏳ Webhook retrasado: 5-30 minutos');
  console.log('🚨 Problema técnico: Más de 30 minutos');

  console.log('\n💡 RECOMENDACIONES INMEDIATAS:');
  console.log('=' .repeat(50));

  console.log('1️⃣ VERIFICACIÓN RÁPIDA:');
  console.log('   📱 Envía "¿Cuál es mi contador de mensajes?" al bot');
  console.log('   ⏰ Espera respuesta (debería ser inmediata)');
  console.log('   📊 Observa si menciona premium o límites');

  console.log('\n2️⃣ SI AÚN APARECE "PENDING":');
  console.log('   📧 Verifica email de confirmación de Gumroad');
  console.log('   💳 Confirma que el pago se completó exitosamente');
  console.log('   ⏰ Espera 5-10 minutos más para webhook');

  console.log('\n3️⃣ SI PERSISTE EL PROBLEMA:');
  console.log('   📋 Proporciona detalles de la transacción');
  console.log('   🆔 Order ID de Gumroad');
  console.log('   📧 Email usado en la compra');
  console.log('   ⏰ Hora aproximada de la compra');

  console.log('\n🎯 PRÓXIMO PASO RECOMENDADO:');
  console.log('=' .repeat(50));
  console.log('📱 ENVÍA ESTE MENSAJE AL BOT AHORA:');
  console.log('   "¿Cuál es mi contador de mensajes?"');
  console.log('');
  console.log('📊 ESTO NOS DIRÁ INMEDIATAMENTE:');
  console.log('   ✅ Si tu premium ya está activo');
  console.log('   ⏳ Si aún está en procesamiento');
  console.log('   ❌ Si hay algún problema con el webhook');

  console.log('\n🤖 Bot WhatsApp: +593987644414');
}

// Run the analysis
analyzePremiumPurchase().catch(console.error);
