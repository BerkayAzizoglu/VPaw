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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { hap } from '../lib/haptics';

export type TabKey = 'home' | 'healthHub' | 'reminders' | 'insights';

type Props = {
  activeTab: TabKey;
  locale: string;
  onTabPress: (tab: TabKey) => void;
};

type TabDef = {
  key: TabKey;
  labelTr: string;
  labelEn: string;
};

const TABS: TabDef[] = [
  { key: 'home', labelTr: 'Ana Sayfa', labelEn: 'Home' },
  { key: 'healthHub', labelTr: 'Saglik', labelEn: 'Health' },
  { key: 'reminders', labelTr: 'Takip', labelEn: 'Reminders' },
  { key: 'insights', labelTr: 'Analiz', labelEn: 'Insights' },
];

const COLOR_ACTIVE = '#2e5a53';
const COLOR_INACTIVE = '#8d958f';
const BAR_MARGIN = 14;
const BAR_HEIGHT = 70;
const PILL_INSET = 6;
const PILL_HEIGHT = 60;
const DRAG_THRESHOLD = 6;

function getTabIndex(tab: TabKey) {
  return TABS.findIndex((item) => item.key === tab);
}

function getPillX(tabIndex: number, tabSlot: number) {
  return tabIndex * tabSlot + PILL_INSET;
}

function clampPillX(fingerX: number, tabSlot: number, barWidth: number) {
  const pillWidth = tabSlot - PILL_INSET * 2;
  const minX = PILL_INSET;
  const maxX = Math.max(minX, barWidth - pillWidth - PILL_INSET);
  return Math.max(minX, Math.min(maxX, fingerX - pillWidth / 2));
}

function mixHexColor(fromHex: string, toHex: string, strength: number) {
  const parse = (value: string) => {
    const safe = value.replace('#', '');
    const full = safe.length === 3 ? safe.split('').map((part) => part + part).join('') : safe;
    const int = Number.parseInt(full, 16);
    return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
  };
  const from = parse(fromHex);
  const to = parse(toHex);
  const t = Math.max(0, Math.min(1, strength));
  return `rgb(${Math.round(from.r + (to.r - from.r) * t)}, ${Math.round(from.g + (to.g - from.g) * t)}, ${Math.round(from.b + (to.b - from.b) * t)})`;
}

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 10.2L12 4L19.5 10.2V18.2C19.5 19.1 18.8 19.8 17.9 19.8H14.1V13.9H9.9V19.8H6.1C5.2 19.8 4.5 19.1 4.5 18.2V10.2Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HealthIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20.4L10.8 19.3C6.1 15.1 3 12.3 3 8.8C3 6.1 5.1 4 7.8 4C9.3 4 10.8 4.7 12 6C13.2 4.7 14.7 4 16.2 4C18.9 4 21 6.1 21 8.8C21 12.3 17.9 15.1 13.2 19.3L12 20.4Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.1 11.9H9.3L10.7 9.4L12.5 14.1L13.9 11.6H16.9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ReminderIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4.8V3.6M17 4.8V3.6M4 8H20M6.2 20H17.8C18.8 20 19.6 19.2 19.6 18.2V6.8C19.6 5.8 18.8 5 17.8 5H6.2C5.2 5 4.4 5.8 4.4 6.8V18.2C4.4 19.2 5.2 20 6.2 20Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 13.1V16.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M12 9.2H12.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function InsightsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M5.3 19.5V11.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 19.5V6.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18.7 19.5V9.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function TabIcon({ tabKey, color }: { tabKey: TabKey; color: string }) {
  if (tabKey === 'home') return <HomeIcon color={color} />;
  if (tabKey === 'healthHub') return <HealthIcon color={color} />;
  if (tabKey === 'reminders') return <ReminderIcon color={color} />;
  return <InsightsIcon color={color} />;
}

export default function LensMagTabBar({ activeTab, locale, onTabPress }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barWidth = screenWidth - BAR_MARGIN * 2;
  const tabSlot = barWidth / TABS.length;
  const pillWidth = tabSlot - PILL_INSET * 2;
  const bottomOffset = Math.max(insets.bottom, 4);

  const pillXAnim = useRef(new Animated.Value(getPillX(getTabIndex(activeTab), tabSlot))).current;
  const [previewTab, setPreviewTab] = useState<TabKey | null>(null);
  const [dragFingerX, setDragFingerX] = useState<number | null>(null);
  const displayTab = previewTab ?? activeTab;

  const isDraggingRef = useRef(false);
  const lastHoverIndexRef = useRef(-1);
  const lastDragXRef = useRef<number | null>(null);
  const barPageXRef = useRef(BAR_MARGIN);

  const latestRef = useRef({ tabSlot, barWidth, onTabPress, activeTab, barPageXRef });
  latestRef.current = { tabSlot, barWidth, onTabPress, activeTab, barPageXRef };

  useEffect(() => {
    if (isDraggingRef.current) return;
    Animated.spring(pillXAnim, {
      toValue: getPillX(getTabIndex(activeTab), tabSlot),
      useNativeDriver: false,
      tension: 240,
      friction: 26,
    }).start();
  }, [activeTab, pillXAnim, tabSlot]);

  function snapToIndex(index: number) {
    Animated.spring(pillXAnim, {
      toValue: getPillX(index, latestRef.current.tabSlot),
      useNativeDriver: false,
      tension: 240,
      friction: 26,
    }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => Math.abs(gestureState.dx) > DRAG_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_evt, gestureState) => Math.abs(gestureState.dx) > DRAG_THRESHOLD,

      onPanResponderGrant: (_evt, gestureState) => {
        const { barWidth: currentBarWidth, tabSlot: currentTabSlot, barPageXRef: currentBarPageXRef } = latestRef.current;
        const startX = Math.max(0, Math.min(gestureState.x0 - currentBarPageXRef.current, currentBarWidth));
        const startIndex = Math.min(Math.floor(startX / currentTabSlot), TABS.length - 1);

        isDraggingRef.current = true;
        lastHoverIndexRef.current = startIndex;
        lastDragXRef.current = startX;
        setDragFingerX(startX);
        setPreviewTab(TABS[startIndex].key);
        pillXAnim.setValue(clampPillX(startX, currentTabSlot, currentBarWidth));
      },

      onPanResponderMove: (_evt, gestureState) => {
        const { barWidth: currentBarWidth, tabSlot: currentTabSlot, barPageXRef: currentBarPageXRef } = latestRef.current;
        const nextX = Math.max(0, Math.min(gestureState.moveX - currentBarPageXRef.current, currentBarWidth));
        const hoveredIndex = Math.min(Math.floor(nextX / currentTabSlot), TABS.length - 1);

        if (lastDragXRef.current == null || Math.abs(lastDragXRef.current - nextX) >= 0.75) {
          lastDragXRef.current = nextX;
          setDragFingerX(nextX);
        }

        pillXAnim.setValue(clampPillX(nextX, currentTabSlot, currentBarWidth));

        if (hoveredIndex !== lastHoverIndexRef.current) {
          lastHoverIndexRef.current = hoveredIndex;
          setPreviewTab(TABS[hoveredIndex].key);
          hap.select();
        }
      },

      onPanResponderRelease: (_evt, gestureState) => {
        const {
          activeTab: currentActiveTab,
          barWidth: currentBarWidth,
          tabSlot: currentTabSlot,
          onTabPress: currentOnTabPress,
          barPageXRef: currentBarPageXRef,
        } = latestRef.current;
        const nextX = Math.max(0, Math.min(gestureState.moveX - currentBarPageXRef.current, currentBarWidth));
        const targetIndex = Math.min(Math.floor(nextX / currentTabSlot), TABS.length - 1);
        const targetTab = TABS[targetIndex]?.key ?? currentActiveTab;

        setDragFingerX(null);
        setPreviewTab(null);
        lastDragXRef.current = null;
        lastHoverIndexRef.current = -1;
        isDraggingRef.current = false;
        snapToIndex(getTabIndex(targetTab));
        hap.light();
        currentOnTabPress(targetTab);
      },

      onPanResponderTerminate: () => {
        setDragFingerX(null);
        setPreviewTab(null);
        lastDragXRef.current = null;
        lastHoverIndexRef.current = -1;
        isDraggingRef.current = false;
        snapToIndex(getTabIndex(latestRef.current.activeTab));
      },
    }),
  ).current;

  const currentPillLeft =
    dragFingerX == null ? getPillX(getTabIndex(displayTab), tabSlot) : clampPillX(dragFingerX, tabSlot, barWidth);
  const currentPillRight = currentPillLeft + pillWidth;
  const overlapRange = Math.max(16, tabSlot * 0.24);

  return (
    <View
      style={[styles.host, { bottom: bottomOffset }]}
      onLayout={(event) => {
        event.target.measure((_x, _y, _w, _h, pageX) => {
          barPageXRef.current = pageX;
        });
      }}
      {...panResponder.panHandlers}
    >
      <BlurView intensity={44} tint="light" style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.surfaceTint} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.selectionPill,
          {
            transform: [{ translateX: pillXAnim }],
            width: pillWidth,
          },
        ]}
      />

      {TABS.map((tab, index) => {
        const label = locale === 'tr' ? tab.labelTr : tab.labelEn;
        const iconCenter = tabSlot * (index + 0.5);
        const isInsidePill = iconCenter >= currentPillLeft && iconCenter <= currentPillRight ? 1 : 0;
        const distanceToEdge = Math.min(Math.abs(iconCenter - currentPillLeft), Math.abs(iconCenter - currentPillRight));
        const edgeStrength = Math.max(0, 1 - distanceToEdge / overlapRange);
        const strength = dragFingerX == null ? (displayTab === tab.key ? 1 : 0) : Math.max(isInsidePill, edgeStrength * 0.92);
        const color = mixHexColor(COLOR_INACTIVE, COLOR_ACTIVE, strength);

        return (
          <View key={tab.key} style={styles.tabSlot}>
            <Pressable
              style={styles.tabButton}
              onPress={() => {
                hap.light();
                onTabPress(tab.key);
              }}
            >
              <TabIcon tabKey={tab.key} color={color} />
              <Text style={[styles.tabLabel, { color }, displayTab === tab.key && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: BAR_MARGIN,
    right: BAR_MARGIN,
    height: BAR_HEIGHT,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(112,123,117,0.10)',
    backgroundColor: 'rgba(250,248,244,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#48524d',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  surfaceTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250,248,244,0.48)',
  },
  selectionPill: {
    position: 'absolute',
    left: 0,
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(95,110,102,0.10)',
  },
  tabSlot: {
    flex: 1,
    zIndex: 1,
  },
  tabButton: {
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
