import 'reflect-metadata';
import { createBot, createFlow, createProvider, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import express from 'express';
import dotenv from 'dotenv';
import { container } from 'tsyringe';
import cron from 'node-cron';
import fetch from 'node-fetch';

// Import services and configurations
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { AIAgent, ToolRegistry } from '@running-coach/llm-orchestrator';
import { LanguageDetector, TemplateEngine, I18nService } from '@running-coach/shared';
import { AnalyticsService } from './services/analytics-service.js';
import { StripeService } from './services/stripe-service.js';
import { FreemiumService } from './services/freemium-service.js';
import { createRunLoggerTool } from './tools/run-logger.js';
import { createPlanUpdaterTool } from './tools/plan-updater.js';
import { EnhancedMainFlow } from './flows/enhanced-main-flow.js';
import { FaqFlow } from './flows/faq-flow.js';
import { OnboardingFlow } from './flows/onboarding-flow.js';

// Load environment variables
dotenv.config();

// Function to send WhatsApp messages via Meta API
async function sendWhatsAppMessage(to: string, message: string, config: any) {
  try {
    const url = `https://graph.facebook.com/v17.0/${config.NUMBER_ID}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to send WhatsApp message: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ WhatsApp message sent successfully:`, result);
    return true;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
}

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

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  MESSAGE_LIMIT: number;
  STRIPE_PRICE_ID: string;
  
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
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'MESSAGE_LIMIT',
    'STRIPE_PRICE_ID'
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
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
    MESSAGE_LIMIT: parseInt(process.env.MESSAGE_LIMIT || '40'),
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID!,
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
    },
    {
      apiKey: config.EMBEDDINGS_API_KEY,
      baseURL: config.EMBEDDINGS_BASE_URL,
      model: config.EMBEDDINGS_MODEL
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
  const stripeService = new StripeService(
    config.STRIPE_SECRET_KEY,
    config.STRIPE_WEBHOOK_SECRET,
    database
  );
  const freemiumService = new FreemiumService(
    chatBuffer,
    stripeService,
    config.MESSAGE_LIMIT,
    config.STRIPE_PRICE_ID
  );

  // Inicializar servicios de idioma
  // Estos servicios ya deberían estar inicializados en el paquete shared
  // y exportados como instancias singleton
  const { languageDetector, i18nService, templateEngine } = await import('@running-coach/shared');

  // Register services in DI container
  container.registerInstance('Database', database);
  container.registerInstance('ChatBuffer', chatBuffer);
  container.registerInstance('VectorMemory', vectorMemory);
  container.registerInstance('AIAgent', aiAgent);
  container.registerInstance('AnalyticsService', analyticsService);
  container.registerInstance('StripeService', stripeService);
  container.registerInstance('FreemiumService', freemiumService);
  container.registerInstance('ToolRegistry', toolRegistry);
  container.registerInstance('LanguageDetector', languageDetector);
  container.registerInstance('I18nService', i18nService);
  container.registerInstance('TemplateEngine', templateEngine);

  return {
    database,
    chatBuffer,
    vectorMemory,
    aiAgent,
    analyticsService,
    stripeService,
    freemiumService,
    toolRegistry,
    languageDetector,
    i18nService,
    templateEngine
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

  // Obtener servicios del contenedor
  const languageDetector = services.languageDetector;
  const templateEngine = services.templateEngine;
  
  // Inicializar flujos principales
  const mainFlow = new EnhancedMainFlow(services.aiAgent, services.database, services.vectorMemory, languageDetector);
  
  // Inicializar flujo FAQ con soporte bilingüe
  const faqFlow = new FaqFlow(services.aiAgent, languageDetector, templateEngine, services.database);
  
  // Inicializar y registrar flujo de Onboarding
  const onboardingFlow = new OnboardingFlow(services.database, services.templateEngine);

  // Registrar flujos en el contenedor
  container.registerInstance('FaqFlow', faqFlow);
  container.registerInstance('OnboardingFlow', onboardingFlow);
  
  // Crear flujo combinado con soporte para FAQ
  const faqFlowInstance = faqFlow.createFlow();
  const onboardingFlowInstance = onboardingFlow.createFlow();

  const flow = createFlow([
    mainFlow.createFlow(),
    faqFlowInstance,
    onboardingFlowInstance
  ]);

  const bot = createBot({
    provider,
    flow,
    database: new MemoryDB() // We handle our own database
  });

  console.log('✅ WhatsApp bot initialized');
  return { bot, provider }; // Devolvemos tanto el bot como el provider
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
    const { bot, provider } = await initializeBot(config, services);
    
    // Setup Express app for health checks, metrics, and webhook
    const app = express();
    app.post(
      '/stripe/webhook',
      express.raw({ type: 'application/json' }),
      async (req, res) => {
        const sig = req.headers['stripe-signature'] as string;
        try {
          const event = services.stripeService.constructEvent(req.body, sig);
          await services.stripeService.handleEvent(event);
          res.json({ received: true });
        } catch (err) {
          console.error('❌ Stripe webhook error:', err);
          res.status(400).send('Webhook Error');
        }
      }
    );

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
    app.post('/webhook', async (req, res) => {
      // Always respond with 200 OK to WhatsApp as required
      res.status(200).send('OK');
      
      try {
        // Process the incoming webhook data
        const data = req.body;
        console.log('💬 Received WhatsApp webhook:', JSON.stringify(data).substring(0, 100) + '...');
        
        // Process webhook data for WhatsApp Business API
        if (data && data.object === 'whatsapp_business_account') {
          console.log('💬 Processing WhatsApp webhook data...');
          
          // Extract messages and process them
          if (data.entry && Array.isArray(data.entry)) {
            for (const entry of data.entry) {
              if (entry.changes && Array.isArray(entry.changes)) {
                for (const change of entry.changes) {
                  if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
                    console.log(`📱 Found ${change.value.messages.length} messages to process`);
                    
                    // Process each message with AI Agent
                    for (const message of change.value.messages) {
                      try {
                        if (message.type === 'text' && message.text && message.text.body) {
                          const phone = message.from;
                          const messageText = message.text.body;

                          console.log(`📩 Processing message from ${phone}: ${messageText.substring(0, 50)}...`);

                          // Get or create user
                          let [user] = await services.database.query
                            .select()
                            .from(users)
                            .where(eq(users.phoneNumber, phone))
                            .limit(1);
                          if (!user) {
                            [user] = await services.database.query
                              .insert(users)
                              .values({ phoneNumber: phone, preferredLanguage: 'es' })
                              .returning();
                          }

                          const allowance = await services.freemiumService.checkMessageAllowance(user);
                          if (!allowance.allowed) {
                            const upsell = user.preferredLanguage === 'en'
                              ? `You reached the free message limit. Upgrade here: ${allowance.link}`
                              : `Has alcanzado tu límite gratuito. Mejora aquí: ${allowance.link}`;
                            await sendWhatsAppMessage(phone, upsell, config);
                            continue;
                          }

                          // Process message with AI Agent
                          const aiResponse = await services.aiAgent.processMessage({
                            userId: user.id,
                            message: messageText
                          });

                          if (aiResponse && aiResponse.content && aiResponse.content.length > 0) {
                            // Send response back to WhatsApp
                            await sendWhatsAppMessage(phone, aiResponse.content, config);
                            console.log(`✅ Sent AI response to ${phone}: ${aiResponse.content.substring(0, 50)}...`);
                          }
                        }
                      } catch (messageError) {
                        console.error('❌ Error processing individual message:', messageError);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
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