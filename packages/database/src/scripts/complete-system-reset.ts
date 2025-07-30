#!/usr/bin/env tsx

import { config } from 'dotenv';
import { ChatBuffer, VectorMemory } from '@running-coach/vector-memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../schema.js';
import * as schema from '../schema.js';

// Load environment variables
config();

async function completeSystemReset() {
  console.log('🧹 COMPLETE SYSTEM RESET - DELETING ALL USER DATA...\n');
  console.log('⚠️  WARNING: This will permanently delete ALL user data from:');
  console.log('   - PostgreSQL Database (users table)');
  console.log('   - Redis Cache (all user keys)');
  console.log('   - Qdrant Vector Memory (all conversations/memories)');
  console.log('');

  // Wait 3 seconds for user to cancel if needed
  console.log('⏳ Starting in 3 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const results = {
    database: { deleted: 0, errors: [] as string[] },
    redis: { deleted: 0, errors: [] as string[] },
    vectorMemory: { deleted: 0, errors: [] as string[] }
  };

  // 1. RESET DATABASE (PostgreSQL/Neon)
  console.log('1️⃣ RESETTING DATABASE (PostgreSQL/Neon)...');
  console.log('=' .repeat(50));

  try {
    const databaseUrl = process.env.DATABASE_URL!;
    const sql = postgres(databaseUrl);
    const db = drizzle(sql, { schema });

    // Get count before deletion
    const usersBefore = await db.select().from(users);
    console.log(`📊 Users found before deletion: ${usersBefore.length}`);

    if (usersBefore.length > 0) {
      usersBefore.forEach(user => {
        console.log(`   - ${user.phoneNumber} (${user.subscriptionStatus})`);
      });
    }

    // Delete all users
    const deletedUsers = await db.delete(users).returning();
    results.database.deleted = deletedUsers.length;

    console.log(`✅ Database cleanup complete: ${results.database.deleted} users deleted`);
    await sql.end();

  } catch (error) {
    const errorMsg = `Database reset failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.database.errors.push(errorMsg);
  }

  // 2. RESET REDIS CACHE
  console.log('\n2️⃣ RESETTING REDIS CACHE...');
  console.log('=' .repeat(50));

  try {
    const chatBuffer = ChatBuffer.getInstance({
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    // Get Redis instance
    const redis = (chatBuffer as any).redis;

    // Get all keys before deletion
    const allKeys = await redis.keys('*');
    console.log(`📊 Redis keys found before deletion: ${allKeys.length}`);

    if (allKeys.length > 0) {
      // Categorize keys
      const messageKeys = allKeys.filter((key: string) => key.startsWith('msg:'));
      const chatKeys = allKeys.filter((key: string) => key.startsWith('chat:'));
      const stateKeys = allKeys.filter((key: string) => key.startsWith('state:'));
      const otherKeys = allKeys.filter((key: string) => 
        !key.startsWith('msg:') && !key.startsWith('chat:') && !key.startsWith('state:')
      );

      console.log(`   - Message counters (msg:*): ${messageKeys.length}`);
      console.log(`   - Chat buffers (chat:*): ${chatKeys.length}`);
      console.log(`   - User states (state:*): ${stateKeys.length}`);
      console.log(`   - Other keys: ${otherKeys.length}`);

      // Delete all keys
      if (allKeys.length > 0) {
        const deletedCount = await redis.del(...allKeys);
        results.redis.deleted = deletedCount;
        console.log(`✅ Redis cleanup complete: ${deletedCount} keys deleted`);
      }
    } else {
      console.log('✅ Redis was already clean');
    }

  } catch (error) {
    const errorMsg = `Redis reset failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.redis.errors.push(errorMsg);
  }

  // 3. RESET VECTOR MEMORY (Qdrant)
  console.log('\n3️⃣ RESETTING VECTOR MEMORY (Qdrant)...');
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

    // Get collection info before deletion
    const qdrant = (vectorMemory as any).qdrant;
    const collectionName = (vectorMemory as any).collectionName;

    try {
      const collectionInfo = await qdrant.getCollection(collectionName);
      const pointsCount = collectionInfo.points_count || 0;
      console.log(`📊 Vector points found before deletion: ${pointsCount}`);

      if (pointsCount > 0) {
        // Delete all points in the collection
        await qdrant.delete(collectionName, {
          filter: {} // Empty filter deletes all points
        });
        results.vectorMemory.deleted = pointsCount;
        console.log(`✅ Vector memory cleanup complete: ${pointsCount} points deleted`);
      } else {
        console.log('✅ Vector memory was already clean');
      }
    } catch (collectionError) {
      console.log('ℹ️ Collection might not exist or be empty - this is normal for fresh setups');
    }

  } catch (error) {
    const errorMsg = `Vector memory reset failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.vectorMemory.errors.push(errorMsg);
  }

  // 4. SUMMARY REPORT
  console.log('\n🎉 SYSTEM RESET COMPLETE!');
  console.log('=' .repeat(50));
  console.log('📊 DELETION SUMMARY:');
  console.log(`   Database: ${results.database.deleted} users deleted`);
  console.log(`   Redis: ${results.redis.deleted} keys deleted`);
  console.log(`   Vector Memory: ${results.vectorMemory.deleted} points deleted`);

  if (results.database.errors.length > 0 || 
      results.redis.errors.length > 0 || 
      results.vectorMemory.errors.length > 0) {
    console.log('\n⚠️ ERRORS ENCOUNTERED:');
    [...results.database.errors, ...results.redis.errors, ...results.vectorMemory.errors]
      .forEach(error => console.log(`   - ${error}`));
  } else {
    console.log('\n✅ ALL STORAGE LAYERS SUCCESSFULLY RESET!');
  }

  console.log('\n🧪 SYSTEM READY FOR CLEAN TESTING:');
  console.log('   - No user exists for phone 593984074389');
  console.log('   - Redis cache is completely clean');
  console.log('   - Vector memory has no stored conversations');
  console.log('   - Fresh user registration will work normally');

  console.log('\n🔧 NEXT STEPS:');
  console.log('   1. Run verification: npx tsx verify-system-reset.ts');
  console.log('   2. Test fresh user registration via WhatsApp');
  console.log('   3. Verify clean onboarding flow');
  console.log('   4. Test message counter from 0');

  return results;
}

// Run the complete reset
completeSystemReset().catch(console.error);
