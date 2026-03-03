import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Platform } from 'react-native';
import { Settings, DailyLog, StreakInfo, UnlockedBadge } from '../models/types';
import { repo } from '../storage';
import { getStreakInfo } from '../logic/streak';
import { isDayComplete } from '../logic/completion';
import { getNewlyUnlockedBadges, Badge } from '../logic/achievements';
import { scheduleReminders, cancelTodaysRemindersIfComplete } from '../services/notifications';
import { format, subDays, addDays } from 'date-fns';
import { resetDatabaseFiles, initFreshDatabase } from '../db/database';

interface AppContextType {
  // Theme
  isDarkMode: boolean;

  // Settings
  settings: Settings | null;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  // Today's data (current viewing date)
  currentDateKey: string;
  currentLog: DailyLog | null;
  isCurrentDateComplete: boolean | null;
  setCurrentDate: (dateKey: string) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  isToday: boolean;

  // All logs (for stats/heatmap)
  allLogs: DailyLog[];

  // Streak
  streakInfo: StreakInfo;

  // Badges
  unlockedBadges: UnlockedBadge[];
  newlyUnlockedBadge: Badge | null;
  dismissBadgeModal: () => void;

  // Actions
  refreshData: () => Promise<void>;
  incrementExercise: (dateKey: string, exercise: 'pushups' | 'pullups' | 'situps', delta: number) => Promise<void>;
  setExerciseReps: (dateKey: string, exercise: 'pushups' | 'pullups' | 'situps', value: number) => Promise<void>;
  clearDay: (dateKey: string) => Promise<void>;
  copyFromYesterday: (dateKey: string) => Promise<DailyLog | null>;
  copyFromLastCompleted: (dateKey: string) => Promise<DailyLog | null>;
  getLogForDate: (dateKey: string) => Promise<DailyLog | null>;
  exportAllData: () => Promise<string>;
  importAllData: (jsonData: string) => Promise<{ imported: number; skipped: number }>;
  deleteAllData: () => Promise<void>;

  // Loading state
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentDateKey, setCurrentDateKey] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<Badge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitError, setDbInitError] = useState(false);

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');
  const isToday = currentDateKey === todayDateKey;

  const isCurrentDateComplete = settings ? isDayComplete(currentLog, settings) : null;

  const streakInfo = settings
    ? getStreakInfo(allLogs, settings)
    : { current: 0, longest: 0, hasActiveGoals: false };

  // Load log for current date when it changes
  useEffect(() => {
    const loadCurrentLog = async () => {
      const log = await repo.getDay(currentDateKey);
      setCurrentLog(log);
    };
    loadCurrentLog();
  }, [currentDateKey, allLogs]);

  const refreshData = useCallback(async () => {
    try {
      const [loadedSettings, loadedAllLogs, loadedBadges] = await Promise.all([
        repo.getSettings(),
        repo.getAllDays(),
        repo.getUnlockedBadges(),
      ]);

      setSettings(loadedSettings);
      setAllLogs(loadedAllLogs);
      setUnlockedBadges(loadedBadges);

      const currentLogData = await repo.getDay(currentDateKey);
      setCurrentLog(currentLogData);
      setDbInitError(false);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      // SQLite corruption errors only occur on native
      if (Platform.OS !== 'web') {
        const msg = error instanceof Error ? error.message : String(error);
        if (
          msg.includes('non-normal file') ||
          msg.includes('ensureDatabasePathExistsAsync') ||
          msg.includes('SQLite')
        ) {
          setDbInitError(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentDateKey]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Check for new badge unlocks when logs or settings change
  useEffect(() => {
    if (!settings || allLogs.length === 0) return;

    const checkForNewBadges = async () => {
      const newBadges = getNewlyUnlockedBadges(allLogs, settings, unlockedBadges);

      if (newBadges.length > 0) {
        await repo.unlockBadges(newBadges.map(b => b.id));
        const updatedBadges = await repo.getUnlockedBadges();
        setUnlockedBadges(updatedBadges);
        setNewlyUnlockedBadge(newBadges[0]);
      }
    };

    checkForNewBadges();
  }, [allLogs, settings]);

  // Handle reminder scheduling when settings or completion status changes (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (settings && settings.reminders_enabled) {
      scheduleReminders(settings);

      if (settings.reminder_only_if_incomplete && isToday) {
        cancelTodaysRemindersIfComplete(settings, isCurrentDateComplete === true);
      }
    }
  }, [settings, isCurrentDateComplete, isToday]);

  const handleUpdateSettings = useCallback(async (updates: Partial<Settings>) => {
    const newSettings = await repo.saveSettings(updates);
    setSettings(newSettings);

    if (
      Platform.OS !== 'web' &&
      (
        'reminders_enabled' in updates ||
        'reminder_time_1' in updates ||
        'reminder_time_2' in updates ||
        'reminder_message' in updates
      )
    ) {
      await scheduleReminders(newSettings);
    }
  }, []);

  const setCurrentDate = useCallback((dateKey: string) => {
    setCurrentDateKey(dateKey);
  }, []);

  const goToPreviousDay = useCallback(() => {
    const prevDate = subDays(new Date(currentDateKey), 1);
    setCurrentDateKey(format(prevDate, 'yyyy-MM-dd'));
  }, [currentDateKey]);

  const goToNextDay = useCallback(() => {
    const nextDate = addDays(new Date(currentDateKey), 1);
    const nextDateKey = format(nextDate, 'yyyy-MM-dd');
    if (nextDateKey <= todayDateKey) {
      setCurrentDateKey(nextDateKey);
    }
  }, [currentDateKey, todayDateKey]);

  const goToToday = useCallback(() => {
    setCurrentDateKey(todayDateKey);
  }, [todayDateKey]);

  const incrementExercise = useCallback(async (
    dateKey: string,
    exercise: 'pushups' | 'pullups' | 'situps',
    delta: number
  ) => {
    const existing = await repo.getDay(dateKey);
    const currentValue = existing?.[exercise] ?? 0;
    const newValue = Math.min(10000, Math.max(0, currentValue + delta));
    const now = Date.now();
    const updatedLog: DailyLog = {
      dateKey,
      pushups: existing?.pushups ?? 0,
      pullups: existing?.pullups ?? 0,
      situps: existing?.situps ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      [exercise]: newValue,
    };
    await repo.upsertDay(updatedLog);

    if (dateKey === currentDateKey) {
      setCurrentLog(updatedLog);
    }

    const logs = await repo.getAllDays();
    setAllLogs(logs);
  }, [currentDateKey]);

  const setExerciseReps = useCallback(async (
    dateKey: string,
    exercise: 'pushups' | 'pullups' | 'situps',
    value: number
  ) => {
    const clampedValue = Math.min(10000, Math.max(0, value));
    const existing = await repo.getDay(dateKey);
    const now = Date.now();
    const updatedLog: DailyLog = {
      dateKey,
      pushups: existing?.pushups ?? 0,
      pullups: existing?.pullups ?? 0,
      situps: existing?.situps ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      [exercise]: clampedValue,
    };
    await repo.upsertDay(updatedLog);

    if (dateKey === currentDateKey) {
      setCurrentLog(updatedLog);
    }

    const logs = await repo.getAllDays();
    setAllLogs(logs);
  }, [currentDateKey]);

  const handleClearDay = useCallback(async (dateKey: string) => {
    await repo.deleteDay(dateKey);

    if (dateKey === currentDateKey) {
      setCurrentLog(null);
    }

    const logs = await repo.getAllDays();
    setAllLogs(logs);
  }, [currentDateKey]);

  const copyFromYesterday = useCallback(async (dateKey: string): Promise<DailyLog | null> => {
    const previousDateKey = format(subDays(new Date(dateKey), 1), 'yyyy-MM-dd');
    const previousLog = await repo.getDay(previousDateKey);
    if (!previousLog) return null;

    const existing = await repo.getDay(dateKey);
    const now = Date.now();
    const newLog: DailyLog = {
      dateKey,
      pushups: previousLog.pushups,
      pullups: previousLog.pullups,
      situps: previousLog.situps,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await repo.upsertDay(newLog);

    if (dateKey === currentDateKey) {
      setCurrentLog(newLog);
    }

    const logs = await repo.getAllDays();
    setAllLogs(logs);
    return newLog;
  }, [currentDateKey]);

  const copyFromLastCompleted = useCallback(async (dateKey: string): Promise<DailyLog | null> => {
    if (!settings) return null;

    const allLogsData = await repo.getAllDays();
    const sortedLogs = [...allLogsData]
      .filter(log => log.dateKey < dateKey)
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    for (const log of sortedLogs) {
      if (isDayComplete(log, settings)) {
        const existing = await repo.getDay(dateKey);
        const now = Date.now();
        const newLog: DailyLog = {
          dateKey,
          pushups: log.pushups,
          pullups: log.pullups,
          situps: log.situps,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        await repo.upsertDay(newLog);

        if (dateKey === currentDateKey) {
          setCurrentLog(newLog);
        }

        const updatedLogs = await repo.getAllDays();
        setAllLogs(updatedLogs);
        return newLog;
      }
    }

    return null;
  }, [currentDateKey, settings]);

  const getLogForDate = useCallback(async (dateKey: string): Promise<DailyLog | null> => {
    return repo.getDay(dateKey);
  }, []);

  const exportAllData = useCallback(async (): Promise<string> => {
    const data = await repo.exportAll();
    return JSON.stringify(data, null, 2);
  }, []);

  const importAllData = useCallback(async (jsonData: string): Promise<{ imported: number; skipped: number }> => {
    const data = JSON.parse(jsonData);
    const result = await repo.importAll(data);
    await refreshData();
    return result;
  }, [refreshData]);

  const handleDeleteAllData = useCallback(async () => {
    await repo.wipeAll();
    await refreshData();
  }, [refreshData]);

  const dismissBadgeModal = useCallback(() => {
    setNewlyUnlockedBadge(null);
  }, []);

  // Native-only: recover from SQLite corruption
  const handleResetDatabase = useCallback(async () => {
    setIsLoading(true);
    setDbInitError(false);
    try {
      await resetDatabaseFiles();
      await initFreshDatabase();
      await refreshData();
    } catch (error) {
      console.error('Reset failed:', error);
      setDbInitError(true);
      setIsLoading(false);
    }
  }, [refreshData]);

  const value: AppContextType = {
    isDarkMode,
    settings,
    updateSettings: handleUpdateSettings,
    currentDateKey,
    currentLog,
    isCurrentDateComplete,
    setCurrentDate,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    isToday,
    allLogs,
    streakInfo,
    unlockedBadges,
    newlyUnlockedBadge,
    dismissBadgeModal,
    refreshData,
    incrementExercise,
    setExerciseReps,
    clearDay: handleClearDay,
    copyFromYesterday,
    copyFromLastCompleted,
    getLogForDate,
    exportAllData,
    importAllData,
    deleteAllData: handleDeleteAllData,
    isLoading,
  };

  // Show SQLite error recovery UI on native only
  if (dbInitError && Platform.OS !== 'web') {
    return (
      <View style={dbErrorStyles.container}>
        <Text style={dbErrorStyles.title}>Storage Error</Text>
        <Text style={dbErrorStyles.body}>
          The app's local storage is corrupted and could not be opened.{'\n\n'}
          Tapping "Reset local data" will delete all workout logs and settings,
          then restart the database cleanly.{'\n\n'}
          If the error persists, uninstall and reinstall the app.
        </Text>
        <TouchableOpacity style={dbErrorStyles.button} onPress={handleResetDatabase}>
          <Text style={dbErrorStyles.buttonText}>Reset local data</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

const dbErrorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    color: '#555',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
