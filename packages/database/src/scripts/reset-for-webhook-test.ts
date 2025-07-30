#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function resetForWebhookTest() {
  console.log('🔄 RESET FOR WEBHOOK TEST...\n');
  console.log('⚠️  This will temporarily reset your premium status to test the webhook');
  console.log('⚠️  You can reactivate premium manually if the webhook test fails');
  console.log('');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Target user
    const phoneNumber = '593984074389';
    
    console.log(`📱 Resetting user with phone: ${phoneNumber}`);

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
    console.log(`📊 Current status: ${user.subscriptionStatus}`);
    console.log(`⭐ Premium activated: ${user.premiumActivatedAt}`);

    if (user.subscriptionStatus !== 'premium') {
      console.log('⚠️ User is not premium - no reset needed');
      return;
    }

    // Reset to pending_payment (as if purchase was just initiated)
    console.log('\n🔄 Resetting to pending_payment status...');
    
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        subscriptionStatus: 'pending_payment',
        premiumActivatedAt: null,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to reset user subscription status');
    }

    console.log('\n✅ RESET SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Phone: ${updatedUser.phoneNumber}`);
    console.log(`📊 Status: ${updatedUser.subscriptionStatus}`);
    console.log(`⭐ Premium Activated: ${updatedUser.premiumActivatedAt || 'Not activated'}`);
    console.log(`🔄 Updated: ${updatedUser.updatedAt}`);

    console.log('\n🧪 NEXT STEPS FOR WEBHOOK TEST:');
    console.log('1. Run the webhook test with valid product ID ("andes" or "andeslatam")');
    console.log('2. Check if webhook successfully activates premium');
    console.log('3. If webhook fails, run activate-premium-manual.ts again');
    console.log('');
    console.log('🚀 Test command:');
    console.log('   node test-webhook-with-valid-id.cjs');

  } catch (error) {
    console.error('❌ Error resetting status:', error);
  } finally {
    await sql.end();
  }
}

// Run the reset
resetForWebhookTest().catch(console.error);
