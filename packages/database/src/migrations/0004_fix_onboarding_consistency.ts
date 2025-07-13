import { sql } from 'drizzle-orm';

/**
 * Migration to fix onboarding consistency issues
 * - Ensures all onboarding fields exist in users table
 * - Adds missing indexes for performance
 * - Validates data integrity
 */

export async function up(db: any) {
  // Ensure all onboarding fields exist with proper defaults
  await db.execute(sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS current_onboarding_question TEXT,
    ADD COLUMN IF NOT EXISTS goal_race TEXT,
    ADD COLUMN IF NOT EXISTS experience_level TEXT,
    ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER,
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS gender TEXT;
  `);

  // Add constraints for data integrity
  await db.execute(sql`
    ALTER TABLE users 
    ADD CONSTRAINT IF NOT EXISTS check_goal_race 
    CHECK (goal_race IS NULL OR goal_race IN ('5k', '10k', 'half_marathon', 'marathon', 'ultra'));
  `);

  await db.execute(sql`
    ALTER TABLE users 
    ADD CONSTRAINT IF NOT EXISTS check_experience_level 
    CHECK (experience_level IS NULL OR experience_level IN ('beginner', 'intermediate', 'advanced'));
  `);

  await db.execute(sql`
    ALTER TABLE users 
    ADD CONSTRAINT IF NOT EXISTS check_weekly_frequency 
    CHECK (weekly_frequency IS NULL OR (weekly_frequency >= 1 AND weekly_frequency <= 7));
  `);

  await db.execute(sql`
    ALTER TABLE users 
    ADD CONSTRAINT IF NOT EXISTS check_age 
    CHECK (age IS NULL OR (age >= 16 AND age <= 80));
  `);

  await db.execute(sql`
    ALTER TABLE users 
    ADD CONSTRAINT IF NOT EXISTS check_gender 
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
  `);

  // Add performance indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_users_onboarding_question ON users(current_onboarding_question) 
    WHERE current_onboarding_question IS NOT NULL;
  `);

  // Cleanup any inconsistent data (reset incomplete onboarding if missing critical fields)
  await db.execute(sql`
    UPDATE users 
    SET onboarding_completed = false, current_onboarding_question = 'goalRace'
    WHERE onboarding_completed = true 
      AND (goal_race IS NULL OR experience_level IS NULL OR weekly_frequency IS NULL);
  `);

  console.log('Migration 0004: Onboarding consistency fixes applied successfully');
}

export async function down(db: any) {
  // Remove constraints
  await db.execute(sql`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS check_goal_race,
    DROP CONSTRAINT IF EXISTS check_experience_level,
    DROP CONSTRAINT IF EXISTS check_weekly_frequency,
    DROP CONSTRAINT IF EXISTS check_age,
    DROP CONSTRAINT IF EXISTS check_gender;
  `);

  // Remove performance indexes
  await db.execute(sql`DROP INDEX IF EXISTS idx_users_onboarding_question;`);

  console.log('Migration 0004: Onboarding consistency fixes rolled back');
}