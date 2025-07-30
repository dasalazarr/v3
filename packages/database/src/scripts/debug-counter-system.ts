#!/usr/bin/env tsx

import { config } from 'dotenv';
import { ChatBuffer } from '@running-coach/vector-memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function debugCounterSystem() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA DE CONTADORES...\n');

  // Initialize connections
  const chatBuffer = ChatBuffer.getInstance({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';
    const messageLimit = parseInt(process.env.MESSAGE_LIMIT || '40');

    // 1. VERIFICAR USUARIO EN BASE DE DATOS
    console.log('1️⃣ VERIFICANDO USUARIO EN BASE DE DATOS:');
    console.log('=' .repeat(50));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📱 Teléfono: ${user.phoneNumber}`);
    console.log(`💎 Estado Suscripción: ${user.subscriptionStatus}`);
    console.log(`📊 DB Counter (no usado): ${user.weeklyMessageCount}`);
    console.log(`🌐 Idioma: ${user.preferredLanguage}`);

    // 2. VERIFICAR CONTADOR REDIS
    console.log('\n2️⃣ VERIFICANDO CONTADOR REDIS:');
    console.log('=' .repeat(50));

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const redisKey = `msg:${user.id}:${year}-${month + 1}`;

    console.log(`🔑 Redis Key: ${redisKey}`);
    console.log(`📅 Año-Mes: ${year}-${month + 1}`);

    const currentCount = await chatBuffer.getKeyValue(redisKey);
    console.log(`📈 Contador Actual: ${currentCount}`);
    console.log(`⚠️ Límite Configurado: ${messageLimit}`);

    // 3. SIMULAR LÓGICA DE FREEMIUM SERVICE
    console.log('\n3️⃣ SIMULANDO LÓGICA DE FREEMIUM SERVICE:');
    console.log('=' .repeat(50));

    console.log(`🔍 Verificando: user.subscriptionStatus === 'premium'`);
    console.log(`📊 Resultado: ${user.subscriptionStatus === 'premium'}`);

    if (user.subscriptionStatus === 'premium') {
      console.log('✅ USUARIO PREMIUM: checkMessageAllowance retorna { allowed: true } SIN incrementar contador');
      console.log('📝 ESTO EXPLICA POR QUÉ EL CONTADOR ESTÁ EN 0');
    } else {
      console.log('🆓 USUARIO NO PREMIUM: checkMessageAllowance DEBERÍA incrementar contador');
      console.log(`📊 Estado actual: ${user.subscriptionStatus}`);
      
      if (currentCount > messageLimit) {
        console.log('🚨 CONTADOR SOBRE LÍMITE: Debería mostrar upgrade premium');
      } else {
        console.log('✅ CONTADOR BAJO LÍMITE: Debería permitir mensajes');
      }
    }

    // 4. ANÁLISIS DEL PROBLEMA
    console.log('\n4️⃣ ANÁLISIS DEL PROBLEMA:');
    console.log('=' .repeat(50));

    if (user.subscriptionStatus === 'premium') {
      console.log('🎯 PROBLEMA IDENTIFICADO:');
      console.log('- Usuario tiene subscriptionStatus = "premium"');
      console.log('- FreemiumService.checkMessageAllowance() sale temprano para usuarios premium');
      console.log('- Por eso el contador Redis nunca se incrementa');
      console.log('- Para probar el flujo premium, necesitas cambiar el estado a "free"');
    } else if (user.subscriptionStatus === 'pending_payment') {
      console.log('🎯 ESTADO PENDING_PAYMENT:');
      console.log('- Usuario debería ser tratado como "free" para límites');
      console.log('- Si el contador está en 0, significa que no se está llamando checkMessageAllowance');
      console.log('- O hay otro problema en el flujo de procesamiento');
    } else {
      console.log('🎯 USUARIO FREE:');
      console.log('- Debería incrementar contador en cada mensaje');
      console.log('- Si está en 0, hay un problema en el flujo de procesamiento');
    }

    // 5. RECOMENDACIONES
    console.log('\n5️⃣ RECOMENDACIONES:');
    console.log('=' .repeat(50));

    if (user.subscriptionStatus === 'premium') {
      console.log('🔧 PARA PROBAR FLUJO PREMIUM:');
      console.log('1. Cambiar estado a "free": npx tsx set-user-free.ts');
      console.log('2. Establecer contador Redis alto: npx tsx set-redis-counter.ts 39');
      console.log('3. Enviar mensaje para probar límite');
      console.log('4. Reactivar premium: npx tsx activate-premium-manual.ts');
    } else {
      console.log('🔧 PARA DEBUGGEAR CONTADOR:');
      console.log('1. Establecer contador Redis: npx tsx set-redis-counter.ts 39');
      console.log('2. Enviar mensaje y verificar incremento');
      console.log('3. Monitorear logs de Railway para checkMessageAllowance');
      console.log('4. Verificar que se llame FreemiumService.checkMessageAllowance');
    }

    // 6. CONFIGURACIÓN ÓPTIMA
    console.log('\n6️⃣ CONFIGURACIÓN ÓPTIMA RECOMENDADA:');
    console.log('=' .repeat(50));
    console.log(`📊 Límite actual: ${messageLimit} mensajes/mes`);
    console.log('📊 Límite recomendado: 40 mensajes/mes (configuración actual)');
    console.log('⚠️ Advertencia en: 38 mensajes (2 restantes)');
    console.log('🚨 Límite alcanzado: 40 mensajes');
    console.log('💎 Premium: Sin límites');

    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Decidir si quieres probar como usuario free o premium');
    console.log('2. Usar scripts apropiados para establecer estado');
    console.log('3. Probar flujo de mensajes');
    console.log('4. Monitorear logs de Railway');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await sql.end();
  }
}

// Run the diagnosis
debugCounterSystem().catch(console.error);
