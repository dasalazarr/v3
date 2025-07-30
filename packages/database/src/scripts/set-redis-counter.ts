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

async function setRedisCounter() {
  console.log('🔧 ESTABLECIENDO CONTADOR REDIS PARA VALIDAR FLUJO PREMIUM...\n');

  // Get target count from command line argument or default to 39
  const args = process.argv.slice(2);
  const targetCount = args.length > 0 ? parseInt(args[0]) : 39;
  const messageLimit = parseInt(process.env.MESSAGE_LIMIT || '40');

  console.log(`🎯 Estableciendo contador en: ${targetCount}`);
  console.log(`⚠️ Límite configurado: ${messageLimit}`);

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

    console.log('📋 USUARIO ENCONTRADO:');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📱 Teléfono: ${user.phoneNumber}`);
    console.log(`💎 Estado: ${user.subscriptionStatus}`);

    // Generate Redis key (same logic as FreemiumService)
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const redisKey = `msg:${user.id}:${year}-${month + 1}`;

    console.log('\n🔑 REDIS KEY:');
    console.log('=' .repeat(50));
    console.log(`🔑 Key: ${redisKey}`);

    // Get current count
    const currentCount = await chatBuffer.getKeyValue(redisKey);
    console.log(`📊 Contador actual: ${currentCount || 0}`);

    // Set new count using Redis directly
    // We need to access the Redis instance directly since ChatBuffer doesn't have setKey
    const redis = (chatBuffer as any).redis;
    await redis.set(redisKey, targetCount.toString());

    // Calculate TTL (until end of month)
    const firstDayOfNextMonth = new Date(Date.UTC(year, month + 1, 1));
    const ttl = Math.floor((firstDayOfNextMonth.getTime() - now.getTime()) / 1000);
    await redis.expire(redisKey, ttl);

    // Verify the new count
    const newCount = await chatBuffer.getKeyValue(redisKey);

    console.log('\n✅ CONTADOR REDIS ACTUALIZADO!');
    console.log('=' .repeat(50));
    console.log(`📈 Contador anterior: ${currentCount || 0}`);
    console.log(`📈 Contador nuevo: ${newCount}`);
    console.log(`📊 Progreso: ${newCount}/${messageLimit}`);
    console.log(`⏰ TTL: ${ttl} segundos (hasta fin de mes)`);

    console.log('\n🎯 COMPORTAMIENTO ESPERADO:');
    console.log('=' .repeat(50));
    
    if (targetCount < messageLimit - 2) {
      console.log('✅ BAJO EL LÍMITE:');
      console.log('- Bot debería funcionar normalmente');
      console.log('- Sin prompts de premium');
      console.log(`- ${messageLimit - targetCount} mensajes restantes`);
    } else if (targetCount === messageLimit - 1) {
      console.log('⚠️ CERCA DEL LÍMITE:');
      console.log('- Bot debería mostrar: "Te queda 1 mensaje gratuito"');
      console.log('- Debería incluir link de Gumroad');
      console.log('- Advertencia prominente');
    } else if (targetCount >= messageLimit) {
      console.log('🚨 LÍMITE ALCANZADO:');
      console.log('- Bot DEBE mostrar: "Has alcanzado el límite de mensajes gratuitos"');
      console.log('- DEBE incluir link de Gumroad prominente');
      console.log('- DEBE restringir funcionalidad');
    }

    console.log('\n🧪 PASOS DE VALIDACIÓN:');
    console.log('1. Envía un mensaje al bot (+593987644414)');
    console.log('2. Verifica el comportamiento esperado arriba');
    console.log('3. Monitorea logs de Railway para checkMessageAllowance');
    console.log('4. Confirma que el contador se incremente en Redis');

    console.log('\n📊 LOGS DE RAILWAY A OBSERVAR:');
    console.log('🔍 [FREEMIUM] checkMessageAllowance called');
    console.log(`🔍 [FREEMIUM] Current count: ${targetCount + 1} (después del mensaje)`);
    console.log('🔍 [FREEMIUM] Message allowance result: allowed/denied');
    console.log('🔍 [PREMIUM_FLOW] Upgrade prompt triggered (si aplica)');

  } catch (error) {
    console.error('❌ Error estableciendo contador Redis:', error);
  } finally {
    await sql.end();
  }
}

// Run the update
setRedisCounter().catch(console.error);
