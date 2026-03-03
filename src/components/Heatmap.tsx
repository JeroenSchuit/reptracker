import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal as RNModal } from 'react-native';
import { Text, useTheme, Surface, IconButton, Divider } from 'react-native-paper';
import { HeatmapCell, DailyLog, Settings } from '../models/types';
import { generateHeatmapData, getHeatmapMonthLabels } from '../logic/heatmap';
import { getHeatmapColor, progressColors } from '../theme/theme';
import { format, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
import { ProgressRing } from './ProgressRing';
import { getDayStatus, getActiveGoals } from '../logic/completion';

interface HeatmapProps {
  logs: DailyLog[];
  settings: Settings;
  onCellSelect?: (dateKey: string) => void;
}

const CELL_SIZE = 12;
const CELL_GAP = 2;
const DAY_LABELS_WIDTH = 28;

export function Heatmap({ logs, settings, onCellSelect }: HeatmapProps) {
  const theme = useTheme();
  const { isDarkMode } = useApp();
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const weeks = generateHeatmapData(logs, settings);
  const monthLabels = getHeatmapMonthLabels(weeks);
  const hasActiveGoals = getActiveGoals(settings).length > 0;

  const handleCellPress = (cell: HeatmapCell) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCell(cell);
    setModalVisible(true);
  };

  const handleNavigateToDay = () => {
    if (selectedCell && onCellSelect) {
      onCellSelect(selectedCell.dateKey);
      setModalVisible(false);
    }
  };

  const renderDayLabels = () => (
    <View style={styles.dayLabelsColumn}>
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
        <View key={index} style={[styles.dayLabelCell, { height: CELL_SIZE, marginBottom: CELL_GAP }]}>
          {(index === 1 || index === 3 || index === 5) && (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}>
              {label}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  const renderMonthLabels = () => (
    <View style={[styles.monthLabelsRow, { marginLeft: DAY_LABELS_WIDTH }]}>
      {monthLabels.map(({ month, weekIndex }, index) => (
        <Text
          key={`${month}-${index}`}
          variant="labelSmall"
          style={[
            styles.monthLabel,
            {
              color: theme.colors.onSurfaceVariant,
              left: weekIndex * (CELL_SIZE + CELL_GAP),
            },
          ]}
        >
          {month}
        </Text>
      ))}
    </View>
  );

  const heatmapWidth = weeks.length * (CELL_SIZE + CELL_GAP);

  // Calculate day status for selected cell
  const selectedDayStatus = selectedCell?.data
    ? getDayStatus(selectedCell.data, settings)
    : null;

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Activity
      </Text>

      {renderMonthLabels()}

      <View style={styles.heatmapContainer}>
        {renderDayLabels()}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridScrollContent}
        >
          <View style={[styles.grid, { width: heatmapWidth }]}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekColumn}>
                {week.map((cell, dayIndex) => (
                  <TouchableOpacity
                    key={`${weekIndex}-${dayIndex}`}
                    onPress={() => handleCellPress(cell)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.cell,
                        {
                          backgroundColor: getHeatmapColor(cell.intensity, isDarkMode),
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          marginBottom: CELL_GAP,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Less
        </Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            style={[
              styles.legendCell,
              { backgroundColor: getHeatmapColor(level, isDarkMode) },
            ]}
          />
        ))}
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          More
        </Text>
      </View>

      {/* Bottom Sheet Modal */}
      <RNModal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <Surface
            style={[styles.bottomSheet, { backgroundColor: theme.colors.surface }]}
            elevation={5}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: theme.colors.outlineVariant }]} />
            </View>

            {selectedCell && (
              <View style={styles.sheetContent}>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <View>
                    <Text variant="titleLarge" style={styles.sheetTitle}>
                      {format(parseISO(selectedCell.dateKey), 'EEEE')}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {format(parseISO(selectedCell.dateKey), 'MMMM d, yyyy')}
                    </Text>
                  </View>

                  {hasActiveGoals && selectedCell.data && selectedDayStatus && (
                    <View style={styles.completionBadge}>
                      <IconButton
                        icon={selectedCell.isComplete ? 'check-circle' : 'close-circle'}
                        size={28}
                        iconColor={
                          selectedCell.isComplete
                            ? progressColors[isDarkMode ? 'dark' : 'light'].complete
                            : theme.colors.error
                        }
                      />
                    </View>
                  )}
                </View>

                <Divider style={styles.divider} />

                {selectedCell.data ? (
                  <>
                    {/* Exercise breakdown */}
                    <View style={styles.exerciseGrid}>
                      {(['pushups', 'pullups', 'situps'] as const).map((exercise) => {
                        const progress = selectedDayStatus?.progress[exercise];
                        const value = selectedCell.data?.[exercise] ?? 0;
                        const goal = progress?.goal;
                        const pct = progress?.percentage ?? 0;

                        return (
                          <View key={exercise} style={styles.exerciseItem}>
                            {goal !== null ? (
                              <ProgressRing
                                progress={pct}
                                size={56}
                                strokeWidth={5}
                                isComplete={pct >= 100}
                              >
                                <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>
                                  {value}
                                </Text>
                              </ProgressRing>
                            ) : (
                              <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                                {value}
                              </Text>
                            )}
                            <Text
                              variant="labelMedium"
                              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                            >
                              {exercise === 'pushups' ? 'Push' : exercise === 'pullups' ? 'Pull' : 'Sit'}
                            </Text>
                            {goal !== null && (
                              <Text
                                variant="labelSmall"
                                style={{ color: theme.colors.onSurfaceVariant }}
                              >
                                / {goal}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    <Divider style={styles.divider} />

                    {/* Total */}
                    <View style={styles.totalRow}>
                      <Text variant="bodyLarge">Total Reps</Text>
                      <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                        {selectedCell.totalReps}
                      </Text>
                    </View>

                    {/* Status */}
                    {hasActiveGoals && (
                      <View style={styles.statusRow}>
                        <Text variant="bodyMedium">Goal Status</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: selectedCell.isComplete
                                ? progressColors[isDarkMode ? 'dark' : 'light'].complete + '20'
                                : theme.colors.errorContainer,
                            },
                          ]}
                        >
                          <Text
                            variant="labelMedium"
                            style={{
                              color: selectedCell.isComplete
                                ? progressColors[isDarkMode ? 'dark' : 'light'].complete
                                : theme.colors.error,
                            }}
                          >
                            {selectedCell.isComplete ? 'Complete' : 'Incomplete'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noDataContainer}>
                    <IconButton
                      icon="calendar-blank"
                      size={48}
                      iconColor={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                      No activity recorded
                    </Text>
                  </View>
                )}

                {/* Action button */}
                {onCellSelect && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.primaryContainer }]}
                    onPress={handleNavigateToDay}
                  >
                    <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer }}>
                      {selectedCell.data ? 'Edit this day' : 'Add data for this day'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Surface>
        </View>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: '600',
  },
  monthLabelsRow: {
    flexDirection: 'row',
    height: 16,
    position: 'relative',
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
  },
  heatmapContainer: {
    flexDirection: 'row',
  },
  dayLabelsColumn: {
    width: DAY_LABELS_WIDTH,
    justifyContent: 'flex-start',
  },
  dayLabelCell: {
    justifyContent: 'center',
  },
  gridScrollContent: {
    paddingRight: 16,
  },
  grid: {
    flexDirection: 'row',
  },
  weekColumn: {
    marginRight: CELL_GAP,
  },
  cell: {
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontWeight: '600',
  },
  completionBadge: {
    margin: 0,
  },
  divider: {
    marginVertical: 16,
  },
  exerciseGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exerciseItem: {
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
});
