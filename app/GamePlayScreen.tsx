import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { colors, spacing, typography } from '../theme/theme';
import ScreenHeader from '../components/ScreenHeader';
import PrimaryButton from '../components/PrimaryButton';
import Avatar from '../components/Avatar';
import { SunsetBackground } from '../components/GameArt';
import GameIntro from '../components/GameIntro';
import { GAMES, GameId, getActiveGames } from '../data/games';
import { useApp } from '../state/AppContext';
import MemoryFlipGame, { MEMORY_FLIP_INTRO, MEMORY_FLIP_STEPS } from '../games/MemoryFlipGame';
import FlowFreeGame, { PATH_LINK_INTRO, PATH_LINK_STEPS } from '../games/FlowFreeGame';
import SequenceRecallGame, { SEQUENCE_RECALL_INTRO, SEQUENCE_RECALL_STEPS } from '../games/SequenceRecallGame';
import PatternRecognitionGame, {
  PATTERN_RECOGNITION_INTRO,
  PATTERN_RECOGNITION_STEPS,
} from '../games/PatternRecognitionGame';
import RuleSwitchGame from '../games/RuleSwitchGame';
import PictureDetectionGame from '../games/PictureDetectionGame';
import PlaceholderGame from '../games/PlaceholderGame';
import { ShellGameProps } from '../games/shellTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'GamePlay'>;

const LEVELS_PER_SESSION = 3;

// Games that render inside the full "Northeast" GameShell (own background + chrome).
const SHELL_GAMES: GameId[] = ['memory-flip', 'pattern-recognition', 'sequence-recall', 'flow-free'];

// Each shell game gets its own one-time "how to play" walk-through, shown by GameIntro.
const SHELL_INTRO: Partial<Record<GameId, { intro: string; steps: string[] }>> = {
  'memory-flip': { intro: MEMORY_FLIP_INTRO, steps: MEMORY_FLIP_STEPS },
  'pattern-recognition': { intro: PATTERN_RECOGNITION_INTRO, steps: PATTERN_RECOGNITION_STEPS },
  'sequence-recall': { intro: SEQUENCE_RECALL_INTRO, steps: SEQUENCE_RECALL_STEPS },
  'flow-free': { intro: PATH_LINK_INTRO, steps: PATH_LINK_STEPS },
};

// Guard so the "reminder interrupts a game" demo fires at most once per page load.
let autoReminderFiredThisLoad = false;

export default function GamePlayScreen({ route, navigation }: Props) {
  const { gameId } = route.params;
  const { state, dispatch } = useApp();
  const game = GAMES.find((g) => g.id === gameId)!;
  const savedProgress = state.progress[gameId];
  const startLevel = savedProgress?.level ?? 1;
  const isShell = SHELL_GAMES.includes(gameId);

  const [levelInSession, setLevelInSession] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(startLevel);
  const [sessionDone, setSessionDone] = useState(false);
  const [avgAccuracy, setAvgAccuracy] = useState<number[]>([]);
  const [introSeen, setIntroSeen] = useState(!isShell); // one "how to play" screen per session, shell games only

  // Session timing + abandonment tracking (feeds the Cognitive Report).
  const sessionStartRef = useRef(Date.now());
  const accuraciesRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  accuraciesRef.current = avgAccuracy;

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      // Left mid-session after playing at least one level → cognitive-fatigue signal.
      if (doneRef.current || accuraciesRef.current.length === 0) return;
      const mean = Math.round(
        accuraciesRef.current.reduce((a, b) => a + b, 0) / accuraciesRef.current.length,
      );
      dispatch({
        type: 'RECORD_GAME_RESULT',
        gameId,
        accuracy: mean,
        leveledUp: false,
        abandoned: true,
        reactionMs: Math.round((Date.now() - sessionStartRef.current) / accuraciesRef.current.length),
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, gameId]);

  useEffect(() => {
    if (autoReminderFiredThisLoad) return;
    const hasUnacked = state.reminders.some((r) => !r.acknowledged);
    if (!hasUnacked) return;
    const t = setTimeout(() => {
      autoReminderFiredThisLoad = true;
      dispatch({ type: 'FIRE_REMINDER' });
    }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLevelComplete(result: { accuracy: number; leveledUp: boolean }) {
    const nextAccuracyList = [...avgAccuracy, result.accuracy];
    setAvgAccuracy(nextAccuracyList);

    if (levelInSession >= LEVELS_PER_SESSION) {
      const meanAccuracy = Math.round(nextAccuracyList.reduce((a, b) => a + b, 0) / nextAccuracyList.length);
      doneRef.current = true;
      dispatch({
        type: 'RECORD_GAME_RESULT',
        gameId,
        accuracy: meanAccuracy,
        leveledUp: meanAccuracy >= 70,
        reactionMs: Math.round((Date.now() - sessionStartRef.current) / LEVELS_PER_SESSION),
      });
      setSessionDone(true);

      const activeGames = getActiveGames(state.milestone);
      const willHaveCompleted = new Set([...state.todayCompletedGameIds, gameId]);
      if (activeGames.every((g) => willHaveCompleted.has(g.id))) {
        setTimeout(() => dispatch({ type: 'RESET_DAILY_SET' }), 300);
      }
    } else {
      // Adapt the next round's difficulty to how this one went (spec §10):
      //  strong → harder, weak → easier, a very poor round drops straight to easy.
      setCurrentLevel((lvl) => {
        if (result.accuracy < 35) return 1;
        if (result.accuracy >= 75) return Math.min(3, lvl + 1);
        if (result.accuracy < 60) return Math.max(1, lvl - 1);
        return lvl;
      });
      setLevelInSession((n) => n + 1);
    }
  }

  const shellProps: ShellGameProps = {
    level: currentLevel,
    stage: levelInSession,
    totalStages: LEVELS_PER_SESSION,
    avatarId: state.profile.avatar,
    onComplete: handleLevelComplete,
    onBack: () => navigation.goBack(),
  };

  // --- Shell games: full-bleed, own chrome ---
  if (isShell) {
    if (!introSeen) {
      const introContent = SHELL_INTRO[gameId] ?? { intro: MEMORY_FLIP_INTRO, steps: MEMORY_FLIP_STEPS };
      return (
        <GameIntro
          title={game.title}
          intro={introContent.intro}
          steps={introContent.steps}
          avatarId={state.profile.avatar}
          onStart={() => setIntroSeen(true)}
          onBack={() => navigation.goBack()}
        />
      );
    }
    if (sessionDone) {
      return (
        <SafeAreaView style={styles.shellDone}>
          <SunsetBackground />
          <View style={styles.shellDoneInner}>
            <Avatar id={state.profile.avatar} size={92} />
            <Text style={styles.shellDoneTitle}>Wonderful!</Text>
            <Text style={styles.shellDoneText}>
              You finished all {LEVELS_PER_SESSION} rounds of {game.title}.
            </Text>
            <PrimaryButton label="Back to Home" onPress={() => navigation.navigate('Home')} />
          </View>
        </SafeAreaView>
      );
    }
    // key by round so each round mounts fresh (state + difficulty reset)
    switch (gameId) {
      case 'memory-flip':
        return <MemoryFlipGame key={levelInSession} {...shellProps} />;
      case 'pattern-recognition':
        return <PatternRecognitionGame key={levelInSession} {...shellProps} />;
      case 'sequence-recall':
        return <SequenceRecallGame key={levelInSession} {...shellProps} />;
      default:
        return <FlowFreeGame key={levelInSession} {...shellProps} />;
    }
  }

  // --- Standard games ---
  function renderGame() {
    if (!game.implemented) return <PlaceholderGame game={game} onComplete={handleLevelComplete} />;
    switch (game.id) {
      case 'rule-switch':
        return <RuleSwitchGame level={currentLevel} onComplete={handleLevelComplete} />;
      case 'picture-recall':
        return <PictureDetectionGame level={currentLevel} onComplete={handleLevelComplete} />;
      default:
        return <PlaceholderGame game={game} onComplete={handleLevelComplete} />;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={game.title} onBack={() => navigation.goBack()} />
      {!sessionDone ? (
        <View style={styles.body}>
          <View style={styles.levelRow}>
            {Array.from({ length: LEVELS_PER_SESSION }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.levelDot,
                  i < levelInSession - 1 && styles.levelDotDone,
                  i === levelInSession - 1 && styles.levelDotActive,
                ]}
              />
            ))}
            <Text style={typography.bodyMuted}>
              {'  '}Stage {levelInSession} of {LEVELS_PER_SESSION}
            </Text>
          </View>
          {renderGame()}
        </View>
      ) : (
        <View style={styles.doneWrap}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={typography.h1}>Great work!</Text>
          <Text style={typography.bodyMuted}>
            You completed all {LEVELS_PER_SESSION} rounds of {game.title} today.
          </Text>
          <PrimaryButton label="Back to Home" onPress={() => navigation.navigate('Home')} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  levelDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  levelDotDone: { backgroundColor: colors.success },
  levelDotActive: { backgroundColor: colors.primary },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  doneEmoji: { fontSize: 56 },
  shellDone: { flex: 1, backgroundColor: '#1E4A44' },
  shellDoneInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  shellDoneTitle: { fontSize: 30, fontWeight: '800', color: '#FFF' },
  shellDoneText: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
