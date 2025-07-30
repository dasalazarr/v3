#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load environment variables
config();

async function diagnoseToolCallErrors() {
  console.log('🔍 DIAGNÓSTICO DE ERRORES DE TOOL CALLS...\n');

  console.log('📊 ERRORES IDENTIFICADOS EN RAILWAY:');
  console.log('=' .repeat(50));

  console.log('❌ ERROR 1: Tool calls aparecen como texto crudo');
  console.log('   Síntoma: <｜tool▁calls▁begin｜>function<｜tool▁sep｜>generate_training_plan...');
  console.log('   Causa: DeepSeek no maneja tool calling como OpenAI');
  console.log('   ✅ Solución: Forzar GPT-4o Mini para onboarding');

  console.log('\n❌ ERROR 2: "I need more information to log your run. Please provide: userId"');
  console.log('   Síntoma: Sistema confunde herramientas (log_run vs complete_onboarding)');
  console.log('   Causa: AI Agent selecciona herramienta incorrecta');
  console.log('   ✅ Solución: Intent classifier mejorado + GPT-4o Mini');

  console.log('\n❌ ERROR 3: Usuario tiene onboardingCompleted: true pero necesita onboarding');
  console.log('   Síntoma: Sistema no detecta necesidad de onboarding');
  console.log('   Causa: Estado inconsistente en base de datos');
  console.log('   ✅ Solución: Reset de onboarding (solo en Railway)');

  console.log('\n🔧 CORRECCIONES IMPLEMENTADAS:');
  console.log('=' .repeat(50));

  console.log('✅ CORRECCIÓN 1: Intent Classifier actualizado');
  console.log('   📁 Archivo: packages/llm-orchestrator/src/intent-classifier.ts');
  console.log('   🔧 Cambio: onboarding_required siempre usa GPT-4o Mini');
  console.log('   💡 Razón: GPT-4o Mini maneja tool calling correctamente');

  console.log('\n✅ CORRECCIÓN 2: Tool Registry mejorado');
  console.log('   📁 Archivo: packages/llm-orchestrator/src/tool-registry.ts');
  console.log('   🔧 Cambio: Conversión automática de string booleans');
  console.log('   💡 Razón: Evita errores de validación Zod');

  console.log('\n✅ CORRECCIÓN 3: Training Plan Generator corregido');
  console.log('   📁 Archivo: apps/api-gateway/src/tools/training-plan-generator.ts');
  console.log('   🔧 Cambio: userId removido del schema, manejo manual');
  console.log('   💡 Razón: Consistencia con otras herramientas');

  console.log('\n🎯 FLUJO ESPERADO DESPUÉS DE CORRECCIONES:');
  console.log('=' .repeat(50));

  console.log('1️⃣ DETECCIÓN DE INTENT:');
  console.log('   - Intent Classifier detecta: onboarding_required');
  console.log('   - Recomienda: GPT-4o Mini (no DeepSeek)');
  console.log('   - Confidence: 1.0');

  console.log('\n2️⃣ PROCESAMIENTO CON GPT-4O MINI:');
  console.log('   - HybridAIAgent selecciona GPT-4o Mini');
  console.log('   - Usa prompt especializado de onboarding');
  console.log('   - Tool calling funciona correctamente');

  console.log('\n3️⃣ EJECUCIÓN DE HERRAMIENTAS:');
  console.log('   - complete_onboarding: ✅ Sin errores de userId');
  console.log('   - generate_training_plan: ✅ Sin errores de validación');
  console.log('   - Conversión automática: "true" → true');

  console.log('\n4️⃣ RESPUESTA FINAL:');
  console.log('   - Sin tool calls crudos visibles');
  console.log('   - Respuesta coherente en español');
  console.log('   - Plan de entrenamiento generado');

  console.log('\n📊 LOGS DE RAILWAY ESPERADOS:');
  console.log('=' .repeat(50));
  console.log('🔍 [INTENT_CLASSIFIER] Intent: onboarding_required (1.0 confidence)');
  console.log('🔍 [INTENT_CLASSIFIER] Recommended model: gpt4o-mini');
  console.log('🔍 [HYBRID_AI] Using GPT-4o Mini for onboarding');
  console.log('🔍 [HYBRID_AI] Using specialized onboarding prompt');
  console.log('🔍 [TOOL_REGISTRY] Executing tool: complete_onboarding');
  console.log('🔍 [TOOL_REGISTRY] Final parameters with userId: {...}');
  console.log('🔍 [ONBOARDING_COMPLETER] Successfully completed onboarding');
  console.log('🔍 [TOOL_REGISTRY] Executing tool: generate_training_plan');
  console.log('🔍 [TRAINING_PLAN_GENERATOR] Generating plan for user...');
  console.log('🔍 ✅ [TRAINING_PLAN_GENERATOR] Created training plan...');

  console.log('\n❌ LOGS QUE NO DEBERÍAN APARECER:');
  console.log('🔍 ⚠️ Validation failed for tool generate_training_plan');
  console.log('🔍 Expected boolean, received string');
  console.log('🔍 Required userId');
  console.log('🔍 [HYBRID_AI] Using DeepSeek for cost-efficient processing');

  console.log('\n🧪 TESTING RECOMENDADO:');
  console.log('=' .repeat(50));

  console.log('🔄 OPCIÓN 1: Reset completo del sistema');
  console.log('   - Ejecutar: npx tsx complete-system-reset.ts');
  console.log('   - Crear usuario completamente nuevo');
  console.log('   - Probar onboarding desde cero');

  console.log('\n🎯 OPCIÓN 2: Testing directo en Railway');
  console.log('   - El usuario ya existe en Railway');
  console.log('   - Las correcciones están implementadas');
  console.log('   - Enviar mensaje para probar flujo');

  console.log('\n📱 PASOS DE VALIDACIÓN:');
  console.log('1. Envía "Quiero empezar de nuevo" al bot');
  console.log('2. Observa logs de Railway para intent classification');
  console.log('3. Verifica que use GPT-4o Mini');
  console.log('4. Confirma que no aparezcan tool calls crudos');
  console.log('5. Completa onboarding y verifica plan generado');

  console.log('\n🎉 RESUMEN:');
  console.log('✅ Correcciones implementadas para tool calling');
  console.log('✅ Intent classifier fuerza GPT-4o Mini para onboarding');
  console.log('✅ Tool registry maneja conversiones de tipos');
  console.log('✅ Training plan generator corregido');
  console.log('🚀 Sistema listo para testing con correcciones aplicadas');
}

// Run the diagnosis
diagnoseToolCallErrors().catch(console.error);
