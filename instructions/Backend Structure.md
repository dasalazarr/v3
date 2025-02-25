# Backend Structure - Khipu: Asistente Financiero por WhatsApp

## Introducción a la Arquitectura Backend

Este documento detalla la estructura del backend de Khipu, enfocándose en la organización de datos, autenticación, y almacenamiento. Aunque el sistema actual utiliza Google Sheets como principal almacenamiento de datos, este documento proporciona una estructura alternativa basada en Supabase para casos de escalabilidad futura.

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
```

## Recomendaciones de Implementación

1. **Implementar gradualmente**: Comenzar migrando solo los datos de categorías y configuraciones mientras se mantiene el sistema actual en producción.

2. **Periodo de prueba paralelo**: Ejecutar ambos sistemas simultáneamente durante un periodo para verificar la exactitud de la migración.

3. **Utilizar transacciones**: Asegurar la integridad de los datos durante las operaciones de inserción/actualización masiva.

4. **Crear backups programados**: Configurar backups diarios automáticos de la base de datos Supabase.

5. **Monitorear rendimiento**: Implementar métricas para identificar cuellos de botella en consultas complejas.
