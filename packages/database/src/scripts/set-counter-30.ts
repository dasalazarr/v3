#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function setCounterTo30() {
  console.log('🚨 ESTABLECIENDO CONTADOR EN 30 MENSAJES (LÍMITE ALCANZADO)...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';
    const targetCount = 30;
    
    console.log(`📱 Usuario: ${phoneNumber}`);
    console.log(`🎯 Estableciendo contador en: ${targetCount}`);
    console.log(`🚨 LÍMITE ALCANZADO: 30/30 mensajes`);
    console.log(`📊 Estado: DEBE ACTIVAR FLUJO PREMIUM COMPLETO`);

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`\n✅ Usuario encontrado: ${user.id}`);
    console.log(`📊 Contador actual: ${user.weeklyMessageCount}`);
    console.log(`💎 Estado actual: ${user.subscriptionStatus}`);

    // Update counter
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        weeklyMessageCount: targetCount,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('\n🚨 LÍMITE ALCANZADO - CONTADOR ACTUALIZADO!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Teléfono: ${updatedUser.phoneNumber}`);
    console.log(`📈 CONTADOR: ${updatedUser.weeklyMessageCount}/30 🚨`);
    console.log(`💎 Estado Suscripción: ${updatedUser.subscriptionStatus}`);
    console.log(`🔄 Actualizado: ${updatedUser.updatedAt}`);

    console.log('\n🎯 COMPORTAMIENTO ESPERADO:');
    console.log('=' .repeat(50));
    console.log('🚨 LÍMITE ALCANZADO (30/30):');
    console.log('- El bot DEBE mostrar: "Has alcanzado el límite de mensajes gratuitos"');
    console.log('- DEBE activar el flujo de upgrade premium completo');
    console.log('- DEBE incluir link prominente de Gumroad');
    console.log('- DEBE restringir funcionalidad hasta upgrade');
    console.log('- DEBE detectar premium intent automáticamente');

    console.log('\n🧪 PASOS DE VALIDACIÓN CRÍTICOS:');
    console.log('1. Envía un mensaje al bot (+593987644414)');
    console.log('2. DEBE ver: "Has alcanzado el límite de mensajes gratuitos"');
    console.log('3. DEBE incluir link de Gumroad prominente');
    console.log('4. DEBE activar restricciones de funcionalidad');
    console.log('5. Monitorea logs para confirmar flujo premium');

    console.log('\n📊 LOGS CRÍTICOS DE RAILWAY:');
    console.log('🔍 [MESSAGE_LIMIT] Weekly count: 30 🚨');
    console.log('🔍 [PREMIUM_LIMIT] Limit reached - upgrade required');
    console.log('🔍 [INTENT] Premium intent detected: true');
    console.log('🔍 [PREMIUM_FLOW] Full upgrade prompt triggered');
    console.log('🔍 [HYBRID_AI] User subscription status: pending_payment');

    console.log('\n⚠️ IMPORTANTE:');
    console.log('Con 30 mensajes, el usuario DEBE ver el flujo premium completo.');
    console.log('Si no aparece, hay un problema en la lógica de límites del bot.');

  } catch (error) {
    console.error('❌ Error estableciendo contador:', error);
  } finally {
    await sql.end();
  }
}

// Run the update
setCounterTo30().catch(console.error);
