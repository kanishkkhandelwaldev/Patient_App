import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { GameDef } from '../data/games';
import { colors, spacing } from '../theme/theme';
import Avatar from './Avatar';
import { AvatarId } from '../state/AppContext';

interface Props {
  games: GameDef[];
  completedIds: string[];
  avatar: AvatarId | null;
  chestUnlocked: boolean;
  onPressNode?: (gameId: GameDef['id']) => void;
  onPressChest?: () => void;
}

const NODE = 62;       // node diameter
const LIP = 6;         // "thickness" of the node's 3-D base
const TOP = 74;        // headroom for the companion above the first node
const STEP = 128;      // vertical distance between milestones
const MAX_W = 460;

type NodeState = 'done' | 'current' | 'open' | 'locked';

function nodeX(idx: number, w: number) {
  return idx % 2 === 0 ? w * 0.32 : w * 0.68;
}

// River-stone palette.
const NODE_C: Record<NodeState, { face: string; base: string; icon: string; highlight: string }> = {
  open:    { face: '#CFC7B8', base: '#A79E8D', icon: '#5B4E3A', highlight: 'rgba(255,255,255,0.5)' },
  current: { face: '#E2D6BF', base: '#B4A78D', icon: '#4A3F2E', highlight: 'rgba(255,255,255,0.6)' },
  done:    { face: '#A9BE9E', base: '#7C9270', icon: '#FFFFFF', highlight: 'rgba(255,255,255,0.35)' },
  locked:  { face: '#8E8A80', base: '#6C685F', icon: '#57544C', highlight: 'rgba(255,255,255,0.2)' },
};

type P = { x: number; y: number };

type Circle = { x: number; y: number; r: number };

// Smooth curve through the control points, with the segments that fall inside
// any `avoid` circle (the milestones) lifted out — so the trail never shows
// behind a node.
function spline(ctrl: P[], avoid: Circle[] = [], per = 24): string {
  const P0 = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  let d = '';
  let penUp = true;
  for (let i = 1; i < P0.length - 2; i++) {
    const p0 = P0[i - 1];
    const p1 = P0[i];
    const p2 = P0[i + 1];
    const p3 = P0[i + 2];
    for (let s = i === 1 ? 0 : 1; s <= per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      if (avoid.some((a) => (x - a.x) ** 2 + (y - a.y) ** 2 < a.r * a.r)) {
        penUp = true;
        continue;
      }
      d += `${penUp ? ' M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      penUp = false;
    }
  }
  return d.trim();
}

// label sits beside the node, on the side away from the trail's lean
function sideLabel(x: number, w: number, halfW: number) {
  const onLeft = x < w / 2;
  return onLeft
    ? { onLeft, box: { left: x + halfW + 10, width: w - (x + halfW + 10) - 4, alignItems: 'flex-start' as const } }
    : { onLeft, box: { left: 4, width: x - halfW - 14, alignItems: 'flex-end' as const } };
}

function usePress() {
  const v = useRef(new Animated.Value(0)).current;
  return {
    down: v.interpolate({ inputRange: [0, 1], outputRange: [0, LIP] }),
    onPressIn: () => Animated.timing(v, { toValue: 1, duration: 70, useNativeDriver: false }).start(),
    onPressOut: () => Animated.spring(v, { toValue: 0, friction: 6, tension: 160, useNativeDriver: false }).start(),
  };
}

function TrailNode({
  game,
  x,
  y,
  w,
  nodeState,
  onPress,
}: {
  game: GameDef;
  x: number;
  y: number;
  w: number;
  nodeState: NodeState;
  onPress?: () => void;
}) {
  const { down, onPressIn, onPressOut } = usePress();
  const disabled = nodeState === 'locked' || !onPress;
  const c = NODE_C[nodeState];
  const { onLeft, box } = sideLabel(x, w, NODE / 2);

  return (
    <>
      {/* backing for the press-down effect — flush with the face, so nothing shows at rest */}
      <View
        pointerEvents="none"
        style={[styles.nodeBase, { left: x - NODE / 2, top: y - NODE / 2, backgroundColor: c.base }]}
      />

      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.nodeHit, { left: x - NODE / 2, top: y - NODE / 2 }]}
      >
        <Animated.View
          style={[
            styles.nodeFace,
            {
              backgroundColor: c.face,
              transform: [{ translateY: down }],
              borderColor: nodeState === 'current' ? colors.accent : 'rgba(0,0,0,0.08)',
              borderWidth: nodeState === 'current' ? 3 : 1,
            },
          ]}
        >
          {nodeState === 'done' ? (
            <Ionicons name="checkmark" size={30} color={c.icon} />
          ) : nodeState === 'locked' ? (
            <Ionicons name="lock-closed" size={22} color={c.icon} />
          ) : (
            <Ionicons name={game.icon as any} size={28} color={c.icon} />
          )}
          <View pointerEvents="none" style={[styles.nodeGloss, { backgroundColor: c.highlight }]} />
        </Animated.View>
      </Pressable>

      <NodeLabel box={box} onLeft={onLeft} y={y} h={NODE} muted={nodeState === 'locked'} text={game.title} />
    </>
  );
}

// The reward chest at the end of the trail (spec §12) — opens the Memory Chest.
function ChestNode({
  x,
  y,
  w,
  unlocked,
  onPress,
}: {
  x: number;
  y: number;
  w: number;
  unlocked: boolean;
  onPress?: () => void;
}) {
  const { down, onPressIn, onPressOut } = usePress();
  const { onLeft, box } = sideLabel(x, w, CHEST_W / 2);
  const wood = unlocked ? '#8A5A38' : '#8F8B80';
  const lid = unlocked ? '#71482C' : '#7C786F';
  const gold = unlocked ? '#E4A63E' : '#B9B1A0';
  const plate = unlocked ? '#F4C25C' : '#CBC4B4';
  const keyhole = unlocked ? '#6E4526' : '#6B665C';

  return (
    <>
      {/* press-down backing — flush with the chest, nothing shows at rest */}
      <View
        pointerEvents="none"
        style={[
          styles.chestBase,
          { left: x - CHEST_W / 2, top: y - CHEST_H / 2, backgroundColor: unlocked ? '#5A3A22' : '#605B51' },
        ]}
      />

      <Pressable
        disabled={!unlocked || !onPress}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.chestHit, { left: x - CHEST_W / 2, top: y - CHEST_H / 2 }]}
      >
        <Animated.View
          style={[
            styles.chestBody,
            {
              backgroundColor: wood,
              transform: [{ translateY: down }],
              borderColor: unlocked ? colors.accent : 'rgba(0,0,0,0.1)',
              borderWidth: unlocked ? 3 : 1,
            },
          ]}
        >
          <View style={[styles.chestLid, { backgroundColor: lid }]} />
          <View style={styles.chestSeam} />
          <View style={[styles.chestBand, { backgroundColor: gold, left: CHEST_W / 2 - 5 }]} />
          {/* clasp / lock plate built into the chest — with a keyhole, no separate icon */}
          <View style={[styles.chestPlate, { backgroundColor: plate, left: CHEST_W / 2 - 12, top: CHEST_H * 0.34 }]}>
            <View style={[styles.keyholeDot, { backgroundColor: keyhole }]} />
            <View style={[styles.keyholeSlot, { backgroundColor: keyhole }]} />
          </View>
        </Animated.View>
      </Pressable>

      <NodeLabel box={box} onLeft={onLeft} y={y} h={CHEST_H} muted={!unlocked} text="Memory Chest" />
    </>
  );
}

function NodeLabel({
  box,
  onLeft,
  y,
  h,
  muted,
  text,
}: {
  box: { left: number; width: number; alignItems: 'flex-start' | 'flex-end' };
  onLeft: boolean;
  y: number;
  h: number;
  muted: boolean;
  text: string;
}) {
  return (
    <View pointerEvents="none" style={[styles.labelWrap, box, { top: y - h / 2, height: h + LIP }]}>
      <View style={styles.labelChip}>
        <Text style={[styles.label, muted && styles.labelLocked, { textAlign: onLeft ? 'left' : 'right' }]} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const CHEST_W = 78;
const CHEST_H = 58;

/**
 * The day's games as milestones along a gently-winding footpath, ending at the
 * reward chest (spec §7 / §11 / §12). The companion stands on the current
 * milestone; tapping an unlocked one starts that game (or opens the chest).
 */
export default function AvatarTrail({ games, completedIds, avatar, chestUnlocked, onPressNode, onPressChest }: Props) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, MAX_W) - spacing.lg * 2;
  const currentIndex = games.findIndex((g) => !completedIds.includes(g.id));
  const activeIndex = currentIndex === -1 ? games.length - 1 : currentIndex;
  const n = games.length;

  const nodeY = (i: number) => TOP + i * STEP;
  const chestY = nodeY(n);
  const chestX = nodeX(n, w);
  const height = chestY + CHEST_H / 2 + 90;

  const pathD = useMemo(() => {
    const cx = w / 2;
    const centres: P[] = [...games.map((_, i) => ({ x: nodeX(i, w), y: nodeY(i) })), { x: chestX, y: chestY }];
    const ctrl: P[] = [{ x: centres[0].x, y: centres[0].y - STEP * 0.9 }];
    for (let i = 0; i < centres.length; i++) {
      ctrl.push(centres[i]);
      if (i < centres.length - 1) {
        const dir = centres[i].x < centres[i + 1].x ? 1 : -1;
        ctrl.push({ x: cx + dir * w * 0.06, y: (centres[i].y + centres[i + 1].y) / 2 });
      }
    }
    ctrl.push({ x: centres[centres.length - 1].x, y: centres[centres.length - 1].y + STEP * 0.6 });
    // lift the trail out from behind every milestone so nothing shows around them
    const avoid: Circle[] = [
      ...games.map((_, i) => ({ x: nodeX(i, w), y: nodeY(i), r: NODE / 2 + 8 })),
      { x: chestX, y: chestY, r: Math.hypot(CHEST_W, CHEST_H) / 2 + 2 },
    ];
    return spline(ctrl, avoid);
  }, [games.length, w, chestX, chestY]);

  const companion = chestUnlocked
    ? { x: chestX, y: chestY - CHEST_H / 2 - 34 }
    : { x: nodeX(activeIndex, w), y: nodeY(activeIndex) - NODE / 2 - 34 };

  return (
    <View style={[styles.wrap, { width: w, height, alignSelf: 'center' }]}>
      <Svg width={w} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={pathD} stroke="#FBF6EC" strokeOpacity={0.5} strokeWidth={11} strokeLinecap="round" strokeDasharray="0.5 16" fill="none" />
        <Path d={pathD} stroke="#8A7657" strokeOpacity={0.7} strokeWidth={7} strokeLinecap="round" strokeDasharray="0.5 16" fill="none" />
      </Svg>

      {games.map((game, i) => {
        const isDone = completedIds.includes(game.id);
        const isCurrent = !chestUnlocked && i === activeIndex && !isDone;
        const locked = !isDone && i > activeIndex;
        const nodeState: NodeState = isDone ? 'done' : isCurrent ? 'current' : locked ? 'locked' : 'open';
        return (
          <TrailNode
            key={game.id}
            game={game}
            x={nodeX(i, w)}
            y={nodeY(i)}
            w={w}
            nodeState={nodeState}
            onPress={onPressNode ? () => onPressNode(game.id) : undefined}
          />
        );
      })}

      <ChestNode x={chestX} y={chestY} w={w} unlocked={chestUnlocked} onPress={onPressChest} />

      <View pointerEvents="none" style={[styles.avatarOnNode, { left: companion.x - 21, top: companion.y }]}>
        <Avatar id={avatar} size={42} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  nodeBase: { position: 'absolute', width: NODE, height: NODE, borderRadius: NODE / 2 },
  nodeHit: { position: 'absolute', width: NODE, height: NODE + LIP },
  nodeFace: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nodeGloss: { position: 'absolute', top: 6, width: NODE * 0.5, height: NODE * 0.26, borderRadius: NODE * 0.25 },

  chestBase: { position: 'absolute', width: CHEST_W, height: CHEST_H, borderRadius: 14 },
  chestHit: { position: 'absolute', width: CHEST_W, height: CHEST_H + LIP },
  chestBody: { width: CHEST_W, height: CHEST_H, borderRadius: 14, overflow: 'hidden' },
  chestLid: { height: CHEST_H * 0.42 },
  chestSeam: { height: 2, backgroundColor: 'rgba(0,0,0,0.18)' },
  chestBand: { position: 'absolute', top: 0, bottom: 0, width: 10 },
  chestPlate: {
    position: 'absolute',
    width: 24,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  keyholeDot: { width: 6, height: 6, borderRadius: 3 },
  keyholeSlot: { width: 3, height: 6, marginTop: -1 },

  avatarOnNode: { position: 'absolute' },
  labelWrap: { position: 'absolute', justifyContent: 'center' },
  labelChip: { backgroundColor: 'rgba(251,246,236,0.74)', borderRadius: 9, paddingVertical: 3, paddingHorizontal: 8 },
  label: { fontSize: 14, fontWeight: '800', color: colors.text },
  labelLocked: { color: colors.textMuted },
});
