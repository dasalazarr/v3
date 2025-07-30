#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function resetOnboardingOnly() {
  console.log('🔄 RESET ONBOARDING STATUS ONLY...\n');
  console.log('⚠️  This will reset onboarding status to false while keeping premium active');
  console.log('⚠️  This allows the user to complete onboarding again with the fixed logic');
  console.log('');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Target user
    const phoneNumber = '593984074389';
    
    console.log(`📱 Resetting onboarding for user with phone: ${phoneNumber}`);

    // Find user first
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log(`✅ User found: ${user.id}`);
    console.log(`📊 Current onboarding status: ${user.onboardingCompleted}`);
    console.log(`💎 Premium status: ${user.subscriptionStatus}`);
    console.log(`⭐ Premium activated: ${user.premiumActivatedAt}`);

    // Reset only onboarding status, keep premium intact
    console.log('\n🔄 Resetting onboarding status to false...');
    
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        onboardingCompleted: false,
        // Keep all premium fields intact
        // subscriptionStatus: user.subscriptionStatus, // Don't change
        // premiumActivatedAt: user.premiumActivatedAt, // Don't change
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to reset onboarding status');
    }

    console.log('\n✅ ONBOARDING RESET SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Phone: ${updatedUser.phoneNumber}`);
    console.log(`📝 Onboarding Completed: ${updatedUser.onboardingCompleted}`);
    console.log(`💎 Premium Status: ${updatedUser.subscriptionStatus} (unchanged)`);
    console.log(`⭐ Premium Activated: ${updatedUser.premiumActivatedAt} (unchanged)`);
    console.log(`🔄 Updated: ${updatedUser.updatedAt}`);

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. User can now start onboarding process again');
    console.log('2. System will use correct tool logic (complete_onboarding vs log_run)');
    console.log('3. Premium features remain active throughout the process');
    console.log('4. Test by sending "iniciar" to the WhatsApp bot');

    console.log('\n✅ EXPECTED BEHAVIOR:');
    console.log('- Bot will ask for onboarding information');
    console.log('- When user confirms data, it will use complete_onboarding tool');
    console.log('- Will NOT try to use log_run tool during onboarding');
    console.log('- Premium features remain active');

  } catch (error) {
    console.error('❌ Error resetting onboarding status:', error);
  } finally {
    await sql.end();
  }
}

// Run the reset
resetOnboardingOnly().catch(console.error);
