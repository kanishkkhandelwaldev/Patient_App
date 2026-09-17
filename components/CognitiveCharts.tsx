import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, radii, spacing } from '../theme/theme';

const GREEN = colors.success;   // accuracy / "good"
const CLAY = colors.secondary;  // reaction time
const MUTED = colors.textMuted;

// ---------------------------------------------------------------- metric tile
export function MetricTile({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, warn && { color: colors.danger }]}>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------- 1. radar
export function DomainRadar({
  data,
}: {
  data: { key: string; label: string; week: number; baseline: number }[];
}) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const R = 84;
  const n = data.length;
  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (val: number, i: number) => {
    const r = (Math.max(0, Math.min(100, val)) / 100) * R;
    return `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`;
  };
  const poly = (pick: (d: (typeof data)[number]) => number) => data.map((d, i) => pt(pick(d), i)).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {[25, 50, 75, 100].map((v) => (
          <Polygon
            key={v}
            points={data.map((_, i) => pt(v, i)).join(' ')}
            fill="none"
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {data.map((_, i) => (
          <Line key={i} x1={cx} y1={cy} x2={pt(100, i).split(',')[0]} y2={pt(100, i).split(',')[1]} stroke={colors.border} strokeWidth={1} />
        ))}
        <Polygon points={poly((d) => d.baseline)} fill={MUTED} fillOpacity={0.12} stroke={MUTED} strokeWidth={1.5} />
        <Polygon points={poly((d) => d.week)} fill={GREEN} fillOpacity={0.28} stroke={GREEN} strokeWidth={2} />
        {data.map((d, i) => {
          const [x, y] = pt(118, i).split(',').map(Number);
          return (
            <SvgText key={d.key} x={x} y={y} fontSize={12} fontWeight="700" fill={colors.text} textAnchor="middle">
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
      <Legend items={[{ c: GREEN, t: 'This week' }, { c: MUTED, t: 'Baseline' }]} />
    </View>
  );
}

// ------------------------------------------------ 2. reaction vs accuracy
export function ReactionAccuracyChart({
  data,
}: {
  data: { label: string; accuracy: number; reaction: number }[];
}) {
  const w = Math.max(300, data.length * 46);
  const h = 170;
  const pad = { l: 30, r: 30, t: 12, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxRt = Math.max(2, ...data.map((d) => d.reaction)) * 1.15;
  const x = (i: number) => pad.l + (data.length === 1 ? iw / 2 : (i * iw) / (data.length - 1));
  const yAcc = (v: number) => pad.t + ih - (v / 100) * ih;
  const yRt = (v: number) => pad.t + ih - (v / maxRt) * ih;

  if (data.length < 2) return <EmptyNote text="Not enough sessions yet." />;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={w} height={h}>
          {[0, 25, 50, 75, 100].map((v) => (
            <Line key={v} x1={pad.l} y1={yAcc(v)} x2={w - pad.r} y2={yAcc(v)} stroke={colors.border} strokeWidth={1} />
          ))}
          <Polyline
            points={data.map((d, i) => `${x(i)},${yAcc(d.accuracy)}`).join(' ')}
            fill="none"
            stroke={GREEN}
            strokeWidth={2.5}
          />
          <Polyline
            points={data.map((d, i) => `${x(i)},${yRt(d.reaction)}`).join(' ')}
            fill="none"
            stroke={CLAY}
            strokeWidth={2}
            strokeDasharray="5,4"
          />
          {data.map((d, i) => (
            <React.Fragment key={i}>
              <Circle cx={x(i)} cy={yAcc(d.accuracy)} r={3} fill={GREEN} />
              <Circle cx={x(i)} cy={yRt(d.reaction)} r={3} fill={CLAY} />
              {i % 2 === 0 && (
                <SvgText x={x(i)} y={h - 8} fontSize={10} fill={MUTED} textAnchor="middle">
                  {d.label}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
      <Legend items={[{ c: GREEN, t: 'Accuracy (%)' }, { c: CLAY, t: 'Response (s)', dash: true }]} />
    </View>
  );
}

// ------------------------------------------------------- 3. consistency heatmap
const HEAT = ['#EFEFEF', '#DDEDE7', '#9FD0C2', GREEN];
export function ConsistencyHeatmap({
  weeks,
}: {
  weeks: { level: number; date: Date; future: boolean }[][];
}) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {weeks.map((col, ci) => (
            <View key={ci} style={{ gap: 3 }}>
              {col.map((cell, ri) => {
                let bg = HEAT[0];
                if (cell.future) bg = 'transparent';
                else if (cell.level === -1) bg = '#C9C9C9';
                else if (cell.level >= 1) bg = HEAT[Math.min(3, cell.level)];
                return <View key={ri} style={[styles.heatCell, { backgroundColor: bg }]} />;
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.heatLegend}>
        <Text style={styles.legendText}>Less</Text>
        {HEAT.map((c) => (
          <View key={c} style={[styles.heatCell, { backgroundColor: c, width: 12, height: 12 }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
        <View style={[styles.heatCell, { backgroundColor: '#C9C9C9', width: 12, height: 12, marginLeft: spacing.sm }]} />
        <Text style={styles.legendText}>Skipped</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------- 4. memory chest vs games
export function MemoryCompareBars({
  data,
}: {
  data: { label: string; chest: number | null; synthetic: number | null }[];
}) {
  if (data.length === 0) return <EmptyNote text="No comparison data yet." />;
  const w = Math.max(300, data.length * 56);
  const h = 170;
  const pad = { l: 28, r: 8, t: 10, b: 26 };
  const ih = h - pad.t - pad.b;
  const groupW = (w - pad.l - pad.r) / data.length;
  const barW = Math.min(16, groupW / 2 - 3);
  const y = (v: number) => pad.t + ih - (v / 100) * ih;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={w} height={h}>
          {[0, 50, 100].map((v) => (
            <Line key={v} x1={pad.l} y1={y(v)} x2={w - pad.r} y2={y(v)} stroke={colors.border} strokeWidth={1} />
          ))}
          {data.map((d, i) => {
            const gx = pad.l + i * groupW + groupW / 2;
            return (
              <React.Fragment key={i}>
                {d.chest != null && (
                  <Rect x={gx - barW - 2} y={y(d.chest)} width={barW} height={y(0) - y(d.chest)} rx={3} fill={GREEN} />
                )}
                {d.synthetic != null && (
                  <Rect x={gx + 2} y={y(d.synthetic)} width={barW} height={y(0) - y(d.synthetic)} rx={3} fill={colors.secondaryLight} />
                )}
                <SvgText x={gx} y={h - 8} fontSize={10} fill={MUTED} textAnchor="middle">
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
      <Legend items={[{ c: GREEN, t: 'Memory Chest' }, { c: colors.secondaryLight, t: 'Puzzle games' }]} />
    </View>
  );
}

// ---------------------------------------------------------------- shared bits
function Legend({ items }: { items: { c: string; t: string; dash?: boolean }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((it) => (
        <View key={it.t} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: it.dash ? 'transparent' : it.c, borderColor: it.c, borderWidth: it.dash ? 2 : 0 }]} />
          <Text style={styles.legendText}>{it.t}</Text>
        </View>
      ))}
    </View>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  tileSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 12, color: colors.textMuted },
  heatCell: { width: 14, height: 14, borderRadius: 3 },
  heatLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
