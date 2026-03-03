import { DailyLog, Settings, ExerciseType, TimeRange, GoalConfig } from '../models/types';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, parseISO } from 'date-fns';
import { isDayComplete } from './completion';

export interface DailyDataPoint {
  dateKey: string;
  label: string;
  pushups: number;
  pullups: number;
  situps: number;
  total: number;
  percentageOfGoal: number | null;
}

export interface WeeklyDataPoint {
  weekStart: string;
  label: string;
  pushups: number;
  pullups: number;
  situps: number;
  total: number;
  avgPercentageOfGoal: number | null;
}

export interface MonthlyDataPoint {
  monthKey: string;
  label: string;
  pushups: number;
  pullups: number;
  situps: number;
  total: number;
  avgPercentageOfGoal: number | null;
}

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
 * Calculates percentage of goal for a single exercise.
 */
function getExercisePercentage(
  log: DailyLog | null,
  exercise: ExerciseType,
  settings: Settings | GoalConfig
): number | null {
  const goalValue = exercise === 'pushups'
    ? ('goal_pushups' in settings ? settings.goal_pushups : settings.pushups)
    : exercise === 'pullups'
      ? ('goal_pullups' in settings ? settings.goal_pullups : settings.pullups)
      : ('goal_situps' in settings ? settings.goal_situps : settings.situps);

  if (goalValue === null || goalValue <= 0) return null;

  const reps = log?.[exercise] ?? 0;
  return Math.min(100, (reps / goalValue) * 100);
}

/**
 * Calculates average percentage across all active goals.
 */
function getOverallPercentage(
  log: DailyLog | null,
  settings: Settings | GoalConfig
): number | null {
  const percentages: number[] = [];

  const pushPct = getExercisePercentage(log, 'pushups', settings);
  const pullPct = getExercisePercentage(log, 'pullups', settings);
  const sitPct = getExercisePercentage(log, 'situps', settings);

  if (pushPct !== null) percentages.push(pushPct);
  if (pullPct !== null) percentages.push(pullPct);
  if (sitPct !== null) percentages.push(sitPct);

  if (percentages.length === 0) return null;

  return percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;
}

/**
 * Gets daily data points for the specified time range.
 */
export function getDailyDataPoints(
  logs: DailyLog[],
  settings: Settings | GoalConfig,
  days: number
): DailyDataPoint[] {
  const logMap = createLogMap(logs);
  const endDate = new Date();
  const startDate = subDays(endDate, days - 1);

  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  return dateRange.map((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const log = logMap.get(dateKey) ?? null;

    return {
      dateKey,
      label: format(date, 'MMM d'),
      pushups: log?.pushups ?? 0,
      pullups: log?.pullups ?? 0,
      situps: log?.situps ?? 0,
      total: (log?.pushups ?? 0) + (log?.pullups ?? 0) + (log?.situps ?? 0),
      percentageOfGoal: getOverallPercentage(log, settings),
    };
  });
}

/**
 * Gets weekly data points (aggregated by week).
 */
export function getWeeklyDataPoints(
  logs: DailyLog[],
  settings: Settings | GoalConfig,
  weeks: number
): WeeklyDataPoint[] {
  const logMap = createLogMap(logs);
  const endDate = new Date();
  const startDate = subDays(endDate, weeks * 7 - 1);

  const weekStarts = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 } // Monday
  );

  return weekStarts.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let pushups = 0;
    let pullups = 0;
    let situps = 0;
    const percentages: number[] = [];

    for (const day of daysInWeek) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const log = logMap.get(dateKey) ?? null;

      pushups += log?.pushups ?? 0;
      pullups += log?.pullups ?? 0;
      situps += log?.situps ?? 0;

      const pct = getOverallPercentage(log, settings);
      if (pct !== null) percentages.push(pct);
    }

    return {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      label: format(weekStart, 'MMM d'),
      pushups,
      pullups,
      situps,
      total: pushups + pullups + situps,
      avgPercentageOfGoal: percentages.length > 0
        ? percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length
        : null,
    };
  });
}

/**
 * Gets monthly data points (aggregated by month).
 */
export function getMonthlyDataPoints(
  logs: DailyLog[],
  settings: Settings | GoalConfig
): MonthlyDataPoint[] {
  if (logs.length === 0) return [];

  const logMap = createLogMap(logs);

  // Find date range from logs
  const sortedLogs = [...logs].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const firstDate = parseISO(sortedLogs[0].dateKey);
  const lastDate = parseISO(sortedLogs[sortedLogs.length - 1].dateKey);

  const monthStarts = eachMonthOfInterval({ start: firstDate, end: lastDate });

  return monthStarts.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let pushups = 0;
    let pullups = 0;
    let situps = 0;
    const percentages: number[] = [];

    for (const day of daysInMonth) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const log = logMap.get(dateKey) ?? null;

      pushups += log?.pushups ?? 0;
      pullups += log?.pullups ?? 0;
      situps += log?.situps ?? 0;

      const pct = getOverallPercentage(log, settings);
      if (pct !== null) percentages.push(pct);
    }

    return {
      monthKey: format(monthStart, 'yyyy-MM'),
      label: format(monthStart, 'MMM yyyy'),
      pushups,
      pullups,
      situps,
      total: pushups + pullups + situps,
      avgPercentageOfGoal: percentages.length > 0
        ? percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length
        : null,
    };
  });
}

/**
 * Gets summary statistics.
 */
export interface SummaryStats {
  totalDays: number;
  completeDays: number;
  totalPushups: number;
  totalPullups: number;
  totalSitups: number;
  avgPushups: number;
  avgPullups: number;
  avgSitups: number;
  completionRate: number | null;
}

export function getSummaryStats(
  logs: DailyLog[],
  settings: Settings | GoalConfig
): SummaryStats {
  const totalDays = logs.length;
  let completeDays = 0;
  let totalPushups = 0;
  let totalPullups = 0;
  let totalSitups = 0;

  for (const log of logs) {
    totalPushups += log.pushups;
    totalPullups += log.pullups;
    totalSitups += log.situps;

    if (isDayComplete(log, settings) === true) {
      completeDays++;
    }
  }

  const pushupGoal = 'goal_pushups' in settings ? settings.goal_pushups : settings.pushups;
  const pullupGoal = 'goal_pullups' in settings ? settings.goal_pullups : settings.pullups;
  const situpGoal = 'goal_situps' in settings ? settings.goal_situps : settings.situps;

  const hasActiveGoals = (pushupGoal !== null && pushupGoal > 0) ||
    (pullupGoal !== null && pullupGoal > 0) ||
    (situpGoal !== null && situpGoal > 0);

  return {
    totalDays,
    completeDays,
    totalPushups,
    totalPullups,
    totalSitups,
    avgPushups: totalDays > 0 ? Math.round(totalPushups / totalDays) : 0,
    avgPullups: totalDays > 0 ? Math.round(totalPullups / totalDays) : 0,
    avgSitups: totalDays > 0 ? Math.round(totalSitups / totalDays) : 0,
    completionRate: hasActiveGoals && totalDays > 0
      ? Math.round((completeDays / totalDays) * 100)
      : null,
  };
}
