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
```
