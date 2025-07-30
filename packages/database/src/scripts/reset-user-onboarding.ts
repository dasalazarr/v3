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

async function resetUserOnboarding() {
  console.log('🔄 RESETEANDO ONBOARDING DEL USUARIO...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  const chatBuffer = ChatBuffer.getInstance({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });

  try {
    const phoneNumber = '593984074389';
    
    console.log(`📱 Reseteando usuario: ${phoneNumber}`);

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado en la base de datos');
      console.log('ℹ️ Esto es normal si el usuario fue creado en Railway pero no localmente');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.id}`);
    console.log(`📊 Estado actual: ${user.subscriptionStatus}`);
    console.log(`🎯 Onboarding completado: ${user.onboardingCompleted}`);

    // Reset onboarding status
    const [updatedUser] = await db
      .update(users)
      .set({
        onboardingCompleted: false,
        onboardingGoal: null,
        experienceLevel: null,
        weeklyMileage: null,
        injuryHistory: null,
        age: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('\n✅ ONBOARDING RESETEADO EXITOSAMENTE!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Teléfono: ${updatedUser.phoneNumber}`);
    console.log(`🎯 Onboarding Completado: ${updatedUser.onboardingCompleted}`);
    console.log(`💎 Estado Suscripción: ${updatedUser.subscriptionStatus}`);
    console.log(`🔄 Actualizado: ${updatedUser.updatedAt}`);

    // Clear Redis chat history for fresh start
    const redis = (chatBuffer as any).redis;
    const chatKey = `chat:${user.id}`;
    const messageKeys = await redis.keys(`msg:${user.id}:*`);
    
    const keysToDelete = [chatKey, ...messageKeys];
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`🧹 Limpiado ${keysToDelete.length} claves de Redis`);
    }

    console.log('\n🎯 COMPORTAMIENTO ESPERADO:');
    console.log('=' .repeat(50));
    console.log('✅ Intent Classifier detectará: onboarding_required');
    console.log('✅ Usará GPT-4o Mini (tool calling confiable)');
    console.log('✅ Activará prompt especializado de onboarding');
    console.log('✅ Herramientas disponibles: complete_onboarding, generate_training_plan');
    console.log('✅ Sin errores de validación de herramientas');

    console.log('\n🧪 PASOS DE VALIDACIÓN:');
    console.log('1. Envía "Hola" al bot (+593987644414)');
    console.log('2. Debería iniciar onboarding desde cero');
    console.log('3. Responde las preguntas de onboarding');
    console.log('4. Al final debería ejecutar complete_onboarding');
    console.log('5. Luego debería ejecutar generate_training_plan');
    console.log('6. NO deberían aparecer tool calls crudos');

    console.log('\n📊 LOGS DE RAILWAY A OBSERVAR:');
    console.log('🔍 [INTENT_CLASSIFIER] Intent: onboarding_required');
    console.log('🔍 [HYBRID_AI] Using GPT-4o Mini for onboarding');
    console.log('🔍 [TOOL_REGISTRY] Executing tool: complete_onboarding');
    console.log('🔍 [TOOL_REGISTRY] Executing tool: generate_training_plan');
    console.log('🔍 ✅ [TRAINING_PLAN_GENERATOR] Created training plan...');

    console.log('\n❌ ERRORES QUE NO DEBERÍAN APARECER:');
    console.log('🔍 <｜tool▁calls▁begin｜> (tool calls crudos)');
    console.log('🔍 I need more information to log your run');
    console.log('🔍 Validation failed for tool generate_training_plan');

  } catch (error) {
    console.error('❌ Error reseteando onboarding:', error);
  } finally {
    await sql.end();
  }
}

// Run the reset
resetUserOnboarding().catch(console.error);
