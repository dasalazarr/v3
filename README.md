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

## Licencia
MIT License - Ver [LICENSE](LICENSE)

---

✅ **Estado Actual**: Funcionalidad básica operativa  
🚧 **Próximos Pasos**: Implementar sistema de clasificación de intenciones  
🔧 **Mantenimiento**: Actualización periódica de dependencias