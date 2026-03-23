import React, { useMemo, useRef, useState, type ReactNode } from 'react';
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
import Svg, { Circle, Path } from 'react-native-svg';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';

// ─── Exported types ───────────────────────────────────────────────────────────

export type HealthRecordsSegmentContent = {
  activeTitle: string;
  activeDate: string;
  activeBody: string;
  activeBadge: string;
  activeSeverity: string;
  historyTitle: string;
  historyDate: string;
  historyBody: string;
  resolvedBadge: string;
  historySeverity: string;
};

export type HealthRecordsData = {
  recordsCountText?: string;
  activeCountText?: string;
  upToDateText?: string;
  bySegment?: Partial<Record<'allergies' | 'diagnoses' | 'labResults', HealthRecordsSegmentContent>>;
};

type HealthRecordsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  onAddRecord?: () => void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  recordsData?: HealthRecordsData;
};

// ─── Icon component ───────────────────────────────────────────────────────────

function Icon({ kind, size = 20, color = '#7a7a7a' }: { kind: 'back' | 'record' | 'pulse' | 'clock' | 'alert' | 'plus'; size?: number; color?: string }) {
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'record') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4.8H15.5L19 8.2V19.2H7V4.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M15.4 4.8V8.3H19" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M9.3 12H16M9.3 15.2H16" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'pulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3.5 12H8L10 8L13 16L15.2 11.5H20.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'clock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8V12L14.6 13.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'plus') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      </Svg>
    );
  }

  // alert
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
      <Path d="M12 8V12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="15.8" r="1" fill={color} />
    </Svg>
  );
}

// ─── Stat card (bento style) ──────────────────────────────────────────────────

function StatCard({ kind, text }: { kind: 'record' | 'pulse' | 'clock'; text: string }) {
  const iconColor = kind === 'pulse' ? '#c96a6a' : kind === 'clock' ? '#c48d42' : '#47664a';
  const bgColor = kind === 'pulse' ? '#fdf0f0' : kind === 'clock' ? '#fef6ea' : '#eef6ef';

  return (
    <View style={styles.statCard}>
      <View style={[styles.statCardIconBox, { backgroundColor: bgColor }]}>
        <Icon kind={kind} size={18} color={iconColor} />
      </View>
      <Text style={styles.statCardText}>{text}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HealthRecordsScreen({ onBack, backPreview, onAddRecord, status = 'ready', onRetry, recordsData }: HealthRecordsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).healthRecords;
  const isTr = locale === 'tr';
  const [activeSegment, setActiveSegment] = useState<'allergies' | 'diagnoses' | 'labResults'>('allergies');

  // ─── Fallback content with correct UTF-8 Turkish strings ─────────────────

  const fallbackSegmentContent = useMemo(() => {
    if (activeSegment === 'diagnoses') {
      return {
        activeTitle: isTr ? 'Hafif Artrit' : 'Mild Arthritis',
        activeDate: isTr ? '18 Oca 2026' : 'Jan 18, 2026',
        activeBody: isTr
          ? 'Soğuk havalarda eklem hassasiyeti\ngözlemleniyor.'
          : 'Joint sensitivity observed\nduring cold weather.',
        activeBadge: isTr ? 'Takipte' : 'Monitoring',
        activeSeverity: isTr ? 'Orta' : 'Medium',
        historyTitle: isTr ? 'Kulak Enfeksiyonu' : 'Ear Infection',
        historyDate: isTr ? '12 Eki 2025' : 'Oct 12, 2025',
        historyBody: isTr
          ? 'Tedavi tamamlandı ve tekrar etmedi.'
          : 'Treatment completed with no recurrence.',
        resolvedBadge: isTr ? 'Çözüldü' : 'Resolved',
        historySeverity: isTr ? 'Düşük' : 'Low',
      };
    }

    if (activeSegment === 'labResults') {
      return {
        activeTitle: isTr ? 'Karaciğer Paneli' : 'Liver Panel',
        activeDate: isTr ? '03 Şub 2026' : 'Feb 03, 2026',
        activeBody: isTr
          ? 'Değerler referans aralıkta,\n3 ay sonra tekrar önerilir.'
          : 'Values are within reference range,\nrepeat in 3 months is recommended.',
        activeBadge: isTr ? 'Normal' : 'Normal',
        activeSeverity: isTr ? 'Düşük' : 'Low',
        historyTitle: isTr ? 'Hemogram' : 'Complete Blood Count',
        historyDate: isTr ? '05 Haz 2024' : 'Jun 05, 2024',
        historyBody: isTr
          ? 'Önceki test değerleri stabil seyretmiş.'
          : 'Previous test values were stable.',
        resolvedBadge: isTr ? 'Arşiv' : 'Archived',
        historySeverity: isTr ? 'Düşük' : 'Low',
      };
    }

    // allergies (default)
    return {
      activeTitle: copy.activeTitle,
      activeDate: copy.activeDate,
      activeBody: copy.activeBody,
      activeBadge: copy.activeBadge,
      activeSeverity: copy.activeSeverity,
      historyTitle: copy.historyTitle,
      historyDate: copy.historyDate,
      historyBody: copy.historyBody,
      resolvedBadge: copy.resolvedBadge,
      historySeverity: copy.historySeverity,
    };
  }, [activeSegment, copy, isTr]);

  const segmentContent = recordsData?.bySegment?.[activeSegment] ?? fallbackSegmentContent;

  // ─── State machine ────────────────────────────────────────────────────────
  const screenState = status;
  const showMainContent = screenState === 'ready';
  const showAddButton = screenState !== 'loading' && screenState !== 'error';

  const stateTitle = screenState === 'loading'
    ? (isTr ? 'Sağlık kayıtları yükleniyor' : 'Loading health records')
    : screenState === 'empty'
      ? (isTr ? 'Henüz sağlık kaydı yok' : 'No health records yet')
      : (isTr ? 'Sağlık kayıtları alınamadı' : 'Could not load health records');

  const stateBody = screenState === 'loading'
    ? (isTr ? 'Kayıtlar hazırlanıyor, lütfen kısa bir süre bekleyin.' : 'Preparing records, please wait a moment.')
    : screenState === 'empty'
      ? (isTr ? 'İlk kayıt eklendiğinde bu alan otomatik olarak dolacaktır.' : 'This area will populate automatically once the first record is added.')
      : (isTr ? 'Bağlantıyı kontrol edip tekrar deneyin.' : 'Please check your connection and try again.');

  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });

  // ─── Render ───────────────────────────────────────────────────────────────
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
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Pressable style={styles.backCircle} onPress={onBack}>
              <Icon kind="back" size={22} color="#5d605a" />
            </Pressable>
            <Text style={styles.headerTitle}>{copy.title}</Text>
            <Pressable
              style={styles.addPill}
              onPress={() => {
                if (onAddRecord) {
                  onAddRecord();
                  return;
                }
                Alert.alert(
                  isTr ? 'Yakında' : 'Coming soon',
                  isTr
                    ? 'Kayıt ekleme akışı bir sonraki adımda aktif edilecek.'
                    : 'Add record flow will be enabled in the next step.',
                );
              }}
            >
              <Icon kind="plus" size={14} color="#fff" />
              <Text style={styles.addPillText}>{isTr ? 'Ekle' : 'Add'}</Text>
            </Pressable>
          </View>

          {showMainContent ? (
            <>
              {/* ── Page title ─────────────────────────────────────────────── */}
              <Text style={styles.pageTitle}>{copy.overview}</Text>

              {/* ── Stats bento row ────────────────────────────────────────── */}
              <View style={styles.statsRow}>
                <StatCard kind="record" text={recordsData?.recordsCountText ?? copy.recordsCount} />
                <StatCard kind="pulse" text={recordsData?.activeCountText ?? copy.activeCount} />
                <StatCard kind="clock" text={recordsData?.upToDateText ?? copy.upToDate} />
              </View>

              {/* ── Segment tabs ───────────────────────────────────────────── */}
              <View style={styles.segmentRow}>
                {(['allergies', 'diagnoses', 'labResults'] as const).map((seg) => {
                  const isActive = activeSegment === seg;
                  const label = seg === 'allergies' ? copy.allergies : seg === 'diagnoses' ? copy.diagnoses : copy.labResults;
                  return (
                    <Pressable
                      key={seg}
                      style={[styles.segmentChip, isActive && styles.segmentChipActive]}
                      onPress={() => setActiveSegment(seg)}
                    >
                      <Text style={[styles.segmentChipText, isActive && styles.segmentChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Active section ─────────────────────────────────────────── */}
              <View style={styles.sectionHead}>
                <Text style={styles.sectionHeadText}>{copy.activeSection}</Text>
                <View style={styles.sectionLine} />
              </View>

              <View style={styles.recordCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIconBoxDanger}>
                    <Icon kind="alert" size={22} color="#c96a6a" />
                  </View>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitle}>{segmentContent.activeTitle}</Text>
                    <Text style={styles.cardDate}>{segmentContent.activeDate}</Text>
                  </View>
                </View>

                <Text style={styles.cardBody}>{segmentContent.activeBody}</Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottomRow}>
                  <View style={styles.activeBadgePill}>
                    <Text style={styles.activeBadgePillText}>{segmentContent.activeBadge}</Text>
                  </View>
                  <View style={styles.severityWrap}>
                    <View style={styles.severityDots}>
                      <View style={styles.dotDanger} />
                      <View style={styles.dotDanger} />
                      <View style={styles.dotDanger} />
                    </View>
                    <Text style={styles.severityText}>{segmentContent.activeSeverity}</Text>
                  </View>
                </View>
              </View>

              {/* ── History section ────────────────────────────────────────── */}
              <View style={styles.sectionHead}>
                <Text style={styles.sectionHeadText}>{copy.historySection}</Text>
                <View style={styles.sectionLine} />
              </View>

              <View style={[styles.recordCard, styles.recordCardMuted]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardIconBoxNeutral}>
                    <Icon kind="alert" size={22} color="#9a9a9a" />
                  </View>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.cardTitleMuted}>{segmentContent.historyTitle}</Text>
                    <Text style={styles.cardDateMuted}>{segmentContent.historyDate}</Text>
                  </View>
                </View>

                <Text style={styles.cardBodyMuted}>{segmentContent.historyBody}</Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottomRow}>
                  <View style={styles.resolvedBadgePill}>
                    <Text style={styles.resolvedBadgePillText}>{segmentContent.resolvedBadge}</Text>
                  </View>
                  <View style={[styles.severityWrap, { opacity: 0.7 }]}>
                    <View style={styles.severityDots}>
                      <View style={styles.dotWarn} />
                      <View style={styles.dotWarn} />
                      <View style={styles.dotEmpty} />
                    </View>
                    <Text style={styles.severityText}>{segmentContent.historySeverity}</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <ScreenStateCard
              mode={screenState as ScreenStateMode}
              title={stateTitle}
              body={stateBody}
              actionLabel={screenState === 'error' ? (isTr ? 'Tekrar Dene' : 'Retry') : undefined}
              onAction={screenState === 'error'
                ? (onRetry ?? (() => Alert.alert(
                    isTr ? 'Tekrar Dene' : 'Retry',
                    isTr ? 'Lütfen kısa bir süre sonra tekrar deneyin.' : 'Please try again in a moment.',
                  )))
                : undefined}
            />
          )}
        </ScrollView>

        {/* ── Floating add button ──────────────────────────────────────────── */}
        {showAddButton ? (
          <Pressable
            style={styles.addBtn}
            onPress={() => {
              if (onAddRecord) {
                onAddRecord();
                return;
              }
              Alert.alert(
                isTr ? 'Yakında' : 'Coming soon',
                isTr
                  ? 'Kayıt ekleme akışı bir sonraki adımda aktif edilecek.'
                  : 'Add record flow will be enabled in the next step.',
              );
            }}
          >
            <Icon kind="plus" size={20} color="#fff" />
            <Text style={styles.addBtnText}>{copy.addRecord}</Text>
          </Pressable>
        ) : null}
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
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 16,
  },

  // Header
  headerRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 22,
    color: '#30332e',
    fontWeight: '700',
    letterSpacing: -0.2,
    marginHorizontal: 8,
  },
  addPill: {
    height: 34,
    borderRadius: 999,
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 4,
  },
  addPillText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '700',
  },

  // Page title
  pageTitle: {
    marginTop: 4,
    fontSize: 32,
    lineHeight: 38,
    color: '#30332e',
    fontWeight: '700',
    letterSpacing: -0.6,
  },

  // Stats bento
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#30332e',
    fontWeight: '700',
    flexShrink: 1,
  },

  // Segment chips
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentChip: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentChipActive: {
    backgroundColor: '#47664a',
  },
  segmentChipText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '700',
    textAlign: 'center',
  },
  segmentChipTextActive: {
    color: '#fff',
  },

  // Section head
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeadText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#5d605a',
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#b1b3ab',
    opacity: 0.35,
  },

  // Record cards
  recordCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  recordCardMuted: {
    opacity: 0.88,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBoxDanger: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fdf0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBoxNeutral: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#30332e',
    fontWeight: '700',
  },
  cardTitleMuted: {
    fontSize: 18,
    lineHeight: 24,
    color: '#5d605a',
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '500',
    marginTop: 1,
  },
  cardDateMuted: {
    fontSize: 13,
    lineHeight: 18,
    color: '#b1b3ab',
    fontWeight: '500',
    marginTop: 1,
  },
  cardBody: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#5d605a',
    fontWeight: '400',
  },
  cardBodyMuted: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#b1b3ab',
    fontWeight: '400',
  },
  cardDivider: {
    marginTop: 12,
    height: 1,
    backgroundColor: '#eeeee8',
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Badges
  activeBadgePill: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f5c9c9',
    backgroundColor: '#fdf0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgePillText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#c96a6a',
    fontWeight: '700',
  },
  resolvedBadgePill: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d5e8d6',
    backgroundColor: '#eef6ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedBadgePillText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#47664a',
    fontWeight: '600',
  },

  // Severity
  severityWrap: {
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#eeeee8',
    backgroundColor: '#f6f4f0',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityDots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dotDanger: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c96a6a',
  },
  dotWarn: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c48d42',
    opacity: 0.6,
  },
  dotEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b1b3ab',
  },
  severityText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5d605a',
    fontWeight: '600',
  },

  // Add button (bottom pill)
  addBtn: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    gap: 8,
    shadowColor: '#47664a',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  addBtnText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#fff',
    fontWeight: '700',
  },
});
