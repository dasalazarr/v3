#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function activatePremiumManual() {
  console.log('🚀 MANUAL PREMIUM ACTIVATION...\n');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Target user
    const phoneNumber = '593984074389';
    const email = 'dandres.salazar@gmail.com';
    
    console.log(`📱 Activating premium for phone: ${phoneNumber}`);
    console.log(`📧 Email: ${email}`);

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

    if (user.subscriptionStatus === 'premium') {
      console.log('⚠️ User is already premium - no changes needed');
      return;
    }

    // Activate premium
    console.log('\n🔄 Activating premium subscription...');
    
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        subscriptionStatus: 'premium',
        premiumActivatedAt: now,
        updatedAt: now,
        // Also update email if not set
        ...((user as any).email ? {} : { email: email })
      })
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to update user subscription status');
    }

    console.log('\n🎉 PREMIUM ACTIVATION SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Phone: ${updatedUser.phoneNumber}`);
    console.log(`📧 Email: ${(updatedUser as any).email || 'Not set'}`);
    console.log(`📊 Status: ${updatedUser.subscriptionStatus}`);
    console.log(`⭐ Premium Activated: ${updatedUser.premiumActivatedAt}`);
    console.log(`🔄 Updated: ${updatedUser.updatedAt}`);

    console.log('\n✅ NEXT STEPS:');
    console.log('1. Test WhatsApp bot - should now use GPT-4o Mini');
    console.log('2. Verify no premium upgrade prompts appear');
    console.log('3. Confirm access to all premium features');
    console.log('4. Investigate Gumroad webhook issue for future purchases');

  } catch (error) {
    console.error('❌ Error activating premium:', error);
  } finally {
    await sql.end();
  }
}

// Confirmation prompt
console.log('⚠️  MANUAL PREMIUM ACTIVATION');
console.log('This will manually activate premium for phone: 593984074389');
console.log('This should only be used after confirming Gumroad purchase.');
console.log('');

// Run the activation
activatePremiumManual().catch(console.error);
