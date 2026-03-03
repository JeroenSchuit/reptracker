import { getDatabase } from '../db/database';
import { DailyLog, Settings, ExportData, ExerciseType, UnlockedBadge } from '../models/types';
import { format, subDays } from 'date-fns';

// Daily Logs

export async function getDailyLog(dateKey: string): Promise<DailyLog | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<DailyLog>(
    'SELECT * FROM daily_logs WHERE dateKey = ?',
    [dateKey]
  );
  return result ?? null;
}

export async function getLogsInRange(startDate: string, endDate: string): Promise<DailyLog[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<DailyLog>(
    'SELECT * FROM daily_logs WHERE dateKey >= ? AND dateKey <= ? ORDER BY dateKey ASC',
    [startDate, endDate]
  );
  return results;
}

export async function getAllLogs(): Promise<DailyLog[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<DailyLog>(
    'SELECT * FROM daily_logs ORDER BY dateKey ASC'
  );
  return results;
}

export async function getRecentLogs(days: number): Promise<DailyLog[]> {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
  return getLogsInRange(startDate, endDate);
}

export async function upsertDailyLog(
  dateKey: string,
  updates: Partial<Pick<DailyLog, 'pushups' | 'pullups' | 'situps'>>
): Promise<DailyLog> {
  const db = await getDatabase();
  const now = Date.now();

  const existing = await getDailyLog(dateKey);

  if (existing) {
    const newPushups = updates.pushups ?? existing.pushups;
    const newPullups = updates.pullups ?? existing.pullups;
    const newSitups = updates.situps ?? existing.situps;

    await db.runAsync(
      'UPDATE daily_logs SET pushups = ?, pullups = ?, situps = ?, updatedAt = ? WHERE dateKey = ?',
      [newPushups, newPullups, newSitups, now, dateKey]
    );

    return {
      ...existing,
      pushups: newPushups,
      pullups: newPullups,
      situps: newSitups,
      updatedAt: now,
    };
  } else {
    const newLog: DailyLog = {
      dateKey,
      pushups: updates.pushups ?? 0,
      pullups: updates.pullups ?? 0,
      situps: updates.situps ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      'INSERT INTO daily_logs (dateKey, pushups, pullups, situps, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [newLog.dateKey, newLog.pushups, newLog.pullups, newLog.situps, newLog.createdAt, newLog.updatedAt]
    );

    return newLog;
  }
}

export async function updateExercise(
  dateKey: string,
  exercise: ExerciseType,
  delta: number
): Promise<DailyLog> {
  const existing = await getDailyLog(dateKey);
  const currentValue = existing?.[exercise] ?? 0;
  const newValue = Math.min(10000, Math.max(0, currentValue + delta));

  return upsertDailyLog(dateKey, { [exercise]: newValue });
}

export async function setExerciseValue(
  dateKey: string,
  exercise: ExerciseType,
  value: number
): Promise<DailyLog> {
  const clampedValue = Math.min(10000, Math.max(0, value));
  return upsertDailyLog(dateKey, { [exercise]: clampedValue });
}

export async function clearDay(dateKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM daily_logs WHERE dateKey = ?', [dateKey]);
}

export async function copyFromPreviousDay(dateKey: string, previousDateKey: string): Promise<DailyLog | null> {
  const previousLog = await getDailyLog(previousDateKey);
  if (!previousLog) {
    return null;
  }

  return upsertDailyLog(dateKey, {
    pushups: previousLog.pushups,
    pullups: previousLog.pullups,
    situps: previousLog.situps,
  });
}

// Find and copy from the last completed day
export async function copyFromLastCompletedDay(
  dateKey: string,
  settings: Settings
): Promise<DailyLog | null> {
  const { isDayComplete } = await import('../logic/completion');

  const allLogs = await getAllLogs();

  // Sort by date descending
  const sortedLogs = [...allLogs]
    .filter(log => log.dateKey < dateKey)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  for (const log of sortedLogs) {
    if (isDayComplete(log, settings)) {
      return upsertDailyLog(dateKey, {
        pushups: log.pushups,
        pullups: log.pullups,
        situps: log.situps,
      });
    }
  }

  return null;
}

// Settings

export async function getSettings(): Promise<Settings> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{
    goal_pushups: number | null;
    goal_pullups: number | null;
    goal_situps: number | null;
    reminders_enabled: number;
    reminder_time_1: string | null;
    reminder_time_2: string | null;
    reminder_only_if_incomplete: number;
    reminder_message: string | null;
    onboarding_complete: number;
  }>('SELECT * FROM settings WHERE id = 1');

  if (!result) {
    return {
      goal_pushups: null,
      goal_pullups: null,
      goal_situps: null,
      reminders_enabled: false,
      reminder_time_1: null,
      reminder_time_2: null,
      reminder_only_if_incomplete: true,
      reminder_message: null,
      onboarding_complete: false,
    };
  }

  return {
    goal_pushups: result.goal_pushups,
    goal_pullups: result.goal_pullups,
    goal_situps: result.goal_situps,
    reminders_enabled: result.reminders_enabled === 1,
    reminder_time_1: result.reminder_time_1,
    reminder_time_2: result.reminder_time_2,
    reminder_only_if_incomplete: result.reminder_only_if_incomplete === 1,
    reminder_message: result.reminder_message,
    onboarding_complete: result.onboarding_complete === 1,
  };
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const db = await getDatabase();
  const current = await getSettings();

  const newSettings: Settings = { ...current, ...updates };

  await db.runAsync(
    `UPDATE settings SET
      goal_pushups = ?,
      goal_pullups = ?,
      goal_situps = ?,
      reminders_enabled = ?,
      reminder_time_1 = ?,
      reminder_time_2 = ?,
      reminder_only_if_incomplete = ?,
      reminder_message = ?,
      onboarding_complete = ?
    WHERE id = 1`,
    [
      newSettings.goal_pushups,
      newSettings.goal_pullups,
      newSettings.goal_situps,
      newSettings.reminders_enabled ? 1 : 0,
      newSettings.reminder_time_1,
      newSettings.reminder_time_2,
      newSettings.reminder_only_if_incomplete ? 1 : 0,
      newSettings.reminder_message,
      newSettings.onboarding_complete ? 1 : 0,
    ]
  );

  return newSettings;
}

// Badges

export async function getUnlockedBadges(): Promise<UnlockedBadge[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<UnlockedBadge>(
    'SELECT * FROM unlocked_badges ORDER BY unlockedAt ASC'
  );
  return results;
}

export async function unlockBadge(badgeId: string): Promise<UnlockedBadge> {
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    'INSERT OR IGNORE INTO unlocked_badges (badgeId, unlockedAt) VALUES (?, ?)',
    [badgeId, now]
  );

  return { badgeId, unlockedAt: now };
}

export async function unlockBadges(badgeIds: string[]): Promise<UnlockedBadge[]> {
  const results: UnlockedBadge[] = [];
  for (const badgeId of badgeIds) {
    results.push(await unlockBadge(badgeId));
  }
  return results;
}

// Export/Import

export async function exportData(): Promise<ExportData> {
  const logs = await getAllLogs();
  const settings = await getSettings();
  const unlockedBadges = await getUnlockedBadges();

  return {
    version: 2,
    exportedAt: Date.now(),
    logs,
    settings,
    unlockedBadges,
  };
}

export async function importData(data: ExportData): Promise<{ imported: number; skipped: number }> {
  const db = await getDatabase();
  let imported = 0;
  let skipped = 0;

  // Import logs with merge strategy: higher updatedAt wins
  for (const log of data.logs) {
    const existing = await getDailyLog(log.dateKey);

    if (!existing) {
      await db.runAsync(
        'INSERT INTO daily_logs (dateKey, pushups, pullups, situps, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        [log.dateKey, log.pushups, log.pullups, log.situps, log.createdAt, log.updatedAt]
      );
      imported++;
    } else if (log.updatedAt > existing.updatedAt) {
      await db.runAsync(
        'UPDATE daily_logs SET pushups = ?, pullups = ?, situps = ?, updatedAt = ? WHERE dateKey = ?',
        [log.pushups, log.pullups, log.situps, log.updatedAt, log.dateKey]
      );
      imported++;
    } else {
      skipped++;
    }
  }

  // Import settings if newer
  if (data.settings) {
    await updateSettings({
      goal_pushups: data.settings.goal_pushups,
      goal_pullups: data.settings.goal_pullups,
      goal_situps: data.settings.goal_situps,
      reminders_enabled: data.settings.reminders_enabled,
      reminder_time_1: data.settings.reminder_time_1,
      reminder_time_2: data.settings.reminder_time_2,
      reminder_only_if_incomplete: data.settings.reminder_only_if_incomplete,
      reminder_message: data.settings.reminder_message,
    });
  }

  // Import badges
  if (data.unlockedBadges) {
    for (const badge of data.unlockedBadges) {
      await db.runAsync(
        'INSERT OR IGNORE INTO unlocked_badges (badgeId, unlockedAt) VALUES (?, ?)',
        [badge.badgeId, badge.unlockedAt]
      );
    }
  }

  return { imported, skipped };
}

export async function deleteAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM daily_logs;
    DELETE FROM unlocked_badges;
    UPDATE settings SET
      goal_pushups = NULL,
      goal_pullups = NULL,
      goal_situps = NULL,
      reminders_enabled = 0,
      reminder_time_1 = NULL,
      reminder_time_2 = NULL,
      reminder_only_if_incomplete = 1,
      reminder_message = NULL,
      onboarding_complete = 0;
  `);
}
