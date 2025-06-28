import { z } from 'zod';

// User Profile Schema
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  phoneNumber: z.string(),
  age: z.number().min(13).max(100).optional(),
  goalRace: z.enum(['5k', '10k', 'half_marathon', 'marathon', 'ultra']).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  injuryHistory: z.array(z.object({
    type: z.string(),
    date: z.string(),
    severity: z.enum(['minor', 'moderate', 'severe']),
    recovered: z.boolean()
  })).optional(),
  weeklyMileage: z.number().min(0).optional(),
  preferredLanguage: z.enum(['en', 'es']).default('en'),
  timezone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Run Data Schema
export const RunSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  date: z.date(),
  distance: z.number().min(0),
  duration: z.number().min(0), // seconds
  perceivedEffort: z.number().min(1).max(10),
  mood: z.enum(['great', 'good', 'okay', 'tired', 'terrible']).optional(),
  aches: z.array(z.object({
    location: z.string(),
    severity: z.number().min(1).max(10)
  })).optional(),
  notes: z.string().optional(),
  weather: z.string().optional(),
  route: z.string().optional()
});

export type Run = z.infer<typeof RunSchema>;

// Training Plan Schema
export const TrainingPlanSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  vdot: z.number().min(20).max(85),
  weeklyFrequency: z.number().min(2).max(7),
  targetRace: z.enum(['5k', '10k', 'half_marathon', 'marathon']),
  targetDate: z.date().optional(),
  currentWeek: z.number().min(1),
  totalWeeks: z.number().min(4).max(52),
  paces: z.object({
    easy: z.number(), // seconds per mile
    marathon: z.number(),
    threshold: z.number(),
    interval: z.number(),
    repetition: z.number()
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

// Workout Schema
export const WorkoutSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  week: z.number(),
  day: z.number(),
  type: z.enum(['easy', 'long', 'tempo', 'intervals', 'recovery', 'race']),
  distance: z.number().optional(),
  duration: z.number().optional(), // minutes
  targetPace: z.number().optional(), // seconds per mile
  description: z.string(),
  completed: z.boolean().default(false),
  scheduledDate: z.date().optional()
});

export type Workout = z.infer<typeof WorkoutSchema>;

// Chat Message Schema
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Memory Context Schema
export const MemoryContextSchema = z.object({
  userId: z.string().uuid(),
  query: z.string(),
  relevantMemories: z.array(z.object({
    content: z.string(),
    timestamp: z.date(),
    relevanceScore: z.number().min(0).max(1),
    type: z.enum(['conversation', 'run_data', 'achievement', 'goal'])
  })),
  summary: z.string().optional()
});

export type MemoryContext = z.infer<typeof MemoryContextSchema>;

// AI Tool Call Schema
export const ToolCallSchema = z.object({
  name: z.string(),
  parameters: z.record(z.any()),
  result: z.any().optional()
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date()
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
};

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export interface WhatsAppConfig {
  jwtToken: string;
  numberId: string;
  verifyToken: string;
}

// Constants
export const VDOT_MIN = 20;
export const VDOT_MAX = 85;
export const CHAT_BUFFER_SIZE = 20;
export const CHAT_BUFFER_TTL = 24 * 60 * 60; // 24 hours in seconds
export const VECTOR_DIMENSION = 1536; // OpenAI embedding dimension