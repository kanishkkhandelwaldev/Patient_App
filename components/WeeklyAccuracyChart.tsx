import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { colors } from '../theme/theme';
import { DailyRecord } from '../state/AppContext';

const CHART_HEIGHT = 140;
const BAR_GAP = 10;

export default function WeeklyAccuracyChart({ history }: { history: DailyRecord[] }) {
  const days = history.slice(-7);
  const width = Math.max(280, days.length * 44);
  const barWidth = (width - BAR_GAP * (days.length + 1)) / Math.max(days.length, 1);

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT + 30}>
        {/* gridlines at 0/50/100 */}
        {[0, 50, 100].map((v) => {
          const y = CHART_HEIGHT - (v / 100) * CHART_HEIGHT + 10;
          return (
            <Line key={v} x1={0} y1={y} x2={width} y2={y} stroke={colors.border} strokeWidth={1} />
          );
        })}
        {days.map((d, i) => {
          const barH = Math.max(4, (d.avgAccuracy / 100) * CHART_HEIGHT);
          const x = BAR_GAP + i * (barWidth + BAR_GAP);
          const y = CHART_HEIGHT - barH + 10;
          const label = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
          return (
            <React.Fragment key={d.date + i}>
              <Rect x={x} y={y} width={barWidth} height={barH} rx={6} fill={colors.primary} opacity={0.85} />
              <SvgText x={x + barWidth / 2} y={CHART_HEIGHT + 26} fontSize={11} fill={colors.textMuted} textAnchor="middle">
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
