import React, { useEffect, useRef, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';

// ─── Types ───────────────────────────────────────────────────────────────────

type VaccinationsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  onResolve?: () => void;
  onAddVaccination?: () => void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  historyItems?: VaccinationsHistoryItem[];
  attentionCounts?: VaccinationsAttentionCounts;
  nextUpData?: VaccinationsNextUpData;
};

export type VaccinationsHistoryItem = {
  name: string;
  subtitle: string;
  status: 'overdue' | 'dueSoon' | 'upToDate';
  dueDate: string;
  tint?: 'danger' | 'neutral';
};

export type VaccinationsAttentionCounts = {
  overdueCount: number;
  dueSoonCount: number;
};

export type VaccinationsNextUpData = {
  name: string;
  subtitle: string;
  date: string;
  inWeeks: string;
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function Icon({
  kind,
  size = 22,
  color = '#7a7a7a',
}: {
  kind: 'back' | 'shield' | 'shieldFill' | 'warning' | 'clock' | 'check' | 'syringe' | 'arrow' | 'add';
  size?: number;
  color?: string;
}) {
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'shield') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3.8L18 6.1V11.3C18 15 15.5 18 12 20.2C8.5 18 6 15 6 11.3V6.1L12 3.8Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'shieldFill') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3.8L18 6.1V11.3C18 15 15.5 18 12 20.2C8.5 18 6 15 6 11.3V6.1L12 3.8Z" fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d="M9 12L11.2 14L15 10" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'warning') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8.2V12.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx="12" cy="15.8" r="1" fill={color} />
      </Svg>
    );
  }
  if (kind === 'clock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8V12L14.8 13.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 12.2L10.2 15.6L17.5 8.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'arrow') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6L15 12L9 18" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'add') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      </Svg>
    );
  }
  // syringe
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5L18.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M6 18L14.7 9.3L17.7 12.3L9 21H6V18Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Path d="M12 12L14 14M9.8 14.2L11.8 16.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Featured (Next Up) Card ─────────────────────────────────────────────────

function FeaturedVaccineCard({ data }: { data: VaccinationsNextUpData }) {
  // Parse a simple "Apr 18" or "18.04.2025" display date for the date box
  const parts = data.date.split(/[.\-\/\s]/);
  const dayStr = parts[0] ?? '—';

  return (
    <View style={styles.featuredCard}>
      {/* glass blob */}
      <View style={styles.featuredBlob} />

      <View style={styles.featuredTop}>
        <View style={styles.featuredLeft}>
          {/* glass tag */}
          <View style={styles.glassTag}>
            <Text style={styles.glassTagText}>UPCOMING</Text>
          </View>
          <Text style={styles.featuredTitle}>{data.name}</Text>
          <Text style={styles.featuredSub}>{data.subtitle}</Text>
        </View>
        {/* date box */}
        <View style={styles.featuredDateBox}>
          <Text style={styles.featuredDateNum}>{dayStr}</Text>
          <Text style={styles.featuredDateSub}>{data.inWeeks}</Text>
        </View>
      </View>

      <View style={styles.featuredMeta}>
        <View style={styles.featuredMetaItem}>
          <Icon kind="syringe" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.featuredMetaText}>{data.date}</Text>
        </View>
        <View style={styles.featuredMetaItem}>
          <Icon kind="shield" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.featuredMetaText}>{data.subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Vaccine History Card ─────────────────────────────────────────────────────

function VaccineCard({
  item,
  statusLabels,
  dueDateLabel,
}: {
  item: VaccinationsHistoryItem;
  statusLabels: { overdue: string; dueSoon: string; upToDate: string };
  dueDateLabel: string;
}) {
  const isOverdue = item.status === 'overdue';
  const isDueSoon = item.status === 'dueSoon';
  const isUpToDate = item.status === 'upToDate';

  const iconBg = isOverdue ? '#fdf0f0' : isDueSoon ? '#fef6ea' : '#eef4eb';
  const iconColor = isOverdue ? '#c96a6a' : isDueSoon ? '#c48d42' : '#718562';
  const iconKind: 'warning' | 'clock' | 'shieldFill' = isOverdue
    ? 'warning'
    : isDueSoon
    ? 'clock'
    : 'shieldFill';

  const pillBg = isOverdue ? '#fdf0f0' : isDueSoon ? '#fef6ea' : '#eef4eb';
  const pillBorder = isOverdue ? '#f5dede' : isDueSoon ? '#f5e9d1' : '#d8ebcf';
  const pillColor = iconColor;
  const pillLabel = isOverdue
    ? statusLabels.overdue
    : isDueSoon
    ? statusLabels.dueSoon
    : statusLabels.upToDate;

  return (
    <View style={styles.vaccineCard}>
      {/* icon box */}
      <View style={[styles.vaccineIconBox, { backgroundColor: iconBg }]}>
        <Icon kind={iconKind} size={22} color={iconColor} />
      </View>

      {/* main text */}
      <View style={styles.vaccineMain}>
        <Text style={styles.vaccineName}>{item.name}</Text>
        <View style={styles.vaccineMetaRow}>
          <Text style={styles.vaccineSub}>{item.subtitle}</Text>
          <View style={styles.vaccineDot} />
          <Text style={styles.vaccineDueText}>{item.dueDate}</Text>
        </View>
      </View>

      {/* status pill */}
      <View style={[styles.vaccinePill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
        <Text style={[styles.vaccinePillText, { color: pillColor }]}>{pillLabel}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VaccinationsScreen({
  onBack,
  backPreview,
  onResolve,
  onAddVaccination,
  status = 'ready',
  onRetry,
  historyItems,
  attentionCounts,
  nextUpData,
}: VaccinationsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).vaccinations;
  const isTr = locale === 'tr';

  // ── data ──
  const fallbackHistory: VaccinationsHistoryItem[] = [
    { name: 'Bordetella', subtitle: copy.history.bordetellaSub, status: 'overdue', dueDate: copy.history.bordetellaDate, tint: 'danger' },
    { name: copy.nextCard.name, subtitle: copy.history.rabiesSub, status: 'dueSoon', dueDate: copy.history.rabiesDate, tint: 'neutral' },
    { name: 'DHPP', subtitle: copy.history.dhppSub, status: 'upToDate', dueDate: copy.history.dhppDate, tint: 'neutral' },
    { name: 'Leptospirosis', subtitle: copy.history.leptoSub, status: 'upToDate', dueDate: copy.history.leptoDate, tint: 'neutral' },
  ];
  const history = historyItems && historyItems.length > 0 ? historyItems : fallbackHistory;
  const nextCard = nextUpData ?? copy.nextCard;

  const overdueCount = attentionCounts?.overdueCount ?? history.filter((h) => h.status === 'overdue').length;
  const dueSoonCount = attentionCounts?.dueSoonCount ?? history.filter((h) => h.status === 'dueSoon').length;
  const upToDateCount = history.filter((h) => h.status === 'upToDate').length;
  const hasAttention = overdueCount > 0 || dueSoonCount > 0;

  // ── screen state ──
  const screenState = status;
  const showMainContent = screenState === 'ready';
  const showAddButton = screenState !== 'loading' && screenState !== 'error';
  const stateTitle =
    screenState === 'loading'
      ? isTr ? 'Aşılar yükleniyor' : 'Loading vaccinations'
      : screenState === 'empty'
      ? isTr ? 'Henüz aşı kaydı yok' : 'No vaccination records yet'
      : isTr ? 'Aşı kayıtları alınamadı' : 'Could not load vaccinations';
  const stateBody =
    screenState === 'loading'
      ? isTr ? 'Kayıtlar hazırlanıyor, lütfen kısa bir süre bekleyin.' : 'Preparing records, please wait a moment.'
      : screenState === 'empty'
      ? isTr ? 'İlk aşı kaydını eklediğinizde bu alan otomatik olarak dolacaktır.' : 'This area will populate automatically once you add the first vaccination.'
      : isTr ? 'Bağlantıyı kontrol edip tekrar deneyin.' : 'Please check your connection and try again.';

  // ── entrance animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── swipe ──
  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePanResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.frontLayer, swipePanResponder.frontLayerStyle]} {...swipePanResponder.panHandlers}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!swipePanResponder.isSwiping}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
              <Icon kind="back" size={20} color="#30332e" />
            </Pressable>
            <Text style={styles.headerTitle}>{copy.title}</Text>
            {showAddButton ? (
              <Pressable
                style={styles.addPill}
                onPress={() => {
                  if (onAddVaccination) { onAddVaccination(); return; }
                  Alert.alert(
                    isTr ? 'Yakında' : 'Coming soon',
                    isTr ? 'Aşı ekleme akışı bir sonraki adımda aktif edilecek.' : 'Add vaccination flow will be enabled in the next step.',
                  );
                }}
              >
                <Icon kind="add" size={16} color="#fff" />
                <Text style={styles.addPillText}>{isTr ? 'Ekle' : 'Add'}</Text>
              </Pressable>
            ) : (
              <View style={styles.headerPlaceholder} />
            )}
          </View>

          {showMainContent ? (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* ── Attention banner ── */}
              {hasAttention && (
                <Pressable
                  style={styles.attentionBanner}
                  onPress={() => {
                    if (onResolve) { onResolve(); return; }
                    Alert.alert(
                      isTr ? 'Yakında' : 'Coming soon',
                      isTr ? 'Bu işlem bir sonraki adımda aktif edilecek.' : 'This action will be enabled in the next step.',
                    );
                  }}
                >
                  <View style={styles.attentionLeft}>
                    {overdueCount > 0 && (
                      <View style={[styles.attentionPill, styles.attentionPillDanger]}>
                        <Icon kind="warning" size={13} color="#c96a6a" />
                        <Text style={[styles.attentionPillText, { color: '#c96a6a' }]}>
                          {overdueCount} {copy.statuses.overdue}
                        </Text>
                      </View>
                    )}
                    {dueSoonCount > 0 && (
                      <View style={[styles.attentionPill, styles.attentionPillWarn]}>
                        <Icon kind="clock" size={13} color="#c48d42" />
                        <Text style={[styles.attentionPillText, { color: '#c48d42' }]}>
                          {dueSoonCount} {copy.statuses.dueSoon}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.attentionRight}>
                    <Text style={styles.attentionCta}>{copy.resolve}</Text>
                    <Icon kind="arrow" size={14} color="#47664a" />
                  </View>
                </Pressable>
              )}

              {/* ── Next Up featured card ── */}
              <Text style={styles.sectionLabel}>{copy.nextUp}</Text>
              <FeaturedVaccineCard data={nextCard} />

              {/* ── Vaccine history ── */}
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{copy.vaccineHistory}</Text>
              <View style={styles.historyList}>
                {history.map((item) => (
                  <VaccineCard
                    key={`${item.name}-${item.dueDate}`}
                    item={item}
                    statusLabels={copy.statuses}
                    dueDateLabel={copy.dueDate}
                  />
                ))}
              </View>

              {/* ── Stats bento grid ── */}
              <View style={styles.statsGrid}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>{isTr ? 'Güncel Aşılar' : 'Up to Date'}</Text>
                  <Text style={styles.statsValue}>{upToDateCount}</Text>
                  <View style={styles.statsSubRow}>
                    <View style={[styles.statsDot, { backgroundColor: '#718562' }]} />
                    <Text style={styles.statsSub}>{isTr ? 'KORUMA TAMAM' : 'PROTECTED'}</Text>
                  </View>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>{isTr ? 'Dikkat Gereken' : 'Need Attention'}</Text>
                  <Text style={[styles.statsValue, hasAttention && { color: '#c96a6a' }]}>
                    {overdueCount + dueSoonCount}
                  </Text>
                  <View style={styles.statsSubRow}>
                    <View style={[styles.statsDot, { backgroundColor: hasAttention ? '#c96a6a' : '#b1b3ab' }]} />
                    <Text style={styles.statsSub}>
                      {hasAttention
                        ? isTr ? 'İŞLEM GEREKLİ' : 'ACTION NEEDED'
                        : isTr ? 'TEMİZ' : 'ALL CLEAR'}
                    </Text>
                  </View>
                </View>
              </View>

            </Animated.View>
          ) : (
            <ScreenStateCard
              mode={screenState as ScreenStateMode}
              title={stateTitle}
              body={stateBody}
              actionLabel={screenState === 'error' ? (isTr ? 'Tekrar Dene' : 'Retry') : undefined}
              onAction={
                screenState === 'error'
                  ? (onRetry ??
                    (() =>
                      Alert.alert(
                        isTr ? 'Tekrar Dene' : 'Retry',
                        isTr ? 'Lütfen kısa bir süre sonra tekrar deneyin.' : 'Please try again in a moment.',
                      )))
                  : undefined
              }
            />
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f4f0',
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frontLayer: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // ── Header ──
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.2,
  },
  headerPlaceholder: {
    width: 76,
  },
  addPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#47664a',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Attention banner ──
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  attentionLeft: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  attentionPill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
  },
  attentionPillDanger: {
    backgroundColor: '#fdf0f0',
    borderColor: '#f5dede',
  },
  attentionPillWarn: {
    backgroundColor: '#fef6ea',
    borderColor: '#f5e9d1',
  },
  attentionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  attentionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
  },
  attentionCta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#47664a',
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5d605a',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 2,
  },

  // ── Featured card ──
  featuredCard: {
    borderRadius: 28,
    backgroundColor: '#2e4230',
    padding: 24,
    overflow: 'hidden',
  },
  featuredBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featuredLeft: {
    flex: 1,
    paddingRight: 12,
    gap: 8,
  },
  glassTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  glassTagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.85)',
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  featuredSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
  },
  featuredDateBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featuredDateNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 32,
  },
  featuredDateSub: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredMetaText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Vaccine card ──
  historyList: {
    gap: 10,
  },
  vaccineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  vaccineIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vaccineMain: {
    flex: 1,
    gap: 3,
  },
  vaccineName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#30332e',
    lineHeight: 21,
  },
  vaccineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaccineSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5d605a',
  },
  vaccineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#b1b3ab',
  },
  vaccineDueText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5d605a',
  },
  vaccinePill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vaccinePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Stats bento grid ──
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#eeeee8',
    borderRadius: 24,
    padding: 20,
    gap: 2,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5d605a',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -1,
    lineHeight: 42,
  },
  statsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5d605a',
    letterSpacing: 0.8,
  },
});
