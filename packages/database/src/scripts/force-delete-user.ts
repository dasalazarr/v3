#!/usr/bin/env tsx

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config();

async function forceDeleteUser() {
  console.log('🗑️ FORZANDO ELIMINACIÓN DIRECTA DEL USUARIO...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🌐 Database URL: ${databaseUrl.substring(0, 50)}...`);
  
  // Create fresh connection
  const sql = postgres(databaseUrl);

  try {
    const targetPhone = '593984074389';
    console.log(`📱 Usuario objetivo: ${targetPhone}`);

    // 1. Verificar usuario antes de eliminar
    console.log('\n🔍 VERIFICANDO USUARIO ANTES DE ELIMINAR...');
    const beforeDelete = await sql`
      SELECT * FROM users WHERE phone_number = ${targetPhone}
    `;

    if (beforeDelete.length === 0) {
      console.log('✅ Usuario ya no existe en la base de datos');
      return;
    }

    console.log(`📊 Usuario encontrado:`);
    beforeDelete.forEach(user => {
      console.log(`   ID: ${user.id}`);
      console.log(`   Phone: ${user.phone_number}`);
      console.log(`   Status: ${user.subscription_status}`);
      console.log(`   Created: ${user.created_at}`);
    });

    // 2. Eliminar usuario con confirmación
    console.log('\n🗑️ ELIMINANDO USUARIO...');
    const deleteResult = await sql`
      DELETE FROM users 
      WHERE phone_number = ${targetPhone}
      RETURNING *
    `;

    if (deleteResult.length > 0) {
      console.log(`✅ Usuario eliminado exitosamente:`);
      deleteResult.forEach(user => {
        console.log(`   ID eliminado: ${user.id}`);
        console.log(`   Phone eliminado: ${user.phone_number}`);
      });
    } else {
      console.log('❌ No se pudo eliminar el usuario');
    }

    // 3. Verificar eliminación
    console.log('\n🔍 VERIFICANDO ELIMINACIÓN...');
    const afterDelete = await sql`
      SELECT * FROM users WHERE phone_number = ${targetPhone}
    `;

    if (afterDelete.length === 0) {
      console.log('✅ CONFIRMADO: Usuario eliminado correctamente');
    } else {
      console.log('❌ ERROR: Usuario aún existe después de eliminación');
      afterDelete.forEach(user => {
        console.log(`   Aún existe: ${user.id} | ${user.phone_number}`);
      });
    }

    // 4. Verificar total de usuarios
    console.log('\n📊 VERIFICANDO TOTAL DE USUARIOS...');
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users`;
    const count = parseInt(totalUsers[0].count);
    
    console.log(`📊 Total de usuarios en base de datos: ${count}`);

    if (count === 0) {
      console.log('🎉 BASE DE DATOS COMPLETAMENTE LIMPIA!');
    } else {
      console.log('📋 Usuarios restantes:');
      const remainingUsers = await sql`
        SELECT phone_number, subscription_status, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      remainingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number} | ${user.subscription_status} | ${user.created_at}`);
      });
    }

    // 5. Forzar commit de transacción
    console.log('\n💾 FORZANDO COMMIT DE TRANSACCIÓN...');
    await sql`COMMIT`;
    console.log('✅ Transacción confirmada');

  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    
    // Intentar rollback
    try {
      await sql`ROLLBACK`;
      console.log('🔄 Rollback ejecutado');
    } catch (rollbackError) {
      console.error('❌ Error en rollback:', rollbackError);
    }
  } finally {
    await sql.end();
    console.log('🔌 Conexión cerrada');
  }

  console.log('\n🔄 EJECUTA VERIFICACIÓN DESPUÉS DE ESTO:');
  console.log('npx tsx packages/database/src/scripts/verify-clean-system.ts');
}

// Ejecutar eliminación forzada
forceDeleteUser().catch(console.error);
