import { pgTable, uuid, text, integer, decimal, boolean, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).unique().notNull(),
  age: integer('age'),
  gender: text('gender', { enum: ['male', 'female', 'other'] }),
  onboardingGoal: text('onboarding_goal', { enum: ['first_race', 'improve_time', 'stay_fit'] }),
  goalRace: text('goal_race', { enum: ['5k', '10k', 'half_marathon', 'marathon', 'ultra'] }),
  experienceLevel: text('experience_level', { enum: ['beginner', 'intermediate', 'advanced'] }),
  injuryHistory: jsonb('injury_history'),
  weeklyMileage: decimal('weekly_mileage', { precision: 5, scale: 2 }),
  weeklyMessageCount: integer('weekly_message_count').default(0),
  subscriptionStatus: text('subscription_status', { enum: ['none', 'active', 'past_due', 'canceled'] }).default('none'),
  preferredLanguage: text('preferred_language', { enum: ['en', 'es'] }).default('en').notNull(),
  timezone: varchar('timezone', { length: 50 }),
  currentOnboardingQuestion: text('current_onboarding_question'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Runs table
export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').notNull(),
  distance: decimal('distance', { precision: 6, scale: 2 }).notNull(),
  duration: integer('duration'), // seconds
  perceivedEffort: integer('perceived_effort'), // 1-10 scale
  mood: text('mood', { enum: ['great', 'good', 'okay', 'tired', 'terrible'] }),
  aches: jsonb('aches'), // array of {location: string, severity: number}
  notes: text('notes'),
  weather: varchar('weather', { length: 100 }),
  route: varchar('route', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Training plans table
export const trainingPlans = pgTable('training_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  vdot: decimal('vdot', { precision: 4, scale: 1 }).notNull(),
  weeklyFrequency: integer('weekly_frequency').notNull(),
  targetRace: text('target_race', { enum: ['5k', '10k', 'half_marathon', 'marathon'] }).notNull(),
  targetDate: timestamp('target_date'),
  currentWeek: integer('current_week').default(1).notNull(),
  totalWeeks: integer('total_weeks').notNull(),
  paces: jsonb('paces').notNull(), // {easy, marathon, threshold, interval, repetition}
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Workouts table
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').references(() => trainingPlans.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  week: integer('week').notNull(),
  day: integer('day').notNull(),
  type: text('type', { enum: ['easy', 'long', 'tempo', 'intervals', 'recovery', 'race'] }).notNull(),
  distance: decimal('distance', { precision: 5, scale: 2 }),
  duration: integer('duration'), // minutes
  targetPace: integer('target_pace'), // seconds per mile
  description: text('description').notNull(),
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at'),
  scheduledDate: timestamp('scheduled_date'),
  actualDistance: decimal('actual_distance', { precision: 5, scale: 2 }),
  actualDuration: integer('actual_duration'),
  actualPace: integer('actual_pace'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Chat messages table
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Progress summaries table
export const progressSummaries = pgTable('progress_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weekStartDate: timestamp('week_start_date').notNull(),
  weekEndDate: timestamp('week_end_date').notNull(),
  totalDistance: decimal('total_distance', { precision: 6, scale: 2 }),
  totalRuns: integer('total_runs'),
  averagePace: integer('average_pace'),
  averageEffort: decimal('average_effort', { precision: 3, scale: 1 }),
  vdotEstimate: decimal('vdot_estimate', { precision: 4, scale: 1 }),
  insights: jsonb('insights'), // array of insight objects
  imageUrl: varchar('image_url', { length: 500 }),
  sent: boolean('sent').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Memory vectors table (for Qdrant backup/metadata)
export const memoryVectors = pgTable('memory_vectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  embedding: jsonb('embedding'), // vector data backup
  type: text('type', { enum: ['conversation', 'run_data', 'achievement', 'goal'] }).notNull(),
  relevanceScore: decimal('relevance_score', { precision: 3, scale: 2 }),
  vectorId: varchar('vector_id', { length: 100 }), // Qdrant vector ID
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Appointments table (keeping existing functionality)
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  googleEventId: varchar('google_event_id', { length: 100 }),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).default('scheduled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  runs: many(runs),
  trainingPlans: many(trainingPlans),
  workouts: many(workouts),
  chatMessages: many(chatMessages),
  progressSummaries: many(progressSummaries),
  memoryVectors: many(memoryVectors),
  appointments: many(appointments)
}));

export const runsRelations = relations(runs, ({ one }) => ({
  user: one(users, { fields: [runs.userId], references: [users.id] })
}));

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  user: one(users, { fields: [trainingPlans.userId], references: [users.id] }),
  workouts: many(workouts)
}));

export const workoutsRelations = relations(workouts, ({ one }) => ({
  user: one(users, { fields: [workouts.userId], references: [users.id] }),
  plan: one(trainingPlans, { fields: [workouts.planId], references: [trainingPlans.id] })
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, { fields: [chatMessages.userId], references: [users.id] })
}));

export const progressSummariesRelations = relations(progressSummaries, ({ one }) => ({
  user: one(users, { fields: [progressSummaries.userId], references: [users.id] })
}));

export const memoryVectorsRelations = relations(memoryVectors, ({ one }) => ({
  user: one(users, { fields: [memoryVectors.userId], references: [users.id] })
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(users, { fields: [appointments.userId], references: [users.id] })
}));