import { DailyLog, Settings, UnlockedBadge, ExportData } from '../models/types';

export interface Repo {
  // Daily logs
  getDay(dateKey: string): Promise<DailyLog | null>;
  upsertDay(day: DailyLog): Promise<void>;
  listDays(fromDateKey: string, toDateKey: string): Promise<DailyLog[]>;
  getAllDays(): Promise<DailyLog[]>;
  deleteDay(dateKey: string): Promise<void>;

  // Settings
  getSettings(): Promise<Settings>;
  saveSettings(updates: Partial<Settings>): Promise<Settings>;

  // Badges
  getUnlockedBadges(): Promise<UnlockedBadge[]>;
  unlockBadges(badgeIds: string[]): Promise<UnlockedBadge[]>;

  // Data management
  exportAll(): Promise<ExportData>;
  importAll(data: ExportData): Promise<{ imported: number; skipped: number }>;
  wipeAll(): Promise<void>;
}
