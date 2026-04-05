import React from 'react';
import PawLottie from '../components/PawLottie';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import type { AiInsight } from '../lib/insightsEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { monoType as mt } from '../lib/typography';

type InsightItem = {
  label: string;
  value: string;
  sub?: string;
};

type InsightsScreenProps = {
  scrollToTopSignal?: number;
  title?: string;
  items: InsightItem[];
  insights?: AiInsight[];
  breedCard?: {
    title: string;
    breed: string;
    text: string;
    meta?: string;
  };
  onInsightAction?: (insight: AiInsight) => void;
  onEmptyCta?: () => void;
  locale?: 'en' | 'tr';
};

const C = {
  bg: '#f6f4f0',
  surface: '#ffffff',
  surfaceSoft: '#f4f2ec',
  primary: '#47664a',
  accent: '#d9734d',
  onSurface: '#30332e',
  onSurfaceVariant: '#626863',
};

const insightsLogo = require('../assets/illustrations/insights-logo.png');

function IconSvg({
  kind,
  size = 18,
  color = '#5d605a',
}: {
  kind: 'stethoscope' | 'syringe' | 'pill' | 'alert' | 'trend' | 'suggestion' | 'spark';
  size?: number;
  color?: string;
}) {
  if (kind === 'stethoscope') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4V8.2C7 10.8 8.8 12.8 11.1 13.3V15.1C11.1 17.2 12.8 19 14.9 19C17 19 18.7 17.3 18.7 15.2V14.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.8 4V8.2C14.8 10.9 13 13 10.5 13.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Circle cx="18.9" cy="12.8" r="2.2" stroke={color} strokeWidth={1.9} />
    </Svg>
  );
  if (kind === 'syringe') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5L18.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M6 18L14.7 9.3L17.7 12.3L9 21H6V18Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Path d="M12 12L14 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M9.8 14.2L11.8 16.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
  if (kind === 'pill') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.5 14.5L14.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M7.8 7.8C6 9.6 6 12.5 7.8 14.3L9.8 16.3C11.6 18.1 14.5 18.1 16.3 16.3C18.1 14.5 18.1 11.6 16.3 9.8L14.3 7.8C12.5 6 9.6 6 7.8 7.8Z" stroke={color} strokeWidth={1.9} />
    </Svg>
  );
  if (kind === 'alert') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5L21 19H3L12 5Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Path d="M12 10V13.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Circle cx="12" cy="16.5" r="0.8" fill={color} />
    </Svg>
  );
  if (kind === 'trend') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3.5 16L8.5 11L12 14L18 8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.5 8H18V11.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4L13.3 8L17.5 9.3L13.3 10.6L12 14.6L10.7 10.6L6.5 9.3L10.7 8L12 4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

function BreedPetIcon({ color = '#9dd7bd' }: { color?: string }) {
  return (
    <Svg width={34} height={22} viewBox="0 0 34 22" fill="none">
      <Path
        d="M3 18.5H8.8C11.7 18.5 14.1 16.1 14.1 13.2V8.2C14.1 7.5 14.8 7 15.4 7.3L18.6 8.9C19 9.1 19.5 9.1 19.9 8.9L22.7 7.4C23.4 7 24.2 7.5 24.2 8.3V13.9C24.2 16.4 26.2 18.5 28.7 18.5H31"
        stroke={color}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M6.7 18.4C7.7 18.4 8.5 17.6 8.5 16.6C8.5 15.6 7.7 14.8 6.7 14.8C5.7 14.8 4.9 15.6 4.9 16.6C4.9 17.6 5.7 18.4 6.7 18.4Z" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function SmartOverviewBadgeArt() {
  return (
    <Svg width={88} height={88} viewBox="0 0 64 64" fill="none">
      <Path d="M17.8 26.3L15.3 25.1" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M20.5 20.5L18.8 18.3" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M26.2 17.6L25.9 14.9" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M32 16.7V14.1" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M40.2 17.8L41.4 15.3" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M45.4 22.2L47.7 20.6" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M46.5 28.9L49.2 28.8" stroke="#b2aed2" strokeWidth={2.3} strokeLinecap="round" />
      <Path d="M32 19.1C27.1 19.1 23.2 23 23.2 27.9C23.2 31 24.8 33.8 27.4 35.4V38.2C27.4 40 28.9 41.5 30.7 41.5H33.3C35.1 41.5 36.6 40 36.6 38.2V35.4C39.2 33.8 40.8 31 40.8 27.9C40.8 23 36.9 19.1 32 19.1Z" stroke="#706aab" strokeWidth={2.2} />
      <Path d="M32 41.6V44.2" stroke="#615c98" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M29.2 44.6H34.9" stroke="#615c98" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx="45.5" cy="40.8" r="9.8" fill="#8b89c6" stroke="#f3f2fd" strokeWidth={1.4} />
      <Path d="M45.5 35.8V40.8L48.7 43" stroke="#f4f3ff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function priorityColors(priority: AiInsight['priority']) {
  if (priority === 'high') return { bg: '#fdf0ee', fg: '#a93c2c', pill: '#fbe2dc' };
  if (priority === 'medium') return { bg: '#fdf8ef', fg: '#a2712d', pill: '#f8ead1' };
  return { bg: '#eef6ef', fg: '#47664a', pill: '#dfeedd' };
}

function typeColors(type: AiInsight['type']) {
  if (type === 'alert') return { bg: '#fde8e3', fg: '#b94747', icon: 'alert' as const };
  if (type === 'trend') return { bg: '#e7f0fb', fg: '#43688d', icon: 'trend' as const };
  return { bg: '#ebf3ea', fg: '#47664a', icon: 'suggestion' as const };
}

function typeLabel(type: AiInsight['type'], isTr: boolean) {
  if (type === 'alert') return isTr ? 'Uyari' : 'Alert';
  if (type === 'trend') return isTr ? 'Trend' : 'Trend';
  return isTr ? 'Oneri' : 'Suggestion';
}

function priorityLabel(priority: AiInsight['priority'], isTr: boolean) {
  if (priority === 'high') return isTr ? 'Yuksek' : 'High';
  if (priority === 'medium') return isTr ? 'Orta' : 'Medium';
  return isTr ? 'Dusuk' : 'Low';
}

function iconForItem(label: string): { kind: 'stethoscope' | 'syringe' | 'pill' | 'spark'; bg: string; fg: string } {
  const l = label.toLowerCase();
  if (l.includes('visit') || l.includes('ziyaret')) return { kind: 'stethoscope', bg: '#edffe3', fg: '#3a6e45' };
  if (l.includes('vaccine') || l.includes('asi')) return { kind: 'syringe', bg: '#ddeaf5', fg: '#3a6080' };
  if (l.includes('med') || l.includes('ilac')) return { kind: 'pill', bg: '#ede8f5', fg: '#5a4a7a' };
  return { kind: 'spark', bg: '#eeeee8', fg: '#5d605a' };
}

export default function InsightsScreen({
  scrollToTopSignal = 0,
  title,
  items,
  insights = [],
  breedCard,
  onInsightAction,
  onEmptyCta,
  locale = 'en',
}: InsightsScreenProps) {
  const isTr = locale === 'tr';
  const screenTitle = title ?? (isTr ? 'Akilli Ozet' : 'Smart Overview');
  const headline = insights[0];
  const mainScrollRef = React.useRef<ScrollView | null>(null);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 14);
  const topBarHeight = topInset + 56;
  const topChromeHeight = topInset + 58;
  const topChromeOpacity = scrollY.interpolate({
    inputRange: [0, 8, 84],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });
  const headerLogoOpacity = scrollY.interpolate({
    inputRange: [0, 4, 22, 66],
    outputRange: [0, 0.22, 0.78, 1],
    extrapolate: 'clamp',
  });
  const headerLogoScale = scrollY.interpolate({
    inputRange: [0, 28, 90],
    outputRange: [0.95, 0.985, 1],
    extrapolate: 'clamp',
  });
  const headerLogoTranslateY = scrollY.interpolate({
    inputRange: [0, 28, 90],
    outputRange: [-4, 0, 0],
    extrapolate: 'clamp',
  });
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, 8, 34, 76],
    outputRange: [1, 0.88, 0.26, 0],
    extrapolate: 'clamp',
  });
  const headerTitleTranslateY = scrollY.interpolate({
    inputRange: [0, 76, 160],
    outputRange: [0, -1, -4],
    extrapolate: 'clamp',
  });
  const headerTitleTranslateX = scrollY.interpolate({
    inputRange: [0, 76, 160],
    outputRange: [0, -4, -8],
    extrapolate: 'clamp',
  });

  React.useEffect(() => {
    mainScrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [scrollToTopSignal]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[styles.content, { paddingTop: topBarHeight + 18 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={24}
        directionalLockEnabled
      >
        <View style={styles.heroCard}>
          <ExpoLinearGradient
            pointerEvents="none"
            colors={['#f6f5fe', '#eeebfb', '#e7e3f8']}
            locations={[0.05, 0.55, 1]}
            start={{ x: 0.15, y: 0.2 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroRightOval}
          />
          <View pointerEvents="none" style={styles.heroRightCut} />
          <View style={styles.heroCardRow}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitleCompact}>{screenTitle}:</Text>
              <Text style={styles.heroTextCompact}>
                {headline?.message
                  ? headline.message
                  : isTr
                    ? 'Aktif hatırlatıcı yok. Daha iyi bakım için ekleyin.'
                    : 'No active reminders yet. Tap to add for better care.'}
              </Text>
            </View>
          </View>
          <View pointerEvents="none" style={styles.heroBadge}>
            <SmartOverviewBadgeArt />
          </View>
        </View>

        {breedCard ? (
          <View style={styles.breedInsightCard}>
            <View style={styles.breedInsightHeaderRow}>
              <View style={styles.breedInsightHeaderText}>
                <Text style={styles.breedInsightBreed}>{breedCard.breed}</Text>
                {breedCard.meta ? <Text style={styles.breedInsightMeta}>{breedCard.meta}</Text> : null}
              </View>
              <View style={styles.breedIconPill}>
                <BreedPetIcon />
              </View>
            </View>
            <Text style={styles.breedInsightBody}>{breedCard.text}</Text>
          </View>
        ) : null}

        {items.length > 0 ? (
          <View style={styles.metricsShell}>
            {items.slice(0, 4).map((item, index) => {
              const icon = iconForItem(item.label);
              return (
                <View key={item.label} style={[styles.metricCard, index % 2 === 0 && styles.metricCardLeft]}>
                  <View style={[styles.metricIcon, { backgroundColor: icon.bg }]}>
                    <IconSvg kind={icon.kind} size={18} color={icon.fg} />
                  </View>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {item.value}
                  </Text>
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  {item.sub ? <Text style={styles.metricSub} numberOfLines={2}>{item.sub}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{isTr ? 'Bugun one cikanlar' : 'What stands out today'}</Text>
          <Text style={styles.sectionSub}>{isTr ? 'Baglama uygun, hizli okunur notlar' : 'Quick notes with useful context'}</Text>
        </View>

        {insights.length > 0 ? (
          <View style={styles.insightList}>
            {insights.map((insight) => {
              const pc = priorityColors(insight.priority);
              const tc = typeColors(insight.type);
              return (
                <View key={insight.id} style={styles.insightCard}>
                  <View style={styles.insightTopRow}>
                    <View style={[styles.insightIcon, { backgroundColor: tc.bg }]}>
                      <IconSvg kind={tc.icon} size={16} color={tc.fg} />
                    </View>
                    <View style={styles.insightMeta}>
                      <Text style={styles.insightType}>{typeLabel(insight.type, isTr)}</Text>
                      <View style={[styles.priorityPill, { backgroundColor: pc.pill }]}>
                        <Text style={[styles.priorityPillText, { color: pc.fg }]}>{priorityLabel(insight.priority, isTr)}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.insightMessage}>{insight.message}</Text>

                  {insight.actionType && insight.actionLabel ? (
                    <Pressable style={styles.actionBtn} onPress={() => onInsightAction?.(insight)}>
                      <Text style={styles.actionBtnText}>{insight.actionLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <PawLottie size={92} />
            <Text style={styles.emptyTitle}>{isTr ? 'Icgoruler hazirlaniyor' : 'Insights are getting ready'}</Text>
            <Text style={styles.emptyBody}>
              {isTr
                ? 'Ilk saglik kaydini ekleyin, burada net ozetler gorunmeye baslasin.'
                : 'Add your first health record and this space will turn into a clear summary.'}
            </Text>
            {onEmptyCta ? (
              <Pressable style={styles.emptyCtaBtn} onPress={onEmptyCta}>
                <Text style={styles.emptyCtaText}>{isTr ? 'Ilk Kaydi Ekle' : 'Add First Record'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </Animated.ScrollView>

      <View pointerEvents="box-none" style={styles.topChrome}>
        <Animated.View pointerEvents="none" style={[styles.topChromeSurface, { height: topChromeHeight, opacity: topChromeOpacity }]}>
          <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFillObject} />
          <ExpoLinearGradient
            colors={['rgba(242,246,250,0.95)', 'rgba(232,240,248,0.72)', 'rgba(242,246,250,0.20)', 'rgba(242,246,250,0)']}
            locations={[0, 0.45, 0.8, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <View style={[styles.topBarRow, { height: topBarHeight + 2, paddingTop: topInset + 2 }]}>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.topBarTitle,
              {
                opacity: headerTitleOpacity,
                transform: [
                  { translateX: headerTitleTranslateX },
                  { translateY: headerTitleTranslateY },
                ],
              },
            ]}
          >
            {isTr ? 'Insights' : 'Insights'}
          </Animated.Text>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.topBarCenterIconWrap,
              { top: topInset + 2, height: 56 },
              {
                opacity: headerLogoOpacity,
                transform: [{ translateY: headerLogoTranslateY }, { scale: headerLogoScale }],
              },
            ]}
          >
            <Image source={insightsLogo} style={styles.topBarCenterIcon} resizeMode="contain" />
          </Animated.View>
          <View style={styles.topBarGhost} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 124, gap: 18 },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topChromeSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(95,118,140,0.20)',
  },
  topBarRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    position: 'relative',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#24342d',
  },
  topBarCenterIconWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  topBarCenterIcon: {
    width: 102,
    height: 102,
    marginTop: -8,
    opacity: 0.98,
    shadowColor: '#0f2019',
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  topBarGhost: {
    width: 42,
    height: 42,
  },
  heroCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f2effd',
    borderWidth: 1,
    borderColor: 'rgba(134,129,171,0.24)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  heroCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroTextCol: {
    flex: 1,
    paddingTop: 2,
    paddingRight: 104,
  },
  heroTitleCompact: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  heroTextCompact: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: '#4f4e63',
    fontWeight: '700',
  },
  heroRightOval: {
    position: 'absolute',
    right: -64,
    top: -18,
    width: 176,
    height: 128,
    borderRadius: 88,
    borderWidth: 1.4,
    borderColor: 'rgba(156,148,200,0.42)',
  },
  heroRightCut: {
    position: 'absolute',
    right: 118,
    top: 0,
    width: 12,
    height: 100,
    backgroundColor: '#f2effd',
  },
  heroBadge: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breedInsightCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(93,103,99,0.16)',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  breedInsightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  breedInsightHeaderText: {
    flex: 1,
  },
  breedIconPill: {
    marginTop: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f3faf6',
    borderWidth: 1,
    borderColor: 'rgba(141, 198, 170, 0.22)',
  },
  breedInsightBreed: {
    fontSize: 19,
    lineHeight: 24,
    color: '#1f2329',
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  breedInsightMeta: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#585d63',
    fontWeight: '600',
  },
  breedInsightBody: {
    marginTop: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#353a40',
    fontWeight: '500',
  },
  metricsShell: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    minHeight: 122,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(110,120,116,0.07)',
    gap: 8,
  },
  metricCardLeft: {
    marginRight: 0,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    ...mt.metricLg,
    fontSize: 25,
    lineHeight: 28,
    color: '#26312f',
    letterSpacing: -0.6,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#707670',
    fontWeight: '700',
  },
  metricSub: {
    fontSize: 12,
    lineHeight: 17,
    color: '#838983',
    fontWeight: '500',
  },
  sectionHeader: {
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 29,
    color: '#25312f',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSub: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7b817c',
    fontWeight: '500',
  },
  insightList: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(110,120,116,0.07)',
    gap: 12,
  },
  insightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  insightType: {
    fontSize: 13,
    lineHeight: 17,
    color: '#626863',
    fontWeight: '700',
  },
  priorityPill: {
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  insightMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#30332e',
    fontWeight: '500',
  },
  actionBtn: {
    alignSelf: 'flex-start',
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
  },
  actionBtnText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#47664a',
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(110,120,116,0.07)',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 27,
    color: '#30332e',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#6d726d',
    textAlign: 'center',
  },
  emptyCtaBtn: {
    marginTop: 16,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ef',
  },
  emptyCtaText: {
    fontSize: 14,
    lineHeight: 17,
    color: '#47664a',
    fontWeight: '700',
  },
});
