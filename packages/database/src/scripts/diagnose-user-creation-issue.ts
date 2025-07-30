#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function diagnoseUserCreationIssue() {
  console.log('🔍 DIAGNOSING USER CREATION ISSUE...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🌐 Database URL: ${databaseUrl.substring(0, 50)}...`);
  
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // 1. Test basic database connection
    console.log('📊 Testing database connection...');
    const connectionTest = await sql`SELECT NOW() as current_time, version() as db_version`;
    console.log(`✅ Database connected successfully`);
    console.log(`   Time: ${connectionTest[0].current_time}`);
    console.log(`   Version: ${connectionTest[0].db_version.substring(0, 50)}...`);

    // 2. Check if users table exists
    console.log('\n📋 Checking users table structure...');
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    
    if (tableInfo.length === 0) {
      console.log('❌ CRITICAL: Users table does not exist!');
      console.log('   This explains why user creation is failing.');
      console.log('   Run migrations: npx tsx packages/database/src/migrate.ts');
      return;
    }

    console.log(`✅ Users table exists with ${tableInfo.length} columns:`);
    tableInfo.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    });

    // 3. Test user creation with actual insert
    console.log('\n🧪 Testing user creation...');
    const testPhoneNumber = '593984074389';
    
    // First, check if test user already exists
    const existingUser = await sql`
      SELECT * FROM users WHERE phone_number = ${testPhoneNumber}
    `;

    if (existingUser.length > 0) {
      console.log(`⚠️ Test user already exists: ${existingUser[0].id}`);
      console.log(`   Phone: ${existingUser[0].phone_number}`);
      console.log(`   Status: ${existingUser[0].subscription_status}`);
      console.log(`   Created: ${existingUser[0].created_at}`);
    } else {
      console.log(`📝 Creating test user with phone: ${testPhoneNumber}`);
      
      try {
        const [newUser] = await db
          .insert(users)
          .values({
            phoneNumber: testPhoneNumber,
            preferredLanguage: 'es',
            subscriptionStatus: 'free',
            weeklyMessageCount: 0,
            onboardingCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        console.log('✅ Test user created successfully!');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Phone: ${newUser.phoneNumber}`);
        console.log(`   Status: ${newUser.subscriptionStatus}`);
        console.log(`   Language: ${newUser.preferredLanguage}`);

        // Verify the user was actually persisted
        const verifyUser = await sql`
          SELECT * FROM users WHERE id = ${newUser.id}
        `;

        if (verifyUser.length > 0) {
          console.log('✅ User successfully persisted to database');
        } else {
          console.log('❌ CRITICAL: User was not persisted to database!');
          console.log('   This indicates a transaction or connection issue');
        }

      } catch (insertError) {
        console.error('❌ CRITICAL: Failed to create test user:', insertError);
        console.log('\n🔍 Possible causes:');
        console.log('   1. Database permissions issue');
        console.log('   2. Table constraints violation');
        console.log('   3. Connection/transaction problem');
        console.log('   4. Schema mismatch');
      }
    }

    // 4. Check total users count
    console.log('\n📊 Database statistics:');
    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'premium' THEN 1 END) as premium_users,
        COUNT(CASE WHEN subscription_status = 'free' THEN 1 END) as free_users,
        COUNT(CASE WHEN subscription_status = 'pending_payment' THEN 1 END) as pending_users
      FROM users
    `;

    const stat = stats[0];
    console.log(`   Total users: ${stat.total_users}`);
    console.log(`   Premium users: ${stat.premium_users}`);
    console.log(`   Free users: ${stat.free_users}`);
    console.log(`   Pending payment: ${stat.pending_users}`);

    // 5. Check recent activity
    if (parseInt(stat.total_users) > 0) {
      console.log('\n📅 Recent users (last 5):');
      const recentUsers = await sql`
        SELECT phone_number, subscription_status, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `;

      recentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number} | ${user.subscription_status} | ${user.created_at}`);
      });
    }

    // 6. Environment validation
    console.log('\n🔧 Environment validation:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);
    console.log(`   Database host: ${new URL(databaseUrl).hostname}`);
    console.log(`   Database name: ${new URL(databaseUrl).pathname.slice(1)}`);

    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    if (parseInt(stat.total_users) === 0) {
      console.log('❌ ISSUE CONFIRMED: No users in database despite WhatsApp activity');
      console.log('🔍 LIKELY CAUSES:');
      console.log('   1. Wrong app version running (legacy vs production)');
      console.log('   2. Database connection/transaction issues');
      console.log('   3. Error handling swallowing database errors');
      console.log('   4. Middleware or routing issues preventing user creation');
    } else {
      console.log('✅ Database has users - issue may be elsewhere');
    }

  } catch (error) {
    console.error('❌ CRITICAL DATABASE ERROR:', error);
    console.log('\n🔍 This error explains why users are not being created!');
  } finally {
    await sql.end();
  }
}

// Run the diagnosis
diagnoseUserCreationIssue().catch(console.error);
