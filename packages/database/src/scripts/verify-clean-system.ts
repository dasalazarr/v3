#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { ChatBuffer } from '@running-coach/vector-memory';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function verifyCleanSystem() {
  console.log('🔍 VERIFICANDO SISTEMA LIMPIO PARA PRUEBA DESDE CERO...\n');

  const results = {
    database: { clean: false, userCount: 0 },
    redis: { clean: false, keyCount: 0 },
    system: { ready: false }
  };

  // 1. VERIFICAR BASE DE DATOS
  console.log('🗄️ VERIFICANDO BASE DE DATOS (Neon)...');
  try {
    const databaseUrl = process.env.DATABASE_URL!;
    const sql = postgres(databaseUrl);
    const db = drizzle(sql, { schema });

    // Contar usuarios totales
    const totalUsersResult = await sql`SELECT COUNT(*) as count FROM users`;
    const totalUsers = parseInt(totalUsersResult[0].count);
    results.database.userCount = totalUsers;

    // Buscar específicamente el usuario objetivo
    const targetUser = await sql`
      SELECT * FROM users 
      WHERE phone_number = '593984074389' 
      OR phone_number LIKE '%984074389%'
    `;

    console.log(`📊 Total de usuarios en base de datos: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('✅ Base de datos completamente limpia');
      results.database.clean = true;
    } else {
      console.log('❌ Base de datos contiene usuarios:');
      const allUsers = await sql`SELECT phone_number, subscription_status, created_at FROM users ORDER BY created_at DESC LIMIT 10`;
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number} | ${user.subscription_status} | ${user.created_at}`);
      });
    }

    if (targetUser.length === 0) {
      console.log('✅ Usuario objetivo 593984074389 NO encontrado en base de datos');
    } else {
      console.log(`❌ Usuario objetivo 593984074389 AÚN EXISTE en base de datos:`);
      targetUser.forEach(user => {
        console.log(`   - ${user.phone_number} | ${user.subscription_status} | ${user.created_at}`);
      });
    }

    await sql.end();

  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
  }

  // 2. VERIFICAR REDIS
  console.log('\n💾 VERIFICANDO REDIS CACHE...');
  try {
    const chatBuffer = ChatBuffer.getInstance({
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    const redis = (chatBuffer as any).redis;
    
    // Contar todas las claves
    const allKeys = await redis.keys('*');
    results.redis.keyCount = allKeys.length;

    // Buscar claves relacionadas con el usuario
    const userKeys = allKeys.filter((key: string) => 
      key.includes('593984074389') || 
      key.includes('984074389') ||
      key.startsWith('msg:') ||
      key.startsWith('chat:') ||
      key.startsWith('state:')
    );

    console.log(`📊 Total de claves en Redis: ${allKeys.length}`);
    console.log(`🔍 Claves relacionadas con usuario: ${userKeys.length}`);

    if (userKeys.length === 0) {
      console.log('✅ Redis completamente limpio de datos de usuario');
      results.redis.clean = true;
    } else {
      console.log('❌ Redis contiene claves relacionadas con usuario:');
      userKeys.forEach(key => console.log(`   - ${key}`));
    }

    // Mostrar todas las claves si hay pocas
    if (allKeys.length <= 10) {
      console.log('📋 Todas las claves en Redis:');
      allKeys.forEach(key => console.log(`   - ${key}`));
    }

  } catch (error) {
    console.error('❌ Error verificando Redis:', error);
  }

  // 3. VERIFICAR CONFIGURACIÓN DEL SISTEMA
  console.log('\n⚙️ VERIFICANDO CONFIGURACIÓN DEL SISTEMA...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_TOKEN',
    'NUMBER_ID',
    'VERIFY_TOKEN',
    'GUMROAD_PRODUCT_ID_EN',
    'GUMROAD_PRODUCT_ID_ES'
  ];

  let configComplete = true;
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: Configurado`);
    } else {
      console.log(`❌ ${envVar}: NO configurado`);
      configComplete = false;
    }
  });

  // 4. RESUMEN FINAL
  console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
  console.log('=' .repeat(50));
  
  const databaseStatus = results.database.clean ? '✅ LIMPIA' : '❌ CONTIENE DATOS';
  const redisStatus = results.redis.clean ? '✅ LIMPIO' : '❌ CONTIENE DATOS';
  const configStatus = configComplete ? '✅ COMPLETA' : '❌ INCOMPLETA';

  console.log(`🗄️ Base de datos: ${databaseStatus} (${results.database.userCount} usuarios)`);
  console.log(`💾 Redis cache: ${redisStatus} (${results.redis.keyCount} claves)`);
  console.log(`⚙️ Configuración: ${configStatus}`);

  // Determinar si el sistema está listo
  results.system.ready = results.database.clean && results.redis.clean && configComplete;

  if (results.system.ready) {
    console.log('\n🎉 SISTEMA COMPLETAMENTE LIMPIO Y LISTO!');
    console.log('✅ Todas las verificaciones pasaron');
    console.log('✅ El sistema está preparado para prueba desde cero');
    
    console.log('\n🧪 PRUEBA RECOMENDADA:');
    console.log('   1. Ir a la landing page');
    console.log('   2. Hacer clic en "Premium"');
    console.log('   3. Enviar mensaje a WhatsApp');
    console.log('   4. Verificar creación de usuario: npx tsx check-premium-status.ts');
    console.log('   5. Probar flujo premium completo');
    
  } else {
    console.log('\n⚠️ SISTEMA NO ESTÁ COMPLETAMENTE LIMPIO');
    console.log('🔧 Acciones requeridas:');
    
    if (!results.database.clean) {
      console.log('   - Terminar de limpiar base de datos Neon');
    }
    if (!results.redis.clean) {
      console.log('   - Ejecutar limpieza adicional de Redis');
    }
    if (!configComplete) {
      console.log('   - Completar configuración de variables de entorno');
    }
  }

  console.log('\n📱 USUARIO OBJETIVO: 593984074389');
  console.log('🎯 FLUJO A PROBAR: Landing Page → WhatsApp → Premium Intent → Gumroad → Webhook → Premium Activation');

  return results;
}

// Ejecutar verificación
verifyCleanSystem().catch(console.error);
