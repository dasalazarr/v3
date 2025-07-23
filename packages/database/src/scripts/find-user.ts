import { Database, DatabaseConfig } from '../connection';
import { users } from '../schema';
import { eq, like } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { URL, fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const findUser = async (searchTerm: string) => {
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
    console.log(`🔍 Searching for users with term: ${searchTerm}...`);
    
    // Search by ID, phone number, or partial phone number
    const userResults = await db.query
      .select()
      .from(users)
      .where(
        searchTerm.includes('-') 
          ? eq(users.id, searchTerm) // Search by ID if it contains hyphens
          : like(users.phoneNumber, `%${searchTerm}%`) // Search by phone number
      )
      .limit(10);

    if (userResults.length === 0) {
      console.log(`❌ No users found with search term: ${searchTerm}`);
      
      // Try to get recent users if no specific match
      console.log('\n📋 Showing 5 most recent users:');
      const recentUsers = await db.query
        .select()
        .from(users)
        .orderBy(users.createdAt)
        .limit(5);
      
      recentUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. User:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Phone: ${user.phoneNumber}`);
        console.log(`   Status: ${user.subscriptionStatus}`);
        console.log(`   Language: ${user.preferredLanguage}`);
        console.log(`   Created: ${user.createdAt}`);
      });
      
      return;
    }

    console.log(`✅ Found ${userResults.length} user(s):`);
    
    userResults.forEach((user, index) => {
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

  } catch (error) {
    console.error('❌ An error occurred while searching for users:', error);
  } finally {
    await db.close();
    console.log('\n🚪 Database connection closed.');
  }
};

// Get search term from command line arguments
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.error('❌ Please provide a search term (user ID or phone number)');
  console.log('Usage: npm run find-user <search-term>');
  console.log('Examples:');
  console.log('  npm run find-user cd259562-d36b-4cdb-83f0-ea8c88e46b75');
  console.log('  npm run find-user 593987644414');
  console.log('  npm run find-user 5939');
  process.exit(1);
}

findUser(searchTerm).catch(console.error);
