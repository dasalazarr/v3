
import { Database, DatabaseConfig } from '../connection';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { URL } from 'url';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const checkUserStatus = async (phoneNumber: string) => {
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
    ssl: process.env.NODE_ENV === 'production',
  };

  const db = Database.getInstance(dbConfig);

  try {
    console.log(`🔍 Searching for user with phone number: ${phoneNumber}...`);
    const userResult = await db.query
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);
    const user = userResult[0];

    if (!user) {
      console.log(`❌ User with phone number ${phoneNumber} not found.`);
      return;
    }

    console.log('✅ User found:');
    console.log(`  Phone Number: ${user.phoneNumber}`);
    console.log(`  Payment Status: ${user.paymentStatus}`);
    console.log(`  Preferred Language: ${user.preferredLanguage}`);
    console.log(`  Onboarding Completed: ${user.onboardingCompleted}`);
    console.log(`  Created At: ${user.createdAt}`);

    if (user.paymentStatus === 'premium' && user.premiumActivatedAt) {
      const activationDate = new Date(user.premiumActivatedAt);
      console.log(`  Premium Activated At: ${activationDate.toISOString()}`);
    }

  } catch (error) {
    console.error('An error occurred while checking user status:', error);
  } finally {
    await db.close();
    console.log('🚪 Database connection closed.');
  }
};

const phoneNumber = process.argv[2];
if (!phoneNumber) {
  console.log('Usage: pnpm ts-node packages/database/src/scripts/check-user-status.ts <phone_number>');
  process.exit(1);
}

checkUserStatus(phoneNumber).catch(err => {
  console.error(err);
  process.exit(1);
});
