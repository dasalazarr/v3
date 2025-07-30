#!/usr/bin/env tsx

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config();

async function verifyDatabaseConnection() {
  console.log('🔍 VERIFICANDO CONEXIÓN A BASE DE DATOS...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  
  // Mostrar información de conexión (sin credenciales)
  try {
    const url = new URL(databaseUrl);
    console.log('🌐 Información de conexión:');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   Port: ${url.port || '5432'}`);
    console.log(`   SSL: ${url.searchParams.get('sslmode') || 'default'}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error parseando DATABASE_URL:', error);
    return;
  }

  const sql = postgres(databaseUrl);

  try {
    // Test básico de conexión
    console.log('📡 Probando conexión...');
    const result = await sql`SELECT NOW() as current_time, current_database() as db_name`;
    console.log(`✅ Conexión exitosa!`);
    console.log(`   Tiempo: ${result[0].current_time}`);
    console.log(`   Base de datos: ${result[0].db_name}`);

    // Verificar tabla users
    console.log('\n📋 Verificando tabla users...');
    const tableCheck = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `;

    if (parseInt(tableCheck[0].count) === 0) {
      console.log('❌ Tabla "users" NO EXISTE');
      console.log('   Ejecuta: npx tsx packages/database/src/migrate.ts');
      return;
    }

    console.log('✅ Tabla "users" existe');

    // Contar usuarios
    console.log('\n👥 Contando usuarios...');
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const totalUsers = parseInt(userCount[0].count);
    
    console.log(`📊 Total de usuarios: ${totalUsers}`);

    if (totalUsers > 0) {
      // Mostrar algunos usuarios
      console.log('\n📋 Usuarios en la base de datos:');
      const users = await sql`
        SELECT phone_number, subscription_status, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `;

      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number} | ${user.subscription_status} | ${user.created_at}`);
      });

      // Buscar específicamente el usuario objetivo
      console.log('\n🔍 Buscando usuario 593984074389...');
      const targetUser = await sql`
        SELECT * FROM users 
        WHERE phone_number = '593984074389' 
        OR phone_number LIKE '%984074389%'
      `;

      if (targetUser.length > 0) {
        console.log('✅ Usuario 593984074389 ENCONTRADO:');
        targetUser.forEach(user => {
          console.log(`   📱 Phone: ${user.phone_number}`);
          console.log(`   📊 Status: ${user.subscription_status}`);
          console.log(`   ⭐ Premium: ${user.premium_activated_at || 'No'}`);
          console.log(`   📅 Created: ${user.created_at}`);
        });
      } else {
        console.log('❌ Usuario 593984074389 NO encontrado');
        console.log('   Pero hay otros usuarios, así que la conexión funciona');
      }
    } else {
      console.log('📭 Base de datos vacía (0 usuarios)');
    }

    // Verificar si es la misma base de datos que Railway
    console.log('\n🔍 Verificación de sincronización:');
    if (databaseUrl.includes('neon.tech') || databaseUrl.includes('neondb')) {
      console.log('✅ Conectado a Neon (producción)');
    } else {
      console.log('⚠️ NO conectado a Neon - puede ser base de datos local');
    }

  } catch (error) {
    console.error('❌ Error de conexión:', error);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar DATABASE_URL en .env');
    console.log('   2. Verificar credenciales de Neon');
    console.log('   3. Verificar conectividad de red');
  } finally {
    await sql.end();
  }
}

verifyDatabaseConnection().catch(console.error);
