import { DailyLog, Settings, HeatmapCell, GoalConfig } from '../models/types';
import { format, subMonths, eachDayOfInterval, startOfWeek } from 'date-fns';
import { isDayComplete } from './completion';

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
 * Calculates intensity level (0-4) based on total reps.
 * Uses smooth scaling for better visual distribution.
 */
export function calculateIntensity(
  totalReps: number,
  maxReps: number,
  hasActiveGoals: boolean,
  isComplete: boolean | null
): number {
  if (totalReps === 0) return 0;

  // If we have active goals, use completion status for max intensity
  if (hasActiveGoals && isComplete === true) {
    return 4;
  }

  // Otherwise use reps-based intensity with smooth scaling
  if (maxReps === 0) return 1;

  const ratio = totalReps / maxReps;

  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.7) return 3;
  return 4;
}

/**
 * Generates heatmap data for the last 12 months.
 * Returns a 2D array of weeks x days (7 days per week).
 */
export function generateHeatmapData(
  logs: DailyLog[],
  settings: Settings | GoalConfig
): HeatmapCell[][] {
  const logMap = createLogMap(logs);

  // Calculate date range: last 12 months ending today
  const endDate = new Date();
  const startDate = subMonths(endDate, 12);

  // Adjust start to beginning of week (Sunday)
  const adjustedStart = startOfWeek(startDate, { weekStartsOn: 0 });

  // Get all days in range
  const allDays = eachDayOfInterval({ start: adjustedStart, end: endDate });

  // Find max reps for intensity calculation
  let maxTotalReps = 0;
  for (const log of logs) {
    const total = log.pushups + log.pullups + log.situps;
    if (total > maxTotalReps) maxTotalReps = total;
  }

  // Check if we have active goals
  const pushupGoal = 'goal_pushups' in settings ? settings.goal_pushups : settings.pushups;
  const pullupGoal = 'goal_pullups' in settings ? settings.goal_pullups : settings.pullups;
  const situpGoal = 'goal_situps' in settings ? settings.goal_situps : settings.situps;

  const hasActiveGoals = (pushupGoal !== null && pushupGoal > 0) ||
    (pullupGoal !== null && pullupGoal > 0) ||
    (situpGoal !== null && situpGoal > 0);

  // Group days into weeks (each week is an array of 7 days)
  const weeks: HeatmapCell[][] = [];
  let currentWeek: HeatmapCell[] = [];

  for (const day of allDays) {
    const dateKey = format(day, 'yyyy-MM-dd');
    const log = logMap.get(dateKey) ?? null;
    const totalReps = log ? log.pushups + log.pullups + log.situps : 0;
    const isComplete = isDayComplete(log, settings);

    const cell: HeatmapCell = {
      dateKey,
      totalReps,
      intensity: calculateIntensity(totalReps, maxTotalReps, hasActiveGoals, isComplete),
      isComplete,
      data: log,
      exerciseBreakdown: {
        pushups: log?.pushups ?? 0,
        pullups: log?.pullups ?? 0,
        situps: log?.situps ?? 0,
      },
    };

    currentWeek.push(cell);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Gets month labels for the heatmap header.
 */
export function getHeatmapMonthLabels(weeks: HeatmapCell[][]): { month: string; weekIndex: number }[] {
  const labels: { month: string; weekIndex: number }[] = [];
  let lastMonth = '';

  for (let i = 0; i < weeks.length; i++) {
    const firstDay = weeks[i][0];
    const month = format(new Date(firstDay.dateKey), 'MMM');

    if (month !== lastMonth) {
      labels.push({ month, weekIndex: i });
      lastMonth = month;
    }
  }

  return labels;
}

/**
 * Gets day labels for the heatmap (Mon, Wed, Fri).
 */
export function getHeatmapDayLabels(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}
