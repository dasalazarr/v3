import { Database, DatabaseConfig } from '../connection';
import { users } from '../schema';
import dotenv from 'dotenv';
import path from 'path';
import { URL, fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const createTestUser = async () => {
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
    console.log('🔧 Creating test user for premium onboarding flow...');
    
    // Create a test user with premium status (to simulate the current scenario)
    const [testUser] = await db.query
      .insert(users)
      .values({
        phoneNumber: '593984074389', // The actual user phone number
        preferredLanguage: 'es',
        subscriptionStatus: 'premium', // Start with premium to simulate current state
        premiumActivatedAt: new Date(),
        onboardingCompleted: true,
        age: 30,
        gender: 'male',
        onboardingGoal: 'improve_time'
      })
      .returning();

    if (!testUser) {
      throw new Error('Failed to create test user');
    }

    console.log('✅ Test user created successfully:');
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Phone Number: ${testUser.phoneNumber}`);
    console.log(`   Subscription Status: ${testUser.subscriptionStatus}`);
    console.log(`   Premium Activated At: ${testUser.premiumActivatedAt}`);
    console.log(`   Preferred Language: ${testUser.preferredLanguage}`);
    console.log(`   Created At: ${testUser.createdAt}`);

    console.log('\n🎯 Now you can:');
    console.log('1. Reset this user to "free" status to test premium onboarding');
    console.log('2. Test the complete flow: free → premium intent → payment link → webhook → activation');
    console.log(`\nTo reset user: npx tsx src/scripts/reset-user-subscription.ts ${testUser.id}`);

    return testUser;

  } catch (error) {
    console.error('❌ An error occurred while creating test user:', error);
  } finally {
    await db.close();
    console.log('\n🚪 Database connection closed.');
  }
};

createTestUser().catch(console.error);
