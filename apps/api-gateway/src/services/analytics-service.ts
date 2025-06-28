import { Database } from '@running-coach/database';
import { runs, users, progressSummaries } from '@running-coach/database';
import { VDOTCalculator } from '@running-coach/plan-generator';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
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
   * Generate visual progress card
   */
  public async generateProgressCard(userId: string, stats: WeeklyStats): Promise<Buffer> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 800, 600);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Weekly Progress Summary', 400, 50);

    // Date range
    ctx.font = '18px Arial';
    ctx.fillStyle = '#cccccc';
    const dateRange = this.formatDateRange(startOfWeek(new Date()));
    ctx.fillText(dateRange, 400, 80);

    // Main stats
    this.drawStatBox(ctx, 50, 120, 180, 120, 'Total Distance', `${stats.totalDistance.toFixed(1)} mi`);
    this.drawStatBox(ctx, 250, 120, 180, 120, 'Total Runs', stats.totalRuns.toString());
    this.drawStatBox(ctx, 450, 120, 180, 120, 'Avg Pace', this.formatPace(stats.averagePace));
    this.drawStatBox(ctx, 650, 120, 100, 120, 'VDOT', stats.vdotEstimate.toString());

    // Effort gauge
    this.drawEffortGauge(ctx, 100, 280, stats.averageEffort);

    // Insights
    this.drawInsights(ctx, 350, 280, stats.insights.slice(0, 3));

    return canvas.toBuffer('image/png');
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

  private drawStatBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string
  ): void {
    // Box background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, y, width, height);
    
    // Border
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = '#cccccc';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width/2, y + 25);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(value, x + width/2, y + height - 25);
  }

  private drawEffortGauge(ctx: CanvasRenderingContext2D, x: number, y: number, effort: number): void {
    const radius = 80;
    const centerX = x + radius;
    const centerY = y + radius;

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#2a2a2a';
    ctx.fill();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Effort arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (effort / 10) * 2 * Math.PI;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 10, startAngle, endAngle);
    ctx.lineWidth = 15;
    
    // Color based on effort level
    if (effort <= 3) ctx.strokeStyle = '#4CAF50'; // Green
    else if (effort <= 6) ctx.strokeStyle = '#FFC107'; // Yellow
    else if (effort <= 8) ctx.strokeStyle = '#FF9800'; // Orange
    else ctx.strokeStyle = '#F44336'; // Red
    
    ctx.stroke();

    // Center text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(effort.toFixed(1), centerX, centerY + 5);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('Avg Effort', centerX, centerY + 25);
  }

  private drawInsights(ctx: CanvasRenderingContext2D, x: number, y: number, insights: ProgressInsight[]): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Key Insights', x, y);

    let currentY = y + 30;
    
    insights.forEach((insight, index) => {
      // Icon based on type
      let icon = '•';
      let iconColor = '#cccccc';
      
      switch (insight.type) {
        case 'improvement':
          icon = '↗';
          iconColor = '#4CAF50';
          break;
        case 'concern':
          icon = '⚠';
          iconColor = '#FF9800';
          break;
        case 'milestone':
          icon = '🏆';
          iconColor = '#FFD700';
          break;
        case 'recommendation':
          icon = '💡';
          iconColor = '#2196F3';
          break;
      }

      // Icon
      ctx.fillStyle = iconColor;
      ctx.font = '16px Arial';
      ctx.fillText(icon, x, currentY);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(insight.title, x + 25, currentY);

      // Description
      ctx.fillStyle = '#cccccc';
      ctx.font = '12px Arial';
      ctx.fillText(insight.description, x + 25, currentY + 18);

      currentY += 45;
    });
  }

  private formatPace(secondsPerMile: number): string {
    const minutes = Math.floor(secondsPerMile / 60);
    const seconds = Math.round(secondsPerMile % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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