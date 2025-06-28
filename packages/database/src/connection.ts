import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export class Database {
  private static instance: Database;
  private client: postgres.Sql;
  private db: ReturnType<typeof drizzle>;

  private constructor(config: DatabaseConfig) {
    this.client = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: config.ssl ? 'require' : false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 60,
    });

    this.db = drizzle(this.client, { schema });
  }

  public static getInstance(config?: DatabaseConfig): Database {
    if (!Database.instance) {
      if (!config) {
        throw new Error('Database config required for first initialization');
      }
      Database.instance = new Database(config);
    }
    return Database.instance;
  }

  public get query() {
    return this.db;
  }

  public async close(): Promise<void> {
    await this.client.end();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}