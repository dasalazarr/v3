import 'reflect-metadata';

import express from 'express';
import dotenv from 'dotenv';
import { container } from 'tsyringe';
import logger from './services/logger-service.js';
import { setupWhatsAppWebhook } from './whatsapp-webhook.js';
import { setupScheduledTasks } from './scheduled-tasks.js';
import { setupGracefulShutdown } from './graceful-shutdown.js';

// Import services and configurations
import { Database } from '@running-coach/database';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';

import { LanguageDetector, TemplateEngine, I18nService } from '@running-coach/shared';
import { AnalyticsService } from './services/analytics-service.js';
import { FreemiumService } from './services/freemium-service.js';

import { PlanBuilder } from '@running-coach/plan-generator';
import { HeadCoach, LLMClient } from '@running-coach/llm-orchestrator';


// Load environment variables
dotenv.config();

// Configuration interfaces
interface Config {
  // Database
  DATABASE_URL: string;
  
  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  
  // Qdrant
  QDRANT_URL: string;
  QDRANT_API_KEY?: string;
  QDRANT_COLLECTION: string;
  
  // OpenAI/DeepSeek for chat
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_BASE_URL: string;
  DEEPSEEK_MODEL: string;
  
  // Embeddings service
  EMBEDDINGS_API_KEY: string;
  EMBEDDINGS_BASE_URL: string;
  EMBEDDINGS_MODEL: string;
  
  // WhatsApp
  JWT_TOKEN: string;
  NUMBER_ID: string;
  VERIFY_TOKEN: string;

  MESSAGE_LIMIT: number;
  GUMROAD_LINK: string;
  
  // Application
  PORT: number;
  NODE_ENV: string;
}

// Load and validate configuration
function loadConfig(): Config {
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_HOST',
    'QDRANT_URL',
    'DEEPSEEK_API_KEY',
    'EMBEDDINGS_API_KEY',
    'JWT_TOKEN',
    'NUMBER_ID',
    'VERIFY_TOKEN',
    'MESSAGE_LIMIT',
    'GUMROAD_LINK'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    QDRANT_URL: process.env.QDRANT_URL!,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION || 'running_coach_memories',
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY!,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    EMBEDDINGS_API_KEY: process.env.EMBEDDINGS_API_KEY!,
    EMBEDDINGS_BASE_URL: process.env.EMBEDDINGS_BASE_URL || 'https://api.openai.com/v1',
    EMBEDDINGS_MODEL: process.env.EMBEDDINGS_MODEL || 'text-embedding-ada-002',
    JWT_TOKEN: process.env.JWT_TOKEN!,
    NUMBER_ID: process.env.NUMBER_ID!,
    VERIFY_TOKEN: process.env.VERIFY_TOKEN!,
    MESSAGE_LIMIT: parseInt(process.env.MESSAGE_LIMIT || '40'),
    GUMROAD_LINK: process.env.GUMROAD_LINK!,
    PORT: parseInt(process.env.PORT || '3000'),
    NODE_ENV: process.env.NODE_ENV || 'production'
  };
}

// Initialize services
async function initializeServices(config: Config) {
  logger.info('🚀 Initializing Running Coach services...');

  // Parse database URL
  const dbUrl = new URL(config.DATABASE_URL);
  const databaseConfig = {
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || '5432'),
    database: dbUrl.pathname.slice(1),
    username: dbUrl.username,
    password: dbUrl.password,
    ssl: config.NODE_ENV === 'production'
  };

  // Initialize Database
  const database = Database.getInstance(databaseConfig);
  await database.healthCheck();
  logger.info('✅ Database connected');

  // Initialize Redis Chat Buffer
  const chatBuffer = ChatBuffer.getInstance({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD
  });
  await chatBuffer.healthCheck();
  logger.info('✅ Redis chat buffer connected');

  // Initialize Vector Memory
  const vectorMemory = VectorMemory.getInstance(
    {
      url: config.QDRANT_URL,
      apiKey: config.QDRANT_API_KEY,
      collectionName: config.QDRANT_COLLECTION
    },
    {
      apiKey: config.DEEPSEEK_API_KEY,
      baseURL: config.DEEPSEEK_BASE_URL,
      model: config.DEEPSEEK_MODEL
    },
    {
      apiKey: config.EMBEDDINGS_API_KEY,
      baseURL: config.EMBEDDINGS_BASE_URL,
      model: config.EMBEDDINGS_MODEL
    }
  );
  await vectorMemory.initialize();
  logger.info('✅ Vector memory initialized');

  

  // Initialize LLM Client
  const llmClient = new LLMClient(logger);

  // Initialize Plan Builder
  const planBuilder = new PlanBuilder();

  // Initialize Head Coach
  const headCoach = new HeadCoach({
    vectorMemory,
    planBuilder,
    llmClient,
    database,
    chatBuffer,
    logger,
  });
  logger.info('✅ Head Coach initialized');

  // Initialize Analytics Service
  const analyticsService = new AnalyticsService(database);
  const freemiumService = new FreemiumService(
    chatBuffer,
    config.MESSAGE_LIMIT,
    config.GUMROAD_LINK
  );

  // Inicializar servicios de idioma
  // Estos servicios ya deberían estar inicializados en el paquete shared
  // y exportados como instancias singleton
  const { languageDetector, i18nService, templateEngine } = await import('@running-coach/shared');

  // Register services in DI container
  container.registerInstance('Database', database);
  container.registerInstance('ChatBuffer', chatBuffer);
  container.registerInstance('VectorMemory', vectorMemory);
          container.registerInstance('HeadCoach', headCoach);
  container.registerInstance('AnalyticsService', analyticsService);
  container.registerInstance('FreemiumService', freemiumService);
  
  container.registerInstance('LanguageDetector', languageDetector);
  container.registerInstance('I18nService', i18nService);
  container.registerInstance('TemplateEngine', templateEngine);

  return {
    database,
    chatBuffer,
    vectorMemory,
    headCoach,
    analyticsService,
    freemiumService,
    i18nService,
    templateEngine
  };
}

// Initialize WhatsApp Bot



// Setup health endpoints
function setupHealthEndpoints(app: express.Application, services: any) {
  // Root endpoint for basic verification
  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Running Coach API Gateway is running',
      documentation: '/health - Health check endpoint',
      version: '1.0.0'
    });
  });

  app.get('/health', async (req, res) => {
    try {
      const dbHealth = await services.database.healthCheck();
      const redisHealth = await services.chatBuffer.healthCheck();
      const vectorHealth = await services.vectorMemory.healthCheck();

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth ? 'healthy' : 'unhealthy',
          redis: redisHealth ? 'healthy' : 'unhealthy',
          vector_memory: vectorHealth ? 'healthy' : 'unhealthy'
        }
      };

      const allHealthy = dbHealth && redisHealth && vectorHealth;
      res.status(allHealthy ? 200 : 503).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get('/metrics', (req, res) => {
    // Placeholder for Prometheus metrics
    res.type('text/plain').send(`
# HELP running_coach_requests_total Total number of requests
# TYPE running_coach_requests_total counter
running_coach_requests_total 0

# HELP running_coach_users_active Active users
# TYPE running_coach_users_active gauge
running_coach_users_active 0
    `);
  });
}


// Main application
async function main() {
  try {
    logger.info('🏃‍♂️ Starting Running Coach AI Assistant...');
    
    const config = loadConfig();
    logger.info(`🌍 Environment: ${config.NODE_ENV}`);
    
        const services = await initializeServices(config);
    
    // Setup Express app for health checks, metrics, and webhook
    const app = express();
    // Parse JSON bodies for incoming requests
    app.use(express.json());

    setupWhatsAppWebhook(app, services, config);
    setupHealthEndpoints(app, services);
    setupScheduledTasks(services);
    setupGracefulShutdown(services);
    
    // Start HTTP server for health checks
    app.listen(config.PORT, () => {
      logger.info(`🌐 Health server running on port ${config.PORT}`);
    });
    
    logger.info('🎉 Running Coach AI Assistant is ready!');
    logger.info('💬 Send a WhatsApp message to start coaching...');
    
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}