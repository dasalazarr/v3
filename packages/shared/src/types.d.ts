import { z } from 'zod';
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodString;
    phoneNumber: z.ZodString;
    age: z.ZodOptional<z.ZodNumber>;
    goalRace: z.ZodOptional<z.ZodEnum<["5k", "10k", "half_marathon", "marathon", "ultra"]>>;
    experienceLevel: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
    injuryHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        date: z.ZodString;
        severity: z.ZodEnum<["minor", "moderate", "severe"]>;
        recovered: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type?: string;
        date?: string;
        severity?: "minor" | "moderate" | "severe";
        recovered?: boolean;
    }, {
        type?: string;
        date?: string;
        severity?: "minor" | "moderate" | "severe";
        recovered?: boolean;
    }>, "many">>;
    weeklyMileage: z.ZodOptional<z.ZodNumber>;
    preferredLanguage: z.ZodDefault<z.ZodEnum<["en", "es"]>>;
    timezone: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    phoneNumber?: string;
    age?: number;
    goalRace?: "5k" | "10k" | "half_marathon" | "marathon" | "ultra";
    experienceLevel?: "beginner" | "intermediate" | "advanced";
    injuryHistory?: {
        type?: string;
        date?: string;
        severity?: "minor" | "moderate" | "severe";
        recovered?: boolean;
    }[];
    weeklyMileage?: number;
    preferredLanguage?: "en" | "es";
    timezone?: string;
    createdAt?: Date;
    updatedAt?: Date;
}, {
    id?: string;
    phoneNumber?: string;
    age?: number;
    goalRace?: "5k" | "10k" | "half_marathon" | "marathon" | "ultra";
    experienceLevel?: "beginner" | "intermediate" | "advanced";
    injuryHistory?: {
        type?: string;
        date?: string;
        severity?: "minor" | "moderate" | "severe";
        recovered?: boolean;
    }[];
    weeklyMileage?: number;
    preferredLanguage?: "en" | "es";
    timezone?: string;
    createdAt?: Date;
    updatedAt?: Date;
}>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export declare const RunSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    date: z.ZodDate;
    distance: z.ZodNumber;
    duration: z.ZodNumber;
    perceivedEffort: z.ZodNumber;
    mood: z.ZodOptional<z.ZodEnum<["great", "good", "okay", "tired", "terrible"]>>;
    aches: z.ZodOptional<z.ZodArray<z.ZodObject<{
        location: z.ZodString;
        severity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        severity?: number;
        location?: string;
    }, {
        severity?: number;
        location?: string;
    }>, "many">>;
    notes: z.ZodOptional<z.ZodString>;
    weather: z.ZodOptional<z.ZodString>;
    route: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    date?: Date;
    userId?: string;
    distance?: number;
    duration?: number;
    perceivedEffort?: number;
    mood?: "great" | "good" | "okay" | "tired" | "terrible";
    aches?: {
        severity?: number;
        location?: string;
    }[];
    notes?: string;
    weather?: string;
    route?: string;
}, {
    id?: string;
    date?: Date;
    userId?: string;
    distance?: number;
    duration?: number;
    perceivedEffort?: number;
    mood?: "great" | "good" | "okay" | "tired" | "terrible";
    aches?: {
        severity?: number;
        location?: string;
    }[];
    notes?: string;
    weather?: string;
    route?: string;
}>;
export type Run = z.infer<typeof RunSchema>;
export declare const TrainingPlanSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    vdot: z.ZodNumber;
    weeklyFrequency: z.ZodNumber;
    targetRace: z.ZodEnum<["5k", "10k", "half_marathon", "marathon"]>;
    targetDate: z.ZodOptional<z.ZodDate>;
    currentWeek: z.ZodNumber;
    totalWeeks: z.ZodNumber;
    paces: z.ZodObject<{
        easy: z.ZodNumber;
        marathon: z.ZodNumber;
        threshold: z.ZodNumber;
        interval: z.ZodNumber;
        repetition: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        marathon?: number;
        easy?: number;
        threshold?: number;
        interval?: number;
        repetition?: number;
    }, {
        marathon?: number;
        easy?: number;
        threshold?: number;
        interval?: number;
        repetition?: number;
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    vdot?: number;
    weeklyFrequency?: number;
    targetRace?: "5k" | "10k" | "half_marathon" | "marathon";
    targetDate?: Date;
    currentWeek?: number;
    totalWeeks?: number;
    paces?: {
        marathon?: number;
        easy?: number;
        threshold?: number;
        interval?: number;
        repetition?: number;
    };
}, {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    vdot?: number;
    weeklyFrequency?: number;
    targetRace?: "5k" | "10k" | "half_marathon" | "marathon";
    targetDate?: Date;
    currentWeek?: number;
    totalWeeks?: number;
    paces?: {
        marathon?: number;
        easy?: number;
        threshold?: number;
        interval?: number;
        repetition?: number;
    };
}>;
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;
export declare const WorkoutSchema: z.ZodObject<{
    id: z.ZodString;
    planId: z.ZodString;
    userId: z.ZodString;
    week: z.ZodNumber;
    day: z.ZodNumber;
    type: z.ZodEnum<["easy", "long", "tempo", "intervals", "recovery", "race"]>;
    distance: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    targetPace: z.ZodOptional<z.ZodNumber>;
    description: z.ZodString;
    completed: z.ZodDefault<z.ZodBoolean>;
    scheduledDate: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    completed?: boolean;
    id?: string;
    type?: "easy" | "long" | "tempo" | "intervals" | "recovery" | "race";
    userId?: string;
    distance?: number;
    duration?: number;
    planId?: string;
    week?: number;
    day?: number;
    targetPace?: number;
    description?: string;
    scheduledDate?: Date;
}, {
    completed?: boolean;
    id?: string;
    type?: "easy" | "long" | "tempo" | "intervals" | "recovery" | "race";
    userId?: string;
    distance?: number;
    duration?: number;
    planId?: string;
    week?: number;
    day?: number;
    targetPace?: number;
    description?: string;
    scheduledDate?: Date;
}>;
export type Workout = z.infer<typeof WorkoutSchema>;
export declare const ChatMessageSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system"]>;
    content: z.ZodString;
    timestamp: z.ZodDate;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    userId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}, {
    id?: string;
    userId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export declare const MemoryContextSchema: z.ZodObject<{
    userId: z.ZodString;
    query: z.ZodString;
    relevantMemories: z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        timestamp: z.ZodDate;
        relevanceScore: z.ZodNumber;
        type: z.ZodEnum<["conversation", "run_data", "achievement", "goal"]>;
    }, "strip", z.ZodTypeAny, {
        type?: "conversation" | "run_data" | "achievement" | "goal";
        content?: string;
        timestamp?: Date;
        relevanceScore?: number;
    }, {
        type?: "conversation" | "run_data" | "achievement" | "goal";
        content?: string;
        timestamp?: Date;
        relevanceScore?: number;
    }>, "many">;
    summary: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userId?: string;
    query?: string;
    relevantMemories?: {
        type?: "conversation" | "run_data" | "achievement" | "goal";
        content?: string;
        timestamp?: Date;
        relevanceScore?: number;
    }[];
    summary?: string;
}, {
    userId?: string;
    query?: string;
    relevantMemories?: {
        type?: "conversation" | "run_data" | "achievement" | "goal";
        content?: string;
        timestamp?: Date;
        relevanceScore?: number;
    }[];
    summary?: string;
}>;
export type MemoryContext = z.infer<typeof MemoryContextSchema>;
export declare const ToolCallSchema: z.ZodObject<{
    name: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    result: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    parameters?: Record<string, any>;
    result?: any;
}, {
    name?: string;
    parameters?: Record<string, any>;
    result?: any;
}>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export declare const ApiResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    timestamp?: Date;
    success?: boolean;
    data?: any;
    error?: string;
}, {
    timestamp?: Date;
    success?: boolean;
    data?: any;
    error?: string;
}>;
export type ApiResponse<T = any> = {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
};
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
export declare const VDOT_MIN = 20;
export declare const VDOT_MAX = 85;
export declare const CHAT_BUFFER_SIZE = 20;
export declare const CHAT_BUFFER_TTL: number;
export declare const VECTOR_DIMENSION = 1536;
//# sourceMappingURL=types.d.ts.map