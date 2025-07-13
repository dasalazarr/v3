# Multi-Agent Running Coach 🏃‍♂️🤖

This project contains a multi-agent running coach that interacts with runners over WhatsApp.  
Agents powered by large language models generate personalised advice and maintain long-term context using vector memory.

## Key Features
- 🧠 Orchestrates several agents with tool calling
- 💬 Conversation history stored in Redis
- 🔍 Context retrieval via Qdrant vector search
- 📅 Generates VDOT based training plans
- 📊 Logs workouts to Google Sheets
- 🚨 Robust error handling and auditing

## Technologies
- **TypeScript** for all packages
- **OpenAI & DeepSeek** language models
- **Redis + Qdrant** for vector memory
- **Docker** for containerised deployment

## Packages
- **api-gateway** (`apps/api-gateway`): Express API and WhatsApp integration.
- **llm-orchestrator** (`packages/llm-orchestrator`): Coordinates agents and tool calls.
- **vector-memory** (`packages/vector-memory`): Redis chat buffer with Qdrant search.
- **plan-generator** (`packages/plan-generator`): Generates training plans using VDOT.

## Requisitos Previos
- Node.js 18+
- Cuenta de WhatsApp Business
- API Key de OpenAI
- Google Service Account (credentials.json)
- Docker (opcional)

## Instalación
```bash
git clone [repo-url]
cd running-coach-workspace
npm install
cp .env.example .env
```

## Configuración (`.env`)
```ini
# DeepSeek LLM
DEEPSEEK_API_KEY=YOUR_API_KEY_HERE
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# OpenAI Embeddings
EMBEDDINGS_API_KEY=your_openai_api_key
EMBEDDINGS_BASE_URL=https://api.openai.com/v1
EMBEDDINGS_MODEL=text-embedding-ada-002

# Meta WhatsApp API
jwtToken=your_jwt_token
numberId=your_number_id
verifyToken=your_verify_token

# Google API
clientEmail=your-service-account@google.com
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----
spreadsheetId=your_spreadsheet_id
TRAINING_SPREADSHEET_ID=your_training_sheet_id
GOOGLE_CALENDAR_ID=primary

# Otros
ASSISTANT_ID=asst_your_id
PORT=3000
```

---

## Flujo de configuración y variables de entorno

La configuración de todas las variables de entorno y parámetros críticos del sistema está centralizada en el archivo [`src/config/index.ts`].

- **Fuente de la verdad**: Aquí se definen, validan y documentan todas las variables necesarias para el funcionamiento del sistema.
- **Consumo en el proyecto**: El resto del código debe importar el objeto `config` y el tipo `Config` desde `src/config.ts` o directamente desde `src/config/index.ts`.
- **Actualización de variables**: Si necesitas agregar o modificar una variable, hazlo únicamente en `src/config/index.ts` y refleja el cambio en `.env.example` y en este README.
- **Validación**: El sistema realiza validaciones y muestra advertencias si falta alguna variable crítica al iniciar.

> **Recomendación:** Mantén sincronizados los archivos de ejemplo y documentación para evitar errores de configuración en despliegues futuros.

### Nota importante sobre la clave privada de Google

La clave privada (`privateKey`) debe incluir los saltos de línea correctamente escapados con `\n`. Si estás copiando la clave desde un archivo JSON, asegúrate de reemplazar los saltos de línea literales por `\n`.

Ejemplo:
```
privateKey="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj...\n...\n-----END PRIVATE KEY-----"
```

## Estructura del Proyecto
```
├── apps/
│   └── api-gateway/       # API HTTP y webhook de WhatsApp
├── packages/
│   ├── llm-orchestrator/  # Coordinación de agentes y prompts
│   ├── vector-memory/     # Memoria en Redis y Qdrant
│   ├── plan-generator/    # Generador de planes de entrenamiento
│   ├── database/          # Migraciones y adaptadores
│   └── shared/            # Utilidades comunes
├── src/                   # Servicios heredados
└── instructions/          # Documentación
```

## Arquitectura del Sistema

### Servicios Principales

#### 1. SheetsService
Gestiona todas las interacciones con Google Sheets, incluyendo:
- Creación y gestión de hojas de cálculo
- Almacenamiento de datos de usuarios y gastos
- Consultas y análisis de datos

#### 2. ExpenseService
Maneja el registro y análisis de gastos:
- Validación de datos de gastos
- Categorización de gastos
- Cálculo de totales por categoría y período

#### 3. BudgetService
Gestiona los presupuestos de los usuarios:
- Creación y actualización de presupuestos
- Monitoreo de límites de gasto
- Detección de anomalías en patrones de gasto

#### 4. AlertService
Sistema de notificaciones para usuarios:
- Alertas de umbral de presupuesto
- Notificaciones de gastos anómalos
- Recordatorios personalizados

### Patrones de Diseño Implementados

#### Inyección de Dependencias
Utilizamos `tsyringe` para gestionar dependencias entre servicios, lo que facilita:
- Pruebas unitarias mediante mocking
- Desacoplamiento de componentes
- Gestión centralizada de instancias

#### Singleton Pattern
Los servicios principales se implementan como singletons para garantizar:
- Una única instancia por servicio
- Estado compartido consistente
- Optimización de recursos

#### Builder Pattern
Los flujos conversacionales utilizan el patrón Builder a través del framework BuilderBot:
- Construcción fluida de conversaciones
- Separación clara de responsabilidades
- Fácil mantenimiento y extensión

## Optimizaciones Implementadas

### 1. Sistema de Caché
- Implementación de caché en memoria para reducir llamadas a Google Sheets API
- TTL (Time-To-Live) configurable para invalidación automática de caché
- Caché selectiva para operaciones frecuentes como verificación de existencia de hojas

### 2. Manejo Asíncrono
- Uso consistente de async/await para operaciones I/O
- Procesamiento en paralelo cuando es posible
- Evitar bloqueos en el hilo principal

### 3. Manejo Robusto de Errores
- Clases de error personalizadas para diferentes tipos de fallos
- Logging estratégico para facilitar el diagnóstico
- Recuperación automática de errores transitorios

### 4. Tareas Programadas
- Sistema de tareas en segundo plano para procesos periódicos
- Detección automática de anomalías en patrones de gasto
- Generación y envío de alertas basadas en umbrales

## Despliegue
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start

# Docker
docker-compose up --build
```

## Dependencias Clave
```json
"dependencies": {
  "@builderbot/bot": "1.2.2",
  "googleapis": "^144.0.0",
  "openai": "^4.77.0",
  "tsyringe": "^4.8.0"
}
```

## Diagrama de Flujo
```
Usuario → WhatsApp → BuilderBot → OpenAI → Google Sheets
          │          │          │
          │          ├← Thread ID ←┤
          └← Respuesta IA ←┘
```

## Troubleshooting
- **Error de Assistant ID**: Verificar `.env` y credenciales OpenAI
- **Errores de Sheets**: Validar permisos de la service account
- **Problemas de build**: Ejecutar `npm install --force`

## Roadmap del Producto

### Fase 1: Funcionalidad Básica Operativa (Actual)
- [x] Integración con WhatsApp
- [x] Registro de conversaciones en Google Sheets
- [x] Manejo de threads de conversación persistentes
- [x] Clasificación de interacciones por usuario

### Fase 2: Mejoras en la Experiencia del Usuario (Q2 2025)
**Entrega 1: Procesamiento de Entrada Inteligente**
- Procesamiento de fechas naturales
- Soporte para múltiples monedas
- Procesamiento de imágenes de recibos
- Grabación de notas de voz para gastos

**Entrega 2: Categorización Inteligente**
- Gestión de categorías personalizadas
- Sugerencias de categorías basadas en historial
- Detección automática de gastos recurrentes
- Alertas y notificaciones de presupuesto

### Fase 3: Análisis Financieros (Q3 2025)
**Entrega 1: Panel de Análisis**
- Informes de gastos mensuales
- Análisis por categorías
- Visualización de tendencias
- Comparación de presupuesto vs. real

**Entrega 2: Recomendaciones Inteligentes**
- Consejos personalizados de ahorro
- Sugerencias de optimización de gastos
- Asistente de planificación de presupuesto
- Detección de anomalías

### Fase 4: Características Avanzadas (Q4 2025)
**Entrega 1: Soporte para Múltiples Usuarios**
- Gestión de cuentas familiares
- Compartir gastos
- Seguimiento de presupuesto grupal
- Control de acceso basado en roles

**Entrega 2: Centro de Integración**
- Integración con cuentas bancarias
- Exportación a software de contabilidad popular
- Generación de informes de impuestos
- Seguimiento de inversiones

### Fase 5: Mejora de la IA (Q1 2026)
**Entrega 1: Análisis Predictivo**
- Predicción de gastos futuros
- Pronóstico de flujo de caja
- Recomendaciones de presupuesto inteligentes
- Planificación de objetivos financieros

**Entrega 2: Inteligencia Conversacional**
- Respuestas contextuales
- Soporte para múltiples idiomas
- Integración de educación financiera
- Asesoramiento financiero personalizado


## Contribuir

1. Crear una bifurcación del repositorio
2. Crear una rama para tu característica
3. Confirmar tus cambios
4. Empujar a la rama
5. Crear una solicitud de extracción

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para detalles.

---

✅ **Estado Actual**: Funcionalidad básica operativa  
🚧 **Próximos Pasos**: Implementar sistema de clasificación de intenciones  
🔧 **Mantenimiento**: Actualización periódica de dependencias
