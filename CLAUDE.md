# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development and Building
- `npm run dev` - Start development server with lint checking and hot reload using nodemon
- `npm run build` - Build the application using Rollup
- `npm start` - Run the built application from dist/app.js
- `npm run lint` - Run ESLint on the entire codebase

### Testing
No specific test commands are configured. Check with the user for testing approach if needed.

## Project Architecture

### Core Framework
This is a TypeScript WhatsApp AI assistant with multi-agent capabilities built with:
- **BuilderBot**: Primary chatbot framework for WhatsApp integration
- **OpenAI/DeepSeek API**: AI service for natural language processing
- **PostgreSQL**: Primary database storage
- **Qdrant**: Vector database for memory and semantic search
- **Redis**: Caching and session management
- **Google Calendar API**: Appointment scheduling
- **tsyringe**: Dependency injection container

### Multi-Agent System Architecture
The project implements an advanced multi-agent system for Running Coach functionality:
- **Orchestrator**: Central coordination of agent workflows
- **Planner Agent**: Task decomposition and planning
- **Executor Agent**: Specialized task execution
- **Reflexion Agent**: Self-correction and improvement
- **Training Agent**: Running training plan generation
- **Progress Agent**: Performance analysis and tracking
- **Injury Prevention Agent**: Risk assessment and recovery planning

### Dependency Injection System
The project uses a centralized DI system with tsyringe:
- All services are registered in `src/di/container.ts`
- Services use `@singleton()` decorator
- Import container and resolve services: `container.resolve<ServiceType>('ServiceName')`
- **Critical**: Import `"reflect-metadata"` at the top of app.ts

### Configuration Management
All environment variables are centralized in `src/config/index.ts`:
- Single source of truth for configuration
- Validates and logs missing critical variables
- Import as: `import { config } from './config'` or `import { config } from './config/index'`

### Key Services Architecture

#### Multi-Agent Services
- **MultiAgentService**: Orchestrates multi-agent workflows
- **VectorMemoryService**: Advanced semantic memory management
- **AdvancedMemoryManager**: Context-aware memory operations
- **WorkflowManager**: Manages agent task dependencies
- **ReflexionService**: Self-correction and performance optimization

#### Core Services
- **DatabaseService**: PostgreSQL operations for structured data
- **AIService**: DeepSeek API integration with tool calling
- **VectorService**: Qdrant vector database operations
- **CacheService**: Redis caching for performance
- **AnalyticsService**: Running performance analytics

#### AppointmentService & AppointmentController
Google Calendar integration for scheduling:
- Service handles calendar operations
- Controller manages business logic and validation
- Automatic conflict detection and validation

#### TranslationService
Bilingual support (EN/ES) with automatic language detection using `franc` library.

### Data Storage Strategy
- **Primary Storage**: PostgreSQL with comprehensive schemas
- **Vector Storage**: Qdrant for semantic search and memory
- **Cache Storage**: Redis for session and performance optimization
- **User Data**: Structured user profiles and preferences
- **Training Data**: Running plans, workouts, and progress tracking
- **Conversations**: Vector-enhanced conversation history
- **Appointments**: Integrated with Google Calendar

### Package Architecture
The project is structured as a monorepo with specialized packages:
- `packages/multi-agent/` - Multi-agent system core
- `packages/vector-memory/` - Advanced memory management
- `packages/llm-orchestrator/` - LLM coordination
- `packages/database/` - Database operations
- `packages/cache/` - Caching layer
- `apps/api-gateway/` - Main application entry point

### Flow Architecture
Conversational flows in `src/templates/`:
- `mainFlow.ts` - Primary conversation handler
- `appointmentFlow.ts` - Appointment scheduling
- `faqFlow.ts` - FAQ handling
- `trainingFlow.ts` - Training flow

### Key Environment Variables
Required variables (defined in configuration):
- `apiKey` - DeepSeek API key
- `jwtToken`, `numberId`, `verifyToken` - WhatsApp Meta API
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `QDRANT_URL`, `QDRANT_API_KEY` - Qdrant vector database
- `GOOGLE_CALENDAR_ID` - Calendar for appointments
- `privateKey`, `clientEmail` - Google service account

### Multi-Agent Configuration Variables
- `MULTI_AGENT_ENABLED` - Enable/disable multi-agent system
- `MULTI_AGENT_PERCENTAGE` - Gradual rollout percentage
- `ENABLE_REFLECTION` - Enable reflexion agent
- `AGENT_TIMEOUT_MS` - Agent execution timeout
- `MAX_WORKFLOW_RETRIES` - Maximum retry attempts

### ESM Configuration
The project uses ES modules (`"type": "module"` in package.json):
- Use `import.meta.url` for __dirname equivalent
- All imports use ES module syntax
- Rollup handles bundling for distribution

### Development Notes
- The system maintains conversation context across sessions with vector memory
- Multi-agent workflows provide specialized running coach capabilities
- Advanced semantic memory for context-aware responses
- Bilingual support with automatic language detection
- Scheduled tasks system for background operations
- Graceful shutdown handling for services
- Feature flags enable gradual multi-agent system rollout
- Self-correcting agents with reflexion capabilities

### Multi-Agent Development Phases
1. **Phase 1**: Foundation - Base agents and orchestrator
2. **Phase 2**: Advanced Memory - Vector-enhanced memory system
3. **Phase 3**: Specialized Agents - Training, Progress, Injury Prevention
4. **Phase 4**: Intelligent Orchestration - Workflow management
5. **Phase 5**: Integration - API Gateway and feature flags
6. **Phase 6**: Optimization - Reflexion and monitoring

### Error Handling Patterns
- Services implement comprehensive error logging
- Google API operations include retry logic
- Configuration validation at startup
- Graceful degradation for missing services

When working on this codebase:
1. Always use the DI container instead of direct instantiation
2. Follow the centralized configuration pattern
3. Respect the service layer architecture
4. Test WhatsApp flows thoroughly as they're the primary interface
5. Be mindful of API rate limits and caching strategies
6. Use feature flags for gradual multi-agent system rollout
7. Leverage vector memory for context-aware operations
8. Follow multi-agent workflow patterns for complex tasks
9. Implement proper error handling and reflexion capabilities
10. Maintain compatibility between single-agent and multi-agent modes