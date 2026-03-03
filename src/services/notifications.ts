import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Settings } from '../models/types';

// Configure notification behavior – native only
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const REMINDER_1_ID = 'reptracker-reminder-1';
const REMINDER_2_ID = 'reptracker-reminder-2';

/**
 * Request notification permissions.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) {
    console.log('Notifications are only available on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Check if notification permission is granted.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Parse time string (HH:MM) to hours and minutes.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

/**
 * Schedule a daily notification at the specified time.
 */
async function scheduleDailyNotification(
  identifier: string,
  timeStr: string,
  message: string
): Promise<string | null> {
  const time = parseTime(timeStr);
  if (!time) return null;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'RepTracker',
        body: message || 'Time to do your reps!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hours,
        minute: time.minutes,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification.
 */
async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * Cancel all RepTracker notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelNotification(REMINDER_1_ID);
  await cancelNotification(REMINDER_2_ID);
}

/**
 * Schedule reminders based on settings.
 */
export async function scheduleReminders(settings: Settings): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel existing reminders first
  await cancelAllReminders();

  if (!settings.reminders_enabled) {
    return;
  }

  const hasPermission = await hasNotificationPermission();
  if (!hasPermission) {
    return;
  }

  const message = settings.reminder_message || 'Time to do your reps!';

  // Schedule reminder 1
  if (settings.reminder_time_1) {
    await scheduleDailyNotification(REMINDER_1_ID, settings.reminder_time_1, message);
  }

  // Schedule reminder 2
  if (settings.reminder_time_2) {
    await scheduleDailyNotification(REMINDER_2_ID, settings.reminder_time_2, message);
  }
}

/**
 * Cancel today's remaining reminders when day is complete.
 */
export async function cancelTodaysRemindersIfComplete(
  settings: Settings,
  isDayComplete: boolean
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!settings.reminders_enabled) return;
  if (!settings.reminder_only_if_incomplete) return;

  if (isDayComplete) {
    await cancelAllReminders();

    setTimeout(async () => {
      await scheduleReminders(settings);
    }, 100);
  }
}

/**
 * Get all scheduled notifications (for debugging).
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (Platform.OS === 'web') return [];
  return Notifications.getAllScheduledNotificationsAsync();
}
