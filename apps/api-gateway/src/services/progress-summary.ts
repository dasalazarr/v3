import { Database } from '@running-coach/database';
import { users, runs, trainingPlans } from '@running-coach/database';
import { eq, sum, avg, sql } from 'drizzle-orm';
import { VDOTCalculator } from '@running-coach/plan-generator';
import { Logger } from 'pino';
import { addDays, format } from 'date-fns';

// Placeholder for image generation library (e.g., node-canvas)
// In a real scenario, you'd import and use it here.
// For now, we'll just return a dummy URL.

export class ProgressSummaryService {
  private database: Database;
  private logger: Logger;

  constructor(database: Database, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  public async generateProgressCard(userId: string): Promise<string | null> {
    this.logger.info(`Generating progress card for user: ${userId}`);
    try {
      const [user] = await this.database.query.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        this.logger.warn(`User ${userId} not found for progress card generation.`);
        return null;
      }

      // Fetch recent runs (e.g., last 4 weeks)
      const fourWeeksAgo = addDays(new Date(), -28);
      const recentRuns = await this.database.query.select().from(runs)
        .where(sql`${runs.userId} = ${userId} AND ${runs.date} >= ${fourWeeksAgo}`)
        .orderBy(runs.date);

      // Calculate key metrics
      const totalDistance = recentRuns.reduce((sum, run) => sum + (parseFloat(run.distance) || 0), 0);
      const totalDuration = recentRuns.reduce((sum, run) => sum + (run.duration || 0), 0);
      const averagePace = totalDuration > 0 && totalDistance > 0 ? totalDuration / totalDistance : 0;
      const averageEffort = recentRuns.length > 0 ? recentRuns.reduce((sum, run) => sum + (run.perceivedEffort || 0), 0) / recentRuns.length : 0;

      // Estimate VDOT from recent runs
      const vdotEstimate = VDOTCalculator.calculateFromRecentRuns(recentRuns.map(run => ({...run, distance: parseFloat(run.distance)})));

      // Fetch active training plan
      const [activePlan] = await this.database.query.select().from(trainingPlans)
        .where(sql`${trainingPlans.userId} = ${userId} AND ${trainingPlans.isActive} = true`)
        .limit(1);

      const insights = this.generateInsights(user, recentRuns, activePlan);

      // --- Image Generation Placeholder ---
      // In a real implementation, you would use a library like `node-canvas` or `sharp`
      // to draw this information onto an image and return its URL or base64 data.
      const dummyImageUrl = `https://example.com/progress_card_${userId}_${Date.now()}.png`;
      this.logger.info(`Generated dummy progress card URL: ${dummyImageUrl}`);

      // Store summary in database (optional, for historical tracking)
      await this.database.query.insert(progressSummaries).values({
        userId,
        weekStartDate: fourWeeksAgo,
        weekEndDate: new Date(),
        totalDistance,
        totalRuns: recentRuns.length,
        averagePace,
        averageEffort,
        vdotEstimate,
        insights: insights as any, // Cast to any for jsonb
        imageUrl: dummyImageUrl,
        sent: false,
      });

      return dummyImageUrl;
    } catch (error) {
      this.logger.error(`Error generating progress card for user ${userId}:`, error);
      return null;
    }
  }

  private generateInsights(user: any, recentRuns: any[], activePlan: any): string[] {
    const insights: string[] = [];

    if (recentRuns.length === 0) {
      insights.push("No recent runs logged. Let's get moving!");
      return insights;
    }

    // Example insights (can be expanded with more complex logic)
    const totalDistance = recentRuns.reduce((sum, run) => sum + (run.distance || 0), 0);
    if (totalDistance > 50) {
      insights.push("You've covered a great distance recently! Keep up the mileage.");
    }

    const avgPace = recentRuns.reduce((sum, run) => sum + (run.duration || 0) / (run.distance || 1), 0) / recentRuns.length;
    if (avgPace > 0 && avgPace < 400) { // Assuming pace in seconds/km
      insights.push(`Your average pace is around ${Math.round(avgPace / 60)} min/km. Focus on consistency.`);
    }

    if (activePlan) {
      insights.push(`You're currently following a plan for ${activePlan.targetRace}. Stay focused on your goals!`);
    }

    return insights;
  }
}
