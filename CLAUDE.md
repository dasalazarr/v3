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
This is a TypeScript WhatsApp AI assistant built with:
- **BuilderBot**: Primary chatbot framework for WhatsApp integration
- **OpenAI/DeepSeek API**: AI service for natural language processing
- **Google Sheets API**: Primary data storage
- **Google Calendar API**: Appointment scheduling
- **tsyringe**: Dependency injection container

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

#### SheetsService (`src/services/sheetsServices.ts`)
Primary data layer handling all Google Sheets operations:
- User management (registration, verification)
- Expense tracking with monthly sheets
- Conversation logging
- Implements caching for performance optimization

#### AIService (`src/services/aiservices.ts`)
Handles AI interactions with DeepSeek API:
- Message processing with conversation context
- Maintains conversation history (last 5 interactions per user)
- Integrates with Google Sheets for context persistence

#### AppointmentService & AppointmentController
Google Calendar integration for scheduling:
- Service handles calendar operations
- Controller manages business logic and validation
- Automatic conflict detection and validation

#### TranslationService
Bilingual support (EN/ES) with automatic language detection using `franc` library.

### Data Storage Strategy
- **Primary Storage**: Google Sheets with structured worksheets
- **User Data**: Phone number as primary key
- **Expenses**: Monthly sheets (format: Expenses_MM_YYYY)
- **Conversations**: Persistent conversation history
- **Appointments**: Integrated with Google Calendar

### Flow Architecture
Conversational flows in `src/templates/`:
- `mainFlow.ts` - Primary conversation handler
- `appointmentFlow.ts` - Appointment scheduling
- `faqFlow.ts` - FAQ handling
- `trainingFlow.ts` - Training flow

### Key Environment Variables
Required variables (defined in `src/config/index.ts`):
- `apiKey` - DeepSeek API key
- `jwtToken`, `numberId`, `verifyToken` - WhatsApp Meta API
- `spreadsheetId`, `trainingSpreadsheetId` - Google Sheets IDs
- `privateKey`, `clientEmail` - Google service account
- `GOOGLE_CALENDAR_ID` - Calendar for appointments

### ESM Configuration
The project uses ES modules (`"type": "module"` in package.json):
- Use `import.meta.url` for __dirname equivalent
- All imports use ES module syntax
- Rollup handles bundling for distribution

### Development Notes
- The system maintains conversation context across sessions
- Expense recognition uses natural language processing
- Bilingual support with automatic language detection
- Scheduled tasks system for background operations
- Graceful shutdown handling for services

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
5. Be mindful of Google API rate limits and caching strategies