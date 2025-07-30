#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function modifyMessageCounter() {
  console.log('🔢 MODIFICAR CONTADOR DE MENSAJES PARA VALIDAR FLUJO PREMIUM...\n');
  console.log('🎯 Conectando a base de datos de producción...\n');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🔗 Database URL: ${databaseUrl.substring(0, 30)}...`);

  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Target user by phone number
    const phoneNumber = '593984074389';

    console.log(`🎯 Modificando contador para teléfono: ${phoneNumber}`);

    // Find user by phone number
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado en la base de datos');
      return;
    }

    console.log('📋 ESTADO ACTUAL DEL USUARIO:');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📱 Teléfono: ${user.phoneNumber}`);
    console.log(`👤 Nombre: ${(user as any).name || 'No establecido'}`);
    console.log(`📊 Estado Suscripción: ${user.subscriptionStatus}`);
    console.log(`📈 Contador Mensajes: ${user.weeklyMessageCount}`);
    console.log(`🌐 Idioma: ${user.preferredLanguage}`);
    console.log(`✅ Onboarding Completado: ${user.onboardingCompleted}`);
    console.log(`⭐ Premium Activated: ${user.premiumActivatedAt || 'Not activated'}`);
    console.log('');

    // Opciones de modificación del contador
    console.log('🎯 OPCIONES DE MODIFICACIÓN DEL CONTADOR:');
    console.log('=' .repeat(50));
    console.log('1. Establecer en 0 (resetear contador semanal)');
    console.log('2. Establecer en 5 (cerca del límite premium)');
    console.log('3. Establecer en 10 (en el límite - debería activar prompt de upgrade)');
    console.log('4. Establecer en 15 (sobre el límite - definitivamente debería activar upgrade)');
    console.log('5. Valor personalizado');
    console.log('');

    // Para este script, establecemos un valor que active el flujo premium
    const newMessageCount = 12; // Sobre el límite para activar upgrade premium

    console.log(`🔄 Estableciendo contador de mensajes en: ${newMessageCount}`);
    console.log('⚠️  Esto debería activar los prompts de upgrade premium en el bot');
    console.log('');

    // Update message counter
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        weeklyMessageCount: newMessageCount,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Error al actualizar el contador de mensajes del usuario');
    }

    console.log('✅ CONTADOR DE MENSAJES ACTUALIZADO EXITOSAMENTE!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Teléfono: ${updatedUser.phoneNumber}`);
    console.log(`📊 Estado Suscripción: ${updatedUser.subscriptionStatus}`);
    console.log(`📈 NUEVO Contador Mensajes: ${updatedUser.weeklyMessageCount}`);
    console.log(`🔄 Actualizado: ${updatedUser.updatedAt}`);
    console.log('');

    console.log('🎯 COMPORTAMIENTO ESPERADO:');
    console.log('=' .repeat(50));
    
    if (updatedUser.subscriptionStatus === 'premium') {
      console.log('✅ Usuario es PREMIUM - No deberían aparecer prompts de upgrade');
      console.log('🤖 El bot debería continuar usando funciones premium');
      console.log('📈 Contador de mensajes solo para análisis');
    } else {
      console.log('🆓 Usuario es GRATUITO - Debería activarse el flujo de upgrade premium');
      console.log('💎 El bot debería mostrar prompts de upgrade premium');
      console.log('🔗 Se deberían proporcionar links de compra de Gumroad');
      console.log('⏰ Debería activarse la limitación de mensajes');
    }

    console.log('');
    console.log('🧪 PASOS DE VALIDACIÓN:');
    console.log('1. Envía un mensaje al bot de WhatsApp (+593987644414)');
    console.log('2. Verifica si aparece el prompt de upgrade premium');
    console.log('3. Confirma que se proporcione el link de Gumroad si el usuario es gratuito');
    console.log('4. Monitorea los logs de Railway para detección de intent premium');
    console.log('');

    console.log('📊 LOGS DE RAILWAY A OBSERVAR:');
    console.log('🔍 [INTENT] Premium intent detected: true/false');
    console.log('🔍 [HYBRID_AI] User subscription status: free/premium');
    console.log('🔍 [MESSAGE_LIMIT] Weekly count: [número]');
    console.log('🔍 [PREMIUM_FLOW] Upgrade prompt triggered');

  } catch (error) {
    console.error('❌ Error modificando contador de mensajes:', error);
  } finally {
    await sql.end();
  }
}

// Función adicional para establecer contador personalizado
async function setCustomMessageCount(targetCount: number) {
  console.log(`🔧 ESTABLECIENDO CONTADOR PERSONALIZADO: ${targetCount}...\n`);

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';

    // Find user by phone number
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        weeklyMessageCount: targetCount,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log(`✅ Contador establecido en: ${updatedUser.weeklyMessageCount}`);

  } catch (error) {
    console.error('❌ Error estableciendo contador personalizado:', error);
  } finally {
    await sql.end();
  }
}

// Run the modification
modifyMessageCounter().catch(console.error);

// Export for potential custom usage
export { setCustomMessageCount };
