# Backend Structure - Khipu: Asistente Financiero por WhatsApp

## Introducción a la Arquitectura Backend

Este documento detalla la estructura del backend de Khipu, enfocándose en la organización de datos, autenticación, y almacenamiento. El sistema utiliza Google Sheets como principal almacenamiento de datos y Google Calendar para la gestión de citas. A continuación se describe la estructura actual y se proporciona una alternativa basada en Supabase para casos de escalabilidad futura.

## Estructura de Bases de Datos

### Modelo de Datos Actual (Google Sheets)

Actualmente, Khipu utiliza Google Sheets con las siguientes hojas:

1. **Users**: Almacena información de usuarios registrados
   - Columnas: PhoneNumber, Name, Email, RegisterDate, LastActive

2. **Expenses_{Month}_{Year}**: Hojas mensuales para registro de gastos
   - Columnas: Date, Description, Category, Amount, PaymentMethod, Notes
   - Formato condicional para montos superiores a umbrales específicos
   - Fórmulas para cálculos automáticos de totales por categoría

3. **Categories**: Lista maestra de categorías disponibles
   - Columnas: CategoryName, Description, Icon, Color

4. **Conversations**: Historial de conversaciones con usuarios
   - Columnas: PhoneNumber, Timestamp, UserMessage, BotResponse

5. **Citas**: Registro de citas programadas
   - Columnas: StartTime, EndTime, Title, Description, EventId, Status, CreatedAt
   - Integración con Google Calendar para sincronización de eventos

### Modelo de Datos Propuesto (Supabase)

Para una implementación escalable en Supabase, se recomienda la siguiente estructura:

#### Tablas Principales

```sql
-- Tabla de Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::JSONB
);

-- Tabla de Categorías
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_default BOOLEAN DEFAULT FALSE
);

-- Tabla de Gastos
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Conversaciones
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  context JSONB DEFAULT '{}'::JSONB
);

-- Tabla de Límites de Alerta
CREATE TABLE alert_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  category_id UUID REFERENCES categories(id),
  threshold_amount DECIMAL(12,2) NOT NULL,
  period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Índices para Optimización

```sql
-- Índices para mejorar el rendimiento de consultas frecuentes
CREATE INDEX expenses_user_id_idx ON expenses(user_id);
CREATE INDEX expenses_category_id_idx ON expenses(category_id);
CREATE INDEX expenses_expense_date_idx ON expenses(expense_date);
CREATE INDEX conversations_user_id_idx ON conversations(user_id);
CREATE INDEX conversations_timestamp_idx ON conversations(timestamp);
```

## Servicios Clave

### SheetsService
1. **Gestión de Hojas de Cálculo**
   - `createSheet(sheetName, headers)`: Crea una nueva hoja con encabezados opcionales
   - `sheetExists(sheetName)`: Verifica si una hoja existe en el documento (con caché)
   - `createSpreadsheet(title)`: Crea un nuevo documento de Google Sheets
   - `getSheetData(sheetName)`: Obtiene todos los datos de una hoja específica
   - `appendRow(sheetName, values)`: Añade una nueva fila a una hoja existente
   - `updateSheetRow(sheetName, rowIndex, values)`: Actualiza una fila específica en una hoja
   - `updateCell(sheetName, row, column, value)`: Actualiza una celda específica
   - `deleteRow(sheetName, rowIndex)`: Elimina una fila específica de una hoja

2. **Gestión de Usuarios**
   - `userExists(phoneNumber)`: Verifica si un usuario existe basado en su número de teléfono
   - `addUser(phoneNumber, name, email)`: Registra un nuevo usuario
   - `getUserData(phoneNumber)`: Obtiene información de un usuario específico

3. **Gestión de Gastos**
   - `createMonthlyExpenseSheet(month, year)`: Crea una hoja mensual para registro de gastos
   - `getExpenseData(month, year)`: Obtiene datos de gastos de un mes específico

4. **Gestión de Conversaciones**
   - `addConverToUser(phoneNumber, messages)`: Registra conversaciones entre usuarios y el bot
   - Crea automáticamente la hoja "Conversations" si no existe

### AppointmentService
1. **Gestión de Citas**
   - `scheduleAppointment(appointment)`: Programa una nueva cita en Google Calendar
   - `updateAppointment(eventId, appointment)`: Actualiza una cita existente
   - `cancelAppointment(eventId)`: Cancela una cita existente
   - `checkConflicts(startTime, endTime)`: Verifica si hay conflictos de horario
   - `addToSheet(eventId, appointment)`: Registra la cita en Google Sheets

2. **Validaciones de Citas**
   - Verifica que la fecha sea posterior a la actual
   - Valida que la cita esté dentro del horario de atención (9:00 a 18:00)
   - Previene conflictos de horario con otras citas existentes
   - Añade automáticamente recordatorios por email y notificaciones

### SheetsService

La clase `SheetsService` es responsable de todas las interacciones con Google Sheets. Proporciona métodos para crear, leer, actualizar y eliminar datos en Google Sheets.

#### Métodos Clave

- `initializeSheets()`: Crea todas las hojas requeridas si no existen
- `createSheet(sheetName, headers)`: Crea una nueva hoja con encabezados opcionales
- `sheetExists(sheetName)`: Verifica si una hoja existe (con caché)
- `appendToSheet(sheetName, rowData)`: Añade una fila de datos a una hoja
- `updateSheetRow(sheetName, rowIndex, values)`: Actualiza una fila específica
- `updateCell(sheetName, row, column, value)`: Actualiza una celda específica
- `getSheetData(sheetName, range)`: Obtiene datos de un rango específico (con caché)
- `getAllUsers()`: Recupera todos los usuarios de la hoja Users
- `userExists(phoneNumber)`: Verifica si un usuario existe
- `createUser(phoneNumber, name, email)`: Crea un nuevo usuario
- `getLastUserConversations(phoneNumber, limit)`: Obtiene conversaciones recientes

#### Características de Optimización

- **Caché**: Implementa caché en memoria para existencia de hojas y recuperación de datos
- **TTL**: Mecanismo de tiempo de vida para invalidación de caché
- **Manejo de Errores**: Manejo integral de errores con registro detallado
- **Validación de Datos**: Valida datos de entrada y maneja casos de borde

### AppointmentService

La clase `AppointmentService` gestiona la programación y administración de citas en Google Calendar.

#### Métodos Clave

- `scheduleAppointment(appointment)`: Programa una nueva cita
- `updateAppointment(eventId, appointment)`: Actualiza una cita existente
- `cancelAppointment(eventId)`: Cancela una cita existente
- `checkConflicts(startTime, endTime)`: Verifica conflictos de horario

#### Características

- **Integración con Google Calendar**: Crea, actualiza y elimina eventos
- **Verificación de Disponibilidad**: Evita conflictos de programación
- **Validaciones**: Garantiza fechas futuras y dentro del horario de atención
- **Registro en Sheets**: Mantiene un registro de todas las citas
- **Recordatorios**: Configura automáticamente notificaciones para citas

### ExpenseService
1. **Registro y Análisis de Gastos**
   - `addExpense(expense)`: Registra un nuevo gasto con validaciones
   - `getExpensesByCategory(startDate, endDate)`: Obtiene gastos agrupados por categoría
   - `getMonthlyExpenses()`: Calcula el total de gastos del mes actual

2. **Utilidades de Fechas**
   - `parseDate(dateStr)`: Convierte strings de fecha en objetos Date
   - `isDateInRange(date, startDate, endDate)`: Verifica si una fecha está en un rango específico

### BudgetService
1. **Gestión de Presupuestos**
   - `createBudget(budget)`: Crea un nuevo presupuesto para una categoría
   - `getBudgets(phoneNumber)`: Obtiene todos los presupuestos de un usuario
   - `updateBudget(budget)`: Actualiza un presupuesto existente
   - `deleteBudget(phoneNumber, category)`: Elimina un presupuesto específico
   - `initializeBudgetSheet()`: Crea la hoja de presupuestos si no existe

2. **Monitoreo y Alertas**
   - `checkBudgetStatus(phoneNumber)`: Verifica el estado de todos los presupuestos de un usuario
   - `detectAnomalies(phoneNumber)`: Detecta gastos anómalos comparando con históricos
   - `generateAlerts(phoneNumber)`: Genera alertas basadas en el estado de los presupuestos

### AIService
1. **Procesamiento de Mensajes**
   - `processMessage(message, phoneNumber)`: Procesa un mensaje de usuario con IA
   - `chat(prompt, messages)`: Realiza la llamada a la API de DeepSeek
   - `loadConversationHistory(phoneNumber)`: Carga el historial de conversaciones previas
   - `updateUserContext(phoneNumber, userMessage, botResponse)`: Actualiza el contexto de conversación

2. **Gestión de Contexto**
   - Mantiene un mapa de contextos de conversación por usuario
   - Implementa límites para mantener solo las últimas interacciones relevantes
   - Integra el historial de conversaciones de Google Sheets

### AlertService
1. **Gestión de Alertas**
   - `initializeAlertSheet()`: Crea la hoja de alertas si no existe
   - `saveAlert(alert)`: Guarda una alerta en la base de datos
   - `getAlerts(phoneNumber)`: Obtiene todas las alertas de un usuario
   - `markAlertAsRead(alertId)`: Marca una alerta como leída
   - `sendAlert(phoneNumber, message)`: Envía una alerta al usuario a través de WhatsApp

2. **Procesamiento de Anomalías**
   - `processAnomalyData(anomalyData)`: Procesa datos de anomalías y genera alertas correspondientes

## Manejo de Contexto de Conversación

El sistema implementa un manejo de contexto de conversación que permite mantener una interacción más natural y coherente con los usuarios. Los componentes clave de esta funcionalidad son:

### Almacenamiento de Contexto

- **Memoria en Tiempo de Ejecución**: Se utiliza un `Map<string, Array<{role: string, content: string}>>` para almacenar el contexto de conversación de cada usuario, indexado por número de teléfono.
- **Persistencia**: Las conversaciones se guardan en la hoja "Conversations" de Google Sheets para mantener un registro histórico.
- **Límite de Contexto**: Se mantienen las últimas 5 interacciones (10 mensajes en total: 5 del usuario y 5 del asistente) para balancear la relevancia del contexto y el rendimiento.
- **Carga Automática**: Al recibir un mensaje, el sistema carga automáticamente el historial de conversaciones previas desde Google Sheets.

### Flujo de Procesamiento con Contexto

1. **Carga Inicial**: Al recibir un mensaje, se carga el historial de conversaciones previas desde Google Sheets.
2. **Enriquecimiento de Consultas**: Cada consulta al modelo de IA incluye el contexto previo, permitiendo respuestas más coherentes.
3. **Actualización**: Después de cada interacción, el contexto se actualiza con el nuevo par de mensajes (usuario y asistente).
4. **Persistencia**: La conversación completa se guarda en Google Sheets para análisis y uso futuro.

### Beneficios del Manejo de Contexto

- **Continuidad en la Conversación**: El asistente puede hacer referencia a información mencionada previamente.
- **Mejor Comprensión de Intenciones**: El contexto ayuda a interpretar mensajes ambiguos o incompletos.
- **Experiencia de Usuario Mejorada**: Las interacciones son más naturales y menos repetitivas.
- **Análisis de Patrones**: El historial completo permite identificar patrones de uso y mejorar el servicio.

## Reconocimiento de Gastos Mejorado

El sistema implementa un reconocimiento de gastos avanzado que permite a los usuarios registrar gastos usando lenguaje natural de diversas formas:

### Patrones de Reconocimiento

El sistema reconoce múltiples formatos de expresión de gastos:

1. **Formato Estándar**: "Gasté 50 en comida" o "Pagué 30 por transporte"
2. **Formato Directo**: "50 en comida" o "30 pesos en transporte"
3. **Formato Descriptivo**: "Compré comida por 25"
4. **Formato con Palabras Numéricas**: "Dos dólares en taxi" o "Cinco pesos en café"

### Procesamiento Inteligente

- **Extracción de Entidades**: Identifica automáticamente el monto, la descripción y, opcionalmente, la fecha del gasto.
- **Inferencia de Categorías**: Asigna categorías basadas en palabras clave en la descripción.
- **Normalización**: Convierte palabras numéricas a valores numéricos (ej. "dos" → 2).
- **Validación**: Verifica que los datos extraídos sean válidos antes de registrarlos.

### Flujo de Registro de Gastos

1. **Análisis del Mensaje**: Se examina el mensaje del usuario para identificar si contiene un comando de gasto.
2. **Extracción de Datos**: Si se identifica como un gasto, se extraen los datos relevantes.
3. **Categorización**: Se asigna una categoría basada en el análisis del texto.
4. **Confirmación**: Se solicita confirmación al usuario si hay ambigüedad.
5. **Registro**: Una vez confirmado, se registra el gasto en la hoja correspondiente.
6. **Resumen**: Se proporciona un resumen del gasto registrado y los totales actualizados.

Este enfoque permite una experiencia de usuario más natural y flexible, donde los usuarios pueden registrar gastos de la manera que les resulte más cómoda, sin necesidad de seguir un formato rígido.

## Políticas de Seguridad (RLS)

Supabase utiliza Row Level Security (RLS) para controlar el acceso a los datos. A continuación se presentan las políticas recomendadas para cada tabla:

```sql
-- Políticas para la tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_access ON users
  FOR ALL
  USING (auth.uid() = id);

-- Políticas para la tabla expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_self_access ON expenses
  FOR ALL
  USING (user_id = auth.uid());

-- Políticas para la tabla conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_self_access ON conversations
  FOR ALL
  USING (user_id = auth.uid());

-- Políticas para la tabla alert_thresholds
ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY thresholds_self_access ON alert_thresholds
  FOR ALL
  USING (user_id = auth.uid());

-- Políticas para la tabla categories (acceso público de lectura)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_read_access ON categories
  FOR SELECT
  TO authenticated
  USING (true);
```

## Servicios Implementados

### SheetsService

La clase `SheetsService` es el componente central para interactuar con Google Sheets. Implementa las siguientes funcionalidades:

1. **Inicialización y Configuración**
   - Inicializa la conexión con Google Sheets API
   - Configura las credenciales OAuth2 para autenticación
   - Maneja la creación y formateo de hojas nuevas

2. **Gestión de Usuarios**
   - `userExists(phoneNumber)`: Verifica si un usuario ya está registrado
   - `updateUserLastActive(phoneNumber)`: Actualiza la marca de tiempo de última actividad

3. **Gestión de Gastos**
   - `addExpense(expense)`: Registra un nuevo gasto en la hoja del mes actual
   - `getTotalsByCategory(sheetName?)`: Obtiene totales de gastos por categoría
   - `getMonthSheetName()`: Genera el nombre de la hoja para el mes actual
   - `initializeExpenseSheet()`: Crea y configura una nueva hoja mensual si no existe

4. **Operaciones Generales con Hojas**
   - `appendToSheet(sheetName, rowData)`: Añade una fila de datos a una hoja específica
   - `getSheetData(sheetName)`: Recupera todos los datos de una hoja específica
   - `getSheetId(sheetName)`: Obtiene el ID interno de una hoja por su nombre

5. **Gestión de Conversaciones**
   - `addConverToUser(phoneNumber, messages)`: Registra conversaciones entre usuarios y el bot
   - Crea automáticamente la hoja "Conversations" si no existe

### ExpenseService
1. **Registro y Validación**
   - `addExpense(expense)`: Valida y registra un nuevo gasto
   - Realiza validaciones de datos (fecha válida, categoría, monto positivo, descripción)

2. **Análisis y Reportes**
   - `getExpensesByCategory(startDate, endDate)`: Obtiene gastos agrupados por categoría en un rango de fechas
   - `getMonthlyExpenses()`: Calcula el total de gastos del mes actual
   - `parseDate(dateStr)`: Convierte strings de fecha al formato Date
   - `isDateInRange(date, startDate, endDate)`: Verifica si una fecha está en un rango

### AIServices
1. **Procesamiento de Mensajes**
   - `processMessage(message)`: Procesa mensajes de usuario y determina si son comandos de gastos
   - `chat(prompt, messages)`: Interactúa con la API de DeepSeek para generar respuestas

## Estructura de Archivos del Proyecto

```
src/
├── config.ts                 # Configuración global y variables de entorno
├── index.ts                  # Punto de entrada de la aplicación
├── services/
│   ├── aiservices.ts         # Servicios de IA y procesamiento de lenguaje natural
│   ├── expenseService.ts     # Servicios para gestión de gastos
│   └── sheetsServices.ts     # Servicios para interacción con Google Sheets
├── templates/
│   ├── faqFlow.ts            # Flujo de preguntas frecuentes
│   ├── mainflow.ts           # Flujo principal de la aplicación
│   └── registerFlow.ts       # Flujo de registro de usuarios
└── types/
    └── index.ts              # Definiciones de tipos globales
```

## Patrones de Diseño Implementados

1. **Singleton**
   - Las clases de servicio como `SheetsService` y `aiServices` se implementan como singletons
   - Esto garantiza una única instancia compartida en toda la aplicación

2. **Inyección de Dependencias**
   - Se utiliza el decorador `@injectable()` para marcar clases como inyectables
   - `ExpenseService` recibe una instancia de `SheetsService` mediante inyección

3. **Manejo de Errores**
   - Clases de error personalizadas como `ExpenseError` para errores específicos
   - Bloques try/catch con registro detallado de errores

4. **Métodos Asíncronos**
   - Uso extensivo de async/await para operaciones de API
   - Promesas para manejar operaciones asíncronas de manera limpia

## Consideraciones de Seguridad

1. **Autenticación**
   - Uso de credenciales OAuth2 para Google Sheets API
   - Variables de entorno para almacenar claves de API y tokens

2. **Validación de Datos**
   - Validación estricta de entradas de usuario antes de procesamiento
   - Sanitización de datos antes de almacenarlos

3. **Manejo de Errores**
   - Mensajes de error genéricos para usuarios finales
   - Registro detallado de errores para depuración

## Recomendaciones de Implementación

---

## Centralización y flujo de configuración

Toda la configuración y manejo de variables de entorno del backend está centralizada en el archivo [`src/config/index.ts`].

- Aquí se definen, validan y documentan todas las variables necesarias para el sistema.
- Si necesitas agregar o modificar variables, hazlo únicamente en este archivo y refleja el cambio en `.env.example` y en la documentación.
- El resto del backend debe importar la configuración así:

```typescript
import { config } from '../config'; // o desde 'src/config/index'
```

Esto asegura consistencia, validación y facilidad de mantenimiento para todo el backend.

1. **Implementar gradualmente**: Comenzar migrando solo los datos de categorías y configuraciones mientras se mantiene el sistema actual en producción.

2. **Periodo de prueba paralelo**: Ejecutar ambos sistemas simultáneamente durante un periodo para verificar la exactitud de la migración.

3. **Utilizar transacciones**: Asegurar la integridad de los datos durante las operaciones de inserción/actualización masiva.

4. **Crear backups programados**: Configurar backups diarios automáticos de la base de datos Supabase.

5. **Monitorear rendimiento**: Implementar métricas para identificar cuellos de botella en consultas complejas.

## Migración de Datos

Para migrar datos desde Google Sheets a Supabase, se recomienda el siguiente enfoque:

1. **Exportar datos de Google Sheets a CSV**
2. **Transformar datos al formato necesario**
3. **Importar a Supabase utilizando la API o pgAdmin**

Ejemplo de script SQL para importación:

```sql
-- Importar categorías predefinidas
INSERT INTO categories (name, description, is_default)
VALUES
  ('Alimentación', 'Gastos relacionados con comida y bebida', true),
  ('Transporte', 'Gastos de movilidad como combustible, transporte público, etc.', true),
  ('Vivienda', 'Alquiler, hipoteca, servicios, etc.', true),
  ('Salud', 'Medicamentos, consultas médicas, etc.', true),
  ('Educación', 'Cursos, libros, material educativo', true),
  ('Entretenimiento', 'Cine, conciertos, suscripciones', true),
  ('Ropa', 'Vestimenta y accesorios', true),
  ('Servicios', 'Internet, telefonía, streaming', true),
  ('Otros', 'Gastos misceláneos', true);
```

## Almacenamiento de Archivos

Si bien el sistema actual no maneja archivos, una implementación en Supabase podría incluir almacenamiento para:

1. **Comprobantes de Gastos**: Imágenes de recibos o facturas asociadas a gastos
2. **Reportes Exportados**: PDFs o archivos Excel generados como reportes

```sql
-- Tabla para vincular archivos con gastos
CREATE TABLE expense_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Política RLS para archivos
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY attachments_self_access ON expense_attachments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_attachments.expense_id
    AND expenses.user_id = auth.uid()
  ));
```

## Webhooks y Automatizaciones

Para la integración con WhatsApp y otras automatizaciones, se recomienda configurar los siguientes webhooks en Supabase:

```sql
-- Función para procesar mensajes entrantes de WhatsApp
CREATE OR REPLACE FUNCTION process_whatsapp_message()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Lógica para procesar el mensaje
  -- Esta función sería llamada por el webhook de WhatsApp
  
  RETURN json_build_object('status', 'success');
END;
$$;

-- Función para generar reportes mensuales automáticos
CREATE OR REPLACE FUNCTION generate_monthly_report()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Lógica para generar reportes mensuales
  -- Esta función sería programada para ejecutarse el primer día de cada mes
  
  RETURN json_build_object('status', 'success');
END;
$$;
```

## Funciones SQL para Análisis Financiero

Para facilitar el análisis financiero, se recomienda implementar las siguientes funciones SQL en Supabase:

```sql
-- Función para obtener gastos por categoría en un período
CREATE OR REPLACE FUNCTION get_expenses_by_category(
  user_uuid UUID,
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  category_name TEXT,
  total_amount DECIMAL(12,2)
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    c.name as category_name,
    COALESCE(SUM(e.amount), 0) as total_amount
  FROM categories c
  LEFT JOIN expenses e ON e.category_id = c.id
  WHERE 
    e.user_id = user_uuid AND
    e.expense_date BETWEEN start_date AND end_date
  GROUP BY c.name
  ORDER BY total_amount DESC;
$$;

-- Función para obtener gastos mensuales
CREATE OR REPLACE FUNCTION get_monthly_expenses(
  user_uuid UUID,
  year_month TEXT -- Format: 'YYYY-MM'
)
RETURNS DECIMAL(12,2)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM expenses
  WHERE 
    user_id = user_uuid AND
    TO_CHAR(expense_date, 'YYYY-MM') = year_month;
$$;

-- Función para detectar gastos anómalos (que excedan el promedio histórico)
CREATE OR REPLACE FUNCTION detect_unusual_expenses(
  user_uuid UUID,
  threshold_percentage DECIMAL DEFAULT 50 -- % sobre el promedio
)
RETURNS TABLE (
  category_name TEXT,
  current_month_amount DECIMAL(12,2),
  average_amount DECIMAL(12,2),
  percentage_increase DECIMAL(12,2)
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH monthly_avg AS (
    SELECT 
      c.id as category_id,
      c.name as category_name,
      AVG(e.amount) as avg_amount
    FROM categories c
    JOIN expenses e ON e.category_id = c.id
    WHERE 
      e.user_id = user_uuid AND
      e.expense_date < date_trunc('month', current_date)
    GROUP BY c.id, c.name
  ), current_month AS (
    SELECT 
      c.id as category_id,
      c.name as category_name,
      COALESCE(SUM(e.amount), 0) as curr_amount
    FROM categories c
    LEFT JOIN expenses e ON 
      e.category_id = c.id AND
      e.user_id = user_uuid AND
      e.expense_date >= date_trunc('month', current_date)
    GROUP BY c.id, c.name
  )
  SELECT 
    cm.category_name,
    cm.curr_amount,
    ma.avg_amount,
    ((cm.curr_amount - ma.avg_amount) / ma.avg_amount * 100) as percentage_increase
  FROM current_month cm
  JOIN monthly_avg ma ON ma.category_id = cm.category_id
  WHERE 
    ma.avg_amount > 0 AND
    cm.curr_amount > ma.avg_amount AND
    ((cm.curr_amount - ma.avg_amount) / ma.avg_amount * 100) > threshold_percentage
  ORDER BY percentage_increase DESC;
$$;
```

## Estructura de Autenticación

### Configuración Actual (WhatsApp)

El sistema actual identifica a los usuarios por su número de teléfono de WhatsApp, sin requerir autenticación adicional.

### Configuración Propuesta (Supabase Auth)

Para una implementación en Supabase, se recomienda la siguiente configuración:

1. **Autenticación por Número de Teléfono**
   - Utilizar el proveedor de autenticación por SMS de Supabase
   - Configurar verificación OTP (One-Time Password)

2. **Configuración de JWT**
   - Tiempo de expiración: 60 días (para minimizar la necesidad de re-autenticación)
   - Almacenamiento seguro del token JWT

```sql
-- Trigger para vincular auth.users con nuestra tabla users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone_number, name, email)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE(NEW.email, NEW.phone || '@placeholder.khipu.app')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Consideraciones de Seguridad

Para una implementación segura en Supabase, se recomienda:

1. **Configurar correctamente CORS** para limitar el acceso a dominios específicos
2. **Implementar límites de velocidad (rate limiting)** para prevenir abusos
3. **Activar la verificación en dos pasos** para accesos administrativos
4. **Auditar regularmente las políticas RLS** para asegurar que funcionan como se espera
5. **Encriptar datos sensibles** utilizando funciones pgcrypto cuando sea necesario

```sql
-- Ejemplo de función para encriptar datos sensibles
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT)
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT encode(pgp_sym_encrypt(data, key), 'base64');
$$;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT pgp_sym_decrypt(decode(encrypted_data, 'base64'), key);
$$;
