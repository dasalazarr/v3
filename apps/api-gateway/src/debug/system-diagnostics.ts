import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { Database, users } from '@running-coach/database';
import { eq } from 'drizzle-orm';

/**
 * Comprehensive system diagnostics endpoint
 * Helps identify gaps in the processing pipeline
 */
export const handleSystemDiagnostics = async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DIAGNOSTICS] Starting comprehensive system check...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system_status: 'checking',
      components: {},
      recent_activity: {},
      configuration: {},
      gaps_identified: []
    };

    // 1. Check Database Connection and Recent Users
    try {
      const database = container.resolve<Database>('Database');
      
      // Get recent users
      const recentUsers = await database.query
        .select()
        .from(users)
        .orderBy(users.createdAt)
        .limit(5);

      // Get user with specific phone number from logs
      const testUser = await database.query
        .select()
        .from(users)
        .where(eq(users.phoneNumber, '593984074389'))
        .limit(1);

      diagnostics.components.database = {
        status: 'healthy',
        recent_users_count: recentUsers.length,
        test_user_found: testUser.length > 0,
        test_user_details: testUser[0] || null
      };

      console.log('✅ [DIAGNOSTICS] Database check completed');
    } catch (error) {
      diagnostics.components.database = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      diagnostics.gaps_identified.push('Database connection issues');
    }

    // 2. Check AI Services Configuration
    try {
      const aiConfig = {
        deepseek_configured: !!process.env.DEEPSEEK_API_KEY,
        openai_configured: !!process.env.EMBEDDINGS_API_KEY,
        deepseek_base_url: process.env.DEEPSEEK_BASE_URL,
        deepseek_model: process.env.DEEPSEEK_MODEL
      };

      diagnostics.components.ai_services = aiConfig;

      if (!aiConfig.deepseek_configured) {
        diagnostics.gaps_identified.push('DeepSeek API key not configured');
      }
      if (!aiConfig.openai_configured) {
        diagnostics.gaps_identified.push('OpenAI API key not configured');
      }

      console.log('✅ [DIAGNOSTICS] AI services check completed');
    } catch (error) {
      diagnostics.gaps_identified.push('AI services configuration error');
    }

    // 3. Check WhatsApp Configuration
    try {
      const whatsappConfig = {
        jwt_token_configured: !!process.env.JWT_TOKEN,
        number_id_configured: !!process.env.NUMBER_ID,
        verify_token_configured: !!process.env.VERIFY_TOKEN,
        number_id: process.env.NUMBER_ID,
        webhook_url: `${req.protocol}://${req.get('host')}/webhook`
      };

      diagnostics.components.whatsapp = whatsappConfig;

      if (!whatsappConfig.jwt_token_configured) {
        diagnostics.gaps_identified.push('WhatsApp JWT token not configured');
      }

      console.log('✅ [DIAGNOSTICS] WhatsApp configuration check completed');
    } catch (error) {
      diagnostics.gaps_identified.push('WhatsApp configuration error');
    }

    // 4. Check Container Services
    try {
      const containerServices = {
        database: container.isRegistered('Database'),
        hybrid_ai_agent: container.isRegistered('HybridAIAgent'),
        ai_agent: container.isRegistered('AIAgent'),
        vector_memory: container.isRegistered('VectorMemory'),
        tool_registry: container.isRegistered('ToolRegistry'),
        language_detector: container.isRegistered('LanguageDetector')
      };

      diagnostics.components.container_services = containerServices;

      Object.entries(containerServices).forEach(([service, registered]) => {
        if (!registered) {
          diagnostics.gaps_identified.push(`Container service not registered: ${service}`);
        }
      });

      console.log('✅ [DIAGNOSTICS] Container services check completed');
    } catch (error) {
      diagnostics.gaps_identified.push('Container services check error');
    }

    // 5. Analyze Recent Webhook Activity
    try {
      // This would ideally check recent webhook logs
      // For now, we'll note what we should be seeing
      diagnostics.recent_activity = {
        expected_logs: [
          '🔥 [WEBHOOK] Received WhatsApp webhook',
          '🔥 [WEBHOOK] Processing message from user',
          '🧠 [HYBRID_AI] Intent Classification',
          '🤖 [HYBRID_AI] Response generated using [model]',
          '🔥 [WEBHOOK] Sending response to WhatsApp'
        ],
        observed_logs: [
          '🔥 [WEBHOOK] Received WhatsApp webhook',
          '🔥 [WEBHOOK] Processing WhatsApp Business API webhook'
        ],
        missing_logs: [
          'Message processing logs',
          'AI response generation logs',
          'Intent classification logs',
          'User interaction logs'
        ]
      };

      diagnostics.gaps_identified.push('Missing message processing logs - pipeline may be broken');
    } catch (error) {
      diagnostics.gaps_identified.push('Recent activity analysis error');
    }

    // 6. Environment Variables Audit
    const criticalEnvVars = [
      'DATABASE_URL',
      'JWT_TOKEN',
      'NUMBER_ID',
      'VERIFY_TOKEN',
      'DEEPSEEK_API_KEY',
      'EMBEDDINGS_API_KEY',
      'GUMROAD_PRODUCT_ID_EN',
      'GUMROAD_PRODUCT_ID_ES'
    ];

    diagnostics.configuration.environment_variables = {};
    criticalEnvVars.forEach(envVar => {
      diagnostics.configuration.environment_variables[envVar] = {
        configured: !!process.env[envVar],
        length: process.env[envVar]?.length || 0
      };

      if (!process.env[envVar]) {
        diagnostics.gaps_identified.push(`Missing environment variable: ${envVar}`);
      }
    });

    // 7. Final Status Assessment
    diagnostics.system_status = diagnostics.gaps_identified.length === 0 ? 'healthy' : 'issues_detected';

    console.log('🔍 [DIAGNOSTICS] System diagnostics completed');
    console.log(`🔍 [DIAGNOSTICS] Gaps identified: ${diagnostics.gaps_identified.length}`);

    return res.status(200).json(diagnostics);

  } catch (error) {
    console.error('❌ [DIAGNOSTICS] System diagnostics failed:', error);
    
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'System diagnostics failed to complete'
    });
  }
};

/**
 * Test message processing pipeline
 */
export const handleTestMessageProcessing = async (req: Request, res: Response) => {
  try {
    console.log('🧪 [TEST] Starting message processing pipeline test...');
    
    const testMessage = req.body.message || "today i ran 6.4 km in 34 minutes";
    const testUserId = req.body.userId || "test-user-id";

    // This would test the actual message processing pipeline
    // For now, we'll simulate what should happen
    
    const testResults = {
      timestamp: new Date().toISOString(),
      test_message: testMessage,
      test_user_id: testUserId,
      pipeline_steps: {
        message_received: true,
        user_lookup: false, // Would need to implement
        intent_classification: false, // Would need to implement
        ai_processing: false, // Would need to implement
        response_generation: false, // Would need to implement
        whatsapp_send: false // Would need to implement
      },
      gaps_identified: [
        'Message processing pipeline not accessible for testing',
        'Need to implement test harness for AI processing',
        'Cannot simulate full user interaction flow'
      ]
    };

    console.log('🧪 [TEST] Message processing test completed');
    
    return res.status(200).json(testResults);

  } catch (error) {
    console.error('❌ [TEST] Message processing test failed:', error);
    
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Message processing test failed'
    });
  }
};
