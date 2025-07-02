-- Script para crear las tablas necesarias en la base de datos

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  onboarding_goal TEXT CHECK (onboarding_goal IN ('first_race', 'improve_time', 'stay_fit')),
  goal_race TEXT CHECK (goal_race IN ('5k', '10k', 'half_marathon', 'marathon', 'ultra')),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  injury_history JSONB,
  weekly_mileage DECIMAL(5,2),
  weekly_message_count INTEGER DEFAULT 0,
  subscription_status TEXT CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled')) DEFAULT 'none',
  preferred_language TEXT CHECK (preferred_language IN ('en', 'es')) DEFAULT 'en' NOT NULL,
  timezone VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Runs table
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  distance DECIMAL(6,2) NOT NULL,
  duration INTEGER,
  perceived_effort INTEGER,
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'tired', 'terrible')),
  aches JSONB,
  notes TEXT,
  weather VARCHAR(100),
  route VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Training plans table
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  vdot DECIMAL(4,1) NOT NULL,
  weekly_frequency INTEGER NOT NULL,
  target_race TEXT CHECK (target_race IN ('5k', '10k', 'half_marathon', 'marathon')) NOT NULL,
  target_date TIMESTAMP WITH TIME ZONE,
  current_week INTEGER DEFAULT 1 NOT NULL,
  total_weeks INTEGER NOT NULL,
  paces JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES training_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week INTEGER NOT NULL,
  day INTEGER NOT NULL,
  type TEXT CHECK (type IN ('easy', 'long', 'tempo', 'intervals', 'recovery', 'race')) NOT NULL,
  distance DECIMAL(5,2),
  duration INTEGER,
  target_pace INTEGER,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  actual_distance DECIMAL(5,2),
  actual_duration INTEGER,
  actual_pace INTEGER,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Progress summaries table
CREATE TABLE IF NOT EXISTS progress_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  week_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_distance DECIMAL(6,2),
  total_runs INTEGER,
  average_pace INTEGER,
  average_effort DECIMAL(3,1),
  vdot_estimate DECIMAL(4,1),
  insights JSONB,
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Payments table (para integración con Gumroad)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  provider_payment_id VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status TEXT CHECK (status IN ('completed', 'refunded', 'failed')) NOT NULL,
  subscription_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user_id ON training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_summaries_user_id ON progress_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
