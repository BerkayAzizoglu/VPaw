import React, { type ReactNode } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import { localizeVaccine } from '../lib/vaccineI18n';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';
import StickyBlurTopBar, { getStickyHeaderContentTop } from '../components/StickyBlurTopBar';
import type { VaccinationsHistoryItem, VaccinationsAttentionCounts, VaccinationsNextUpData, VetVisit } from '../lib/healthMvpModel';
const vaccinesHeaderLogo = require('../assets/illustrations/vaccines-logo.png');

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
  vetVisits?: VetVisit[];
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

function FeaturedVaccineCard({ data, locale }: { data: VaccinationsNextUpData; locale: 'en' | 'tr' }) {
  const localized = localizeVaccine(data.name, data.subtitle, locale);
  const isTr = locale === 'tr';
  // Parse a simple "Apr 18" or "18.04.2025" display date for the date box
  const parts = data.date.split(/[.\-\/\s]/);
  const dayStr = parts[0] ?? '—';

  return (
    <View style={styles.featuredCard}>
      <View style={styles.featuredTop}>
        <View style={styles.featuredLeft}>
          <Text style={styles.featuredTag}>{isTr ? 'Sıradaki doz' : 'Next dose'}</Text>
          <Text style={styles.featuredTitle}>{localized.name}</Text>
          <Text style={styles.featuredSub}>{localized.subtitle}</Text>
        </View>
        <View style={styles.featuredDateBox}>
          <Text style={styles.featuredDateNum}>{dayStr}</Text>
          <Text style={styles.featuredDateSub}>{data.inWeeks}</Text>
        </View>
      </View>
      <View style={styles.featuredMeta}>
        <View style={styles.featuredMetaItem}>
          <Icon kind="syringe" size={13} color="#5d605a" />
          <Text style={styles.featuredMetaText}>{data.date}</Text>
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
  locale,
}: {
  item: VaccinationsHistoryItem;
  statusLabels: { overdue: string; dueSoon: string; upToDate: string };
  dueDateLabel: string;
  locale: 'en' | 'tr';
}) {
  const localized = localizeVaccine(item.name, item.subtitle, locale);
  const isOverdue = item.status === 'overdue';
  const isDueSoon = item.status === 'dueSoon';
  const isUpToDate = item.status === 'upToDate';

  const iconBg = isOverdue ? '#fdf0f0' : isDueSoon ? '#fef6ea' : '#eaf2f4';
  const iconColor = isOverdue ? '#c96a6a' : isDueSoon ? '#c48d42' : '#56757c';
  const iconKind: 'warning' | 'clock' | 'shieldFill' = isOverdue
    ? 'warning'
    : isDueSoon
    ? 'clock'
    : 'shieldFill';

  const pillBg = isOverdue ? '#fdf0f0' : isDueSoon ? '#fef6ea' : '#eaf2f4';
  const pillBorder = isOverdue ? '#f5dede' : isDueSoon ? '#f5e9d1' : '#c0d8de';
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
        <Text style={styles.vaccineName}>{localized.name}</Text>
        <View style={styles.vaccineMetaRow}>
          <Text style={styles.vaccineSub}>{localized.subtitle}</Text>
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
  vetVisits,
}: VaccinationsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).vaccinations;
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const topInset = Math.max(insets.top, 14);

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
  const spendVisits = vetVisits ?? [];
  const now = new Date();
  const nowMs = now.getTime();
  const currentYear = String(now.getFullYear());
  const currentYearStartMs = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
  const prevYearSamePointMs = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const prevYearStartMs = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0).getTime();
  const spendCurrency = spendVisits.find((visit) => typeof visit.currency === 'string' && visit.currency.trim().length > 0)?.currency ?? 'TL';

  const yearlySpend = spendVisits
    .filter((visit) => {
      if (visit.status === 'planned' || visit.status === 'canceled') return false;
      if (visit.amount == null || visit.amount <= 0) return false;
      const visitMs = new Date(visit.visitDate).getTime();
      if (!Number.isFinite(visitMs)) return false;
      return visitMs >= currentYearStartMs && visitMs <= nowMs;
    })
    .reduce((sum, visit) => sum + (visit.amount ?? 0), 0);

  const prevYearSpend = spendVisits
    .filter((visit) => {
      if (visit.status === 'planned' || visit.status === 'canceled') return false;
      if (visit.amount == null || visit.amount <= 0) return false;
      const visitMs = new Date(visit.visitDate).getTime();
      if (!Number.isFinite(visitMs)) return false;
      return visitMs >= prevYearStartMs && visitMs <= prevYearSamePointMs;
    })
    .reduce((sum, visit) => sum + (visit.amount ?? 0), 0);

  const annualSpendText = yearlySpend > 0
    ? `${yearlySpend.toLocaleString(isTr ? 'tr-TR' : 'en-US')} ${spendCurrency}`
    : copy.totalCost;
  const annualSpendDeltaText = (() => {
    if (prevYearSpend <= 0 && yearlySpend <= 0) return isTr ? 'BU YIL' : 'THIS YEAR';
    if (prevYearSpend <= 0) return isTr ? 'BU YIL' : 'THIS YEAR';
    const pct = Math.round(((yearlySpend - prevYearSpend) / prevYearSpend) * 100);
    const arrow = pct >= 0 ? '↑' : '↓';
    return isTr ? `${arrow} %${Math.abs(pct)} GECEN YILA GORE` : `${arrow} ${Math.abs(pct)}% VS LAST YEAR`;
  })();

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

  // ── swipe ──
  const swipePanResponder = useEdgeSwipeBack({ onBack, fullScreenGestureEnabled: false, enterVariant: 'drift' });

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePanResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.frontLayer, swipePanResponder.frontLayerStyle]} {...swipePanResponder.panHandlers}>
        <StatusBar style="dark" />
        <Animated.ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: getStickyHeaderContentTop(topInset),
            },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={24}
        directionalLockEnabled
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
            <View>

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
                    <Icon kind="arrow" size={14} color="#56757c" />
                  </View>
                </Pressable>
              )}

              {/* ── Next Up featured card ── */}
              <Text style={styles.sectionLabel}>{copy.nextUp}</Text>
              <FeaturedVaccineCard data={nextCard} locale={locale} />

              {/* ── Vaccine history ── */}
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{copy.vaccineHistory}</Text>
              <View style={styles.historyList}>
                {history.map((item) => (
                  <VaccineCard
                    key={`${item.name}-${item.dueDate}`}
                    item={item}
                    statusLabels={copy.statuses}
                    dueDateLabel={copy.dueDate}
                    locale={locale}
                  />
                ))}
              </View>

              {/* ── Stats bento grid ── */}
              <View style={styles.statsGrid}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>{isTr ? 'Güncel Aşılar' : 'Up to Date'}</Text>
                  <Text style={styles.statsValue}>{upToDateCount}</Text>
                  <View style={styles.statsSubRow}>
                    <View style={[styles.statsDot, { backgroundColor: '#56757c' }]} />
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

              <View style={styles.annualSpendCard}>
                <View style={styles.annualSpendHeader}>
                  <Text style={styles.annualSpendLabel}>{isTr ? 'YILLIK HARCAMA' : 'ANNUAL SPEND'}</Text>
                  <View style={styles.annualSpendYearPill}>
                    <Text style={styles.annualSpendYearText}>{currentYear}</Text>
                  </View>
                </View>
                <Text style={styles.annualSpendValue}>{annualSpendText}</Text>
                <Text style={[styles.annualSpendSub, prevYearSpend > 0 && yearlySpend !== prevYearSpend ? styles.annualSpendSubActive : null]}>
                  {annualSpendDeltaText}
                </Text>
              </View>

            </View>
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
        </Animated.ScrollView>

        <StickyBlurTopBar
          title={isTr ? 'ASILAR' : 'VACCINES'}
          topInset={topInset}
          scrollY={scrollY}
          titleVariant="hub"
          titleColor="#30332e"
          overlayColors={['rgba(86,117,124,0.56)', 'rgba(86,117,124,0.38)', 'rgba(86,117,124,0.18)', 'rgba(86,117,124,0)']}
          borderColor="rgba(39,67,75,0.20)"
          centerLogoSource={vaccinesHeaderLogo}
          centerLogoWidth={102}
          centerLogoHeight={102}
          centerLogoOffsetY={-8}
          leftSlot={(
            <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
              <Icon kind="back" size={20} color="#30332e" />
            </Pressable>
          )}
          rightSlot={showAddButton ? (
            <Pressable
              style={styles.backBtn}
              onPress={() => {
                if (onAddVaccination) { onAddVaccination(); return; }
                Alert.alert(
                  isTr ? 'Yakında' : 'Coming soon',
                  isTr ? 'Aşı ekleme akışı bir sonraki adımda aktif edilecek.' : 'Add vaccination flow will be enabled in the next step.',
                );
              }}
            >
              <Icon kind="add" size={16} color="#30332e" />
            </Pressable>
          ) : undefined}
        />
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
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // ── Header ──
  header: {
    display: 'none',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    shadowColor: '#7c877f',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
    borderRadius: 8,
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  attentionLeft: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  attentionPill: {
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 8,
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
    fontWeight: '600',
    color: '#47664a',
  },

  // ── Section label ──
  sectionLabel: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#26312f',
    letterSpacing: -0.5,
    marginBottom: 14,
    marginLeft: 1,
    marginTop: 4,
  },

  // ── Featured card ──
  featuredCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featuredLeft: {
    flex: 1,
    paddingRight: 14,
    gap: 5,
  },
  featuredTag: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#6c756f',
    marginBottom: 2,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#26312f',
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  featuredSub: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: '#66706b',
  },
  featuredDateBox: {
    backgroundColor: '#f3f5f0',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  featuredDateNum: {
    fontSize: 26,
    fontWeight: '800',
    color: '#26312f',
    lineHeight: 30,
  },
  featuredDateSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6a726d',
    marginTop: 2,
    textAlign: 'center',
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 2,
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredMetaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#66706b',
  },

  // ── Vaccine card ──
  historyList: {
    gap: 11,
  },
  vaccineCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  vaccineIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vaccineMain: {
    flex: 1,
    gap: 4,
    paddingTop: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#26312f',
    lineHeight: 22,
  },
  vaccineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  vaccineSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#66706b',
  },
  vaccineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#b1b3ab',
  },
  vaccineDueText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#66706b',
  },
  vaccinePill: {
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 4,
  },
  vaccinePillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Stats bento grid ──
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  statsLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#6a726d',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#26312f',
    letterSpacing: -1,
    lineHeight: 40,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#6a726d',
  },
  annualSpendCard: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  annualSpendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  annualSpendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a726d',
  },
  annualSpendYearPill: {
    minWidth: 40,
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.12)',
    backgroundColor: '#f3f5f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  annualSpendYearText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#596058',
  },
  annualSpendValue: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#26312f',
    letterSpacing: -0.7,
  },
  annualSpendSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: '#6f746e',
  },
  annualSpendSubActive: {
    color: '#4b6a54',
  },
});
