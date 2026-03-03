import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Switch, TextInput, useTheme } from 'react-native-paper';
import { ExerciseType } from '../models/types';
import { validateGoal } from '../logic/completion';

interface GoalInputProps {
  exercise: ExerciseType;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

export function GoalInput({ exercise, label, value, onChange }: GoalInputProps) {
  const theme = useTheme();
  const [isEnabled, setIsEnabled] = useState(value !== null);
  const [textValue, setTextValue] = useState(value?.toString() ?? '50');

  useEffect(() => {
    setIsEnabled(value !== null);
    if (value !== null) {
      setTextValue(value.toString());
    }
  }, [value]);

  const handleToggle = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);

    if (newEnabled) {
      const numValue = parseInt(textValue, 10);
      onChange(validateGoal(numValue) ?? 50);
    } else {
      onChange(null);
    }
  };

  const handleTextChange = (text: string) => {
    setTextValue(text);

    if (isEnabled) {
      const numValue = parseInt(text, 10);
      const validated = validateGoal(numValue);
      if (validated !== null) {
        onChange(validated);
      }
    }
  };

  const handleBlur = () => {
    if (isEnabled) {
      const numValue = parseInt(textValue, 10);
      const validated = validateGoal(numValue);
      if (validated !== null) {
        setTextValue(validated.toString());
        onChange(validated);
      } else {
        setTextValue('50');
        onChange(50);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="titleMedium" style={styles.label}>
          {label}
        </Text>
        <View style={styles.controlsRow}>
          <TextInput
            mode="outlined"
            value={textValue}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="numeric"
            style={[styles.input, !isEnabled && styles.inputDisabled]}
            disabled={!isEnabled}
            dense
          />
          <Switch
            value={isEnabled}
            onValueChange={handleToggle}
            color={theme.colors.primary}
          />
        </View>
      </View>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {isEnabled ? `Goal: ${value} reps/day` : 'Goal: Off'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    width: 80,
  },
  inputDisabled: {
    opacity: 0.5,
  },
});
