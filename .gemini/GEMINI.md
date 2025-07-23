# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Common Development Commands

The project uses a `pnpm` monorepo structure.

### Development and Building
- `pnpm i`: Install dependencies across all workspaces.
- `pnpm build`: Build all packages and apps.
- `pnpm dev`: Start the development server for the `api-gateway` with hot reload.
- `pnpm start`: Run the built `api-gateway` application from `apps/api-gateway/dist/app.js`.
- `pnpm lint`: Run ESLint on the entire codebase.

### Testing
- `pnpm test`: Run all tests (`.test.ts` files) using `vitest`.

## Project Architecture

### Core Framework
This is a TypeScript WhatsApp AI assistant built with a modern, scalable architecture:
- **Monorepo**: `pnpm` workspaces for modular packages and applications.
- **API Gateway**: `express` server in `apps/api-gateway` handles all incoming requests (WhatsApp, Webhooks).
- **Database**: PostgreSQL (managed via NeonDB) with Drizzle ORM.
- **AI Orchestration**: A dedicated package (`packages/llm-orchestrator`) manages interactions with the DeepSeek API.
- **Memory System**: A three-layer memory system for context-aware conversations.
  - **Short-term**: Redis for caching recent messages.
  - **Semantic**: Qdrant for long-term semantic memory.
  - **Structured**: PostgreSQL for user profiles, run data, and plans.
- **Dependency Injection**: `tsyringe` is used for dependency injection.
- **Payments**: Gumroad for handling premium subscriptions via webhooks.

### Dependency Injection System
The project uses a centralized DI system with `tsyringe`:
- Services are registered in `apps/api-gateway/src/app.ts` within the `initializeServices` function.
- Services are injected into other classes or resolved directly from the container: `container.resolve<ServiceType>('ServiceToken')`.
- **Critical**: `import "reflect-metadata";` must be the first import in `app.ts`.

### Configuration Management
Environment variables are loaded using `dotenv` in `apps/api-gateway/src/app.ts`.
- The `loadConfig` function validates and loads all required variables.
- Configuration values are then registered as instances in the `tsyringe` container for global access.

### Key Packages Architecture

#### `packages/database`
- Contains the Drizzle ORM schema, connection logic (`connection.ts`), and migration scripts.
- Defines all database tables (`users`, `runs`, etc.).

#### `packages/llm-orchestrator`
- Manages all communication with the DeepSeek LLM.
- Includes the `AIAgent` class, which processes messages, and the `ToolRegistry` for defining and executing tools.

#### `packages/vector-memory`
- Implements the semantic memory layer using Qdrant.
- Handles embedding generation and retrieval of contextually relevant information.

#### `packages/plan-generator`
- Contains the logic for creating personalized training plans based on the Jack Daniels VDOT methodology.

### Flow Architecture
The system now features a **streamlined 2-step onboarding architecture** managed in the `apps/api-gateway/src/flows` directory:

#### **Current Streamlined Flows (2024 Update)**
- `simplified-onboarding-flow.ts`: **NEW** - Primary endpoint for direct WhatsApp integration with intent detection
- `enhanced-main-flow.ts`: Enhanced conversational handler with automatic premium/free intent detection
- `payment-flow.ts`: Improved Gumroad webhook with automatic WhatsApp confirmations and duplicate protection

#### **Legacy Flows (Backward Compatibility)**
- `web-onboarding-flow.ts`: Legacy multi-step onboarding (redirects to simplified flow)

#### **Key Architectural Improvements**
- **80% reduction** in user journey steps (4+ → 2 steps)
- **Single source of truth** for user state in PostgreSQL database
- **Eliminated drop-off points** through direct WhatsApp integration
- **Enhanced error handling** with transaction safety and rollback mechanisms

### Key Environment Variables
- **Database**: `DATABASE_URL`
- **AI**: `DEEPSEEK_API_KEY`, `EMBEDDINGS_API_KEY`
- **WhatsApp**: `JWT_TOKEN`, `NUMBER_ID`, `VERIFY_TOKEN`
- **Memory**: `REDIS_HOST`, `QDRANT_URL`
- **Payments**: `GUMROAD_PRODUCT_ID_EN`, `GUMROAD_PRODUCT_ID_ES`, `GUMROAD_WEBHOOK_SECRET`

### Database Schema

The application uses PostgreSQL with Drizzle ORM for type-safe database operations. **Recent schema improvements (2024)** include enhanced subscription status handling and data integrity measures.

#### **Core Tables**
- **users**: Core user profiles with enhanced subscription status (`free`, `pending_payment`, `premium`, `past_due`, `canceled`)
- **runs**: Individual workout/run logs with performance metrics
- **training_plans**: Personalized training plans based on VDOT methodology
- **workouts**: Individual workout sessions within training plans
- **chat_messages**: Conversation history for context and memory
- **progress_summaries**: Weekly performance summaries and insights

#### **Recent Schema Updates**
- **Fixed subscription_status constraint** to support new onboarding flow
- **Enhanced data validation** with proper transaction handling
- **Improved error handling** with rollback mechanisms for failed operations
- **Consolidated user creation logic** to prevent duplicate records

### Development Notes
- The system is designed to be modular and scalable.
- The `api-gateway` is the central nervous system, coordinating all other packages and services.
- The three-layer memory system is key to providing personalized, context-aware responses.
- All new business logic should be encapsulated in a service and injected via DI.

### Error Handling Patterns
- The `loadConfig` function provides strict validation of environment variables at startup.
- Services implement comprehensive error logging.
- The main `app.ts` includes graceful shutdown logic.
- Webhook handlers include signature verification for security.

When working on this codebase:
1. Always use the DI container (`tsyringe`) for accessing services.
2. Follow the centralized configuration pattern in `app.ts`.
3. Respect the modular architecture; keep business logic within the appropriate packages.
4. When adding a new tool for the AI, register it in the `ToolRegistry`.
5. Be mindful of the different memory layers and use the appropriate one for the task.
