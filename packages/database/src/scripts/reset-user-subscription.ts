import { Database, DatabaseConfig } from '../connection';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { URL, fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const resetUserSubscription = async (userId: string) => {
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
    console.log(`🔍 Searching for user with ID: ${userId}...`);
    
    // First, check current user status
    const userResult = await db.query
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const user = userResult[0];

    if (!user) {
      console.log(`❌ User with ID ${userId} not found.`);
      return;
    }

    console.log('📋 Current user status:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Phone Number: ${user.phoneNumber}`);
    console.log(`  Subscription Status: ${user.subscriptionStatus}`);
    console.log(`  Premium Activated At: ${user.premiumActivatedAt}`);
    console.log(`  Preferred Language: ${user.preferredLanguage}`);
    console.log(`  Created At: ${user.createdAt}`);

    // Reset subscription status to 'free'
    console.log('\n🔄 Resetting subscription status to "free"...');
    
    const [updatedUser] = await db.query
      .update(users)
      .set({
        subscriptionStatus: 'free',
        premiumActivatedAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to update user subscription status');
    }

    console.log('✅ User subscription reset successfully:');
    console.log(`  ID: ${updatedUser.id}`);
    console.log(`  Phone Number: ${updatedUser.phoneNumber}`);
    console.log(`  Subscription Status: ${updatedUser.subscriptionStatus}`);
    console.log(`  Premium Activated At: ${updatedUser.premiumActivatedAt}`);
    console.log(`  Updated At: ${updatedUser.updatedAt}`);

    console.log('\n🎯 User is now ready for premium onboarding flow testing!');

  } catch (error) {
    console.error('❌ An error occurred while resetting user subscription:', error);
  } finally {
    await db.close();
    console.log('🚪 Database connection closed.');
  }
};

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a user ID as an argument');
  console.log('Usage: npm run reset-user-subscription <user-id>');
  process.exit(1);
}

resetUserSubscription(userId).catch(console.error);
