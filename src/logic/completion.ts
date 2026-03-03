import { DailyLog, Settings, DayStatus, ExerciseType, GoalConfig, ExerciseProgress } from '../models/types';

/**
 * Extracts active goals from settings.
 * An active goal is one that is not null and greater than 0.
 */
export function getActiveGoals(settings: Settings | GoalConfig): ExerciseType[] {
  const goals: ExerciseType[] = [];

  const pushups = 'goal_pushups' in settings ? settings.goal_pushups : settings.pushups;
  const pullups = 'goal_pullups' in settings ? settings.goal_pullups : settings.pullups;
  const situps = 'goal_situps' in settings ? settings.goal_situps : settings.situps;

  if (pushups !== null && pushups > 0) goals.push('pushups');
  if (pullups !== null && pullups > 0) goals.push('pullups');
  if (situps !== null && situps > 0) goals.push('situps');

  return goals;
}

/**
 * Checks if a day is complete based on active goals.
 * Returns null if there are no active goals.
 */
export function isDayComplete(
  log: DailyLog | null,
  settings: Settings | GoalConfig
): boolean | null {
  const activeGoals = getActiveGoals(settings);

  if (activeGoals.length === 0) {
    return null;
  }

  if (!log) {
    return false;
  }

  const pushupGoal = 'goal_pushups' in settings ? settings.goal_pushups : settings.pushups;
  const pullupGoal = 'goal_pullups' in settings ? settings.goal_pullups : settings.pullups;
  const situpGoal = 'goal_situps' in settings ? settings.goal_situps : settings.situps;

  for (const exercise of activeGoals) {
    switch (exercise) {
      case 'pushups':
        if (pushupGoal !== null && log.pushups < pushupGoal) return false;
        break;
      case 'pullups':
        if (pullupGoal !== null && log.pullups < pullupGoal) return false;
        break;
      case 'situps':
        if (situpGoal !== null && log.situps < situpGoal) return false;
        break;
    }
  }

  return true;
}

/**
 * Calculate progress percentage for a single exercise
 */
function calculateExerciseProgress(current: number, goal: number | null): ExerciseProgress {
  const remaining = goal !== null ? Math.max(0, goal - current) : null;
  const percentage = goal !== null && goal > 0
    ? Math.min(100, Math.round((current / goal) * 100))
    : 0;

  return {
    current,
    goal,
    remaining,
    percentage,
  };
}

/**
 * Calculates the day status including progress for each exercise.
 */
export function getDayStatus(
  log: DailyLog | null,
  settings: Settings | GoalConfig
): DayStatus {
  const activeGoals = getActiveGoals(settings);
  const isComplete = isDayComplete(log, settings);

  const pushupGoal = 'goal_pushups' in settings ? settings.goal_pushups : settings.pushups;
  const pullupGoal = 'goal_pullups' in settings ? settings.goal_pullups : settings.pullups;
  const situpGoal = 'goal_situps' in settings ? settings.goal_situps : settings.situps;

  const pushups = log?.pushups ?? 0;
  const pullups = log?.pullups ?? 0;
  const situps = log?.situps ?? 0;

  return {
    isComplete,
    activeGoals,
    progress: {
      pushups: calculateExerciseProgress(pushups, pushupGoal),
      pullups: calculateExerciseProgress(pullups, pullupGoal),
      situps: calculateExerciseProgress(situps, situpGoal),
    },
  };
}

/**
 * Validates a goal value.
 * Returns null for invalid/off, or clamped value between 1-1000.
 */
export function validateGoal(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (isNaN(value) || value <= 0) return null;
  return Math.min(1000, Math.max(1, Math.floor(value)));
}

/**
 * Validates a rep count value.
 * Returns clamped value between 0-10000.
 */
export function validateReps(value: number): number {
  if (isNaN(value)) return 0;
  return Math.min(10000, Math.max(0, Math.floor(value)));
}

/**
 * Get total progress percentage across all active goals
 */
export function getTotalProgressPercentage(
  log: DailyLog | null,
  settings: Settings | GoalConfig
): number | null {
  const activeGoals = getActiveGoals(settings);
  if (activeGoals.length === 0) return null;

  const status = getDayStatus(log, settings);
  let totalPercentage = 0;

  for (const exercise of activeGoals) {
    totalPercentage += status.progress[exercise].percentage;
  }

  return Math.round(totalPercentage / activeGoals.length);
}
