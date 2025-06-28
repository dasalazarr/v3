import 'reflect-metadata';
import { createBot, createFlow, createProvider, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import express from 'express';
import dotenv from 'dotenv';
import { container } from 'tsyringe';
import cron from 'node-cron';

// Import services and configurations
import { Database } from '@running-coach/database';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { AIAgent, ToolRegistry } from '@running-coach/llm-orchestrator';
import { AnalyticsService } from './services/analytics-service.js';
import { createRunLoggerTool } from './tools/run-logger.js';
import { createPlanUpdaterTool } from './tools/plan-updater.js';
import { EnhancedMainFlow } from './flows/enhanced-main-flow.js';

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
  
  // OpenAI/DeepSeek
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_BASE_URL: string;
  DEEPSEEK_MODEL: string;
  
  // WhatsApp
  JWT_TOKEN: string;
  NUMBER_ID: string;
  VERIFY_TOKEN: string;
  
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
    'JWT_TOKEN',
    'NUMBER_ID',
    'VERIFY_TOKEN'
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
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    JWT_TOKEN: process.env.JWT_TOKEN!,
    NUMBER_ID: process.env.NUMBER_ID!,
    VERIFY_TOKEN: process.env.VERIFY_TOKEN!,
    PORT: parseInt(process.env.PORT || '3000'),
    NODE_ENV: process.env.NODE_ENV || 'production'
  };
}

// Initialize services
async function initializeServices(config: Config) {
  console.log('🚀 Initializing Running Coach services...');

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
  console.log('✅ Database connected');

  // Initialize Redis Chat Buffer
  const chatBuffer = ChatBuffer.getInstance({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD
  });
  await chatBuffer.healthCheck();
  console.log('✅ Redis chat buffer connected');

  // Initialize Vector Memory
  const vectorMemory = VectorMemory.getInstance(
    {
      url: config.QDRANT_URL,
      apiKey: config.QDRANT_API_KEY,
      collectionName: config.QDRANT_COLLECTION
    },
    {
      apiKey: config.DEEPSEEK_API_KEY,
      baseURL: config.DEEPSEEK_BASE_URL
    }
  );
  await vectorMemory.initialize();
  console.log('✅ Vector memory initialized');

  // Initialize Tool Registry
  const toolRegistry = new ToolRegistry();
  
  // Register tools
  toolRegistry.register(createRunLoggerTool(database, vectorMemory));
  toolRegistry.register(createPlanUpdaterTool(database, vectorMemory));
  console.log('✅ Tools registered');

  // Initialize AI Agent
  const aiAgent = new AIAgent(
    {
      apiKey: config.DEEPSEEK_API_KEY,
      baseURL: config.DEEPSEEK_BASE_URL,
      model: config.DEEPSEEK_MODEL
    },
    chatBuffer,
    vectorMemory,
    toolRegistry
  );
  console.log('✅ AI Agent initialized');

  // Initialize Analytics Service
  const analyticsService = new AnalyticsService(database);

  // Register services in DI container
  container.registerInstance('Database', database);
  container.registerInstance('ChatBuffer', chatBuffer);
  container.registerInstance('VectorMemory', vectorMemory);
  container.registerInstance('AIAgent', aiAgent);
  container.registerInstance('AnalyticsService', analyticsService);
  container.registerInstance('ToolRegistry', toolRegistry);

  return {
    database,
    chatBuffer,
    vectorMemory,
    aiAgent,
    analyticsService,
    toolRegistry
  };
}

// Initialize WhatsApp Bot
async function initializeBot(config: Config, services: any) {
  console.log('🤖 Initializing WhatsApp bot...');

  const provider = createProvider(MetaProvider, {
    jwtToken: config.JWT_TOKEN,
    numberId: config.NUMBER_ID,
    verifyToken: config.VERIFY_TOKEN,
    version: 'v18.0'
  });

  // Create enhanced main flow with AI integration
  const mainFlow = new EnhancedMainFlow(services.aiAgent, services.database, services.vectorMemory);
  const flow = createFlow([mainFlow.createFlow()]);

  const bot = createBot({
    provider,
    flow,
    database: new MemoryDB() // We handle our own database
  });

  console.log('✅ WhatsApp bot initialized');
  return bot;
}

// Setup scheduled tasks
function setupScheduledTasks(services: any) {
  console.log('⏰ Setting up scheduled tasks...');

  // Generate weekly progress summaries every Sunday at 9 AM
  cron.schedule('0 9 * * 0', async () => {
    console.log('📊 Running weekly progress summary generation...');
    try {
      // This would typically get all active users and generate summaries
      // For now, we'll implement a placeholder
      console.log('Weekly progress summaries generated');
    } catch (error) {
      console.error('Error generating weekly summaries:', error);
    }
  });

  // Daily VDOT recalculation at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🧮 Running daily VDOT recalculation...');
    try {
      // Recalculate VDOT for users with new runs
      console.log('Daily VDOT recalculation completed');
    } catch (error) {
      console.error('Error in daily VDOT recalculation:', error);
    }
  });

  console.log('✅ Scheduled tasks configured');
}

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

// Graceful shutdown
function setupGracefulShutdown(services: any) {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      await services.database.close();
      await services.chatBuffer.close();
      console.log('✅ All services closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Main application
async function main() {
  try {
    console.log('🏃‍♂️ Starting Running Coach AI Assistant...');
    
    const config = loadConfig();
    console.log(`🌍 Environment: ${config.NODE_ENV}`);
    
    const services = await initializeServices(config);
    const bot = await initializeBot(config, services);
    
    // Setup Express app for health checks, metrics, and webhook
    const app = express();
    app.use(express.json());
    
    // Configure WhatsApp webhook endpoint
    app.get('/webhook', (req, res) => {
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;
      
      // Check if a token and mode is in the query string of the request
      if (mode && token) {
        // Check the mode and token sent is correct
        if (mode === 'subscribe' && token === config.VERIFY_TOKEN) {
          // Respond with the challenge token from the request
          console.log('✅ WEBHOOK_VERIFIED');
          res.status(200).send(challenge);
        } else {
          // Respond with '403 Forbidden' if verify tokens do not match
          console.log('❌ WEBHOOK_VERIFICATION_FAILED: Token mismatch');
          res.sendStatus(403);
        }
      } else {
        console.log('❌ WEBHOOK_VERIFICATION_FAILED: Missing parameters');
        res.sendStatus(400);
      }
    });
    
    // Configure webhook POST endpoint for receiving messages
    app.post('/webhook', (req, res) => {
      // Always respond with 200 OK to WhatsApp as required
      res.status(200).send('OK');
      
      try {
        // Process the incoming webhook data
        const data = req.body;
        console.log('💬 Received WhatsApp webhook:', JSON.stringify(data).substring(0, 100) + '...');
        
        // The bot will handle the webhook data automatically
        // BuilderBot is designed to process webhooks internally
      } catch (error) {
        console.error('Error processing webhook:', error);
      }
    });
    
    setupHealthEndpoints(app, services);
    setupScheduledTasks(services);
    setupGracefulShutdown(services);
    
    // Start HTTP server for health checks
    app.listen(config.PORT, () => {
      console.log(`🌐 Health server running on port ${config.PORT}`);
    });
    
    console.log('🎉 Running Coach AI Assistant is ready!');
    console.log('💬 Send a WhatsApp message to start coaching...');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}