// Design system — deliberately minimal, warm, and built for elderly users in
// the North East region (NER) of India.
//
// - Palette: warm "paper" backgrounds, a calm tea-garden green as the primary,
//   terracotta and marigold accents (Assam silk / Bihu / tea-country warmth),
//   NOT the generic tech purple. High contrast throughout.
// - Type: large by default (body starts at 18) with strong weights — thin,
//   low-contrast text is avoided.
// - Layout: few elements per screen, generous spacing, big touch targets.

export const colors = {
  primary: '#2C6248',        // tea-garden green
  primaryDark: '#1F4A36',

  secondary: '#B5502F',      // terracotta / brick red (gamosa border, rooftops)
  secondaryLight: '#CDBBA0', // dry-earth / bamboo

  accent: '#E0982E',         // marigold / turmeric — festivals, the morning sun
  danger: '#B23A2E',
  success: '#3E8E5A',
  sos: '#B4342A',

  background: '#FBF6EC',     // warm paper
  backgroundAlt: '#F3EBD9',
  surface: '#FFFFFF',
  surfaceMuted: '#F1E9D8',
  border: '#E2D6BF',

  text: '#2A2620',           // near-black, warm — ~13:1 on the paper background
  textMuted: '#5B5346',      // only for secondary info — still ~6.5:1
  textOnPrimary: '#FFFFFF',

  locked: '#B7AC98',
};

// Slightly larger than typical — comfortable spacing helps readability and
// gives bigger gaps between tap targets.
export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  xxl: 38,
};

export const radii = {
  md: 14,
  lg: 22,
  pill: 999,
};

// Large, high-weight type. "large text" (≥18px semibold) only needs 3:1, and
// every combination here clears 4.5:1, most clear 7:1 (WCAG AAA).
export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 17, fontWeight: '500' as const, color: colors.text },
  bodyMuted: { fontSize: 15, fontWeight: '500' as const, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '800' as const, color: colors.textMuted, letterSpacing: 0.5 },
  button: { fontSize: 17, fontWeight: '800' as const, color: colors.textOnPrimary },
};
