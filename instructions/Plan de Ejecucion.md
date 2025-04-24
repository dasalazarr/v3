# Plan de Ejecución V3: Roadmap de Desarrollo Multi‑Dominio

**Fecha**: 2025-04-23

## 1. Objetivo general
Definir y estructurar las tareas necesarias en sprints para adaptar V3 a múltiples dominios: dental, dermatológico, municipal, educativo, eventos y gestión de proyectos.

## 2. Estructura de Sprints y Tareas

### Sprint 1: Core refactor & routing (1 semana)
- **T1.1**: Extraer lógica común de prompts a `src/core/promptCore.ts`
  - Descripción: Refactorizar saludos, mensajes fallback y confirmaciones genéricas en un módulo central.
  - Dependencias: Ninguna.
  - Entregables: `promptCore.ts` + tests unitarios (coverage ≥ 80%).
  - Criterios de aceptación: Todos los módulos consumen `promptCore`; tests pasan.

- **T1.2**: Implementar router de dominios en `src/router.ts`
  - Descripción: Función `detectDomain(input: string): Domain` usando rules + ML ligero.
  - Dependencias: T1.1.
  - Entregables: `router.ts` + tests (precisión ≥ 90% en frases de ejemplo).
  - Criterios de aceptación: Mapeo correcto de 5 dominios en tests.

- **T1.3**: Integrar router con flujo de conversación en `src/services/conversacion.controller.ts`
  - Descripción: Al iniciar chat, llamar a router y cargar módulo correspondiente.
  - Dependencias: T1.2.
  - Entregables: Actualización de `conversacion.controller.ts` + pruebas de integración.

### Sprint 2: Módulos de dominio (2 semanas)
- **T2.1**: Módulo Dental (`modules/dental/`)
  - Descripción: Consolidar prompts y flujos del asistente DentalBot (servicios, agendamiento, FAQs).
  - Dependencias: Sprint 1.
  - Entregables: Carpeta `modules/dental` con prompt, handlers y tests.
  - Criterios: Simulación de conversación completa con flow dental.

- **T2.2**: Módulo Dermatología (`modules/dermatologia/`)
  - Descripción: Flujos de consulta de tratamientos, agendamiento y FAQs.
  - Dependencias: Sprint 1.
  - Entregables: Carpeta `modules/dermatologia` + tests.

- **T2.3**: Módulo Municipal (`modules/municipal/`)
  - Descripción: Flujos de asistente ciudadano: trámites, servicios, horarios.
  - Entregables: Carpeta `modules/municipal` + tests.

- **T2.4**: Módulos Educación, Eventos y Proyectos (paralelo)
  - Descripción: Flujos de tutorías, inscripción a charlas y reporte de avances.
  - Entregables: Carpetas `modules/educacion`, `modules/eventos`, `modules/proyectos` + tests.

### Sprint 3: Templates & Knowledge Base (2 semanas)
- **T3.1**: Integrar engine de plantillas (Handlebars) en `src/core/templateEngine.ts`
  - Descripción: Soporte de variables `{domain}`, `{user}`, `{nextStep}`.
  - Entregables: `templateEngine.ts` + ejemplos de templates.

- **T3.2**: Montar vectorDB para FAQs (Pinecone/Weaviate)
  - Descripción: Ingestión de documentos por dominio desde `modules/*/faq.md`.
  - Entregables: Script `scripts/ingestFaqs.ts` + tests de retrieval.

- **T3.3**: Ajustar prompts para RAG (retrieval-augmented generation)
  - Descripción: Inyectar contextos desde vectorDB en el promptCore.
  - Entregables: Actualizaciones en `promptCore.ts` + tests de RAG.

### Sprint 4: UI/Demo en vivo (1 semana)
- **T4.1**: Consola web ligera (Next.js) en `web-demo/`
  - Descripción: Interfaz para disparar conversaciones multi‑dominio y ver logs.
  - Entregables: Proyecto `web-demo` + despliegue local.

- **T4.2**: Dashboard de métricas (grafana/simple charts)
  - Descripción: Panel en tiempo real de intents, tiempos de respuesta y errores.

### Sprint 5: Pilotos & feedback (2 semanas)
- **T5.1**: Configurar piloto dental con 2 clínicas locales.
- **T5.2**: Configurar piloto universitario con Oficina de Registro Académico.
- **T5.3**: Recopilar métricas (TTR, CSAT, no‑shows).
- **T5.4**: Ajustes iterativos según feedback.

### Sprint 6: Escala & comercialización (2 semanas)
- **T6.1**: Dockerizar microservicios y configurar CI/CD (GitHub Actions).
- **T6.2**: Documentación final y guía de despliegue auto‑servicio.
- **T6.3**: Plan de precios modular por dominio.

## 3. Controlador de Estado de Tareas
Dentro de `instructions/taskController.ts`, proponer:

```ts
import fs from 'fs';
import path from 'path';

export type Status = 'pending' | 'in_progress' | 'done' | 'failed';

export interface Task {
  id: string;
  title: string;
  sprint: number;
  status: Status;
  criteria: string[];
}

export class TaskController {
  private tasksFile = path.resolve(__dirname, 'tasks.json');
  private tasks: Task[];

  constructor() {
    this.tasks = JSON.parse(fs.readFileSync(this.tasksFile, 'utf-8'));
  }

  getStatus(id: string): Status {
    const t = this.tasks.find(task => task.id === id);
    return t ? t.status : 'pending';
  }

  markInProgress(id: string) { this.updateStatus(id, 'in_progress'); }
  markDone(id: string) { this.updateStatus(id, 'done'); }
  markFailed(id: string) { this.updateStatus(id, 'failed'); }

  private updateStatus(id: string, status: Status) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.tasks[idx].status = status;
      fs.writeFileSync(this.tasksFile, JSON.stringify(this.tasks, null, 2));
    }
  }

  validateCompletion(id: string): boolean {
    const t = this.tasks.find(task => task.id === id);
    if (!t) return false;
    return t.status === 'done';
  }
}
```

Y la plantilla de `instructions/tasks.json`:

```json
[
  { "id": "T1.1", "title": "Extract promptCore", "sprint": 1, "status": "pending", "criteria": ["Tests passed"] },
  { "id": "T1.2", "title": "Implement router", "sprint": 1, "status": "pending", "criteria": ["90% accuracy"] }
  // ... resto de tareas
]
```

---
*Este documento es la guía maestra para que la IA avance en cada mejora y desarrollo del sistema.*
