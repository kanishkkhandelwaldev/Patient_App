import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/theme';
import Avatar from './Avatar';
import PrimaryButton from './PrimaryButton';
import { useApp } from '../state/AppContext';

const KIND_META: Record<string, { icon: string; label: string }> = {
  medication: { icon: 'medkit', label: 'Medicine time' },
  appointment: { icon: 'calendar', label: 'Appointment' },
  activity: { icon: 'walk', label: 'Reminder' },
};

/**
 * Reminder delivery (spec §18). When `state.activeReminderId` is set — whether
 * the app fired it mid-game or a presenter triggered it — everything behind this
 * overlay is frozen. The avatar slides in, delivers the reminder, and the
 * patient acknowledges to resume.
 */
export default function ReminderOverlay() {
  const { state, dispatch } = useApp();
  const reminder = state.reminders.find((r) => r.id === state.activeReminderId);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reminder) {
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [reminder, slide]);

  if (!reminder) return null;

  const meta = KIND_META[reminder.kind] ?? KIND_META.activity;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.card, { opacity: slide, transform: [{ translateY }] }]}>
        <View style={styles.avatarRow}>
          <Avatar id={state.profile.avatar} size={64} />
          <View style={styles.badge}>
            <Ionicons name={meta.icon as any} size={14} color={colors.textOnPrimary} />
            <Text style={styles.badgeText}>{meta.label}</Text>
          </View>
        </View>

        <Text style={styles.timeLabel}>It's {reminder.time}</Text>
        <Text style={styles.message}>{reminder.title}</Text>
        {reminder.note ? <Text style={styles.note}>{reminder.note}</Text> : null}

        <Text style={styles.pausedNote}>Your game is paused — it will continue after this.</Text>

        <PrimaryButton label="Okay, done" onPress={() => dispatch({ type: 'ACK_REMINDER' })} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 16, 40, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 380,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '700' },
  timeLabel: { fontSize: 17, fontWeight: '700', color: colors.textMuted },
  // The instruction is the point of the reminder — make it the biggest thing on the card.
  message: { fontSize: 30, fontWeight: '800', color: colors.text, lineHeight: 36, marginTop: 2 },
  note: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
  pausedNote: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
});
