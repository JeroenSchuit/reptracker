// Dynamic exercise configuration - add new exercises here
import { ImageSourcePropType } from 'react-native';

export interface ExerciseConfig {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  goalKey: string;
  dbColumn: string;
}

// Core exercise definitions - easily extendable
export const EXERCISES: ExerciseConfig[] = [
  {
    id: 'pushups',
    label: 'Push-ups',
    shortLabel: 'Push',
    icon: 'arm-flex',
    color: '#6366F1', // Indigo
    goalKey: 'goal_pushups',
    dbColumn: 'pushups',
  },
  {
    id: 'pullups',
    label: 'Pull-ups',
    shortLabel: 'Pull',
    icon: 'human-handsup',
    color: '#8B5CF6', // Violet
    goalKey: 'goal_pullups',
    dbColumn: 'pullups',
  },
  {
    id: 'situps',
    label: 'Sit-ups',
    shortLabel: 'Sit',
    icon: 'human',
    color: '#EC4899', // Pink
    goalKey: 'goal_situps',
    dbColumn: 'situps',
  },
];

// Helper functions
export function getExerciseById(id: string): ExerciseConfig | undefined {
  return EXERCISES.find(e => e.id === id);
}

export function getExerciseIds(): string[] {
  return EXERCISES.map(e => e.id);
}

export function getExerciseCount(): number {
  return EXERCISES.length;
}

// Quick preset chips for data entry
export const QUICK_PRESETS = [1, 5, 10, 20, 25];

// Max values
export const MAX_REPS = 10000;
export const MAX_GOAL = 1000;
export const MIN_GOAL = 1;
