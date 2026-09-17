import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/theme';
import { AvatarId } from '../state/AppContext';
import Avatar from './Avatar';
import { SunsetBackground } from './GameArt';
import PrimaryButton from './PrimaryButton';

/**
 * The companion introduces a game before the first round — avatar + a plain
 * "how to play" walk-through + a start button. Shown once per session; the
 * rounds that follow don't repeat it.
 */
export default function GameIntro({
  title,
  intro,
  steps,
  avatarId,
  onStart,
  onBack,
}: {
  title: string;
  intro: string;
  steps: string[];
  avatarId: AvatarId | null;
  onStart: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe}>
      <SunsetBackground />

      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarRow}>
          <Avatar id={avatarId} size={92} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{intro}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to play</Text>
          {steps.map((line, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{line}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PrimaryButton label="Okay, I'm ready" onPress={onStart} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1E4A44' },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 22, fontWeight: '800' },

  // `flex: 1` on the ScrollView itself (not just its content) keeps the footer
  // button pinned on screen — without it, longer step lists could push the
  // "Okay, I'm ready" button below the fold.
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bubble: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  bubbleText: { fontSize: 16, color: colors.text, fontWeight: '600', lineHeight: 22 },

  card: { backgroundColor: '#FFF', borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    backgroundColor: colors.accent,
    overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: 16, color: colors.text, lineHeight: 23 },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
