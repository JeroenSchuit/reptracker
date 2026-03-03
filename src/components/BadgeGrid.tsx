import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, IconButton, Surface, ProgressBar } from 'react-native-paper';
import { BadgeProgress, getBadgeTierColor, BadgeCategory } from '../logic/achievements';
import { format } from 'date-fns';

interface BadgeGridProps {
  badges: BadgeProgress[];
  category?: BadgeCategory;
  showCategory?: boolean;
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  streak: 'Streak Badges',
  total: 'Total Reps Badges',
  consistency: 'Consistency Badges',
};

const CATEGORY_ICONS: Record<BadgeCategory, string> = {
  streak: 'fire',
  total: 'dumbbell',
  consistency: 'calendar-check',
};

export function BadgeGrid({ badges, category, showCategory = true }: BadgeGridProps) {
  const theme = useTheme();

  // Group badges by category if no specific category provided
  const groupedBadges = category
    ? { [category]: badges.filter(b => b.badge.category === category) }
    : badges.reduce((acc, bp) => {
        const cat = bp.badge.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(bp);
        return acc;
      }, {} as Record<BadgeCategory, BadgeProgress[]>);

  const renderBadge = (bp: BadgeProgress) => {
    const tierColor = getBadgeTierColor(bp.badge.tier, theme.dark);
    const isLocked = !bp.isUnlocked;

    return (
      <Surface
        key={bp.badge.id}
        style={[
          styles.badgeCard,
          {
            backgroundColor: theme.colors.surface,
            opacity: isLocked ? 0.6 : 1,
          },
        ]}
        elevation={1}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isLocked
                ? theme.colors.surfaceVariant
                : tierColor + '20',
            },
          ]}
        >
          <IconButton
            icon={isLocked ? 'lock' : bp.badge.icon}
            size={32}
            iconColor={isLocked ? theme.colors.onSurfaceVariant : tierColor}
          />
        </View>

        <Text
          variant="labelLarge"
          style={[
            styles.badgeName,
            { color: isLocked ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
          ]}
          numberOfLines={2}
        >
          {bp.badge.name}
        </Text>

        {isLocked ? (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={bp.progress / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            >
              {bp.progress}%
            </Text>
          </View>
        ) : (
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {bp.unlockedAt
              ? format(new Date(bp.unlockedAt), 'MMM d, yyyy')
              : 'Unlocked'}
          </Text>
        )}

        <View
          style={[
            styles.tierBadge,
            { backgroundColor: isLocked ? theme.colors.surfaceVariant : tierColor + '30' },
          ]}
        >
          <Text
            variant="labelSmall"
            style={{
              color: isLocked ? theme.colors.onSurfaceVariant : tierColor,
              textTransform: 'capitalize',
              fontSize: 10,
            }}
          >
            {bp.badge.tier}
          </Text>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {Object.entries(groupedBadges).map(([cat, catBadges]) => (
        <View key={cat} style={styles.categorySection}>
          {showCategory && (
            <View style={styles.categoryHeader}>
              <IconButton
                icon={CATEGORY_ICONS[cat as BadgeCategory]}
                size={20}
                iconColor={theme.colors.primary}
                style={styles.categoryIcon}
              />
              <Text variant="titleMedium" style={styles.categoryTitle}>
                {CATEGORY_LABELS[cat as BadgeCategory]}
              </Text>
            </View>
          )}

          <View style={styles.grid}>
            {(catBadges as BadgeProgress[]).map(renderBadge)}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    margin: 0,
    marginRight: 4,
  },
  categoryTitle: {
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconCircle: {
    borderRadius: 30,
    marginBottom: 8,
  },
  badgeName: {
    textAlign: 'center',
    fontWeight: '600',
    minHeight: 40,
    marginBottom: 4,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 8,
  },
});
