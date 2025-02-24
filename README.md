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
API_KEY=sk-tu-key-openai
ASSISTANT_ID=asst_tu_id_asistente
SPREADSHEET_ID=id_google_sheet
PRIVATE_KEY="-----BEGIN PRIVATE KEY...\n"
CLIENT_EMAIL=tu-service-account@project.iam.gserviceaccount.com
JWT_TOKEN=token_whatsapp
NUMBER_ID=id_numero_whatsapp
```

## Estructura del Proyecto
```
├── src
│   ├── config/       # Configuración y variables de entorno
│   ├── services/     # Lógica de negocio
│   │   ├── aiServices.ts    # Integración OpenAI
│   │   └── sheetsServices.ts # Conexión Google Sheets
│   ├── templates/    # Flujos de conversación
│   └── app.ts        # Punto de entrada principal
```

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