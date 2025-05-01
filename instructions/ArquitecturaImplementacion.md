# Implementación de ARQUIA: Asistente para Estudios de Arquitectura

## Visión general
ARQUIA es un asistente de IA especializado en apoyar estudios de arquitectura residencial, implementado como un nuevo dominio en el sistema V3. Su objetivo es facilitar la comunicación con clientes, gestionar citas y proporcionar información sobre proyectos arquitectónicos.

## Componentes implementados

### 1. Plantillas Handlebars (assets/prompts/arquitectura/)
Se han creado cuatro plantillas específicas:
- `welcome.hbs`: Saludo inicial del asistente
- `scheduleVisit.hbs`: Respuesta para agendar visitas
- `projectStatus.hbs`: Respuesta con estado de proyecto (fase, avance, fechas)
- `benefits.hbs`: Lista de beneficios que ofrece ARQUIA

Todas las plantillas utilizan iconos de texto (✅, 📅, 📈) para mejorar la legibilidad, siguiendo los requisitos especificados.

### 2. Prompt principal (assets/prompts/arquitectura/prompt_DeepSeek.txt)
Contiene las instrucciones específicas para que el modelo AI actúe como ARQUIA, incluyendo:
- Misión y funciones principales
- Tono profesional y cercano
- Ejemplos de diálogos
- Restricciones (concisión, enfoque en arquitectura)

### 3. Motor de plantillas (src/core/templateEngine.ts)
Se ha implementado un motor de plantillas Handlebars que:
- Carga plantillas de forma dinámica por dominio
- Renderiza plantillas con variables de contexto
- Maneja errores de forma elegante

### 4. Enrutamiento de dominios (src/core/domain.ts)
Se ha creado un enum `DOMAIN` que incluye `ARQUITECTURA` y funciones para:
- Verificar si un valor es un dominio válido
- Detectar automáticamente el dominio basado en palabras clave

### 5. Controlador de conversación (src/core/ConversacionController.ts)
Controla el flujo de la conversación:
- Detecta intenciones (saludos, agendar visitas, consultas de proyecto)
- Extrae metadatos relevantes del mensaje
- Genera respuestas basadas en dominio e intención
- Usa AI para intenciones no reconocidas

### 6. Flujo de arquitectura (src/templates/arquitecturaFlow.ts)
Implementa la lógica específica para:
- Manejar saludos personalizados
- Ofrecer slots disponibles para visitas
- Mostrar estado de proyectos con porcentaje de avance
- Listar beneficios del sistema

### 7. Integración con sistema existente (src/templates/index.ts)
Se ha registrado el flujo de ARQUIA como parte del sistema de diálogo:
- Keywords específicos ("arquitectura", "arquia", "plano", etc.)
- Integración con el mecanismo de flujos de BuilderBot

## Ejemplo de uso
1. El usuario inicia con "Hola ARQUIA"
2. ARQUIA responde con su saludo personalizado
3. El usuario puede:
   - Solicitar agendar una visita
   - Consultar el estado de un proyecto
   - Preguntar por los beneficios del sistema

## Próximos pasos
1. **Mejoras de detección de intenciones**: Ampliar las palabras clave para reconocer más casos
2. **Conexión con servicios reales**: Integrar con Google Calendar para disponibilidad real
3. **Base de datos de proyectos**: Implementar sistema para almacenar y consultar estados de proyectos
4. **Personalización por estudio**: Permitir que cada estudio personalice su asistente ARQUIA

## Documentación técnica
Para agregar nuevos dominios similares:
1. Crear carpeta `assets/prompts/[nuevo-dominio]/`
2. Definir plantillas Handlebars (.hbs) para cada tipo de respuesta
3. Añadir el dominio al enum `DOMAIN` en domain.ts
4. Implementar flujo específico y palabras clave en index.ts
