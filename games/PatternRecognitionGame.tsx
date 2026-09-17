import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import GameShell from '../components/GameShell';
import { ShellGameProps } from './shellTypes';

// The clock hand always rests on one of four positions (spec-friendly: no
// reading of numbers needed, just "where does it point"). Degrees clockwise
// from 12 o'clock.
const POSITIONS = [0, 90, 180, 270];
const POSITION_LABEL: Record<number, string> = { 0: '12', 90: '3', 180: '6', 270: '9' };

export const PATTERN_RECOGNITION_INTRO = "This game is about spotting what comes next in a pattern.";
export const PATTERN_RECOGNITION_STEPS = [
  'Watch how the clock hand moves — for example, first at 12, then at 3, then at 6.',
  'Notice which way it keeps turning each time.',
  'Pick the clock face that shows where the hand should go next.',
  "There's no rush — take a moment to spot the rule before you answer.",
];

const FACTS = [
  'Bihu, celebrated across Assam, marks the changing seasons of the farming year.',
  "Sikkim's monasteries have kept centuries of Himalayan Buddhist tradition alive.",
  'Manipur’s Loktak Lake floats on circular islands of matted plants called phumdis.',
];

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

interface Round {
  sequence: number[];
  options: number[];
  correctIndex: number;
}

/** Builds a rotating-clock pattern; difficulty scales the sequence length + how many turn-directions it mixes. */
function buildRound(level: number): Round {
  const shownCount = level === 1 ? 3 : level === 2 ? 3 : 4;
  const optionCount = level === 1 ? 3 : 4;
  const steps = level === 1 ? [90] : level === 2 ? [90, 180, -90] : [90, -90, 180];
  const step = steps[Math.floor(Math.random() * steps.length)];

  const start = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
  const sequence: number[] = [];
  let cur = start;
  for (let i = 0; i < shownCount; i++) {
    sequence.push(norm(cur));
    cur += step;
  }
  const correctAnswer = norm(cur);

  const distractors = shuffle(POSITIONS.filter((p) => p !== correctAnswer));
  const options = shuffle([correctAnswer, ...distractors.slice(0, optionCount - 1)]);
  return { sequence, options, correctIndex: options.indexOf(correctAnswer) };
}

function ClockFace({
  angle,
  size = 48,
  tone = '#2E5B4E',
  dim,
}: {
  angle: number;
  size?: number;
  tone?: string;
  dim?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const theta = (angle * Math.PI) / 180;
  const hx = cx + r * Math.sin(theta);
  const hy = cy - r * Math.cos(theta);
  const color = dim ? '#B7AC98' : tone;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={size * 0.46} fill="none" stroke={color} strokeWidth={2.5} />
      {POSITIONS.map((p) => {
        const t = (p * Math.PI) / 180;
        const tx = cx + (size * 0.46 - 3) * Math.sin(t);
        const ty = cy - (size * 0.46 - 3) * Math.cos(t);
        return <Circle key={p} cx={tx} cy={ty} r={1.6} fill={color} />;
      })}
      <Line x1={cx} y1={cy} x2={hx} y2={hy} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={2.4} fill={color} />
    </Svg>
  );
}

export default function PatternRecognitionGame({
  level,
  stage,
  totalStages,
  avatarId,
  onComplete,
  onBack,
}: ShellGameProps) {
  const [seed, setSeed] = useState(0);
  const round = useMemo(() => buildRound(level), [level, seed]);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [hintOn, setHintOn] = useState(false);

  const answered = chosenIndex !== null;
  const isCorrect = answered && chosenIndex === round.correctIndex;

  function choose(index: number) {
    if (answered) return;
    setChosenIndex(index);
    const correct = index === round.correctIndex;
    const accuracy = correct ? 100 : 0;
    setTimeout(() => onComplete({ accuracy, leveledUp: accuracy >= 70 }), 900);
  }

  function reset() {
    setSeed((s) => s + 1);
    setChosenIndex(null);
  }

  function hint() {
    if (answered) return;
    setHintOn(true);
    setTimeout(() => setHintOn(false), 900);
  }

  return (
    <GameShell
      title="Pattern Recognition"
      subtitle="Find what comes next"
      fact={FACTS[(stage - 1) % FACTS.length]}
      tip={
        !answered
          ? 'Watch which way the hand turns, then pick what comes next.'
          : isCorrect
          ? 'Well spotted!'
          : "Close — here's the pattern again next round."
      }
      progress={(stage - 1 + (answered ? 1 : 0)) / totalStages}
      avatarId={avatarId}
      onBack={onBack}
      onHint={hint}
      onRestart={reset}
    >
      <Text style={styles.caption}>
        Round {stage} of {totalStages}  ·  What comes next?
      </Text>

      <View style={styles.sequenceRow}>
        {round.sequence.map((angle, i) => (
          <View key={i} style={styles.sequenceItem}>
            <ClockFace angle={angle} />
            <Text style={styles.posLabel}>{POSITION_LABEL[angle]}</Text>
          </View>
        ))}
        <View style={styles.sequenceItem}>
          <View style={[styles.questionCircle, hintOn && styles.questionCircleHint]}>
            {hintOn ? <ClockFace angle={round.sequence[round.sequence.length - 1]} size={40} /> : (
              <Text style={styles.questionMark}>?</Text>
            )}
          </View>
          <Text style={styles.posLabel}> </Text>
        </View>
      </View>

      <View style={styles.optionsRow}>
        {round.options.map((angle, i) => {
          const isChosen = chosenIndex === i;
          const showCorrect = answered && i === round.correctIndex;
          const showWrong = answered && isChosen && i !== round.correctIndex;
          return (
            <Pressable
              key={i}
              onPress={() => choose(i)}
              style={[styles.option, showCorrect && styles.optionCorrect, showWrong && styles.optionWrong]}
            >
              <ClockFace angle={angle} size={44} dim={answered && !showCorrect && !showWrong} />
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 12.5, color: '#8A7856', fontWeight: '800', marginBottom: 14, letterSpacing: 0.3 },
  sequenceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 14, marginBottom: 22 },
  sequenceItem: { alignItems: 'center', gap: 4 },
  posLabel: { fontSize: 11, fontWeight: '700', color: '#8A7856' },
  questionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#C9B58C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCircleHint: { borderStyle: 'solid', borderColor: '#E0982E' },
  questionMark: { fontSize: 22, fontWeight: '800', color: '#8A7856' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  option: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#DDCBA5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCorrect: { borderColor: '#3E8E5A', backgroundColor: '#E7F0E3' },
  optionWrong: { borderColor: '#D9755B', backgroundColor: '#FBE7E2' },
});
