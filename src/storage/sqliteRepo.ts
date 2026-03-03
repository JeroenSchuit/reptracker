import { Repo } from './Repo';
import { DailyLog, UnlockedBadge } from '../models/types';
import { getDatabase } from '../db/database';
import {
  getDailyLog,
  getLogsInRange,
  getAllLogs,
  clearDay,
  getSettings,
  updateSettings,
  getUnlockedBadges as dbGetUnlockedBadges,
  unlockBadge,
  exportData,
  importData,
  deleteAllData,
} from '../services/repository';

async function upsertDayFull(day: DailyLog): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO daily_logs (dateKey, pushups, pullups, situps, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(dateKey) DO UPDATE SET
       pushups = excluded.pushups,
       pullups = excluded.pullups,
       situps = excluded.situps,
       updatedAt = excluded.updatedAt`,
    [day.dateKey, day.pushups, day.pullups, day.situps, day.createdAt, day.updatedAt]
  );
}

export const sqliteRepo: Repo = {
  async getDay(dateKey) {
    return getDailyLog(dateKey);
  },

  async upsertDay(day) {
    await upsertDayFull(day);
  },

  async listDays(fromDateKey, toDateKey) {
    return getLogsInRange(fromDateKey, toDateKey);
  },

  async getAllDays() {
    return getAllLogs();
  },

  async deleteDay(dateKey) {
    await clearDay(dateKey);
  },

  async getSettings() {
    return getSettings();
  },

  async saveSettings(updates) {
    return updateSettings(updates);
  },

  async getUnlockedBadges() {
    return dbGetUnlockedBadges();
  },

  async unlockBadges(badgeIds) {
    const results: UnlockedBadge[] = [];
    for (const id of badgeIds) {
      results.push(await unlockBadge(id));
    }
    return results;
  },

  async exportAll() {
    return exportData();
  },

  async importAll(data) {
    return importData(data);
  },

  async wipeAll() {
    await deleteAllData();
  },
};
