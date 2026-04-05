import React from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { hap } from '../lib/haptics';

export type TabKey = 'home' | 'healthHub' | 'reminders' | 'insights' | 'profile';

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
  { key: 'profile', labelTr: 'Profil', labelEn: 'Profile' },
];

const COLOR_ACTIVE = '#1f3738';
const COLOR_INACTIVE = '#6e737c';

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

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12.5C14.1 12.5 15.8 10.8 15.8 8.7C15.8 6.6 14.1 4.9 12 4.9C9.9 4.9 8.2 6.6 8.2 8.7C8.2 10.8 9.9 12.5 12 12.5Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.6 19.2C6.5 16.7 8.9 15.1 12 15.1C15.1 15.1 17.5 16.7 18.4 19.2"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TabIcon({ tabKey, color }: { tabKey: TabKey; color: string }) {
  if (tabKey === 'home') return <HomeIcon color={color} />;
  if (tabKey === 'healthHub') return <HealthIcon color={color} />;
  if (tabKey === 'reminders') return <ReminderIcon color={color} />;
  if (tabKey === 'insights') return <InsightsIcon color={color} />;
  return <ProfileIcon color={color} />;
}

export default function LensMagTabBar({ activeTab, locale, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 8);
  const barHeight = 54 + safeBottom;
  const barWidthRef = React.useRef(0);
  const dragLastTabRef = React.useRef<TabKey | null>(null);

  const pickTabFromX = React.useCallback((x: number): TabKey | null => {
    const width = barWidthRef.current;
    if (width <= 0) return null;
    const slotWidth = width / TABS.length;
    const index = Math.max(0, Math.min(TABS.length - 1, Math.floor(x / slotWidth)));
    return TABS[index]?.key ?? null;
  }, []);

  const trySelectByX = React.useCallback((x: number) => {
    const nextTab = pickTabFromX(x);
    if (!nextTab) return;
    if (dragLastTabRef.current === nextTab) return;
    dragLastTabRef.current = nextTab;
    if (nextTab !== activeTab) {
      hap.light();
      onTabPress(nextTab);
    }
  }, [activeTab, onTabPress, pickTabFromX]);

  const panResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onMoveShouldSetPanResponderCapture: (_evt, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: (evt) => {
        trySelectByX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        trySelectByX(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        dragLastTabRef.current = null;
      },
      onPanResponderTerminate: () => {
        dragLastTabRef.current = null;
      },
      onPanResponderTerminationRequest: () => true,
    }),
    [trySelectByX],
  );

  return (
    <View
      style={[styles.host, { height: barHeight, paddingBottom: safeBottom }]}
      onLayout={(event) => {
        barWidthRef.current = event.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      {TABS.map((tab, index) => {
        const label = locale === 'tr' ? tab.labelTr : tab.labelEn;
        const isActive = activeTab === tab.key;
        const color = isActive ? COLOR_ACTIVE : COLOR_INACTIVE;

        return (
          <View key={tab.key} style={styles.tabSlot}>
            <Pressable
              style={styles.tabButton}
              onPress={() => {
                hap.light();
                onTabPress(tab.key);
              }}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#3A8BFF', '#22D3C5']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.activeLine}
                />
              ) : null}
              <View style={styles.iconWrap}>
                <View style={[styles.iconScale, isActive && styles.iconScaleActive]}>
                  <TabIcon tabKey={tab.key} color={color} />
                </View>
              </View>
              <Text style={[styles.tabLabel, { color }, isActive && styles.tabLabelActive]} numberOfLines={1}>
                {label}
              </Text>
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
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(250,252,254,0.98)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(121,130,145,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(121,130,145,0.06)',
    shadowColor: '#1d252d',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
    overflow: 'hidden',
  },
  tabSlot: {
    flex: 1,
  },
  tabButton: {
    minHeight: 50,
    paddingTop: 7,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingHorizontal: 4,
    position: 'relative',
  },
  activeLine: {
    position: 'absolute',
    top: 0,
    width: 68,
    height: 3,
    borderRadius: 999,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconScale: {
    transform: [{ scale: 0.92 }],
  },
  iconScaleActive: {
    transform: [{ scale: 1.02 }],
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
