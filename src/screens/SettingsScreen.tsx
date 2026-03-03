import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  Switch,
  TextInput,
  useTheme,
  Portal,
  Dialog,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useApp } from '../context/AppContext';
import { GoalInput } from '../components/GoalInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestNotificationPermission, hasNotificationPermission } from '../services/notifications';

export function SettingsScreen() {
  const theme = useTheme();
  const {
    settings,
    updateSettings,
    exportAllData,
    importAllData,
    deleteAllData,
    isLoading,
    allLogs,
  } = useApp();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  if (isLoading || !settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const handleGoalChange = (exercise: 'pushups' | 'pullups' | 'situps') => (value: number | null) => {
    const key = `goal_${exercise}` as keyof typeof settings;
    updateSettings({ [key]: value });
  };

  const handleRemindersToggle = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await hasNotificationPermission();
      if (!hasPermission) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to use reminders.'
          );
          return;
        }
      }
    }
    updateSettings({ reminders_enabled: enabled });
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const jsonData = await exportAllData();
      const fileName = `reptracker-backup-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Browser download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Native: write to cache then share
        const { Paths, File } = await import('expo-file-system');
        const Sharing = await import('expo-sharing');
        const file = new File(Paths.cache, fileName);
        await file.write(jsonData);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export RepTracker Data',
          });
        } else {
          Alert.alert('Export Complete', 'Data exported successfully.');
        }
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (Platform.OS === 'web') {
      // Use a hidden file input – isImporting is set to true only after
      // the user actually picks a file so the button doesn't freeze on cancel.
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.cssText = 'position:absolute;top:-200px;left:-200px;opacity:0';
      document.body.appendChild(input);

      input.addEventListener(
        'change',
        async () => {
          document.body.removeChild(input);
          const file = input.files?.[0];
          if (!file) return;

          setIsImporting(true);
          try {
            const text = await file.text();
            const result = await importAllData(text);
            setImportResult(result);
            setShowImportDialog(true);
          } catch (err) {
            Alert.alert('Import Failed', 'Failed to import data. Please check the file format.');
            console.error('Import error:', err);
          } finally {
            setIsImporting(false);
          }
        },
        { once: true }
      );

      input.click();
      return;
    }

    // Native path
    setIsImporting(true);
    try {
      const DocumentPicker = await import('expo-document-picker');
      const { File } = await import('expo-file-system');

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const importFile = new File(fileUri);
      const jsonData = await importFile.text();

      const importResult = await importAllData(jsonData);
      setImportResult(importResult);
      setShowImportDialog(true);
    } catch (error) {
      Alert.alert('Import Failed', 'Failed to import data. Please check the file format.');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteAll = async () => {
    await deleteAllData();
    setShowDeleteDialog(false);
    Alert.alert('Data Deleted', 'All data has been deleted.');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Settings
          </Text>
        </View>

        {/* Goals Section */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Daily Goals
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Set your daily rep targets. Toggle off to disable a goal.
            </Text>

            <GoalInput
              exercise="pushups"
              label="Push-ups"
              value={settings.goal_pushups}
              onChange={handleGoalChange('pushups')}
            />
            <Divider style={styles.divider} />
            <GoalInput
              exercise="pullups"
              label="Pull-ups"
              value={settings.goal_pullups}
              onChange={handleGoalChange('pullups')}
            />
            <Divider style={styles.divider} />
            <GoalInput
              exercise="situps"
              label="Sit-ups"
              value={settings.goal_situps}
              onChange={handleGoalChange('situps')}
            />
          </Card.Content>
        </Card>

        {/* Reminders Section – native only (notifications don't work on web) */}
        {Platform.OS !== 'web' && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Reminders
              </Text>

              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text variant="bodyLarge">Enable Reminders</Text>
                </View>
                <Switch
                  value={settings.reminders_enabled}
                  onValueChange={handleRemindersToggle}
                  color={theme.colors.primary}
                />
              </View>

              {settings.reminders_enabled && (
                <>
                  <Divider style={styles.divider} />

                  <View style={styles.timeInputContainer}>
                    <Text variant="bodyMedium">Reminder Time 1</Text>
                    <TextInput
                      mode="outlined"
                      value={settings.reminder_time_1 ?? ''}
                      onChangeText={(text) => updateSettings({ reminder_time_1: text || null })}
                      placeholder="HH:MM"
                      style={styles.timeInput}
                      dense
                    />
                  </View>

                  <View style={styles.timeInputContainer}>
                    <Text variant="bodyMedium">Reminder Time 2 (optional)</Text>
                    <TextInput
                      mode="outlined"
                      value={settings.reminder_time_2 ?? ''}
                      onChangeText={(text) => updateSettings({ reminder_time_2: text || null })}
                      placeholder="HH:MM"
                      style={styles.timeInput}
                      dense
                    />
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingLabel}>
                      <Text variant="bodyMedium">Only notify if incomplete</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Skip notification if you've completed today's goals
                      </Text>
                    </View>
                    <Switch
                      value={settings.reminder_only_if_incomplete}
                      onValueChange={(value) => updateSettings({ reminder_only_if_incomplete: value })}
                      color={theme.colors.primary}
                    />
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.messageInputContainer}>
                    <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                      Custom Message
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={settings.reminder_message ?? ''}
                      onChangeText={(text) => updateSettings({ reminder_message: text || null })}
                      placeholder="Time to do your reps!"
                      multiline
                      numberOfLines={2}
                      style={styles.messageInput}
                    />
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Data Section */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Data
            </Text>

            <Button
              mode="outlined"
              onPress={handleExport}
              icon="export"
              style={styles.dataButton}
              loading={isExporting}
              disabled={isExporting || isImporting}
            >
              Export Data (JSON)
            </Button>

            <Button
              mode="outlined"
              onPress={handleImport}
              icon="import"
              style={styles.dataButton}
              loading={isImporting}
              disabled={isExporting || isImporting}
            >
              Import Data (JSON)
            </Button>

            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Import will merge data. Conflicts resolved by most recent update.
            </Text>

            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() => setShowDeleteDialog(true)}
              icon="delete"
              style={styles.dataButton}
              textColor={theme.colors.error}
            >
              Delete All Data
            </Button>
          </Card.Content>
        </Card>

        {/* About Section */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About
            </Text>

            <Text variant="bodyMedium" style={styles.aboutText}>
              RepTracker v1.0.0
            </Text>

            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Track your daily Push-ups, Pull-ups, and Sit-ups.
            </Text>

            <Divider style={styles.divider} />

            <Text variant="titleSmall" style={{ marginBottom: 8 }}>
              Privacy Policy
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              RepTracker stores all data locally on your device. No data is collected, transmitted, or shared with
              third parties. Your workout data stays private on your device.
            </Text>
            {Platform.OS !== 'web' && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Notifications are used only for reminders you configure, processed entirely on your device.
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Debug Section – only in development builds */}
        {__DEV__ && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Debug
              </Text>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                Platform: {Platform.OS}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                Stored days: {allLogs.length}
              </Text>

              <Button
                mode="outlined"
                onPress={handleExport}
                icon="export"
                style={styles.dataButton}
                loading={isExporting}
                disabled={isExporting || isImporting}
              >
                Export JSON
              </Button>

              <Button
                mode="outlined"
                onPress={handleImport}
                icon="import"
                style={styles.dataButton}
                loading={isImporting}
                disabled={isExporting || isImporting}
              >
                Import JSON
              </Button>
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete All Data</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete all data? This will remove all your workout logs, goals, and settings.
              This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDeleteAll} textColor={theme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Import Result Dialog */}
      <Portal>
        <Dialog visible={showImportDialog} onDismiss={() => setShowImportDialog(false)}>
          <Dialog.Title>Import Complete</Dialog.Title>
          <Dialog.Content>
            {importResult && (
              <Text variant="bodyMedium">
                Imported {importResult.imported} records. Skipped {importResult.skipped} (older than existing).
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowImportDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    marginRight: 16,
  },
  timeInputContainer: {
    marginVertical: 8,
  },
  timeInput: {
    marginTop: 8,
  },
  messageInputContainer: {
    marginVertical: 8,
  },
  messageInput: {},
  dataButton: {
    marginVertical: 4,
  },
  aboutText: {
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 100,
  },
});
