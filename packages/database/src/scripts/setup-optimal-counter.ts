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

async function setupOptimalCounter() {
  console.log('🎯 CONFIGURACIÓN ÓPTIMA DEL SISTEMA DE CONTADORES...\n');

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

    console.log('📊 CONFIGURACIÓN ACTUAL:');
    console.log('=' .repeat(50));
    console.log(`⚠️ Límite configurado: ${messageLimit} mensajes/mes`);
    console.log(`📱 Usuario objetivo: ${phoneNumber}`);

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

    console.log('\n👤 USUARIO ENCONTRADO:');
    console.log('=' .repeat(50));
    console.log(`🆔 ID: ${user.id}`);
    console.log(`💎 Estado: ${user.subscriptionStatus}`);
    console.log(`🌐 Idioma: ${user.preferredLanguage}`);

    // Generate Redis key
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const redisKey = `msg:${user.id}:${year}-${month + 1}`;

    // Get current count
    const currentCount = await chatBuffer.getKeyValue(redisKey);

    console.log('\n📊 ESTADO ACTUAL DEL CONTADOR:');
    console.log('=' .repeat(50));
    console.log(`📈 Contador Redis: ${currentCount}/${messageLimit}`);
    console.log(`🔑 Redis Key: ${redisKey}`);

    // Determine optimal test scenario
    console.log('\n🎯 ESCENARIOS DE TESTING DISPONIBLES:');
    console.log('=' .repeat(50));
    console.log('1. 📊 Normal (5 mensajes) - Funcionamiento normal');
    console.log('2. ⚠️ Advertencia (38 mensajes) - "Te quedan 2 mensajes"');
    console.log('3. 🚨 Crítico (39 mensajes) - "Te queda 1 mensaje"');
    console.log('4. 🛑 Límite (40 mensajes) - Flujo premium completo');
    console.log('5. 🔄 Reset (0 mensajes) - Reiniciar contador');

    // Get user choice or default to critical
    const args = process.argv.slice(2);
    const scenario = args.length > 0 ? parseInt(args[0]) : 3; // Default to critical

    let targetCount: number;
    let description: string;
    let expectedBehavior: string;

    switch (scenario) {
      case 1:
        targetCount = 5;
        description = 'Funcionamiento Normal';
        expectedBehavior = 'Bot funciona normalmente, sin prompts premium';
        break;
      case 2:
        targetCount = 38;
        description = 'Advertencia Temprana';
        expectedBehavior = 'Bot muestra: "Te quedan 2 mensajes gratuitos"';
        break;
      case 3:
        targetCount = 39;
        description = 'Advertencia Crítica';
        expectedBehavior = 'Bot muestra: "Te queda 1 mensaje gratuito"';
        break;
      case 4:
        targetCount = 40;
        description = 'Límite Alcanzado';
        expectedBehavior = 'Bot muestra flujo premium completo con link Gumroad';
        break;
      case 5:
        targetCount = 0;
        description = 'Reset Contador';
        expectedBehavior = 'Contador reiniciado, funcionamiento normal';
        break;
      default:
        targetCount = 39;
        description = 'Advertencia Crítica (Default)';
        expectedBehavior = 'Bot muestra: "Te queda 1 mensaje gratuito"';
    }

    console.log(`\n🎯 CONFIGURANDO ESCENARIO ${scenario}: ${description}`);
    console.log('=' .repeat(50));
    console.log(`📈 Estableciendo contador en: ${targetCount}`);
    console.log(`🎭 Comportamiento esperado: ${expectedBehavior}`);

    // Set the counter
    const redis = (chatBuffer as any).redis;
    await redis.set(redisKey, targetCount.toString());

    // Set TTL until end of month
    const firstDayOfNextMonth = new Date(Date.UTC(year, month + 1, 1));
    const ttl = Math.floor((firstDayOfNextMonth.getTime() - now.getTime()) / 1000);
    await redis.expire(redisKey, ttl);

    // Verify
    const newCount = await chatBuffer.getKeyValue(redisKey);

    console.log('\n✅ CONFIGURACIÓN COMPLETADA:');
    console.log('=' .repeat(50));
    console.log(`📈 Contador anterior: ${currentCount}`);
    console.log(`📈 Contador nuevo: ${newCount}`);
    console.log(`📊 Progreso: ${newCount}/${messageLimit}`);
    console.log(`⏰ TTL: ${Math.round(ttl / 3600)} horas hasta fin de mes`);

    console.log('\n🧪 PASOS DE VALIDACIÓN:');
    console.log('=' .repeat(50));
    console.log('1. Envía un mensaje al bot (+593987644414)');
    console.log(`2. Verifica: ${expectedBehavior}`);
    console.log('3. Monitorea logs de Railway para checkMessageAllowance');
    console.log('4. Confirma incremento del contador');

    console.log('\n📊 LOGS DE RAILWAY A OBSERVAR:');
    console.log('🔍 [FREEMIUM] checkMessageAllowance called');
    console.log(`🔍 [FREEMIUM] Current count: ${newCount + 1} (después del mensaje)`);
    console.log('🔍 [FREEMIUM] Message allowance result');
    if (newCount >= messageLimit - 2) {
      console.log('🔍 [PREMIUM_FLOW] Warning/Upgrade prompt triggered');
    }

    console.log('\n🔧 OTROS ESCENARIOS:');
    console.log('- Normal: npx tsx setup-optimal-counter.ts 1');
    console.log('- Advertencia: npx tsx setup-optimal-counter.ts 2');
    console.log('- Crítico: npx tsx setup-optimal-counter.ts 3');
    console.log('- Límite: npx tsx setup-optimal-counter.ts 4');
    console.log('- Reset: npx tsx setup-optimal-counter.ts 5');

  } catch (error) {
    console.error('❌ Error configurando contador:', error);
  } finally {
    await sql.end();
  }
}

// Run the setup
setupOptimalCounter().catch(console.error);
