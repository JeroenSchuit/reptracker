import { Repo } from './Repo';
import { DailyLog, Settings, UnlockedBadge, ExportData } from '../models/types';

const DAYS_KEY = 'reptracker.days';
const SETTINGS_KEY = 'reptracker.settings';
const BADGES_KEY = 'reptracker.badges';

const DEFAULT_SETTINGS: Settings = {
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

// In-memory cache – avoids redundant JSON parses per render cycle
let _days: DailyLog[] | null = null;
let _settings: Settings | null = null;
let _badges: UnlockedBadge[] | null = null;

function loadDays(): DailyLog[] {
  if (_days !== null) return _days;
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    _days = raw ? (JSON.parse(raw) as DailyLog[]) : [];
  } catch {
    _days = [];
  }
  return _days;
}

function persistDays(days: DailyLog[]): void {
  _days = days;
  localStorage.setItem(DAYS_KEY, JSON.stringify(days));
}

function loadSettings(): Settings {
  if (_settings !== null) return _settings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    _settings = raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    _settings = { ...DEFAULT_SETTINGS };
  }
  return _settings;
}

function persistSettings(settings: Settings): void {
  _settings = settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadBadges(): UnlockedBadge[] {
  if (_badges !== null) return _badges;
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    _badges = raw ? (JSON.parse(raw) as UnlockedBadge[]) : [];
  } catch {
    _badges = [];
  }
  return _badges;
}

function persistBadges(badges: UnlockedBadge[]): void {
  _badges = badges;
  localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
}

export const webLocalStorageRepo: Repo = {
  async getDay(dateKey) {
    const days = loadDays();
    return days.find((d) => d.dateKey === dateKey) ?? null;
  },

  async upsertDay(day) {
    const days = loadDays();
    const idx = days.findIndex((d) => d.dateKey === day.dateKey);
    if (idx >= 0) {
      days[idx] = day;
    } else {
      days.push(day);
      days.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }
    persistDays(days);
  },

  async listDays(fromDateKey, toDateKey) {
    const days = loadDays();
    return days.filter((d) => d.dateKey >= fromDateKey && d.dateKey <= toDateKey);
  },

  async getAllDays() {
    return loadDays().slice();
  },

  async deleteDay(dateKey) {
    const days = loadDays();
    persistDays(days.filter((d) => d.dateKey !== dateKey));
  },

  async getSettings() {
    return { ...loadSettings() };
  },

  async saveSettings(updates) {
    const current = loadSettings();
    const newSettings: Settings = { ...current, ...updates };
    persistSettings(newSettings);
    return newSettings;
  },

  async getUnlockedBadges() {
    return loadBadges().slice();
  },

  async unlockBadges(badgeIds) {
    const badges = loadBadges();
    const now = Date.now();
    const results: UnlockedBadge[] = [];

    for (const badgeId of badgeIds) {
      const existing = badges.find((b) => b.badgeId === badgeId);
      if (!existing) {
        const newBadge: UnlockedBadge = { badgeId, unlockedAt: now };
        badges.push(newBadge);
        results.push(newBadge);
      } else {
        results.push(existing);
      }
    }

    persistBadges(badges);
    return results;
  },

  async exportAll(): Promise<ExportData> {
    return {
      version: 2,
      exportedAt: Date.now(),
      logs: loadDays().slice(),
      settings: { ...loadSettings() },
      unlockedBadges: loadBadges().slice(),
    };
  },

  async importAll(data) {
    let imported = 0;
    let skipped = 0;

    // Import logs – higher updatedAt wins
    if (data.logs) {
      const days = loadDays();
      for (const log of data.logs) {
        const idx = days.findIndex((d) => d.dateKey === log.dateKey);
        if (idx < 0) {
          days.push(log);
          imported++;
        } else if (log.updatedAt > days[idx].updatedAt) {
          days[idx] = log;
          imported++;
        } else {
          skipped++;
        }
      }
      days.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      persistDays(days);
    }

    // Import settings (merge, don't wipe user's current goals)
    if (data.settings) {
      const current = loadSettings();
      persistSettings({ ...current, ...data.settings });
    }

    // Import badges – insert only if not already present
    if (data.unlockedBadges) {
      const badges = loadBadges();
      for (const badge of data.unlockedBadges) {
        if (!badges.find((b) => b.badgeId === badge.badgeId)) {
          badges.push(badge);
        }
      }
      persistBadges(badges);
    }

    return { imported, skipped };
  },

  async wipeAll() {
    persistDays([]);
    persistSettings({ ...DEFAULT_SETTINGS });
    persistBadges([]);
  },
};
