# MVP Odontológico - V3 WhatsApp

Este MVP adapta la plataforma V3 para su uso en una clínica odontológica, permitiendo la gestión de pacientes y citas dentales a través de WhatsApp.

## Características principales

- **Registro de pacientes** vía WhatsApp
- **Agendamiento de citas dentales** categorizado por tipo de procedimiento
- **Confirmaciones automáticas** de citas
- **Recordatorios** 24 horas antes de la cita
- **Integración** con Google Calendar y Google Sheets
- **Asistente virtual dental** con información sobre procedimientos

## Configuración

### Variables de entorno

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

```
# Google API
clientEmail=your-service-account@google.com
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----
spreadsheetId=YOUR_SPREADSHEET_ID_HERE         # Hoja para citas
GOOGLE_CALENDAR_ID=primary                      # ID del calendario (o 'primary')
PATIENTS_SPREADSHEET_ID=YOUR_PATIENTS_SHEET_ID  # Hoja para pacientes

# Meta WhatsApp API
jwtToken=YOUR_JWT_TOKEN_HERE
numberId=YOUR_NUMBER_ID_HERE
verifyToken=YOUR_VERIFY_TOKEN_HERE
```

### Preparación de Google Sheets

Ejecuta el script de configuración para crear las hojas necesarias:

```bash
node scripts/create_dental_sheets.js
```

Este script creará las siguientes hojas:

1. **Pacientes** (en la hoja definida en `PATIENTS_SPREADSHEET_ID`)
   - Columnas: Fecha Registro, Nombre, Teléfono, Email, Notas, ID Paciente

2. **Citas Odontologicas** (en la hoja definida en `spreadsheetId`)
   - Columnas: Fecha Inicio, Fecha Fin, Título, Descripción, ID Evento, Estado, Fecha Creación, ID Paciente, Tipo Procedimiento

## Flujos implementados

### Registro de paciente y agendamiento

1. El paciente inicia la conversación en WhatsApp con palabras clave como "cita", "dentista", etc.
2. El bot solicita nombre y teléfono para registrar al paciente
3. El sistema guarda los datos en Google Sheets y genera un ID único
4. El bot solicita el tipo de procedimiento (Consulta, Limpieza, Endodoncia, etc.)
5. El paciente selecciona fecha y hora para su cita
6. El sistema verifica disponibilidad, crea el evento en Google Calendar y confirma la cita
7. 24 horas antes, se envía un recordatorio automático

## Arquitectura

- **services/patients.service.ts**: Gestión de pacientes dentales
- **services/appointments.service.ts**: Gestión de citas con tipos de procedimientos dentales
- **assets/prompts/prompt_DeepSeek.txt**: Personalización del asistente para contexto odontológico

## Próximos pasos

- Implementación de historial dental
- Odontograma interactivo
- Integración con sistema de facturación
- Gestión de imágenes radiográficas
- Recordatorios post-tratamiento

## Ejemplo de uso

Una vez configurado, el paciente puede interactuar con el sistema con mensajes como:

"Quiero agendar una cita con el dentista"
"Necesito una consulta dental"
"Me gustaría una limpieza"

El sistema guiará al paciente a través del proceso completo.
