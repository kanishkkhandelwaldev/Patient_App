import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, spacing } from '../theme/theme';
import { AvatarId } from '../state/AppContext';
import Avatar from './Avatar';
import { SunsetBackground } from './GameArt';

const REGIONS = ['Assam', 'Meghalaya', 'Nagaland', 'Manipur', 'Mizoram', 'Sikkim'];

interface Props {
  title: string;
  subtitle: string;
  fact?: string;
  instructions?: string[]; // clear "how to play" steps — shown instead of the fact
  regionTrail?: boolean; // default true
  tip: string;
  progress: number; // 0..1 through the day's set
  avatarId: AvatarId | null;
  onBack: () => void;
  onUndo?: () => void;
  onHint?: () => void;
  onRestart?: () => void;
  onLevels?: () => void;
  children: React.ReactNode;
}

/** The shared "Northeast" game frame — sunset sky, a textured paper board, an
 *  optional regional trail / fact / how-to-play card, and a calm companion toolbar. */
export default function GameShell({
  title,
  subtitle,
  fact,
  instructions,
  regionTrail = true,
  tip,
  progress,
  avatarId,
  onBack,
  onUndo,
  onHint,
  onRestart,
  onLevels,
  children,
}: Props) {
  const current = Math.min(REGIONS.length - 1, Math.round(progress * (REGIONS.length - 1)));
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe}>
      <SunsetBackground />

      <View style={[styles.topRow, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {regionTrail && <RegionTrail current={current} />}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {instructions && instructions.length > 0 && (
          <View style={styles.howCard}>
            <View style={styles.howHead}>
              <View style={styles.howBadge}>
                <Ionicons name="help" size={15} color="#FFF" />
              </View>
              <Text style={styles.howTitle}>How to play</Text>
            </View>
            {instructions.map((line, i) => (
              <View key={i} style={styles.howRow}>
                <Text style={styles.howNum}>{i + 1}</Text>
                <Text style={styles.howLine}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.board}>
          <BoardTexture />
          <View style={styles.boardInner}>{children}</View>
        </View>

        {!instructions && fact && (
          <View style={styles.factCard}>
            <View style={styles.factBadge}>
              <Ionicons name="bulb" size={15} color="#FFF" />
            </View>
            <Text style={styles.factText}>
              <Text style={styles.factLead}>Did you know? </Text>
              {fact}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.tipRow}>
          <Avatar id={avatarId} size={40} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{tip}</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          {onUndo && <ToolButton icon="arrow-undo" label="Undo" onPress={onUndo} />}
          {onHint && <ToolButton icon="bulb" label="Hint" onPress={onHint} highlight />}
          {onRestart && <ToolButton icon="refresh" label="Restart" onPress={onRestart} />}
          {onLevels && <ToolButton icon="layers" label="Levels" onPress={onLevels} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
  highlight,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tool}>
      <View style={[styles.toolCircle, highlight && styles.toolCircleHi]}>
        <Ionicons name={icon} size={22} color={highlight ? '#FFF' : colors.primary} />
      </View>
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

function RegionTrail({ current }: { current: number }) {
  return (
    <View style={styles.trail}>
      <View style={styles.trailLine} />
      {REGIONS.map((r, i) => {
        const done = i < current;
        const here = i === current;
        return (
          <View key={r} style={styles.trailStop}>
            <View
              style={[
                styles.trailDot,
                done && styles.trailDotDone,
                here && styles.trailDotHere,
              ]}
            />
            <Text style={[styles.trailLabel, here && styles.trailLabelHere]} numberOfLines={1}>
              {r}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** faint cross-hatch so the board reads as woven paper */
function BoardTexture() {
  const marks: string[] = [];
  for (let y = 14; y < 520; y += 22) {
    for (let x = 14; x < 360; x += 22) {
      marks.push(`M${x - 3} ${y}H${x + 3}M${x} ${y - 3}V${y + 3}`);
    }
  }
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={marks.join(' ')} stroke="#C9B58C" strokeWidth={1} opacity={0.35} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1E4A44' },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginTop: 1 },

  trail: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.xs },
  trailLine: {
    position: 'absolute',
    left: spacing.md + 16,
    right: spacing.md + 16,
    top: 6,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  trailStop: { flex: 1, alignItems: 'center' },
  trailDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  trailDotDone: { backgroundColor: '#FBE6BE', borderColor: '#FBE6BE' },
  trailDotHere: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFF', borderColor: '#FFF' },
  trailLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 4 },
  trailLabelHere: { color: '#FFF', fontWeight: '800' },

  scroll: { padding: spacing.md, alignItems: 'center', paddingBottom: spacing.lg },
  board: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#F4EBD7',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#DDCBA5',
    padding: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  boardInner: { alignItems: 'center' },

  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(244,235,215,0.92)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    maxWidth: 420,
  },
  factBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factText: { flex: 1, fontSize: 12.5, color: '#5B4A2E', lineHeight: 17 },
  factLead: { fontWeight: '800', color: colors.primaryDark },

  howCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  howBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  howRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  howNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    backgroundColor: colors.accent,
    overflow: 'hidden',
  },
  howLine: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },

  bottom: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  tipRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm },
  bubble: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubbleText: { fontSize: 13, color: colors.text, fontWeight: '600' },

  toolbar: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  tool: { alignItems: 'center', gap: 3 },
  toolCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toolCircleHi: { backgroundColor: colors.accent },
  toolLabel: { color: '#FFF', fontSize: 11, fontWeight: '700' },
});
