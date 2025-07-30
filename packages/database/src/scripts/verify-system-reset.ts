#!/usr/bin/env tsx

import { config } from 'dotenv';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function verifySystemReset() {
  console.log('🔍 VERIFYING SYSTEM RESET - CHECKING ALL STORAGE LAYERS...\n');

  const verification = {
    database: { clean: false, details: '' },
    redis: { clean: false, details: '' },
    vectorMemory: { clean: false, details: '' },
    overall: false
  };

  // 1. VERIFY DATABASE
  console.log('1️⃣ VERIFYING DATABASE (PostgreSQL/Neon)...');
  console.log('=' .repeat(50));

  try {
    const databaseUrl = process.env.DATABASE_URL!;
    const sql = postgres(databaseUrl);
    const db = drizzle(sql, { schema });

    // Check total users
    const allUsers = await db.select().from(users);
    console.log(`📊 Total users in database: ${allUsers.length}`);

    // Check specific test user
    const testPhone = '593984074389';
    const [testUser] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, testPhone))
      .limit(1);

    if (allUsers.length === 0) {
      verification.database.clean = true;
      verification.database.details = 'Database is completely clean - no users found';
      console.log('✅ Database verification: CLEAN');
    } else {
      verification.database.details = `Database still contains ${allUsers.length} users`;
      console.log('❌ Database verification: NOT CLEAN');
      allUsers.forEach(user => {
        console.log(`   - ${user.phoneNumber} (${user.subscriptionStatus})`);
      });
    }

    if (testUser) {
      console.log(`❌ Test user ${testPhone} still exists in database`);
    } else {
      console.log(`✅ Test user ${testPhone} not found in database`);
    }

    await sql.end();

  } catch (error) {
    verification.database.details = `Database verification failed: ${error}`;
    console.error(`❌ ${verification.database.details}`);
  }

  // 2. VERIFY REDIS
  console.log('\n2️⃣ VERIFYING REDIS CACHE...');
  console.log('=' .repeat(50));

  try {
    const chatBuffer = ChatBuffer.getInstance({
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    const redis = (chatBuffer as any).redis;

    // Check all keys
    const allKeys = await redis.keys('*');
    console.log(`📊 Total Redis keys: ${allKeys.length}`);

    // Categorize remaining keys
    const messageKeys = allKeys.filter((key: string) => key.startsWith('msg:'));
    const chatKeys = allKeys.filter((key: string) => key.startsWith('chat:'));
    const stateKeys = allKeys.filter((key: string) => key.startsWith('state:'));

    console.log(`   - Message counters (msg:*): ${messageKeys.length}`);
    console.log(`   - Chat buffers (chat:*): ${chatKeys.length}`);
    console.log(`   - User states (state:*): ${stateKeys.length}`);

    if (messageKeys.length === 0 && chatKeys.length === 0 && stateKeys.length === 0) {
      verification.redis.clean = true;
      verification.redis.details = 'Redis is clean - no user-related keys found';
      console.log('✅ Redis verification: CLEAN');
      
      if (allKeys.length > 0) {
        console.log('ℹ️ Some non-user keys remain (this is normal):');
        allKeys.forEach((key: string) => console.log(`   - ${key}`));
      }
    } else {
      verification.redis.details = `Redis contains user data: ${messageKeys.length + chatKeys.length + stateKeys.length} user keys`;
      console.log('❌ Redis verification: NOT CLEAN');
      
      [...messageKeys, ...chatKeys, ...stateKeys].forEach((key: string) => {
        console.log(`   - ${key}`);
      });
    }

  } catch (error) {
    verification.redis.details = `Redis verification failed: ${error}`;
    console.error(`❌ ${verification.redis.details}`);
  }

  // 3. VERIFY VECTOR MEMORY
  console.log('\n3️⃣ VERIFYING VECTOR MEMORY (Qdrant)...');
  console.log('=' .repeat(50));

  try {
    const vectorMemory = VectorMemory.getInstance(
      {
        url: process.env.QDRANT_URL!,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: process.env.QDRANT_COLLECTION || 'running_coach_memories'
      },
      {
        apiKey: process.env.EMBEDDINGS_API_KEY!,
        model: process.env.EMBEDDINGS_MODEL || 'text-embedding-ada-002',
        baseURL: process.env.EMBEDDINGS_BASE_URL
      }
    );

    const qdrant = (vectorMemory as any).qdrant;
    const collectionName = (vectorMemory as any).collectionName;

    try {
      const collectionInfo = await qdrant.getCollection(collectionName);
      const pointsCount = collectionInfo.points_count || 0;
      console.log(`📊 Vector memory points: ${pointsCount}`);

      if (pointsCount === 0) {
        verification.vectorMemory.clean = true;
        verification.vectorMemory.details = 'Vector memory is clean - no points found';
        console.log('✅ Vector memory verification: CLEAN');
      } else {
        verification.vectorMemory.details = `Vector memory contains ${pointsCount} points`;
        console.log('❌ Vector memory verification: NOT CLEAN');
      }
    } catch (collectionError) {
      verification.vectorMemory.clean = true;
      verification.vectorMemory.details = 'Collection does not exist or is empty';
      console.log('✅ Vector memory verification: CLEAN (collection empty/missing)');
    }

  } catch (error) {
    verification.vectorMemory.details = `Vector memory verification failed: ${error}`;
    console.error(`❌ ${verification.vectorMemory.details}`);
  }

  // 4. OVERALL VERIFICATION
  verification.overall = verification.database.clean && 
                        verification.redis.clean && 
                        verification.vectorMemory.clean;

  console.log('\n🎯 VERIFICATION SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`Database: ${verification.database.clean ? '✅ CLEAN' : '❌ NOT CLEAN'}`);
  console.log(`Redis: ${verification.redis.clean ? '✅ CLEAN' : '❌ NOT CLEAN'}`);
  console.log(`Vector Memory: ${verification.vectorMemory.clean ? '✅ CLEAN' : '❌ NOT CLEAN'}`);
  console.log('');
  console.log(`Overall Status: ${verification.overall ? '✅ SYSTEM READY FOR CLEAN TESTING' : '❌ CLEANUP INCOMPLETE'}`);

  if (verification.overall) {
    console.log('\n🎉 SYSTEM VERIFICATION SUCCESSFUL!');
    console.log('✅ All storage layers are clean');
    console.log('✅ No user data remains in any system');
    console.log('✅ Ready for fresh testing from scratch');
    
    console.log('\n🧪 RECOMMENDED TESTING FLOW:');
    console.log('1. Send message to WhatsApp bot (+593987644414)');
    console.log('2. Verify fresh user creation');
    console.log('3. Test onboarding flow from beginning');
    console.log('4. Verify message counter starts at 0');
    console.log('5. Test premium upgrade flow');
  } else {
    console.log('\n⚠️ CLEANUP INCOMPLETE - ISSUES FOUND:');
    if (!verification.database.clean) console.log(`   Database: ${verification.database.details}`);
    if (!verification.redis.clean) console.log(`   Redis: ${verification.redis.details}`);
    if (!verification.vectorMemory.clean) console.log(`   Vector Memory: ${verification.vectorMemory.details}`);
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Run reset script again: npx tsx complete-system-reset.ts');
    console.log('2. Check for any errors in the reset process');
    console.log('3. Manually verify problematic storage layers');
  }

  return verification;
}

// Run the verification
verifySystemReset().catch(console.error);
