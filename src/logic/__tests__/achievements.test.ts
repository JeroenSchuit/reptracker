import {
  calculateTotalReps,
  countCompleteDaysInRange,
  countTotalCompleteDays,
  checkBadgeUnlocks,
  getNewlyUnlockedBadges,
  BADGES,
} from '../achievements';
import { DailyLog, Settings, UnlockedBadge } from '../../models/types';
import { format, subDays } from 'date-fns';

describe('achievements logic', () => {
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

  describe('calculateTotalReps', () => {
    it('returns 0 for empty logs', () => {
      expect(calculateTotalReps([])).toBe(0);
    });

    it('sums all reps across all logs', () => {
      const logs = [
        createLog('2024-01-01', 50, 20, 100),
        createLog('2024-01-02', 50, 20, 100),
      ];
      expect(calculateTotalReps(logs)).toBe(340);
    });

    it('handles zero values', () => {
      const logs = [
        createLog('2024-01-01', 0, 0, 0),
        createLog('2024-01-02', 50, 0, 0),
      ];
      expect(calculateTotalReps(logs)).toBe(50);
    });
  });

  describe('countCompleteDaysInRange', () => {
    it('returns 0 when no logs', () => {
      const settings = createSettings(50, null, null);
      expect(countCompleteDaysInRange([], settings, 7)).toBe(0);
    });

    it('counts only complete days in range', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0), // complete
        createLog(format(subDays(new Date(), 1), 'yyyy-MM-dd'), 25, 0, 0), // incomplete
        createLog(format(subDays(new Date(), 2), 'yyyy-MM-dd'), 50, 0, 0), // complete
      ];
      expect(countCompleteDaysInRange(logs, settings, 7)).toBe(2);
    });

    it('ignores logs outside range', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog(todayKey, 50, 0, 0),
        createLog(format(subDays(new Date(), 10), 'yyyy-MM-dd'), 50, 0, 0), // outside 7-day range
      ];
      expect(countCompleteDaysInRange(logs, settings, 7)).toBe(1);
    });
  });

  describe('countTotalCompleteDays', () => {
    it('returns 0 when no active goals', () => {
      const settings = createSettings(null, null, null);
      const logs = [createLog('2024-01-01', 100, 100, 100)];
      expect(countTotalCompleteDays(logs, settings)).toBe(0);
    });

    it('counts all complete days ever', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog('2024-01-01', 50, 0, 0), // complete
        createLog('2024-01-02', 25, 0, 0), // incomplete
        createLog('2024-01-03', 75, 0, 0), // complete
        createLog('2024-01-04', 50, 0, 0), // complete
      ];
      expect(countTotalCompleteDays(logs, settings)).toBe(3);
    });
  });

  describe('checkBadgeUnlocks', () => {
    it('returns all badges with progress', () => {
      const settings = createSettings(50, null, null);
      const logs: DailyLog[] = [];
      const unlocked: UnlockedBadge[] = [];

      const progress = checkBadgeUnlocks(logs, settings, unlocked);
      expect(progress.length).toBe(BADGES.length);
    });

    it('marks first_complete badge when has complete day', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog(todayKey, 50, 0, 0)];
      const unlocked: UnlockedBadge[] = [];

      const progress = checkBadgeUnlocks(logs, settings, unlocked);
      const firstComplete = progress.find(p => p.badge.id === 'first_complete');

      expect(firstComplete?.isUnlocked).toBe(true);
    });

    it('marks streak badges correctly', () => {
      const settings = createSettings(50, null, null);
      const logs: DailyLog[] = [];

      // Create a 7-day streak
      for (let i = 0; i < 7; i++) {
        logs.push(createLog(format(subDays(new Date(), i), 'yyyy-MM-dd'), 50, 0, 0));
      }

      const progress = checkBadgeUnlocks(logs, settings, []);

      const streak3 = progress.find(p => p.badge.id === 'streak_3');
      const streak7 = progress.find(p => p.badge.id === 'streak_7');
      const streak30 = progress.find(p => p.badge.id === 'streak_30');

      expect(streak3?.isUnlocked).toBe(true);
      expect(streak7?.isUnlocked).toBe(true);
      expect(streak30?.isUnlocked).toBe(false);
    });

    it('marks total_1000 badge when threshold reached', () => {
      const settings = createSettings(50, null, null);
      const logs = [
        createLog('2024-01-01', 400, 300, 400), // 1100 total
      ];

      const progress = checkBadgeUnlocks(logs, settings, []);
      const total1000 = progress.find(p => p.badge.id === 'total_1000');

      expect(total1000?.isUnlocked).toBe(true);
      expect(total1000?.current).toBe(1100);
    });

    it('preserves previously unlocked badges', () => {
      const settings = createSettings(50, null, null);
      const logs: DailyLog[] = [];
      const unlocked: UnlockedBadge[] = [
        { badgeId: 'first_complete', unlockedAt: Date.now() },
      ];

      const progress = checkBadgeUnlocks(logs, settings, unlocked);
      const firstComplete = progress.find(p => p.badge.id === 'first_complete');

      // Should still show as unlocked even though no logs match
      expect(firstComplete?.unlockedAt).toBeDefined();
    });

    it('calculates progress percentage correctly', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog('2024-01-01', 200, 100, 200)]; // 500 total

      const progress = checkBadgeUnlocks(logs, settings, []);
      const total1000 = progress.find(p => p.badge.id === 'total_1000');

      expect(total1000?.progress).toBe(50); // 500/1000 = 50%
    });
  });

  describe('getNewlyUnlockedBadges', () => {
    it('returns empty array when no new badges', () => {
      const settings = createSettings(50, null, null);
      const logs: DailyLog[] = [];
      const previousUnlocks: UnlockedBadge[] = [];

      const newBadges = getNewlyUnlockedBadges(logs, settings, previousUnlocks);
      expect(newBadges).toHaveLength(0);
    });

    it('returns newly unlocked badges', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog(todayKey, 50, 0, 0)];
      const previousUnlocks: UnlockedBadge[] = [];

      const newBadges = getNewlyUnlockedBadges(logs, settings, previousUnlocks);
      const hasFirstComplete = newBadges.some(b => b.id === 'first_complete');

      expect(hasFirstComplete).toBe(true);
    });

    it('excludes already unlocked badges', () => {
      const settings = createSettings(50, null, null);
      const logs = [createLog(todayKey, 50, 0, 0)];
      const previousUnlocks: UnlockedBadge[] = [
        { badgeId: 'first_complete', unlockedAt: Date.now() },
      ];

      const newBadges = getNewlyUnlockedBadges(logs, settings, previousUnlocks);
      const hasFirstComplete = newBadges.some(b => b.id === 'first_complete');

      expect(hasFirstComplete).toBe(false);
    });
  });
});
