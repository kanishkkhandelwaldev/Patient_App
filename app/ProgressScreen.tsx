import React from 'react';
import { ScrollView, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import ProgressBar from '../components/ProgressBar';
import WeeklyAccuracyChart from '../components/WeeklyAccuracyChart';
import { useApp } from '../state/AppContext';
import { GAMES, getActiveGames } from '../data/games';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export default function ProgressScreen({ navigation }: Props) {
  const { state } = useApp();
  const activeGames = getActiveGames(state.milestone);
  const totalSessions = Object.values(state.progress).length;
  const overallAvgAccuracy = totalSessions
    ? Math.round(
        Object.values(state.progress).reduce((sum, p) => sum + p.bestAccuracy, 0) / totalSessions
      )
    : 0;

  // Last 7 calendar days, marking which ones have a completed-set record.
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const record = state.history.find((h) => h.date === iso);
    return { date: d, iso, done: !!record, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="My Progress" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary tiles */}
        <View style={styles.summaryRow}>
          <SummaryTile icon="flame" label="Day Streak" value={String(state.streak)} color={colors.accent} />
          <SummaryTile icon="stats-chart" label="Avg Accuracy" value={`${overallAvgAccuracy}%`} color={colors.secondary} />
          <SummaryTile icon="game-controller" label="Games Unlocked" value={`${activeGames.length}/8`} color={colors.primary} />
        </View>

        {/* Streak calendar */}
        <SectionTitle title="This Week" />
        <View style={styles.calendarRow}>
          {last7.map((day) => (
            <View key={day.iso} style={styles.calendarCol}>
              <Text style={typography.bodyMuted}>{day.label}</Text>
              <View style={[styles.calendarDot, day.done && styles.calendarDotDone]}>
                {day.done && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />}
              </View>
            </View>
          ))}
        </View>

        {/* Weekly accuracy trend */}
        <SectionTitle title="Accuracy Trend" subtitle="Average accuracy across each day's completed set." />
        {state.history.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <WeeklyAccuracyChart history={state.history} />
          </ScrollView>
        ) : (
          <Text style={typography.bodyMuted}>Complete your first daily set to see your trend here.</Text>
        )}

        {/* Per-game breakdown */}
        <SectionTitle title="Game-by-Game" subtitle="Difficulty level persists between sessions and adapts to performance." />
        <View style={{ gap: spacing.sm }}>
          {activeGames.map((game) => {
            const p = state.progress[game.id];
            const level = p?.level ?? 1;
            const bestAccuracy = p?.bestAccuracy ?? 0;
            return (
              <View key={game.id} style={styles.gameRow}>
                <View style={[styles.gameIcon, { backgroundColor: game.color + '22' }]}>
                  <Ionicons name={game.icon as any} size={20} color={game.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.gameRowTop}>
                    <Text style={typography.body}>{game.title}</Text>
                    <Text style={typography.bodyMuted}>Level {level}/3</Text>
                  </View>
                  <ProgressBar value={bestAccuracy} color={game.color} />
                  <Text style={styles.smallMuted}>Best accuracy: {bestAccuracy}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={typography.h2}>{value}</Text>
      <Text style={styles.smallMuted}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      <Text style={typography.h2}>{title}</Text>
      {subtitle && <Text style={typography.bodyMuted}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  smallMuted: { fontSize: 12, color: colors.textMuted },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calendarCol: { alignItems: 'center', gap: spacing.xs },
  calendarDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  gameRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  gameIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gameRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});
