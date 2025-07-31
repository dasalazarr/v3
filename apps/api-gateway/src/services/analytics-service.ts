import { Database } from '@running-coach/database';
import { runs, users, progressSummaries } from '@running-coach/database';
import { VDOTCalculator } from '@running-coach/plan-generator';
import { formatPace } from '@running-coach/shared';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { singleton } from 'tsyringe';

export interface ProgressInsight {
  type: 'improvement' | 'concern' | 'milestone' | 'recommendation';
  title: string;
  description: string;
  value?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface WeeklyStats {
  totalDistance: number;
  totalRuns: number;
  averagePace: number;
  averageEffort: number;
  vdotEstimate: number;
  longestRun: number;
  insights: ProgressInsight[];
}

@singleton()
export class AnalyticsService {
  constructor(private db: Database) {}

  /**
   * Generate weekly progress summary for a user
   */
  public async generateWeeklySummary(userId: string, weekStart?: Date): Promise<WeeklyStats | null> {
    const week = weekStart || startOfWeek(new Date());
    const weekEnd = endOfWeek(week);

    try {
      // Get runs for the week
      const weekRuns = await this.db.query.select()
        .from(runs)
        .where(
          and(
            eq(runs.userId, userId),
            gte(runs.date, week),
            lte(runs.date, weekEnd)
          )
        )
        .orderBy(desc(runs.date));

      if (weekRuns.length === 0) {
        return null;
      }

      // Calculate basic stats
      const totalDistance = weekRuns.reduce((sum, run) => sum + parseFloat(run.distance), 0);
      const totalDuration = weekRuns.reduce((sum, run) => sum + (run.duration || 0), 0);
      const averagePace = totalDuration / totalDistance; // seconds per mile
      const averageEffort = weekRuns.reduce((sum, run) => sum + (run.perceivedEffort || 5), 0) / weekRuns.length;
      const longestRun = Math.max(...weekRuns.map(run => parseFloat(run.distance)));

      // Estimate current VDOT
      const vdotEstimate = VDOTCalculator.calculateFromRecentRuns(weekRuns as any);

      // Generate insights
      const insights = await this.generateInsights(userId, weekRuns as any, {
        totalDistance,
        totalRuns: weekRuns.length,
        averagePace,
        averageEffort,
        vdotEstimate,
        longestRun
      });

      const stats: WeeklyStats = {
        totalDistance,
        totalRuns: weekRuns.length,
        averagePace,
        averageEffort,
        vdotEstimate,
        longestRun,
        insights
      };

      // Store progress summary
      await this.storeProgressSummary(userId, week, weekEnd, stats);

      return stats;
    } catch (error) {
      console.error(`❌ Error generating weekly summary for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Generate progress summary data
   */
  public async generateProgressCard(userId: string, stats: WeeklyStats): Promise<Record<string, any>> {
    // Create a structured JSON response instead of a canvas image
    const dateRange = this.formatDateRange(startOfWeek(new Date()));
    
    return {
      title: 'Weekly Progress Summary',
      dateRange,
      stats: {
        totalDistance: `${stats.totalDistance.toFixed(1)} mi`,
        totalRuns: stats.totalRuns,
        averagePace: formatPace(stats.averagePace),
        vdot: stats.vdotEstimate,
        averageEffort: stats.averageEffort
      },
      insights: stats.insights.slice(0, 3)
    };
  }

  /**
   * Get trend analysis for a user
   */
  public async getTrendAnalysis(userId: string, weeks: number = 8): Promise<{
    distanceTrend: number;
    paceTrend: number;
    vdotTrend: number;
    consistencyScore: number;
  }> {
    const endDate = new Date();
    const startDate = addDays(endDate, -weeks * 7);

    try {
      const recentRuns = await this.db.query.select()
        .from(runs)
        .where(
          and(
            eq(runs.userId, userId),
            gte(runs.date, startDate),
            lte(runs.date, endDate)
          )
        )
        .orderBy(desc(runs.date));

      if (recentRuns.length < 4) {
        return {
          distanceTrend: 0,
          paceTrend: 0,
          vdotTrend: 0,
          consistencyScore: 0.5
        };
      }

      // Calculate weekly aggregates
      const weeklyData = this.aggregateByWeek(recentRuns as any);
      
      // Calculate trends using linear regression
      const distanceTrend = this.calculateTrend(weeklyData.map(w => w.totalDistance));
      const paceTrend = this.calculateTrend(weeklyData.map(w => w.averagePace));
      const vdotTrend = this.calculateTrend(weeklyData.map(w => w.vdotEstimate));
      
      // Calculate consistency (runs per week vs target)
      const avgRunsPerWeek = weeklyData.reduce((sum, w) => sum + w.runCount, 0) / weeklyData.length;
      const consistencyScore = Math.min(1, avgRunsPerWeek / 4); // Target: 4 runs per week

      return {
        distanceTrend,
        paceTrend,
        vdotTrend,
        consistencyScore
      };
    } catch (error) {
      console.error(`❌ Error calculating trends for ${userId}:`, error);
      return { distanceTrend: 0, paceTrend: 0, vdotTrend: 0, consistencyScore: 0.5 };
    }
  }

  private async generateInsights(
    userId: string,
    weekRuns: any[],
    stats: Omit<WeeklyStats, 'insights'>
  ): Promise<ProgressInsight[]> {
    const insights: ProgressInsight[] = [];

    // Compare to previous week
    const previousWeekStats = await this.getPreviousWeekStats(userId);
    
    if (previousWeekStats) {
      // Distance improvement
      const distanceChange = stats.totalDistance - previousWeekStats.totalDistance;
      if (distanceChange > 2) {
        insights.push({
          type: 'improvement',
          title: 'Distance Increase',
          description: `You ran ${distanceChange.toFixed(1)} more miles than last week!`,
          value: distanceChange,
          unit: 'miles',
          trend: 'up'
        });
      }

      // Pace improvement
      const paceChange = previousWeekStats.averagePace - stats.averagePace; // Negative = faster
      if (paceChange > 10) { // 10 seconds faster per mile
        insights.push({
          type: 'improvement',
          title: 'Pace Improvement',
          description: `Your average pace improved by ${Math.abs(paceChange).toFixed(0)} seconds per mile!`,
          value: Math.abs(paceChange),
          unit: 'sec/mile',
          trend: 'up'
        });
      }

      // VDOT improvement
      const vdotChange = stats.vdotEstimate - previousWeekStats.vdotEstimate;
      if (vdotChange >= 1) {
        insights.push({
          type: 'milestone',
          title: 'Fitness Gain',
          description: `Your estimated VDOT increased by ${vdotChange.toFixed(1)} points!`,
          value: vdotChange,
          unit: 'VDOT',
          trend: 'up'
        });
      }
    }

    // High effort warning
    if (stats.averageEffort > 7.5) {
      insights.push({
        type: 'concern',
        title: 'High Effort Level',
        description: 'Consider adding more easy runs to prevent overtraining.',
        value: stats.averageEffort,
        unit: 'RPE',
        trend: 'up'
      });
    }

    // Consistency check
    if (stats.totalRuns >= 4) {
      insights.push({
        type: 'improvement',
        title: 'Great Consistency',
        description: `${stats.totalRuns} runs this week shows excellent commitment!`,
        value: stats.totalRuns,
        unit: 'runs'
      });
    } else if (stats.totalRuns <= 2) {
      insights.push({
        type: 'recommendation',
        title: 'More Consistency Needed',
        description: 'Try to aim for at least 3-4 runs per week for better progress.',
        value: stats.totalRuns,
        unit: 'runs'
      });
    }

    // Long run milestone
    if (stats.longestRun >= 10) {
      insights.push({
        type: 'milestone',
        title: 'Long Run Achievement',
        description: `${stats.longestRun.toFixed(1)} miles - great endurance building!`,
        value: stats.longestRun,
        unit: 'miles'
      });
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  private async getPreviousWeekStats(userId: string): Promise<WeeklyStats | null> {
    const previousWeek = addDays(startOfWeek(new Date()), -7);
    
    try {
      const summary = await this.db.query.select()
        .from(progressSummaries)
        .where(
          and(
            eq(progressSummaries.userId, userId),
            eq(progressSummaries.weekStartDate, previousWeek)
          )
        )
        .limit(1);

      if (summary.length === 0) {
        return null;
      }

      const data = summary[0];
      return {
        totalDistance: parseFloat(data.totalDistance || '0'),
        totalRuns: data.totalRuns || 0,
        averagePace: data.averagePace || 0,
        averageEffort: parseFloat(data.averageEffort || '0'),
        vdotEstimate: parseFloat(data.vdotEstimate || '0'),
        longestRun: 0, // Not stored in summary
        insights: [] // Not needed for comparison
      };
    } catch (error) {
      console.error('Error getting previous week stats:', error);
      return null;
    }
  }

  private async storeProgressSummary(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
    stats: WeeklyStats
  ): Promise<void> {
    try {
      await this.db.query.insert(progressSummaries).values({
        userId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        totalDistance: stats.totalDistance.toString(),
        totalRuns: stats.totalRuns,
        averagePace: Math.round(stats.averagePace),
        averageEffort: stats.averageEffort.toString(),
        vdotEstimate: stats.vdotEstimate.toString(),
        insights: stats.insights,
        sent: false
      });
    } catch (error) {
      console.error('Error storing progress summary:', error);
    }
  }



  private formatDateRange(weekStart: Date): string {
    const weekEnd = endOfWeek(weekStart);
    return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
  }

  private aggregateByWeek(runs: any[]): Array<{
    week: Date;
    totalDistance: number;
    averagePace: number;
    vdotEstimate: number;
    runCount: number;
  }> {
    const weekMap = new Map();

    runs.forEach(run => {
      const weekStart = startOfWeek(new Date(run.date));
      const weekKey = weekStart.toISOString();

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week: weekStart,
          totalDistance: 0,
          totalDuration: 0,
          runCount: 0,
          runs: []
        });
      }

      const weekData = weekMap.get(weekKey);
      weekData.totalDistance += parseFloat(run.distance);
      weekData.totalDuration += run.duration || 0;
      weekData.runCount += 1;
      weekData.runs.push(run);
    });

    return Array.from(weekMap.values()).map(weekData => ({
      week: weekData.week,
      totalDistance: weekData.totalDistance,
      averagePace: weekData.totalDuration / weekData.totalDistance,
      vdotEstimate: VDOTCalculator.calculateFromRecentRuns(weekData.runs),
      runCount: weekData.runCount
    }));
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xSum = (n * (n - 1)) / 2; // Sum of indices
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + val * index, 0);
    const x2Sum = values.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    return slope || 0;
  }
}