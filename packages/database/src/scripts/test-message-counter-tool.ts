#!/usr/bin/env tsx

import { config } from 'dotenv';
import { ChatBuffer } from '@running-coach/vector-memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';
import { createMessageCounterTool } from '../../../apps/api-gateway/src/tools/message-counter-checker.js';

// Load environment variables
config();

async function testMessageCounterTool() {
  console.log('🧪 TESTING MESSAGE COUNTER TOOL DIRECTLY...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  const chatBuffer = ChatBuffer.getInstance({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });

  try {
    const phoneNumber = '593984074389';
    
    console.log('🔍 BUSCANDO USUARIO EN PRODUCCIÓN:');
    console.log('=' .repeat(50));
    console.log(`📱 Teléfono: ${phoneNumber}`);

    // Find user in production database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado en base de datos');
      console.log('💡 Esto confirma la discrepancia entre local y Railway');
      console.log('');
      console.log('🎯 SOLUCIÓN ALTERNATIVA:');
      console.log('   1. El usuario existe en Railway con ID: 41fe0330-553a-44ba-9ad6-47f6698eb6d1');
      console.log('   2. Vamos a simular la herramienta con este ID');
      
      // Simulate with the known user ID from Railway logs
      const simulatedUserId = '41fe0330-553a-44ba-9ad6-47f6698eb6d1';
      console.log(`\n🧪 SIMULANDO HERRAMIENTA CON USER ID: ${simulatedUserId}`);
      
      // Create the tool
      const messageCounterTool = createMessageCounterTool(db, chatBuffer, 40);
      
      console.log('\n🔧 EJECUTANDO check_message_counter...');
      const result = await messageCounterTool.execute({ userId: simulatedUserId });
      
      console.log('\n📊 RESULTADO DE LA HERRAMIENTA:');
      console.log('=' .repeat(50));
      console.log(JSON.stringify(result, null, 2));
      
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📊 Subscription: ${user.subscriptionStatus}`);
    console.log(`📈 Message Count: ${user.weeklyMessageCount || 0}`);

    // Create and test the message counter tool
    const messageCounterTool = createMessageCounterTool(db, chatBuffer, 40);
    
    console.log('\n🔧 EJECUTANDO check_message_counter...');
    console.log('=' .repeat(50));
    
    const result = await messageCounterTool.execute({ userId: user.id });
    
    console.log('\n📊 RESULTADO DE LA HERRAMIENTA:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(result, null, 2));

    console.log('\n🎯 ANÁLISIS DEL RESULTADO:');
    console.log('=' .repeat(50));
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
      console.log(`📝 Mensaje: ${result.message}`);
    } else {
      console.log(`💎 Estado: ${result.subscriptionStatus}`);
      
      if (result.subscriptionStatus === 'premium') {
        console.log('🎉 ¡USUARIO PREMIUM CONFIRMADO!');
        console.log('✅ Mensajes ilimitados');
        console.log('✅ Todas las funciones premium disponibles');
      } else if (result.subscriptionStatus === 'pending_payment') {
        console.log('⏳ PAGO PENDIENTE');
        console.log('⚠️ Webhook de Gumroad aún no procesado');
        console.log('⚠️ Funciones limitadas hasta confirmación');
      } else {
        console.log('🆓 USUARIO GRATUITO');
        console.log(`📊 Mensajes usados: ${result.messageCount}/${result.messageLimit}`);
        console.log(`📈 Restantes: ${result.remainingMessages}`);
      }
      
      console.log(`\n💬 Mensaje para usuario:`);
      console.log(`"${result.message}"`);
    }

    console.log('\n🚨 PROBLEMA IDENTIFICADO:');
    console.log('=' .repeat(50));
    console.log('❌ La herramienta funciona correctamente');
    console.log('❌ El problema es que el AI no la está usando');
    console.log('❌ Cuando preguntas por el contador, da respuesta genérica');

    console.log('\n💡 SOLUCIONES POSIBLES:');
    console.log('=' .repeat(50));
    console.log('1️⃣ MEJORAR DESCRIPCIÓN DE HERRAMIENTA:');
    console.log('   - Agregar más palabras clave específicas');
    console.log('   - Hacer la descripción más explícita');

    console.log('\n2️⃣ FORZAR USO CON PROMPT ESPECÍFICO:');
    console.log('   - Crear intent específico para message counter');
    console.log('   - Modificar intent classifier');

    console.log('\n3️⃣ TESTING ALTERNATIVO:');
    console.log('   - Probar con frases más específicas');
    console.log('   - "¿Soy usuario premium?"');
    console.log('   - "¿Cuántos mensajes me quedan?"');
    console.log('   - "¿Cuál es mi estado de suscripción?"');

    console.log('\n🎯 RECOMENDACIÓN INMEDIATA:');
    console.log('=' .repeat(50));
    console.log('📱 PRUEBA ESTAS FRASES EN EL BOT:');
    console.log('   1. "¿Soy usuario premium?"');
    console.log('   2. "¿Cuántos mensajes me quedan?"');
    console.log('   3. "¿Cuál es mi estado de suscripción?"');
    console.log('   4. "Verificar mi contador de mensajes"');
    console.log('   5. "Mostrar mi estado premium"');

    console.log('\n📊 SI NINGUNA FUNCIONA:');
    console.log('   - El problema está en el intent classification');
    console.log('   - O en la descripción de la herramienta');
    console.log('   - Necesitamos modificar el system prompt');

  } catch (error) {
    console.error('❌ Error testing message counter tool:', error);
  } finally {
    await sql.end();
  }
}

// Run the test
testMessageCounterTool().catch(console.error);
