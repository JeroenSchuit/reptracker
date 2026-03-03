import React from 'react';
import { View, StyleSheet, Modal as RNModal } from 'react-native';
import { Text, Button, IconButton, useTheme, Surface } from 'react-native-paper';
import { Badge, getBadgeTierColor } from '../logic/achievements';
import * as Haptics from 'expo-haptics';

interface BadgeModalProps {
  badge: Badge | null;
  visible: boolean;
  onDismiss: () => void;
}

export function BadgeModal({ badge, visible, onDismiss }: BadgeModalProps) {
  const theme = useTheme();

  React.useEffect(() => {
    if (visible && badge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, badge]);

  if (!badge) return null;

  const tierColor = getBadgeTierColor(badge.tier, theme.dark);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Surface style={[styles.modal, { backgroundColor: theme.colors.surface }]} elevation={5}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: tierColor + '20' }]}>
              <IconButton
                icon={badge.icon}
                size={64}
                iconColor={tierColor}
              />
            </View>

            <Text variant="headlineSmall" style={styles.congratsText}>
              Achievement Unlocked!
            </Text>

            <Text
              variant="titleLarge"
              style={[styles.badgeName, { color: tierColor }]}
            >
              {badge.name}
            </Text>

            <Text
              variant="bodyMedium"
              style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            >
              {badge.description}
            </Text>

            <View style={[styles.tierBadge, { backgroundColor: tierColor + '20' }]}>
              <Text
                variant="labelMedium"
                style={{ color: tierColor, textTransform: 'capitalize' }}
              >
                {badge.tier} Badge
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={onDismiss}
              style={styles.button}
            >
              Awesome!
            </Button>
          </View>
        </Surface>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    borderRadius: 50,
    marginBottom: 16,
  },
  congratsText: {
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeName: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  button: {
    minWidth: 120,
  },
});
