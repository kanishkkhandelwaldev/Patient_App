import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Rule Switch (spec §13.7). The patient is shown a grid of mixed objects and
 * told which kind to tap ("tap all the flowers"). After a couple of rounds the
 * rule changes ("now tap all the animals"), testing attention + the ability to
 * switch rules. Difficulty scales grid size and category overlap.
 */

type Category = 'flower' | 'animal' | 'food';

const POOL: Record<Category, string[]> = {
  flower: ['🌸', '🌻', '🌷', '🌹', '🏵️', '💐'],
  animal: ['🐘', '🐄', '🦚', '🐈', '🐐', '🦜'],
  food: ['🍚', '🥭', '🍞', '🍌', '🫓', '🥥'],
};

const RULE_ORDER: Category[] = ['flower', 'animal', 'food'];
const LABEL: Record<Category, string> = { flower: 'flowers', animal: 'animals', food: 'food items' };

interface Tile {
  key: string;
  emoji: string;
  category: Category;
}

function buildGrid(size: number): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < size; i++) {
    const category = RULE_ORDER[Math.floor(Math.random() * RULE_ORDER.length)];
    const set = POOL[category];
    tiles.push({ key: `t${i}`, emoji: set[Math.floor(Math.random() * set.length)], category });
  }
  return tiles;
}

export default function RuleSwitchGame({
  level,
  onComplete,
}: {
  level: number;
  onComplete: (result: { accuracy: number; leveledUp: boolean }) => void;
}) {
  const gridSize = level === 1 ? 9 : level === 2 ? 12 : 16;
  const columns = level === 3 ? 4 : 3;
  const totalRounds = 3;

  const [roundNum, setRoundNum] = useState(1);
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);

  const rule = RULE_ORDER[(roundNum - 1) % RULE_ORDER.length];
  const grid = useMemo(() => buildGrid(gridSize), [roundNum, gridSize]);
  const targets = useMemo(() => grid.filter((t) => t.category === rule).map((t) => t.key), [grid, rule]);

  function tap(tile: Tile) {
    if (tapped.has(tile.key)) return;
    const next = new Set(tapped);
    next.add(tile.key);
    setTapped(next);

    let h = hits;
    let m = misses;
    if (tile.category === rule) h += 1;
    else m += 1;
    setHits(h);
    setMisses(m);

    const foundAll = targets.every((k) => next.has(k));
    if (foundAll) {
      const roundTargets = targets.length;
      setTotalTargets((tt) => tt + roundTargets);
      setTimeout(() => {
        if (roundNum >= totalRounds) {
          const denom = totalTargets + roundTargets + m;
          const accuracy = denom > 0 ? Math.round((h / denom) * 100) : 100;
          onComplete({ accuracy, leveledUp: accuracy >= 70 });
        } else {
          setTapped(new Set());
          setRoundNum((r) => r + 1);
        }
      }, 550);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={typography.bodyMuted}>
        Round {roundNum} of {totalRounds}
      </Text>
      <View style={styles.ruleBanner}>
        <Text style={styles.ruleText}>Tap all the {LABEL[rule]}</Text>
      </View>
      {roundNum > 1 && (
        <Text style={styles.switchNote}>The rule just changed — watch closely!</Text>
      )}

      <View style={[styles.grid, { width: columns * 72 }]}>
        {grid.map((tile) => {
          const isTapped = tapped.has(tile.key);
          const correct = tile.category === rule;
          return (
            <Pressable
              key={tile.key}
              onPress={() => tap(tile)}
              style={[
                styles.tile,
                isTapped && correct && styles.tileHit,
                isTapped && !correct && styles.tileMiss,
              ]}
            >
              <Text style={styles.emoji}>{tile.emoji}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={typography.bodyMuted}>Correct taps: {hits}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  ruleBanner: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  ruleText: { color: colors.textOnPrimary, fontWeight: '800', fontSize: 17 },
  switchNote: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  tile: {
    width: 62,
    height: 62,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileHit: { borderColor: colors.success, backgroundColor: colors.surfaceMuted },
  tileMiss: { borderColor: colors.danger, opacity: 0.5 },
  emoji: { fontSize: 30 },
});
