#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function investigateUserDiscrepancy() {
  console.log('🔍 INVESTIGATING USER DISCREPANCY...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const targetPhone = '593984074389';
    console.log(`📱 Investigating phone number: ${targetPhone}`);

    // 1. Find ALL users with this phone number
    console.log('\n📋 Searching for ALL users with this phone number...');
    const allUsers = await sql`
      SELECT * FROM users 
      WHERE phone_number = ${targetPhone}
      ORDER BY created_at DESC
    `;

    console.log(`Found ${allUsers.length} user(s) with phone ${targetPhone}:`);
    allUsers.forEach((user, index) => {
      console.log(`\n   ${index + 1}. User ID: ${user.id}`);
      console.log(`      Phone: ${user.phone_number}`);
      console.log(`      Status: ${user.subscription_status}`);
      console.log(`      Premium At: ${user.premium_activated_at || 'Not activated'}`);
      console.log(`      Created: ${user.created_at}`);
      console.log(`      Updated: ${user.updated_at}`);
    });

    // 2. Check for similar phone numbers
    console.log('\n🔍 Checking for similar phone numbers...');
    const similarPhones = await sql`
      SELECT phone_number, subscription_status, created_at, id
      FROM users 
      WHERE phone_number LIKE '%984074389%'
      ORDER BY created_at DESC
    `;

    if (similarPhones.length > allUsers.length) {
      console.log(`Found ${similarPhones.length} users with similar phone numbers:`);
      similarPhones.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number} | ${user.subscription_status} | ${user.created_at}`);
      });
    } else {
      console.log('No additional similar phone numbers found.');
    }

    // 3. Check all premium users
    console.log('\n💎 All premium users in database:');
    const premiumUsers = await sql`
      SELECT phone_number, subscription_status, premium_activated_at, created_at, id
      FROM users 
      WHERE subscription_status = 'premium'
      ORDER BY premium_activated_at DESC
    `;

    if (premiumUsers.length > 0) {
      console.log(`Found ${premiumUsers.length} premium user(s):`);
      premiumUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number} | Premium since: ${user.premium_activated_at}`);
        if (user.phone_number.includes('984074389')) {
          console.log(`      ⭐ THIS IS OUR TARGET USER! ID: ${user.id}`);
        }
      });
    } else {
      console.log('❌ No premium users found in database');
    }

    // 4. Check recent database activity
    console.log('\n📊 Recent database activity (all users):');
    const recentActivity = await sql`
      SELECT phone_number, subscription_status, created_at, updated_at, id
      FROM users 
      ORDER BY updated_at DESC 
      LIMIT 10
    `;

    recentActivity.forEach((user, index) => {
      const isTarget = user.phone_number === targetPhone;
      const marker = isTarget ? ' ⭐ TARGET' : '';
      console.log(`   ${index + 1}. ${user.phone_number} | ${user.subscription_status} | Updated: ${user.updated_at}${marker}`);
    });

    // 5. Database integrity check
    console.log('\n🔧 Database integrity check:');
    const integrityCheck = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT phone_number) as unique_phones,
        COUNT(CASE WHEN subscription_status = 'premium' THEN 1 END) as premium_count,
        MAX(updated_at) as last_update
      FROM users
    `;

    const check = integrityCheck[0];
    console.log(`   Total users: ${check.total_users}`);
    console.log(`   Unique phone numbers: ${check.unique_phones}`);
    console.log(`   Premium users: ${check.premium_count}`);
    console.log(`   Last database update: ${check.last_update}`);

    if (parseInt(check.total_users) !== parseInt(check.unique_phones)) {
      console.log('⚠️ WARNING: Duplicate phone numbers detected!');
    }

    // 6. Webhook processing analysis
    console.log('\n🔍 ANALYSIS:');
    if (allUsers.length === 0) {
      console.log('❌ CRITICAL: No users found with target phone number');
      console.log('   This explains the webhook discrepancy');
    } else if (allUsers.length === 1) {
      const user = allUsers[0];
      if (user.subscription_status === 'premium') {
        console.log('✅ User is premium in database - webhook response was correct');
      } else {
        console.log('❌ DISCREPANCY CONFIRMED:');
        console.log(`   Database shows: ${user.subscription_status}`);
        console.log('   Webhook says: User already premium');
        console.log('   Possible causes:');
        console.log('   1. Webhook is checking a different database/table');
        console.log('   2. Caching issue in the webhook handler');
        console.log('   3. Transaction not committed properly');
        console.log('   4. Multiple database connections');
      }
    } else {
      console.log(`⚠️ MULTIPLE USERS (${allUsers.length}) with same phone number!`);
      console.log('   This could cause webhook confusion');
    }

  } catch (error) {
    console.error('❌ Error investigating user discrepancy:', error);
  } finally {
    await sql.end();
  }
}

// Run the investigation
investigateUserDiscrepancy().catch(console.error);
