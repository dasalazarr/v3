#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function simpleUserCheck() {
  console.log('🔍 Simple User Database Check...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  console.log(`🌐 Database URL: ${databaseUrl.includes('neon') ? 'Neon (Production)' : 'Local'}`);
  
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    // First, check if we can connect and count total users
    console.log('📊 Checking database connection...');
    
    const result = await sql`SELECT COUNT(*) as total FROM users`;
    const totalUsers = result[0]?.total || 0;
    
    console.log(`✅ Database connected successfully`);
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    if (totalUsers === 0) {
      console.log('\n❌ NO USERS FOUND IN DATABASE');
      console.log('   This explains why phone number 593984074389 was not found');
      console.log('   The user needs to interact with the WhatsApp bot first to be created');
      return;
    }

    // Get recent users
    console.log('\n📅 Recent users (last 5):');
    const recentUsers = await sql`
      SELECT phone_number, subscription_status, created_at, id 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    if (recentUsers.length > 0) {
      recentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. Phone: "${user.phone_number}" | Status: ${user.subscription_status} | Created: ${user.created_at}`);
      });
    }

    // Search for the specific phone number with variations
    console.log('\n🔍 Searching for phone number 593984074389 and variations...');
    
    const phoneVariations = [
      '593984074389',
      '+593984074389',
      '984074389'
    ];

    for (const phone of phoneVariations) {
      const userResult = await sql`
        SELECT * FROM users 
        WHERE phone_number = ${phone} 
        OR phone_number LIKE ${'%' + phone + '%'}
        LIMIT 1
      `;

      if (userResult.length > 0) {
        const user = userResult[0];
        console.log(`✅ FOUND USER with phone variation "${phone}":`);
        console.log(`   📱 Phone: ${user.phone_number}`);
        console.log(`   📊 Status: ${user.subscription_status}`);
        console.log(`   ⭐ Premium Activated: ${user.premium_activated_at || 'Not activated'}`);
        console.log(`   📅 Created: ${user.created_at}`);
        console.log(`   🆔 ID: ${user.id}`);
        break;
      }
    }

    // Check for any premium users
    console.log('\n💎 Premium users in database:');
    const premiumUsers = await sql`
      SELECT phone_number, premium_activated_at, created_at 
      FROM users 
      WHERE subscription_status = 'premium' 
      ORDER BY premium_activated_at DESC 
      LIMIT 5
    `;

    if (premiumUsers.length > 0) {
      console.log(`✅ Found ${premiumUsers.length} premium user(s):`);
      premiumUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. Phone: "${user.phone_number}" | Activated: ${user.premium_activated_at}`);
      });
    } else {
      console.log('   ❌ No premium users found');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await sql.end();
  }
}

// Run the check
simpleUserCheck().catch(console.error);
