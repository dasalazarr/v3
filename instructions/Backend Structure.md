# Backend Structure - Andes Running Coach Bot 2.0
## Intelligent Memory-Driven Architecture

**Version**: 2.0  
**Date**: December 2024  
**Architecture**: Microservices + Mono-repo

---

## 🏗️ **Architecture Overview**

The new backend architecture transforms from a monolithic Google Sheets-based system to a sophisticated microservices architecture designed for scale, intelligence, and maintainability.

### **Core Design Principles**
1. **Memory-First Architecture**: Every interaction builds user understanding
2. **Modular Composition**: Independent packages with clear boundaries  
3. **Scientific Foundation**: VDOT-based training methodology
4. **Production Ready**: Observability, testing, and monitoring built-in
5. **Horizontal Scalability**: Designed for 1000+ concurrent users

---

## 📁 **Project Structure**

```
running-coach-bot/
├── apps/
│   └── api-gateway/                 # Express + BuilderBot WhatsApp Gateway
│       ├── src/
│       │   ├── app.ts              # Application entry point
│       │   ├── flows/              # Conversational flows
│       │   ├── services/           # Business logic services
│       │   ├── multi-agent/        # Multi-agent orchestration
│       │   └── config/             # Environment configuration
│       └── ...
├── packages/
│   ├── llm-orchestrator/           # AI orchestration layer
│   ├── vector-memory/              # Semantic memory system
│   ├── plan-generator/             # Training plan engine
│   ├── database/                   # Database connection and schema
│   └── shared/                     # Shared types and utilities
└── ...
```

---

## 🔄 **Data Flow Architecture**

### **1. Message Processing Flow**
```
WhatsApp Message → Webhook → API Gateway (Onboarding Router) → LLM Orchestrator → Tool Selection
                                                    ↓
Vector Memory ← Context Retrieval ← Memory Retriever ← Chat Buffer (Redis)
     ↓                                                      ↓
Semantic Search                                    Structured Data (PostgreSQL)
     ↓                                                      ↓
DeepSeek Agent ← Context Injection ← Aggregated Context ←   ↓
     ↓                                                      ↓
Tool Execution → Plan Generator / Run Logger / Analytics   ↓
     ↓                                                      ↓
Response → WhatsApp API ← Formatted Response ← Update Database
```

### **2. Memory System Flow**
```
User Interaction → Chat Buffer (Redis 24h TTL) → Conversation Context
                            ↓
                   Memory Extraction → Vector Embeddings → Qdrant Storage
                            ↓
                   Structured Data → PostgreSQL → Long-term Memory
                            ↓
                   Context Retrieval ← Hybrid Search (Vector + SQL)
```

---

## 🧠 **Memory Architecture**

### **Three-Layer Memory System**

#### **Layer 1: Chat Buffer (Redis)**
```typescript
// Short-term conversational memory
export class ChatBuffer {
  // Last 20 messages per user, 24h TTL
  static async getMessages(userId: string): Promise<Message[]>
  static async addMessage(userId: string, role: string, content: string): Promise<void>
  static async clearBuffer(userId: string): Promise<void>
}
```

**Purpose**: Immediate conversation context  
**Retention**: 24 hours  
**Capacity**: 20 messages per user  
**Use Case**: Natural conversation flow, immediate context

#### **Layer 2: Vector Memory (Qdrant)**
```typescript
// Semantic memory for intelligent retrieval
export class VectorMemory {
  async storeMemory(document: MemoryDocument): Promise<void>
  async retrieveContext(userId: string, query: string): Promise<Context>
  async updateUserMemories(userId: string, runData: any): Promise<void>
}
```

**Purpose**: Semantic understanding and retrieval  
**Retention**: Permanent  
**Capacity**: Unlimited with intelligent indexing  
**Use Case**: "What did we discuss about my knee pain?", contextual responses

#### **Layer 3: Structured Memory (PostgreSQL)**
```typescript
// Structured data for analytics and precise queries
Tables:
- users (profiles, preferences, goals)
- runs (detailed workout data with metrics)
- training_plans (VDOT-based 14-day blocks)
- conversations (chat history with intent classification)
- injuries (injury tracking and prevention)
- progress_summaries (bi-weekly automated summaries)
```

**Purpose**: Structured queries, analytics, reporting  
**Retention**: Permanent with archival strategy  
**Capacity**: Horizontally scalable  
**Use Case**: Progress tracking, plan generation, analytics

---

## 🧩 **Package Architecture**

### **apps/api-gateway**
**Role**: Central coordination and external interfaces  
**Responsibilities**:
- WhatsApp webhook processing
- tRPC API endpoints for future dashboard
- User authentication and session management
- Scheduled job orchestration
- Database connection management

**Key Dependencies**:
- Express.js for HTTP server
- tRPC for type-safe APIs
- Drizzle ORM for database operations
- Redis for session management

### **packages/llm-orchestrator**
**Role**: AI decision-making and conversation management  
**Responsibilities**:
- Intent classification and tool selection
- Context aggregation from all memory layers
- DeepSeek agent communication
- Conversation state management
- Tool execution coordination

**Key Components**:
```typescript
// Main orchestrator
export class LLMOrchestrator {
  async processMessage(input: ProcessMessageInput): Promise<string>
  private buildSystemPrompt(user: any, context: any): string
  private executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]>
}

// Tool registry
export class ToolRegistry {
  register(name: string, fn: ToolFunction): void
  execute(name: string, parameters: any): Promise<any>
  getAvailableTools(): ToolDefinition[]
}
```

### **packages/vector-memory**
**Role**: Semantic memory and intelligent retrieval  
**Responsibilities**:
- Vector embedding generation
- Semantic search and retrieval
- Memory document storage
- Context aggregation for AI

**Key Components**:
```typescript
export interface MemoryDocument {
  id: string;
  userId: string;
  content: string;
  type: 'run' | 'conversation' | 'injury' | 'plan';
  metadata: Record<string, any>;
  embedding?: number[];
}

export class VectorMemory {
  async storeMemory(document: MemoryDocument): Promise<void>
  async retrieveContext(userId: string, query: string): Promise<Context>
  private generateEmbedding(text: string): Promise<number[]>
}
```

### **packages/plan-generator**
**Role**: Scientific training plan creation  
**Responsibilities**:
- VDOT calculation from performance data
- Training pace computation
- 14-day plan block generation
- Injury-aware plan modifications

**Key Components**:
```typescript
// VDOT calculation engine
export class VDOTCalculator {
  calculateFromRecentRuns(runs: any[]): number
  getPaces(vdot: number): Record<string, string>
  getTargetVDOT(currentVDOT: number, goalRace: string): number
}

// Plan building engine
export class TrainingPlanBuilder {
  build14DayBlock(params: PlanParams): WeeklyPlan[]
  private buildWeek(weekNumber: number, params: WeekParams): WeeklyPlan
  private applyInjuryAdaptations(plan: WeeklyPlan[]): WeeklyPlan[]
}
```

---

## 🔗 **Integration Patterns**

### **Dependency Injection**
```typescript
// Container setup in api-gateway using tsyringe
import 'reflect-metadata';
import { container } from 'tsyringe';
// ... register services
const multiAgentService = container.resolve(MultiAgentService);
```

### **Error Handling Strategy**
```typescript
// Graceful degradation pattern
export class LLMOrchestrator {
  async processMessage(input: ProcessMessageInput): Promise<string> {
    try {
      return await this.deepSeekAgent.process(input);
    } catch (error) {
      logger.error('DeepSeek API error:', error);
      return this.fallbackResponse(input.message);
    }
  }
}
```

---

## 📊 **Database Schema Design**

### **Core Tables**

#### **users** - User Profiles and Preferences
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  name text NOT NULL,
  age integer,
  goal_race text, -- '5k', '10k', 'half', 'marathon'
  weekly_frequency integer,
  fitness_level text, -- 'beginner', 'intermediate', 'advanced'
  injury_history jsonb DEFAULT '[]',
  motivation text,
  timezone text DEFAULT 'America/Guayaquil',
  preferred_language text DEFAULT 'es',
  onboarding_completed boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

#### **runs** - Detailed Run Logging
```sql
CREATE TABLE runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  date timestamp NOT NULL,
  distance decimal(5,2), -- km
  duration integer, -- minutes
  perceived_effort integer, -- 1-10 RPE scale
  mood text, -- 'great', 'good', 'ok', 'tired', 'stressed'
  aches jsonb DEFAULT '[]', -- body parts with discomfort
  notes text,
  weather text,
  created_at timestamp DEFAULT now()
);
```

#### **training_plans** - VDOT-Based Plans
```sql
CREATE TABLE training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  start_date timestamp NOT NULL,
  end_date timestamp NOT NULL,
  plan_data jsonb NOT NULL, -- 14-day block structure
  vdot_score decimal(4,1),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
```

### **Indexing Strategy**
```sql
-- Performance indexes
CREATE INDEX users_phone_idx ON users(phone_number);
CREATE INDEX runs_user_date_idx ON runs(user_id, date);
CREATE INDEX conversations_user_time_idx ON conversations(user_id, created_at);
CREATE INDEX plans_user_active_idx ON training_plans(user_id, is_active);

-- Analytics indexes
CREATE INDEX runs_distance_idx ON runs(distance) WHERE distance IS NOT NULL;
CREATE INDEX runs_effort_idx ON runs(perceived_effort) WHERE perceived_effort IS NOT NULL;
```

---

## 🔧 **Service Communication**

### **Internal APIs**
```typescript
// tRPC for type-safe internal communication
export const internalRouter = router({
  memory: {
    store: procedure
      .input(z.object({ userId: z.string(), content: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return ctx.vectorMemory.storeMemory(input);
      }),
    retrieve: procedure
      .input(z.object({ userId: z.string(), query: z.string() }))
      .query(async ({ input, ctx }) => {
        return ctx.vectorMemory.retrieveContext(input.userId, input.query);
      }),
  },
  plans: {
    generate: procedure
      .input(planGenerationSchema)
      .mutation(async ({ input, ctx }) => {
        return ctx.planGenerator.generatePlan(input);
      }),
  },
});
```

### **External APIs**
```typescript
// Standardized external service clients
export class WhatsAppClient {
  async sendMessage(to: string, message: string): Promise<void>
  async sendButtons(to: string, text: string, buttons: Button[]): Promise<void>
}

export class DeepSeekClient {
  async chat(messages: Message[], tools?: Tool[]): Promise<ChatResponse>
  async embed(text: string): Promise<number[]>
}
```

---

## 🔍 **Observability & Monitoring**

### **Logging Strategy**
```typescript
// Structured logging with context
import { logger } from '@running-coach/common';

logger.info('User message processed', {
  userId: user.id,
  messageLength: message.length,
  intent: classifiedIntent,
  responseTime: performance.now() - start,
  toolsUsed: toolResults.map(t => t.name),
});
```

### **Metrics Collection**
```typescript
// OpenTelemetry metrics
const meter = opentelemetry.metrics.getMeter('running-coach');

const messageCounter = meter.createCounter('messages_processed_total');
const responseTimeHistogram = meter.createHistogram('response_time_seconds');
const toolExecutionCounter = meter.createCounter('tools_executed_total');
```

### **Health Checks**
```typescript
// Comprehensive health monitoring
export const healthRouter = router({
  status: procedure.query(async ({ ctx }) => {
    const checks = await Promise.allSettled([
      ctx.db.query.users.findFirst(), // Database connectivity
      ctx.redis.ping(), // Redis connectivity
      ctx.vectorMemory.healthCheck(), // Qdrant connectivity
      ctx.llm.healthCheck(), // DeepSeek API connectivity
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
      checks: checks.map(c => c.status),
      timestamp: new Date().toISOString(),
    };
  }),
});
```

---

## 🚀 **Deployment Architecture**

### **Container Strategy**
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### **Environment Configuration**
```typescript
// Environment-specific configurations
export const config = {
  development: {
    database: process.env.DEV_DATABASE_URL,
    redis: 'redis://localhost:6379',
    logLevel: 'debug',
  },
  production: {
    database: process.env.DATABASE_URL,
    redis: process.env.REDIS_URL,
    logLevel: 'info',
  },
};
```

### **Scaling Strategy**
- **Horizontal**: Multiple API Gateway instances behind load balancer
- **Database**: Read replicas for analytics queries
- **Cache**: Redis Cluster for high availability
- **Vector**: Qdrant horizontal scaling with sharding

---

## 🔄 **Migration Strategy (Completed)**

### **From Previous System**
1. **Phase 1 (Done)**: Deployed new infrastructure alongside the legacy system.
2. **Phase 2 (Done)**: Implemented data migration scripts for Google Sheets → PostgreSQL.
3. **Phase 3 (Done)**: Conducted a dual-write period for data validation.
4. **Phase 4 (Done)**: Switched the WhatsApp webhook to the new system.
5. **Phase 5 (Done)**: Decommissioned the Google Sheets integration and removed legacy code.

### **Data Migration Process**
```typescript
// Migration utilities
export class DataMigration {
  async migrateUsers(): Promise<void> {
    const sheetUsers = await this.googleSheets.getUsers();
    for (const user of sheetUsers) {
      await this.postgres.upsertUser(this.transformUser(user));
    }
  }

  async migrateConversations(): Promise<void> {
    // Migrate conversation history with vector embedding generation
  }

  async validateMigration(): Promise<ValidationReport> {
    // Data integrity checks
  }
}
```

---

**This backend structure provides a solid foundation for scaling Andes from a prototype to a production-ready, intelligent running coach that truly learns and adapts with each interaction.**