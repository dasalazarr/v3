# Project Requirements Document (PRD) - Khipu: Asistente Financiero por WhatsApp

## 1. App Overview

Khipu es un asistente financiero conversacional implementado como un chatbot de WhatsApp, diseñado para ayudar a los usuarios a gestionar sus finanzas personales de manera eficiente. El sistema permite registrar gastos a través de conversaciones naturales, clasificar automáticamente los gastos utilizando inteligencia artificial, y almacenar toda la información en hojas de cálculo de Google para facilitar el seguimiento y análisis.

El nombre "Khipu" se inspira en el sistema de registro contable utilizado por los Incas, simbolizando un enfoque innovador para la gestión financiera personal a través de la tecnología moderna.

## 2. User Flow

1. **Primer Contacto**: El usuario contacta al bot por primera vez a través de WhatsApp y es directamente dirigido al flujo FAQ sin necesidad de registro.

2. **Interacción Diaria**: El usuario puede enviar mensajes en lenguaje natural describiendo sus gastos (ej. "Gasté $45 en comida ayer").

3. **Procesamiento Automático**: El sistema detecta patrones de gasto, extrae la información relevante y clasifica el gasto en categorías predefinidas.

4. **Gestión de Citas**: El usuario puede programar, modificar o cancelar citas a través de la conversación, utilizando frases como "quiero agendar una cita".

5. **Confirmación y Feedback**: El sistema confirma el registro del gasto o la programación de citas y ofrece opciones para corregir información si es necesario.

6. **Consultas y Reportes**: El usuario puede solicitar información sobre sus gastos (ej. "¿Cuánto gasté este mes en comida?") y recibir resúmenes personalizados.

## 3. Tech Stack & APIs

### Frontend
- **WhatsApp Business API**: Como interfaz principal para la interacción con el usuario

### Backend
- **Node.js & TypeScript**: Para la lógica del servidor
- **BuilderBot**: Framework para la gestión de flujos conversacionales
- **Docker**: Para containerización y despliegue

### APIs Externas
- **Meta WhatsApp Business API**: Para la mensajería
- **DeepSeek API**: Para procesamiento de lenguaje natural y clasificación
- **Google Sheets API**: Para almacenamiento y gestión de datos
- **Google Calendar API**: Para gestión de citas

### Base de Datos
- **Google Sheets**: Como sistema de almacenamiento principal

## 4. Core Features

1. **Procesamiento de Lenguaje Natural**: Capacidad para comprender e interpretar mensajes en lenguaje natural del usuario.

2. **Detección Inteligente de Gastos**: Capacidad para identificar información financiera en lenguaje natural.

3. **Categorización Automática**: Clasificación de gastos utilizando IA basada en la descripción.

4. **Seguimiento de Gastos**: Creación automática de hojas mensuales con formato adecuado.

5. **Gestión de Citas**: Sistema completo para programar, modificar y cancelar citas con integración a Google Calendar.

6. **Consultas en Lenguaje Natural**: Capacidad para responder a preguntas sobre gastos históricos.

7. **Reportes Periódicos**: Generación automática de resúmenes (diarios, semanales, mensuales).

8. **Alertas Personalizadas**: Notificaciones sobre gastos que exceden límites predefinidos.

## 5. In-Scope vs. Out-of-Scope

### In-Scope
- Registro de gastos mediante mensajes de texto
- Categorización automática de gastos
- Consultas sobre gastos históricos
- Reportes básicos por categoría y período
- Integración con Google Sheets para almacenamiento
- Recordatorios para registro de gastos
- Programación y gestión de citas a través de WhatsApp
- Integración con Google Calendar para gestión de citas

### Out-of-Scope
- Integración directa con cuentas bancarias
- Procesamiento de pagos o transferencias
- Reconocimiento de imágenes de recibos
- Presupuestos colaborativos (múltiples usuarios)
- Integración con plataformas fiscales
- Aplicación móvil dedicada (se utiliza exclusivamente WhatsApp)

## 6. Non-Functional Requirements

### Rendimiento
- Tiempo de respuesta menor a 3 segundos para consultas estándar
- Capacidad para manejar hasta 1,000 usuarios concurrentes
- Disponibilidad del 99.5% en horario de operación (24/7)

### Seguridad
- Protección de datos personales según normativas GDPR
- No almacenar información financiera sensible (números de tarjetas, etc.)
- Autenticación segura para acceso a las hojas de cálculo
- Cifrado en tránsito para todas las comunicaciones

### Escalabilidad
- Diseño modular que permite añadir nuevas funcionalidades
- Capacidad para escalar horizontalmente con aumento de usuarios

### Usabilidad
- Interacción conversacional intuitiva sin necesidad de comandos específicos
- Feedback claro sobre acciones completadas y errores
- Soporte para corrección de información ingresada erróneamente

## 7. Constraints & Assumptions

### Constraints
- Limitaciones de la API de WhatsApp (tipos de mensajes, frecuencia)
- Cuotas y límites de las APIs de DeepSeek y Google Sheets
- Dependencia de servicios externos (disponibilidad, cambios en APIs)
- Necesidad de conexión a internet por parte del usuario

### Assumptions
- Los usuarios tienen acceso a WhatsApp
- Los patrones de gasto pueden ser detectados en lenguaje natural
- Los usuarios prefieren interacción por chat sobre interfaces gráficas
- La mayoría de los gastos pueden ser categorizados automáticamente
- Los usuarios proporcionarán feedback para mejorar la categorización
- Las fechas y horas para citas pueden ser interpretadas correctamente desde lenguaje natural
- Los usuarios prefieren gestionar sus citas a través de WhatsApp sin necesidad de otros sistemas

## 8. Known Issues & Potential Pitfalls

### Issues
- Posible degradación del rendimiento con aumento significativo de usuarios
- Limitaciones en el procesamiento de lenguaje natural en casos ambiguos
- Riesgo de falsos positivos en la detección de patrones de gasto

### Pitfalls
- **Dependencia de Servicios Externos**: Cambios en las políticas de WhatsApp o Google podrían afectar el funcionamiento.
- **Escalabilidad de Google Sheets**: Para volúmenes muy grandes de datos, podrían surgir limitaciones.
- **Seguridad de Datos**: Aunque no se almacenan datos financieros sensibles, la información de gastos podría ser valiosa para atacantes.
- **Expectativas de Usuario**: Los usuarios podrían esperar funcionalidades avanzadas como integración bancaria directa.
- **Mantenimiento de Categorías**: La evolución de patrones de gasto podría requerir actualizaciones frecuentes en el sistema de categorización.

### Mitigación
- Diseño modular para facilitar adaptación a cambios en APIs externas
- Implementación de sistema de caché para reducir dependencia de servicios externos
- Monitoreo constante de uso de recursos y patrones de interacción
- Feedback regular de usuarios para mejorar precisión de clasificación
