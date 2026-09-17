import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import { useApp } from '../state/AppContext';
import { fetchGameResults } from '../lib/remote';
import { isRemote } from '../lib/supabase';
import {
  normalize, summarize, radarData, trendData, heatData, compareData, ResultRow,
} from '../lib/cognitive';
import {
  MetricTile, DomainRadar, ReactionAccuracyChart, ConsistencyHeatmap, MemoryCompareBars,
} from '../components/CognitiveCharts';

type Props = NativeStackScreenProps<RootStackParamList, 'CognitiveReport'>;

export default function CognitiveReportScreen({ navigation }: Props) {
  const { state } = useApp();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isRemote || !state.patientId) {
        setLoading(false);
        return;
      }
      const raw = await fetchGameResults(state.patientId, 120);
      if (alive) {
        setRows(normalize(raw));
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.patientId]);

  const summary = summarize(rows);
  const empty = !loading && rows.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Cognitive Report" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.bodyMuted}>
          Performance patterns from {state.profile.name || 'the'}'s training games. Supporting
          information for a doctor — not a diagnosis.
        </Text>

        {loading && (
          <View style={styles.centre}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {empty && (
          <View style={styles.card}>
            <Text style={typography.body}>No session data yet</Text>
            <Text style={typography.bodyMuted}>
              {isRemote
                ? 'Play a few game sets — and make sure supabase/migration_cognitive.sql has been run — and the charts will fill in.'
                : 'Connect the app to the backend (EXPO_PUBLIC_SUPABASE_* in .env) to see the cognitive report.'}
            </Text>
          </View>
        )}

        {!loading && !empty && (
          <>
            {summary && (
              <View style={styles.tileGrid}>
                <MetricTile
                  label="Response time"
                  value={`${(summary.reactionNow / 1000).toFixed(1)}s`}
                  sub={`was ${(summary.reactionThen / 1000).toFixed(1)}s`}
                  warn={summary.reactionNow > summary.reactionThen * 1.15}
                />
                <MetricTile label="Error rate" value={`${summary.errorRate}%`} sub="incorrect interactions" />
                <MetricTile
                  label="Task abandonment"
                  value={`${summary.abandonRate}%`}
                  sub="sessions quit early"
                  warn={summary.abandonRate > 15}
                />
                <MetricTile label="Adaptive threshold" value={`L${summary.threshold}`} sub="highest level sustained" />
              </View>
            )}

            <Section title="Cognitive domains" hint="This week vs baseline — which area is dropping fastest">
              <DomainRadar data={radarData(rows)} />
            </Section>

            <Section title="Response time vs accuracy" hint="Accuracy can hold flat while response time keeps climbing">
              <ReactionAccuracyChart data={trendData(rows)} />
            </Section>

            <Section title="Daily consistency" hint="Highest level sustained each day · grey = session skipped / abandoned">
              <ConsistencyHeatmap weeks={heatData(rows)} />
            </Section>

            <Section title="Memory Chest vs puzzle games" hint="Deep / emotional memory vs short-term task memory">
              <MemoryCompareBars data={compareData(rows)} />
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={typography.h2}>{title}</Text>
      {hint ? <Text style={[typography.bodyMuted, { marginBottom: spacing.md }]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  centre: { paddingVertical: spacing.xxl, alignItems: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
