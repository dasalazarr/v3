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

async function checkRedisCounter() {
  console.log('🔍 VERIFICANDO CONTADOR REAL EN REDIS...\n');

  // Initialize Redis connection
  const chatBuffer = ChatBuffer.getInstance({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });

  // Initialize database connection
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';
    
    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado en la base de datos');
      return;
    }

    console.log('📋 INFORMACIÓN DEL USUARIO:');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📱 Teléfono: ${user.phoneNumber}`);
    console.log(`💎 Estado: ${user.subscriptionStatus}`);
    console.log(`📊 DB Counter (NO usado): ${user.weeklyMessageCount}`);

    // Generate Redis key (same logic as FreemiumService)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const redisKey = `msg:${user.id}:${year}-${month + 1}`;

    console.log('\n🔑 REDIS KEY INFORMATION:');
    console.log('=' .repeat(50));
    console.log(`📅 Año: ${year}`);
    console.log(`📅 Mes: ${month + 1}`);
    console.log(`🔑 Redis Key: ${redisKey}`);

    // Get current count from Redis
    const currentCount = await chatBuffer.getKeyValue(redisKey);
    const messageLimit = parseInt(process.env.MESSAGE_LIMIT || '40');

    console.log('\n📊 CONTADOR REAL (REDIS):');
    console.log('=' .repeat(50));
    console.log(`📈 Contador Actual: ${currentCount || 0}`);
    console.log(`⚠️ Límite Configurado: ${messageLimit}`);
    console.log(`📊 Progreso: ${currentCount || 0}/${messageLimit}`);

    // Analysis
    console.log('\n🔍 ANÁLISIS:');
    console.log('=' .repeat(50));
    
    if (!currentCount || currentCount === 0) {
      console.log('✅ CONTADOR EN 0: Usuario puede enviar mensajes normalmente');
      console.log('📝 Esto explica por qué el bot sigue respondiendo');
    } else if (currentCount < messageLimit) {
      console.log(`✅ BAJO EL LÍMITE: ${messageLimit - currentCount} mensajes restantes`);
      console.log('📝 Usuario puede seguir enviando mensajes');
    } else if (currentCount >= messageLimit) {
      console.log('🚨 LÍMITE ALCANZADO: Debería mostrar upgrade premium');
      console.log('📝 Si el bot sigue respondiendo, hay un problema en la lógica');
    }

    console.log('\n🎯 RECOMENDACIONES:');
    console.log('=' .repeat(50));
    
    if (!currentCount || currentCount < messageLimit - 2) {
      console.log('1. Incrementar contador Redis para probar límite');
      console.log('2. Usar script set-redis-counter.ts para establecer valor específico');
      console.log(`3. Establecer en ${messageLimit - 1} para probar advertencia`);
      console.log(`4. Establecer en ${messageLimit} para probar límite alcanzado`);
    } else {
      console.log('1. El contador está cerca/en el límite');
      console.log('2. Verificar por qué el bot no muestra upgrade premium');
      console.log('3. Revisar logs de Railway para checkMessageAllowance');
    }

    console.log('\n🔧 SCRIPTS DISPONIBLES:');
    console.log('- Establecer contador Redis: npx tsx set-redis-counter.ts [número]');
    console.log('- Verificar estado: npx tsx check-redis-counter.ts');
    console.log('- Activar premium: npx tsx activate-premium-manual.ts');

  } catch (error) {
    console.error('❌ Error verificando contador Redis:', error);
  } finally {
    await sql.end();
    // Note: ChatBuffer connection is singleton, don't close it
  }
}

// Run the check
checkRedisCounter().catch(console.error);
