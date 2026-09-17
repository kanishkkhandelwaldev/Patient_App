import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Shared visual language for the "Northeast" game shell — a warm sunset sky over
 * layered blue-green ranges, plus a small library of hand-drawn regional motifs
 * (tea leaf, hornbill, rhino, monastery…). All vector, nothing to license.
 */

export function SunsetBackground() {
  const { width, height } = useWindowDimensions();
  const w = width;
  const h = height;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F3A85C" />
          <Stop offset="0.34" stopColor="#EA8F6C" />
          <Stop offset="0.62" stopColor="#8AA391" />
          <Stop offset="1" stopColor="#1E4A44" />
        </LinearGradient>
        <LinearGradient id="mA" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6E8C7E" />
          <Stop offset="1" stopColor="#476A5E" />
        </LinearGradient>
        <LinearGradient id="mB" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3B5A51" />
          <Stop offset="1" stopColor="#22423B" />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={w} height={h} fill="url(#sky)" />

      <Circle cx={w * 0.8} cy={h * 0.11} r={48} fill="#FBE6BE" opacity={0.9} />
      <Circle cx={w * 0.8} cy={h * 0.11} r={70} fill="#FBE6BE" opacity={0.28} />

      <Path d={`M${w * 0.13} ${h * 0.1} q7 -8 14 0 q7 -8 14 0`} stroke="#3C5E54" strokeWidth={2} fill="none" opacity={0.5} />
      <Path d={`M${w * 0.26} ${h * 0.15} q6 -7 12 0 q6 -7 12 0`} stroke="#3C5E54" strokeWidth={2} fill="none" opacity={0.4} />

      <Path
        d={`M0 ${h * 0.3} L${w * 0.2} ${h * 0.15} L${w * 0.4} ${h * 0.29} L${w * 0.6} ${h * 0.12} L${w * 0.8} ${h * 0.3} L${w} ${h * 0.17} L${w} ${h} L0 ${h} Z`}
        fill="url(#mA)"
        opacity={0.92}
      />
      <Path
        d={`M0 ${h * 0.42} L${w * 0.24} ${h * 0.27} L${w * 0.5} ${h * 0.44} L${w * 0.74} ${h * 0.25} L${w} ${h * 0.42} L${w} ${h} L0 ${h} Z`}
        fill="url(#mB)"
      />
    </Svg>
  );
}

// --- motif line icons (24×24 viewBox, single stroke colour) ---

const MOTIF_PATHS: Record<string, string> = {
  'tea-leaf': 'M12 3C7.5 7 7 15 12 21C17 15 16.5 7 12 3ZM12 5.5V19',
  hornbill: 'M3 14C7 8.5 13 8.5 16.5 12L22 9.5L18.5 13.5L21.5 15.5M9.5 12.5L9.5 19M14.5 13.5L14.5 18.5',
  rhino: 'M4 17C4 12 8 9 13 9C17 9 20 11 20 15L18 15C18 12.5 16 11 13 11C9 11 6.5 13.5 6.5 17ZM13 9L11 4L15 8',
  monastery: 'M4 20H20M6 20V12H18V12V20M12 4L4.5 11.5H19.5L12 4ZM11 20V15A1 1 0 0 1 13 15V20',
  bamboo: 'M9 3V21M15 3V21M6 8H12M6 14H12M12 6H18M12 16H18',
  drum: 'M7 5C10.5 8 13.5 8 17 5M7 19C10.5 16 13.5 16 17 19M7 5L7 19M17 5L17 19M5 5H9M15 5H19',
  boat: 'M3 13C7 19 17 19 21 13M6 13L6 8M6 8L15 10M6 8L6 8M9 13L9 6M9 6L16 9',
  orchid: 'M12 12L12 21M12 12C12 8 9 6 6.5 7.5C9 9 9 12 12 12ZM12 12C12 8 15 6 17.5 7.5C15 9 15 12 12 12ZM12 12C10 9 6.5 9 5.5 11.5C8.5 11.5 10 13 12 12ZM12 12C14 9 17.5 9 18.5 11.5C15.5 11.5 14 13 12 12ZM12 12A2 2 0 1 0 12 8A2 2 0 0 0 12 12',
  fish: 'M4 12C7 8 13 8 17 12C13 16 7 16 4 12ZM17 12L21 9V15L17 12ZM8 12H8.01',
  hills: 'M3 18C6 12 8 12 11 16C13 12 15 12 18 15L21 13M3 18H21',
  sun: 'M12 7A5 5 0 1 0 12 17A5 5 0 0 0 12 7ZM12 2V4M12 20V22M4 12H2M22 12H20M5 5L6.5 6.5M17.5 17.5L19 19M19 5L17.5 6.5M6.5 17.5L5 19',
  mask: 'M8 3C5 3 4 6 4 10C4 16 8 21 12 21C16 21 20 16 20 10C20 6 19 3 16 3C14 3 13 5 12 5C11 5 10 3 8 3ZM9 10H9.01M15 10H15.01M10 15C11 16.5 13 16.5 14 15',
  tea: 'M6 9H16V15A4 4 0 0 1 8 15V9ZM16 10H18A2 2 0 0 1 18 14H16M7 6C7 5 8 4.5 8 4M11 6C11 5 12 4.5 12 4M8 20H16',
};

export function MotifIcon({
  name,
  size = 34,
  color = '#2E5B4E',
  strokeWidth = 1.7,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={MOTIF_PATHS[name] ?? MOTIF_PATHS.orchid}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const MOTIF_NAMES = Object.keys(MOTIF_PATHS);
