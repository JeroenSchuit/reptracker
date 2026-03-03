import { DailyLog, Settings, StreakInfo, GoalConfig } from '../models/types';
import { isDayComplete, getActiveGoals } from './completion';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';

/**
 * Creates a map of dateKey -> DailyLog for quick lookup.
 */
function createLogMap(logs: DailyLog[]): Map<string, DailyLog> {
  const map = new Map<string, DailyLog>();
  for (const log of logs) {
    map.set(log.dateKey, log);
  }
  return map;
}

/**
 * Calculates current streak counting backwards from today.
 * A streak is the number of consecutive days where dayComplete == true.
 *
 * NOTE: Uses CURRENT goals to determine completion status for all days.
 * This is the simpler approach that doesn't require storing goal history.
 * If goals change, historical streak calculations will change accordingly.
 */
export function calculateCurrentStreak(
  logs: DailyLog[],
  settings: Settings | GoalConfig,
  fromDate?: Date
): number {
  const activeGoals = getActiveGoals(settings);
  if (activeGoals.length === 0) {
    return 0;
  }

  const logMap = createLogMap(logs);
  const startDate = fromDate ?? new Date();
  let streak = 0;
  let currentDate = startDate;

  while (true) {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    const log = logMap.get(dateKey) ?? null;
    const isComplete = isDayComplete(log, settings);

    if (isComplete === true) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculates the longest streak from all available logs.
 *
 * NOTE: Uses CURRENT goals to determine completion status.
 */
export function calculateLongestStreak(
  logs: DailyLog[],
  settings: Settings | GoalConfig
): number {
  const activeGoals = getActiveGoals(settings);
  if (activeGoals.length === 0 || logs.length === 0) {
    return 0;
  }

  // Sort logs by date
  const sortedLogs = [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;

  for (const log of sortedLogs) {
    const isComplete = isDayComplete(log, settings);

    if (isComplete !== true) {
      currentStreak = 0;
      previousDate = null;
      continue;
    }

    const logDate = parseISO(log.dateKey);

    if (previousDate === null) {
      currentStreak = 1;
    } else {
      const daysDiff = differenceInDays(logDate, previousDate);
      if (daysDiff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }

    previousDate = logDate;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return longestStreak;
}

/**
 * Gets complete streak information.
 */
export function getStreakInfo(
  logs: DailyLog[],
  settings: Settings | GoalConfig,
  fromDate?: Date
): StreakInfo {
  const activeGoals = getActiveGoals(settings);
  const hasActiveGoals = activeGoals.length > 0;

  if (!hasActiveGoals) {
    return {
      current: 0,
      longest: 0,
      hasActiveGoals: false,
    };
  }

  return {
    current: calculateCurrentStreak(logs, settings, fromDate),
    longest: calculateLongestStreak(logs, settings),
    hasActiveGoals: true,
  };
}
