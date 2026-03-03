import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme, TouchableRipple } from 'react-native-paper';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';

interface DateNavigatorProps {
  dateKey: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  canGoNext: boolean;
}

export function DateNavigator({
  dateKey,
  onPrevious,
  onNext,
  onToday,
  canGoNext,
}: DateNavigatorProps) {
  const theme = useTheme();
  const date = parseISO(dateKey);
  const isTodayDate = isToday(date);
  const isYesterdayDate = isYesterday(date);

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPrevious();
  };

  const handleNext = () => {
    if (canGoNext) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onNext();
    }
  };

  const handleToday = () => {
    if (!isTodayDate) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onToday();
    }
  };

  const getDateLabel = () => {
    if (isTodayDate) return 'Today';
    if (isYesterdayDate) return 'Yesterday';
    return format(date, 'EEEE');
  };

  const getDateSub = () => {
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <IconButton
        icon="chevron-left"
        size={28}
        onPress={handlePrevious}
        iconColor={theme.colors.primary}
      />

      <TouchableRipple
        onPress={handleToday}
        style={styles.dateSection}
        disabled={isTodayDate}
      >
        <View style={styles.dateLabelContainer}>
          <Text
            variant="titleLarge"
            style={[
              styles.dateLabel,
              { color: isTodayDate ? theme.colors.primary : theme.colors.onSurface },
            ]}
          >
            {getDateLabel()}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {getDateSub()}
          </Text>
          {!isTodayDate && (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, marginTop: 2 }}
            >
              Tap to return to today
            </Text>
          )}
        </View>
      </TouchableRipple>

      <IconButton
        icon="chevron-right"
        size={28}
        onPress={handleNext}
        iconColor={canGoNext ? theme.colors.primary : theme.colors.outlineVariant}
        disabled={!canGoNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  dateSection: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateLabelContainer: {
    alignItems: 'center',
  },
  dateLabel: {
    fontWeight: '600',
  },
});
