# Tech Stack Document - Khipu: Asistente Financiero por WhatsApp

## Resumen Técnico

Este documento proporciona detalles técnicos exhaustivos sobre el stack tecnológico utilizado en el desarrollo y funcionamiento de Khipu, incluyendo lenguajes de programación, frameworks, bibliotecas, APIs externas y herramientas de desarrollo. También se incluyen enlaces a la documentación relevante para cada componente.

## Tecnologías Base

### Lenguajes de Programación

- **TypeScript 4.9+**
  - Superset tipado de JavaScript que mejora la mantenibilidad y detección de errores
  - Documentación: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
  - Configuración de tsconfig.json específica para Node.js con ESM

### Runtime & Entorno

- **Node.js 18.x+**
  - Entorno de ejecución para JavaScript del lado del servidor
  - Documentación: [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
  - Soporte para ESM y mejoras de rendimiento en procesamiento asíncrono

## Frameworks y Librerías Principales

### Framework de Chatbot

- **BuilderBot 1.0.0**
  - Framework para desarrollo de chatbots conversacionales
  - GitHub: [https://github.com/codigoencasa/bot-whatsapp](https://github.com/codigoencasa/bot-whatsapp)
  - Componentes utilizados:
    - `@builderbot/bot`: Núcleo del framework para gestión de flujos
    - `@builderbot/provider-meta`: Proveedor específico para integración con WhatsApp
    - `MemoryDB`: Base de datos en memoria para gestión de estado conversacional

### Gestión de Dependencias

- **tsyringe 4.7.0**
  - Contenedor ligero de inyección de dependencias
  - GitHub: [https://github.com/microsoft/tsyringe](https://github.com/microsoft/tsyringe)
  - Implementación mediante decoradores para facilitar la modularidad

### Utilidades de Fecha y Tiempo

- **date-fns 2.29.3**
  - Biblioteca moderna para manipulación de fechas
  - Documentación: [https://date-fns.org/docs/](https://date-fns.org/docs/)
  - Implementaciones usadas:
    - `format`: Para formateo consistente de fechas
    - `es` locale: Para presentación de fechas en español

### Variables de Entorno

- **dotenv 16.0.3**
  - Carga de variables de entorno desde archivos .env
  - GitHub: [https://github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)
  - Implementación mediante importación directa

## APIs Externas

### WhatsApp Business API

- **Meta WhatsApp Business API**
  - API oficial para integración con WhatsApp
  - Documentación: [https://developers.facebook.com/docs/whatsapp/](https://developers.facebook.com/docs/whatsapp/)
  - Versión utilizada: v17.0
  - Credenciales requeridas:
    - JWT Token
    - Number ID
    - Verify Token

### Inteligencia Artificial

- **DeepSeek API**
  - API de IA para procesamiento de lenguaje natural
  - Documentación: [https://api.deepseek.com/docs](https://api.deepseek.com/docs)
  - Endpoints principales:
    - `/chat/completions`: Para procesamiento conversacional
  - Parámetros importantes:
    - `model`: Modelo de lenguaje (default: "deepseek-chat")
    - `temperature`: Control de creatividad (default: 0.7)
    - `max_tokens`: Límite de tokens en respuesta (default: 1000)

### Google Sheets API

- **Google Sheets API v4**
  - API para interacción con hojas de cálculo de Google
  - Documentación: [https://developers.google.com/sheets/api](https://developers.google.com/sheets/api)
  - Métodos utilizados:
    - `spreadsheets.values.get`: Para lectura de datos
    - `spreadsheets.values.append`: Para agregar nuevos registros
    - `spreadsheets.create`: Para crear nuevas hojas
    - `spreadsheets.batchUpdate`: Para formateo y validación
  - Autenticación:
    - Service Account con JSON Key (privateKey, clientEmail)

## Patrones de Diseño y Arquitectura

### Inyección de Dependencias
El sistema utiliza el patrón de inyección de dependencias a través de la biblioteca `tsyringe`. Esto permite:

- **Desacoplamiento**: Los servicios no están fuertemente acoplados entre sí
- **Facilidad de testing**: Las dependencias pueden ser mockeadas para pruebas unitarias
- **Gestión centralizada**: Control sobre las instancias de servicios

Ejemplo de implementación:
```typescript
@injectable()
export class BudgetService {
  constructor(
    @inject("SheetsService") private sheetManager: SheetsService,
    @inject("ExpenseService") private expenseService: ExpenseService
  ) {}
}
```

### Singleton Pattern
Los servicios principales se implementan como singletons para garantizar una única instancia:

```typescript
export default new BudgetService(sheetsServices, expenseService);
```

### Builder Pattern
Los flujos conversacionales utilizan el patrón Builder a través del framework BuilderBot:

```typescript
const budgetFlow = addKeyword(['presupuesto', 'presupuestos'])
  .addAnswer('...')
  .addAction(async () => {...})
  .addAnswer('...', { capture: true }, async () => {...});
```

## Dependency Injection with tsyringe

The application uses `tsyringe` for dependency injection, which provides several benefits:

1. **Loose Coupling**
   - Services are decoupled from their dependencies
   - Dependencies are injected at runtime
   - Makes testing easier through mocking

2. **Singleton Management**
   - Services are registered as singletons
   - Ensures only one instance of each service exists
   - Provides consistent state across the application

3. **Setup Requirements**
   - Requires `reflect-metadata` polyfill
   - Must be imported at the top of the entry point file
   - Uses TypeScript decorators for registration

### Example Usage

```typescript
// Registration
@singleton()
class SheetsService {
  // Service implementation
}

// Injection
@singleton()
class BudgetService {
  constructor(
    @inject(SheetsService) private sheetManager: SheetsService
  ) {}
  
  // Service methods
}

// Default export (instance, not class)
export default new BudgetService();
```

This pattern is used throughout the application to manage dependencies and ensure proper service instantiation.

## Error Handling and Resilience

### Error Handling Strategy

The application implements a comprehensive error handling strategy:

1. **Granular Error Catching**
   - Each method includes try-catch blocks to handle specific errors
   - Detailed error logging with context information for easier debugging
   - Appropriate default values returned on error to prevent cascading failures

2. **Service Resilience**
   - Services are designed to handle API failures gracefully
   - Retry mechanisms for transient errors in external API calls
   - Fallback strategies when primary operations fail

3. **Data Validation**
   - Input validation before processing to prevent errors
   - Output validation to ensure data integrity
   - Schema validation for external data sources

### Optimization Techniques

The application implements several optimization techniques to improve performance:

1. **Caching Strategy**
   - In-memory caching for frequently accessed data
   - TTL (Time-To-Live) mechanism for cache invalidation
   - Selective caching for high-cost operations

2. **API Call Optimization**
   - Batched operations to reduce API calls
   - Pagination for large data sets
   - Request throttling to prevent rate limiting

3. **Resource Management**
   - Connection pooling for external services
   - Memory usage optimization
   - Asynchronous processing for I/O-bound operations

## Optimización y Rendimiento

### Manejo Asíncrono
El sistema utiliza promesas y async/await para operaciones I/O, garantizando un rendimiento óptimo:

```typescript
async getExpensesByCategory(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
  try {
    // Operaciones asíncronas
  } catch (error) {
    // Manejo de errores
  }
}
```

### Patrones de Error
El código implementa un manejo de errores robusto mediante clases de error personalizadas:

```typescript
class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetError';
  }
}
```

### Logging Estratégico
Se implementa un sistema de logging para facilitar el diagnóstico de problemas:

```typescript
console.log("✅ Tareas programadas iniciadas");
console.error("Error al calcular gastos mensuales:", error);
```

## Seguridad

### Autenticación OAuth 2.0
El acceso a las APIs de Google utiliza OAuth 2.0:

- Autenticación mediante cuentas de servicio
- Almacenamiento seguro de credenciales en variables de entorno
- Permisos de ámbito limitado

### Validación de Entrada
Todos los inputs del usuario son validados antes de su procesamiento:

```typescript
if (!expense.date || !(expense.date instanceof Date)) {
  throw new ExpenseError('La fecha es inválida');
}
```

## Escalabilidad

### Tareas Programadas
El sistema implementa un gestor de tareas programadas para procesos en segundo plano:

```typescript
startAnomalyDetection(): void {
  const INTERVAL = 24 * 60 * 60 * 1000; // Daily
  this.anomalyCheckInterval = setInterval(() => {
    this.checkAnomalies();
  }, INTERVAL);
}
```

### Manejo de Cierre
Implementación de manejo de señales del sistema para cierre controlado:

```typescript
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Herramientas de Desarrollo

### Compilación y Bundling

- **Rollup 3.20.2**
  - Bundler para JavaScript modular
  - Documentación: [https://rollupjs.org/guide/en/](https://rollupjs.org/guide/en/)
  - Configuración en rollup.config.js para optimización de producción

### Desarrollo con Hot Reload

- **Nodemon 2.0.22**
  - Utilidad para reinicio automático durante desarrollo
  - GitHub: [https://github.com/remy/nodemon](https://github.com/remy/nodemon)
  - Configuración en nodemon.json para observar cambios en archivos TS

### Linting y Formato

- **ESLint 8.37.0**
  - Linter configurable para TypeScript
  - Configuración en .eslintrc.json con reglas específicas
  - Plugins utilizados:
    - `@typescript-eslint/eslint-plugin`: Reglas específicas para TypeScript

## Containerización y Despliegue

### Docker

- **Docker y Docker Compose**
  - Para containerización y orquestación
  - Dockerfile multietapa para optimización:
    - Etapa de build: Node Alpine para transpilación
    - Etapa de producción: Node Alpine mínimo
  - Configuración de docker-compose.yml para desarrollo local

## Dependencias del Package.json

A continuación se presenta una lista detallada de todas las dependencias con versiones específicas que deben instalarse:

```json
{
  "dependencies": {
    "@builderbot/bot": "^1.0.0",
    "@builderbot/provider-meta": "^1.0.0",
    "date-fns": "^2.29.3",
    "dotenv": "^16.0.3",
    "tsyringe": "^4.7.0"
  },
  "devDependencies": {
    "@types/node": "^18.15.11",
    "@typescript-eslint/eslint-plugin": "^5.57.1",
    "@typescript-eslint/parser": "^5.57.1",
    "eslint": "^8.37.0",
    "nodemon": "^2.0.22",
    "rollup": "^3.20.2",
    "rollup-plugin-commonjs": "^10.1.0",
    "rollup-plugin-node-resolve": "^5.2.0",
    "rollup-plugin-typescript2": "^0.34.1",
    "typescript": "^5.0.3"
  }
}
```

## Scripts de Ejecución

En el package.json se incluyen los siguientes scripts:

```json
{
  "scripts": {
    "start": "node dist/app.js",
    "build": "rollup -c",
    "dev": "nodemon",
    "lint": "eslint . --ext .ts"
  }
}
```

## Variables de Entorno Requeridas

Para la configuración completa de la aplicación, se requiere un archivo `.env` con las siguientes variables:

```
# WhatsApp Meta API
jwtToken=your_jwt_token_here
numberId=your_number_id_here
verifyToken=your_verify_token_here

# DeepSeek API
apiKey=your_deepseek_api_key_here
baseURL=https://api.deepseek.com/v1
Model=deepseek-chat

# Google Sheets API
spreadsheetId=your_spreadsheet_id_here
privateKey=your_private_key_here
clientEmail=your_client_email_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Notas de Implementación

Al instalar las dependencias, se recomienda utilizar la versión específica indicada para evitar incompatibilidades. El comando de instalación recomendado es:

```
npm install
```

Para entornos de desarrollo, ejecutar:

```
npm run dev
```

Para producción, primero construir y luego ejecutar:

```
npm run build
npm start
```

Para sistemas en producción, se recomienda utilizar Docker:

```
docker-compose up -d
