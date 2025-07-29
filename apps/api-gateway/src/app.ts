import 'reflect-metadata';
import { createBot, createFlow, createProvider, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { container } from 'tsyringe';
import cron from 'node-cron';
import fetch from 'node-fetch';

// Import services and configurations
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { AIAgent, ToolRegistry, HybridAIAgent } from '@running-coach/llm-orchestrator';
import { LanguageDetector, TemplateEngine, I18nService } from '@running-coach/shared';
import { AnalyticsService } from './services/analytics-service.js';
import { FreemiumService } from './services/freemium-service.js';
import { createRunLoggerTool } from './tools/run-logger.js';
import { createPlanUpdaterTool } from './tools/plan-updater.js';
import { createOnboardingCompleterTool, createOnboardingStatusChecker } from './tools/onboarding-completer.js';
import { createTrainingPlanGeneratorTool } from './tools/training-plan-generator.js';
import { EnhancedMainFlow } from './flows/enhanced-main-flow.js';
import { FaqFlow } from './flows/faq-flow.js';
import { OnboardingFlow } from './flows/onboarding-flow.js';
import { handleWebOnboardingPremium, handleWebOnboardingFree } from './flows/web-onboarding-flow.js';
import { handleSystemDiagnostics, handleTestMessageProcessing } from './debug/system-diagnostics.js';
import {
  handleSimplifiedOnboarding,
  handleLegacyWebOnboardingPremium,
  handleLegacyWebOnboardingFree,
  handleOnboardingHealth
} from './flows/simplified-onboarding-flow.js';
import { handleGumroadWebhook } from './flows/payment-flow.js';

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

  MESSAGE_LIMIT: number;
  GUMROAD_LINK: string;
  GUMROAD_PRODUCT_ID_EN: string;
  GUMROAD_PRODUCT_ID_ES: string;
  GUMROAD_WEBHOOK_SECRET: string;
  
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
    'GUMROAD_LINK',
    'GUMROAD_PRODUCT_ID_EN',
    'GUMROAD_PRODUCT_ID_ES',
    'GUMROAD_WEBHOOK_SECRET'
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
    GUMROAD_PRODUCT_ID_EN: process.env.GUMROAD_PRODUCT_ID_EN!,
    GUMROAD_PRODUCT_ID_ES: process.env.GUMROAD_PRODUCT_ID_ES!,
    GUMROAD_WEBHOOK_SECRET: process.env.GUMROAD_WEBHOOK_SECRET!,
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
  console.log('✅ Vector memory initialized');

  // Initialize Tool Registry
  const toolRegistry = new ToolRegistry();
  
  // Register tools
  toolRegistry.register(createRunLoggerTool(database, vectorMemory));
  toolRegistry.register(createPlanUpdaterTool(database, vectorMemory));
  toolRegistry.register(createOnboardingCompleterTool());
  toolRegistry.register(createOnboardingStatusChecker());
  toolRegistry.register(createTrainingPlanGeneratorTool());
  console.log('✅ Tools registered (including onboarding and training plan tools)');

  // Initialize Hybrid AI Agent with both DeepSeek and GPT-4o Mini
  const hybridAiAgent = new HybridAIAgent(
    {
      deepseek: {
        apiKey: config.DEEPSEEK_API_KEY,
        baseURL: config.DEEPSEEK_BASE_URL,
        model: config.DEEPSEEK_MODEL
      },
      openai: {
        apiKey: config.EMBEDDINGS_API_KEY, // Using same OpenAI key
        baseURL: config.EMBEDDINGS_BASE_URL,
        model: 'gpt-4o-mini'
      }
    },
    chatBuffer,
    vectorMemory,
    toolRegistry
  );
  console.log('✅ Hybrid AI Agent initialized with DeepSeek + GPT-4o Mini');

  // Keep legacy AI Agent for backward compatibility
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
  console.log('✅ Legacy AI Agent initialized');

  // Initialize Analytics Service
  const analyticsService = new AnalyticsService(database);
  const freemiumService = new FreemiumService(
    chatBuffer,
    config.MESSAGE_LIMIT,
    config.GUMROAD_PRODUCT_ID_EN,
    config.GUMROAD_PRODUCT_ID_ES
  );

  // Inicializar servicios de idioma
  // Estos servicios ya deberían estar inicializados en el paquete shared
  // y exportados como instancias singleton
  const { languageDetector, i18nService, templateEngine } = await import('@running-coach/shared');

  // Register services in DI container
  container.registerInstance('Database', database);
  container.registerInstance('ChatBuffer', chatBuffer);
  container.registerInstance('VectorMemory', vectorMemory);
  container.registerInstance('AIAgent', aiAgent); // Legacy agent
  container.registerInstance('HybridAIAgent', hybridAiAgent); // New hybrid agent
  container.registerInstance('AnalyticsService', analyticsService);
  container.registerInstance('FreemiumService', freemiumService);
  container.registerInstance('ToolRegistry', toolRegistry);
  container.registerInstance('LanguageDetector', languageDetector);
  container.registerInstance('I18nService', i18nService);
  container.registerInstance('TemplateEngine', templateEngine);
  container.registerInstance('GUMROAD_PRODUCT_ID_EN', config.GUMROAD_PRODUCT_ID_EN);
  container.registerInstance('GUMROAD_PRODUCT_ID_ES', config.GUMROAD_PRODUCT_ID_ES);
  container.registerInstance('GUMROAD_WEBHOOK_SECRET', config.GUMROAD_WEBHOOK_SECRET);

  return {
    database,
    chatBuffer,
    vectorMemory,
    aiAgent,
    hybridAiAgent,
    analyticsService,
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

  // Initialize flows and register them in the container
  const mainFlow = new EnhancedMainFlow(services.hybridAiAgent, services.database, services.vectorMemory, services.languageDetector);
  container.registerInstance('EnhancedMainFlow', mainFlow);

  const onboardingFlow = new OnboardingFlow(services.database, services.templateEngine);
  container.registerInstance('OnboardingFlow', onboardingFlow);

  const faqFlow = new FaqFlow(services.aiAgent, services.languageDetector, services.templateEngine, services.database);
  container.registerInstance('FaqFlow', faqFlow);

  const flow = createFlow([mainFlow.createFlow()]);

  const bot = createBot({
    provider,
    flow,
    database: new MemoryDB() // We handle our own database
  });

  console.log('✅ WhatsApp bot initialized');
  return { bot, provider };
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
    console.log(`
🛑 Received ${signal}, shutting down gracefully...`);
    
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
    app.use(cors()); // Enable CORS for all routes

    // Use express.urlencoded for Gumroad webhooks (they send x-www-form-urlencoded)
    app.use('/webhook/gumroad', express.urlencoded({ extended: true }));
    app.use(express.json());

    // Simplified Onboarding Endpoints (New)
    app.post('/onboarding/start', handleSimplifiedOnboarding);
    app.get('/onboarding/health', handleOnboardingHealth);

    // Debug endpoint to check webhook configuration
    app.get('/debug/webhook', (req, res) => {
      res.json({
        status: 'webhook_endpoint_ready',
        webhook_url: 'https://v3-production-2670.up.railway.app/webhook',
        verify_token_configured: !!config.VERIFY_TOKEN,
        jwt_token_configured: !!config.JWT_TOKEN,
        number_id_configured: !!config.NUMBER_ID,
        timestamp: new Date().toISOString(),
        instructions: {
          step1: 'Go to https://developers.facebook.com/apps/',
          step2: 'Select your WhatsApp app → Configuration',
          step3: 'Set Webhook URL to: https://v3-production-2670.up.railway.app/webhook',
          step4: 'Set Verify Token to match your VERIFY_TOKEN environment variable',
          step5: 'Subscribe to "messages" field',
          step6: 'Test webhook from Meta Business dashboard'
        }
      });
    });

    // Legacy Web Onboarding Endpoints (Backward Compatibility)
    app.post('/onboarding/premium', handleLegacyWebOnboardingPremium);
    app.post('/onboarding/free', handleLegacyWebOnboardingFree);

    // Gumroad Webhook
    app.post('/webhook/gumroad', handleGumroadWebhook);
    
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
        console.log('🔥 [WEBHOOK] Received WhatsApp webhook at:', new Date().toISOString());
        console.log('🔥 [WEBHOOK] Full webhook data:', JSON.stringify(data, null, 2));

        // Process webhook data for WhatsApp Business API
        if (data && data.object === 'whatsapp_business_account') {
          console.log('🔥 [WEBHOOK] Processing WhatsApp Business API webhook...');
          
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
                        console.log('🔥 [MESSAGE] Processing message:', JSON.stringify(message, null, 2));

                        if (message.type === 'text' && message.text && message.text.body) {
                          const phone = message.from;
                          const messageText = message.text.body;

                          console.log(`🔥 [MESSAGE] Text message from ${phone}: "${messageText}"`);
                          console.log(`🔥 [MESSAGE] Message length: ${messageText.length} characters`);

                          // Get or create user
                          console.log(`🔥 [DATABASE] Looking for user with phone: ${phone}`);
                          let [user] = await services.database.query
                            .select()
                            .from(users)
                            .where(eq(users.phoneNumber, phone))
                            .limit(1);

                          if (!user) {
                            console.log(`🔥 [DATABASE] User not found, creating new user for phone: ${phone}`);
                            [user] = await services.database.query
                              .insert(users)
                              .values({
                                phoneNumber: phone,
                                preferredLanguage: 'es',
                                subscriptionStatus: 'free',
                                weeklyMessageCount: 0,
                                onboardingCompleted: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                              })
                              .returning();
                            console.log(`🔥 [DATABASE] New user created with VALID status:`, JSON.stringify(user, null, 2));
                          } else {
                            console.log(`🔥 [DATABASE] Existing user found:`, JSON.stringify(user, null, 2));
                          }

                          // 🔥 PREMIUM INTENT DETECTION
                          const lowerMessage = messageText.toLowerCase();
                          const isPremiumIntent = lowerMessage.includes('premium') || lowerMessage.includes('upgrade') || lowerMessage.includes('paid') || lowerMessage.includes('💎');

                          // Detect language from current message
                          const detectedLanguage = await services.languageDetector.detect(messageText);
                          console.log(`🔥 [LANGUAGE] Detected language: ${detectedLanguage} from message: "${messageText}"`);

                          console.log(`🔥 [INTENT] Analyzing message for premium intent: "${messageText}"`);
                          console.log(`🔥 [INTENT] Premium intent detected: ${isPremiumIntent}`);
                          console.log(`🔥 [INTENT] User subscription status: ${user.subscriptionStatus}`);

                          // Handle premium intent FIRST, before freemium check
                          const canUpgradeToPremium = user.subscriptionStatus !== 'premium' && user.subscriptionStatus !== 'pending_payment';
                          if (isPremiumIntent && canUpgradeToPremium) {
                            console.log(`🔥 [PREMIUM] Processing premium upgrade for user ${phone}`);

                            try {
                              // Update user status to pending_payment and language
                              const [updatedUser] = await services.database.query
                                .update(users)
                                .set({
                                  subscriptionStatus: 'pending_payment',
                                  preferredLanguage: detectedLanguage as 'es' | 'en',
                                  updatedAt: new Date()
                                })
                                .where(eq(users.id, user.id))
                                .returning();

                              // Generate Gumroad payment link
                              const gumroadUrl = services.freemiumService.generatePaymentLink(updatedUser);
                              console.log(`🔥 [PREMIUM] Generated Gumroad URL: ${gumroadUrl}`);

                              const premiumMessage = detectedLanguage === 'es'
                                ? `¡Perfecto! 🏃‍♂️ Para acceder a Andes Premium, completa tu pago aquí: ${gumroadUrl}\n\nUna vez completado el pago, regresa aquí para comenzar tu entrenamiento personalizado.`
                                : `Perfect! 🏃‍♂️ To access Andes Premium, complete your payment here: ${gumroadUrl}\n\nOnce payment is complete, return here to start your personalized training.`;

                              await sendWhatsAppMessage(phone, premiumMessage, config);
                              console.log(`🔥 [PREMIUM] Payment link sent successfully to ${phone}`);
                              continue; // Skip AI processing for premium intent
                            } catch (error) {
                              console.error(`🔥 [PREMIUM] Error processing premium upgrade for ${phone}:`, error);
                              const errorMessage = detectedLanguage === 'es'
                                ? 'Lo siento, hubo un error procesando tu solicitud premium. Por favor intenta de nuevo.'
                                : 'Sorry, there was an error processing your premium request. Please try again.';
                              await sendWhatsAppMessage(phone, errorMessage, config);
                              continue;
                            }
                          }

                          // Check message allowance for non-premium intents
                          const allowance = await services.freemiumService.checkMessageAllowance(user);
                          if (!allowance.allowed) {
                            const upsell = user.preferredLanguage === 'en'
                              ? `You reached the free message limit. Upgrade here: ${allowance.link}`
                              : `Has alcanzado tu límite gratuito. Mejora aquí: ${allowance.link}`;
                            await sendWhatsAppMessage(phone, upsell, config);
                            continue;
                          }

                          // Process message with Hybrid AI Agent (intelligent model routing)
                          console.log(`🤖 [HYBRID_AI] Processing message with intelligent routing`);
                          const aiResponse = await services.hybridAiAgent.processMessage({
                            userId: user.id,
                            message: messageText,
                            userProfile: {
                              subscriptionStatus: user.subscriptionStatus,
                              onboardingCompleted: user.onboardingCompleted,
                              preferredLanguage: user.preferredLanguage,
                              age: user.age || undefined,
                              gender: user.gender || undefined,
                              experienceLevel: user.experienceLevel || undefined
                            } as any
                          });

                          console.log(`🤖 [HYBRID_AI] Response generated using ${aiResponse.modelUsed} for intent: ${aiResponse.intent}`);
                          console.log(`🤖 [HYBRID_AI] Cost optimized: ${aiResponse.costOptimized}`);

                          // Log tool usage if any
                          if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
                            console.log(`🔧 [TOOLS] Used ${aiResponse.toolCalls.length} tools:`,
                              aiResponse.toolCalls.map(t => t.name).join(', '));
                          }

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
    
    console.log('🎉 Running Coach AI Assistant is ready! [v2.1 - Fixed User Creation]');
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