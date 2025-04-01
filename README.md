# WhatsApp AI Assistant con Integración Google Sheets 🤖📊

Bot inteligente para WhatsApp que combina IA de OpenAI con almacenamiento estructurado en Google Sheets.

## Características Principales
- 🧠 Respuestas inteligentes usando Asistentes de OpenAI
- 📝 Registro de conversaciones en Google Sheets
- 🔄 Manejo de threads de conversación persistentes
- 📊 Clasificación de interacciones por usuario
- 🚨 Sistema de manejo de errores robusto
- 🔍 Auditoría completa de conversaciones

## Tecnologías Clave
- **BuilderBot**: Framework principal para el chatbot
- **OpenAI API**: GPT-3.5-turbo y Asistentes personalizados
- **Google Sheets API**: Almacenamiento de datos
- **TypeScript**: Implementación del core
- **Docker**: Empaquetado y despliegue

## Requisitos Previos
- Node.js 18+
- Cuenta de WhatsApp Business
- API Key de OpenAI
- Google Service Account (credentials.json)
- Docker (opcional)

## Instalación
```bash
git clone [repo-url]
cd base-ts-meta-memory
npm install
cp .env.example .env
```

## Configuración (`.env`)
```ini
# API Keys
apiKey=sk-tu-key-openai
assistant_id=asst_tu_id_asistente

# Meta WhatsApp API
jwtToken=token_whatsapp
numberId=id_numero_whatsapp
verifyToken=tu_verify_token

# Google API (importante para el servicio de citas)
clientEmail=tu-service-account@project.iam.gserviceaccount.com
privateKey="-----BEGIN PRIVATE KEY...\n...\n-----END PRIVATE KEY-----"
spreadsheetId=id_google_sheet
GOOGLE_CALENDAR_ID=primary  # O el ID específico de tu calendario

# Otros
PORT=3000
Model=deepseek-chat
```

### Nota importante sobre la clave privada de Google

La clave privada (`privateKey`) debe incluir los saltos de línea correctamente escapados con `\n`. Si estás copiando la clave desde un archivo JSON, asegúrate de reemplazar los saltos de línea literales por `\n`.

Ejemplo:
```
privateKey="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj...\n...\n-----END PRIVATE KEY-----"
```

## Estructura del Proyecto
```
├── src
│   ├── config/       # Configuración y variables de entorno
│   ├── services/     # Lógica de negocio
│   │   ├── aiServices.ts    # Integración OpenAI
│   │   ├── sheetsServices.ts # Integración Google Sheets
│   │   ├── expenseService.ts # Gestión de gastos
│   │   ├── budgetService.ts  # Gestión de presupuestos
│   │   ├── alertService.ts   # Sistema de alertas
│   │   └── scheduledTasks.ts # Tareas programadas
│   ├── templates/    # Flujos conversacionales
│   │   ├── index.ts          # Punto de entrada de flujos
│   │   ├── mainFlow.ts       # Flujo principal
│   │   ├── registerFlow.ts   # Registro de usuarios
│   │   ├── expenseFlow.ts    # Registro de gastos
│   │   ├── budgetFlow.ts     # Gestión de presupuestos
│   │   └── reportFlow.ts     # Generación de reportes
│   ├── app.ts        # Punto de entrada de la aplicación
│   └── provider/     # Configuración del proveedor de WhatsApp
├── instructions/     # Documentación detallada
└── assets/          # Recursos estáticos
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