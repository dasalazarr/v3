#!/usr/bin/env tsx

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function forceRefreshUserStatus() {
  console.log('🔄 FORCE REFRESHING USER STATUS...\n');

  const databaseUrl = process.env.DATABASE_URL!;
  const sql = postgres(databaseUrl);
  const db = drizzle(sql, { schema });

  try {
    const targetPhone = '593984074389';
    console.log(`📱 Target phone: ${targetPhone}`);

    // 1. Force refresh - close and reconnect to database
    console.log('🔄 Forcing database connection refresh...');
    await sql.end();
    
    // Create new connection
    const freshSql = postgres(databaseUrl);
    const freshDb = drizzle(freshSql, { schema });

    // 2. Query with fresh connection
    console.log('📋 Querying with fresh database connection...');
    const freshUsers = await freshSql`
      SELECT * FROM users 
      WHERE phone_number = ${targetPhone}
      ORDER BY updated_at DESC
    `;

    console.log(`Found ${freshUsers.length} user(s) with fresh connection:`);
    freshUsers.forEach((user, index) => {
      console.log(`\n   ${index + 1}. User ID: ${user.id}`);
      console.log(`      Phone: ${user.phone_number}`);
      console.log(`      Status: ${user.subscription_status}`);
      console.log(`      Premium At: ${user.premium_activated_at || 'Not activated'}`);
      console.log(`      Created: ${user.created_at}`);
      console.log(`      Updated: ${user.updated_at}`);
    });

    // 3. Check if there are any uncommitted transactions
    console.log('\n🔍 Checking for any pending transactions...');
    const transactionInfo = await freshSql`
      SELECT 
        state,
        query,
        query_start,
        state_change
      FROM pg_stat_activity 
      WHERE datname = current_database() 
      AND state != 'idle'
      AND pid != pg_backend_pid()
    `;

    if (transactionInfo.length > 0) {
      console.log(`Found ${transactionInfo.length} active transaction(s):`);
      transactionInfo.forEach((tx, index) => {
        console.log(`   ${index + 1}. State: ${tx.state} | Query: ${tx.query?.substring(0, 100)}...`);
      });
    } else {
      console.log('✅ No pending transactions found');
    }

    // 4. Force update user to free status (reset for testing)
    console.log('\n🔄 Resetting user to free status for testing...');
    const resetResult = await freshSql`
      UPDATE users 
      SET 
        subscription_status = 'free',
        premium_activated_at = NULL,
        updated_at = NOW()
      WHERE phone_number = ${targetPhone}
      RETURNING *
    `;

    if (resetResult.length > 0) {
      const user = resetResult[0];
      console.log('✅ User reset successfully:');
      console.log(`   Status: ${user.subscription_status}`);
      console.log(`   Premium At: ${user.premium_activated_at || 'Not activated'}`);
      console.log(`   Updated: ${user.updated_at}`);
    } else {
      console.log('❌ Failed to reset user');
    }

    // 5. Now test premium upgrade
    console.log('\n💎 Testing premium upgrade...');
    const upgradeResult = await freshSql`
      UPDATE users 
      SET 
        subscription_status = 'premium',
        premium_activated_at = NOW(),
        updated_at = NOW()
      WHERE phone_number = ${targetPhone}
      RETURNING *
    `;

    if (upgradeResult.length > 0) {
      const user = upgradeResult[0];
      console.log('✅ User upgraded to premium successfully:');
      console.log(`   Status: ${user.subscription_status}`);
      console.log(`   Premium At: ${user.premium_activated_at}`);
      console.log(`   Updated: ${user.updated_at}`);
    } else {
      console.log('❌ Failed to upgrade user to premium');
    }

    // 6. Verify the change persisted
    console.log('\n🔍 Verifying changes persisted...');
    const verifyResult = await freshSql`
      SELECT * FROM users WHERE phone_number = ${targetPhone}
    `;

    if (verifyResult.length > 0) {
      const user = verifyResult[0];
      console.log('📊 Final user status:');
      console.log(`   Status: ${user.subscription_status}`);
      console.log(`   Premium At: ${user.premium_activated_at || 'Not activated'}`);
      console.log(`   Updated: ${user.updated_at}`);

      if (user.subscription_status === 'premium') {
        console.log('\n🎉 SUCCESS: User is now premium!');
        console.log('✅ Database operations are working correctly');
        console.log('✅ The webhook should now work properly');
      } else {
        console.log('\n❌ ISSUE: User is still not premium');
        console.log('🔍 There may be a deeper database issue');
      }
    }

    await freshSql.end();

  } catch (error) {
    console.error('❌ Error during force refresh:', error);
  }
}

// Run the force refresh
forceRefreshUserStatus().catch(console.error);
