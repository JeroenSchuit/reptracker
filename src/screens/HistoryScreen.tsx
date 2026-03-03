import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, ActivityIndicator, Button, Card, Chip, IconButton, Divider } from 'react-native-paper';
import { useApp } from '../context/AppContext';
import { Calendar } from '../components/Calendar';
import { ExerciseCard } from '../components/ExerciseCard';
import { ProgressRing } from '../components/ProgressRing';
import { getDayStatus, getTotalProgressPercentage, getActiveGoals } from '../logic/completion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { progressColors } from '../theme/theme';
import * as Haptics from 'expo-haptics';

export function HistoryScreen() {
  const theme = useTheme();
  const {
    settings,
    allLogs,
    isLoading,
    isDarkMode,
    setCurrentDate,
    copyFromYesterday,
    copyFromLastCompleted,
    incrementExercise,
    setExerciseReps,
    clearDay,
    getLogForDate,
  } = useApp();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isCopying, setIsCopying] = useState(false);

  const colors = isDarkMode ? progressColors.dark : progressColors.light;
  const hasActiveGoals = settings ? getActiveGoals(settings).length > 0 : false;

  const handleDateSelect = useCallback(async (dateKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDateKey(dateKey);
    const log = await getLogForDate(dateKey);
    setSelectedLog(log);
  }, [getLogForDate]);

  const handleCopyYesterday = useCallback(async () => {
    if (!selectedDateKey) return;
    setIsCopying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await copyFromYesterday(selectedDateKey);
    if (result) {
      setSelectedLog(result);
    }
    setIsCopying(false);
  }, [selectedDateKey, copyFromYesterday]);

  const handleCopyLastCompleted = useCallback(async () => {
    if (!selectedDateKey) return;
    setIsCopying(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await copyFromLastCompleted(selectedDateKey);
    if (result) {
      setSelectedLog(result);
    }
    setIsCopying(false);
  }, [selectedDateKey, copyFromLastCompleted]);

  const handleClearDay = useCallback(async () => {
    if (!selectedDateKey) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await clearDay(selectedDateKey);
    setSelectedLog(null);
  }, [selectedDateKey, clearDay]);

  const handleIncrement = useCallback((exercise: 'pushups' | 'pullups' | 'situps') => async (delta: number) => {
    if (!selectedDateKey) return;
    await incrementExercise(selectedDateKey, exercise, delta);
    const log = await getLogForDate(selectedDateKey);
    setSelectedLog(log);
  }, [selectedDateKey, incrementExercise, getLogForDate]);

  const handleSetValue = useCallback((exercise: 'pushups' | 'pullups' | 'situps') => async (value: number) => {
    if (!selectedDateKey) return;
    await setExerciseReps(selectedDateKey, exercise, value);
    const log = await getLogForDate(selectedDateKey);
    setSelectedLog(log);
  }, [selectedDateKey, setExerciseReps, getLogForDate]);

  const handleGoToHome = useCallback(() => {
    if (selectedDateKey) {
      setCurrentDate(selectedDateKey);
    }
  }, [selectedDateKey, setCurrentDate]);

  if (isLoading || !settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const dayStatus = selectedLog ? getDayStatus(selectedLog, settings) : getDayStatus(null, settings);
  const totalProgress = selectedLog ? getTotalProgressPercentage(selectedLog, settings) : 0;
  const isComplete = dayStatus?.isComplete;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            History
          </Text>
        </View>

        {/* Calendar */}
        <Card style={styles.calendarCard} mode="elevated">
          <Calendar
            logs={allLogs}
            settings={settings}
            selectedDate={selectedDateKey ? parseISO(selectedDateKey) : new Date()}
            currentMonth={currentMonth}
            onDateSelect={handleDateSelect}
            onMonthChange={setCurrentMonth}
          />
        </Card>

        {/* Selected day details */}
        {selectedDateKey && (
          <View style={styles.selectedDaySection}>
            <Card style={styles.selectedDayCard} mode="elevated">
              <Card.Content>
                {/* Header with date and status */}
                <View style={styles.selectedHeader}>
                  <View>
                    <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                      {format(parseISO(selectedDateKey), 'EEEE')}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {format(parseISO(selectedDateKey), 'MMMM d, yyyy')}
                    </Text>
                  </View>

                  {hasActiveGoals && (
                    <ProgressRing
                      progress={totalProgress ?? 0}
                      size={56}
                      strokeWidth={5}
                      isComplete={isComplete === true}
                    >
                      <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>
                        {totalProgress ?? 0}%
                      </Text>
                    </ProgressRing>
                  )}
                </View>

                {/* Quick action chips */}
                <View style={styles.quickActions}>
                  <Chip
                    icon="content-copy"
                    mode="outlined"
                    onPress={handleCopyYesterday}
                    disabled={isCopying}
                    style={styles.actionChip}
                  >
                    Copy yesterday
                  </Chip>
                  {hasActiveGoals && (
                    <Chip
                      icon="check-circle"
                      mode="outlined"
                      onPress={handleCopyLastCompleted}
                      disabled={isCopying}
                      style={styles.actionChip}
                    >
                      Copy last complete
                    </Chip>
                  )}
                </View>

                <Divider style={styles.divider} />

                {/* Status badge */}
                {hasActiveGoals && (
                  <View style={styles.statusRow}>
                    <Chip
                      icon={isComplete ? 'check' : 'close'}
                      mode="flat"
                      style={{
                        backgroundColor: isComplete
                          ? colors.complete + '20'
                          : selectedLog
                            ? theme.colors.errorContainer
                            : theme.colors.surfaceVariant,
                      }}
                      textStyle={{
                        color: isComplete
                          ? colors.complete
                          : selectedLog
                            ? theme.colors.error
                            : theme.colors.onSurfaceVariant,
                      }}
                    >
                      {isComplete ? 'Goals Complete' : selectedLog ? 'Incomplete' : 'No data'}
                    </Chip>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Exercise editing cards */}
            <ExerciseCard
              exercise="pushups"
              label="Push-ups"
              current={dayStatus.progress.pushups.current}
              goal={dayStatus.progress.pushups.goal}
              remaining={dayStatus.progress.pushups.remaining}
              percentage={dayStatus.progress.pushups.percentage}
              onIncrement={handleIncrement('pushups')}
              onSetValue={handleSetValue('pushups')}
              compact
            />

            <ExerciseCard
              exercise="pullups"
              label="Pull-ups"
              current={dayStatus.progress.pullups.current}
              goal={dayStatus.progress.pullups.goal}
              remaining={dayStatus.progress.pullups.remaining}
              percentage={dayStatus.progress.pullups.percentage}
              onIncrement={handleIncrement('pullups')}
              onSetValue={handleSetValue('pullups')}
              compact
            />

            <ExerciseCard
              exercise="situps"
              label="Sit-ups"
              current={dayStatus.progress.situps.current}
              goal={dayStatus.progress.situps.goal}
              remaining={dayStatus.progress.situps.remaining}
              percentage={dayStatus.progress.situps.percentage}
              onIncrement={handleIncrement('situps')}
              onSetValue={handleSetValue('situps')}
              compact
            />

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained-tonal"
                onPress={handleGoToHome}
                icon="home"
                style={styles.actionButton}
              >
                View in Home
              </Button>
              {selectedLog && (
                <Button
                  mode="outlined"
                  onPress={handleClearDay}
                  icon="delete"
                  textColor={theme.colors.error}
                  style={styles.actionButton}
                >
                  Clear Day
                </Button>
              )}
            </View>
          </View>
        )}

        {/* Prompt to select a day */}
        {!selectedDateKey && (
          <Card style={styles.promptCard} mode="outlined">
            <Card.Content style={styles.promptContent}>
              <IconButton
                icon="calendar-cursor"
                size={48}
                iconColor={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Tap a date on the calendar to view or edit
              </Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  calendarCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  selectedDaySection: {
    marginTop: 8,
  },
  selectedDayCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  actionChip: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  actionButton: {
    borderRadius: 12,
  },
  promptCard: {
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: 16,
  },
  promptContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  bottomPadding: {
    height: 100,
  },
});
