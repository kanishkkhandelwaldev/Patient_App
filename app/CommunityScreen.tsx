import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { COMMUNITY_CATEGORIES, CommunityCategory, rankScore } from '../data/mock';
import { useApp } from '../state/AppContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Community'>;

// One warm accent per category so a card is recognisable at a glance,
// without having to read the small badge text first.
const CATEGORY_COLOR: Record<CommunityCategory, string> = {
  'positive-moments': colors.accent,
  'caregiving-tips': colors.primary,
  experiences: colors.secondary,
  routines: colors.primaryDark,
};

export default function CommunityScreen({ navigation }: Props) {
  const { state, dispatch } = useApp();
  const [activeCategory, setActiveCategory] = useState<CommunityCategory | 'all'>('all');
  // Patient engagement is intentionally "Limited" per the role table — a
  // simple appreciation tap, not commenting or posting (that stays with
  // caregivers in the portal).
  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Stop any narration in progress if the patient leaves this screen.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const posts = useMemo(() => {
    const filtered =
      activeCategory === 'all' ? state.community : state.community.filter((p) => p.category === activeCategory);
    // Ranking: higher-engagement content surfaces first (spec §23).
    return [...filtered].sort((a, b) => rankScore(b) - rankScore(a));
  }, [activeCategory, state.community]);

  function toggleReaction(id: string) {
    const willReact = !reactedIds.has(id);
    setReactedIds((prev) => {
      const next = new Set(prev);
      if (willReact) next.add(id);
      else next.delete(id);
      return next;
    });
    dispatch({ type: 'REACT_TO_POST', id, reacted: willReact });
  }

  function toggleListen(id: string, title: string, excerpt: string) {
    if (speakingId === id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(id);
    Speech.speak(`${title}. ${excerpt}`, {
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Community Stories" />
      <View style={styles.moderationBanner}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.secondary} />
        <Text style={styles.moderationText}>Every story is written by a caregiver and checked before you see it.</Text>
      </View>

      <View style={styles.chipRow}>
        <FilterChip label="All" selected={activeCategory === 'all'} onPress={() => setActiveCategory('all')} />
        {COMMUNITY_CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            selected={activeCategory === c.id}
            onPress={() => setActiveCategory(c.id)}
          />
        ))}
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const reacted = reactedIds.has(item.id);
          const speaking = speakingId === item.id;
          const category = COMMUNITY_CATEGORIES.find((c) => c.id === item.category);
          const accent = CATEGORY_COLOR[item.category] ?? colors.primary;
          return (
            <View style={[styles.card, { borderLeftColor: accent }]}>
              <View style={styles.cardTopRow}>
                <View style={[styles.categoryBadge, { backgroundColor: accent + '22' }]}>
                  <Ionicons name={(category?.icon ?? 'sparkles-outline') as any} size={16} color={accent} />
                  <Text style={[styles.categoryBadgeText, { color: accent }]}>{category?.label}</Text>
                </View>
                <View style={styles.languageBadge}>
                  <Text style={styles.languageBadgeText}>{item.language}</Text>
                </View>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.excerpt}>{item.excerpt}</Text>
              <Text style={styles.author}>— {item.author}, Caregiver</Text>

              <View style={styles.cardBottomRow}>
                <Pressable
                  style={[styles.actionBtn, speaking && styles.actionBtnOn]}
                  onPress={() => toggleListen(item.id, item.title, item.excerpt)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={speaking ? 'volume-high' : 'volume-medium-outline'}
                    size={22}
                    color={speaking ? colors.textOnPrimary : colors.text}
                  />
                  <Text style={[styles.actionBtnText, speaking && { color: colors.textOnPrimary }]}>
                    {speaking ? 'Stop' : 'Listen'}
                  </Text>
                </Pressable>

                <Pressable style={styles.actionBtn} onPress={() => toggleReaction(item.id)} hitSlop={8}>
                  <Ionicons
                    name={reacted ? 'heart' : 'heart-outline'}
                    size={22}
                    color={reacted ? colors.danger : colors.text}
                  />
                  <Text style={styles.actionBtnText}>{item.upvotes}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={typography.bodyMuted}>No stories in this category yet.</Text>}
      />
      <BottomNav active="Community" navigation={navigation} />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected]}>
      {icon && <Ionicons name={icon as any} size={16} color={selected ? colors.textOnPrimary : colors.textMuted} />}
      <Text style={[styles.filterChipText, selected && { color: colors.textOnPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  moderationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  moderationText: { fontSize: 15, fontWeight: '500', color: colors.textMuted, flex: 1, lineHeight: 20 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipSelected: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  filterChipText: { fontSize: 15, color: colors.textMuted, fontWeight: '700' },

  list: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderLeftWidth: 6,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  categoryBadgeText: { fontSize: 13, fontWeight: '800' },
  languageBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
  },
  languageBadgeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },

  title: { fontSize: 21, fontWeight: '800', color: colors.text, lineHeight: 28, marginTop: 2 },
  excerpt: { fontSize: 17, fontWeight: '500', color: colors.text, lineHeight: 25 },
  author: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 2 },

  cardBottomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  actionBtnOn: { backgroundColor: colors.primary },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
