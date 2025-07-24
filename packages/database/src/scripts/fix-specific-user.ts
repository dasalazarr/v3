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

const fixSpecificUser = async () => {
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
    ssl: true,
  };

  const db = Database.getInstance(dbConfig);

  try {
    console.log('🔧 Fixing specific user with "none" status...');
    
    // Fix the specific user ID from the logs
    const userId = 'd632e064-c7e8-4bea-a4b5-236c4c46d806';
    
    console.log(`\n🎯 Targeting user ID: ${userId}`);
    
    // First, check the user
    const [user] = await db.query
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('📋 Current user status:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Subscription Status: "${user.subscriptionStatus}"`);
    console.log(`   Created: ${user.createdAt}`);

    // Update to valid status
    const [updatedUser] = await db.query
      .update(users)
      .set({
        subscriptionStatus: 'free',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser) {
      console.log('\n✅ User status fixed successfully:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Phone: ${updatedUser.phoneNumber}`);
      console.log(`   Subscription Status: "${updatedUser.subscriptionStatus}"`);
      console.log(`   Updated: ${updatedUser.updatedAt}`);
    } else {
      console.log('❌ Failed to update user status');
    }

    console.log('\n🎯 User is now ready for premium upgrade!');

  } catch (error) {
    console.error('❌ An error occurred:', error);
  } finally {
    await db.close();
    console.log('\n🚪 Database connection closed.');
  }
};

fixSpecificUser().catch(console.error);
