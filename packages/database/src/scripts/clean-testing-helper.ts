#!/usr/bin/env tsx

import { config } from 'dotenv';
import { ChatBuffer } from '@running-coach/vector-memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function cleanTestingHelper() {
  console.log('🧪 CLEAN TESTING HELPER - SYSTEM STATUS & TESTING GUIDE...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const testPhone = '593984074389';
    const messageLimit = parseInt(process.env.MESSAGE_LIMIT || '40');

    console.log('📊 CURRENT SYSTEM CONFIGURATION:');
    console.log('=' .repeat(50));
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚠️ Message Limit: ${messageLimit} messages/month`);
    console.log(`📱 Test Phone: ${testPhone}`);
    console.log(`🤖 WhatsApp Bot: +593987644414`);

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, testPhone))
      .limit(1);

    console.log('\n👤 USER STATUS:');
    console.log('=' .repeat(50));
    
    if (existingUser) {
      console.log('❌ USER EXISTS - NOT CLEAN FOR TESTING');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Phone: ${existingUser.phoneNumber}`);
      console.log(`   Status: ${existingUser.subscriptionStatus}`);
      console.log(`   Onboarding: ${existingUser.onboardingCompleted ? 'Completed' : 'Pending'}`);
      console.log(`   Language: ${existingUser.preferredLanguage}`);
      
      console.log('\n🔧 TO RESET FOR CLEAN TESTING:');
      console.log('   Run: npx tsx complete-system-reset.ts');
      
    } else {
      console.log('✅ NO USER EXISTS - READY FOR CLEAN TESTING');
      console.log(`   Phone ${testPhone} not found in database`);
      console.log('   Fresh user registration will work normally');
    }

    // Check Redis counter
    const chatBuffer = ChatBuffer.getInstance({
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    const redis = (chatBuffer as any).redis;
    const allKeys = await redis.keys('*');
    const userKeys = allKeys.filter((key: string) => 
      key.startsWith('msg:') || key.startsWith('chat:') || key.startsWith('state:')
    );

    console.log('\n📊 REDIS STATUS:');
    console.log('=' .repeat(50));
    console.log(`Total keys: ${allKeys.length}`);
    console.log(`User-related keys: ${userKeys.length}`);
    
    if (userKeys.length === 0) {
      console.log('✅ Redis is clean - no user data');
    } else {
      console.log('❌ Redis contains user data:');
      userKeys.forEach((key: string) => console.log(`   - ${key}`));
    }

    console.log('\n🧪 CLEAN TESTING FLOW:');
    console.log('=' .repeat(50));
    
    if (!existingUser && userKeys.length === 0) {
      console.log('✅ SYSTEM IS READY FOR CLEAN TESTING!');
      console.log('');
      console.log('📱 STEP 1: Initial Contact');
      console.log('   Send: "Hola" to +593987644414');
      console.log('   Expected: Welcome message + onboarding start');
      console.log('');
      console.log('🏃 STEP 2: Onboarding Flow');
      console.log('   Follow the onboarding questions');
      console.log('   Expected: Goal, experience, mileage, injury questions');
      console.log('');
      console.log('📊 STEP 3: Message Counter Testing');
      console.log('   Send: "¿Cuál es mi contador de mensajes?"');
      console.log('   Expected: "Has usado X de 40 mensajes gratuitos"');
      console.log('');
      console.log('⚠️ STEP 4: Near Limit Testing');
      console.log('   Use: npx tsx setup-optimal-counter.ts 3  # Sets to 39/40');
      console.log('   Send message → Expected: "Te queda 1 mensaje gratuito"');
      console.log('');
      console.log('🚨 STEP 5: Limit Reached Testing');
      console.log('   Use: npx tsx setup-optimal-counter.ts 4  # Sets to 40/40');
      console.log('   Send message → Expected: Premium upgrade prompt + Gumroad link');
      console.log('');
      console.log('💎 STEP 6: Premium Testing');
      console.log('   Use: npx tsx activate-premium-manual.ts');
      console.log('   Send: "¿Cuál es mi contador?" → Expected: "¡Tienes Andes Premium!"');
      
    } else {
      console.log('❌ SYSTEM NOT READY - CLEANUP REQUIRED');
      console.log('');
      console.log('🔧 CLEANUP STEPS:');
      console.log('1. Run: npx tsx complete-system-reset.ts');
      console.log('2. Verify: npx tsx verify-system-reset.ts');
      console.log('3. Start testing: npx tsx clean-testing-helper.ts');
    }

    console.log('\n🔧 AVAILABLE TESTING SCRIPTS:');
    console.log('=' .repeat(50));
    console.log('🧹 System Management:');
    console.log('   - complete-system-reset.ts     # Delete all user data');
    console.log('   - verify-system-reset.ts       # Verify cleanup');
    console.log('   - clean-testing-helper.ts      # This script');
    console.log('');
    console.log('📊 Counter Management:');
    console.log('   - setup-optimal-counter.ts 1   # Normal (5 messages)');
    console.log('   - setup-optimal-counter.ts 2   # Warning (38 messages)');
    console.log('   - setup-optimal-counter.ts 3   # Critical (39 messages)');
    console.log('   - setup-optimal-counter.ts 4   # Limit reached (40 messages)');
    console.log('   - setup-optimal-counter.ts 5   # Reset (0 messages)');
    console.log('');
    console.log('💎 Premium Management:');
    console.log('   - activate-premium-manual.ts   # Activate premium');
    console.log('   - set-user-free.ts             # Set to free user');
    console.log('');
    console.log('🔍 Status Checking:');
    console.log('   - check-premium-status.ts      # Check user status');
    console.log('   - debug-counter-system.ts      # Debug counters');
    console.log('   - final-system-check.ts        # Complete system check');

    console.log('\n📊 MONITORING RAILWAY LOGS:');
    console.log('=' .repeat(50));
    console.log('🔍 Key log patterns to watch:');
    console.log('   [WEBHOOK] Received WhatsApp webhook');
    console.log('   [HYBRID_AI] Processing message');
    console.log('   [FREEMIUM] checkMessageAllowance called');
    console.log('   [TOOL_REGISTRY] Executing tool: check_message_counter');
    console.log('   [PREMIUM_FLOW] Upgrade prompt triggered');

  } catch (error) {
    console.error('❌ Error in clean testing helper:', error);
  } finally {
    await sql.end();
  }
}

// Run the helper
cleanTestingHelper().catch(console.error);
