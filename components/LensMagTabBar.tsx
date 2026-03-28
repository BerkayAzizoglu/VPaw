/**
 * LensMagTabBar — sliding pill tab bar.
 *
 * • Tap   → Pressable onPress → instant navigate  (reliable)
 * • Drag  → PanResponder claims after 6 px movement → pill follows,
 *           icons magnify, release → navigate  (smooth)
 *
 * Alignment fix: uses gestureState.moveX − barPageX (measured absolute
 * position) instead of locationX which is unreliable in nested views.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { HeartPulse } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { hap } from '../lib/haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabKey = 'home' | 'healthHub' | 'reminders' | 'insights';

interface Props {
  activeTab: TabKey;
  locale: string;
  onTabPress: (tab: TabKey) => void;
}

type IconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth: number;
  fill?: string;
}>;
type TabDef = { key: TabKey; labelTr: string; labelEn: string; Icon: IconComponent };

// ─── Config ───────────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { key: 'home',      labelTr: 'Ana Sayfa', labelEn: 'Home',      Icon: HeartPulse  },
  { key: 'healthHub', labelTr: 'Sağlık',    labelEn: 'Health',    Icon: HeartPulse  },
  { key: 'reminders', labelTr: 'Takip',     labelEn: 'Reminders', Icon: HeartPulse  },
  { key: 'insights',  labelTr: 'Analiz',    labelEn: 'Insights',  Icon: HeartPulse  },
];

const COLOR_ACTIVE   = '#446a63';
const COLOR_INACTIVE = '#96a09c';

// Glass lens appearance
const BAR_BG         = 'rgba(248, 245, 238, 0.78)';
const BAR_BORDER     = 'rgba(96, 112, 105, 0.10)';
const PILL_BG        = 'rgba(255, 255, 255, 0.72)';
const PILL_BORDER    = 'rgba(86, 104, 97, 0.08)';

const BAR_HEIGHT  = 82;
const BAR_MARGIN  = 18;
const PILL_HEIGHT = 68;
const PILL_RADIUS = 22;
const PILL_INSET  = 6;
const DRAG_THRESH = 6;
const MAX_JELLY = 0.15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTabIndex(key: TabKey): number {
  return TABS.findIndex((t) => t.key === key);
}

function getPillX(tabIdx: number, tabSlot: number): number {
  return tabIdx * tabSlot + PILL_INSET;
}

function clampPillXFromFingerX(fingerX: number, tabSlot: number, barWidth: number): number {
  const pillW = tabSlot - PILL_INSET * 2;
  const minX = PILL_INSET;
  const maxX = Math.max(minX, barWidth - pillW - PILL_INSET);
  return Math.max(minX, Math.min(maxX, fingerX - pillW / 2));
}

function hexToRgb(value: string) {
  const safe = value.replace('#', '');
  const full = safe.length === 3 ? safe.split('').map((c) => c + c).join('') : safe;
  const n = Number.parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function mixHexColor(fromHex: string, toHex: string, t: number) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const k = Math.max(0, Math.min(1, t));
  const r = Math.round(from.r + (to.r - from.r) * k);
  const g = Math.round(from.g + (to.g - from.g) * k);
  const b = Math.round(from.b + (to.b - from.b) * k);
  return `rgb(${r}, ${g}, ${b})`;
}

function HomeStackIcon({ strength }: { strength: number }) {
  const fill = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, strength);
  return (
    <View style={styles.homeIconWrap}>
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Path
          d="M22,5.724V2c0-.552-.447-1-1-1s-1,.448-1,1v2.366L14.797,.855c-1.699-1.146-3.895-1.146-5.594,0L2.203,5.579c-1.379,.931-2.203,2.48-2.203,4.145v9.276c0,2.757,2.243,5,5,5h2c.553,0,1-.448,1-1V14c0-.551,.448-1,1-1h6c.552,0,1,.449,1,1v9c0,.552,.447,1,1,1h2c2.757,0,5-2.243,5-5V9.724c0-1.581-.744-3.058-2-4Z"
          fill={fill}
        />
      </Svg>
    </View>
  );
}

function BellSolidIcon({ strength }: { strength: number }) {
  const fill = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, strength);
  return (
    <View style={styles.homeIconWrap}>
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Path
          d="m24,7.5v2c0,.829-.671,1.5-1.5,1.5s-1.5-.671-1.5-1.5v-.5H3v9.5c0,1.378,1.122,2.5,2.5,2.5h4c.829,0,1.5.671,1.5,1.5s-.671,1.5-1.5,1.5h-4c-3.033,0-5.5-2.467-5.5-5.5V7.5C0,4.467,2.467,2,5.5,2h.5v-.5c0-.829.671-1.5,1.5-1.5s1.5.671,1.5,1.5v.5h6v-.5c0-.829.671-1.5,1.5-1.5s1.5.671,1.5,1.5v.5h.5c3.033,0,5.5,2.467,5.5,5.5Zm-.049,12.001c.127.609-.025,1.234-.418,1.719-.402.496-1.003.78-1.648.78h-1.159c-.126,1.123-1.068,2-2.225,2s-2.099-.877-2.225-2h-1.165c-.644,0-1.245-.284-1.647-.779-.394-.483-.546-1.108-.42-1.715l.847-3.807c.509-2.151,2.445-3.699,4.609-3.699,2.035,0,3.959,1.417,4.575,3.369.015.047.876,4.133.876,4.133Zm-3.171-.501l-.586-2.786c-.247-.686-.979-1.214-1.695-1.214-.776,0-1.5.589-1.685,1.37l-.585,2.63h4.551Z"
          fill={fill}
        />
      </Svg>
    </View>
  );
}

function InsightSolidIcon({ strength }: { strength: number }) {
  const fill = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, strength);
  return (
    <View style={styles.homeIconWrap}>
      <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5.5,21A2.5,2.5,0,0,1,3,18.5V1.5A1.5,1.5,0,0,0,1.5,0h0A1.5,1.5,0,0,0,0,1.5v17A5.5,5.5,0,0,0,5.5,24h17A1.5,1.5,0,0,0,24,22.5h0A1.5,1.5,0,0,0,22.5,21Z"
          fill={fill}
        />
        <Path d="M19.5,18A1.5,1.5,0,0,0,21,16.5v-6a1.5,1.5,0,0,0-3,0v6A1.5,1.5,0,0,0,19.5,18Z" fill={fill} />
        <Path d="M7.5,18A1.5,1.5,0,0,0,9,16.5v-6a1.5,1.5,0,0,0-3,0v6A1.5,1.5,0,0,0,7.5,18Z" fill={fill} />
        <Path d="M13.5,18A1.5,1.5,0,0,0,15,16.5V5.5a1.5,1.5,0,0,0-3,0v11A1.5,1.5,0,0,0,13.5,18Z" fill={fill} />
      </Svg>
    </View>
  );
}

function HealthSolidIcon({ strength }: { strength: number }) {
  const fill = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, strength);
  return (
    <View style={styles.homeIconWrap}>
      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
          fill={fill}
        />
        <Path
          d="M6.95 11.7H9.05L10.35 9.5L12.15 14.2L13.45 11.95H16.95"
          stroke="#FFFFFF"
          strokeWidth={1.95}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LensMagTabBar({ activeTab, locale, onTabPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = screenWidth - BAR_MARGIN * 2;
  const tabSlot  = barWidth / TABS.length;

  // ── Animated values ─────────────────────────────────────────────────────────
  const pillXAnim     = useRef(new Animated.Value(getPillX(getTabIndex(activeTab), tabSlot))).current;
  const barScaleAnim = useRef(new Animated.Value(1)).current;
  const barOpacityAnim = useRef(new Animated.Value(1)).current;
  const pillScaleXAnim = useRef(new Animated.Value(1)).current;
  const pillScaleYAnim = useRef(new Animated.Value(1)).current;
  const pillShiftXAnim = useRef(new Animated.Value(0)).current;

  // ── State ────────────────────────────────────────────────────────────────────
  // Null = idle (show activeTab). Non-null = dragging preview.
  const [previewTab, setPreviewTab] = useState<TabKey | null>(null);
  const [dragFingerX, setDragFingerX] = useState<number | null>(null);
  const displayTab = previewTab ?? activeTab;

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isDragging       = useRef(false);
  const prevHoveredIdx   = useRef(-1);
  const lastDragXRef     = useRef<number | null>(null);
  const barPageX         = useRef(BAR_MARGIN); // measured absolute X of bar on screen

  // Always-fresh values for PanResponder closures
  const latestRef = useRef({ tabSlot, barWidth, onTabPress, activeTab, barPageX });
  latestRef.current = { tabSlot, barWidth, onTabPress, activeTab, barPageX };

  // ── Pill sync when activeTab changes externally ──────────────────────────────
  useEffect(() => {
    if (isDragging.current) return;
    Animated.spring(pillXAnim, {
      toValue: getPillX(getTabIndex(activeTab), tabSlot),
      useNativeDriver: false,
      tension: 260,
      friction: 24,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabSlot]);

  // ── Internal helpers ─────────────────────────────────────────────────────────

  function snapPill(tabIdx: number, fast: boolean) {
    const { tabSlot: ts } = latestRef.current;
    Animated.spring(pillXAnim, {
      toValue: getPillX(tabIdx, ts),
      useNativeDriver: false,
      tension: fast ? 380 : 260,
      friction: fast ? 28 : 24,
    }).start();
  }

  function animateDragBar(active: boolean) {
    Animated.parallel([
      Animated.spring(barScaleAnim, {
        toValue: active ? 1.012 : 1,
        useNativeDriver: true,
        tension: 220,
        friction: 18,
      }),
      Animated.timing(barOpacityAnim, {
        toValue: 1,
        duration: active ? 120 : 170,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function applyJelly(vx: number) {
    const intensity = Math.min(MAX_JELLY, Math.abs(vx) * 0.18);
    const direction = vx >= 0 ? 1 : -1;
    pillScaleXAnim.setValue(1 + intensity);
    pillScaleYAnim.setValue(1 - intensity * 0.52);
    pillShiftXAnim.setValue(direction * intensity * 7.5);
  }

  function resetJelly() {
    Animated.parallel([
      Animated.spring(pillScaleXAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 160,
        friction: 9,
      }),
      Animated.spring(pillScaleYAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 160,
        friction: 9,
      }),
      Animated.spring(pillShiftXAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 150,
        friction: 9,
      }),
    ]).start();
  }

  // ── PanResponder ─────────────────────────────────────────────────────────────
  // Uses onMoveShouldSetPanResponder so taps fall through to Pressable children.
  // Uses gestureState.moveX − barPageX for correct absolute-to-relative mapping.

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => false,  // let taps reach Pressable
      onMoveShouldSetPanResponder:         (_, gs) => Math.abs(gs.dx) > DRAG_THRESH,
      onMoveShouldSetPanResponderCapture:  (_, gs) => Math.abs(gs.dx) > DRAG_THRESH,

      onPanResponderGrant: (_, gestureState) => {
        isDragging.current     = true;
        prevHoveredIdx.current = -1;
        animateDragBar(true);

        // Initialise scales at where the gesture STARTED
        const { barPageX: bpx, barWidth: bw, tabSlot: ts } = latestRef.current;
        const startX = Math.max(0, Math.min(gestureState.x0 - bpx.current, bw));
        setDragFingerX(startX);
        lastDragXRef.current = startX;
        pillXAnim.setValue(clampPillXFromFingerX(startX, ts, bw));

        const startIdx = Math.min(Math.floor(startX / ts), TABS.length - 1);
        prevHoveredIdx.current = startIdx;
        setPreviewTab(TABS[startIdx].key);
      },

      onPanResponderMove: (_, gestureState) => {
        const { barPageX: bpx, barWidth: bw, tabSlot: ts } = latestRef.current;
        const x   = Math.max(0, Math.min(gestureState.moveX - bpx.current, bw));
        const idx = Math.min(Math.floor(x / ts), TABS.length - 1);
        if (lastDragXRef.current == null || Math.abs(lastDragXRef.current - x) >= 0.75) {
          lastDragXRef.current = x;
          setDragFingerX(x);
        }

        // Keep the magnifier moving continuously with the finger.
        pillXAnim.setValue(clampPillXFromFingerX(x, ts, bw));
        applyJelly(gestureState.vx);

        if (idx !== prevHoveredIdx.current) {
          prevHoveredIdx.current = idx;
          setPreviewTab(TABS[idx].key);
          hap.select();
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        const { barPageX: bpx, barWidth: bw, tabSlot: ts, onTabPress: press, activeTab: active } =
          latestRef.current;
        const x   = Math.max(0, Math.min(gestureState.moveX - bpx.current, bw));
        const idx = Math.min(Math.floor(x / ts), TABS.length - 1);
        const tab = TABS[idx]?.key ?? active;

        resetJelly();
        animateDragBar(false);
        setDragFingerX(null);
        lastDragXRef.current = null;
        setPreviewTab(null);
        prevHoveredIdx.current = -1;
        isDragging.current     = false;

        snapPill(getTabIndex(tab), false);
        hap.light();
        press(tab);
      },

      onPanResponderTerminate: () => {
        resetJelly();
        animateDragBar(false);
        setDragFingerX(null);
        lastDragXRef.current = null;
        setPreviewTab(null);
        prevHoveredIdx.current = -1;
        isDragging.current     = false;
        const { activeTab: active } = latestRef.current;
        snapPill(getTabIndex(active), false);
      },
    }),
  ).current;

  // ─── Render ──────────────────────────────────────────────────────────────────

  const pillW = tabSlot - PILL_INSET * 2;
  const currentPillX = dragFingerX == null
    ? getPillX(getTabIndex(displayTab), tabSlot)
    : clampPillXFromFingerX(dragFingerX, tabSlot, barWidth);
  const pillLeft = currentPillX;
  const pillRight = currentPillX + pillW;
  const overlapRange = Math.max(16, tabSlot * 0.24);
  const labelOverlapRange = Math.max(26, tabSlot * 0.38);
  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          opacity: barOpacityAnim,
          transform: [{ scale: barScaleAnim }],
        },
      ]}
      onLayout={(e) => {
        // Measure absolute screen X so PanResponder can convert moveX → relative
        e.target.measure((_x, _y, _w, _h, pageX) => {
          barPageX.current = pageX;
        });
      }}
      {...panResponder.panHandlers}
    >
      {/* ── Sliding pill (behind icons) ──────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            width: pillW,
            transform: [{ translateX: pillXAnim }, { translateX: pillShiftXAnim }, { scaleX: pillScaleXAnim }, { scaleY: pillScaleYAnim }],
          },
        ]}
      />

      {/* ── Tab items ────────────────────────────────────────────────────── */}
      {TABS.map((tab, i) => {
        const isActive = displayTab === tab.key;
        const iconCenter = tabSlot * (i + 0.5);
        const insidePill = iconCenter >= pillLeft && iconCenter <= pillRight ? 1 : 0;
        const edgeDistance = Math.min(Math.abs(iconCenter - pillLeft), Math.abs(iconCenter - pillRight));
        const nearEdge = Math.max(0, 1 - edgeDistance / overlapRange);
        const labelNearEdge = Math.max(0, 1 - edgeDistance / labelOverlapRange);
        const highlightStrength = dragFingerX == null ? (isActive ? 1 : 0) : Math.max(insidePill, nearEdge * 0.9);
        const labelHighlightStrength = dragFingerX == null ? (isActive ? 1 : 0) : Math.max(insidePill, labelNearEdge * 0.96);
        const iconColor = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, highlightStrength);
        const textColor = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, labelHighlightStrength);
        const isStrong = labelHighlightStrength >= 0.58;
        const Icon     = tab.Icon;

        return (
          <Animated.View key={tab.key} style={styles.tabItem}>
            <Pressable
              style={[styles.tabPressable, isActive && styles.tabPressableActive]}
              onPressIn={() => {
                if (isActive && !isDragging.current) {
                  animateDragBar(true);
                }
              }}
              onPressOut={() => {
                if (isActive && !isDragging.current) {
                  animateDragBar(false);
                }
              }}
              onPress={() => {
                hap.light();
                onTabPress(tab.key);
              }}
            >
              <View style={isActive ? styles.activeTabIcon : styles.inactiveTabIcon}>
                {tab.key === 'home' ? (
                  <HomeStackIcon strength={highlightStrength} />
                ) : tab.key === 'healthHub' ? (
                  <HealthSolidIcon strength={highlightStrength} />
                ) : tab.key === 'reminders' ? (
                  <BellSolidIcon strength={highlightStrength} />
                ) : tab.key === 'insights' ? (
                  <InsightSolidIcon strength={highlightStrength} />
                ) : (
                  <Icon
                    size={25}
                    color={iconColor}
                    strokeWidth={2 + highlightStrength * 0.5}
                    fill="none"
                  />
                )}
              </View>
              <Text style={[styles.tabText, { color: textColor }, isStrong && styles.tabTextBold]}>
                {locale === 'tr' ? tab.labelTr : tab.labelEn}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: BAR_MARGIN,
    right: BAR_MARGIN,
    bottom: 16,
    height: BAR_HEIGHT,
    borderRadius: 32,
    backgroundColor: BAR_BG,
    borderWidth: 1,
    borderColor: BAR_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#5f736d',
    shadowOpacity: 0.055,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(123, 144, 136, 0.10)',
    shadowColor: '#6d837d',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  tabPressableActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(86,104,97,0.07)',
    paddingHorizontal: 13,
    shadowColor: '#71867f',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },

  tabText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  tabTextBold: {
    fontWeight: '700',
  },
  activeTabIcon: {
    opacity: 1,
  },
  inactiveTabIcon: {
    opacity: 0.62,
  },
  homeIconWrap: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

