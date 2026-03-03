import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isAfter,
} from 'date-fns';
import { DailyLog, Settings, CalendarDay } from '../models/types';
import { isDayComplete, getActiveGoals } from '../logic/completion';
import * as Haptics from 'expo-haptics';

interface CalendarProps {
  logs: DailyLog[];
  settings: Settings;
  selectedDate: Date;
  currentMonth: Date;
  onDateSelect: (dateKey: string) => void;
  onMonthChange: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({
  logs,
  settings,
  selectedDate,
  currentMonth,
  onDateSelect,
  onMonthChange,
}: CalendarProps) {
  const theme = useTheme();
  const today = new Date();

  const logMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    logs.forEach(log => map.set(log.dateKey, log));
    return map;
  }, [logs]);

  const hasActiveGoals = getActiveGoals(settings).length > 0;

  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    let day = startDate;

    while (day <= endDate) {
      const dateKey = format(day, 'yyyy-MM-dd');
      const log = logMap.get(dateKey) ?? null;
      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isToday = isSameDay(day, today);
      const isFuture = isAfter(day, today);

      let status: CalendarDay['status'] = 'no-data';

      if (!isFuture && isCurrentMonth) {
        if (!hasActiveGoals) {
          status = log ? 'no-goals' : 'no-data';
        } else {
          const complete = isDayComplete(log, settings);
          if (complete === true) {
            status = 'complete';
          } else if (log) {
            status = 'incomplete';
          } else {
            status = 'no-data';
          }
        }
      }

      days.push({
        dateKey,
        dayOfMonth: day.getDate(),
        isCurrentMonth,
        isToday,
        isFuture,
        status,
        log,
      });

      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth, logMap, settings, hasActiveGoals]);

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (day: CalendarDay) => {
    if (day.isFuture || !day.isCurrentMonth) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateSelect(day.dateKey);
  };

  const getStatusColor = (status: CalendarDay['status']) => {
    switch (status) {
      case 'complete':
        return theme.colors.primary;
      case 'incomplete':
        return theme.colors.error;
      case 'no-goals':
        return theme.colors.secondary;
      default:
        return 'transparent';
    }
  };

  const isSelected = (day: CalendarDay) => {
    return day.dateKey === format(selectedDate, 'yyyy-MM-dd');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Month Header */}
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          size={24}
          onPress={handlePrevMonth}
          iconColor={theme.colors.primary}
        />
        <Text variant="titleMedium" style={styles.monthLabel}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <IconButton
          icon="chevron-right"
          size={24}
          onPress={handleNextMonth}
          iconColor={theme.colors.primary}
          disabled={isSameMonth(currentMonth, today)}
        />
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map(day => (
          <View key={day} style={styles.weekdayCell}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, index) => (
          <Pressable
            key={index}
            onPress={() => handleDateSelect(day)}
            disabled={day.isFuture || !day.isCurrentMonth}
            style={[
              styles.dayCell,
              isSelected(day) && {
                backgroundColor: theme.colors.primaryContainer,
                borderRadius: 8,
              },
            ]}
          >
            <View
              style={[
                styles.dayInner,
                day.isToday && {
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                  borderRadius: 20,
                },
              ]}
            >
              <Text
                variant="bodyMedium"
                style={[
                  styles.dayText,
                  {
                    color: day.isCurrentMonth
                      ? day.isFuture
                        ? theme.colors.onSurfaceDisabled
                        : theme.colors.onSurface
                      : theme.colors.onSurfaceDisabled,
                  },
                  day.isToday && { fontWeight: 'bold' },
                ]}
              >
                {day.dayOfMonth}
              </Text>
            </View>

            {/* Status indicator dot */}
            {day.isCurrentMonth && !day.isFuture && day.status !== 'no-data' && (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(day.status) },
                ]}
              />
            )}
          </Pressable>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Complete
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Incomplete
          </Text>
        </View>
        {hasActiveGoals && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No goals
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    textAlign: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
