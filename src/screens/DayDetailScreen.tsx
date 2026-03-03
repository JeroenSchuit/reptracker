import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Portal,
  Dialog,
  ActivityIndicator,
  TextInput,
} from 'react-native-paper';
import { useApp } from '../context/AppContext';
import { ExerciseCard } from '../components/ExerciseCard';
import { getDayStatus, isDayComplete } from '../logic/completion';
import { format, parseISO, isValid, subDays } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { DailyLog } from '../models/types';

type RootStackParamList = {
  HistoryMain: undefined;
  DayDetail: { dateKey: string };
};

export function DayDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'DayDetail'>>();
  const {
    settings,
    incrementExercise,
    setExerciseReps,
    clearDay,
    copyFromYesterday,
    getLogForDate,
  } = useApp();

  const todayDateKey = format(new Date(), 'yyyy-MM-dd');

  const [dateKey, setDateKey] = useState(route.params?.dateKey || todayDateKey);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDateInput, setShowDateInput] = useState(!route.params?.dateKey);
  const [dateInputValue, setDateInputValue] = useState(todayDateKey);

  const loadLog = useCallback(async () => {
    setIsLoading(true);
    const loadedLog = await getLogForDate(dateKey);
    setLog(loadedLog);
    setIsLoading(false);
  }, [dateKey, getLogForDate]);

  useEffect(() => {
    if (dateKey) {
      loadLog();
    }
  }, [dateKey, loadLog]);

  const handleIncrement = (exercise: 'pushups' | 'pullups' | 'situps') => async (delta: number) => {
    await incrementExercise(dateKey, exercise, delta);
    await loadLog();
  };

  const handleSetValue = (exercise: 'pushups' | 'pullups' | 'situps') => async (value: number) => {
    await setExerciseReps(dateKey, exercise, value);
    await loadLog();
  };

  const handleClearDay = async () => {
    await clearDay(dateKey);
    setLog(null);
    setShowClearDialog(false);
  };

  const handleCopyFromYesterday = async () => {
    const result = await copyFromYesterday(dateKey);
    if (result) {
      setLog(result);
    }
  };

  const handleDateSubmit = () => {
    const parsed = parseISO(dateInputValue);
    if (isValid(parsed)) {
      setDateKey(format(parsed, 'yyyy-MM-dd'));
      setShowDateInput(false);
    }
  };

  if (!settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (showDateInput) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.dateInputContainer}>
          <Text variant="headlineSmall" style={styles.dateInputTitle}>
            Select Date
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            Enter a date in YYYY-MM-DD format
          </Text>
          <TextInput
            mode="outlined"
            label="Date"
            value={dateInputValue}
            onChangeText={setDateInputValue}
            placeholder="YYYY-MM-DD"
            style={styles.dateInput}
            autoFocus
          />
          <View style={styles.dateInputButtons}>
            <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.dateButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleDateSubmit} style={styles.dateButton}>
              Go
            </Button>
          </View>
          <View style={styles.quickDates}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Quick select:
            </Text>
            <View style={styles.quickDateButtons}>
              <Button
                mode="text"
                onPress={() => {
                  setDateInputValue(todayDateKey);
                  setDateKey(todayDateKey);
                  setShowDateInput(false);
                }}
                compact
              >
                Today
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                  setDateInputValue(yesterday);
                  setDateKey(yesterday);
                  setShowDateInput(false);
                }}
                compact
              >
                Yesterday
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
                  setDateInputValue(weekAgo);
                  setDateKey(weekAgo);
                  setShowDateInput(false);
                }}
                compact
              >
                Week ago
              </Button>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const dayStatus = getDayStatus(log, settings);
  const formattedDate = format(parseISO(dateKey), 'EEEE, MMMM d, yyyy');
  const isToday = dateKey === todayDateKey;
  const dayComplete = isDayComplete(log, settings);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>
              {isToday ? 'Today' : formattedDate}
            </Text>
            {isToday && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {formattedDate}
              </Text>
            )}
          </View>
          <Button
            mode="outlined"
            onPress={() => setShowDateInput(true)}
            icon="calendar"
            compact
          >
            Change
          </Button>
        </View>

        {/* Day Status */}
        <Card style={styles.statusCard} mode="outlined">
          <Card.Content>
            <View style={styles.statusRow}>
              <Text variant="bodyLarge">Day Complete:</Text>
              <Text
                variant="titleMedium"
                style={{
                  fontWeight: 'bold',
                  color: dayComplete === true
                    ? theme.colors.primary
                    : dayComplete === false
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant,
                }}
              >
                {dayComplete === true ? 'Yes' : dayComplete === false ? 'No' : 'N/A'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Exercise Cards */}
        <ExerciseCard
          exercise="pushups"
          label="Push-ups"
          current={dayStatus.progress.pushups.current}
          goal={dayStatus.progress.pushups.goal}
          remaining={dayStatus.progress.pushups.remaining}
          percentage={dayStatus.progress.pushups.percentage}
          onIncrement={handleIncrement('pushups')}
          onSetValue={handleSetValue('pushups')}
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
        />

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleCopyFromYesterday}
            icon="content-copy"
            style={styles.actionButton}
          >
            Copy from yesterday
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowClearDialog(true)}
            icon="delete"
            style={styles.actionButton}
            textColor={theme.colors.error}
          >
            Clear day
          </Button>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Portal>
        <Dialog visible={showClearDialog} onDismiss={() => setShowClearDialog(false)}>
          <Dialog.Title>Clear Day</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to clear all reps for this day? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearDialog(false)}>Cancel</Button>
            <Button onPress={handleClearDay} textColor={theme.colors.error}>
              Clear
            </Button>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  statusCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
  bottomPadding: {
    height: 100,
  },
  dateInputContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  dateInputTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateInput: {
    marginBottom: 16,
  },
  dateInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
  },
  quickDates: {
    marginTop: 24,
  },
  quickDateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
