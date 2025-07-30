#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function updateMessageCount() {
  console.log('🔧 UPDATING MESSAGE COUNT FOR PREMIUM FLOW VALIDATION...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🔗 Connecting to Neon: ${databaseUrl.substring(0, 30)}...`);
  
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  const targetUserId = '4315f4f9-f4b1-46a6-994b-c2f71221ae9e';
  const newMessageCount = 12; // Over threshold to trigger premium upgrade

  try {
    console.log(`🎯 Target User ID: ${targetUserId}`);
    console.log(`📈 New Message Count: ${newMessageCount}`);
    console.log('');

    // First, try to find the user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!existingUser) {
      console.log('❌ User not found. Let me check what users exist...');
      
      // Check recent users
      const recentUsers = await db
        .select({
          id: users.id,
          phoneNumber: users.phoneNumber,
          subscriptionStatus: users.subscriptionStatus,
          weeklyMessageCount: users.weeklyMessageCount,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(users.createdAt)
        .limit(10);

      console.log(`\n📊 Found ${recentUsers.length} recent users:`);
      recentUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Phone: ${user.phoneNumber}`);
        console.log(`   Status: ${user.subscriptionStatus}`);
        console.log(`   Messages: ${user.weeklyMessageCount}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });

      await sql.end();
      return;
    }

    console.log('✅ USER FOUND!');
    console.log('=' .repeat(50));
    console.log(`🆔 ID: ${existingUser.id}`);
    console.log(`📱 Phone: ${existingUser.phoneNumber}`);
    console.log(`📊 Current Subscription: ${existingUser.subscriptionStatus}`);
    console.log(`📈 Current Message Count: ${existingUser.weeklyMessageCount}`);
    console.log(`✅ Onboarding Completed: ${existingUser.onboardingCompleted}`);
    console.log(`⭐ Premium Activated: ${existingUser.premiumActivatedAt || 'Not activated'}`);
    console.log('');

    // Update the message count
    console.log(`🔄 Updating message count from ${existingUser.weeklyMessageCount} to ${newMessageCount}...`);

    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        weeklyMessageCount: newMessageCount,
        updatedAt: now
      })
      .where(eq(users.id, targetUserId))
      .returning();

    console.log('✅ MESSAGE COUNT UPDATE SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Phone: ${updatedUser.phoneNumber}`);
    console.log(`📊 Subscription Status: ${updatedUser.subscriptionStatus}`);
    console.log(`📈 NEW Message Count: ${updatedUser.weeklyMessageCount}`);
    console.log(`🔄 Updated At: ${updatedUser.updatedAt}`);
    console.log('');

    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('=' .repeat(50));
    
    if (updatedUser.subscriptionStatus === 'pending_payment') {
      console.log('⏳ User has PENDING_PAYMENT status');
      console.log('💎 Bot should show premium upgrade prompts');
      console.log('🔗 Gumroad purchase links should be provided');
      console.log('⏰ Message limit enforcement should activate');
      console.log('🎯 This is perfect for testing premium flow!');
    } else if (updatedUser.subscriptionStatus === 'free') {
      console.log('🆓 User has FREE status');
      console.log('💎 Bot should show premium upgrade prompts');
      console.log('🔗 Gumroad purchase links should be provided');
    } else if (updatedUser.subscriptionStatus === 'premium') {
      console.log('✅ User is already PREMIUM');
      console.log('🤖 Bot should continue using premium features');
      console.log('📈 Message count is for analytics only');
    }

    console.log('');
    console.log('🧪 TESTING STEPS:');
    console.log('1. Send a message to WhatsApp bot from this user');
    console.log('2. Check if premium upgrade prompt appears');
    console.log('3. Verify Gumroad link is provided');
    console.log('4. Monitor Railway logs for premium intent detection');
    console.log('');

    console.log('📊 RAILWAY LOGS TO WATCH FOR:');
    console.log('🔍 [INTENT] Premium intent detected: true/false');
    console.log('🔍 [HYBRID_AI] User subscription status: pending_payment/free/premium');
    console.log('🔍 [MESSAGE_LIMIT] Weekly count: 12');
    console.log('🔍 [PREMIUM_FLOW] Upgrade prompt triggered');

  } catch (error) {
    console.error('❌ Error updating message count:', error);
  } finally {
    await sql.end();
  }
}

// Run the update
updateMessageCount().catch(console.error);
