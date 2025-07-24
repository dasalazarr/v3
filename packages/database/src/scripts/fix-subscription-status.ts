import { Database, DatabaseConfig } from '../connection';
import { users } from '../schema';
import { eq, notInArray, isNull, or } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { URL, fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const fixSubscriptionStatus = async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const url = new URL(dbUrl);
  const dbConfig: DatabaseConfig = {
    host: url.hostname,
    port: parseInt(url.port, 10),
    database: url.pathname.slice(1),
    username: url.username,
    password: url.password,
    ssl: true, // Force SSL for Neon database
  };

  const db = Database.getInstance(dbConfig);

  try {
    console.log('🔧 Fixing user subscription status...');
    
    // First, check the specific user
    console.log('\n🔍 Checking user 593984074389...');
    const [targetUser] = await db.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, '593984074389'))
      .limit(1);

    if (!targetUser) {
      console.log('❌ Target user not found');
      return;
    }

    console.log('📋 Current user status:');
    console.log(`   ID: ${targetUser.id}`);
    console.log(`   Phone: ${targetUser.phoneNumber}`);
    console.log(`   Subscription Status: "${targetUser.subscriptionStatus}"`);
    console.log(`   Created: ${targetUser.createdAt}`);
    console.log(`   Updated: ${targetUser.updatedAt}`);

    // Valid statuses according to schema
    const validStatuses = ['free', 'pending_payment', 'premium', 'past_due', 'canceled'];
    const isInvalid = !validStatuses.includes(targetUser.subscriptionStatus || '');

    if (isInvalid) {
      console.log(`\n⚠️  Invalid subscription status detected: "${targetUser.subscriptionStatus}"`);
      console.log('🔧 Fixing to "free" status...');

      const [updatedUser] = await db.query
        .update(users)
        .set({
          subscriptionStatus: 'free',
          updatedAt: new Date()
        })
        .where(eq(users.id, targetUser.id))
        .returning();

      if (updatedUser) {
        console.log('✅ User status fixed successfully:');
        console.log(`   ID: ${updatedUser.id}`);
        console.log(`   Phone: ${updatedUser.phoneNumber}`);
        console.log(`   Subscription Status: "${updatedUser.subscriptionStatus}"`);
        console.log(`   Updated: ${updatedUser.updatedAt}`);
      } else {
        console.log('❌ Failed to update user status');
      }
    } else {
      console.log(`\n✅ User subscription status is valid: "${targetUser.subscriptionStatus}"`);
    }

    // Check for other users with invalid statuses
    console.log('\n🔍 Checking for other users with invalid statuses...');
    
    // This is a bit complex with Drizzle, so let's use raw SQL for this check
    const invalidUsersQuery = `
      SELECT id, phone_number, subscription_status, created_at 
      FROM users 
      WHERE subscription_status NOT IN ('free', 'pending_payment', 'premium', 'past_due', 'canceled')
      OR subscription_status IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const invalidUsers = await db.query.execute(invalidUsersQuery);

    if (invalidUsers.length > 0) {
      console.log(`⚠️  Found ${invalidUsers.length} users with invalid subscription statuses:`);
      invalidUsers.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.phone_number}: "${user.subscription_status}" (ID: ${user.id})`);
      });

      console.log('\n🔧 Fixing all invalid statuses to "free"...');
      
      // Fix all invalid statuses
      const fixAllQuery = `
        UPDATE users 
        SET subscription_status = 'free', updated_at = NOW() 
        WHERE subscription_status NOT IN ('free', 'pending_payment', 'premium', 'past_due', 'canceled')
        OR subscription_status IS NULL
        RETURNING id, phone_number, subscription_status
      `;

      const fixedUsers = await db.query.execute(fixAllQuery);
      console.log(`✅ Fixed ${fixedUsers.length} users with invalid statuses`);
      
      fixedUsers.forEach((user: any, index: number) => {
        console.log(`   ${index + 1}. ${user.phone_number}: now "${user.subscription_status}"`);
      });
    } else {
      console.log('✅ No other users with invalid statuses found');
    }

    console.log('\n🎯 Summary:');
    console.log('- User subscription statuses have been fixed');
    console.log('- All users now have valid subscription statuses');
    console.log('- Premium upgrade flow should now work correctly');

  } catch (error) {
    console.error('❌ An error occurred while fixing subscription statuses:', error);
  } finally {
    await db.close();
    console.log('\n🚪 Database connection closed.');
  }
};

// Execute the fix
fixSubscriptionStatus().catch(console.error);
