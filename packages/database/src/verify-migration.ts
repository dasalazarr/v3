#!/usr/bin/env tsx

import postgres from 'postgres';

const expectedTables = [
  'users',
  'runs',
  'training_plans',
  'workouts',
  'chat_messages',
  'progress_summaries',
  'memory_vectors',
  'appointments'
];

async function verify() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(databaseUrl, { max: 1 });
  try {
    const rows = await client`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public';
    ` as { table_name: string }[];
    const existing = rows.map((r) => r.table_name);
    const missing = expectedTables.filter(t => !existing.includes(t));
    if (missing.length === 0) {
      console.log('✅ All expected tables exist');
    } else {
      console.error('❌ Missing tables:', missing.join(', '));
      process.exit(1);
    }
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verify();
}
