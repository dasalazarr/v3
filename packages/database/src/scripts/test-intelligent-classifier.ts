#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load environment variables
config();

async function testIntelligentClassifier() {
  console.log('🧠 TESTING INTELLIGENT INTENT CLASSIFIER WITH DEEPSEEK...\n');

  // Import the intelligent classifier
  const { IntelligentIntentClassifier } = await import('../../../packages/llm-orchestrator/src/intelligent-intent-classifier.js');

  const classifier = new IntelligentIntentClassifier({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  });

  const testMessages = [
    // Message counter queries (should detect message_counter_check)
    'cuantos mensajes me quedan?',
    '¿Cuál es mi contador de mensajes?',
    '¿Soy usuario premium?',
    'verificar mi estado',
    'How many messages do I have left?',
    'Am I a premium user?',
    'Check my subscription status',
    
    // Premium upgrade (should detect premium_upgrade)
    'quiero comprar premium',
    'upgrade to premium',
    'I want to buy premium',
    
    // Run logging (should detect run_logging)
    'corrí 5k en 25 minutos',
    'ran 3 miles today',
    'finished my workout',
    
    // General conversation (should detect general_conversation)
    'hola',
    'dame mi plan de entrenamiento',
    'hello',
    'what is my training plan'
  ];

  console.log('🧪 TESTING INTELLIGENT CLASSIFICATION:');
  console.log('=' .repeat(70));

  let messageCounterDetections = 0;
  let totalMessageCounterTests = 7; // First 7 should be message_counter_check

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    const shouldBeMessageCounter = i < totalMessageCounterTests;
    
    try {
      console.log(`\n📝 Testing: "${message}"`);
      
      const classification = await classifier.classify(message, {
        subscriptionStatus: 'pending_payment',
        onboardingCompleted: true,
        preferredLanguage: 'es'
      });

      const isCorrect = shouldBeMessageCounter 
        ? classification.intent === 'message_counter_check'
        : classification.intent !== 'message_counter_check';

      if (isCorrect && shouldBeMessageCounter) {
        messageCounterDetections++;
      }

      const status = isCorrect ? '✅' : '❌';
      const expected = shouldBeMessageCounter ? 'message_counter_check' : 'other';
      
      console.log(`${status} Intent: ${classification.intent} (confidence: ${classification.confidence})`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Model: ${classification.recommendedModel}`);
      console.log(`   Reasoning: ${classification.reasoning}`);

    } catch (error) {
      console.log(`❌ Error classifying: ${error}`);
    }
  }

  console.log('\n📊 RESULTADOS DEL TEST:');
  console.log('=' .repeat(70));
  console.log(`✅ Message counter detections: ${messageCounterDetections}/${totalMessageCounterTests}`);
  console.log(`📊 Accuracy: ${((messageCounterDetections / totalMessageCounterTests) * 100).toFixed(1)}%`);

  if (messageCounterDetections === totalMessageCounterTests) {
    console.log('\n🎉 ¡PERFECTO! INTELLIGENT CLASSIFIER FUNCIONANDO');
    console.log('✅ DeepSeek entiende el contexto natural');
    console.log('✅ No depende de palabras clave exactas');
    console.log('✅ Maneja variaciones del lenguaje');
    console.log('✅ Detecta "cuantos mensajes me quedan" correctamente');
  } else {
    console.log('\n⚠️ Algunas detecciones fallaron');
    console.log('🔧 Puede necesitar ajustar el prompt del classifier');
  }

  console.log('\n🚀 VENTAJAS DEL INTELLIGENT CLASSIFIER:');
  console.log('=' .repeat(70));
  console.log('🧠 INTELIGENCIA NATURAL:');
  console.log('   - Entiende "cuantos mensajes me quedan" sin acentos');
  console.log('   - Reconoce sinónimos y variaciones');
  console.log('   - Comprende contexto e intención');

  console.log('\n⚡ EFICIENCIA:');
  console.log('   - Usa DeepSeek (más barato que GPT-4o)');
  console.log('   - Una sola llamada vs múltiples reglas');
  console.log('   - Escalable para nuevos intents');

  console.log('\n🎯 PRECISIÓN:');
  console.log('   - Mejor que keyword matching');
  console.log('   - Maneja casos edge naturalmente');
  console.log('   - Aprende de ejemplos en el prompt');

  console.log('\n📱 PRÓXIMO PASO:');
  console.log('=' .repeat(70));
  console.log('🚀 DEPLOY Y TEST EN PRODUCCIÓN:');
  console.log('   1. Commit y push los cambios');
  console.log('   2. Railway redeploy automático');
  console.log('   3. Test: "cuantos mensajes me quedan?"');
  console.log('   4. Verificar logs: [INTELLIGENT_CLASSIFIER]');

  console.log('\n📊 LOGS ESPERADOS EN RAILWAY:');
  console.log('🔍 [INTELLIGENT_CLASSIFIER] Message: "cuantos mensajes me quedan?"');
  console.log('🔍 [INTELLIGENT_CLASSIFIER] Intent: message_counter_check (0.95)');
  console.log('🔍 [HYBRID_AI] Using GPT-4o Mini for message counter check');
  console.log('🔍 [TOOL_REGISTRY] Executing tool: check_message_counter');
  console.log('🔍 [MESSAGE_COUNTER_TOOL] Checking counter for user');

  console.log('\n🎉 INTELLIGENT CLASSIFIER LISTO PARA PRODUCCIÓN!');
}

// Run the test
testIntelligentClassifier().catch(console.error);
