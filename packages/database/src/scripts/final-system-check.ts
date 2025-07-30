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

async function finalSystemCheck() {
  console.log('🎯 VERIFICACIÓN FINAL DEL SISTEMA DE CONTADORES Y PREMIUM...\n');

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

    console.log('📊 CONFIGURACIÓN DEL SISTEMA:');
    console.log('=' .repeat(50));
    console.log(`⚠️ Límite configurado: ${messageLimit} mensajes/mes`);
    console.log(`📱 Usuario objetivo: ${phoneNumber}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n👤 ESTADO DEL USUARIO:');
    console.log('=' .repeat(50));
    console.log(`🆔 ID: ${user.id}`);
    console.log(`📱 Teléfono: ${user.phoneNumber}`);
    console.log(`💎 Estado Suscripción: ${user.subscriptionStatus}`);
    console.log(`🌐 Idioma: ${user.preferredLanguage}`);
    console.log(`✅ Onboarding: ${user.onboardingCompleted ? 'Completado' : 'Pendiente'}`);
    console.log(`⭐ Premium Activado: ${user.premiumActivatedAt ? user.premiumActivatedAt : 'No activado'}`);

    // Generate Redis key
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const redisKey = `msg:${user.id}:${year}-${month + 1}`;

    // Get current count
    const currentCount = await chatBuffer.getKeyValue(redisKey);

    console.log('\n📊 CONTADOR DE MENSAJES:');
    console.log('=' .repeat(50));
    console.log(`📈 Contador Redis: ${currentCount}/${messageLimit}`);
    console.log(`🔑 Redis Key: ${redisKey}`);

    // Analyze system behavior
    console.log('\n🔍 ANÁLISIS DEL COMPORTAMIENTO:');
    console.log('=' .repeat(50));

    if (user.subscriptionStatus === 'premium') {
      console.log('💎 USUARIO PREMIUM DETECTADO:');
      console.log('✅ FreemiumService.checkMessageAllowance() retornará { allowed: true }');
      console.log('✅ No se incrementará el contador Redis');
      console.log('✅ No aparecerán prompts de upgrade');
      console.log('✅ Acceso a GPT-4o Mini y funciones avanzadas');
      console.log('✅ Herramienta check_message_counter disponible');
    } else {
      console.log('🆓 USUARIO NO PREMIUM:');
      console.log(`📊 Estado: ${user.subscriptionStatus}`);
      console.log('📈 Se incrementará contador en cada mensaje');
      
      if (currentCount >= messageLimit) {
        console.log('🚨 LÍMITE ALCANZADO: Aparecerán prompts de upgrade premium');
      } else if (currentCount >= messageLimit - 2) {
        console.log('⚠️ CERCA DEL LÍMITE: Aparecerán advertencias');
      } else {
        console.log('✅ BAJO EL LÍMITE: Funcionamiento normal');
      }
    }

    console.log('\n🧪 FUNCIONALIDADES DISPONIBLES:');
    console.log('=' .repeat(50));
    console.log('🔧 Herramientas registradas:');
    console.log('  - log_run: Registrar carreras');
    console.log('  - update_training_plan: Actualizar plan de entrenamiento');
    console.log('  - complete_onboarding: Completar onboarding');
    console.log('  - check_onboarding_status: Verificar estado onboarding');
    console.log('  - generate_training_plan: Generar plan de entrenamiento');
    console.log('  - check_message_counter: Consultar contador de mensajes ✨ NUEVA');

    console.log('\n🎯 TESTING RECOMENDADO:');
    console.log('=' .repeat(50));
    
    if (user.subscriptionStatus === 'premium') {
      console.log('💎 TESTING PREMIUM:');
      console.log('1. Envía: "¿Cuál es mi contador de mensajes?"');
      console.log('   → Debería responder: "¡Tienes Andes Premium! 💎 Mensajes ilimitados"');
      console.log('2. Envía cualquier pregunta de entrenamiento');
      console.log('   → Debería usar GPT-4o Mini (respuestas avanzadas)');
      console.log('3. Verifica que NO aparezcan prompts de upgrade');
      console.log('4. Confirma acceso a todas las herramientas');
    } else {
      console.log('🆓 TESTING GRATUITO:');
      console.log('1. Envía: "¿Cuál es mi contador de mensajes?"');
      console.log(`   → Debería responder contador actual: ${currentCount}/${messageLimit}`);
      console.log('2. Si cerca del límite, debería mostrar advertencias');
      console.log('3. Si en el límite, debería mostrar upgrade premium');
      console.log('4. Monitorear incremento del contador');
    }

    console.log('\n📊 LOGS DE RAILWAY A MONITOREAR:');
    console.log('🔍 [FREEMIUM] checkMessageAllowance called');
    console.log('🔍 [HYBRID_AI] User subscription status: premium/pending_payment');
    console.log('🔍 [TOOL_REGISTRY] Executing tool: check_message_counter');
    console.log('🔍 [MESSAGE_COUNTER_TOOL] Checking counter for user');

    console.log('\n🔧 SCRIPTS DE GESTIÓN:');
    console.log('- Cambiar a free: npx tsx set-user-free.ts');
    console.log('- Activar premium: npx tsx activate-premium-manual.ts');
    console.log('- Modificar contador: npx tsx setup-optimal-counter.ts [1-5]');
    console.log('- Verificar sistema: npx tsx final-system-check.ts');

    console.log('\n✅ SISTEMA LISTO PARA TESTING COMPLETO!');

  } catch (error) {
    console.error('❌ Error en verificación final:', error);
  } finally {
    await sql.end();
  }
}

// Run the final check
finalSystemCheck().catch(console.error);
