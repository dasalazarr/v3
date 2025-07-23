import { Database, DatabaseConfig } from '../connection';
import { users } from '../schema';
import { desc } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { URL, fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const listAllUsers = async () => {
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
    console.log('🔍 Fetching all users from database...');
    
    const allUsers = await db.query
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(20); // Limit to 20 most recent users

    if (allUsers.length === 0) {
      console.log('❌ No users found in database.');
      return;
    }

    console.log(`✅ Found ${allUsers.length} users:`);
    
    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. User Details:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Phone Number: ${user.phoneNumber}`);
      console.log(`   Subscription Status: ${user.subscriptionStatus}`);
      console.log(`   Premium Activated At: ${user.premiumActivatedAt}`);
      console.log(`   Preferred Language: ${user.preferredLanguage}`);
      console.log(`   Onboarding Completed: ${user.onboardingCompleted}`);
      console.log(`   Created At: ${user.createdAt}`);
      console.log(`   Updated At: ${user.updatedAt}`);
    });

    // Show summary by subscription status
    const statusCounts = allUsers.reduce((acc, user) => {
      acc[user.subscriptionStatus] = (acc[user.subscriptionStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Summary by subscription status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} users`);
    });

  } catch (error) {
    console.error('❌ An error occurred while fetching users:', error);
  } finally {
    await db.close();
    console.log('\n🚪 Database connection closed.');
  }
};

listAllUsers().catch(console.error);
