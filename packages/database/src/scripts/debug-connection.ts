import { Database, DatabaseConfig } from '../connection';
import dotenv from 'dotenv';
import path from 'path';
import { URL, fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const debugConnection = async () => {
  const dbUrl = process.env.DATABASE_URL;
  
  console.log('🔍 Debug Information:');
  console.log(`   DATABASE_URL exists: ${!!dbUrl}`);
  console.log(`   DATABASE_URL (masked): ${dbUrl ? dbUrl.replace(/:[^:@]*@/, ':***@') : 'NOT SET'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  
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

  console.log('\n🔧 Database Config:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   Username: ${dbConfig.username}`);
  console.log(`   SSL: ${dbConfig.ssl}`);

  const db = Database.getInstance(dbConfig);

  try {
    console.log('\n🏥 Testing database health...');
    const isHealthy = await db.healthCheck();
    console.log(`   Health check result: ${isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);

    if (isHealthy) {
      console.log('\n📊 Testing raw SQL query...');
      
      // Test with raw SQL to see if we can connect at all
      const result = await db.query.execute(`
        SELECT 
          schemaname, 
          tablename, 
          tableowner 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `);
      
      console.log(`   Found ${result.length} tables:`);
      result.forEach((table: any) => {
        console.log(`     - ${table.tablename} (owner: ${table.tableowner})`);
      });

      // Test users table specifically
      console.log('\n👥 Testing users table...');
      const userCount = await db.query.execute(`SELECT COUNT(*) as count FROM users;`);
      console.log(`   Users table count: ${userCount[0]?.count || 0}`);

      // Show table structure
      console.log('\n🏗️ Users table structure:');
      const tableStructure = await db.query.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      tableStructure.forEach((col: any) => {
        console.log(`     ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    await db.close();
    console.log('\n🚪 Database connection closed.');
  }
};

debugConnection().catch(console.error);
