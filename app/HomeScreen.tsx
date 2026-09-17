import React, { useEffect, useRef } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import AvatarTrail from '../components/AvatarTrail';
import PrimaryButton from '../components/PrimaryButton';
import { useApp } from '../state/AppContext';
import { getActiveGames } from '../data/games';
import BottomNav from '../components/BottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { state } = useApp();
  const insets = useSafeAreaInsets();
  const activeGames = getActiveGames(state.milestone);
  const allDoneToday = activeGames.every((g) => state.todayCompletedGameIds.includes(g.id));
  const greeting = state.contentPack.greeting || 'Namaste';

  // When the day's games are all done, scroll the trail down to reveal the chest.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (allDoneToday) {
      const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 450);
      return () => clearTimeout(t);
    }
  }, [allDoneToday]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* NER river-valley photo behind the home screen */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={require('../assets/home-bg.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(251,246,236,0.5)' }]} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyMuted}>{greeting},</Text>
            <Text style={typography.h1}>{state.profile.name || 'Friend'}</Text>
          </View>
          <View style={styles.headerRight}>
            {!state.isOnline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={13} color={colors.textOnPrimary} />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
            <Pressable style={styles.sosPill} onPress={() => navigation.navigate('SOS')} hitSlop={8}>
              <Ionicons name="call" size={15} color={colors.textOnPrimary} />
              <Text style={styles.sosPillText}>SOS</Text>
            </Pressable>
            <View style={styles.streakBox}>
              <Text style={styles.streakTop}>🔥 {state.streak}</Text>
              <Text style={styles.streakCap}>day streak</Text>
            </View>
          </View>
        </View>

        <Text style={[typography.label, styles.sectionLabel]}>TODAY'S TRAINING JOURNEY</Text>
        <AvatarTrail
          games={activeGames}
          completedIds={state.todayCompletedGameIds}
          avatar={state.profile.avatar}
          chestUnlocked={allDoneToday}
          onPressNode={(gameId) => navigation.navigate('GamePlay', { gameId })}
          onPressChest={() => navigation.navigate('MemoryChest')}
        />
      </ScrollView>

      {/* The one main action stays pinned above the nav so it's always in reach. */}
      <View style={styles.ctaBar}>
        {allDoneToday ? (
          <PrimaryButton label="Open Memory Chest 🎁" onPress={() => navigation.navigate('MemoryChest')} />
        ) : (
          <PrimaryButton
            label="Continue Today's Games"
            onPress={() => {
              const next = activeGames.find((g) => !state.todayCompletedGameIds.includes(g.id));
              if (next) navigation.navigate('GamePlay', { gameId: next.id });
            }}
          />
        )}
      </View>

      <BottomNav active="Home" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  offlineText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '600' },
  streakBox: { alignItems: 'center' },
  streakTop: { fontSize: 20, fontWeight: '800', color: colors.text },
  streakCap: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  sosPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.sos,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  sosPillText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  sectionLabel: { paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: 0 },
  ctaBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(251,246,236,0.88)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
