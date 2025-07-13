# Running Coach Bot – Arquitectura y Estado Actual

Fecha: 2025-07-12

Este documento resume la transformación del prototipo original (basado en Google Sheets) a un sistema inteligente con memoria persistente y arquitectura modular mono-repo, evolucionando hacia un modelo de coaching multi-agente.

---

## 1. Estructura del Repositorio

```
├── apps
│   └── api-gateway            # Servidor Express – punto de entrada HTTP/WhatsApp (manejo directo del webhook)
│
├── packages
│   ├── llm-orchestrator       # **Sistema Multi-Agente de IA**, prompts y tool-calling
│   ├── vector-memory          # Persistencia semántica (Qdrant)
│   ├── plan-generator         # Algoritmo VDOT / Jack Daniels
│   └── …                      # Futuras utilidades compartidas
│
└── infra
    └── terraform              # Infraestructura como código (Neon, Railway, Redis, Qdrant)
```

### Ventajas
* Separación de responsabilidades y reutilización de código.
* Despliegues independientes por paquete a futuro.
* Mejora del testing y la escalabilidad.

---

## 2. Sistema de Memoria Multicapa

| Capa            | Tecnología | Alcance          | Uso principal                                  |
|-----------------|------------|------------------|------------------------------------------------|
| Short-term      | Redis      | 20 mensajes      | Continuidad conversacional rápida              |
| Semántica       | Qdrant     | ∞ embeddings     | Búsqueda de contexto relevante                 |
| Long-term facts | PostgreSQL | Tablas relacionales | Perfil y métricas históricas del usuario |

---

## 3. Modelo de Datos (PostgreSQL)

```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY,
  phone_number  text UNIQUE,
  age           integer,
  goal_race     text,
  injury_history jsonb,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE runs (
  id              uuid PRIMARY KEY,
  user_id         uuid REFERENCES users(id),
  distance        decimal(5,2), -- km
  perceived_effort integer,     -- RPE 1-10
  mood            text,
  aches           jsonb,
  run_date        date,
  created_at      timestamptz DEFAULT now()
);
```

---

## 4. Orquestación de IA: El Equipo de Coaching Multi-Agente

El `llm-orchestrator` ha evolucionado de un agente único a un equipo colaborativo de especialistas virtuales, emulando un equipo de coaching de élite. Este enfoque permite un asesoramiento más holístico y contextualizado.

### Agentes Especializados:

*   **Coach Principal (`HeadCoach`):** Actúa como el director del equipo. Es el único que interactúa directamente con el usuario (a través del webhook de WhatsApp). Interpreta la necesidad del usuario, delega tareas a los agentes especialistas y sintetiza sus respuestas para dar una recomendación unificada. Inspirado en el `orchestrator.py` de la arquitectura multi-agente v3.

*   **Agente de Onboarding (`OnboardingAgent`):** Guía a los nuevos usuarios a través del proceso de registro inicial, recopilando datos críticos como metas, experiencia y frecuencia de entrenamiento. Tiene prioridad en la orquestación del `HeadCoach` para asegurar la captura de información esencial. **Ahora soporta internacionalización y utiliza un seguimiento robusto de preguntas.**

*   **Agente Planificador de Entrenamiento (`TrainingPlannerAgent`):** Experto en la ciencia del running. Su misión es crear, ajustar y explicar planes de entrenamiento, utilizando el `plan-generator` y el `vdot-calculator` existentes como sus herramientas principales. Ahora, también es activado automáticamente al finalizar el onboarding. **Utiliza memoria vectorial para planes más personalizados y adaptativos, considerando historial de lesiones y preferencias.**

*   **Agente Analista de Rendimiento (`PerformanceAnalystAgent`):** Revisa los datos de los entrenamientos completados por el usuario, compara el rendimiento real con el planificado, identifica tendencias y proporciona retroalimentación crítica. Inspirado en el `reflexion_agent.py` de la arquitectura v3. **Ahora utiliza memoria vectorial para un análisis más informado.**

*   **Agente Experto en Nutrición y Recuperación (`NutritionRecoveryAgent`):** Aconseja sobre alimentación pre/post-carrera, hidratación y técnicas de recuperación. Utiliza una base de conocimiento curada en `vector-memory`.

*   **Agente Motivador y Psicólogo Deportivo (`MotivationAgent`):** Gestiona el aspecto mental del entrenamiento, ofreciendo ánimo, estrategias para superar la falta de motivación y construir disciplina.

*   **Agente de Registro de Carreras (`RunLoggerAgent`):** **Nuevo agente.** Extrae y registra datos estructurados de carreras a partir de mensajes de usuario en lenguaje natural, almacenándolos en la base de datos y en la memoria vectorial.

*   **Agente de Conversación (`ConversationAgent`):** Responsable de la interfaz final con el usuario. Sintetiza las respuestas de los otros agentes en un mensaje claro, fluido y natural para el usuario, adaptándose al canal de comunicación (ej. WhatsApp).

### Flujo de Interacción (Ejemplo):

1.  **Nuevo Usuario (Onboarding):**
    *   El usuario envía un mensaje inicial (ej. "Hola").
    *   El webhook de `api-gateway` recibe el mensaje y lo envía al `HeadCoach`.
    *   El `HeadCoach` detecta que el usuario no ha completado el onboarding y **prioriza la activación del `OnboardingAgent`**.
    *   El `OnboardingAgent` saluda al usuario y comienza el proceso de preguntas (meta, experiencia, frecuencia, etc.), validando y guardando cada dato en la base de datos. **Ahora con soporte multilingüe y seguimiento de pregunta actual.**
    *   Si el usuario se desvía o proporciona una respuesta inválida, el `OnboardingAgent` lo retoma y repregunta.
    *   Una vez que todos los datos críticos son recopilados, el `OnboardingAgent` marca el onboarding como completado en el perfil del usuario y entrega un micro-hito motivador.
    *   **Automáticamente, el `HeadCoach` activa el `TrainingPlannerAgent`** para generar el plan inicial basado en los datos recién recopilados.
    *   El `ConversationAgent` sintetiza la respuesta (micro-hito + explicación del plan) y la `api-gateway` la envía al usuario.

2.  **Usuario Existente (Interacción Continua):**
    *   El usuario envía un mensaje (ej. "¡Terminé mi carrera de hoy!").
    *   El webhook de `api-gateway` recibe el mensaje y lo envía al `HeadCoach`.
    *   El `HeadCoach` (a través de su LLM) analiza el mensaje y el contexto, y delega la tarea a los agentes especializados relevantes (ej. `PerformanceAnalystAgent`, `MotivationAgent`, `NutritionRecoveryAgent`, **`RunLoggerAgent`**).
    *   Los agentes procesan la información, interactúan con las herramientas (base de datos, memoria vectorial) y generan sus respuestas.
    *   El `ConversationAgent` recibe las respuestas de todos los agentes relevantes y las sintetiza en un mensaje coherente y amigable para el usuario.
    *   La `api-gateway` envía la respuesta final al usuario a través de la API de Meta.

---

### Optimización de Prompts

*   **Claridad y Concisión:** Los prompts de cada agente han sido refinados para ser más directos y efectivos, eliminando redundancias y enfocándose en la tarea específica del LLM.
*   **Contexto Relevante:** Se asegura que solo la información necesaria (historial de conversación, perfil de usuario, datos de herramientas, **memoria semántica**) se incluya en el prompt para optimizar el uso de tokens y la calidad de la respuesta.
*   **Formato de Salida:** Se instruye al LLM sobre el formato de salida esperado cuando sea necesario (ej. explicar un plan generado en lenguaje natural).

---

## 5. Generación de Planes de Entrenamiento

* Integración con fórmulas **Jack Daniels VDOT**.
* Planes de 14 días que se adaptan automáticamente a:
  * Nivel de fitness actual (VDOT calculado)
  * Lesiones reportadas
  * Frecuencia semanal deseada

---

## 6. Observabilidad y Analítica

*   **Logs Detallados:** Implementación de logs contextuales y detallados en cada agente y en el `HeadCoach` para facilitar la depuración y el seguimiento del flujo de ejecución.
*   Job cron semanal que crea tarjetas de progreso (canvas 800×600). **Ahora implementado.**
*   Métricas clave: volumen, VDOT, consistencia, estado de ánimo.
*   Las tarjetas se envían por WhatsApp cada 14 días.

---

## 7. Manejo de Errores y Robustez

*   **Manejo de Errores Centralizado:** Implementación de bloques `try-catch` en los métodos `run` de cada agente y en el `HeadCoach` para capturar y registrar errores de manera controlada.
*   **Mensajes de Fallback Amigables:** En caso de errores, el sistema proporciona mensajes de fallback al usuario para mantener una experiencia fluida.
*   **Validación de Entradas:** (Pendiente de implementación más profunda) Asegurar la validación de las entradas del usuario antes de procesarlas.

---

## 8. Testing & QA

*   **Pruebas Unitarias:** Implementación de pruebas unitarias con Vitest para cada agente (`LLMClient`, `TrainingPlannerAgent`, etc.) y para el `HeadCoach`, utilizando mocks para aislar las dependencias.
*   **Pruebas de Integración:** (Pendiente de implementación completa) Simulación de interacciones de webhook para verificar el flujo completo del sistema.
*   +80 % de cobertura con Jest en cada paquete.
*   Load testing k6 (stages 10→50 usuarios) para validar rendimiento.
*   GitHub Actions ejecuta pruebas → despliegue Railway.

---

## 9. Rendimiento

*   **Cache-first**: Redis → Qdrant → PostgreSQL.
*   Operaciones paralelas con `Promise.all` para reducir latencia.
*   Respuesta objetivo < 1 s incluso con recuperación de memoria semántica.

---

## 10. Ruta de Migración

1. Desplegar schema PG en paralelo a Google Sheets.
2. Scripts ETL para migrar y validar datos.
3. Cambiar webhook de WhatsApp al nuevo API Gateway.
4. Retirar integración Sheets.

---

## 11. Próximos Pasos

* Despliegue independiente de `vector-memory` para escalado horizontal.
* Integración de analítica avanzada (TimescaleDB). 
* Soporte multi-dominio reutilizando `llm-orchestrator`.

---

> Documento generado automáticamente por Cascade para reflejar el estado arquitectónico al 12-Jul-2025.