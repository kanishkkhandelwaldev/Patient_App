import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GameShell from '../components/GameShell';
import { MotifIcon } from '../components/GameArt';
import { MOTIFS } from './motifs';
import { ShellGameProps } from './shellTypes';

// Three real difficulty steps (spec §10), mirroring Memory Flip's shape:
// more pictures to hold in mind, less study time, at the harder levels.
const LEVELS: Record<number, { count: number; columns: number; studyMs: number; label: string }> = {
  1: { count: 4, columns: 2, studyMs: 6000, label: 'Easy' },
  2: { count: 6, columns: 3, studyMs: 6500, label: 'Medium' },
  3: { count: 8, columns: 4, studyMs: 7000, label: 'Hard' },
};

export const SEQUENCE_RECALL_INTRO = "Let's try Sequence Recall — a little memory game with pictures.";
export const SEQUENCE_RECALL_STEPS = [
  'A few numbered pictures appear on the board — take a moment to study their order.',
  'After a little while they turn face down.',
  'Tap them back in the same order, starting from number 1.',
  'Take your time — there is no clock rushing you.',
];

const FACTS = [
  "The hornbill is Nagaland's pride and appears in tribal dances across the state.",
  "Meghalaya's living root bridges are grown by hand, taking years to strengthen.",
  'Assam is home to more than half the world’s wild one-horned rhinos.',
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
  number: number; // 1-indexed recall order
}

export default function SequenceRecallGame({
  level,
  stage,
  totalStages,
  avatarId,
  onComplete,
  onBack,
}: ShellGameProps) {
  const cfg = LEVELS[level] ?? LEVELS[1];
  const [seed, setSeed] = useState(0);

  const cards = useMemo<Card[]>(() => {
    const chosen = shuffle(MOTIFS).slice(0, cfg.count);
    return shuffle(chosen).map((motif, i) => ({ key: `${motif.id}-${i}`, motif, number: i + 1 }));
  }, [cfg.count, seed]);

  const [phase, setPhase] = useState<'study' | 'input' | 'done'>('study');
  const [tappedOrder, setTappedOrder] = useState<number[]>([]); // card indices, in tap order
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);

  // Study phase resets whenever a fresh round of cards is dealt.
  useEffect(() => {
    setPhase('study');
    setTappedOrder([]);
    setWrongIndex(null);
    const t = setTimeout(() => setPhase('input'), cfg.studyMs);
    return () => clearTimeout(t);
  }, [cards, cfg.studyMs]);

  const nextExpectedNumber = tappedOrder.length + 1;

  function press(i: number) {
    if (phase !== 'input' || tappedOrder.includes(i)) return;
    if (cards[i].number === nextExpectedNumber) {
      const next = [...tappedOrder, i];
      setTappedOrder(next);
      if (next.length === cards.length) finish(next.length);
    } else {
      setWrongIndex(i);
      finish(tappedOrder.length);
    }
  }

  function finish(correctCount: number) {
    setPhase('done');
    const accuracy = Math.round((correctCount / cards.length) * 100);
    setTimeout(() => onComplete({ accuracy, leveledUp: accuracy >= 70 }), 900);
  }

  function reset() {
    setSeed((s) => s + 1);
  }

  function hint() {
    if (phase !== 'input') return;
    const target = cards.findIndex((c) => c.number === nextExpectedNumber);
    if (target < 0) return;
    setHintIndex(target);
    setTimeout(() => setHintIndex(null), 900);
  }

  const revealAll = phase === 'done';

  return (
    <GameShell
      title="Sequence Recall"
      subtitle="Watch the trail, then tell it back in order"
      fact={FACTS[(stage - 1) % FACTS.length]}
      tip={
        phase === 'study'
          ? 'Study the pictures — they will turn over soon.'
          : phase === 'input'
          ? `Tap them back in order — next is number ${nextExpectedNumber}.`
          : wrongIndex !== null
          ? "Not quite — here is the order it was."
          : 'Perfectly recalled — wonderful!'
      }
      progress={(stage - 1 + tappedOrder.length / Math.max(cards.length, 1)) / totalStages}
      avatarId={avatarId}
      onBack={onBack}
      onHint={hint}
      onRestart={reset}
    >
      <Text style={styles.caption}>
        Round {stage} of {totalStages}  ·  {cfg.label}  ·  {cfg.count} pictures
      </Text>
      <View style={[styles.grid, { width: CARD * cfg.columns + 8 * (cfg.columns - 1) }]}>
        {cards.map((card, i) => {
          const isTapped = tappedOrder.includes(i);
          const isWrong = wrongIndex === i;
          const isHint = hintIndex === i;
          const revealed = phase === 'study' || isTapped || isWrong || isHint || revealAll;
          return (
            <Pressable
              key={card.key}
              onPress={() => press(i)}
              style={[
                styles.card,
                revealed ? { backgroundColor: card.motif.tint, borderColor: card.motif.ink } : styles.cardBack,
                isTapped && styles.cardTapped,
                isWrong && styles.cardWrong,
              ]}
            >
              {revealed ? (
                <>
                  <View style={[styles.numberBadge, { backgroundColor: card.motif.ink }]}>
                    <Text style={styles.numberBadgeText}>{card.number}</Text>
                  </View>
                  <MotifIcon name={card.motif.id} size={28} color={card.motif.ink} />
                  <Text style={[styles.cardLabel, { color: card.motif.ink }]} numberOfLines={1}>
                    {card.motif.label}
                  </Text>
                </>
              ) : (
                <View style={styles.compass}>
                  <Ionicons name="ellipse-outline" size={22} color="rgba(255,255,255,0.45)" />
                  <Ionicons name="help" size={14} color="rgba(255,255,255,0.55)" style={styles.compassMark} />
                </View>
              )}

              {isTapped && !isWrong && (
                <Ionicons name="checkmark-circle" size={16} color="#3E8E5A" style={styles.checkBadge} />
              )}
              {isWrong && <Ionicons name="close-circle" size={16} color="#D9755B" style={styles.checkBadge} />}
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}

const CARD = 70;

const styles = StyleSheet.create({
  caption: { fontSize: 12.5, color: '#8A7856', fontWeight: '800', marginBottom: 10, letterSpacing: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  card: {
    width: CARD,
    height: CARD + 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cardBack: { backgroundColor: '#25514A', borderColor: '#1C3F3A' },
  cardTapped: { opacity: 0.92 },
  cardWrong: { opacity: 0.92 },
  cardLabel: { fontSize: 8.5, fontWeight: '800' },
  compass: { alignItems: 'center', justifyContent: 'center' },
  compassMark: { position: 'absolute' },
  checkBadge: { position: 'absolute', top: 3, right: 3 },
  numberBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
