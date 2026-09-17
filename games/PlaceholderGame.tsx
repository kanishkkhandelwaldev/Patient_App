import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import PrimaryButton from '../components/PrimaryButton';
import { GameDef } from '../data/games';

/**
 * Honest placeholder for games not yet built (Jigsaw, Musical Sequence,
 * Flow Free, Rule Switch, Picture Detection). Keeps the daily-set flow and
 * unlock progression intact so the rest of the app can be demoed/tested,
 * without pretending these are finished game engines.
 */
export default function PlaceholderGame({
  game,
  onComplete,
}: {
  game: GameDef;
  onComplete: (result: { accuracy: number; leveledUp: boolean }) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={game.icon as any} size={48} color={game.color} />
      <Text style={[typography.h2, { textAlign: 'center' }]}>{game.title} is coming soon</Text>
      <Text style={[typography.bodyMuted, { textAlign: 'center' }]}>
        This game's full version isn't built yet in this preview. Tap below to mark it complete for
        today so the rest of the trail keeps working.
      </Text>
      <PrimaryButton label="Mark as done for today" onPress={() => onComplete({ accuracy: 100, leveledUp: false })} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
});
