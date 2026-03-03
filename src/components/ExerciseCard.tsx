import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Button, IconButton, TextInput, useTheme, Chip } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { ExerciseType } from '../models/types';
import { ProgressRing } from './ProgressRing';
import { EXERCISES, QUICK_PRESETS } from '../config/exercises';

interface ExerciseCardProps {
  exercise: ExerciseType;
  label: string;
  current: number;
  goal: number | null;
  remaining: number | null;
  percentage: number;
  onIncrement: (delta: number) => void;
  onSetValue: (value: number) => void;
  compact?: boolean;
}

const LONG_PRESS_INTERVAL = 80; // ms between increments during long press
const LONG_PRESS_DELAY = 300; // ms before long press starts

export function ExerciseCard({
  exercise,
  label,
  current,
  goal,
  remaining,
  percentage,
  onIncrement,
  onSetValue,
  compact = false,
}: ExerciseCardProps) {
  const theme = useTheme();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualValue, setManualValue] = useState(current.toString());

  const longPressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressActiveRef = useRef(false);

  const exerciseConfig = EXERCISES.find(e => e.id === exercise);
  const exerciseColor = exerciseConfig?.color || theme.colors.primary;

  const handleManualSubmit = () => {
    const value = parseInt(manualValue, 10);
    if (!isNaN(value) && value >= 0 && value <= 10000) {
      onSetValue(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowManualInput(false);
  };

  const handleIncrement = useCallback((delta: number) => {
    onIncrement(delta);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onIncrement]);

  const startLongPress = useCallback((delta: number) => {
    longPressActiveRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    longPressIntervalRef.current = setInterval(() => {
      if (longPressActiveRef.current) {
        onIncrement(delta);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, LONG_PRESS_INTERVAL);
  }, [onIncrement]);

  const stopLongPress = useCallback(() => {
    longPressActiveRef.current = false;
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
  }, []);

  const isGoalMet = goal !== null && current >= goal;
  const hasGoal = goal !== null;

  if (compact) {
    return (
      <Card style={styles.compactCard} mode="outlined">
        <Card.Content style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <View style={styles.compactTitleRow}>
              <IconButton
                icon={exerciseConfig?.icon || 'dumbbell'}
                size={20}
                iconColor={exerciseColor}
                style={styles.compactIcon}
              />
              <Text variant="labelLarge">{label}</Text>
            </View>
            {hasGoal && (
              <ProgressRing
                progress={percentage}
                size={48}
                strokeWidth={4}
                isComplete={isGoalMet}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {percentage}%
                </Text>
              </ProgressRing>
            )}
          </View>
          <View style={styles.compactButtonRow}>
            {[1, 5, 10].map((delta) => (
              <Pressable
                key={delta}
                onPress={() => handleIncrement(delta)}
                onLongPress={() => startLongPress(delta)}
                onPressOut={stopLongPress}
                delayLongPress={LONG_PRESS_DELAY}
                style={({ pressed }) => [
                  styles.compactButton,
                  { backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
                ]}
              >
                <Text variant="labelMedium">+{delta}</Text>
              </Pressable>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <IconButton
              icon={exerciseConfig?.icon || 'dumbbell'}
              size={28}
              iconColor={exerciseColor}
              style={styles.icon}
            />
            <View>
              <Text variant="titleMedium" style={styles.title}>
                {label}
              </Text>
              {hasGoal && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Goal: {goal}
                </Text>
              )}
            </View>
          </View>

          {hasGoal ? (
            <ProgressRing
              progress={percentage}
              size={72}
              strokeWidth={6}
              isComplete={isGoalMet}
            >
              <Text
                variant="titleMedium"
                style={[
                  styles.ringCount,
                  { color: isGoalMet ? theme.colors.primary : theme.colors.onSurface },
                ]}
              >
                {current}
              </Text>
            </ProgressRing>
          ) : (
            <Text
              variant="displaySmall"
              style={[styles.count, { color: theme.colors.onSurface }]}
            >
              {current}
            </Text>
          )}
        </View>

        {hasGoal && remaining !== null && remaining > 0 && (
          <View style={styles.remainingBadge}>
            <Chip
              mode="flat"
              compact
              style={{ backgroundColor: theme.colors.surfaceVariant }}
            >
              {remaining} to go
            </Chip>
          </View>
        )}

        {showManualInput ? (
          <View style={styles.manualInputRow}>
            <TextInput
              mode="outlined"
              value={manualValue}
              onChangeText={setManualValue}
              keyboardType="numeric"
              style={styles.manualInput}
              dense
              autoFocus
              onSubmitEditing={handleManualSubmit}
            />
            <Button mode="contained" onPress={handleManualSubmit} compact>
              Set
            </Button>
            <Button mode="text" onPress={() => setShowManualInput(false)} compact>
              Cancel
            </Button>
          </View>
        ) : (
          <>
            {/* Quick preset chips */}
            <View style={styles.chipRow}>
              {QUICK_PRESETS.map((delta) => (
                <Pressable
                  key={delta}
                  onPress={() => handleIncrement(delta)}
                  onLongPress={() => startLongPress(delta)}
                  onPressOut={stopLongPress}
                  delayLongPress={LONG_PRESS_DELAY}
                  style={({ pressed }) => [
                    styles.chipButton,
                    {
                      backgroundColor: pressed
                        ? theme.colors.primary
                        : theme.colors.primaryContainer,
                    },
                  ]}
                >
                  <Text
                    variant="labelLarge"
                    style={{ color: theme.colors.onPrimaryContainer }}
                  >
                    +{delta}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Decrement and manual buttons */}
            <View style={styles.secondaryRow}>
              <View style={styles.decrementButtons}>
                <Button
                  mode="text"
                  onPress={() => handleIncrement(-1)}
                  compact
                  disabled={current < 1}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  -1
                </Button>
                <Button
                  mode="text"
                  onPress={() => handleIncrement(-5)}
                  compact
                  disabled={current < 5}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  -5
                </Button>
              </View>
              <Button
                mode="text"
                onPress={() => {
                  setManualValue(current.toString());
                  setShowManualInput(true);
                }}
                compact
                icon="pencil"
              >
                Edit
              </Button>
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  compactCard: {
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  compactContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIcon: {
    margin: 0,
    marginRight: 4,
  },
  compactButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    margin: 0,
    marginRight: 4,
  },
  title: {
    fontWeight: '600',
  },
  count: {
    fontWeight: 'bold',
  },
  ringCount: {
    fontWeight: 'bold',
  },
  remainingBadge: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  chipButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  decrementButtons: {
    flexDirection: 'row',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  manualInput: {
    flex: 1,
  },
});
