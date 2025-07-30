#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function setCounterTo29() {
  console.log('🔢 ESTABLECIENDO CONTADOR EN 29 MENSAJES (LÍMITE: 30)...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';
    const targetCount = 29;
    
    console.log(`📱 Usuario: ${phoneNumber}`);
    console.log(`🎯 Estableciendo contador en: ${targetCount}`);
    console.log(`⚠️ Límite premium: 30 mensajes`);
    console.log(`📊 Estado: CERCA DEL LÍMITE - debería mostrar advertencia`);

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

    console.log('\n🎉 CONTADOR ACTUALIZADO EXITOSAMENTE!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Teléfono: ${updatedUser.phoneNumber}`);
    console.log(`📈 NUEVO Contador: ${updatedUser.weeklyMessageCount}/30`);
    console.log(`💎 Estado Suscripción: ${updatedUser.subscriptionStatus}`);
    console.log(`🔄 Actualizado: ${updatedUser.updatedAt}`);

    console.log('\n🎯 COMPORTAMIENTO ESPERADO:');
    console.log('=' .repeat(50));
    console.log('⚠️ CERCA DEL LÍMITE (29/30):');
    console.log('- El bot debería mostrar: "Te queda 1 mensaje gratuito"');
    console.log('- Debería incluir información sobre premium');
    console.log('- Debería sugerir upgrade antes de alcanzar el límite');
    console.log('- Link de Gumroad debería estar presente');

    console.log('\n🧪 PASOS DE VALIDACIÓN:');
    console.log('1. Envía UN mensaje al bot (+593987644414)');
    console.log('2. Verifica mensaje: "Te queda 1 mensaje gratuito"');
    console.log('3. Confirma que incluya link de Gumroad');
    console.log('4. Envía OTRO mensaje para alcanzar el límite (30/30)');
    console.log('5. Verifica que active el flujo de upgrade premium completo');

    console.log('\n📊 LOGS DE RAILWAY A OBSERVAR:');
    console.log('🔍 [MESSAGE_LIMIT] Weekly count: 29');
    console.log('🔍 [PREMIUM_WARNING] Near limit warning triggered');
    console.log('🔍 [INTENT] Premium intent detected: true');
    console.log('🔍 [PREMIUM_FLOW] Upgrade prompt triggered');

    console.log('\n🔧 SCRIPTS RELACIONADOS:');
    console.log('- Verificar estado: npx tsx check-premium-status.ts');
    console.log('- Activar premium: npx tsx activate-premium-manual.ts');
    console.log('- Resetear contador: Modificar este script con targetCount = 0');

  } catch (error) {
    console.error('❌ Error estableciendo contador:', error);
  } finally {
    await sql.end();
  }
}

// Run the update
setCounterTo29().catch(console.error);
