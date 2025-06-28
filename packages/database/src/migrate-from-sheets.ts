#!/usr/bin/env tsx

import { Database } from './connection.js';
import { users, runs, chatMessages } from './schema.js';
import { google, sheets_v4 } from 'googleapis';
import { eq } from 'drizzle-orm';

interface SheetsConfig {
  spreadsheetId: string;
  trainingSpreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

interface LegacyUserData {
  phoneNumber: string;
  userName?: string;
  lastActiveDate: string;
  language?: 'en' | 'es';
}

interface LegacyTrainingData {
  timestamp: string;
  phoneNumber: string;
  originalDescription: string;
  distance: string;
  distanceUnit: string;
  time: string;
  timeUnit: string;
  pace: string;
  paceUnit: string;
  perception: string;
  notes: string;
}

interface LegacyConversation {
  phoneNumber: string;
  timestamp: string;
  userMessage: string;
  botResponse: string;
}

export class SheetsMigration {
  private sheets: sheets_v4.Sheets;
  private db: Database;

  constructor(sheetsConfig: SheetsConfig, databaseConfig: any) {
    // Initialize Google Sheets
    const auth = new google.auth.JWT({
      email: sheetsConfig.clientEmail,
      key: sheetsConfig.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    
    // Initialize Database
    this.db = Database.getInstance(databaseConfig);
  }

  public async migrate(): Promise<void> {
    console.log('🚀 Starting migration from Google Sheets to PostgreSQL...');
    
    try {
      await this.migrateUsers();
      await this.migrateTrainingData();
      await this.migrateConversations();
      
      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async migrateUsers(): Promise<void> {
    console.log('📋 Migrating users...');
    
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.warn('⚠️ SPREADSHEET_ID not set, skipping user migration');
      return;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Users!A:D',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        console.log('No users found in sheets');
        return;
      }

      // Skip header row
      const userData = rows.slice(1).map(row => ({
        phoneNumber: row[0] || '',
        userName: row[1] || '',
        lastActiveDate: row[2] || new Date().toISOString(),
        language: (row[3] as 'en' | 'es') || 'es'
      })) as LegacyUserData[];

      for (const user of userData) {
        if (!user.phoneNumber) continue;

        try {
          // Check if user already exists
          const existingUser = await this.db.query.select()
            .from(users)
            .where(eq(users.phoneNumber, user.phoneNumber))
            .limit(1);

          if (existingUser.length === 0) {
            await this.db.query.insert(users).values({
              phoneNumber: user.phoneNumber,
              preferredLanguage: user.language,
              onboardingCompleted: false,
              createdAt: new Date(user.lastActiveDate),
              updatedAt: new Date(user.lastActiveDate)
            });
            console.log(`✅ Migrated user: ${user.phoneNumber}`);
          } else {
            console.log(`⏭️ User already exists: ${user.phoneNumber}`);
          }
        } catch (error) {
          console.error(`❌ Error migrating user ${user.phoneNumber}:`, error);
        }
      }

      console.log(`📋 Users migration completed: ${userData.length} users processed`);
    } catch (error) {
      console.error('❌ Error migrating users:', error);
    }
  }

  private async migrateTrainingData(): Promise<void> {
    console.log('🏃 Migrating training data...');
    
    const trainingSpreadsheetId = process.env.TRAINING_SPREADSHEET_ID;
    if (!trainingSpreadsheetId) {
      console.warn('⚠️ TRAINING_SPREADSHEET_ID not set, skipping training data migration');
      return;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: trainingSpreadsheetId,
        range: 'Training Logs!A:K',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        console.log('No training data found in sheets');
        return;
      }

      // Skip header row
      const trainingData = rows.slice(1).map(row => ({
        timestamp: row[0] || '',
        phoneNumber: row[1] || '',
        originalDescription: row[2] || '',
        distance: row[3] || '',
        distanceUnit: row[4] || '',
        time: row[5] || '',
        timeUnit: row[6] || '',
        pace: row[7] || '',
        paceUnit: row[8] || '',
        perception: row[9] || '',
        notes: row[10] || ''
      })) as LegacyTrainingData[];

      for (const training of trainingData) {
        if (!training.phoneNumber || !training.timestamp) continue;

        try {
          // Get user ID
          const user = await this.db.query.select()
            .from(users)
            .where(eq(users.phoneNumber, training.phoneNumber))
            .limit(1);

          if (user.length === 0) {
            console.log(`⚠️ User not found for training data: ${training.phoneNumber}`);
            continue;
          }

          const userId = user[0].id;

          // Parse distance
          let distance = 0;
          if (training.distance && training.distance !== 'N/A') {
            distance = parseFloat(training.distance);
            // Convert km to miles if needed
            if (training.distanceUnit === 'km') {
              distance = distance * 0.621371;
            }
          }

          // Parse duration
          let duration = 0;
          if (training.time && training.time !== 'N/A') {
            duration = this.parseTimeToSeconds(training.time, training.timeUnit);
          }

          // Parse perceived effort
          let perceivedEffort = null;
          if (training.perception && training.perception !== 'N/A') {
            const effort = parseInt(training.perception);
            if (!isNaN(effort) && effort >= 1 && effort <= 10) {
              perceivedEffort = effort;
            }
          }

          await this.db.query.insert(runs).values({
            userId,
            date: new Date(training.timestamp),
            distance: distance.toString(),
            duration,
            perceivedEffort,
            notes: training.notes !== 'N/A' ? training.notes : null,
            createdAt: new Date(training.timestamp)
          });

          console.log(`✅ Migrated training data for: ${training.phoneNumber}`);
        } catch (error) {
          console.error(`❌ Error migrating training data for ${training.phoneNumber}:`, error);
        }
      }

      console.log(`🏃 Training data migration completed: ${trainingData.length} entries processed`);
    } catch (error) {
      console.error('❌ Error migrating training data:', error);
    }
  }

  private async migrateConversations(): Promise<void> {
    console.log('💬 Migrating conversations...');
    
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
      console.warn('⚠️ SPREADSHEET_ID not set, skipping conversation migration');
      return;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Conversations!A:D',
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        console.log('No conversations found in sheets');
        return;
      }

      // Skip header row
      const conversations = rows.slice(1).map(row => ({
        phoneNumber: row[0] || '',
        timestamp: row[1] || '',
        userMessage: row[2] || '',
        botResponse: row[3] || ''
      })) as LegacyConversation[];

      for (const conversation of conversations) {
        if (!conversation.phoneNumber || !conversation.timestamp) continue;

        try {
          // Get user ID
          const user = await this.db.query.select()
            .from(users)
            .where(eq(users.phoneNumber, conversation.phoneNumber))
            .limit(1);

          if (user.length === 0) {
            console.log(`⚠️ User not found for conversation: ${conversation.phoneNumber}`);
            continue;
          }

          const userId = user[0].id;
          const timestamp = new Date(conversation.timestamp);

          // Insert user message
          if (conversation.userMessage) {
            await this.db.query.insert(chatMessages).values({
              userId,
              role: 'user',
              content: conversation.userMessage,
              timestamp
            });
          }

          // Insert bot response
          if (conversation.botResponse) {
            await this.db.query.insert(chatMessages).values({
              userId,
              role: 'assistant',
              content: conversation.botResponse,
              timestamp: new Date(timestamp.getTime() + 1000) // Add 1 second
            });
          }

          console.log(`✅ Migrated conversation for: ${conversation.phoneNumber}`);
        } catch (error) {
          console.error(`❌ Error migrating conversation for ${conversation.phoneNumber}:`, error);
        }
      }

      console.log(`💬 Conversations migration completed: ${conversations.length} conversations processed`);
    } catch (error) {
      console.error('❌ Error migrating conversations:', error);
    }
  }

  private parseTimeToSeconds(timeStr: string, unit: string): number {
    if (!timeStr || timeStr === 'N/A') return 0;

    // Handle different time formats
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(p => parseInt(p));
      if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }

    const numValue = parseFloat(timeStr);
    if (isNaN(numValue)) return 0;

    switch (unit?.toLowerCase()) {
      case 'seconds':
      case 'sec':
      case 's':
        return numValue;
      case 'minutes':
      case 'min':
      case 'm':
        return numValue * 60;
      case 'hours':
      case 'hour':
      case 'h':
        return numValue * 3600;
      default:
        return numValue; // Assume seconds
    }
  }
}

// CLI execution
async function main() {
  const sheetsConfig = {
    spreadsheetId: process.env.SPREADSHEET_ID!,
    trainingSpreadsheetId: process.env.TRAINING_SPREADSHEET_ID!,
    clientEmail: process.env.CLIENT_EMAIL!,
    privateKey: process.env.PRIVATE_KEY!.replace(/\\n/g, '\n')
  };

  const databaseConfig = {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME!,
    username: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.DB_SSL === 'true'
  };

  const migration = new SheetsMigration(sheetsConfig, databaseConfig);
  await migration.migrate();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}