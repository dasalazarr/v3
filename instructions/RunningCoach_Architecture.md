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

*   **Agente Planificador de Entrenamiento (`TrainingPlannerAgent`):** Experto en la ciencia del running. Su misión es crear, ajustar y explicar planes de entrenamiento, utilizando el `plan-generator` y el `vdot-calculator` existentes como sus herramientas principales.

*   **Agente Analista de Rendimiento (`PerformanceAnalystAgent`):** Revisa los datos de los entrenamientos completados por el usuario, compara el rendimiento real con el planificado, identifica tendencias y proporciona retroalimentación crítica. Inspirado en el `reflexion_agent.py` de la arquitectura v3.

*   **Agente Experto en Nutrición y Recuperación (`NutritionRecoveryAgent`):** Aconseja sobre alimentación pre/post-carrera, hidratación y técnicas de recuperación. Utiliza una base de conocimiento curada en `vector-memory`.

*   **Agente Motivador y Psicólogo Deportivo (`MotivationAgent`):** Gestiona el aspecto mental del entrenamiento, ofreciendo ánimo, estrategias para superar la falta de motivación y construir disciplina.

*   **Agente de Conversación (`ConversationAgent`):** Responsable de la interfaz final con el usuario. Sintetiza las respuestas de los otros agentes en un mensaje claro, fluido y natural para el usuario.

### Flujo de Interacción (Ejemplo):

1.  El usuario envía un mensaje a WhatsApp (ej. "¡Terminé mi carrera de hoy!").
2.  El webhook de `api-gateway` recibe el mensaje y lo envía al `HeadCoach`.
3.  El `HeadCoach` delega la tarea al `PerformanceAnalystAgent` para revisar los datos del entrenamiento.
4.  Simultáneamente, el `HeadCoach` puede activar al `MotivationAgent` y al `NutritionRecoveryAgent` para que aporten sus perspectivas.
5.  El `ConversationAgent` recibe las respuestas de todos los agentes relevantes y las sintetiza en un mensaje coherente y amigable para el usuario.
6.  La `api-gateway` envía la respuesta final al usuario a través de la API de Meta.

---

## 5. Generación de Planes de Entrenamiento

* Integración con fórmulas **Jack Daniels VDOT**.
* Planes de 14 días que se adaptan automáticamente a:
  * Nivel de fitness actual (VDOT calculado)
  * Lesiones reportadas
  * Frecuencia semanal deseada

---

## 6. Observabilidad y Analítica

* Job cron semanal que crea tarjetas de progreso (canvas 800×600).
* Métricas clave: volumen, VDOT, consistencia, estado de ánimo.
* Las tarjetas se envían por WhatsApp cada 14 días.

---

## 7. Testing & QA

* +80 % de cobertura con Jest en cada paquete.
* Load testing k6 (stages 10→50 usuarios) para validar rendimiento.
* GitHub Actions ejecuta pruebas → despliegue Railway.

---

## 8. Rendimiento

*   **Cache-first**: Redis → Qdrant → PostgreSQL.
*   Operaciones paralelas con `Promise.all` para reducir latencia.
*   Respuesta objetivo < 1 s incluso con recuperación de memoria semántica.

---

## 9. Ruta de Migración

1. Desplegar schema PG en paralelo a Google Sheets.
2. Scripts ETL para migrar y validar datos.
3. Cambiar webhook de WhatsApp al nuevo API Gateway.
4. Retirar integración Sheets.

---

## 10. Próximos Pasos

* Despliegue independiente de `vector-memory` para escalado horizontal.
* Integración de analítica avanzada (TimescaleDB). 
* Soporte multi-dominio reutilizando `llm-orchestrator`.

---

> Documento generado automáticamente por Cascade para reflejar el estado arquitectónico al 12-Jul-2025.