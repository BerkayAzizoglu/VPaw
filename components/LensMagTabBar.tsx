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
import { Bell, ChartSpline, HeartPulse, Home } from 'lucide-react-native';
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
}>;
type TabDef = { key: TabKey; labelTr: string; labelEn: string; Icon: IconComponent };

// ─── Config ───────────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { key: 'home',      labelTr: 'Ana Sayfa', labelEn: 'Home',      Icon: Home        },
  { key: 'healthHub', labelTr: 'Sağlık',    labelEn: 'Health',    Icon: HeartPulse  },
  { key: 'reminders', labelTr: 'Takip',     labelEn: 'Reminders', Icon: Bell        },
  { key: 'insights',  labelTr: 'Analiz',    labelEn: 'Insights',  Icon: ChartSpline },
];

const COLOR_ACTIVE   = '#47664a';
const COLOR_INACTIVE = '#9a9c95';
const PILL_BG        = '#e8f2ea';

const BAR_HEIGHT  = 66;
const BAR_MARGIN  = 16;
const PILL_HEIGHT = 50;
const PILL_RADIUS = 16;
const PILL_INSET  = 6;
const DRAG_THRESH = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTabIndex(key: TabKey): number {
  return TABS.findIndex((t) => t.key === key);
}

function getPillX(tabIdx: number, tabSlot: number): number {
  return tabIdx * tabSlot + PILL_INSET;
}

function gaussianScale(fingerX: number, tabIdx: number, tabSlot: number): number {
  const center = tabSlot * (tabIdx + 0.5);
  const dist   = Math.abs(fingerX - center);
  const sigma  = tabSlot * 0.60;
  return 1 + 0.45 * Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LensMagTabBar({ activeTab, locale, onTabPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = screenWidth - BAR_MARGIN * 2;
  const tabSlot  = barWidth / TABS.length;

  // ── Animated values ─────────────────────────────────────────────────────────
  const pillXAnim     = useRef(new Animated.Value(getPillX(getTabIndex(activeTab), tabSlot))).current;
  const tabScaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  // ── State ────────────────────────────────────────────────────────────────────
  // Null = idle (show activeTab). Non-null = dragging preview.
  const [previewTab, setPreviewTab] = useState<TabKey | null>(null);
  const displayTab = previewTab ?? activeTab;

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const isDragging       = useRef(false);
  const prevHoveredIdx   = useRef(-1);
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

  function applyScales(fingerX: number) {
    const { tabSlot: ts } = latestRef.current;
    tabScaleAnims.forEach((anim, i) => {
      anim.setValue(gaussianScale(fingerX, i, ts));
    });
  }

  function springResetScales() {
    tabScaleAnims.forEach((anim) => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 130,
        friction: 10,
      }).start();
    });
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

        // Initialise scales at where the gesture STARTED
        const { barPageX: bpx, barWidth: bw, tabSlot: ts } = latestRef.current;
        const startX = Math.max(0, Math.min(gestureState.x0 - bpx.current, bw));
        applyScales(startX);

        const startIdx = Math.min(Math.floor(startX / ts), TABS.length - 1);
        prevHoveredIdx.current = startIdx;
        setPreviewTab(TABS[startIdx].key);
        snapPill(startIdx, true);
      },

      onPanResponderMove: (_, gestureState) => {
        const { barPageX: bpx, barWidth: bw, tabSlot: ts } = latestRef.current;
        const x   = Math.max(0, Math.min(gestureState.moveX - bpx.current, bw));
        const idx = Math.min(Math.floor(x / ts), TABS.length - 1);

        applyScales(x);

        if (idx !== prevHoveredIdx.current) {
          prevHoveredIdx.current = idx;
          setPreviewTab(TABS[idx].key);
          snapPill(idx, true);
          hap.select();
        }
      },

      onPanResponderRelease: (_, gestureState) => {
        const { barPageX: bpx, barWidth: bw, tabSlot: ts, onTabPress: press, activeTab: active } =
          latestRef.current;
        const x   = Math.max(0, Math.min(gestureState.moveX - bpx.current, bw));
        const idx = Math.min(Math.floor(x / ts), TABS.length - 1);
        const tab = TABS[idx]?.key ?? active;

        springResetScales();
        setPreviewTab(null);
        prevHoveredIdx.current = -1;
        isDragging.current     = false;

        snapPill(getTabIndex(tab), false);
        hap.light();
        press(tab);
      },

      onPanResponderTerminate: () => {
        springResetScales();
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

  return (
    <View
      style={styles.tabBar}
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
            transform: [{ translateX: pillXAnim }],
          },
        ]}
      />

      {/* ── Tab items ────────────────────────────────────────────────────── */}
      {TABS.map((tab, i) => {
        const isActive = displayTab === tab.key;
        const color    = isActive ? COLOR_ACTIVE : COLOR_INACTIVE;
        const Icon     = tab.Icon;

        return (
          <Animated.View
            key={tab.key}
            style={[styles.tabItem, { transform: [{ scale: tabScaleAnims[i] }] }]}
          >
            <Pressable
              style={styles.tabPressable}
              onPress={() => {
                hap.light();
                onTabPress(tab.key);
              }}
            >
              <Icon size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />
              <Text style={[styles.tabText, { color }, isActive && styles.tabTextBold]}>
                {locale === 'tr' ? tab.labelTr : tab.labelEn}
              </Text>
              <View
                style={[
                  styles.tabDot,
                  { backgroundColor: isActive ? COLOR_ACTIVE : 'transparent' },
                ]}
              />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: BAR_MARGIN,
    right: BAR_MARGIN,
    bottom: 20,
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

  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: PILL_BG,
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
    gap: 3,
    paddingTop: 6,
    paddingBottom: 2,
    paddingHorizontal: 8,
  },

  tabText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  tabTextBold: {
    fontWeight: '700',
  },

  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 1,
  },
});
