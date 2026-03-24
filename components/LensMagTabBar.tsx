/**
 * LensMagTabBar — Apple Clock-inspired magnifier lens tab bar.
 *
 * Interaction:
 *  • Tap → navigate (instant, no bubble)
 *  • Hold + drag → a circular bubble rises above the bar, icons under the
 *    lens swell with a Gaussian bell-curve scale, release to navigate.
 *
 * Visual language (VPaw):
 *  • White pill bar (unchanged from old bar)
 *  • Bubble: white circle, soft green border, green icon + label inside
 *  • Active icon/text: #47664a  •  Inactive: #9a9c95
 */

import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Bell, ChartSpline, HeartPulse, Home } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabKey = 'home' | 'healthHub' | 'reminders' | 'insights';

interface Props {
  activeTab: TabKey;
  locale: string;
  onTabPress: (tab: TabKey) => void;
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth: number;
}>;

type TabDef = { key: TabKey; labelTr: string; labelEn: string; Icon: IconComponent };

const TABS: TabDef[] = [
  { key: 'home',       labelTr: 'Ana Sayfa', labelEn: 'Home',      Icon: Home        },
  { key: 'healthHub',  labelTr: 'Sağlık',    labelEn: 'Health',    Icon: HeartPulse  },
  { key: 'reminders',  labelTr: 'Takip',     labelEn: 'Reminders', Icon: Bell        },
  { key: 'insights',   labelTr: 'Analiz',    labelEn: 'Insights',  Icon: ChartSpline },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_HEIGHT     = 66;
const BAR_MARGIN     = 16;   // left & right margin (matches original)
const BUBBLE_SIZE    = 62;   // diameter of the floating bubble
const BUBBLE_GAP     = 10;   // gap between bubble bottom and bar top
const DRAG_THRESHOLD = 8;    // px of horizontal movement before bubble appears

// ─── Helper: Gaussian scale ───────────────────────────────────────────────────

function gaussianScale(fingerX: number, tabIndex: number, tabSlot: number): number {
  const center = tabSlot * (tabIndex + 0.5);
  const dist   = Math.abs(fingerX - center);
  const sigma  = tabSlot * 0.65;
  return 1 + 0.58 * Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LensMagTabBar({ activeTab, locale, onTabPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = screenWidth - BAR_MARGIN * 2;
  const tabSlot  = barWidth / TABS.length;

  // ── Animated values (stable refs, never recreated) ──────────────────────────
  const tabScaleAnims  = useRef(TABS.map(() => new Animated.Value(1))).current;
  const bubbleOpacity  = useRef(new Animated.Value(0)).current;
  const bubbleScale    = useRef(new Animated.Value(0.8)).current;
  const bubbleTranslX  = useRef(new Animated.Value(0)).current;

  // ── Mutable state (refs, not re-render-safe state) ──────────────────────────
  const isDragging          = useRef(false);
  const hasMoved            = useRef(false);
  const hoveredTabKeyRef    = useRef<TabKey | null>(null);

  // ── React state (only what's needed for render) ─────────────────────────────
  const [hoveredTabKey, setHoveredTabKey] = useState<TabKey | null>(null);

  // ── Latest values ref (avoids stale closures inside PanResponder) ───────────
  const latestRef = useRef({ tabSlot, barWidth, onTabPress });
  latestRef.current.tabSlot    = tabSlot;
  latestRef.current.barWidth   = barWidth;
  latestRef.current.onTabPress = onTabPress;

  // ── Internal helpers (stable closures over Animated.Value refs) ──────────────

  function applyScales(fingerX: number) {
    tabScaleAnims.forEach((anim, i) => {
      anim.setValue(gaussianScale(fingerX, i, latestRef.current.tabSlot));
    });
  }

  function springResetScales() {
    tabScaleAnims.forEach((anim) => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }).start();
    });
  }

  function showBubble() {
    Animated.parallel([
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 130, useNativeDriver: true }),
      Animated.spring(bubbleScale,   { toValue: 1, tension: 180, friction: 12, useNativeDriver: true }),
    ]).start();
  }

  function hideBubble(onDone?: () => void) {
    Animated.parallel([
      Animated.timing(bubbleOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(bubbleScale,   { toValue: 0.8, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      hoveredTabKeyRef.current = null;
      setHoveredTabKey(null);
      onDone?.();
    });
  }

  function getTabAt(x: number): TabKey | null {
    const idx = Math.floor(x / latestRef.current.tabSlot);
    return TABS[idx]?.key ?? null;
  }

  // ── PanResponder (created once) ───────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (evt) => {
        isDragging.current = false;
        hasMoved.current   = false;
        applyScales(evt.nativeEvent.locationX);
      },

      onPanResponderMove: (evt, gestureState) => {
        const { barWidth: bw } = latestRef.current;
        const x = Math.max(0, Math.min(evt.nativeEvent.locationX, bw));

        // Update scales every frame
        applyScales(x);

        // Update bubble X position
        bubbleTranslX.setValue(x - BUBBLE_SIZE / 2);

        // Update hovered tab label
        const tab = getTabAt(x);
        if (tab !== hoveredTabKeyRef.current) {
          hoveredTabKeyRef.current = tab;
          setHoveredTabKey(tab);
        }

        // Show bubble only after meaningful horizontal movement
        if (!hasMoved.current && Math.abs(gestureState.dx) > DRAG_THRESHOLD) {
          hasMoved.current   = true;
          isDragging.current = true;
          bubbleTranslX.setValue(x - BUBBLE_SIZE / 2);
          showBubble();
        }
      },

      onPanResponderRelease: (evt) => {
        const { barWidth: bw, onTabPress: press } = latestRef.current;
        const x   = Math.max(0, Math.min(evt.nativeEvent.locationX, bw));
        const tab = getTabAt(x);

        springResetScales();

        if (isDragging.current) {
          hideBubble();
        } else {
          // Plain tap — no bubble was shown
          hoveredTabKeyRef.current = null;
          setHoveredTabKey(null);
        }

        isDragging.current = false;
        hasMoved.current   = false;

        if (tab) press(tab);
      },

      onPanResponderTerminate: () => {
        springResetScales();
        hideBubble();
        isDragging.current = false;
        hasMoved.current   = false;
      },
    }),
  ).current;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    // Container is taller than the bar so the bubble can live inside it
    // without needing overflow:visible on an absolute-positioned element.
    <View style={styles.container} pointerEvents="box-none">

      {/* ── Floating bubble ─────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubble,
          {
            opacity: bubbleOpacity,
            transform: [
              { translateX: bubbleTranslX },
              { scale: bubbleScale },
            ],
          },
        ]}
      >
        {hoveredTabKey != null && (() => {
          const tab  = TABS.find((t) => t.key === hoveredTabKey)!;
          const Icon = tab.Icon;
          return (
            <>
              <Icon size={26} color="#47664a" strokeWidth={2.2} />
              <Text style={styles.bubbleLabel}>
                {locale === 'tr' ? tab.labelTr : tab.labelEn}
              </Text>
            </>
          );
        })()}
      </Animated.View>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <View style={styles.tabBar} {...panResponder.panHandlers}>
        {TABS.map((tab, i) => {
          const isActive = activeTab === tab.key;
          const Icon     = tab.Icon;
          return (
            <Animated.View
              key={tab.key}
              style={[styles.tabItem, { transform: [{ scale: tabScaleAnims[i] }] }]}
            >
              <Icon
                size={22}
                color={isActive ? '#47664a' : '#9a9c95'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {locale === 'tr' ? tab.labelTr : tab.labelEn}
              </Text>
              {isActive
                ? <View style={styles.tabDot} />
                : <View style={styles.tabDotHidden} />
              }
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CONTAINER_HEIGHT = BAR_HEIGHT + BUBBLE_SIZE + BUBBLE_GAP + 8;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: BAR_MARGIN,
    right: BAR_MARGIN,
    height: CONTAINER_HEIGHT,
    justifyContent: 'flex-end',  // tab bar pinned to bottom of container
  },

  // ── Floating bubble ─────────────────────────────────────────────────────────
  bubble: {
    position: 'absolute',
    bottom: BAR_HEIGHT + BUBBLE_GAP,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c8deca',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    shadowColor: '#2a4a2e',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },

  bubbleLabel: {
    color: '#47664a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // ── Tab bar ─────────────────────────────────────────────────────────────────
  tabBar: {
    height: BAR_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#30332e',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
  },

  tabText: {
    color: '#9a9c95',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  tabTextActive: {
    color: '#47664a',
    fontWeight: '700',
  },

  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#47664a',
    marginTop: 1,
  },

  tabDotHidden: {
    width: 5,
    height: 5,
    marginTop: 1,
  },
});
