# 🎯 Plan de Desarrollo Multiagente Optimizado - Coach de Running

## 📊 Contexto y Estado Actual

### Comandos Comunes de Desarrollo

#### Desarrollo y Construcción
- `npm run dev` - Inicia el servidor de desarrollo con verificación de lint y recarga en caliente usando nodemon
- `npm run build` - Construye la aplicación usando Rollup
- `npm start` - Ejecuta la aplicación construida desde dist/app.js
- `npm run lint` - Ejecuta ESLint en todo el código base

#### Pruebas
- No hay comandos de prueba específicos configurados. Consultar con el usuario para el enfoque de pruebas si es necesario.



### Sistema Existente (Mantener 100%)
- ✅ **API Gateway**: BuilderBot + WhatsApp funcional
- ✅ **Base de Datos**: PostgreSQL con esquemas completos
- ✅ **Memoria Vectorial**: Qdrant + Redis + PostgreSQL
- ✅ **IA Básica**: DeepSeek con tool calling
- ✅ **Paquetes**: 5 módulos bien estructurados (database, llm-orchestrator, plan-generator, shared, vector-memory)
- ✅ **Core Framework**: TypeScript WhatsApp AI assistant with multi-agent capabilities built with BuilderBot, OpenAI/DeepSeek API, PostgreSQL, Qdrant, Redis, Google Calendar API, tsyringe.

### Sistema Multiagente (Reutilizar)
- ✅ **Arquitectura**: Orquestador + Agentes + Memoria
- ✅ **Agentes**: Planner, Executor, Reflexion, Training, Progress, Injury Prevention
- ✅ **Memoria Avanzada**: Contexto semántico
- ✅ **Resiliencia**: Manejo de errores y auto-corrección
- ✅ **Dependency Injection System**: Centralized DI with tsyringe in `src/di/container.ts`
- ✅ **Configuration Management**: Centralized environment variables in `src/config/index.ts`
- ✅ **ESM Configuration**: Project uses ES modules (`"type": "module"` in package.json)

### Arquitectura de Servicios Clave
- **Multi-Agent Services**: MultiAgentService, VectorMemoryService, AdvancedMemoryManager, WorkflowManager, ReflexionService
- **Core Services**: DatabaseService, AIService, VectorService, CacheService, AnalyticsService
- **AppointmentService & AppointmentController**: Google Calendar integration for scheduling
- **TranslationService**: Bilingual support (EN/ES) with automatic language detection

### Estrategia de Almacenamiento de Datos
- **Primary Storage**: PostgreSQL with comprehensive schemas
- **Vector Storage**: Qdrant for semantic search and memory
- **Cache Storage**: Redis for session and performance optimization
- **User Data**: Structured user profiles and preferences
- **Training Data**: Running plans, workouts, and progress tracking
- **Conversations**: Vector-enhanced conversation history
- **Appointments**: Integrated with Google Calendar

---

## 🏗️ Arquitectura del Proyecto

### Package Architecture
The project is structured as a monorepo with specialized packages:
- `packages/multi-agent/` - Multi-agent system core
- `packages/vector-memory/` - Advanced memory management
- `packages/llm-orchestrator/` - LLM coordination
- `packages/database/` - Database operations
- `packages/cache/` - Caching layer
- `apps/api-gateway/` - Main application entry point

### Flow Architecture
Conversational flows in `src/templates/`:
- `mainFlow.ts` - Primary conversation handler
- `appointmentFlow.ts` - Appointment scheduling
- `faqFlow.ts` - FAQ handling
- `trainingFlow.ts` - Training flow

---

### Fase 1: Fundación Multiagente (Semana 1)

#### 1.1 Crear Paquete Multi-Agent (2 días)
```bash
packages/multi-agent/
├── src/
│   ├── agents/
│   │   ├── base-agent.ts          # Clase base reutilizable
│   │   ├── planner-agent.ts       # Adaptar del sistema existente
│   │   ├── executor-agent.ts      # Adaptar del sistema existente
│   │   └── reflexion-agent.ts     # Adaptar del sistema existente
│   ├── core/
│   │   ├── orchestrator.ts        # Adaptar del sistema existente
│   │   └── workflow-manager.ts    # Nuevo - gestión de flujos
│   ├── memory/
│   │   └── advanced-context.ts    # Extender vector-memory existente
│   └── index.ts
```

#### 1.2 Adaptar Agentes Existentes (3 días)
- **BaseAgent**: Clase abstracta reutilizable
- **PlannerAgent**: Descomposición de tareas para running coach
- **ExecutorAgent**: Ejecución especializada
- **ReflexionAgent**: Análisis y mejora

#### 1.3 Integrar con Configuración Existente (1 día)
- Reutilizar configuración DeepSeek existente
- Agregar configuraciones multiagente
- Mantener compatibilidad total

**Código Nuevo**: ~200 líneas (principalmente adaptaciones)

---

### Fase 2: Memoria Avanzada (Semana 2)

#### 2.1 Extender Vector Memory (2 días)
- **AdvancedMemoryManager**: Gestión avanzada de memoria
- **storeTaskDecomposition**: Almacenar descomposiciones
- **retrieveSimilarTasks**: Búsqueda semántica mejorada
- **generateContextSummary**: Resúmenes contextuales

#### 2.2 Integrar con Memoria Existente (2 días)
- Extender `VectorMemory` existente
- Mantener compatibilidad con `ChatBuffer`
- Agregar métodos multiagente

#### 2.3 Optimizar Búsqueda Semántica (1 día)
- Prompts específicos para running coach
- Optimización de embeddings
- Mejora de relevancia

**Código Nuevo**: ~150 líneas (extensiones de funcionalidad existente)

---

### Fase 3: Agentes Especializados (Semana 3)

#### 3.1 Agente de Entrenamiento (2 días)
- **generateTrainingPlan**: Planes VDOT personalizados
- **analyzeRunData**: Análisis de datos de entrenamiento
- **adjustPlanForProgress**: Ajustes basados en progreso

#### 3.2 Agente de Progreso (2 días)
- **generateProgressReport**: Reportes semanales
- **identifyTrends**: Análisis de tendencias
- Integración con `AnalyticsService` existente

#### 3.3 Agente de Prevención de Lesiones (1 día)
- **assessInjuryRisk**: Evaluación de riesgo
- **generateRecoveryPlan**: Planes de recuperación
- Monitoreo proactivo

**Código Nuevo**: ~300 líneas (agentes especializados)

---

### Fase 4: Orquestador Inteligente (Semana 4)

#### 4.1 Workflow Manager (2 días)
- **startWorkflow**: Iniciar flujos de trabajo
- **executeWorkflow**: Ejecutar subtareas
- **handleDependencies**: Gestión de dependencias
- **errorHandling**: Manejo de errores

#### 4.2 Herramientas Especializadas (2 días)
- **RunningCoachTools**: Herramientas específicas
- **logRun**: Registro de entrenamientos
- **generateTrainingPlan**: Generación de planes
- **analyzeProgress**: Análisis de progreso

#### 4.3 Sistema de Herramientas (1 día)
- **MultiAgentToolRegistry**: Registro de herramientas
- **execute**: Ejecución de herramientas
- Integración con sistema existente

**Código Nuevo**: ~250 líneas (orquestación y herramientas)

---

### Fase 5: Integración y Migración (Semana 5)

#### 5.1 Extender API Gateway (2 días)
- **MultiAgentService**: Servicio de integración
- **processMessage**: Procesamiento inteligente
- **shouldUseMultiAgent**: Detección de intención
- Mantener compatibilidad con `AIAgent`

#### 5.2 Feature Flags (2 días)
- **FEATURE_FLAGS**: Control de funcionalidades
- **MULTI_AGENT_ENABLED**: Habilitar/deshabilitar
- **MULTI_AGENT_PERCENTAGE**: Migración gradual
- **ENABLE_REFLECTION**: Reflexión automática

#### 5.3 Migración Gradual (1 día)
- **MigrationManager**: Gestión de migración
- **A/B Testing**: Pruebas automáticas
- **Rollback**: Capacidad de reversión
- **Monitoring**: Seguimiento de migración

**Código Nuevo**: ~200 líneas (integración y migración)

---

### Fase 6: Optimización y Resiliencia (Semana 6)

#### 6.1 Reflexion Agent (2 días)
- **analyzeWorkflowResult**: Análisis de resultados
- **handleFailure**: Estrategias de recuperación
- **suggestImprovements**: Sugerencias de mejora
- **selfCorrection**: Auto-corrección

#### 6.2 Monitoreo y Métricas (2 días)
- **MultiAgentMetrics**: Métricas de rendimiento
- **recordWorkflowStart**: Registro de inicio
- **recordWorkflowCompletion**: Registro de completado
- **getMetrics**: Obtención de métricas

#### 6.3 Testing y Validación (1 día)
- **Integration Tests**: Pruebas de integración
- **Performance Tests**: Pruebas de rendimiento
- **Load Tests**: Pruebas de carga
- **Validation**: Validación de funcionalidad

**Código Nuevo**: ~150 líneas (optimización y testing)

---

## 📋 Resumen de Código por Fase

| Fase | Líneas Nuevas | Líneas Reutilizadas | Total |
|------|---------------|---------------------|-------|
| 1. Fundación | 200 | 500 | 700 |
| 2. Memoria | 150 | 300 | 450 |
| 3. Agentes | 300 | 200 | 500 |
| 4. Orquestador | 250 | 400 | 650 |
| 5. Integración | 200 | 600 | 800 |
| 6. Optimización | 150 | 100 | 250 |
| **TOTAL** | **1,250** | **2,100** | **3,350** |

---

## 🎯 Estrategia de Desarrollo Optimizada

### Principios Clave:
1. **Reutilización Máxima**: Aprovechar 2,100+ líneas existentes
2. **Adaptación vs Reescritura**: Adaptar código multiagente existente
3. **Integración Gradual**: Feature flags para migración segura
4. **Compatibilidad Total**: Mantener sistema actual funcionando

### Archivos Críticos a Modificar:
1. `apps/api-gateway/src/app.ts` - Agregar servicios multiagente
2. `packages/vector-memory/src/index.ts` - Extender memoria
3. `apps/api-gateway/src/flows/enhanced-main-flow.ts` - Integrar multiagente
4. `packages/llm-orchestrator/src/ai-agent.ts` - Mantener compatibilidad

### Archivos Nuevos Principales:
1. `packages/multi-agent/` - Sistema multiagente completo
2. `apps/api-gateway/src/services/multi-agent-service.ts` - Servicio de integración
3. `apps/api-gateway/src/config/feature-flags.ts` - Control de migración

---

## 🚀 Plan de Ejecución Semanal

### Semana 1: Fundación
- **Día 1-2**: Crear paquete multi-agent
- **Día 3-4**: Adaptar agentes existentes
- **Día 5**: Integrar configuración

### Semana 2: Memoria
- **Día 1-2**: Extender vector memory
- **Día 3-4**: Integrar memoria avanzada
- **Día 5**: Optimizar búsqueda

### Semana 3: Agentes
- **Día 1-2**: Training agent
- **Día 3-4**: Progress agent
- **Día 5**: Injury prevention agent

### Semana 4: Orquestador
- **Día 1-2**: Workflow manager
- **Día 3-4**: Herramientas especializadas
- **Día 5**: Sistema de herramientas

### Semana 5: Integración
- **Día 1-2**: Extender API gateway
- **Día 3-4**: Feature flags
- **Día 5**: Migración gradual

### Semana 6: Optimización
- **Día 1-2**: Reflexion agent
- **Día 3-4**: Monitoreo y métricas
- **Día 5**: Testing y validación

---

## ✅ Criterios de Éxito

### Técnicos:
- ✅ Sistema multiagente funcional
- ✅ Migración gradual sin interrupciones
- ✅ Performance <2s respuesta
- ✅ 100% compatibilidad con sistema actual

### Funcionales:
- ✅ Planes de entrenamiento inteligentes
- ✅ Análisis de progreso avanzado
- ✅ Prevención de lesiones proactiva
- ✅ Memoria contextual efectiva

### Negocio:
- ✅ Mejora en retención de usuarios
- ✅ Mayor personalización
- ✅ Reducción de tiempo de respuesta
- ✅ Escalabilidad mejorada

---

## 🔧 Configuración Técnica

### Variables de Entorno Clave:
```bash
# Required variables
apiKey
jwtToken
numberId
verifyToken
DATABASE_URL
REDIS_URL
QDRANT_URL
QDRANT_API_KEY
GOOGLE_CALENDAR_ID
privateKey
clientEmail

# Multi-Agent Configuration
MULTI_AGENT_ENABLED=true
MULTI_AGENT_PERCENTAGE=10
ENABLE_REFLECTION=true
AGENT_TIMEOUT_MS=30000
MAX_WORKFLOW_RETRIES=3
```

### Dependencias a Agregar:
```json
{
  "dependencies": {
    "@qdrant/js-client-rest": "^1.8.0",
    "uuid": "^9.0.0",
    "zod": "^3.22.0"
  }
}
```

---

## 📊 Métricas de Progreso

### Semana 1:
- [ ] Paquete multi-agent creado
- [ ] Agentes base implementados
- [ ] Configuración integrada

### Semana 2:
- [ ] Memoria avanzada funcional
- [ ] Búsqueda semántica optimizada
- [ ] Integración con memoria existente

### Semana 3:
- [ ] Training agent operativo
- [ ] Progress agent funcional
- [ ] Injury prevention agent activo

### Semana 4:
- [ ] Workflow manager completo
- [ ] Herramientas especializadas
- [ ] Sistema de herramientas

### Semana 5:
- [ ] API gateway extendido
- [ ] Feature flags implementados
- [ ] Migración gradual activa

### Semana 6:
- [ ] Reflexion agent funcional
- [ ] Monitoreo implementado
- [ ] Testing completo

---

Este plan optimizado permite desarrollar un sistema multiagente completo con solo **1,250 líneas de código nuevo**, reutilizando **2,100 líneas existentes**, para un total de **3,350 líneas** que transforman completamente la capacidad del sistema manteniendo toda la funcionalidad actual.

## ℹ️ Instructions

This document outlines the optimized multi-agent development plan for the Running Coach system. It details the current state, a 6-week development roadmap, key principles, critical files to modify, new files to create, weekly execution plan, success criteria, technical configuration, and progress metrics. The goal is to develop a complete multi-agent system with minimal new code by leveraging existing functionalities and ensuring full compatibility with the current system.