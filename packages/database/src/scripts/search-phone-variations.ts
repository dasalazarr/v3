#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { like, or } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function searchPhoneVariations() {
  console.log('🔍 Searching for phone number variations...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const targetPhone = '593984074389';
    console.log(`📱 Target phone number: ${targetPhone}`);
    console.log('🔍 Searching for variations...\n');

    // Search for various phone number formats
    const phoneVariations = [
      targetPhone,                    // 593984074389
      `+${targetPhone}`,             // +593984074389
      `+593 ${targetPhone.slice(3)}`, // +593 984074389
      targetPhone.slice(3),          // 984074389
      `0${targetPhone.slice(3)}`,    // 0984074389
    ];

    console.log('📋 Checking these variations:');
    phoneVariations.forEach((variation, index) => {
      console.log(`   ${index + 1}. "${variation}"`);
    });
    console.log('');

    // Search for each variation
    for (const phoneVariation of phoneVariations) {
      console.log(`🔍 Searching for: "${phoneVariation}"`);
      
      const usersFound = await db
        .select()
        .from(users)
        .where(like(users.phoneNumber, `%${phoneVariation}%`))
        .limit(5);

      if (usersFound.length > 0) {
        console.log(`✅ Found ${usersFound.length} user(s) with similar phone:`);
        usersFound.forEach((user, index) => {
          console.log(`   ${index + 1}. Phone: "${user.phoneNumber}" | Status: ${user.subscriptionStatus} | ID: ${user.id}`);
        });
      } else {
        console.log('   ❌ No matches found');
      }
      console.log('');
    }

    // Also search for any users with phone numbers containing the last 9 digits
    const lastNineDigits = targetPhone.slice(-9); // 984074389
    console.log(`🔍 Searching for any phone containing last 9 digits: "${lastNineDigits}"`);
    
    const similarUsers = await db
      .select()
      .from(users)
      .where(like(users.phoneNumber, `%${lastNineDigits}%`))
      .limit(10);

    if (similarUsers.length > 0) {
      console.log(`✅ Found ${similarUsers.length} user(s) with similar endings:`);
      similarUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. Phone: "${user.phoneNumber}" | Status: ${user.subscriptionStatus} | Created: ${user.createdAt}`);
      });
    } else {
      console.log('   ❌ No users found with similar phone endings');
    }

    console.log('\n📊 Total users in database:');
    const totalUsers = await db
      .select({ count: sql`count(*)` })
      .from(users);
    
    console.log(`   Total users: ${totalUsers[0].count}`);

    // Show recent users
    console.log('\n📅 Recent users (last 10):');
    const recentUsers = await db
      .select({
        phoneNumber: users.phoneNumber,
        subscriptionStatus: users.subscriptionStatus,
        createdAt: users.createdAt,
        id: users.id
      })
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(10);

    if (recentUsers.length > 0) {
      recentUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. Phone: "${user.phoneNumber}" | Status: ${user.subscriptionStatus} | Created: ${user.createdAt.toISOString()}`);
      });
    } else {
      console.log('   ❌ No users found in database');
    }

  } catch (error) {
    console.error('❌ Error searching phone variations:', error);
  } finally {
    await sql.end();
  }
}

// Run the search
searchPhoneVariations().catch(console.error);
