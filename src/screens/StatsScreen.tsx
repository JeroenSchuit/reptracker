import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, SegmentedButtons, Card, useTheme, ActivityIndicator, IconButton, Surface, ProgressBar } from 'react-native-paper';
import { useApp } from '../context/AppContext';
import { Heatmap } from '../components/Heatmap';
import { BadgeGrid } from '../components/BadgeGrid';
import { ProgressRing } from '../components/ProgressRing';
import {
  getDailyDataPoints,
  getSummaryStats,
} from '../logic/aggregates';
import { checkBadgeUnlocks, getAchievementsSummary } from '../logic/achievements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimeRange, ExerciseFilter, ViewMode, StatsTab } from '../models/types';
import { format } from 'date-fns';
import { progressColors } from '../theme/theme';

const screenWidth = Dimensions.get('window').width;

export function StatsScreen() {
  const theme = useTheme();
  const { settings, allLogs, isLoading, isDarkMode, unlockedBadges, setCurrentDate } = useApp();

  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');
  const [exerciseFilter, setExerciseFilter] = useState<ExerciseFilter>('all');

  const colors = isDarkMode ? progressColors.dark : progressColors.light;

  const chartData = useMemo(() => {
    if (!settings || allLogs.length === 0) return null;
    return getDailyDataPoints(allLogs, settings, timeRange === '7D' ? 7 : 30);
  }, [settings, allLogs, timeRange]);

  const summaryStats = useMemo(() => {
    if (!settings) return null;

    let filteredLogs = allLogs;
    if (timeRange !== 'ALL') {
      const cutoffDate = new Date();
      switch (timeRange) {
        case '7D':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case '30D':
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          break;
        case '12M':
          cutoffDate.setMonth(cutoffDate.getMonth() - 12);
          break;
      }
      filteredLogs = allLogs.filter(
        (log) => new Date(log.dateKey) >= cutoffDate
      );
    }

    return getSummaryStats(filteredLogs, settings);
  }, [settings, allLogs, timeRange]);

  const badgeProgress = useMemo(() => {
    if (!settings) return [];
    return checkBadgeUnlocks(allLogs, settings, unlockedBadges);
  }, [allLogs, settings, unlockedBadges]);

  const achievementsSummary = useMemo(() => {
    if (!settings) return null;
    return getAchievementsSummary(allLogs, settings, unlockedBadges);
  }, [allLogs, settings, unlockedBadges]);

  const handleHeatmapCellSelect = (dateKey: string) => {
    setCurrentDate(dateKey);
  };

  if (isLoading || !settings) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const hasGoals = settings.goal_pushups !== null || settings.goal_pullups !== null || settings.goal_situps !== null;
  const unlockedCount = badgeProgress.filter(b => b.isUnlocked).length;

  const renderOverviewTab = () => (
    <>
      {/* Streak & Progress Card */}
      <Card style={styles.overviewCard} mode="elevated">
        <Card.Content>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <ProgressRing
                progress={achievementsSummary?.completionRateLast7 ?? 0}
                size={72}
                strokeWidth={6}
                isComplete={(achievementsSummary?.completionRateLast7 ?? 0) >= 100}
              >
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {achievementsSummary?.completionRateLast7 ?? 0}%
                </Text>
              </ProgressRing>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Last 7 days
              </Text>
            </View>

            <View style={styles.overviewItem}>
              <View style={styles.statBox}>
                <IconButton icon="fire" size={28} iconColor={theme.colors.primary} style={styles.statIcon} />
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                  {achievementsSummary?.currentStreak ?? 0}
                </Text>
              </View>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Current streak
              </Text>
            </View>

            <View style={styles.overviewItem}>
              <View style={styles.statBox}>
                <IconButton icon="trophy" size={28} iconColor={theme.colors.secondary} style={styles.statIcon} />
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                  {achievementsSummary?.longestStreak ?? 0}
                </Text>
              </View>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Longest streak
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Lifetime Stats Card */}
      <Card style={styles.overviewCard} mode="elevated">
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Lifetime Stats</Text>

          <View style={styles.lifetimeGrid}>
            <Surface style={[styles.lifetimeStat, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                {(achievementsSummary?.totalReps ?? 0).toLocaleString()}
              </Text>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Total reps
              </Text>
            </Surface>

            <Surface style={[styles.lifetimeStat, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                {achievementsSummary?.perfectWeeks ?? 0}
              </Text>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Perfect weeks
              </Text>
            </Surface>
          </View>

          {achievementsSummary?.mostProductiveDay && (
            <Surface style={[styles.bestDayStat, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
              <IconButton icon="star" size={24} iconColor={theme.colors.onPrimaryContainer} style={styles.statIcon} />
              <View>
                <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  Most productive day
                </Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer }}>
                  {achievementsSummary.mostProductiveDay.reps.toLocaleString()} reps
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  {format(new Date(achievementsSummary.mostProductiveDay.date), 'MMMM d, yyyy')}
                </Text>
              </View>
            </Surface>
          )}
        </Card.Content>
      </Card>

      {/* Badges Summary */}
      <Card style={styles.overviewCard} mode="elevated">
        <Card.Content>
          <View style={styles.badgesSummaryHeader}>
            <Text variant="titleMedium" style={styles.cardTitle}>Achievements</Text>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              {unlockedCount}/{badgeProgress.length}
            </Text>
          </View>

          <View style={styles.badgesPreview}>
            {badgeProgress.slice(0, 4).map((bp) => (
              <View key={bp.badge.id} style={styles.badgePreviewItem}>
                <IconButton
                  icon={bp.isUnlocked ? bp.badge.icon : 'lock'}
                  size={28}
                  iconColor={bp.isUnlocked ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              </View>
            ))}
            <View style={styles.badgePreviewItem}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                +{Math.max(0, badgeProgress.length - 4)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </>
  );

  const renderChartsTab = () => (
    <>
      {/* Filters */}
      <View style={styles.filterSection}>
        <SegmentedButtons
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as TimeRange)}
          buttons={[
            { value: '7D', label: '7D' },
            { value: '30D', label: '30D' },
            { value: '12M', label: '12M' },
            { value: 'ALL', label: 'All' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Summary Stats */}
      {summaryStats && (
        <Card style={styles.chartCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Total Days
                </Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {summaryStats.totalDays}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Complete
                </Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  {summaryStats.completeDays}
                </Text>
              </View>
              {summaryStats.completionRate !== null && (
                <View style={styles.summaryItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Rate
                  </Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {summaryStats.completionRate}%
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Simple bar visualization */}
      {chartData && chartData.length > 0 && (
        <Card style={styles.chartCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Daily Activity</Text>
            {chartData.slice(-7).map((data, index) => (
              <View key={index} style={styles.barRow}>
                <Text variant="labelSmall" style={[styles.barLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {data.label?.split(' ')[1] ?? ''}
                </Text>
                <View style={styles.barContainer}>
                  <ProgressBar
                    progress={Math.min(1, data.total / Math.max(1, summaryStats?.totalPushups ?? 1) * chartData.length)}
                    color={theme.colors.primary}
                    style={styles.bar}
                  />
                </View>
                <Text variant="labelSmall" style={[styles.barValue, { color: theme.colors.onSurface }]}>
                  {data.total}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Exercise breakdown */}
      {summaryStats && (
        <Card style={styles.chartCard} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Exercise Breakdown</Text>
            <View style={styles.exerciseBreakdown}>
              <View style={styles.exerciseBreakdownItem}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  {summaryStats.totalPushups}
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Push-ups</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {summaryStats.avgPushups}/day avg
                </Text>
              </View>
              <View style={styles.exerciseBreakdownItem}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  {summaryStats.totalPullups}
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Pull-ups</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {summaryStats.avgPullups}/day avg
                </Text>
              </View>
              <View style={styles.exerciseBreakdownItem}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.tertiary }}>
                  {summaryStats.totalSitups}
                </Text>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Sit-ups</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {summaryStats.avgSitups}/day avg
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
    </>
  );

  const renderHeatmapTab = () => (
    <Card style={styles.heatmapCard} mode="elevated">
      <Card.Content style={styles.heatmapContent}>
        <Heatmap
          logs={allLogs}
          settings={settings}
          onCellSelect={handleHeatmapCellSelect}
        />
      </Card.Content>
    </Card>
  );

  const renderAchievementsTab = () => (
    <BadgeGrid badges={badgeProgress} showCategory />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Statistics
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as StatsTab)}
            buttons={[
              { value: 'overview', label: 'Overview' },
              { value: 'charts', label: 'Charts' },
              { value: 'heatmap', label: 'Heatmap' },
              { value: 'achievements', label: 'Badges' },
            ]}
            style={styles.tabButtons}
          />
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'charts' && renderChartsTab()}
        {activeTab === 'heatmap' && renderHeatmapTab()}
        {activeTab === 'achievements' && renderAchievementsTab()}

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
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabButtons: {},
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 4,
  },
  overviewCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  overviewItem: {
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statIcon: {
    margin: 0,
  },
  lifetimeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  lifetimeStat: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  bestDayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  badgesSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badgePreviewItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  chartCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  barLabel: {
    width: 40,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    width: 40,
    textAlign: 'right',
  },
  exerciseBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exerciseBreakdownItem: {
    alignItems: 'center',
  },
  heatmapCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
  },
  heatmapContent: {
    paddingHorizontal: 0,
  },
  bottomPadding: {
    height: 100,
  },
});
