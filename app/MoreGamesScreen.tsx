import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, radii, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import BottomNav from '../components/BottomNav';
import { useApp } from '../state/AppContext';
import { getActiveGames } from '../data/games';

type Props = NativeStackScreenProps<RootStackParamList, 'MoreGames'>;

const RECREATIONAL_GAMES = [
  { id: 'chess', title: 'Chess', icon: 'trophy-outline' },
  { id: 'solitaire', title: 'Solitaire', icon: 'albums-outline' },
  { id: 'scribble', title: 'Scribble', icon: 'brush-outline' },
  { id: 'word-formation', title: 'Word Formation', icon: 'text-outline' },
  { id: 'crossword', title: 'Crossword', icon: 'grid-outline' },
  { id: 'sudoku', title: 'Sudoku', icon: 'keypad-outline' },
];

export default function MoreGamesScreen({ navigation }: Props) {
  const { state } = useApp();
  const activeGames = getActiveGames(state.milestone);
  const dailySetComplete = activeGames.every((g) => state.todayCompletedGameIds.includes(g.id));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="More Games" />
      {!dailySetComplete && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textOnPrimary} />
          <Text style={styles.lockedText}>Finish today's cognitive training to unlock these.</Text>
        </View>
      )}
      <FlatList
        data={RECREATIONAL_GAMES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={[styles.tile, !dailySetComplete && styles.tileLocked]}>
            <Ionicons
              name={item.icon as any}
              size={32}
              color={dailySetComplete ? colors.secondary : colors.locked}
            />
            <Text style={typography.body}>{item.title}</Text>
            {!dailySetComplete && <Ionicons name="lock-closed" size={14} color={colors.locked} />}
          </View>
        )}
      />
      <BottomNav active="MoreGames" navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textMuted,
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  lockedText: { color: colors.textOnPrimary, fontSize: 13, flex: 1 },
  grid: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 110,
    justifyContent: 'center',
  },
  tileLocked: { opacity: 0.6 },
});
