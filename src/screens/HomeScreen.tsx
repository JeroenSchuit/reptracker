import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, useTheme, Chip, IconButton } from 'react-native-paper';
import { useApp } from '../context/AppContext';
import { ExerciseCard } from '../components/ExerciseCard';
import { DateNavigator } from '../components/DateNavigator';
import { ProgressRing } from '../components/ProgressRing';
import { BadgeModal } from '../components/BadgeModal';
import { getDayStatus, getTotalProgressPercentage } from '../logic/completion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { progressColors } from '../theme/theme';

export function HomeScreen() {
  const theme = useTheme();
  const {
    settings,
    currentDateKey,
    currentLog,
    isCurrentDateComplete,
    streakInfo,
    incrementExercise,
    setExerciseReps,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    isToday,
    isLoading,
    isDarkMode,
    newlyUnlockedBadge,
    dismissBadgeModal,
  } = useApp();

  // Swipe gesture for date navigation
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationX > 50) {
        goToPreviousDay();
      } else if (event.translationX < -50 && !isToday) {
        goToNextDay();
      }
    });

  if (isLoading || !settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const dayStatus = getDayStatus(currentLog, settings);
  const totalProgress = getTotalProgressPercentage(currentLog, settings);
  const colors = isDarkMode ? progressColors.dark : progressColors.light;

  const handleIncrement = (exercise: 'pushups' | 'pullups' | 'situps') => (delta: number) => {
    incrementExercise(currentDateKey, exercise, delta);
  };

  const handleSetValue = (exercise: 'pushups' | 'pullups' | 'situps') => (value: number) => {
    setExerciseReps(currentDateKey, exercise, value);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <GestureDetector gesture={swipeGesture}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Navigator */}
            <DateNavigator
              dateKey={currentDateKey}
              onPrevious={goToPreviousDay}
              onNext={goToNextDay}
              onToday={goToToday}
              canGoNext={!isToday}
            />

            {/* Day Status Card */}
            <Card style={styles.statusCard} mode="elevated">
              <Card.Content>
                {!streakInfo.hasActiveGoals ? (
                  <View style={styles.noGoalsContainer}>
                    <IconButton
                      icon="target"
                      size={32}
                      iconColor={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                      Set goals to track progress
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Go to Settings to configure daily goals
                    </Text>
                  </View>
                ) : (
                  <View style={styles.statusContainer}>
                    {/* Overall progress ring */}
                    <View style={styles.overallProgress}>
                      <ProgressRing
                        progress={totalProgress ?? 0}
                        size={100}
                        strokeWidth={10}
                        isComplete={isCurrentDateComplete === true}
                      >
                        <View style={styles.progressCenter}>
                          <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                            {totalProgress ?? 0}%
                          </Text>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            complete
                          </Text>
                        </View>
                      </ProgressRing>

                      {isCurrentDateComplete && (
                        <Chip
                          icon="check"
                          mode="flat"
                          style={[styles.completeBadge, { backgroundColor: colors.complete + '20' }]}
                          textStyle={{ color: colors.complete }}
                        >
                          Day Complete
                        </Chip>
                      )}
                    </View>

                    {/* Streak info */}
                    <View style={styles.streakSection}>
                      <View style={styles.streakItem}>
                        <IconButton
                          icon="fire"
                          size={24}
                          iconColor={theme.colors.primary}
                          style={styles.streakIcon}
                        />
                        <View>
                          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                            {streakInfo.current}
                          </Text>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Current streak
                          </Text>
                        </View>
                      </View>

                      <View style={styles.streakDivider} />

                      <View style={styles.streakItem}>
                        <IconButton
                          icon="trophy"
                          size={24}
                          iconColor={theme.colors.secondary}
                          style={styles.streakIcon}
                        />
                        <View>
                          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                            {streakInfo.longest}
                          </Text>
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Best streak
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
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

            <View style={styles.bottomPadding} />
          </ScrollView>
        </GestureDetector>

        {/* Badge celebration modal */}
        <BadgeModal
          badge={newlyUnlockedBadge}
          visible={!!newlyUnlockedBadge}
          onDismiss={dismissBadgeModal}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
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
  statusCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
  },
  statusContainer: {
    alignItems: 'center',
  },
  overallProgress: {
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCenter: {
    alignItems: 'center',
  },
  completeBadge: {
    marginTop: 12,
  },
  streakSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  streakIcon: {
    margin: 0,
    marginRight: 4,
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  noGoalsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  bottomPadding: {
    height: 100,
  },
});
