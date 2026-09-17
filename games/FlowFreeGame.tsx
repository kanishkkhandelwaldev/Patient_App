import React, { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';
import GameShell from '../components/GameShell';
import { MotifIcon } from '../components/GameArt';
import { ShellGameProps } from './shellTypes';

type Cell = [number, number]; // [row, col]

interface ColorDef {
  id: string;
  c: string; // colour
  m: string; // motif icon name
  a: Cell;
  b: Cell;
  solution: Cell[];
}

interface Layout {
  n: number;
  colors: ColorDef[];
}

// Authored by their solution paths (which also power the Hint button). Every
// layout is verified to tile without any shared cell.
function makeLayout(n: number, defs: { id: string; c: string; m: string; cells: Cell[] }[]): Layout {
  return {
    n,
    colors: defs.map((d) => ({
      id: d.id,
      c: d.c,
      m: d.m,
      a: d.cells[0],
      b: d.cells[d.cells.length - 1],
      solution: d.cells,
    })),
  };
}

const L1 = makeLayout(5, [
  { id: 'tea', c: '#3E8E5A', m: 'tea-leaf', cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[2,3],[2,2],[2,1],[2,0],[1,0]] },
  { id: 'horn', c: '#E0982E', m: 'hornbill', cells: [[1,1],[1,2],[1,3]] },
  { id: 'rhino', c: '#B5502F', m: 'rhino', cells: [[3,0],[3,1],[3,2],[3,3],[3,4],[4,4],[4,3],[4,2],[4,1],[4,0]] },
]);

const L2 = makeLayout(6, [
  { id: 'tea', c: '#3E8E5A', m: 'tea-leaf', cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,5],[1,4],[1,3],[1,2],[1,1],[1,0]] },
  { id: 'horn', c: '#E0982E', m: 'hornbill', cells: [[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5],[3,4],[3,3],[3,2],[3,1],[3,0]] },
  { id: 'rhino', c: '#B5502F', m: 'rhino', cells: [[4,0],[4,1],[4,2],[4,3],[4,4],[4,5]] },
  { id: 'boat', c: '#3E6E86', m: 'boat', cells: [[5,0],[5,1],[5,2],[5,3],[5,4],[5,5]] },
]);

const L3 = makeLayout(6, [
  { id: 'tea', c: '#3E8E5A', m: 'tea-leaf', cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[5,1]] },
  { id: 'horn', c: '#E0982E', m: 'hornbill', cells: [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[5,4]] },
  { id: 'rhino', c: '#B5502F', m: 'rhino', cells: [[0,1],[0,2],[0,3],[0,4],[1,4],[1,3],[1,2],[1,1]] },
  { id: 'monastery', c: '#3E6E86', m: 'monastery', cells: [[2,1],[2,2],[2,3],[2,4],[3,4],[3,3],[3,2],[3,1]] },
  { id: 'orchid', c: '#8C4E7C', m: 'orchid', cells: [[4,1],[4,2],[4,3],[4,4],[5,3],[5,2]] },
]);

const LAYOUTS = [L1, L2, L3];

export const PATH_LINK_INTRO = "Now let's try Path Link — joining matching trails across the map.";
export const PATH_LINK_STEPS = [
  'Every icon on the board has one matching partner, in the same colour.',
  'Touch an icon and drag across the board to draw its trail to its match.',
  'Trails cannot cross each other, so plan your route before you commit.',
  'Connect every pair to complete the round. There is no timer.',
];

const FACTS = [
  'The hornbill is central to Nagaland’s Hornbill Festival, held every December.',
  'Meghalaya’s living root bridges are grown by hand over many years.',
  'Loktak Lake in Manipur floats on circular islands of matted plants called phumdis.',
];

const adj = (a: Cell, b: Cell) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

export default function FlowFreeGame({ level, stage, totalStages, avatarId, onComplete, onBack }: ShellGameProps) {
  const layout = LAYOUTS[(level - 1 + stage - 1) % LAYOUTS.length];
  const { n } = layout;

  const [seed, setSeed] = useState(0);
  const [paths, setPaths] = useState<Record<string, Cell[]>>({});
  const [boardW, setBoardW] = useState(300);
  const cell = boardW / n;

  const boardRef = useRef<View>(null);
  const rect = useRef({ x: 0, y: 0 });
  const dragColor = useRef<string | null>(null);
  const lastColor = useRef<string | null>(null);
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  useEffect(() => {
    setPaths({});
    dragColor.current = null;
    lastColor.current = null;
  }, [seed, layout]);

  const endpointOf = (r: number, c: number): ColorDef | undefined =>
    layout.colors.find((col) => same(col.a, [r, c]) || same(col.b, [r, c]));

  function solvedColor(col: ColorDef, p: Record<string, Cell[]>): boolean {
    const path = p[col.id];
    if (!path || path.length < 2) return false;
    const first = path[0];
    const last = path[path.length - 1];
    return (
      (same(first, col.a) && same(last, col.b)) ||
      (same(first, col.b) && same(last, col.a))
    );
  }

  function cellAt(pageX: number, pageY: number): Cell | null {
    const x = pageX - rect.current.x;
    const y = pageY - rect.current.y;
    if (x < 0 || y < 0 || x > boardW || y > boardW) return null;
    const r = Math.min(n - 1, Math.max(0, Math.floor(y / cell)));
    const c = Math.min(n - 1, Math.max(0, Math.floor(x / cell)));
    return [r, c];
  }

  function occupiedBy(p: Record<string, Cell[]>, r: number, c: number, exceptId?: string): string | null {
    for (const [id, path] of Object.entries(p)) {
      if (id === exceptId) continue;
      if (path.some((pc) => pc[0] === r && pc[1] === c)) return id;
    }
    return null;
  }

  function begin(pt: Cell) {
    const p = { ...pathsRef.current };
    const [r, c] = pt;
    // resume / trim an existing path?
    for (const col of layout.colors) {
      const path = p[col.id];
      if (!path) continue;
      const idx = path.findIndex((pc) => pc[0] === r && pc[1] === c);
      if (idx >= 0) {
        p[col.id] = path.slice(0, idx + 1);
        dragColor.current = col.id;
        lastColor.current = col.id;
        setPaths(p);
        return;
      }
    }
    // start fresh from an endpoint
    const ep = endpointOf(r, c);
    if (ep) {
      p[ep.id] = [[r, c]];
      dragColor.current = ep.id;
      lastColor.current = ep.id;
      setPaths(p);
    } else {
      dragColor.current = null;
    }
  }

  function extend(pt: Cell) {
    const id = dragColor.current;
    if (!id) return;
    const p = { ...pathsRef.current };
    const path = [...(p[id] ?? [])];
    if (path.length === 0) return;
    const head = path[path.length - 1];
    const [r, c] = pt;
    if (same(head, pt)) return;

    // backtrack
    if (path.length >= 2 && same(path[path.length - 2], pt)) {
      path.pop();
      p[id] = path;
      setPaths(p);
      return;
    }
    if (!adj(head, pt)) return;

    const foreignEndpoint = endpointOf(r, c);
    if (foreignEndpoint && foreignEndpoint.id !== id) return; // can't run through another pod
    if (path.some((pc) => pc[0] === r && pc[1] === c)) return; // no self-cross beyond backtrack

    // dragging over another trail cuts it
    const owner = occupiedBy(p, r, c, id);
    if (owner) {
      const op = p[owner];
      const cut = op.findIndex((pc) => pc[0] === r && pc[1] === c);
      p[owner] = op.slice(0, cut);
    }

    path.push([r, c]);
    p[id] = path;
    setPaths(p);
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const pt = cellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (pt) begin(pt);
      },
      onPanResponderMove: (e) => {
        const pt = cellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (pt) extend(pt);
      },
      onPanResponderRelease: () => {
        dragColor.current = null;
        const p = pathsRef.current;
        if (layout.colors.every((col) => solvedColor(col, p))) {
          const filled = Object.values(p).reduce((s, path) => s + path.length, 0);
          const accuracy = Math.round((filled / (n * n)) * 100);
          setTimeout(() => onComplete({ accuracy: Math.max(60, accuracy), leveledUp: true }), 450);
        }
      },
    })
  ).current;

  function hint() {
    const p = { ...pathsRef.current };
    const target = layout.colors.find((col) => !solvedColor(col, p));
    if (!target) return;
    // clear any other path that overlaps the authored solution, then draw it
    for (const sc of target.solution) {
      const owner = occupiedBy(p, sc[0], sc[1], target.id);
      if (owner) {
        const oi = p[owner].findIndex((pc) => pc[0] === sc[0] && pc[1] === sc[1]);
        p[owner] = p[owner].slice(0, oi);
      }
    }
    p[target.id] = target.solution.map((x) => [x[0], x[1]] as Cell);
    lastColor.current = target.id;
    setPaths(p);
  }

  function undo() {
    const id = lastColor.current;
    if (!id) return;
    const p = { ...pathsRef.current };
    if (p[id] && p[id].length > 1) {
      p[id] = p[id].slice(0, -1);
      setPaths(p);
    }
  }

  const solvedCount = layout.colors.filter((col) => solvedColor(col, paths)).length;

  return (
    <GameShell
      title="Path Link"
      subtitle="Connect each pair to complete the path"
      fact={FACTS[(stage - 1) % FACTS.length]}
      tip={
        solvedCount === layout.colors.length
          ? 'Every trail connected — beautifully done!'
          : 'Trace each trail without crossing another. Take your time.'
      }
      progress={(stage - 1 + solvedCount / layout.colors.length) / totalStages}
      avatarId={avatarId}
      onBack={onBack}
      onUndo={undo}
      onHint={hint}
      onRestart={() => setSeed((s) => s + 1)}
      onLevels={() => setSeed((s) => s + 1)}
    >
      <Text style={styles.caption}>
        Round {stage} of {totalStages} · {solvedCount}/{layout.colors.length} trails
      </Text>

      <View
        ref={boardRef}
        onLayout={() => boardRef.current?.measureInWindow((x, y, w) => { rect.current = { x, y }; setBoardW(w); })}
        style={[styles.board, { width: '100%', maxWidth: 320, aspectRatio: 1 }]}
        {...pan.panHandlers}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${boardW} ${boardW}`} pointerEvents="none">
          <Rect x={0} y={0} width={boardW} height={boardW} rx={10} fill="#FBF4E4" />
          {Array.from({ length: n + 1 }).map((_, i) => (
            <React.Fragment key={i}>
              <Line x1={i * cell} y1={0} x2={i * cell} y2={boardW} stroke="#E4D6B4" strokeWidth={1} />
              <Line x1={0} y1={i * cell} x2={boardW} y2={i * cell} stroke="#E4D6B4" strokeWidth={1} />
            </React.Fragment>
          ))}
          {layout.colors.map((col) => {
            const path = paths[col.id];
            if (!path || path.length < 2) return null;
            const pts = path.map(([r, c]) => `${c * cell + cell / 2},${r * cell + cell / 2}`).join(' ');
            return (
              <Polyline
                key={col.id}
                points={pts}
                fill="none"
                stroke={col.c}
                strokeWidth={cell * 0.42}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
            );
          })}
        </Svg>

        {/* endpoint pods */}
        {layout.colors.flatMap((col) =>
          [col.a, col.b].map((pt, k) => {
            const solved = solvedColor(col, paths);
            const s = cell * 0.62;
            return (
              <View
                key={`${col.id}-${k}`}
                pointerEvents="none"
                style={[
                  styles.pod,
                  {
                    width: s,
                    height: s,
                    borderRadius: s / 2,
                    left: pt[1] * cell + (cell - s) / 2,
                    top: pt[0] * cell + (cell - s) / 2,
                    backgroundColor: col.c,
                    borderColor: solved ? '#FFF' : 'rgba(255,255,255,0.65)',
                  },
                ]}
              >
                <MotifIcon name={col.m} size={s * 0.62} color="#FFF" strokeWidth={2} />
              </View>
            );
          })
        )}
      </View>
    </GameShell>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 12, color: '#8A7856', fontWeight: '700', marginBottom: 10 },
  board: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pod: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
