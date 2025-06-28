import { describe, it, expect } from 'vitest';
import { VDOTCalculator } from '../vdot-calculator.js';

describe('VDOTCalculator', () => {
  describe('calculateVDOTFromRace', () => {
    it('should calculate VDOT from 5K race time', () => {
      // 5K in 20:00 (6:26/mile pace) should be around VDOT 50
      const distance = 3.1; // miles
      const timeSeconds = 20 * 60; // 20 minutes
      
      const vdot = VDOTCalculator.calculateVDOTFromRace(distance, timeSeconds);
      
      expect(vdot).toBeGreaterThan(45);
      expect(vdot).toBeLessThan(55);
    });

    it('should calculate VDOT from marathon time', () => {
      // Marathon in 3:30:00 should be around VDOT 45-50
      const distance = 26.2; // miles
      const timeSeconds = 3.5 * 60 * 60; // 3.5 hours
      
      const vdot = VDOTCalculator.calculateVDOTFromRace(distance, timeSeconds);
      
      expect(vdot).toBeGreaterThan(40);
      expect(vdot).toBeLessThan(55);
    });

    it('should throw error for invalid data', () => {
      expect(() => {
        VDOTCalculator.calculateVDOTFromRace(0, 1000);
      }).toThrow('Invalid race data');

      expect(() => {
        VDOTCalculator.calculateVDOTFromRace(5, 0);
      }).toThrow('Invalid race data');
    });

    it('should clamp VDOT to valid range', () => {
      // Very slow time should still return minimum VDOT
      const vdotSlow = VDOTCalculator.calculateVDOTFromRace(1, 20 * 60); // 20 min mile
      expect(vdotSlow).toBeGreaterThanOrEqual(30);

      // Very fast time should still return reasonable VDOT
      const vdotFast = VDOTCalculator.calculateVDOTFromRace(1, 4 * 60); // 4 min mile
      expect(vdotFast).toBeLessThanOrEqual(80);
    });
  });

  describe('calculateFromRecentRuns', () => {
    it('should return default VDOT for empty runs array', () => {
      const vdot = VDOTCalculator.calculateFromRecentRuns([]);
      expect(vdot).toBe(35);
    });

    it('should calculate VDOT from multiple runs', () => {
      const runs = [
        {
          id: '1',
          userId: 'user1',
          date: new Date('2024-01-01'),
          distance: '5',
          duration: 25 * 60, // 25 minutes
          perceivedEffort: 7,
          mood: 'good' as const,
          notes: null,
          aches: null,
          createdAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          date: new Date('2024-01-03'),
          distance: '3',
          duration: 21 * 60, // 21 minutes (7 min/mile)
          perceivedEffort: 6,
          mood: 'good' as const,
          notes: null,
          aches: null,
          createdAt: new Date()
        }
      ];

      const vdot = VDOTCalculator.calculateFromRecentRuns(runs);
      expect(vdot).toBeGreaterThan(30);
      expect(vdot).toBeLessThan(60);
    });

    it('should handle runs without duration', () => {
      const runs = [
        {
          id: '1',
          userId: 'user1',
          date: new Date(),
          distance: '5',
          duration: null,
          perceivedEffort: 7,
          mood: 'good' as const,
          notes: null,
          aches: null,
          createdAt: new Date()
        }
      ];

      const vdot = VDOTCalculator.calculateFromRecentRuns(runs);
      expect(vdot).toBe(35); // Default when no valid runs
    });
  });

  describe('getPaces', () => {
    it('should return valid pace structure', () => {
      const vdot = 50;
      const paces = VDOTCalculator.getPaces(vdot);

      expect(paces).toHaveProperty('easy');
      expect(paces).toHaveProperty('marathon');
      expect(paces).toHaveProperty('threshold');
      expect(paces).toHaveProperty('interval');
      expect(paces).toHaveProperty('repetition');

      // All paces should be positive numbers
      Object.values(paces).forEach(pace => {
        expect(pace).toBeGreaterThan(0);
        expect(typeof pace).toBe('number');
      });
    });

    it('should have paces in correct order (easy slowest, rep fastest)', () => {
      const vdot = 50;
      const paces = VDOTCalculator.getPaces(vdot);

      expect(paces.easy).toBeGreaterThan(paces.marathon);
      expect(paces.marathon).toBeGreaterThan(paces.threshold);
      expect(paces.threshold).toBeGreaterThan(paces.interval);
      expect(paces.interval).toBeGreaterThan(paces.repetition);
    });

    it('should clamp VDOT to valid range', () => {
      const lowPaces = VDOTCalculator.getPaces(10); // Below minimum
      const highPaces = VDOTCalculator.getPaces(100); // Above maximum

      expect(lowPaces.easy).toBeDefined();
      expect(highPaces.easy).toBeDefined();
    });
  });

  describe('predictRaceTime', () => {
    it('should predict reasonable race times', () => {
      const vdot = 50;
      
      const mile = VDOTCalculator.predictRaceTime(vdot, 1);
      const fiveK = VDOTCalculator.predictRaceTime(vdot, 3.1);
      const tenK = VDOTCalculator.predictRaceTime(vdot, 6.2);
      const marathon = VDOTCalculator.predictRaceTime(vdot, 26.2);

      // Longer distances should take more time
      expect(fiveK).toBeGreaterThan(mile);
      expect(tenK).toBeGreaterThan(fiveK);
      expect(marathon).toBeGreaterThan(tenK);

      // All times should be reasonable (positive)
      [mile, fiveK, tenK, marathon].forEach(time => {
        expect(time).toBeGreaterThan(0);
      });
    });
  });

  describe('getEquivalentTimes', () => {
    it('should return equivalent times for all distances', () => {
      const vdot = 50;
      const times = VDOTCalculator.getEquivalentTimes(vdot);

      expect(times).toHaveProperty('mile');
      expect(times).toHaveProperty('fivek');
      expect(times).toHaveProperty('tenk');
      expect(times).toHaveProperty('halfMarathon');
      expect(times).toHaveProperty('marathon');

      // All times should be positive
      Object.values(times).forEach(time => {
        expect(time).toBeGreaterThan(0);
      });

      // Times should increase with distance
      expect(times.fivek).toBeGreaterThan(times.mile);
      expect(times.tenk).toBeGreaterThan(times.fivek);
      expect(times.halfMarathon).toBeGreaterThan(times.tenk);
      expect(times.marathon).toBeGreaterThan(times.halfMarathon);
    });
  });

  describe('suggestTargetVDOT', () => {
    it('should suggest realistic VDOT improvements', () => {
      const currentVDOT = 45;
      const weeks = 12;

      const beginnerTarget = VDOTCalculator.suggestTargetVDOT(currentVDOT, 'beginner', weeks);
      const intermediateTarget = VDOTCalculator.suggestTargetVDOT(currentVDOT, 'intermediate', weeks);
      const advancedTarget = VDOTCalculator.suggestTargetVDOT(currentVDOT, 'advanced', weeks);

      // All targets should be higher than current
      expect(beginnerTarget).toBeGreaterThan(currentVDOT);
      expect(intermediateTarget).toBeGreaterThan(currentVDOT);
      expect(advancedTarget).toBeGreaterThan(currentVDOT);

      // Beginners should have highest improvement potential
      expect(beginnerTarget).toBeGreaterThanOrEqual(intermediateTarget);
      expect(intermediateTarget).toBeGreaterThanOrEqual(advancedTarget);

      // Should not exceed maximum VDOT
      expect(beginnerTarget).toBeLessThanOrEqual(85);
      expect(intermediateTarget).toBeLessThanOrEqual(85);
      expect(advancedTarget).toBeLessThanOrEqual(85);
    });

    it('should scale with timeframe', () => {
      const currentVDOT = 45;
      
      const shortTerm = VDOTCalculator.suggestTargetVDOT(currentVDOT, 'intermediate', 8);
      const longTerm = VDOTCalculator.suggestTargetVDOT(currentVDOT, 'intermediate', 20);

      expect(longTerm).toBeGreaterThan(shortTerm);
    });
  });
});