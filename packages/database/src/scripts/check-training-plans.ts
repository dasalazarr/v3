#!/usr/bin/env tsx

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config();

async function checkTrainingPlans() {
  console.log('🏃‍♂️ VERIFICANDO PLANES DE ENTRENAMIENTO...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🌐 Database URL: ${databaseUrl.substring(0, 50)}...`);
  
  // Create fresh connection
  const sql = postgres(databaseUrl);

  try {
    const targetPhone = '593984074389';
    console.log(`📱 Usuario objetivo: ${targetPhone}`);

    // 1. Buscar usuario
    console.log('\n🔍 BUSCANDO USUARIO...');
    const users = await sql`
      SELECT id, phone_number, subscription_status, preferred_language, onboarding_completed, created_at
      FROM users 
      WHERE phone_number = ${targetPhone}
    `;

    if (users.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const user = users[0];
    console.log(`✅ Usuario encontrado:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phone_number}`);
    console.log(`   Status: ${user.subscription_status}`);
    console.log(`   Language: ${user.preferred_language}`);
    console.log(`   Onboarding: ${user.onboarding_completed}`);
    console.log(`   Created: ${user.created_at}`);

    // 2. Buscar planes de entrenamiento
    console.log('\n🏃‍♂️ BUSCANDO PLANES DE ENTRENAMIENTO...');
    const trainingPlans = await sql`
      SELECT id, vdot, weekly_frequency, target_race, target_date, current_week, total_weeks, paces, is_active, created_at
      FROM training_plans 
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    if (trainingPlans.length === 0) {
      console.log('❌ No se encontraron planes de entrenamiento');
    } else {
      console.log(`✅ Encontrados ${trainingPlans.length} plan(es) de entrenamiento:`);
      
      trainingPlans.forEach((plan, index) => {
        console.log(`\n   Plan ${index + 1}:`);
        console.log(`     ID: ${plan.id}`);
        console.log(`     VDOT: ${plan.vdot}`);
        console.log(`     Frecuencia: ${plan.weekly_frequency} días/semana`);
        console.log(`     Objetivo: ${plan.target_race}`);
        console.log(`     Fecha objetivo: ${plan.target_date || 'No especificada'}`);
        console.log(`     Semana actual: ${plan.current_week}/${plan.total_weeks}`);
        console.log(`     Activo: ${plan.is_active}`);
        console.log(`     Creado: ${plan.created_at}`);
        console.log(`     Paces: ${JSON.stringify(plan.paces, null, 2)}`);
      });
    }

    // 3. Buscar workouts específicos
    console.log('\n💪 BUSCANDO WORKOUTS ESPECÍFICOS...');
    const workouts = await sql`
      SELECT w.id, w.plan_id, w.type, w.distance, w.duration, w.target_pace, w.description, w.scheduled_date, w.completed, w.created_at
      FROM workouts w
      JOIN training_plans tp ON w.plan_id = tp.id
      WHERE tp.user_id = ${user.id}
      ORDER BY w.scheduled_date ASC, w.created_at ASC
      LIMIT 10
    `;

    if (workouts.length === 0) {
      console.log('❌ No se encontraron workouts específicos');
    } else {
      console.log(`✅ Encontrados ${workouts.length} workout(s):`);
      
      workouts.forEach((workout, index) => {
        console.log(`\n   Workout ${index + 1}:`);
        console.log(`     ID: ${workout.id}`);
        console.log(`     Plan ID: ${workout.plan_id}`);
        console.log(`     Tipo: ${workout.type}`);
        console.log(`     Distancia: ${workout.distance}`);
        console.log(`     Duración: ${workout.duration}`);
        console.log(`     Pace objetivo: ${workout.target_pace}`);
        console.log(`     Descripción: ${workout.description}`);
        console.log(`     Fecha programada: ${workout.scheduled_date || 'No programada'}`);
        console.log(`     Completado: ${workout.completed}`);
        console.log(`     Creado: ${workout.created_at}`);
      });
    }

    // 4. Verificar mensajes de chat recientes
    console.log('\n💬 VERIFICANDO MENSAJES DE CHAT RECIENTES...');
    const chatMessages = await sql`
      SELECT role, content, timestamp
      FROM chat_messages 
      WHERE user_id = ${user.id}
      ORDER BY timestamp DESC
      LIMIT 5
    `;

    if (chatMessages.length === 0) {
      console.log('❌ No se encontraron mensajes de chat');
    } else {
      console.log(`✅ Últimos ${chatMessages.length} mensajes:`);
      
      chatMessages.forEach((message, index) => {
        console.log(`\n   Mensaje ${index + 1}:`);
        console.log(`     Role: ${message.role}`);
        console.log(`     Content: ${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}`);
        console.log(`     Timestamp: ${message.timestamp}`);
      });
    }

    // 5. Resumen del análisis
    console.log('\n📊 RESUMEN DEL ANÁLISIS:');
    console.log('==================================================');
    console.log(`👤 Usuario: ${user.subscription_status} (${user.preferred_language})`);
    console.log(`🏃‍♂️ Planes de entrenamiento: ${trainingPlans.length}`);
    console.log(`💪 Workouts: ${workouts.length}`);
    console.log(`💬 Mensajes de chat: ${chatMessages.length}`);
    
    if (trainingPlans.length > 0) {
      const activePlans = trainingPlans.filter(p => p.is_active);
      console.log(`✅ Planes activos: ${activePlans.length}`);
      
      if (activePlans.length > 0) {
        const currentPlan = activePlans[0];
        console.log(`🎯 Plan actual: ${currentPlan.target_race} (VDOT: ${currentPlan.vdot})`);
      }
    }

  } catch (error) {
    console.error('❌ Error verificando planes de entrenamiento:', error);
  } finally {
    await sql.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar verificación
checkTrainingPlans().catch(console.error);
