#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, like, sql } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function searchUserInNeon() {
  console.log('🔍 SEARCHING FOR USER IN NEON DATABASE...\n');

  // Parse DATABASE_URL (Neon production)
  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🔗 Connecting to: ${databaseUrl.substring(0, 50)}...`);
  
  const sqlClient = postgres(databaseUrl);
  const db = drizzle(sqlClient, { schema });

  try {
    const targetUserId = '4315f4f9-f4b1-46a6-994b-c2f71221ae9e';
    
    console.log(`🎯 Searching for user ID: ${targetUserId}\n`);

    // Method 1: Direct ID search
    console.log('🔍 Method 1: Direct ID search...');
    const [directUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (directUser) {
      console.log('✅ FOUND USER BY DIRECT ID SEARCH!');
      console.log('=' .repeat(50));
      console.log(`🆔 ID: ${directUser.id}`);
      console.log(`📱 Phone: ${directUser.phoneNumber}`);
      console.log(`📊 Subscription: ${directUser.subscriptionStatus}`);
      console.log(`📈 Message Count: ${directUser.weeklyMessageCount}`);
      console.log(`✅ Onboarding: ${directUser.onboardingCompleted}`);
      console.log(`⭐ Premium: ${directUser.premiumActivatedAt || 'Not activated'}`);
      
      // Now modify the message counter
      await modifyMessageCounterForUser(db, directUser);
      await sqlClient.end();
      return;
    }

    console.log('❌ User not found by direct ID search');

    // Method 2: Search by partial ID
    console.log('\n🔍 Method 2: Partial ID search...');
    const partialIdUsers = await db
      .select()
      .from(users)
      .where(like(users.id, `%${targetUserId.substring(0, 8)}%`))
      .limit(5);

    if (partialIdUsers.length > 0) {
      console.log(`✅ Found ${partialIdUsers.length} users with similar ID:`);
      partialIdUsers.forEach((user, index) => {
        console.log(`\n👤 USER ${index + 1}:`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`📱 Phone: ${user.phoneNumber}`);
        console.log(`📊 Subscription: ${user.subscriptionStatus}`);
      });
    }

    // Method 3: Get recent users with pending_payment status
    console.log('\n🔍 Method 3: Recent pending_payment users...');
    const pendingUsers = await db
      .select()
      .from(users)
      .where(eq(users.subscriptionStatus, 'pending_payment'))
      .orderBy(users.createdAt)
      .limit(10);

    if (pendingUsers.length > 0) {
      console.log(`✅ Found ${pendingUsers.length} users with pending_payment status:`);
      for (let index = 0; index < pendingUsers.length; index++) {
        const user = pendingUsers[index];
        console.log(`\n👤 PENDING USER ${index + 1}:`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`📱 Phone: ${user.phoneNumber}`);
        console.log(`📊 Subscription: ${user.subscriptionStatus}`);
        console.log(`📈 Message Count: ${user.weeklyMessageCount}`);
        console.log(`📅 Created: ${user.createdAt}`);

        // Check if this is our target user
        if (user.id === targetUserId) {
          console.log('🎯 THIS IS THE TARGET USER!');
          await modifyMessageCounterForUser(db, user);
          await sqlClient.end();
          return;
        }
      }
    }

    // Method 4: Raw SQL query to double-check
    console.log('\n🔍 Method 4: Raw SQL verification...');
    const rawResult = await sqlClient`
      SELECT id, phone_number, subscription_status, weekly_message_count, created_at 
      FROM users 
      WHERE id = ${targetUserId}
      LIMIT 1
    `;

    if (rawResult.length > 0) {
      console.log('✅ FOUND USER WITH RAW SQL!');
      console.log('Raw result:', rawResult[0]);
    } else {
      console.log('❌ User not found even with raw SQL');
    }

    // Method 5: Count total users to verify connection
    console.log('\n🔍 Method 5: Database connection verification...');
    const totalUsers = await db
      .select({ count: sql`count(*)` })
      .from(users);

    console.log(`📊 Total users in database: ${totalUsers[0].count}`);

    if (Number(totalUsers[0].count) === 0) {
      console.log('⚠️  Database appears to be empty or connection issue');
    } else {
      console.log('✅ Database connection is working');
      
      // Show some recent users for reference
      const recentUsers = await db
        .select()
        .from(users)
        .orderBy(users.createdAt)
        .limit(5);

      console.log('\n📋 Recent users for reference:');
      recentUsers.forEach(user => {
        console.log(`   - ID: ${user.id.substring(0, 8)}... | Phone: ${user.phoneNumber} | Status: ${user.subscriptionStatus}`);
      });
    }

  } catch (error) {
    console.error('❌ Error searching for user:', error);
  } finally {
    await sqlClient.end();
  }
}

async function modifyMessageCounterForUser(db: any, user: any) {
  console.log('\n🔧 MODIFYING MESSAGE COUNTER...');
  
  const newMessageCount = 12; // Over threshold to trigger premium upgrade
  console.log(`📈 Setting message count from ${user.weeklyMessageCount} to ${newMessageCount}`);

  try {
    const now = new Date();
    const [updatedUser] = await db
      .update(users)
      .set({
        weeklyMessageCount: newMessageCount,
        updatedAt: now
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('\n✅ MESSAGE COUNTER UPDATE SUCCESSFUL!');
    console.log('=' .repeat(50));
    console.log(`🆔 User ID: ${updatedUser.id}`);
    console.log(`📱 Phone: ${updatedUser.phoneNumber}`);
    console.log(`📊 Subscription Status: ${updatedUser.subscriptionStatus}`);
    console.log(`📈 NEW Message Count: ${updatedUser.weeklyMessageCount}`);
    console.log(`🔄 Updated At: ${updatedUser.updatedAt}`);

    console.log('\n🎯 EXPECTED BEHAVIOR:');
    if (updatedUser.subscriptionStatus === 'pending_payment' || updatedUser.subscriptionStatus === 'free') {
      console.log('🆓 User has pending_payment/free status');
      console.log('💎 Bot should show premium upgrade prompts');
      console.log('🔗 Gumroad purchase links should be provided');
      console.log('⏰ Message limit enforcement should activate');
    }

    console.log('\n🧪 TESTING STEPS:');
    console.log('1. Send a message to the WhatsApp bot');
    console.log('2. Check if premium upgrade prompt appears');
    console.log('3. Verify Gumroad link is provided');
    console.log('4. Monitor Railway logs for premium intent detection');

  } catch (error) {
    console.error('❌ Error updating message counter:', error);
  }
}

// Run the search
searchUserInNeon().catch(console.error);
