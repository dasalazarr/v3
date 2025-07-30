#!/usr/bin/env tsx

import { config } from 'dotenv';
import { IntentClassifier } from '../../../packages/llm-orchestrator/src/intent-classifier.js';

// Load environment variables
config();

async function testIntentClassifier() {
  console.log('🧪 TESTING INTENT CLASSIFIER - MESSAGE COUNTER DETECTION...\n');

  const classifier = new IntentClassifier();

  const testMessages = [
    // Spanish messages
    '¿Cuál es mi contador de mensajes?',
    '¿Cuántos mensajes me quedan?',
    '¿Soy usuario premium?',
    '¿Cuál es mi estado de suscripción?',
    'verificar mi contador de mensajes',
    'mostrar mi estado premium',
    'revisar estado',
    
    // English messages
    'What is my message count?',
    'How many messages do I have left?',
    'Am I a premium user?',
    'What is my subscription status?',
    'Check my message counter',
    'Show my premium status',
    
    // Control messages (should NOT trigger message_counter_check)
    'Hola, quiero empezar a entrenar',
    'Corrí 5k hoy en 25 minutos',
    'Dame mi plan de entrenamiento',
    'Hello, I want to start training'
  ];

  console.log('📊 TESTING MESSAGE COUNTER INTENT DETECTION:');
  console.log('=' .repeat(60));

  let correctDetections = 0;
  let totalMessageCounterTests = 13; // First 13 should trigger message_counter_check

  testMessages.forEach((message, index) => {
    const shouldTriggerMessageCounter = index < totalMessageCounterTests;
    
    const classification = classifier.classify(message, {
      subscriptionStatus: 'pending_payment',
      onboardingCompleted: true,
      preferredLanguage: 'es'
    });

    const isCorrect = shouldTriggerMessageCounter 
      ? classification.intent === 'message_counter_check'
      : classification.intent !== 'message_counter_check';

    if (isCorrect && shouldTriggerMessageCounter) {
      correctDetections++;
    }

    const status = isCorrect ? '✅' : '❌';
    const expected = shouldTriggerMessageCounter ? 'message_counter_check' : 'other';
    
    console.log(`${status} "${message}"`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Got: ${classification.intent} (${classification.confidence})`);
    console.log(`   Model: ${classification.recommendedModel}`);
    console.log(`   Reasoning: ${classification.reasoning}`);
    console.log('');
  });

  console.log('📊 RESULTADOS DEL TEST:');
  console.log('=' .repeat(60));
  console.log(`✅ Detecciones correctas: ${correctDetections}/${totalMessageCounterTests}`);
  console.log(`📊 Precisión: ${((correctDetections / totalMessageCounterTests) * 100).toFixed(1)}%`);

  if (correctDetections === totalMessageCounterTests) {
    console.log('🎉 ¡PERFECTO! Todas las preguntas sobre contador fueron detectadas');
    console.log('✅ Intent classifier funcionando correctamente');
    console.log('✅ Usará GPT-4o Mini para tool calling confiable');
    console.log('✅ Prompt especializado será aplicado');
  } else {
    console.log('⚠️ Algunas detecciones fallaron');
    console.log('🔧 Puede necesitar ajustar las palabras clave');
  }

  console.log('\n🎯 PRÓXIMO PASO:');
  console.log('=' .repeat(60));
  console.log('📱 PRUEBA ESTAS FRASES EN EL BOT:');
  console.log('   1. "¿Cuál es mi contador de mensajes?"');
  console.log('   2. "¿Soy usuario premium?"');
  console.log('   3. "¿Cuántos mensajes me quedan?"');

  console.log('\n📊 LOGS ESPERADOS EN RAILWAY:');
  console.log('🔍 [INTENT_CLASSIFIER] Intent: message_counter_check (0.95 confidence)');
  console.log('🔍 [HYBRID_AI] Using GPT-4o Mini for message counter check');
  console.log('🔍 [HYBRID_AI] Using specialized message counter prompt');
  console.log('🔍 [TOOL_REGISTRY] Executing tool: check_message_counter');
  console.log('🔍 [MESSAGE_COUNTER_TOOL] Checking counter for user');

  console.log('\n✅ CORRECCIÓN IMPLEMENTADA:');
  console.log('- Intent classifier detecta preguntas sobre contador');
  console.log('- Fuerza uso de GPT-4o Mini (tool calling confiable)');
  console.log('- Aplica prompt especializado que obliga uso de herramienta');
  console.log('- Debería resolver el problema de respuestas genéricas');
}

// Run the test
testIntentClassifier().catch(console.error);
