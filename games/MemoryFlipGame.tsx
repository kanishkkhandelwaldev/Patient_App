import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GameShell from '../components/GameShell';
import { MotifIcon } from '../components/GameArt';
import { MOTIFS } from './motifs';
import { ShellGameProps } from './shellTypes';

// Three real difficulty steps (spec §10). GamePlayScreen picks `level` for each
// round from the previous round's score — a weak round drops to an easier level,
// a strong one moves up.
const LEVELS: Record<number, { pairs: number; previewMs: number; flipBackMs: number; label: string }> = {
  1: { pairs: 4, previewMs: 2200, flipBackMs: 1100, label: 'Easy' },
  2: { pairs: 6, previewMs: 1200, flipBackMs: 850, label: 'Medium' },
  3: { pairs: 8, previewMs: 0, flipBackMs: 600, label: 'Hard' },
};

export const MEMORY_FLIP_INTRO = 'Let me show you how Memory Flip works. It is gentle — just matching pictures.';
export const MEMORY_FLIP_STEPS = [
  'Every picture appears twice. Your job is to find each matching pair.',
  'Tap a card to turn it over, then tap a second card.',
  'If they match, they stay open with a green tick. If not, they turn back — try to remember where they were.',
  'Open every pair to finish the round. There is no timer, so take your time.',
];

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

interface Card {
  key: string;
  motif: (typeof MOTIFS)[number];
}

export default function MemoryFlipGame({ level, stage, totalStages, avatarId, onComplete, onBack }: ShellGameProps) {
  const cfg = LEVELS[level] ?? LEVELS[1];
  const [seed, setSeed] = useState(0); // bump to reshuffle

  const cards = useMemo<Card[]>(() => {
    const chosen = shuffle(MOTIFS).slice(0, cfg.pairs);
    return shuffle([...chosen, ...chosen].map((m, i) => ({ key: `${m.id}-${i}`, motif: m })));
  }, [cfg.pairs, seed]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hintPair, setHintPair] = useState<number[]>([]);
  const [preview, setPreview] = useState(cfg.previewMs > 0);

  // Brief look at the whole board before it hides — longer on the easy level.
  useEffect(() => {
    if (cfg.previewMs <= 0) {
      setPreview(false);
      return;
    }
    setPreview(true);
    const t = setTimeout(() => setPreview(false), cfg.previewMs);
    return () => clearTimeout(t);
  }, [cfg.previewMs, seed]);

  const done = matched.size === cards.length && cards.length > 0;

  function reset() {
    setFlipped([]);
    setMatched(new Set());
    setWrong([]);
    setAttempts(0);
    setBusy(false);
    setHintPair([]);
    setSeed((s) => s + 1);
  }

  function press(i: number) {
    if (preview || busy || flipped.includes(i) || matched.has(cards[i].key)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length < 2) return;

    setBusy(true);
    setAttempts((a) => a + 1);
    const [a, b] = next;
    const isMatch = cards[a].motif.id === cards[b].motif.id;
    setTimeout(() => {
      if (isMatch) {
        setMatched((prev) => {
          const u = new Set(prev);
          u.add(cards[a].key);
          u.add(cards[b].key);
          if (u.size === cards.length) {
            const accuracy = Math.round((cfg.pairs / Math.max(attempts + 1, cfg.pairs)) * 100);
            setTimeout(() => onComplete({ accuracy, leveledUp: accuracy >= 70 }), 550);
          }
          return u;
        });
        setFlipped([]);
        setBusy(false);
      } else {
        setWrong(next);
        setTimeout(() => {
          setWrong([]);
          setFlipped([]);
          setBusy(false);
        }, cfg.flipBackMs);
      }
    }, 650);
  }

  function hint() {
    if (busy || preview) return;
    for (let i = 0; i < cards.length; i++) {
      if (matched.has(cards[i].key)) continue;
      for (let j = i + 1; j < cards.length; j++) {
        if (cards[i].motif.id === cards[j].motif.id && !matched.has(cards[j].key)) {
          setHintPair([i, j]);
          setTimeout(() => setHintPair([]), 900);
          return;
        }
      }
    }
  }

  function undo() {
    if (busy) return;
    setFlipped([]);
  }

  return (
    <GameShell
      title="Memory Flip"
      subtitle="Find every matching pair"
      regionTrail={false}
      tip={
        preview
          ? 'Look carefully — the cards will turn over in a moment.'
          : done
          ? 'Every pair found — wonderful!'
          : 'Nice and steady. There is no clock rushing you.'
      }
      progress={(stage - 1 + matched.size / Math.max(cards.length, 1)) / totalStages}
      avatarId={avatarId}
      onBack={onBack}
      onUndo={undo}
      onHint={hint}
      onRestart={reset}
    >
      <Text style={styles.caption}>
        Round {stage} of {totalStages}  ·  {cfg.label}  ·  {cfg.pairs} pairs
      </Text>
      <View style={[styles.grid, { width: CARD * 4 + 8 * 3 }]}>
        {cards.map((card, i) => {
          const isMatched = matched.has(card.key);
          const revealed = isMatched || preview || flipped.includes(i) || hintPair.includes(i);
          const isWrong = wrong.includes(i);
          return (
            <Pressable
              key={card.key}
              onPress={() => press(i)}
              style={[
                styles.card,
                revealed ? { backgroundColor: card.motif.tint, borderColor: card.motif.ink } : styles.cardBack,
                isMatched && styles.cardMatched,
              ]}
            >
              {revealed ? (
                <>
                  <MotifIcon name={card.motif.id} size={30} color={card.motif.ink} />
                  <Text style={[styles.cardLabel, { color: card.motif.ink }]} numberOfLines={1}>
                    {card.motif.label}
                  </Text>
                </>
              ) : (
                <View style={styles.compass}>
                  <Ionicons name="ellipse-outline" size={22} color="rgba(255,255,255,0.45)" />
                  <Ionicons name="add" size={16} color="rgba(255,255,255,0.55)" style={styles.compassPlus} />
                </View>
              )}

              {isMatched && <Ionicons name="checkmark-circle" size={18} color="#3E8E5A" style={styles.badge} />}
              {isWrong && <Ionicons name="close-circle" size={18} color="#D9755B" style={styles.badge} />}
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}

const CARD = 74;

const styles = StyleSheet.create({
  caption: { fontSize: 12.5, color: '#8A7856', fontWeight: '800', marginBottom: 10, letterSpacing: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  card: {
    width: CARD,
    height: CARD + 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cardBack: { backgroundColor: '#25514A', borderColor: '#1C3F3A' },
  cardMatched: { opacity: 0.92 },
  cardLabel: { fontSize: 9, fontWeight: '800' },
  compass: { alignItems: 'center', justifyContent: 'center' },
  compassPlus: { position: 'absolute' },
  badge: { position: 'absolute', top: 3, right: 3 },
});
