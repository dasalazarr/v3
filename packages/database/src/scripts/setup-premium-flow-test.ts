#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function setupPremiumFlowTest() {
  console.log('🔧 SETUP PREMIUM FLOW TEST - MODIFY EXISTING USER...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🔗 Connecting to Neon: ${databaseUrl.substring(0, 30)}...`);
  
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  // Use the existing user ID from the database
  const existingUserId = '46a4ceb1-be91-487e-8bfe-a9b95389351d';
  const newMessageCount = 12; // Over threshold to trigger premium upgrade

  try {
    console.log(`🎯 Modifying existing user: ${existingUserId}`);
    console.log(`📈 Setting message count to: ${newMessageCount}`);
    console.log(`📊 Changing status to: pending_payment (to simulate premium flow)`);
    console.log('');

    // Get current user state
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingUserId))
      .limit(1);

    if (!currentUser) {
      console.log('❌ User not found');
      await sql.end();
      return;
    }

    console.log('📋 CURRENT USER STATE:');
    console.log('=' .repeat(50));
    console.log(`🆔 ID: ${currentUser.id}`);
    console.log(`📱 Phone: ${currentUser.phoneNumber}`);
    console.log(`📊 Current Status: ${currentUser.subscriptionStatus}`);
    console.log(`📈 Current Messages: ${currentUser.weeklyMessageCount}`);
    console.log(`⭐ Premium Since: ${currentUser.premiumActivatedAt}`);
    console.log('');

    // Modify user to simulate premium flow testing
    console.log('🔄 MODIFYING USER FOR PREMIUM FLOW TESTING...');
    
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        subscriptionStatus: 'pending_payment', // Simulate user who initiated purchase
        weeklyMessageCount: newMessageCount,   // High message count to trigger upgrade
        premiumActivatedAt: null,              // Remove premium activation
        updatedAt: now
      })
      .where(eq(users.id, existingUserId))
      .returning();

    console.log('✅ USER MODIFICATION SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Phone: ${updatedUser.phoneNumber}`);
    console.log(`📊 NEW Status: ${updatedUser.subscriptionStatus}`);
    console.log(`📈 NEW Message Count: ${updatedUser.weeklyMessageCount}`);
    console.log(`⭐ Premium Activated: ${updatedUser.premiumActivatedAt || 'Removed for testing'}`);
    console.log(`🔄 Updated At: ${updatedUser.updatedAt}`);
    console.log('');

    console.log('🎯 EXPECTED BEHAVIOR NOW:');
    console.log('=' .repeat(50));
    console.log('⏳ User has PENDING_PAYMENT status');
    console.log('📈 Message count (12) is over typical threshold');
    console.log('💎 Bot should show premium upgrade prompts');
    console.log('🔗 Gumroad purchase links should be provided');
    console.log('⏰ Message limit enforcement should activate');
    console.log('🎯 Perfect setup for testing premium ascendancy flow!');
    console.log('');

    console.log('🧪 TESTING PROTOCOL:');
    console.log('=' .repeat(50));
    console.log('1. Send message to WhatsApp bot from phone: 593984074389');
    console.log('2. Bot should detect high message count + pending_payment status');
    console.log('3. Premium upgrade prompt should appear');
    console.log('4. Gumroad purchase link should be provided');
    console.log('5. Monitor Railway logs for premium intent detection');
    console.log('');

    console.log('📊 RAILWAY LOGS TO MONITOR:');
    console.log('🔍 [DATABASE] User subscription status: pending_payment');
    console.log('🔍 [MESSAGE_LIMIT] Weekly count: 12');
    console.log('🔍 [INTENT] Premium intent detected: true');
    console.log('🔍 [PREMIUM_FLOW] Upgrade prompt triggered');
    console.log('🔍 [GUMROAD] Purchase link generated');
    console.log('');

    console.log('🔄 TO RESTORE PREMIUM STATUS AFTER TESTING:');
    console.log('Run: npx tsx packages/database/src/scripts/activate-premium-manual.ts');
    console.log('');

    console.log('✅ PREMIUM FLOW TEST SETUP COMPLETE!');
    console.log('User is now configured to trigger premium upgrade prompts.');

  } catch (error) {
    console.error('❌ Error setting up premium flow test:', error);
  } finally {
    await sql.end();
  }
}

// Run the setup
setupPremiumFlowTest().catch(console.error);
