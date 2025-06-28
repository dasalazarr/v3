import { Run, VDOT_MIN, VDOT_MAX } from '@running-coach/shared';

export interface VDOTPaces {
  easy: number;        // seconds per mile
  marathon: number;    // seconds per mile
  threshold: number;   // seconds per mile
  interval: number;    // seconds per mile
  repetition: number;  // seconds per mile
}

export interface RaceTime {
  distance: number;    // miles
  timeSeconds: number;
}

/**
 * VDOT Calculator based on Jack Daniels' methodology
 * Calculates training paces and VDOT values from race performances
 */
export class VDOTCalculator {
  
  // VDOT lookup table (simplified version - in production use full tables)
  private static readonly VDOT_TABLE = [
    { vdot: 30, mile: 8*60 + 20, fivek: 26*60 + 6, tenk: 54*60 + 15 },
    { vdot: 35, mile: 7*60 + 7, fivek: 22*60 + 14, tenk: 46*60 + 16 },
    { vdot: 40, mile: 6*60 + 12, fivek: 19*60 + 23, tenk: 40*60 + 25 },
    { vdot: 45, mile: 5*60 + 27, fivek: 17*60 + 5, tenk: 35*60 + 40 },
    { vdot: 50, mile: 4*60 + 52, fivek: 15*60 + 18, tenk: 31*60 + 56 },
    { vdot: 55, mile: 4*60 + 23, fivek: 13*60 + 49, tenk: 28*60 + 51 },
    { vdot: 60, mile: 4*60 + 0, fivek: 12*60 + 33, tenk: 26*60 + 13 },
    { vdot: 65, mile: 3*60 + 40, fivek: 11*60 + 26, tenk: 23*60 + 55 },
    { vdot: 70, mile: 3*60 + 24, fivek: 10*60 + 29, tenk: 21*60 + 56 },
    { vdot: 75, mile: 3*60 + 9, fivek: 9*60 + 38, tenk: 20*60 + 10 },
    { vdot: 80, mile: 2*60 + 57, fivek: 8*60 + 52, tenk: 18*60 + 35 },
  ];

  /**
   * Calculate VDOT from a race performance
   */
  public static calculateVDOTFromRace(distance: number, timeSeconds: number): number {
    // Use Jack Daniels formula for VDOT calculation
    // Simplified version - in production use full equations
    
    if (distance <= 0 || timeSeconds <= 0) {
      throw new Error('Invalid race data');
    }

    // Convert to pace per mile
    const pacePerMile = timeSeconds / distance;
    
    // Use lookup table to find closest VDOT
    let closestVDOT = 30;
    let minDifference = Number.MAX_SAFE_INTEGER;
    
    for (const entry of this.VDOT_TABLE) {
      let referencePace: number;
      
      // Choose reference pace based on distance
      if (distance <= 1.2) { // Mile or shorter
        referencePace = entry.mile;
      } else if (distance <= 3.5) { // 5K range
        referencePace = entry.fivek / 3.1; // Convert to per mile
      } else { // 10K and longer
        referencePace = entry.tenk / 6.2; // Convert to per mile
      }
      
      const difference = Math.abs(pacePerMile - referencePace);
      if (difference < minDifference) {
        minDifference = difference;
        closestVDOT = entry.vdot;
      }
    }
    
    return Math.max(VDOT_MIN, Math.min(VDOT_MAX, closestVDOT));
  }

  /**
   * Calculate VDOT from recent run performances
   */
  public static calculateFromRecentRuns(runs: Run[]): number {
    if (runs.length === 0) {
      return 35; // Default beginner VDOT
    }

    // Filter runs with both distance and duration
    const validRuns = runs.filter(run => 
      run.distance > 0 && 
      run.duration && 
      run.duration > 0 &&
      run.distance <= 26.2 // Reasonable max distance
    );

    if (validRuns.length === 0) {
      return 35;
    }

    // Calculate VDOT for each valid run and take weighted average
    const vdots: { vdot: number; weight: number }[] = [];
    
    for (const run of validRuns) {
      try {
        const distance = parseFloat(run.distance.toString());
        const vdot = this.calculateVDOTFromRace(distance, run.duration!);
        
        // Weight by recency and effort quality
        const daysOld = Math.floor(
          (new Date().getTime() - new Date(run.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        const recencyWeight = Math.max(0.1, 1 - (daysOld / 90)); // Decay over 90 days
        const effortWeight = run.perceivedEffort ? (run.perceivedEffort / 10) : 0.8;
        
        vdots.push({
          vdot,
          weight: recencyWeight * effortWeight
        });
      } catch (error) {
        // Skip invalid runs
        continue;
      }
    }

    if (vdots.length === 0) {
      return 35;
    }

    // Calculate weighted average
    const totalWeight = vdots.reduce((sum, v) => sum + v.weight, 0);
    const weightedVDOT = vdots.reduce((sum, v) => sum + (v.vdot * v.weight), 0) / totalWeight;
    
    return Math.round(Math.max(VDOT_MIN, Math.min(VDOT_MAX, weightedVDOT)));
  }

  /**
   * Get training paces for a given VDOT
   */
  public static getPaces(vdot: number): VDOTPaces {
    // Clamp VDOT to valid range
    const clampedVDOT = Math.max(VDOT_MIN, Math.min(VDOT_MAX, vdot));
    
    // Find closest table entry
    let entry = this.VDOT_TABLE.find(e => e.vdot >= clampedVDOT) || this.VDOT_TABLE[this.VDOT_TABLE.length - 1];
    
    // Calculate paces based on VDOT methodology
    const milePace = entry.mile;
    
    return {
      easy: Math.round(milePace * 1.25),        // 25% slower than mile pace
      marathon: Math.round(milePace * 1.12),    // 12% slower than mile pace
      threshold: Math.round(milePace * 1.08),   // 8% slower than mile pace
      interval: Math.round(milePace * 0.98),    // 2% faster than mile pace
      repetition: Math.round(milePace * 0.92),  // 8% faster than mile pace
    };
  }

  /**
   * Predict race time for a given distance and VDOT
   */
  public static predictRaceTime(vdot: number, distance: number): number {
    const paces = this.getPaces(vdot);
    
    // Use different pace predictions based on distance
    if (distance <= 1.5) {
      return Math.round(distance * paces.repetition);
    } else if (distance <= 5) {
      return Math.round(distance * paces.interval);
    } else if (distance <= 15) {
      return Math.round(distance * paces.threshold);
    } else {
      return Math.round(distance * paces.marathon);
    }
  }

  /**
   * Calculate equivalent times across distances
   */
  public static getEquivalentTimes(vdot: number): {
    mile: number;
    fivek: number;
    tenk: number;
    halfMarathon: number;
    marathon: number;
  } {
    return {
      mile: this.predictRaceTime(vdot, 1),
      fivek: this.predictRaceTime(vdot, 3.1),
      tenk: this.predictRaceTime(vdot, 6.2),
      halfMarathon: this.predictRaceTime(vdot, 13.1),
      marathon: this.predictRaceTime(vdot, 26.2),
    };
  }

  /**
   * Suggest target VDOT improvement based on current level and experience
   */
  public static suggestTargetVDOT(
    currentVDOT: number, 
    experienceLevel: 'beginner' | 'intermediate' | 'advanced',
    timeframeWeeks: number = 12
  ): number {
    const maxImprovementRates = {
      beginner: 0.8,      // 0.8 VDOT points per week max
      intermediate: 0.5,  // 0.5 VDOT points per week max
      advanced: 0.3,      // 0.3 VDOT points per week max
    };

    const maxImprovement = maxImprovementRates[experienceLevel] * timeframeWeeks;
    const targetVDOT = currentVDOT + maxImprovement;
    
    return Math.min(VDOT_MAX, Math.round(targetVDOT));
  }
}