import {
  calculateCurrentStreak,
  calculateLongestStreak,
  getStreakInfo,
} from '../streak';
import { DailyLog, Settings } from '../../models/types';
import { format, subDays, addDays } from 'date-fns';

describe('streak logic', () => {
  const createLog = (dateKey: string, pushups: number, pullups: number, situps: number): DailyLog => ({
    dateKey,
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

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const yesterdayKey = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoDaysAgoKey = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const threeDaysAgoKey = format(subDays(new Date(), 3), 'yyyy-MM-dd');
  const fourDaysAgoKey = format(subDays(new Date(), 4), 'yyyy-MM-dd');

  describe('calculateCurrentStreak', () => {
    it('returns 0 when no active goals', () => {
      const settings = createSettings(null, null, null);
      const logs = [createLog(todayKey, 100, 100, 100)];
      expect(calculateCurrentStreak(logs, settings)).toBe(0);
    });

    it('returns 0 when no logs exist', () => {
      const settings = createSettings(50, null, null);
      expect(calculateCurrentStreak([], settings)).toBe(0);
    });

    it('returns 0 when today is incomplete', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog(todayKey, 25, 0, 0)];
      expect(calculateCurrentStreak(logs, settings)).toBe(0);
    });

    it('returns 1 when only today is complete', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog(todayKey, 50, 0, 0)];
      expect(calculateCurrentStreak(logs, settings)).toBe(1);
    });

    it('counts consecutive complete days', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0),
        createLog(yesterdayKey, 50, 0, 0),
        createLog(twoDaysAgoKey, 50, 0, 0),
      ];
      expect(calculateCurrentStreak(logs, settings)).toBe(3);
    });

    it('stops at incomplete day', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0),
        createLog(yesterdayKey, 50, 0, 0),
        createLog(twoDaysAgoKey, 25, 0, 0), // incomplete
        createLog(threeDaysAgoKey, 50, 0, 0),
      ];
      expect(calculateCurrentStreak(logs, settings)).toBe(2);
    });

    it('stops at missing day', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0),
        createLog(yesterdayKey, 50, 0, 0),
        // twoDaysAgoKey missing
        createLog(threeDaysAgoKey, 50, 0, 0),
      ];
      expect(calculateCurrentStreak(logs, settings)).toBe(2);
    });

    it('works with custom fromDate', () => {
      const settings = createSettings(50, null, null);
      const customDate = subDays(new Date(), 5);
      const customDateKey = format(customDate, 'yyyy-MM-dd');
      const prevDateKey = format(subDays(customDate, 1), 'yyyy-MM-dd');

      const logs = [
        createLog(customDateKey, 50, 0, 0),
        createLog(prevDateKey, 50, 0, 0),
      ];
      expect(calculateCurrentStreak(logs, settings, customDate)).toBe(2);
    });
  });

  describe('calculateLongestStreak', () => {
    it('returns 0 when no active goals', () => {
      const settings = createSettings(null, null, null);
      const logs = [createLog(todayKey, 100, 100, 100)];
      expect(calculateLongestStreak(logs, settings)).toBe(0);
    });

    it('returns 0 when no logs', () => {
      const settings = createSettings(50, null, null);
      expect(calculateLongestStreak([], settings)).toBe(0);
    });

    it('finds longest consecutive streak', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0),
        createLog(yesterdayKey, 50, 0, 0),
        createLog(twoDaysAgoKey, 25, 0, 0), // breaks streak
        createLog(threeDaysAgoKey, 50, 0, 0),
        createLog(fourDaysAgoKey, 50, 0, 0),
        createLog(format(subDays(new Date(), 5), 'yyyy-MM-dd'), 50, 0, 0),
      ];
      expect(calculateLongestStreak(logs, settings)).toBe(3);
    });

    it('handles single complete day', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog(todayKey, 50, 0, 0)];
      expect(calculateLongestStreak(logs, settings)).toBe(1);
    });

    it('handles all incomplete days', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 25, 0, 0),
        createLog(yesterdayKey, 25, 0, 0),
      ];
      expect(calculateLongestStreak(logs, settings)).toBe(0);
    });
  });

  describe('getStreakInfo', () => {
    it('returns hasActiveGoals false when no goals', () => {
      const settings = createSettings(null, null, null);
      const info = getStreakInfo([], settings);
      expect(info.hasActiveGoals).toBe(false);
      expect(info.current).toBe(0);
      expect(info.longest).toBe(0);
    });

    it('returns complete streak info', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0),
        createLog(yesterdayKey, 50, 0, 0),
        createLog(twoDaysAgoKey, 50, 0, 0),
      ];

      const info = getStreakInfo(logs, settings);
      expect(info.hasActiveGoals).toBe(true);
      expect(info.current).toBe(3);
      expect(info.longest).toBe(3);
    });
  });
});
