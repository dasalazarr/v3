import { z } from 'zod';
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
export const RunSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    date: z.date(),
    distance: z.number().min(0),
    duration: z.number().min(0),
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
        easy: z.number(),
        marathon: z.number(),
        threshold: z.number(),
        interval: z.number(),
        repetition: z.number()
    }),
    createdAt: z.date(),
    updatedAt: z.date()
});
export const WorkoutSchema = z.object({
    id: z.string().uuid(),
    planId: z.string().uuid(),
    userId: z.string().uuid(),
    week: z.number(),
    day: z.number(),
    type: z.enum(['easy', 'long', 'tempo', 'intervals', 'recovery', 'race']),
    distance: z.number().optional(),
    duration: z.number().optional(),
    targetPace: z.number().optional(),
    description: z.string(),
    completed: z.boolean().default(false),
    scheduledDate: z.date().optional()
});
export const ChatMessageSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.any()).optional()
});
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
export const ToolCallSchema = z.object({
    name: z.string(),
    parameters: z.record(z.any()),
    result: z.any().optional()
});
export const ApiResponseSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional(),
    timestamp: z.date()
});
export const VDOT_MIN = 20;
export const VDOT_MAX = 85;
export const CHAT_BUFFER_SIZE = 20;
export const CHAT_BUFFER_TTL = 24 * 60 * 60;
export const VECTOR_DIMENSION = 1536;
//# sourceMappingURL=types.js.map