import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
export class Database {
    static instance;
    client;
    db;
    constructor(config) {
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
    static getInstance(config) {
        if (!Database.instance) {
            if (!config) {
                throw new Error('Database config required for first initialization');
            }
            Database.instance = new Database(config);
        }
        return Database.instance;
    }
    get query() {
        return this.db;
    }
    async close() {
        await this.client.end();
    }
    async healthCheck() {
        try {
            await this.client `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
}
