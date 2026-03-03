import {
  getActiveGoals,
  isDayComplete,
  getDayStatus,
  validateGoal,
  validateReps,
  getTotalProgressPercentage,
} from '../completion';
import { DailyLog, Settings, GoalConfig } from '../../models/types';

describe('completion logic', () => {
  const createLog = (pushups: number, pullups: number, situps: number): DailyLog => ({
    dateKey: '2024-01-01',
    pushups,
    pullups,
    situps,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const createSettings = (pushups: number | null, pullups: number | null, situps: number | null): Settings => ({
    goal_pushups: pushups,
    goal_pullups: pullups,
    goal_situps: situps,
    reminders_enabled: false,
    reminder_time_1: null,
    reminder_time_2: null,
    reminder_only_if_incomplete: true,
    reminder_message: null,
    onboarding_complete: false,
  });

  describe('getActiveGoals', () => {
    it('returns empty array when no goals are set', () => {
      const settings = createSettings(null, null, null);
      expect(getActiveGoals(settings)).toEqual([]);
    });

    it('returns all active goals', () => {
      const settings = createSettings(50, 20, 100);
      expect(getActiveGoals(settings)).toEqual(['pushups', 'pullups', 'situps']);
    });

    it('returns only non-null goals', () => {
      const settings = createSettings(50, null, 100);
      expect(getActiveGoals(settings)).toEqual(['pushups', 'situps']);
    });

    it('excludes goals set to 0', () => {
      const settings = createSettings(50, 0, null);
      expect(getActiveGoals(settings)).toEqual(['pushups']);
    });

    it('works with GoalConfig type', () => {
      const config: GoalConfig = { pushups: 50, pullups: null, situps: 100 };
      expect(getActiveGoals(config)).toEqual(['pushups', 'situps']);
    });
  });

  describe('isDayComplete', () => {
    it('returns null when no active goals', () => {
      const settings = createSettings(null, null, null);
      const log = createLog(100, 100, 100);
      expect(isDayComplete(log, settings)).toBeNull();
    });

    it('returns false when log is null', () => {
      const settings = createSettings(50, 20, 100);
      expect(isDayComplete(null, settings)).toBe(false);
    });

    it('returns true when all goals are met', () => {
      const settings = createSettings(50, 20, 100);
      const log = createLog(50, 20, 100);
      expect(isDayComplete(log, settings)).toBe(true);
    });

    it('returns true when goals are exceeded', () => {
      const settings = createSettings(50, 20, 100);
      const log = createLog(100, 50, 200);
      expect(isDayComplete(log, settings)).toBe(true);
    });

    it('returns false when any goal is not met', () => {
      const settings = createSettings(50, 20, 100);
      const log = createLog(50, 19, 100);
      expect(isDayComplete(log, settings)).toBe(false);
    });

    it('ignores exercises without goals', () => {
      const settings = createSettings(50, null, null);
      const log = createLog(50, 0, 0);
      expect(isDayComplete(log, settings)).toBe(true);
    });
  });

  describe('getDayStatus', () => {
    it('returns correct progress for each exercise', () => {
      const settings = createSettings(100, 50, null);
      const log = createLog(75, 30, 20);
      const status = getDayStatus(log, settings);

      expect(status.progress.pushups).toEqual({
        current: 75,
        goal: 100,
        remaining: 25,
        percentage: 75,
      });

      expect(status.progress.pullups).toEqual({
        current: 30,
        goal: 50,
        remaining: 20,
        percentage: 60,
      });

      expect(status.progress.situps).toEqual({
        current: 20,
        goal: null,
        remaining: null,
        percentage: 0,
      });
    });

    it('caps percentage at 100', () => {
      const settings = createSettings(50, null, null);
      const log = createLog(100, 0, 0);
      const status = getDayStatus(log, settings);

      expect(status.progress.pushups.percentage).toBe(100);
    });

    it('handles null log correctly', () => {
      const settings = createSettings(50, 20, 100);
      const status = getDayStatus(null, settings);

      expect(status.progress.pushups.current).toBe(0);
      expect(status.progress.pushups.remaining).toBe(50);
      expect(status.isComplete).toBe(false);
    });
  });

  describe('validateGoal', () => {
    it('returns null for null input', () => {
      expect(validateGoal(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(validateGoal(undefined)).toBeNull();
    });

    it('returns null for zero or negative values', () => {
      expect(validateGoal(0)).toBeNull();
      expect(validateGoal(-5)).toBeNull();
    });

    it('clamps values to max 1000', () => {
      expect(validateGoal(1500)).toBe(1000);
    });

    it('returns valid values unchanged', () => {
      expect(validateGoal(50)).toBe(50);
      expect(validateGoal(1)).toBe(1);
      expect(validateGoal(1000)).toBe(1000);
    });

    it('floors decimal values', () => {
      expect(validateGoal(50.7)).toBe(50);
    });
  });

  describe('validateReps', () => {
    it('returns 0 for NaN', () => {
      expect(validateReps(NaN)).toBe(0);
    });

    it('clamps negative values to 0', () => {
      expect(validateReps(-5)).toBe(0);
    });

    it('clamps values over 10000', () => {
      expect(validateReps(15000)).toBe(10000);
    });

    it('returns valid values unchanged', () => {
      expect(validateReps(50)).toBe(50);
      expect(validateReps(0)).toBe(0);
      expect(validateReps(10000)).toBe(10000);
    });
  });

  describe('getTotalProgressPercentage', () => {
    it('returns null when no active goals', () => {
      const settings = createSettings(null, null, null);
      const log = createLog(100, 100, 100);
      expect(getTotalProgressPercentage(log, settings)).toBeNull();
    });

    it('calculates average of active goals', () => {
      const settings = createSettings(100, 100, null);
      const log = createLog(50, 75, 0);
      // (50 + 75) / 2 = 62.5 -> 63
      expect(getTotalProgressPercentage(log, settings)).toBe(63);
    });

    it('returns 100 when all goals met', () => {
      const settings = createSettings(50, 20, 100);
      const log = createLog(100, 50, 200);
      expect(getTotalProgressPercentage(log, settings)).toBe(100);
    });
  });
});
