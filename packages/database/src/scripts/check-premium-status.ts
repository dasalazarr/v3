#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function checkPremiumStatus() {
  console.log('🔍 Checking Premium Subscription Status...\n');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Check by phone number (primary identifier)
    const phoneNumber = '593984074389';
    console.log(`📱 Looking up user with phone: ${phoneNumber}`);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('📋 USER FOUND - Current Status:');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📱 Phone Number: ${user.phoneNumber}`);
    console.log(`📧 Email: ${(user as any).email || 'Not set'}`);
    console.log(`👤 Name: ${(user as any).name || 'Not set'}`);
    console.log(`🌐 Preferred Language: ${user.preferredLanguage}`);
    console.log('');
    
    // SUBSCRIPTION STATUS DETAILS
    console.log('💳 SUBSCRIPTION DETAILS:');
    console.log('=' .repeat(50));
    console.log(`📊 Subscription Status: ${user.subscriptionStatus}`);
    console.log(`⭐ Premium Activated At: ${user.premiumActivatedAt || 'Not activated'}`);
    console.log(`📅 Created At: ${user.createdAt}`);
    console.log(`🔄 Updated At: ${user.updatedAt}`);
    console.log('');

    // ONBOARDING STATUS
    console.log('📝 ONBOARDING STATUS:');
    console.log('=' .repeat(50));
    console.log(`✅ Onboarding Completed: ${user.onboardingCompleted}`);
    console.log(`🎯 Onboarding Goal: ${user.onboardingGoal || 'Not set'}`);
    console.log(`🏃 Experience Level: ${user.experienceLevel || 'Not set'}`);
    console.log(`📊 Weekly Mileage: ${user.weeklyMileage || 'Not set'}`);
    console.log(`🏥 Injury History: ${user.injuryHistory || 'None'}`);
    console.log('');

    console.log('📈 MESSAGE COUNTER STATUS:');
    console.log('=' .repeat(50));
    const messageCount = user.weeklyMessageCount || 0;
    console.log(`📊 Weekly Message Count: ${messageCount}/40`);
    console.log(`⚠️ Premium Limit: 40 messages`);

    if (messageCount >= 40) {
      console.log(`🚨 LIMIT REACHED: User should see premium upgrade prompts`);
    } else if (messageCount >= 38) {
      console.log(`⚠️ NEAR LIMIT: User should see warning messages`);
    } else {
      console.log(`✅ UNDER LIMIT: Normal bot functionality`);
    }
    console.log('');

    // ANALYSIS
    console.log('🔍 ANALYSIS:');
    console.log('=' .repeat(50));
    
    if (user.subscriptionStatus === 'premium') {
      console.log('✅ STATUS: User is PREMIUM - All features unlocked');
      console.log(`⏰ Premium since: ${user.premiumActivatedAt}`);
    } else if (user.subscriptionStatus === 'pending_payment') {
      console.log('⏳ STATUS: Payment pending - Gumroad webhook may not have been processed');
      console.log('🔍 NEXT STEPS: Check Railway logs for Gumroad webhook');
    } else if (user.subscriptionStatus === 'free') {
      console.log('🆓 STATUS: User is on FREE plan');
      console.log('🔍 NEXT STEPS: Check if Gumroad webhook was received');
    } else {
      console.log(`❓ STATUS: Unknown status - ${user.subscriptionStatus}`);
    }

    // RECOMMENDATIONS
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    
    if (user.subscriptionStatus !== 'premium') {
      console.log('1. Check Railway logs for Gumroad webhook processing');
      console.log('2. Verify webhook endpoint: /webhook/gumroad');
      console.log('3. Confirm phone number in Gumroad custom_fields');
      console.log('4. Check if webhook signature validation passed');
    } else {
      console.log('✅ User is premium - system should provide full access');
      console.log('🤖 Bot should use GPT-4o Mini for all interactions');
      console.log('🚫 No premium upgrade prompts should appear');
    }

  } catch (error) {
    console.error('❌ Error checking premium status:', error);
  } finally {
    await sql.end();
  }
}

// Run the check
checkPremiumStatus().catch(console.error);
