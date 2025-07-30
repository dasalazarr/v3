#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function findUsers() {
  console.log('🔍 SEARCHING FOR USERS IN DATABASE...\n');

  // Parse DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // Get all users
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(users.createdAt)
      .limit(20); // Limit to avoid too much output

    if (allUsers.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`📊 Found ${allUsers.length} users in database:`);
    console.log('=' .repeat(80));

    allUsers.forEach((user, index) => {
      console.log(`\n👤 USER ${index + 1}:`);
      console.log(`🆔 ID: ${user.id}`);
      console.log(`📱 Phone: ${user.phoneNumber}`);
      console.log(`👤 Name: ${(user as any).name || 'Not set'}`);
      console.log(`📊 Subscription: ${user.subscriptionStatus}`);
      console.log(`📈 Message Count: ${user.weeklyMessageCount}`);
      console.log(`🌐 Language: ${user.preferredLanguage}`);
      console.log(`✅ Onboarding: ${user.onboardingCompleted}`);
      console.log(`📅 Created: ${user.createdAt}`);
      console.log(`⭐ Premium: ${user.premiumActivatedAt || 'Not activated'}`);
    });

    console.log('\n🎯 USERS SUITABLE FOR PREMIUM FLOW TESTING:');
    console.log('=' .repeat(50));

    const freeUsers = allUsers.filter(user => user.subscriptionStatus === 'free');
    const premiumUsers = allUsers.filter(user => user.subscriptionStatus === 'premium');

    console.log(`\n🆓 FREE USERS (${freeUsers.length}) - Good for testing premium upgrade flow:`);
    freeUsers.forEach(user => {
      console.log(`   - ID: ${user.id}`);
      console.log(`     Phone: ${user.phoneNumber}`);
      console.log(`     Messages: ${user.weeklyMessageCount}`);
      console.log(`     Onboarding: ${user.onboardingCompleted ? '✅' : '❌'}`);
    });

    console.log(`\n💎 PREMIUM USERS (${premiumUsers.length}) - Already premium:`);
    premiumUsers.forEach(user => {
      console.log(`   - ID: ${user.id}`);
      console.log(`     Phone: ${user.phoneNumber}`);
      console.log(`     Messages: ${user.weeklyMessageCount}`);
      console.log(`     Premium Since: ${user.premiumActivatedAt}`);
    });

    console.log('\n🔧 TO MODIFY MESSAGE COUNTER:');
    console.log('Copy one of the FREE user IDs above and use it in the modify-message-counter.ts script');

  } catch (error) {
    console.error('❌ Error finding users:', error);
  } finally {
    await sql.end();
  }
}

// Run the search
findUsers().catch(console.error);
