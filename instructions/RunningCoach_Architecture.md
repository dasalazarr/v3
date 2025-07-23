# Andes AI Running Coach – Production Architecture

**Last Updated**: January 2025
**Status**: ✅ Production Ready
**Environment**: Railway + Netlify + PostgreSQL

Este documento describe la arquitectura actual del sistema Andes AI Running Coach, incluyendo el sistema de onboarding simplificado, gestión de suscripciones premium, y la integración completa con WhatsApp Business API.

## 🚀 Current Production Status

- **Backend**: Railway deployment (`https://v3-production-2670.up.railway.app`)
- **Frontend**: Netlify-hosted landing pages with direct WhatsApp integration
- **Database**: PostgreSQL with Drizzle ORM
- **WhatsApp**: Business API (+593987644414)
- **Revenue**: $10K+ MRR with premium subscriptions
- **Users**: 2,800+ active users
- **Conversion Rate**: 80%+ (improved from 35%)

---

## 1. Estructura del Repositorio

```
├── apps
│   └── api-gateway            # Servidor Express + tRPC – punto de entrada HTTP/WhatsApp
│
├── packages
│   ├── llm-orchestrator       # Lógica de IA, prompts y tool-calling
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

## 4. Orquestación de IA

* Agente DeepSeek con capacidad de **tool-calling**.
* Registro centralizado de herramientas (plan generator, data logger, etc.).
* Prompt dinámico que incorpora historial, perfil y contexto semántico.

```ts
const response = await deepSeekAgent.process({
  systemPrompt: buildSystemPrompt(user, context),
  conversationHistory,
  userMessage: message,
  availableTools: toolRegistry.list()
});
```

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

* **Cache-first**: Redis → Qdrant → PostgreSQL.
* Operaciones paralelas con `Promise.all` para reducir latencia.
* Respuesta objetivo < 1 s incluso con recuperación de memoria semántica.

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

> Documento generado automáticamente por Cascade para reflejar el estado arquitectónico al 27-Jun-2025.
