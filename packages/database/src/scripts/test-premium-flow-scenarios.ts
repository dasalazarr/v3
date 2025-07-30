#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

interface TestScenario {
  name: string;
  messageCount: number;
  subscriptionStatus: 'free' | 'pending_payment' | 'premium';
  expectedBehavior: string;
  testSteps: string[];
}

const testScenarios: TestScenario[] = [
  {
    name: 'Usuario Nuevo - Sin Límite',
    messageCount: 0,
    subscriptionStatus: 'free',
    expectedBehavior: 'Bot funciona normalmente, sin prompts de premium',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica respuesta normal sin prompts premium',
      'Confirma que no aparezcan links de Gumroad'
    ]
  },
  {
    name: 'Usuario Cerca del Límite',
    messageCount: 28,
    subscriptionStatus: 'free',
    expectedBehavior: 'Bot muestra advertencia de límite próximo',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica mensaje: "Te quedan 2 mensajes gratuitos"',
      'Confirma que incluya información sobre premium'
    ]
  },
  {
    name: 'Usuario Muy Cerca del Límite',
    messageCount: 29,
    subscriptionStatus: 'free',
    expectedBehavior: 'Bot muestra advertencia crítica',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica mensaje: "Te queda 1 mensaje gratuito"',
      'Confirma link de Gumroad presente',
      'Verifica advertencia prominente'
    ]
  },
  {
    name: 'Usuario en el Límite',
    messageCount: 30,
    subscriptionStatus: 'free',
    expectedBehavior: 'Bot activa flujo de upgrade premium',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica prompt de upgrade premium',
      'Confirma link de Gumroad presente',
      'Verifica logs: [PREMIUM_FLOW] Upgrade prompt triggered'
    ]
  },
  {
    name: 'Usuario Sobre el Límite',
    messageCount: 35,
    subscriptionStatus: 'free',
    expectedBehavior: 'Bot definitivamente muestra upgrade premium',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica mensaje de límite alcanzado',
      'Confirma link de compra prominente',
      'Verifica restricción de funcionalidad'
    ]
  },
  {
    name: 'Usuario Premium',
    messageCount: 20,
    subscriptionStatus: 'premium',
    expectedBehavior: 'Bot funciona sin restricciones, sin prompts',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica funcionalidad completa',
      'Confirma que NO aparezcan prompts de upgrade',
      'Verifica uso de GPT-4o Mini'
    ]
  },
  {
    name: 'Usuario Pending Payment',
    messageCount: 29,
    subscriptionStatus: 'pending_payment',
    expectedBehavior: 'Bot trata como usuario gratuito con límites',
    testSteps: [
      'Envía mensaje al bot',
      'Verifica advertencia: "Te queda 1 mensaje gratuito"',
      'Confirma link de Gumroad',
      'Monitorea webhook processing'
    ]
  }
];

async function runTestScenario(scenario: TestScenario) {
  console.log(`\n🧪 EJECUTANDO ESCENARIO: ${scenario.name}`);
  console.log('=' .repeat(60));

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const phoneNumber = '593984074389';

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

    // Update user for this scenario
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        weeklyMessageCount: scenario.messageCount,
        subscriptionStatus: scenario.subscriptionStatus,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('📊 CONFIGURACIÓN DEL ESCENARIO:');
    console.log(`📈 Contador de Mensajes: ${scenario.messageCount}`);
    console.log(`💎 Estado Suscripción: ${scenario.subscriptionStatus}`);
    console.log(`🎯 Comportamiento Esperado: ${scenario.expectedBehavior}`);

    console.log('\n✅ USUARIO CONFIGURADO PARA TESTING:');
    console.log(`📱 Teléfono: ${updatedUser.phoneNumber}`);
    console.log(`📈 Contador: ${updatedUser.weeklyMessageCount}`);
    console.log(`💎 Estado: ${updatedUser.subscriptionStatus}`);

    console.log('\n🧪 PASOS DE VALIDACIÓN:');
    scenario.testSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });

    console.log('\n⏳ ESPERANDO VALIDACIÓN MANUAL...');
    console.log('Envía un mensaje al bot y verifica el comportamiento esperado.');
    console.log('Presiona Enter cuando hayas completado la validación...');

  } catch (error) {
    console.error('❌ Error configurando escenario:', error);
  } finally {
    await sql.end();
  }
}

async function runAllScenarios() {
  console.log('🚀 INICIANDO SUITE DE TESTING DE FLUJO PREMIUM');
  console.log('=' .repeat(60));
  console.log('📱 Usuario de prueba: 593984074389');
  console.log('🤖 Bot WhatsApp: +593987644414');
  console.log('');

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 ESCENARIO ${i + 1}/${testScenarios.length}: ${scenario.name}`);
    
    await runTestScenario(scenario);
    
    if (i < testScenarios.length - 1) {
      console.log('\n⏭️  Presiona Enter para continuar al siguiente escenario...');
      // In a real implementation, you might want to add a pause here
      console.log('(Continuando automáticamente en 3 segundos...)');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n🎉 SUITE DE TESTING COMPLETADA');
  console.log('=' .repeat(60));
  console.log('📊 Escenarios ejecutados:', testScenarios.length);
  console.log('🔍 Revisa los logs de Railway para validar el comportamiento');
  console.log('📱 Prueba cada escenario enviando mensajes al bot');
}

async function setSpecificScenario(scenarioIndex: number) {
  if (scenarioIndex < 0 || scenarioIndex >= testScenarios.length) {
    console.log('❌ Índice de escenario inválido');
    console.log(`📋 Escenarios disponibles: 0-${testScenarios.length - 1}`);
    return;
  }

  const scenario = testScenarios[scenarioIndex];
  console.log(`🎯 CONFIGURANDO ESCENARIO ESPECÍFICO: ${scenario.name}`);
  
  await runTestScenario(scenario);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const scenarioIndex = parseInt(args[0]);
    await setSpecificScenario(scenarioIndex);
  } else {
    // Por defecto, configurar escenario de límite alcanzado (más útil para testing)
    console.log('🎯 CONFIGURANDO ESCENARIO POR DEFECTO: Usuario en el Límite');
    await setSpecificScenario(2); // Escenario "Usuario en el Límite"
  }
}

main().catch(console.error);

// Export scenarios for reference
export { testScenarios, runTestScenario, setSpecificScenario };
