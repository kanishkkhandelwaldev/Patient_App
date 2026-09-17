import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { useApp } from '../state/AppContext';
import { ReminderKind } from '../data/mock';

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

const KIND: Record<ReminderKind, { icon: string; color: string }> = {
  medication: { icon: 'medkit', color: colors.secondary },
  appointment: { icon: 'calendar', color: colors.primary },
  activity: { icon: 'walk', color: colors.accent },
};

export default function AlertsScreen({ navigation }: Props) {
  const { state, dispatch } = useApp();
  const pending = state.reminders.filter((r) => !r.acknowledged);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Alerts" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        <Text style={typography.bodyMuted}>
          {pending.length > 0
            ? `${pending.length} thing${pending.length === 1 ? '' : 's'} to take care of today.`
            : 'All done for now. Well done!'}
        </Text>

        {/* Reminders (§18) */}
        <Text style={[typography.label, styles.sectionLabel]}>REMINDERS</Text>
        <Text style={styles.hint}>Tap a reminder to hear it again · tap the box when it's done</Text>
        <View style={styles.group}>
          {state.reminders.map((r) => {
            const meta = KIND[r.kind];
            return (
              <Pressable
                key={r.id}
                style={[styles.card, r.acknowledged && styles.cardDone]}
                onPress={() => dispatch({ type: 'FIRE_REMINDER', id: r.id })}
              >
                <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.icon as any} size={24} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, r.acknowledged && styles.strike]}>{r.title}</Text>
                  <Text style={typography.bodyMuted}>{r.time}{r.note ? ` · ${r.note}` : ''}</Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => dispatch({ type: 'TOGGLE_REMINDER', id: r.id })}
                  style={[styles.check, r.acknowledged && styles.checkOn]}
                >
                  {r.acknowledged && <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />}
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        {/* Next doctor appointment (§25.3) */}
        {state.nextAppointment && (
          <>
            <Text style={[typography.label, styles.sectionLabel]}>DOCTOR APPOINTMENT</Text>
            <View style={styles.apptCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>{state.nextAppointment.date}</Text>
                <Text style={typography.bodyMuted}>
                  {state.nextAppointment.doctorName} · {state.nextAppointment.hospital}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Daily routine (§15) */}
        <Text style={[typography.label, styles.sectionLabel]}>DAILY ROUTINE</Text>
        <View style={styles.group}>
          {state.tasks.map((task) => (
            <Pressable
              key={task.id}
              style={[styles.card, task.done && styles.cardDone]}
              onPress={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
            >
              <View style={[styles.check, task.done && styles.checkOn]}>
                {task.done && <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, task.done && styles.strike]}>{task.title}</Text>
                <Text style={typography.bodyMuted}>{task.time}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomNav active="Alerts" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.xs },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  group: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cardDone: { backgroundColor: colors.surfaceMuted },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  strike: { textDecorationLine: 'line-through', color: colors.textMuted },
});
