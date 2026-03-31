import React, { useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Alert,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import type { HealthRecordsData, HealthRecordsSegmentContent } from '../lib/healthMvpModel';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';
import StickyBlurTopBar, { getStickyHeaderContentTop } from '../components/StickyBlurTopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthRecordsSegment = 'allergies' | 'diagnoses' | 'labResults';

// Per-segment accent — clinical but distinct
const SEGMENT_ACCENTS: Record<HealthRecordsSegment, { accent: string; accentBg: string; accentMuted: string; label: string; labelTr: string }> = {
  allergies:  { accent: '#a63050', accentBg: '#fdf0f3', accentMuted: '#c27080', label: 'Allergy', labelTr: 'Alerji' },
  diagnoses:  { accent: '#1e6b85', accentBg: '#edf6fa', accentMuted: '#4d97b0', label: 'Diagnosis', labelTr: 'Tanı' },
  labResults: { accent: '#5242a0', accentBg: '#f0eef8', accentMuted: '#8070c4', label: 'Lab', labelTr: 'Lab' },
};

type HealthRecordsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  onAddRecord?: () => void;
  onOpenVetVisitSource?: () => void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  recordsData?: HealthRecordsData;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ kind, size = 20, color = '#7a7a7a' }: {
  kind: 'back' | 'plus' | 'alert' | 'close' | 'edit' | 'calendar' | 'tag';
  size?: number;
  color?: string;
}) {
  if (kind === 'back') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  if (kind === 'plus') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
  if (kind === 'close') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 7L17 17M17 7L7 17" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
  if (kind === 'edit') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.4 18.5 6.6L17.4 5.5C16.6 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M13.5 7L17 10.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
  if (kind === 'calendar') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 4H5C4.4 4 4 4.4 4 5V19C4 19.6 4.4 20 5 20H19C19.6 20 20 19.6 20 19V5C20 4.4 19.6 4 19 4Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="M16 2V6M8 2V6M4 9H20" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
  if (kind === 'tag') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4H11L20 13L13 20L4 11V4Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx="8" cy="8" r="1.2" fill={color} />
    </Svg>
  );
  // alert
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
      <Path d="M12 8V12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="15.8" r="1" fill={color} />
    </Svg>
  );
}

// ─── Severity dots ────────────────────────────────────────────────────────────

function SeverityDots({ level, color }: { level: number; color: string }) {
  return (
    <View style={styles.severityDots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.severityDot, { backgroundColor: i < level ? color : '#d8d8d4' }]} />
      ))}
    </View>
  );
}

// ─── Detail bottom sheet ──────────────────────────────────────────────────────

type SheetCard = 'active' | 'history';

function RecordDetailSheet({
  open,
  card,
  segmentContent,
  accent,
  isTr,
  onClose,
  onEdit,
}: {
  open: boolean;
  card: SheetCard | null;
  segmentContent: HealthRecordsSegmentContent | null;
  accent: typeof SEGMENT_ACCENTS[HealthRecordsSegment];
  isTr: boolean;
  onClose: () => void;
  onEdit: (sourceType: 'manual' | 'vet_visit') => void;
}) {
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const heightRef = useRef(600);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          translateY.setValue(g.dy);
          backdropOpacity.setValue(Math.max(0, 1 - g.dy / Math.max(heightRef.current, 1)));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.7) {
          Animated.parallel([
            Animated.spring(translateY, { toValue: heightRef.current, damping: 28, stiffness: 400, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(onClose);
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, damping: 26, stiffness: 380, mass: 0.85, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  React.useEffect(() => {
    if (open) {
      translateY.setValue(heightRef.current);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 26, stiffness: 380, mass: 0.85, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  if (!open || !segmentContent || !card) return null;

  const isActive = card === 'active';
  const title = isActive ? segmentContent.activeTitle : segmentContent.historyTitle;
  const date = isActive ? segmentContent.activeDate : segmentContent.historyDate;
  const body = isActive ? segmentContent.activeBody : segmentContent.historyBody;
  const badge = isActive ? segmentContent.activeBadge : segmentContent.resolvedBadge;
  const severity = isActive ? segmentContent.activeSeverity : segmentContent.historySeverity;
  const sourceType = isActive ? (segmentContent.activeSourceType ?? 'manual') : (segmentContent.historySourceType ?? 'manual');

  const severityLevel = (s: string) => {
    if (['low', 'düşük', 'normal'].some((l) => s.toLowerCase().includes(l))) return 1;
    if (['medium', 'orta'].some((m) => s.toLowerCase().includes(m))) return 2;
    return 3;
  };

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <View style={ss.root}>
        <Animated.View style={[ss.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[ss.sheet, { transform: [{ translateY }] }]}
          onLayout={(e) => { heightRef.current = e.nativeEvent.layout.height; }}
        >
          {/* Drag handle */}
          <View {...pan.panHandlers} style={ss.handleArea}>
            <View style={ss.handle} />
          </View>

          {/* Header row */}
          <View style={ss.sheetHeader}>
            <View style={[ss.sheetIconBox, { backgroundColor: isActive ? accent.accentBg : '#f0f0ec' }]}>
              <Icon kind="alert" size={22} color={isActive ? accent.accent : '#9a9d96'} />
            </View>
            <View style={ss.sheetTitleBlock}>
              <Text style={ss.sheetTitle}>{title}</Text>
              <View style={[ss.typeBadge, { backgroundColor: isActive ? accent.accentBg : '#f0f0ec', borderColor: isActive ? accent.accentMuted + '40' : '#d8d8d4' }]}>
                <Text style={[ss.typeBadgeText, { color: isActive ? accent.accent : '#6b6e67' }]}>{badge}</Text>
              </View>
            </View>
            <Pressable style={ss.closeBtn} onPress={onClose}>
              <Icon kind="close" size={18} color="#8a8d86" />
            </Pressable>
          </View>

          <ScrollView style={ss.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Date row */}
            <View style={ss.metaRow}>
              <Icon kind="calendar" size={15} color="#9a9d96" />
              <Text style={ss.metaText}>{date}</Text>
            </View>

            {/* Severity row */}
            <View style={ss.metaRow}>
              <Icon kind="tag" size={15} color="#9a9d96" />
              <SeverityDots level={severityLevel(severity)} color={isActive ? accent.accentMuted : '#c8c8c2'} />
              <Text style={ss.metaText}>{severity}</Text>
            </View>

            {/* Divider */}
            <View style={ss.sheetDivider} />

            {/* Description */}
            <Text style={ss.sheetBodyLabel}>{isTr ? 'Notlar' : 'Notes'}</Text>
            <Text style={ss.sheetBodyText}>{body}</Text>

            {/* Source info */}
            <View style={ss.sheetDivider} />
            <View style={ss.sourceRow}>
              <View style={ss.sourceIcon}>
                <Text style={ss.sourceIconText}>i</Text>
              </View>
              <Text style={ss.sourceText}>
                {sourceType === 'vet_visit'
                  ? (isTr
                      ? 'Bu kayıt bir veteriner ziyareti kaynağına bağlı. Düzenleme için ilgili ziyarete yönlendirilir.'
                      : 'This record is linked to a vet visit source. Editing should happen in the original visit.')
                  : (isTr
                      ? 'Bu kayıt Health Records içinde düzenlenebilir.'
                      : 'This record can be edited directly in Health Records.')}
              </Text>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Edit action */}
          <View style={ss.sheetActions}>
            <Pressable style={ss.editBtn} onPress={() => onEdit(sourceType)}>
              <Icon kind="edit" size={16} color="#fff" />
              <Text style={ss.editBtnText}>
                {sourceType === 'vet_visit'
                  ? (isTr ? 'Veteriner Ziyaretine Git' : 'Open Vet Visit')
                  : (isTr ? 'Kaydı Düzenle' : 'Edit Record')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HealthRecordsScreen({
  onBack,
  backPreview,
  onAddRecord,
  onOpenVetVisitSource,
  status = 'ready',
  onRetry,
  recordsData,
}: HealthRecordsScreenProps) {
  const { locale } = useLocale();
  const baseCopy = getWording(locale).healthRecords;
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const topInset = Math.max(insets.top, 14);

  const copy = isTr ? {
    ...baseCopy,
    title: 'Sağlık Kayıtları',
    overview: 'Sağlık Özeti',
    recordsCount: '6 Kayıt',
    activeCount: '2 Aktif',
    upToDate: 'Güncel',
    allergies: 'Alerjiler',
    diagnoses: 'Tanılar',
    labResults: 'Lab Sonuçları',
    activeSection: 'AKTİF',
    historySection: 'GEÇMİŞ',
    activeTitle: 'Tavuk Proteini',
    activeDate: '12 Eki 2025',
    activeBody: 'Tüketildiğinde şiddetli kaşıntı ve pati ısırma görülür.',
    activeBadge: 'Aktif',
    activeSeverity: 'Yüksek',
    historyTitle: 'Pire Isırıkları',
    historyDate: '05 Haz 2024',
    historyBody: 'Mevsimsel koruyucu ile tedavi edildi.',
    resolvedBadge: 'Çözüldü',
    historySeverity: 'Orta',
    addRecord: 'Kayıt Ekle',
  } : baseCopy;

  const [activeSegment, setActiveSegment] = useState<HealthRecordsSegment>('allergies');
  const accent = SEGMENT_ACCENTS[activeSegment];

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCard, setSheetCard] = useState<SheetCard | null>(null);

  const fallbackSegmentContent = useMemo(() => {
    if (activeSegment === 'diagnoses') {
      return {
        activeTitle: isTr ? 'Hafif Artrit' : 'Mild Arthritis',
        activeDate: isTr ? '18 Oca 2026' : 'Jan 18, 2026',
        activeBody: isTr
          ? 'Soğuk havalarda eklem hassasiyeti gözlemleniyor.'
          : 'Joint sensitivity observed during cold weather.',
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
          ? 'Değerler referans aralıkta, 3 ay sonra tekrar önerilir.'
          : 'Values are within reference range, repeat in 3 months recommended.',
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

  const screenState = status;
  const showMainContent = screenState === 'ready';

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

  const swipePanResponder = useEdgeSwipeBack({ onBack, enterVariant: 'snappy' });

  const severityLevel = (s: string) => {
    if (['low', 'düşük', 'normal'].some((l) => s.toLowerCase().includes(l))) return 1;
    if (['medium', 'orta'].some((m) => s.toLowerCase().includes(m))) return 2;
    return 3;
  };

  const handleAdd = () => {
    if (onAddRecord) { onAddRecord(); return; }
    Alert.alert(
      isTr ? 'Yakında' : 'Coming soon',
      isTr
        ? 'Kayıt ekleme akışı bir sonraki adımda aktif edilecek.'
        : 'Add record flow will be enabled in the next step.',
    );
  };

  const handleEditRecord = (sourceType: 'manual' | 'vet_visit') => {
    if (sourceType === 'vet_visit') {
      if (onOpenVetVisitSource) {
        onOpenVetVisitSource();
        return;
      }
      Alert.alert(
        isTr ? 'Veteriner ziyareti kaynağı' : 'Vet visit source',
        isTr ? 'Bu kayıt ilgili veteriner ziyareti üzerinden düzenlenir.' : 'This record should be edited from its original vet visit.',
      );
      return;
    }
    handleAdd();
  };

  const openSheet = (card: SheetCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetCard(card);
    setSheetOpen(true);
  };

  const closeSheet = () => setSheetOpen(false);

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
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Pressable style={styles.navCircle} onPress={onBack}>
              <Icon kind="back" size={22} color="#5d605a" />
            </Pressable>
            <Text style={styles.headerTitle}>{copy.title}</Text>
            <Pressable style={[styles.navCircle, styles.navCircleLight]} onPress={handleAdd}>
              <Icon kind="plus" size={18} color="#305855" />
            </Pressable>
          </View>

          {showMainContent ? (
            <>
              {/* ── Summary ──────────────────────────────────────────────── */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryChunk}>
                  <Text style={styles.summaryNum}>{recordsData?.recordsCountText ?? copy.recordsCount}</Text>
                </Text>
                <Text style={styles.summarySep}>·</Text>
                <Text style={styles.summaryChunk}>
                  <Text style={[styles.summaryNum, { color: '#a63050' }]}>{recordsData?.activeCountText ?? copy.activeCount}</Text>
                </Text>
                <Text style={styles.summarySep}>·</Text>
                <Text style={[styles.summaryChunk, { color: '#1e6b85' }]}>{recordsData?.upToDateText ?? copy.upToDate}</Text>
              </View>

              {/* ── Segment tabs ─────────────────────────────────────────── */}
              <View style={styles.segmentRow}>
                {(['allergies', 'diagnoses', 'labResults'] as const).map((seg) => {
                  const isActive = activeSegment === seg;
                  const label = seg === 'allergies' ? copy.allergies
                    : seg === 'diagnoses' ? copy.diagnoses
                    : copy.labResults;
                  return (
                    <Pressable
                      key={seg}
                      style={[styles.segmentChip, isActive && { backgroundColor: '#2d2f2c', borderColor: '#2d2f2c' }]}
                      onPress={() => setActiveSegment(seg)}
                    >
                      <Text style={[styles.segmentChipText, isActive && styles.segmentChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Active ───────────────────────────────────────────────── */}
              <Text style={styles.sectionLabel}>{copy.activeSection}</Text>

              <Pressable style={styles.recordCard} onPress={() => openSheet('active')}>
                <View style={[styles.accentStripe, { backgroundColor: accent.accent }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.cardIconBox, { backgroundColor: accent.accentBg }]}>
                      <Icon kind="alert" size={20} color={accent.accent} />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardTitle}>{segmentContent.activeTitle}</Text>
                      <Text style={styles.cardDate}>{segmentContent.activeDate}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: accent.accentBg, borderColor: accent.accentMuted + '50' }]}>
                      <Text style={[styles.badgeText, { color: accent.accent }]}>{segmentContent.activeBadge}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardBody} numberOfLines={2}>{segmentContent.activeBody}</Text>
                  <View style={styles.cardFooter}>
                    <SeverityDots level={severityLevel(segmentContent.activeSeverity)} color={accent.accentMuted} />
                    <Text style={styles.severityLabel}>{segmentContent.activeSeverity}</Text>
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>{isTr ? 'Detay' : 'Details'} ›</Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* ── History ──────────────────────────────────────────────── */}
              <Text style={styles.sectionLabel}>{copy.historySection}</Text>

              <Pressable style={[styles.recordCard, styles.recordCardMuted]} onPress={() => openSheet('history')}>
                <View style={[styles.accentStripe, { backgroundColor: '#c8c8c2' }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.cardIconBox, { backgroundColor: '#f0f0ec' }]}>
                      <Icon kind="alert" size={20} color="#9a9d96" />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardTitleMuted}>{segmentContent.historyTitle}</Text>
                      <Text style={styles.cardDateMuted}>{segmentContent.historyDate}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#f0f0ec', borderColor: '#d8d8d4' }]}>
                      <Text style={[styles.badgeText, { color: '#6b6e67' }]}>{segmentContent.resolvedBadge}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardBodyMuted} numberOfLines={2}>{segmentContent.historyBody}</Text>
                  <View style={styles.cardFooter}>
                    <SeverityDots level={severityLevel(segmentContent.historySeverity)} color="#c8c8c2" />
                    <Text style={[styles.severityLabel, { color: '#a8aba4' }]}>{segmentContent.historySeverity}</Text>
                    <View style={styles.tapHint}>
                      <Text style={styles.tapHintText}>{isTr ? 'Detay' : 'Details'} ›</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
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
        </Animated.ScrollView>

        <StickyBlurTopBar
          title={isTr ? 'SAGLIK KAYITLARI' : 'HEALTH RECORDS'}
          topInset={topInset}
          scrollY={scrollY}
          titleColor="#2f3634"
          overlayColors={['rgba(227,209,167,0.56)', 'rgba(227,209,167,0.38)', 'rgba(227,209,167,0.18)', 'rgba(227,209,167,0)']}
          borderColor="rgba(171,150,107,0.24)"
          leftSlot={(
            <Pressable style={styles.navCircle} onPress={onBack}>
              <Icon kind="back" size={22} color="#5d605a" />
            </Pressable>
          )}
          rightSlot={(
            <Pressable style={[styles.navCircle, styles.navCircleLight]} onPress={handleAdd}>
              <Icon kind="plus" size={18} color="#305855" />
            </Pressable>
          )}
        />
      </Animated.View>

      {/* ── Detail sheet ─────────────────────────────────────────────────── */}
      <RecordDetailSheet
        open={sheetOpen}
        card={sheetCard}
        segmentContent={segmentContent}
        accent={accent}
        isTr={isTr}
        onClose={closeSheet}
        onEdit={(sourceType) => { closeSheet(); handleEditRecord(sourceType); }}
      />
    </View>
  );
}

// ─── Screen styles ────────────────────────────────────────────────────────────

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
    paddingBottom: 48,
    gap: 14,
  },

  // Header — inside ScrollView, consistent with VetVisits/Vaccinations
  headerRow: {
    display: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  navCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navCircleLight: {
    backgroundColor: '#f3f6f5',
    borderWidth: 1,
    borderColor: 'rgba(74,108,103,0.14)',
    shadowColor: '#6f8f89',
    shadowOpacity: 0.05,
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

  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  summaryChunk: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '500',
  },
  summaryNum: {
    fontSize: 13,
    lineHeight: 18,
    color: '#30332e',
    fontWeight: '700',
  },
  summarySep: {
    fontSize: 13,
    color: '#b1b3ab',
  },

  // Segment tabs
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentChip: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e6e2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentChipText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: '#9a9d96',
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Record cards
  recordCard: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eeede9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recordCardMuted: {
    opacity: 0.78,
  },
  accentStripe: {
    width: 3,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#30332e',
    fontWeight: '700',
  },
  cardTitleMuted: {
    fontSize: 15,
    lineHeight: 20,
    color: '#6b6e67',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8a8d86',
  },
  cardDateMuted: {
    fontSize: 12,
    lineHeight: 16,
    color: '#a8aba4',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5d605a',
  },
  cardBodyMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: '#9a9d96',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  severityDots: {
    flexDirection: 'row',
    gap: 3,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8a8d86',
    fontWeight: '600',
    flex: 1,
  },
  tapHint: {
    alignSelf: 'flex-end',
  },
  tapHintText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#b1b3ab',
    fontWeight: '500',
  },
});

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d8d8d4',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0eeea',
  },
  sheetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleBlock: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: '#30332e',
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f4f3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d605a',
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#f0eeea',
    marginVertical: 12,
  },
  sheetBodyLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: '#9a9d96',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sheetBodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#30332e',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  sourceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f0eeea',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sourceIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8a8d86',
  },
  sourceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#8a8d86',
  },
  sheetActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0eeea',
  },
  editBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#2d2f2c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtnText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#fff',
    fontWeight: '700',
  },
});
