import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Ellipse, Defs, LinearGradient, Stop, Rect, G } from 'react-native-svg';
import { colors } from '../theme/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Original vector illustration evoking a Northeast-India (NER) landscape:
 * layered blue-green mountain ranges with morning mist, pine/bamboo
 * silhouettes, a river winding through the valley, terraced tea gardens in
 * the foreground, a soft sun, and a pair of birds. Everything is drawn
 * shapes (no photos), so there's no licensing concern, and the whole scene
 * is easy to re-theme per region later once real regional art packs exist
 * (spec §5, Regional and Language Personalization).
 *
 * `opacity` lets content-dense screens keep the art subtle in the background.
 * `variant="footer"` renders a shorter strip for screens that need more
 * breathing room up top (e.g. forms).
 */
export default function RegionBackground({
  opacity = 1,
  variant = 'full',
}: {
  opacity?: number;
  variant?: 'full' | 'footer';
}) {
  const h = variant === 'full' ? SCREEN_H : SCREEN_H * 0.46;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg
        width={SCREEN_W}
        height={h}
        viewBox={`0 0 400 ${variant === 'full' ? 800 : 360}`}
        style={variant === 'footer' ? styles.footerSvg : styles.fullSvg}
        preserveAspectRatio="xMidYMax slice"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.backgroundAlt} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="farMountain" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B7C9CE" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#B7C9CE" stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="midMountain" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.secondaryLight} stopOpacity="0.65" />
            <Stop offset="1" stopColor={colors.secondaryLight} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="800" fill="url(#sky)" />

        {/* Sun with soft halo */}
        <Circle cx="316" cy="86" r="60" fill={colors.accent} opacity={0.18} />
        <Circle cx="316" cy="86" r="38" fill={colors.accent} opacity={0.55} />

        {/* A pair of birds */}
        <Path d="M70,70 q8,-10 16,0 q8,-10 16,0" stroke={colors.textMuted} strokeWidth="2" fill="none" opacity={0.5} />
        <Path d="M120,95 q6,-8 12,0 q6,-8 12,0" stroke={colors.textMuted} strokeWidth="2" fill="none" opacity={0.4} />

        {/* Far mountain range (misty, jagged NER peaks) */}
        <Path
          d="M0,230 L40,150 L75,205 L115,120 L150,190 L190,110 L230,195 L270,140 L310,210 L350,130 L400,200 L400,320 L0,320 Z"
          fill="url(#farMountain)"
        />

        {/* Mist band across the far range */}
        <Ellipse cx="200" cy="215" rx="230" ry="14" fill={colors.background} opacity={0.5} />
        <Ellipse cx="90" cy="235" rx="150" ry="10" fill={colors.background} opacity={0.4} />

        {/* Mid mountain range, closer + greener */}
        <Path
          d="M0,300 L55,215 L100,270 L150,190 L205,265 L255,205 L300,275 L345,225 L400,270 L400,380 L0,380 Z"
          fill="url(#midMountain)"
        />

        {/* Pine/bamboo silhouette cluster on the mid ridge */}
        <G opacity={0.35} fill={colors.secondary}>
          <Path d="M60,255 L68,225 L76,255 Z" />
          <Path d="M72,260 L80,228 L88,260 Z" />
          <Path d="M270,235 L277,210 L284,235 Z" />
          <Path d="M282,240 L289,213 L296,240 Z" />
          <Path d="M294,236 L301,212 L308,236 Z" />
        </G>

        {/* River winding down through the valley */}
        <Path
          d="M180,320 C170,360 210,380 195,420 C182,455 220,470 205,510 C195,535 215,555 205,600 L225,600 C232,555 210,535 222,510 C235,470 200,455 212,420 C225,380 190,360 200,320 Z"
          fill={colors.secondaryLight}
          opacity={0.3}
        />

        {/* Tea-garden terraces in the foreground */}
        <Path
          d="M0,520 C70,500 130,522 200,508 C270,494 330,518 400,500 L400,600 L0,600 Z"
          fill={colors.secondary}
          opacity={0.24}
        />
        <Path
          d="M0,560 C80,545 140,568 210,552 C280,536 340,562 400,545 L400,650 L0,650 Z"
          fill={colors.secondary}
          opacity={0.19}
        />
        <Path
          d="M0,600 C90,588 150,610 220,596 C290,582 350,606 400,592 L400,700 L0,700 Z"
          fill={colors.secondary}
          opacity={0.14}
        />
        <Path
          d="M0,650 C100,636 160,660 230,644 C300,628 360,652 400,638 L400,800 L0,800 Z"
          fill={colors.secondary}
          opacity={0.1}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fullSvg: { position: 'absolute', top: 0, left: 0 },
  footerSvg: { position: 'absolute', bottom: 0, left: 0 },
});
