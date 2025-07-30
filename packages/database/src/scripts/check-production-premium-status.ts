#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function checkProductionPremiumStatus() {
  console.log('🔍 VERIFICANDO ESTADO PREMIUM EN PRODUCCIÓN...\n');

  // Use production database URL
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';
    
    console.log('📊 CONSULTANDO BASE DE DATOS DE PRODUCCIÓN:');
    console.log('=' .repeat(50));
    console.log(`📱 Teléfono objetivo: ${phoneNumber}`);
    console.log(`🌐 Base de datos: ${databaseUrl.includes('neon') ? 'Neon (Producción)' : 'Local'}`);

    // Find user in production database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('\n❌ USUARIO NO ENCONTRADO EN PRODUCCIÓN');
      console.log('   - El usuario no existe en la base de datos');
      console.log('   - Puede que no se haya registrado correctamente');
      console.log('   - O hay un problema con el número de teléfono');
      return;
    }

    console.log('\n✅ USUARIO ENCONTRADO EN PRODUCCIÓN:');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📱 Teléfono: ${user.phoneNumber}`);
    console.log(`👤 Nombre: ${user.name || 'No establecido'}`);
    console.log(`🎂 Edad: ${user.age || 'No establecida'}`);

    console.log('\n💎 ESTADO DE SUSCRIPCIÓN:');
    console.log('=' .repeat(50));
    console.log(`📊 Estado Actual: ${user.subscriptionStatus}`);
    console.log(`⭐ Premium Activado: ${user.premiumActivatedAt ? user.premiumActivatedAt.toISOString() : 'No activado'}`);
    console.log(`💳 Gumroad Customer ID: ${user.gumroadCustomerId || 'No establecido'}`);
    console.log(`🔗 Gumroad Order ID: ${user.gumroadOrderId || 'No establecido'}`);

    // Analyze subscription status
    console.log('\n🔍 ANÁLISIS DEL ESTADO:');
    console.log('=' .repeat(50));
    
    switch (user.subscriptionStatus) {
      case 'premium':
        console.log('🎉 ¡PREMIUM ACTIVO!');
        console.log('✅ Tu compra ha sido procesada y validada');
        console.log('✅ Tienes acceso a todas las funciones premium');
        console.log('✅ Mensajes ilimitados');
        console.log('✅ GPT-4o Mini para respuestas avanzadas');
        if (user.premiumActivatedAt) {
          const activatedDate = new Date(user.premiumActivatedAt);
          const now = new Date();
          const daysSince = Math.floor((now.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`✅ Activado hace ${daysSince} días`);
        }
        break;
        
      case 'pending_payment':
        console.log('⏳ PAGO PENDIENTE');
        console.log('⚠️ Tu compra aún no ha sido procesada completamente');
        console.log('⚠️ El webhook de Gumroad puede estar pendiente');
        console.log('⚠️ Funciones limitadas hasta confirmación de pago');
        break;
        
      case 'free':
        console.log('🆓 USUARIO GRATUITO');
        console.log('❌ No se ha detectado ninguna compra premium');
        console.log('❌ Límite de 40 mensajes por mes');
        console.log('💡 Si compraste premium, el webhook puede estar pendiente');
        break;
        
      default:
        console.log(`❓ ESTADO DESCONOCIDO: ${user.subscriptionStatus}`);
    }

    console.log('\n📈 CONTADOR DE MENSAJES:');
    console.log('=' .repeat(50));
    const messageCount = user.weeklyMessageCount || 0;
    console.log(`📊 Mensajes usados este mes: ${messageCount}`);
    
    if (user.subscriptionStatus === 'premium') {
      console.log('💎 Límite: ILIMITADO (Premium)');
    } else {
      console.log(`⚠️ Límite: 40 mensajes/mes`);
      console.log(`📊 Restantes: ${Math.max(0, 40 - messageCount)}`);
    }

    console.log('\n🎯 INFORMACIÓN DE ONBOARDING:');
    console.log('=' .repeat(50));
    console.log(`✅ Onboarding Completado: ${user.onboardingCompleted ? 'Sí' : 'No'}`);
    console.log(`🎯 Meta: ${user.onboardingGoal || 'No establecida'}`);
    console.log(`🏃 Nivel: ${user.experienceLevel || 'No establecido'}`);
    console.log(`📊 Kilometraje semanal: ${user.weeklyMileage || 'No establecido'}`);
    console.log(`🌐 Idioma preferido: ${user.preferredLanguage || 'No establecido'}`);

    console.log('\n📅 FECHAS IMPORTANTES:');
    console.log('=' .repeat(50));
    console.log(`📅 Creado: ${user.createdAt.toISOString()}`);
    console.log(`🔄 Última actualización: ${user.updatedAt.toISOString()}`);

    // Recommendations based on status
    console.log('\n💡 RECOMENDACIONES:');
    console.log('=' .repeat(50));
    
    if (user.subscriptionStatus === 'premium') {
      console.log('🎉 ¡Todo está perfecto!');
      console.log('✅ Puedes usar todas las funciones premium');
      console.log('📱 Envía mensajes sin límite al bot');
      console.log('🤖 Recibirás respuestas avanzadas con GPT-4o Mini');
    } else if (user.subscriptionStatus === 'pending_payment') {
      console.log('⏳ Tu pago está siendo procesado');
      console.log('🔄 El webhook de Gumroad puede tardar unos minutos');
      console.log('📧 Verifica tu email de confirmación de Gumroad');
      console.log('⏰ Si han pasado más de 30 minutos, contacta soporte');
    } else {
      console.log('❌ No se detectó compra premium');
      console.log('💳 Verifica que el pago se haya completado en Gumroad');
      console.log('📧 Revisa tu email de confirmación');
      console.log('🔄 El webhook puede estar retrasado');
    }

    console.log('\n🧪 TESTING RECOMENDADO:');
    console.log('1. Envía "¿Cuál es mi contador de mensajes?" al bot');
    console.log('2. Verifica la respuesta sobre tu estado premium');
    console.log('3. Prueba funciones avanzadas si eres premium');
    console.log('4. Monitorea logs de Railway para confirmación');

  } catch (error) {
    console.error('❌ Error consultando estado premium:', error);
    console.log('\n🔧 POSIBLES SOLUCIONES:');
    console.log('1. Verifica que DATABASE_URL esté configurado correctamente');
    console.log('2. Confirma conexión a la base de datos de producción');
    console.log('3. Revisa permisos de acceso a Neon');
  } finally {
    await sql.end();
  }
}

// Run the check
checkProductionPremiumStatus().catch(console.error);
