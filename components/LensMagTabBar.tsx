/**
 * LensMagTabBar — fluid sliding-pill tab bar.
 *
 * Interaction:
 *  • Tap          → navigate instantly
 *  • Hold + drag  → pill and active color follow finger in real-time,
 *                   icons swell with Gaussian magnification; release = navigate
 *
 * Per-tab accent colors:
 *  • Home      → forest green  #3e6e47
 *  • Health    → warm red      #be3b2c
 *  • Reminders → amber         #b07812
 *  • Insights  → teal          #1a7ea6
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
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
type TabDef = {
  key: TabKey;
  labelTr: string;
  labelEn: string;
  Icon: IconComponent;
};

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  { key: 'home',      labelTr: 'Ana Sayfa', labelEn: 'Home',      Icon: Home        },
  { key: 'healthHub', labelTr: 'Sağlık',    labelEn: 'Health',    Icon: HeartPulse  },
  { key: 'reminders', labelTr: 'Takip',     labelEn: 'Reminders', Icon: Bell        },
  { key: 'insights',  labelTr: 'Analiz',    labelEn: 'Insights',  Icon: ChartSpline },
];

// Per-tab accent: active icon color, inactive (muted), pill background
const ACCENT: Record<TabKey, { active: string; inactive: string; pill: string }> = {
  home:      { active: '#3e6e47', inactive: '#9db8a0', pill: '#e8f2ea' },
  healthHub: { active: '#be3b2c', inactive: '#d4a09a', pill: '#fceeed' },
  reminders: { active: '#b07812', inactive: '#c9a558', pill: '#fdf4e0' },
  insights:  { active: '#1a7ea6', inactive: '#7ab4c8', pill: '#e6f3f8' },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_HEIGHT   = 66;
const BAR_MARGIN   = 16;
const PILL_HEIGHT  = 50;
const PILL_RADIUS  = 16;
const PILL_INSET   = 6;   // horizontal padding inside each tab slot
const DRAG_THRESH  = 6;   // px before drag mode activates

// ─── Module helpers ───────────────────────────────────────────────────────────

function getTabIndex(key: TabKey): number {
  return TABS.findIndex((t) => t.key === key);
}

function gaussianScale(fingerX: number, tabIdx: number, tabSlot: number): number {
  const center = tabSlot * (tabIdx + 0.5);
  const dist   = Math.abs(fingerX - center);
  const sigma  = tabSlot * 0.60;
  return 1 + 0.48 * Math.exp(-(dist * dist) / (2 * sigma * sigma));
}

function pillX(tabIdx: number, tabSlot: number): number {
  return tabIdx * tabSlot + PILL_INSET;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LensMagTabBar({ activeTab, locale, onTabPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = screenWidth - BAR_MARGIN * 2;
  const tabSlot  = barWidth / TABS.length;

  // ── Animated values ─────────────────────────────────────────────────────────

  // Pill X: JS-driven so toValue can depend on runtime tabSlot
  const pillXAnim = useRef(
    new Animated.Value(pillX(getTabIndex(activeTab), tabSlot)),
  ).current;

  // Per-tab icon scale: native-driver (pure transform)
  const tabScaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  // ── State ────────────────────────────────────────────────────────────────────

  // Null while idle; set to dragged-over tab during live drag preview
  const [previewTab, setPreviewTab] = useState<TabKey | null>(null);
  const displayTab = previewTab ?? activeTab;

  // ── Mutable refs ─────────────────────────────────────────────────────────────

  const isDragging       = useRef(false);
  const hasMoved         = useRef(false);
  const prevHoveredIdx   = useRef(-1);

  // Always-fresh values for use inside PanResponder callbacks
  const latestRef = useRef({ tabSlot, barWidth, onTabPress, activeTab });
  latestRef.current = { tabSlot, barWidth, onTabPress, activeTab };

  // ── Pill sync when parent navigates ─────────────────────────────────────────

  useEffect(() => {
    if (isDragging.current) return;
    Animated.spring(pillXAnim, {
      toValue: pillX(getTabIndex(activeTab), tabSlot),
      useNativeDriver: false,
      tension: 260,
      friction: 24,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabSlot]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function snapPillTo(idx: number, fast: boolean) {
    const { tabSlot: ts } = latestRef.current;
    Animated.spring(pillXAnim, {
      toValue: pillX(idx, ts),
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

  // ── PanResponder (created once) ───────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: () => {
        isDragging.current     = false;
        hasMoved.current       = false;
        prevHoveredIdx.current = -1;
      },

      onPanResponderMove: (evt, gestureState) => {
        const { barWidth: bw, tabSlot: ts } = latestRef.current;
        const x   = Math.max(0, Math.min(evt.nativeEvent.locationX, bw));
        const idx = Math.min(Math.floor(x / ts), TABS.length - 1);

        // Activate drag mode after threshold
        if (!hasMoved.current && Math.abs(gestureState.dx) > DRAG_THRESH) {
          hasMoved.current   = true;
          isDragging.current = true;
        }

        if (isDragging.current) {
          applyScales(x);

          if (idx !== prevHoveredIdx.current) {
            prevHoveredIdx.current = idx;
            setPreviewTab(TABS[idx].key);
            snapPillTo(idx, true);
            hap.select(); // discrete tick per tab crossing
          }
        }
      },

      onPanResponderRelease: (evt) => {
        const { barWidth: bw, tabSlot: ts, onTabPress: press, activeTab: active } =
          latestRef.current;
        const x   = Math.max(0, Math.min(evt.nativeEvent.locationX, bw));
        const idx = Math.min(Math.floor(x / ts), TABS.length - 1);
        const tab = TABS[idx]?.key ?? active;

        springResetScales();
        setPreviewTab(null);
        prevHoveredIdx.current = -1;
        isDragging.current     = false;
        hasMoved.current       = false;

        snapPillTo(getTabIndex(tab), false);
        hap.light(); // confirm navigation
        press(tab);
      },

      onPanResponderTerminate: () => {
        springResetScales();
        setPreviewTab(null);
        prevHoveredIdx.current = -1;
        isDragging.current     = false;
        hasMoved.current       = false;
        const { activeTab: active } = latestRef.current;
        snapPillTo(getTabIndex(active), false);
      },
    }),
  ).current;

  // ─── Render ──────────────────────────────────────────────────────────────────

  const pillW = tabSlot - PILL_INSET * 2;

  return (
    <View style={styles.tabBar} {...panResponder.panHandlers}>

      {/* ── Sliding pill (behind icons) ──────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            width: pillW,
            backgroundColor: ACCENT[displayTab].pill,
            transform: [{ translateX: pillXAnim }],
          },
        ]}
      />

      {/* ── Tab items ────────────────────────────────────────────────────── */}
      {TABS.map((tab, i) => {
        const isActive = displayTab === tab.key;
        const color    = isActive ? ACCENT[tab.key].active : ACCENT[tab.key].inactive;
        const Icon     = tab.Icon;

        return (
          <Animated.View
            key={tab.key}
            style={[styles.tabItem, { transform: [{ scale: tabScaleAnims[i] }] }]}
          >
            <Icon size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />
            <Text style={[styles.tabText, { color }, isActive && styles.tabTextBold]}>
              {locale === 'tr' ? tab.labelTr : tab.labelEn}
            </Text>
            <View
              style={[
                styles.tabDot,
                { backgroundColor: isActive ? ACCENT[tab.key].active : 'transparent' },
              ]}
            />
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
    overflow: 'hidden',  // pill stays within rounded bar
  },

  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 6,
    zIndex: 1,  // above pill
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
