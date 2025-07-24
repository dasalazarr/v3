#!/usr/bin/env node

/**
 * Fix user subscription status that has invalid values
 * This fixes users with 'none' status to 'free' status
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

async function fixUserSubscriptionStatus() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // First, check the current user status
    console.log('\n🔍 Checking current user status...');
    const currentUser = await client.query(
      'SELECT id, phone_number, subscription_status, created_at, updated_at FROM users WHERE phone_number = $1',
      ['593984074389']
    );

    if (currentUser.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = currentUser.rows[0];
    console.log('📋 Current user status:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phone_number}`);
    console.log(`   Subscription Status: "${user.subscription_status}"`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Updated: ${user.updated_at}`);

    // Check if the status is invalid
    const validStatuses = ['free', 'pending_payment', 'premium', 'past_due', 'canceled'];
    const isInvalid = !validStatuses.includes(user.subscription_status);

    if (isInvalid) {
      console.log(`\n⚠️  Invalid subscription status detected: "${user.subscription_status}"`);
      console.log('🔧 Fixing to "free" status...');

      // Update to valid status
      const updateResult = await client.query(
        'UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['free', user.id]
      );

      if (updateResult.rows.length > 0) {
        const updatedUser = updateResult.rows[0];
        console.log('✅ User status fixed successfully:');
        console.log(`   ID: ${updatedUser.id}`);
        console.log(`   Phone: ${updatedUser.phone_number}`);
        console.log(`   Subscription Status: "${updatedUser.subscription_status}"`);
        console.log(`   Updated: ${updatedUser.updated_at}`);
      } else {
        console.log('❌ Failed to update user status');
      }
    } else {
      console.log(`\n✅ User subscription status is valid: "${user.subscription_status}"`);
    }

    // Check for other users with invalid statuses
    console.log('\n🔍 Checking for other users with invalid statuses...');
    const invalidUsers = await client.query(`
      SELECT id, phone_number, subscription_status, created_at 
      FROM users 
      WHERE subscription_status NOT IN ('free', 'pending_payment', 'premium', 'past_due', 'canceled')
      OR subscription_status IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (invalidUsers.rows.length > 0) {
      console.log(`⚠️  Found ${invalidUsers.rows.length} users with invalid subscription statuses:`);
      invalidUsers.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number}: "${user.subscription_status}" (ID: ${user.id})`);
      });

      console.log('\n🔧 Fixing all invalid statuses to "free"...');
      const fixAllResult = await client.query(`
        UPDATE users 
        SET subscription_status = 'free', updated_at = NOW() 
        WHERE subscription_status NOT IN ('free', 'pending_payment', 'premium', 'past_due', 'canceled')
        OR subscription_status IS NULL
        RETURNING id, phone_number, subscription_status
      `);

      console.log(`✅ Fixed ${fixAllResult.rows.length} users with invalid statuses`);
      fixAllResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.phone_number}: now "${user.subscription_status}"`);
      });
    } else {
      console.log('✅ No other users with invalid statuses found');
    }

    // Verify the constraint
    console.log('\n🔍 Verifying database constraint...');
    const constraintCheck = await client.query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conname = 'users_subscription_status_check'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('📋 Database constraint found:');
      console.log(`   Name: ${constraintCheck.rows[0].conname}`);
      console.log(`   Definition: ${constraintCheck.rows[0].consrc || 'Check constraint definition'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('📋 Detail:', error.detail);
    }
  } finally {
    await client.end();
    console.log('\n🚪 Database connection closed');
  }
}

async function main() {
  console.log('🔧 User Subscription Status Fix Tool');
  console.log('====================================\n');
  
  await fixUserSubscriptionStatus();
  
  console.log('\n🎯 Next Steps:');
  console.log('1. User subscription status should now be valid');
  console.log('2. Try the premium upgrade flow again');
  console.log('3. The system should now be able to update to "pending_payment"');
  console.log('4. Monitor Railway logs for successful premium processing');
}

main().catch(console.error);
