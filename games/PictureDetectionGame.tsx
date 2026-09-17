import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { colors, radii, spacing, typography } from '../theme/theme';

/**
 * Picture Detection & Recall (spec §13.8). A simple drawn scene is shown for a
 * few seconds, then hidden. The patient answers recall questions about what
 * they saw. `level` controls how long the scene is shown and how many
 * questions are asked (more objects / distractors at higher levels).
 */

interface SceneConfig {
  personColor: string;
  hasTree: boolean;
  flowers: number;
  hasSun: boolean;
  houseColor: string;
  hasBird: boolean;
}

function randomScene(): SceneConfig {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  return {
    personColor: pick(['#C4632C', '#3E7C6B', '#6C4FD6']),
    hasTree: Math.random() > 0.4,
    flowers: pick([0, 2, 3]),
    hasSun: Math.random() > 0.3,
    houseColor: pick(['#E07A3F', '#4FA8D8', '#B15D8C']),
    hasBird: Math.random() > 0.5,
  };
}

const COLOR_NAME: Record<string, string> = {
  '#C4632C': 'orange',
  '#3E7C6B': 'green',
  '#6C4FD6': 'purple',
  '#E07A3F': 'orange',
  '#4FA8D8': 'blue',
  '#B15D8C': 'pink',
};

function Scene({ s }: { s: SceneConfig }) {
  return (
    <Svg width={280} height={200} viewBox="0 0 280 200">
      <Rect x={0} y={0} width={280} height={200} rx={12} fill="#EAF3F0" />
      <Rect x={0} y={150} width={280} height={50} fill="#CDE3D8" />
      {s.hasSun && <Circle cx={240} cy={40} r={20} fill="#F2B441" />}
      {/* house */}
      <Rect x={30} y={90} width={70} height={60} fill={s.houseColor} />
      <Path d="M25,90 L65,55 L105,90 Z" fill="#8C6E4B" />
      <Rect x={55} y={115} width={20} height={35} fill="#5A3E2B" />
      {/* tree */}
      {s.hasTree && (
        <G>
          <Rect x={175} y={100} width={12} height={50} fill="#8C6E4B" />
          <Circle cx={181} cy={92} r={28} fill="#3E7C6B" />
        </G>
      )}
      {/* person */}
      <Circle cx={135} cy={110} r={10} fill="#F1C9A5" />
      <Rect x={127} y={120} width={16} height={30} rx={4} fill={s.personColor} />
      {/* flowers */}
      {Array.from({ length: s.flowers }).map((_, i) => (
        <Circle key={i} cx={120 + i * 18} cy={165} r={5} fill="#D64545" />
      ))}
      {/* bird */}
      {s.hasBird && (
        <Path d="M60,40 q6,-8 12,0 q6,-8 12,0" stroke="#6B6878" strokeWidth={2} fill="none" />
      )}
    </Svg>
  );
}

interface QA {
  question: string;
  options: string[];
  correct: number;
}

function buildQuestions(s: SceneConfig, count: number): QA[] {
  const all: QA[] = [
    {
      question: 'Was there a tree in the picture?',
      options: ['Yes', 'No'],
      correct: s.hasTree ? 0 : 1,
    },
    {
      question: 'What colour was the house?',
      options: ['orange', 'blue', 'pink'],
      correct: ['orange', 'blue', 'pink'].indexOf(COLOR_NAME[s.houseColor]),
    },
    {
      question: 'Was the sun shining?',
      options: ['Yes', 'No'],
      correct: s.hasSun ? 0 : 1,
    },
    {
      question: 'How many flowers were there?',
      options: ['None', '2', '3'],
      correct: s.flowers === 0 ? 0 : s.flowers === 2 ? 1 : 2,
    },
    {
      question: 'Was there a bird in the sky?',
      options: ['Yes', 'No'],
      correct: s.hasBird ? 0 : 1,
    },
    {
      question: 'What colour clothes was the person wearing?',
      options: ['orange', 'green', 'purple'],
      correct: ['orange', 'green', 'purple'].indexOf(COLOR_NAME[s.personColor]),
    },
  ];
  return all.slice(0, count);
}

export default function PictureDetectionGame({
  level,
  onComplete,
}: {
  level: number;
  onComplete: (result: { accuracy: number; leveledUp: boolean }) => void;
}) {
  const scene = useMemo(randomScene, []);
  const viewSeconds = level === 1 ? 6 : level === 2 ? 5 : 4;
  const questionCount = level === 1 ? 3 : level === 2 ? 4 : 5;
  const questions = useMemo(() => buildQuestions(scene, questionCount), [scene, questionCount]);

  const [phase, setPhase] = useState<'view' | 'ask'>('view');
  const [secondsLeft, setSecondsLeft] = useState(viewSeconds);
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const answeredRef = useRef(0);

  useEffect(() => {
    if (phase !== 'view') return;
    if (secondsLeft <= 0) {
      setPhase('ask');
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const isRight = i === questions[qIndex].correct;
    const nextCorrect = isRight ? correct + 1 : correct;
    if (isRight) setCorrect(nextCorrect);
    answeredRef.current += 1;

    setTimeout(() => {
      if (qIndex >= questions.length - 1) {
        const accuracy = Math.round((nextCorrect / questions.length) * 100);
        onComplete({ accuracy, leveledUp: accuracy >= 70 });
      } else {
        setPicked(null);
        setQIndex((q) => q + 1);
      }
    }, 650);
  }

  if (phase === 'view') {
    return (
      <View style={styles.wrap}>
        <Text style={typography.h2}>Look closely…</Text>
        <Scene s={scene} />
        <Text style={typography.bodyMuted}>Hiding in {secondsLeft}s</Text>
      </View>
    );
  }

  const q = questions[qIndex];
  return (
    <View style={styles.wrap}>
      <Text style={typography.bodyMuted}>
        Question {qIndex + 1} of {questions.length}
      </Text>
      <Text style={[typography.h2, styles.q]}>{q.question}</Text>
      <View style={styles.options}>
        {q.options.map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => answer(i)}
            style={[
              styles.option,
              picked !== null && i === q.correct && styles.optionCorrect,
              picked === i && i !== q.correct && styles.optionWrong,
            ]}
          >
            <Text style={typography.body}>{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  q: { textAlign: 'center' },
  options: { gap: spacing.sm, alignSelf: 'stretch' },
  option: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.surfaceMuted },
  optionWrong: { borderColor: colors.danger },
});
