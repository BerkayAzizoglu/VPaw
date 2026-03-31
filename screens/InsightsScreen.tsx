import React from 'react';
import PawLottie from '../components/PawLottie';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const headerTitleScale = scrollY.interpolate({
    inputRange: [0, 84, 180],
    outputRange: [1.05, 0.97, 0.9],
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
          <Text style={styles.heroEyebrow}>{isTr ? 'INSIGHTS' : 'INSIGHTS'}</Text>
          <Text style={styles.heroTitle}>{screenTitle}</Text>
          <Text style={styles.heroText}>
            {headline?.message
              ? headline.message
              : isTr
                ? 'Kayitlar arttikca daha net saglik baglami ve takip oncelikleri gosteririz.'
                : 'As more records arrive, this view turns them into clearer health context and priorities.'}
          </Text>
        </View>

        {breedCard ? (
          <View style={styles.breedInsightCard}>
            <View style={styles.breedInsightTop}>
              <View style={styles.breedInsightIconWrap}>
                <IconSvg kind="spark" size={16} color="#43688d" />
              </View>
              <Text style={styles.breedInsightTitle}>{breedCard.title}</Text>
            </View>
            <Text style={styles.breedInsightBreed}>{breedCard.breed}</Text>
            {breedCard.meta ? <Text style={styles.breedInsightMeta}>{breedCard.meta}</Text> : null}
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
          <Animated.Text numberOfLines={1} style={[styles.topBarTitleText, { transform: [{ scale: headerTitleScale }] }]}>
            {isTr ? 'Analiz' : 'Insights'}
          </Animated.Text>
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
  },
  topBarTitleText: {
    flex: 1,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -1,
  },
  topBarGhost: {
    width: 42,
    height: 42,
  },
  heroCard: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(110,120,116,0.08)',
    shadowColor: '#6f7f79',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroEyebrow: {
    fontSize: 10,
    lineHeight: 14,
    color: '#767d79',
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.9,
  },
  heroText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    fontWeight: '500',
  },
  breedInsightCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(74,114,148,0.14)',
    gap: 6,
  },
  breedInsightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breedInsightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e7f0fb',
  },
  breedInsightTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5a6982',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  breedInsightBreed: {
    fontSize: 19,
    lineHeight: 24,
    color: '#233244',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  breedInsightMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6e7b89',
    fontWeight: '600',
  },
  breedInsightBody: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    color: '#4c5866',
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
