/**
 * typography.ts — VPaw type scale.
 *
 * On iOS the system font IS SF Pro — no font file needed.
 * On Android falls back to Roboto (system default).
 *
 * Usage:
 *   import { type as t } from '../lib/typography';
 *   <Text style={t.title1}>Hello</Text>
 *   <Text style={[t.body, { color: '#333' }]}>...</Text>
 */

import { Platform } from 'react-native';

// Explicit system-font reference (platform-safe)
const SYS = Platform.OS === 'ios' ? ('System' as const) : undefined;

// ─── Type scale (mirrors Apple HIG text styles) ───────────────────────────────

export const type = {
  /** 34 / Heavy — hero numbers, big stat displays */
  largeTitle:   { fontFamily: SYS, fontSize: 34, fontWeight: '800' as const, letterSpacing: 0.37 },

  /** 28 / Bold — screen titles */
  title1:       { fontFamily: SYS, fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },

  /** 22 / Bold — section headers, card titles */
  title2:       { fontFamily: SYS, fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },

  /** 20 / Semibold — sub-section headers */
  title3:       { fontFamily: SYS, fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },

  /** 17 / Semibold — list row primary text */
  headline:     { fontFamily: SYS, fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },

  /** 17 / Regular — body copy */
  body:         { fontFamily: SYS, fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },

  /** 16 / Regular — callout / secondary paragraphs */
  callout:      { fontFamily: SYS, fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },

  /** 15 / Regular — list row secondary text */
  subheadline:  { fontFamily: SYS, fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },

  /** 13 / Regular — footnotes, helper text */
  footnote:     { fontFamily: SYS, fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },

  /** 12 / Regular — labels, badges */
  caption1:     { fontFamily: SYS, fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },

  /** 11 / Regular — tiny labels, tab bar text */
  caption2:     { fontFamily: SYS, fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },

  // ── Weight helpers ────────────────────────────────────────────────────────
  regular:    { fontFamily: SYS, fontWeight: '400' as const },
  medium:     { fontFamily: SYS, fontWeight: '500' as const },
  semibold:   { fontFamily: SYS, fontWeight: '600' as const },
  bold:       { fontFamily: SYS, fontWeight: '700' as const },
  heavy:      { fontFamily: SYS, fontWeight: '800' as const },
} as const;
