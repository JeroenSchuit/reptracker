// Achievements/Badges System
import { DailyLog, Settings } from '../models/types';
import { isDayComplete, getActiveGoals } from './completion';
import { calculateCurrentStreak, calculateLongestStreak } from './streak';
import { format, subDays, startOfWeek, endOfWeek, parseISO, isWithinInterval, differenceInDays } from 'date-fns';

export type BadgeCategory = 'streak' | 'total' | 'consistency';

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  requirement: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: number; // timestamp
}

export interface BadgeProgress {
  badge: Badge;
  current: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  progress: number; // 0-100
}

// Badge definitions
export const BADGES: Badge[] = [
  // Streak badges
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Complete a 3-day streak',
    category: 'streak',
    icon: 'fire',
    requirement: 3,
    tier: 'bronze',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Complete a 7-day streak',
    category: 'streak',
    icon: 'fire',
    requirement: 7,
    tier: 'silver',
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Complete a 30-day streak',
    category: 'streak',
    icon: 'fire',
    requirement: 30,
    tier: 'gold',
  },
  {
    id: 'streak_100',
    name: 'Centurion',
    description: 'Complete a 100-day streak',
    category: 'streak',
    icon: 'crown',
    requirement: 100,
    tier: 'platinum',
  },

  // Total reps badges
  {
    id: 'total_1000',
    name: 'First Thousand',
    description: 'Complete 1,000 total reps',
    category: 'total',
    icon: 'dumbbell',
    requirement: 1000,
    tier: 'bronze',
  },
  {
    id: 'total_10000',
    name: 'Ten Thousand Club',
    description: 'Complete 10,000 total reps',
    category: 'total',
    icon: 'dumbbell',
    requirement: 10000,
    tier: 'silver',
  },
  {
    id: 'total_50000',
    name: 'Iron Will',
    description: 'Complete 50,000 total reps',
    category: 'total',
    icon: 'trophy',
    requirement: 50000,
    tier: 'gold',
  },
  {
    id: 'total_100000',
    name: 'Legend',
    description: 'Complete 100,000 total reps',
    category: 'total',
    icon: 'star-circle',
    requirement: 100000,
    tier: 'platinum',
  },

  // Consistency badges
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all 7 days in a week',
    category: 'consistency',
    icon: 'calendar-check',
    requirement: 7,
    tier: 'silver',
  },
  {
    id: 'consistency_20_30',
    name: 'Dedicated',
    description: 'Complete 20 out of 30 days',
    category: 'consistency',
    icon: 'calendar-star',
    requirement: 20,
    tier: 'gold',
  },
  {
    id: 'first_complete',
    name: 'First Victory',
    description: 'Complete your first day',
    category: 'consistency',
    icon: 'medal',
    requirement: 1,
    tier: 'bronze',
  },
];

// Calculate total lifetime reps
export function calculateTotalReps(logs: DailyLog[]): number {
  return logs.reduce((sum, log) => {
    return sum + (log.pushups || 0) + (log.pullups || 0) + (log.situps || 0);
  }, 0);
}

// Count complete days in last N days
export function countCompleteDaysInRange(
  logs: DailyLog[],
  settings: Settings,
  days: number,
  fromDate?: Date
): number {
  const endDate = fromDate ?? new Date();
  const startDate = subDays(endDate, days - 1);

  const logMap = new Map<string, DailyLog>();
  logs.forEach(log => logMap.set(log.dateKey, log));

  let completeDays = 0;
  let currentDate = endDate;

  for (let i = 0; i < days; i++) {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const log = logMap.get(dateKey) ?? null;
    if (isDayComplete(log, settings) === true) {
      completeDays++;
    }
    currentDate = subDays(currentDate, 1);
  }

  return completeDays;
}

// Check if any week has been perfect
export function hasPerfectWeek(logs: DailyLog[], settings: Settings): boolean {
  if (logs.length === 0) return false;

  const activeGoals = getActiveGoals(settings);
  if (activeGoals.length === 0) return false;

  const logMap = new Map<string, DailyLog>();
  logs.forEach(log => logMap.set(log.dateKey, log));

  // Check each week that has logs
  const sortedLogs = [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const firstDate = parseISO(sortedLogs[0].dateKey);
  const lastDate = parseISO(sortedLogs[sortedLogs.length - 1].dateKey);

  let weekStart = startOfWeek(firstDate, { weekStartsOn: 0 });

  while (weekStart <= lastDate) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    let completeDays = 0;

    for (let i = 0; i < 7; i++) {
      const checkDate = subDays(weekEnd, 6 - i);
      const dateKey = format(checkDate, 'yyyy-MM-dd');
      const log = logMap.get(dateKey) ?? null;
      if (isDayComplete(log, settings) === true) {
        completeDays++;
      }
    }

    if (completeDays === 7) return true;
    weekStart = subDays(weekStart, -7);
  }

  return false;
}

// Count total complete days ever
export function countTotalCompleteDays(logs: DailyLog[], settings: Settings): number {
  const activeGoals = getActiveGoals(settings);
  if (activeGoals.length === 0) return 0;

  return logs.filter(log => isDayComplete(log, settings) === true).length;
}

// Check which badges should be unlocked
export function checkBadgeUnlocks(
  logs: DailyLog[],
  settings: Settings,
  currentUnlocks: UnlockedBadge[]
): BadgeProgress[] {
  const unlockedMap = new Map<string, number>();
  currentUnlocks.forEach(u => unlockedMap.set(u.badgeId, u.unlockedAt));

  const totalReps = calculateTotalReps(logs);
  const longestStreak = calculateLongestStreak(logs, settings);
  const perfectWeekAchieved = hasPerfectWeek(logs, settings);
  const completeDaysLast30 = countCompleteDaysInRange(logs, settings, 30);
  const totalCompleteDays = countTotalCompleteDays(logs, settings);

  const progressList: BadgeProgress[] = [];

  for (const badge of BADGES) {
    let current = 0;
    let isUnlocked = unlockedMap.has(badge.id);

    switch (badge.id) {
      // Streak badges
      case 'streak_3':
      case 'streak_7':
      case 'streak_30':
      case 'streak_100':
        current = longestStreak;
        if (!isUnlocked && current >= badge.requirement) {
          isUnlocked = true;
        }
        break;

      // Total reps badges
      case 'total_1000':
      case 'total_10000':
      case 'total_50000':
      case 'total_100000':
        current = totalReps;
        if (!isUnlocked && current >= badge.requirement) {
          isUnlocked = true;
        }
        break;

      // Consistency badges
      case 'perfect_week':
        current = perfectWeekAchieved ? 7 : 0;
        if (!isUnlocked && perfectWeekAchieved) {
          isUnlocked = true;
        }
        break;

      case 'consistency_20_30':
        current = completeDaysLast30;
        if (!isUnlocked && current >= badge.requirement) {
          isUnlocked = true;
        }
        break;

      case 'first_complete':
        current = totalCompleteDays;
        if (!isUnlocked && current >= 1) {
          isUnlocked = true;
        }
        break;
    }

    const progress = Math.min(100, Math.round((current / badge.requirement) * 100));

    progressList.push({
      badge,
      current,
      isUnlocked,
      unlockedAt: unlockedMap.get(badge.id),
      progress,
    });
  }

  return progressList;
}

// Get newly unlocked badges (for celebration modal)
export function getNewlyUnlockedBadges(
  logs: DailyLog[],
  settings: Settings,
  previousUnlocks: UnlockedBadge[]
): Badge[] {
  const previousIds = new Set(previousUnlocks.map(u => u.badgeId));
  const currentProgress = checkBadgeUnlocks(logs, settings, previousUnlocks);

  return currentProgress
    .filter(p => p.isUnlocked && !previousIds.has(p.badge.id))
    .map(p => p.badge);
}

// Get badge tier color
export function getBadgeTierColor(tier: Badge['tier'], isDark: boolean): string {
  switch (tier) {
    case 'bronze':
      return isDark ? '#CD7F32' : '#B87333';
    case 'silver':
      return isDark ? '#C0C0C0' : '#A8A8A8';
    case 'gold':
      return isDark ? '#FFD700' : '#DAA520';
    case 'platinum':
      return isDark ? '#E5E4E2' : '#B4B4B4';
    default:
      return '#888888';
  }
}

// Get badges by category
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return BADGES.filter(b => b.category === category);
}

// Summary stats for achievements overview
export interface AchievementsSummary {
  totalBadges: number;
  unlockedBadges: number;
  totalReps: number;
  longestStreak: number;
  currentStreak: number;
  perfectWeeks: number;
  completionRateLast7: number;
  completionRateLast30: number;
  mostProductiveDay: { date: string; reps: number } | null;
}

export function getAchievementsSummary(
  logs: DailyLog[],
  settings: Settings,
  unlockedBadges: UnlockedBadge[]
): AchievementsSummary {
  const totalReps = calculateTotalReps(logs);
  const longestStreak = calculateLongestStreak(logs, settings);
  const currentStreak = calculateCurrentStreak(logs, settings);

  const completeDaysLast7 = countCompleteDaysInRange(logs, settings, 7);
  const completeDaysLast30 = countCompleteDaysInRange(logs, settings, 30);

  // Find most productive day
  let mostProductiveDay: { date: string; reps: number } | null = null;
  for (const log of logs) {
    const dayReps = (log.pushups || 0) + (log.pullups || 0) + (log.situps || 0);
    if (!mostProductiveDay || dayReps > mostProductiveDay.reps) {
      mostProductiveDay = { date: log.dateKey, reps: dayReps };
    }
  }

  // Count perfect weeks
  let perfectWeeks = 0;
  if (logs.length > 0) {
    const sortedLogs = [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const logMap = new Map<string, DailyLog>();
    logs.forEach(log => logMap.set(log.dateKey, log));

    const firstDate = parseISO(sortedLogs[0].dateKey);
    const lastDate = parseISO(sortedLogs[sortedLogs.length - 1].dateKey);
    let weekStart = startOfWeek(firstDate, { weekStartsOn: 0 });

    while (weekStart <= lastDate) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      let completeDays = 0;

      for (let i = 0; i < 7; i++) {
        const checkDate = subDays(weekEnd, 6 - i);
        const dateKey = format(checkDate, 'yyyy-MM-dd');
        const log = logMap.get(dateKey) ?? null;
        if (isDayComplete(log, settings) === true) {
          completeDays++;
        }
      }

      if (completeDays === 7) perfectWeeks++;
      weekStart = subDays(weekStart, -7);
    }
  }

  return {
    totalBadges: BADGES.length,
    unlockedBadges: unlockedBadges.length,
    totalReps,
    longestStreak,
    currentStreak,
    perfectWeeks,
    completionRateLast7: Math.round((completeDaysLast7 / 7) * 100),
    completionRateLast30: Math.round((completeDaysLast30 / 30) * 100),
    mostProductiveDay,
  };
}
