// Type definitions for RepTracker

export type ExerciseType = 'pushups' | 'pullups' | 'situps';

export interface DailyLog {
  dateKey: string; // "YYYY-MM-DD"
  pushups: number;
  pullups: number;
  situps: number;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  goal_pushups: number | null;
  goal_pullups: number | null;
  goal_situps: number | null;
  reminders_enabled: boolean;
  reminder_time_1: string | null; // "HH:MM"
  reminder_time_2: string | null;
  reminder_only_if_incomplete: boolean;
  reminder_message: string | null;
  onboarding_complete: boolean;
}

export interface GoalConfig {
  pushups: number | null;
  pullups: number | null;
  situps: number | null;
}

export interface ExerciseProgress {
  current: number;
  goal: number | null;
  remaining: number | null;
  percentage: number; // 0-100, capped at 100
}

export interface DayStatus {
  isComplete: boolean | null; // null if no active goals
  activeGoals: ExerciseType[];
  progress: Record<ExerciseType, ExerciseProgress>;
}

export interface StreakInfo {
  current: number;
  longest: number;
  hasActiveGoals: boolean;
}

export interface HeatmapCell {
  dateKey: string;
  totalReps: number;
  intensity: number; // 0-4 for color intensity
  isComplete: boolean | null;
  data: DailyLog | null;
  exerciseBreakdown: {
    pushups: number;
    pullups: number;
    situps: number;
  };
}

export interface ReminderConfig {
  enabled: boolean;
  time1: string | null;
  time2: string | null;
  onlyIfIncomplete: boolean;
  message: string | null;
}

// Achievement types
export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: number;
}

export interface ExportData {
  version: number;
  exportedAt: number;
  logs: DailyLog[];
  settings: Settings;
  unlockedBadges?: UnlockedBadge[];
}

export type TimeRange = '7D' | '30D' | '12M' | 'ALL';
export type ExerciseFilter = 'all' | ExerciseType;
export type ViewMode = 'reps' | 'percentage';
export type StatsTab = 'overview' | 'charts' | 'heatmap' | 'achievements';

// Calendar types
export interface CalendarDay {
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  status: 'complete' | 'incomplete' | 'no-goals' | 'no-data';
  log: DailyLog | null;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  days: CalendarDay[];
}
