import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Scale,
  Stethoscope,
  Syringe,
  TrendingUp,
} from 'lucide-react-native';

// ─── Colour palette (matches reference design system) ────────────────────────
const C = {
  bg: '#f6f4f0',
  surface: '#ffffff',
  surfaceLow: '#f4f4ee',
  surfaceContainer: '#eeeee8',
  primary: '#47664a',
  primaryDim: '#3b5a3f',
  onPrimary: '#e9ffe6',
  onSurface: '#30332e',
  onSurfaceVariant: '#5d605a',
  outlineVariant: '#b1b3ab',
  outline: '#797c75',
  // category icon backgrounds
  iconVet: '#edffe3',
  iconRecords: '#ede8f5',
  iconVaccines: '#cbebc8',
  iconWeight: '#e3eef8',
  iconDocuments: '#f5ede3',
  // category icon foregrounds
  fgVet: '#3a6e45',
  fgRecords: '#5a4a7a',
  fgVaccines: '#3a6a3a',
  fgWeight: '#3a4e7a',
  fgDocuments: '#7a5a3a',
  // timeline type accents
  accentVaccine: '#3d6fa8',
  accentVet: '#7a5a28',
  accentRecord: '#4f6b43',
  accentWeight: '#3a4e7a',
  // status
  urgent: '#a73b21',
  urgentBg: '#fde8e3',
};

// ─── Exported types ────────────────────────────────────────────────────────────
export type HealthHubCategory = 'all' | 'vaccine' | 'vet' | 'record' | 'weight';
export type AddHealthRecordType = 'vaccine' | 'diagnosis' | 'procedure' | 'prescription' | 'test';
export type AddHealthRecordPayload = {
  type: AddHealthRecordType;
  title: string;
  date: string;
  note?: string;
};
export type HealthHubExpenses = {
  total: number;
  currency: string;
  breakdown: { label: string; amount: number; color: string }[];
};

export type HealthHubSummary = {
  latestWeight: string;
  vaccineStatus: string;
  lastVetVisit: string;
  totalExpenses?: HealthHubExpenses;
};
export type HealthHubTimelineItem = {
  id: string;
  type: Exclude<HealthHubCategory, 'all'>;
  date: string;
  title: string;
  notes?: string;
};
type HealthHubDomainKey = 'vet' | 'records' | 'vaccines' | 'reminders' | 'weight' | 'documents';
export type HealthHubDomainOverview = Partial<
  Record<HealthHubDomainKey, { countText: string; statusText: string; infoText: string }>
>;
type HealthHubScreenProps = {
  summary: HealthHubSummary;
  timeline: HealthHubTimelineItem[];
  initialCategory?: HealthHubCategory;
  categoryResetKey?: string | number;
  createPreset?: {
    type?: AddHealthRecordType;
    title?: string;
    note?: string;
    openCreate?: boolean;
    nonce?: number;
  } | null;
  onPrimaryCta?: () => void;
  onAddRecord?: (payload: AddHealthRecordPayload) => void;
  onDeleteRecord?: (timelineItemId: string) => void;
  onOpenVetVisits?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVaccines?: () => void;
  onOpenWeightTracking?: () => void;
  onOpenDocuments?: () => void;
  domainOverview?: HealthHubDomainOverview;
  locale?: 'en' | 'tr';
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function categoryLabel(c: HealthHubCategory, isTr: boolean) {
  if (c === 'all') return isTr ? 'Tümü' : 'All';
  if (c === 'vaccine') return isTr ? 'Aşılar' : 'Vaccines';
  if (c === 'vet') return isTr ? 'Veteriner' : 'Vet Visits';
  if (c === 'record') return isTr ? 'Kayıtlar' : 'Records';
  return isTr ? 'Kilo' : 'Weight';
}
function typeTag(type: Exclude<HealthHubCategory, 'all'>, isTr: boolean) {
  if (type === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (type === 'vet') return isTr ? 'Veteriner' : 'Vet Visit';
  if (type === 'record') return isTr ? 'Kayıt' : 'Record';
  return isTr ? 'Kilo' : 'Weight';
}
function recordTypeLabel(t: AddHealthRecordType, isTr: boolean) {
  if (t === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (t === 'diagnosis') return isTr ? 'Teşhis' : 'Diagnosis';
  if (t === 'procedure') return isTr ? 'Prosedür' : 'Procedure';
  if (t === 'prescription') return isTr ? 'İlaç' : 'Prescription';
  return isTr ? 'Test' : 'Test';
}
function isValidDate(v: string) {
  return Number.isFinite(new Date(`${v}T12:00:00.000Z`).getTime());
}
function timelineTypeBg(type: Exclude<HealthHubCategory, 'all'>) {
  if (type === 'vaccine') return C.iconVaccines;
  if (type === 'vet') return C.iconVet;
  if (type === 'weight') return C.iconWeight;
  return '#eeeee8';
}
function timelineTypeAccent(type: Exclude<HealthHubCategory, 'all'>) {
  if (type === 'vaccine') return C.accentVaccine;
  if (type === 'vet') return C.accentVet;
  if (type === 'weight') return C.accentWeight;
  return C.accentRecord;
}

const RECORD_TYPES: AddHealthRecordType[] = ['vaccine', 'diagnosis', 'procedure', 'prescription', 'test'];

function fmtShort(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return n.toLocaleString('tr-TR');
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HealthHubScreen({
  summary,
  timeline,
  initialCategory = 'all',
  categoryResetKey,
  createPreset,
  onPrimaryCta,
  onAddRecord,
  onDeleteRecord,
  onOpenVetVisits,
  onOpenHealthRecords,
  onOpenVaccines,
  onOpenWeightTracking,
  onOpenDocuments,
  domainOverview,
  locale = 'en',
}: HealthHubScreenProps) {
  const isTr = locale === 'tr';

  // ── entrance animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── local state ──
  const [category, setCategory] = useState<HealthHubCategory>(initialCategory);
  const [selectedItem, setSelectedItem] = useState<HealthHubTimelineItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [recType, setRecType] = useState<AddHealthRecordType>('diagnosis');
  const [recTitle, setRecTitle] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recNote, setRecNote] = useState('');
  const [focusedField, setFocusedField] = useState<'title' | 'date' | 'note' | null>(null);
  const [error, setError] = useState('');
  const saveScale = useMemo(() => new Animated.Value(1), []);

  useEffect(() => { setCategory(initialCategory); }, [initialCategory, categoryResetKey]);

  useEffect(() => {
    if (!createPreset?.openCreate) return;
    openCreate(createPreset.type ?? 'diagnosis', createPreset.title, createPreset.note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPreset?.nonce, createPreset?.openCreate]);

  // ── derived ──
  const filteredTimeline = useMemo(
    () => (category === 'all' ? timeline : timeline.filter((i) => i.type === category)),
    [category, timeline],
  );
  const categoryCounts = useMemo(() => {
    const c: Partial<Record<HealthHubCategory, number>> = { all: timeline.length };
    for (const item of timeline) c[item.type] = (c[item.type] ?? 0) + 1;
    return c;
  }, [timeline]);
  const isFormValid = recTitle.trim().length > 0 && recDate.trim().length > 0 && isValidDate(recDate);

  // ── hub entries ──
  const hubEntries = useMemo(
    () => [
      {
        key: 'vet',
        title: isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits',
        subtitle: isTr ? 'Klinik görüşmeleri ve randevular' : 'Clinic visits & appointments',
        icon: <Stethoscope size={22} color={C.fgVet} />,
        iconBg: C.iconVet,
        onPress: onOpenVetVisits,
        overview: domainOverview?.vet,
      },
      {
        key: 'records',
        title: isTr ? 'Sağlık Kayıtları' : 'Health Records',
        subtitle: isTr ? 'Tanı, prosedür, test sonuçları' : 'Diagnosis, procedures & tests',
        icon: <ClipboardList size={22} color={C.fgRecords} />,
        iconBg: C.iconRecords,
        onPress: onOpenHealthRecords ?? (() => setCategory('record')),
        overview: domainOverview?.records,
      },
      {
        key: 'vaccines',
        title: isTr ? 'Aşılar' : 'Vaccines',
        subtitle: isTr ? 'Yapılan ve planlanan aşılar' : 'Administered & upcoming vaccines',
        icon: <Syringe size={22} color={C.fgVaccines} />,
        iconBg: C.iconVaccines,
        onPress: onOpenVaccines,
        overview: domainOverview?.vaccines,
      },
      {
        key: 'weight',
        title: isTr ? 'Kilo Takibi' : 'Weight Tracking',
        subtitle: isTr ? 'Trend ve değişim analizi' : 'Trends & body condition',
        icon: <Scale size={22} color={C.fgWeight} />,
        iconBg: C.iconWeight,
        onPress: onOpenWeightTracking,
        overview: domainOverview?.weight,
      },
      {
        key: 'documents',
        title: isTr ? 'Belgeler' : 'Documents',
        subtitle: isTr ? 'PDF, rapor, görüntüleme' : 'Lab reports & imaging',
        icon: <FileText size={22} color={C.fgDocuments} />,
        iconBg: C.iconDocuments,
        onPress: onOpenDocuments,
        overview: domainOverview?.documents,
      },
    ],
    [domainOverview, isTr, onOpenDocuments, onOpenHealthRecords, onOpenVaccines, onOpenVetVisits, onOpenWeightTracking],
  );

  // ── form helpers ──
  const openCreate = (presetType: AddHealthRecordType = 'diagnosis', presetTitle = '', presetNote = '') => {
    setRecType(presetType);
    setRecTitle(presetTitle ?? '');
    setRecDate(new Date().toISOString().slice(0, 10));
    setRecNote(presetNote ?? '');
    setError('');
    setCreateOpen(true);
  };
  const submitCreate = () => {
    const cleanTitle = recTitle.trim();
    if (!cleanTitle) { setError(isTr ? 'Başlık girin.' : 'Please enter a title.'); return; }
    if (!isValidDate(recDate)) { setError(isTr ? 'Geçerli tarih girin (YYYY-AA-GG).' : 'Enter a valid date (YYYY-MM-DD).'); return; }
    onAddRecord?.({ type: recType, title: cleanTitle, date: recDate, note: recNote.trim() || undefined });
    setCreateOpen(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <Animated.View style={[s.headerRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.headerLabel}>{isTr ? 'SAĞLIK KAYITLARI' : 'CARE RECORDS'}</Text>
          <Text style={s.headerTitle}>{isTr ? 'Sağlık Merkezi' : 'Health Hub'}</Text>
        </Animated.View>

        {/* ── SUMMARY CARDS STRIP ── */}
        {(() => {
          const wRaw = summary.latestWeight;
          const wHasData = /^\d/.test(wRaw);
          const weightNum = wHasData ? wRaw.split(' ')[0] : '—';
          const weightBadge = wHasData ? (wRaw.split(' ')[1] ?? 'kg') : (isTr ? 'kayıt yok' : 'no data');

          const vStatus = summary.vaccineStatus;
          const vHasData = !!vStatus && vStatus !== 'No data' && vStatus !== 'Kayıt yok';
          const vaccineBadge = vHasData ? (isTr ? 'güncel' : 'up to date') : (isTr ? 'kayıt yok' : 'no data');

          const visitRaw = summary.lastVetVisit;
          const visitHasData = !!visitRaw && visitRaw !== 'No data' && visitRaw !== 'Kayıt yok';
          const visitBadge = isTr ? 'Kontrol' : 'Visit';

          const expHasData = !!summary.totalExpenses;
          const expVal = expHasData ? fmtShort(summary.totalExpenses!.total) : '—';
          const expBadge = expHasData ? summary.totalExpenses!.currency : 'TL';

          return (
            <Animated.View style={{ opacity: fadeAnim, marginBottom: 24 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.summaryScrollContent}
                style={s.summaryScroll}
              >
                {/* Weight */}
                <View style={s.summaryCard}>
                  <View style={[s.summaryCardIcon, { backgroundColor: C.iconWeight }]}>
                    <Scale size={20} color={C.fgWeight} />
                  </View>
                  <Text style={s.summaryCardValue}>{weightNum}</Text>
                  <Text style={s.summaryCardLabel}>{isTr ? 'KİLO' : 'WEIGHT'}</Text>
                  <View style={[s.summaryCardBadge, { backgroundColor: wHasData ? '#dceaf7' : C.surfaceContainer }]}>
                    <Text style={[s.summaryCardBadgeText, { color: wHasData ? C.fgWeight : C.outlineVariant }]}>{weightBadge}</Text>
                  </View>
                </View>

                {/* Vaccines */}
                <View style={s.summaryCard}>
                  <View style={[s.summaryCardIcon, { backgroundColor: C.iconVaccines }]}>
                    <Syringe size={20} color={C.fgVaccines} />
                  </View>
                  <Text style={s.summaryCardValue} numberOfLines={1}>{vHasData ? vStatus.slice(0, 6) : '—'}</Text>
                  <Text style={s.summaryCardLabel}>{isTr ? 'AŞI' : 'VACCINES'}</Text>
                  <View style={[s.summaryCardBadge, { backgroundColor: vHasData ? '#c4e8c0' : C.surfaceContainer }]}>
                    <Text style={[s.summaryCardBadgeText, { color: vHasData ? C.fgVaccines : C.outlineVariant }]}>{vaccineBadge}</Text>
                  </View>
                </View>

                {/* Last Visit */}
                <View style={s.summaryCard}>
                  <View style={[s.summaryCardIcon, { backgroundColor: C.iconVet }]}>
                    <Stethoscope size={20} color={C.fgVet} />
                  </View>
                  <Text style={s.summaryCardValue} numberOfLines={1}>{visitHasData ? visitRaw : '—'}</Text>
                  <Text style={s.summaryCardLabel}>{isTr ? 'SON ZİYARET' : 'LAST VISIT'}</Text>
                  <View style={[s.summaryCardBadge, { backgroundColor: visitHasData ? '#eeeee8' : C.surfaceContainer }]}>
                    <Text style={[s.summaryCardBadgeText, { color: C.onSurfaceVariant }]}>{visitHasData ? visitBadge : (isTr ? 'kayıt yok' : 'no data')}</Text>
                  </View>
                </View>

                {/* Expenses */}
                <View style={s.summaryCard}>
                  <View style={[s.summaryCardIcon, { backgroundColor: C.iconRecords }]}>
                    <TrendingUp size={20} color={C.fgRecords} />
                  </View>
                  <Text style={s.summaryCardValue}>{expVal}</Text>
                  <Text style={s.summaryCardLabel}>{isTr ? 'BU YIL' : 'THIS YEAR'}</Text>
                  <View style={[s.summaryCardBadge, { backgroundColor: expHasData ? '#e8e4f2' : C.surfaceContainer }]}>
                    <Text style={[s.summaryCardBadgeText, { color: expHasData ? C.fgRecords : C.outlineVariant }]}>{expBadge}</Text>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          );
        })()}

        {/* ── CATEGORY SECTION HEADER ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionLabel}>{isTr ? 'KAYIT KATEGORİLERİ' : 'RECORD CATEGORIES'}</Text>
        </View>

        {/* ── CATEGORY CARDS ── */}
        <Animated.View style={[s.categoryList, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {hubEntries.map((entry, idx) => (
            <Pressable
              key={entry.key}
              style={[s.categoryCard, idx < hubEntries.length - 1 && s.categoryCardDivider]}
              onPress={entry.onPress}
              android_ripple={{ color: 'rgba(71,102,74,0.06)' }}
            >
              {/* Icon box */}
              <View style={[s.categoryIconBox, { backgroundColor: entry.iconBg }]}>
                {entry.icon}
              </View>

              {/* Body text */}
              <View style={s.categoryCardBody}>
                <Text style={s.categoryCardTitle}>{entry.title}</Text>
                <Text style={s.categoryCardSub} numberOfLines={1}>
                  {entry.overview?.infoText ?? entry.subtitle}
                </Text>
              </View>

              {/* Right side: count badge + status */}
              <View style={s.categoryCardRight}>
                {entry.overview?.countText ? (
                  <View style={s.countBadge}>
                    <Text style={s.countBadgeText}>{entry.overview.countText}</Text>
                  </View>
                ) : null}
                {entry.overview?.statusText ? (
                  <Text style={s.categoryStatusText} numberOfLines={1}>
                    {entry.overview.statusText}
                  </Text>
                ) : null}
              </View>

              <ChevronRight size={16} color={C.outlineVariant} />
            </Pressable>
          ))}
        </Animated.View>

        {/* ── EXPENSE CHART ── */}
        <Animated.View style={[s.expenseChartCard, { opacity: fadeAnim }]}>
          <View style={s.expenseChartHeader}>
            <Text style={s.expenseChartTitle}>{isTr ? 'Harcama Analizi' : 'Expense Breakdown'}</Text>
            <View style={s.expenseChartYearPill}>
              <Text style={s.expenseChartYearText}>{new Date().getFullYear()}</Text>
            </View>
          </View>

          {summary.totalExpenses && summary.totalExpenses.breakdown.length > 0 ? (() => {
            const { total, currency, breakdown } = summary.totalExpenses;
            return (
              <>
                {/* Stacked proportional bar */}
                <View style={s.expenseStackBar}>
                  {breakdown.map((item, i) => (
                    <View
                      key={item.label}
                      style={[
                        s.expenseStackSegment,
                        { flex: item.amount / total, backgroundColor: item.color },
                        i === 0 && s.expenseStackFirst,
                        i === breakdown.length - 1 && s.expenseStackLast,
                      ]}
                    />
                  ))}
                </View>

                {/* Per-category rows */}
                <View style={s.expenseChartRows}>
                  {breakdown.map((item) => {
                    const pct = Math.round((item.amount / total) * 100);
                    return (
                      <View key={item.label} style={s.expenseChartRow}>
                        <View style={[s.expenseChartDot, { backgroundColor: item.color }]} />
                        <Text style={s.expenseChartLabel}>{item.label}</Text>
                        <View style={s.expenseChartBarWrap}>
                          <View style={[s.expenseChartBarFill, { flex: item.amount / total, backgroundColor: item.color + '40' }]} />
                          <View style={{ flex: 1 - item.amount / total }} />
                        </View>
                        <Text style={s.expenseChartPct}>{pct}%</Text>
                        <Text style={s.expenseChartAmt}>{item.amount.toLocaleString('tr-TR')} {currency}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={s.expenseChartFooter}>
                  <Text style={s.expenseChartFooterLabel}>{isTr ? 'Toplam' : 'Total'}</Text>
                  <Text style={s.expenseChartFooterValue}>{total.toLocaleString('tr-TR')} {currency}</Text>
                </View>
              </>
            );
          })() : (
            <View style={s.expenseChartEmpty}>
              <Text style={s.expenseChartEmptyText}>
                {isTr
                  ? 'Veteriner ziyareti ekleyince harcama özeti burada görünür.'
                  : 'Add a vet visit with a cost to see your expense breakdown here.'}
              </Text>
            </View>
          )}
        </Animated.View>

      </ScrollView>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DETAIL / DELETE BOTTOM SHEET                                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable style={s.sheetOverlay} onPress={() => setSelectedItem(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            {selectedItem ? (
              <>
                {/* Sheet handle */}
                <View style={s.sheetHandle} />

                <View style={s.sheetHead}>
                  <View style={[s.sheetTypePill, { borderColor: `${timelineTypeAccent(selectedItem.type)}30`, backgroundColor: `${timelineTypeAccent(selectedItem.type)}12` }]}>
                    <Text style={[s.sheetTypeText, { color: timelineTypeAccent(selectedItem.type) }]}>
                      {typeTag(selectedItem.type, isTr)}
                    </Text>
                  </View>
                  <Text style={s.sheetDate}>{selectedItem.date}</Text>
                </View>

                <Text style={s.sheetTitle}>{selectedItem.title}</Text>
                {selectedItem.notes ? (
                  <Text style={s.sheetNote}>{selectedItem.notes}</Text>
                ) : null}

                <View style={s.sheetActions}>
                  <Pressable style={s.sheetCloseBtn} onPress={() => setSelectedItem(null)}>
                    <Text style={s.sheetCloseBtnText}>{isTr ? 'Kapat' : 'Close'}</Text>
                  </Pressable>

                  {onDeleteRecord && (selectedItem.type === 'record' || selectedItem.type === 'vaccine') ? (
                    deleteConfirm ? (
                      <Pressable
                        style={s.sheetDeleteConfirmBtn}
                        onPress={() => {
                          onDeleteRecord(selectedItem.id);
                          setSelectedItem(null);
                          setDeleteConfirm(false);
                        }}
                      >
                        <Text style={s.sheetDeleteConfirmText}>
                          {isTr ? 'Sil — emin misin?' : 'Confirm Delete'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable style={s.sheetDeleteBtn} onPress={() => setDeleteConfirm(true)}>
                        <Text style={s.sheetDeleteBtnText}>{isTr ? 'Sil' : 'Delete'}</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* CREATE MODAL (full screen slide-up)                                   */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={createOpen}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={s.createScreen}>
          {/* Header */}
          <View style={s.createHeader}>
            <Pressable style={s.createCancelBtn} onPress={() => setCreateOpen(false)}>
              <Text style={s.createCancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
            </Pressable>
            <Text style={s.createHeaderTitle}>{isTr ? 'Kayıt Ekle' : 'Add Record'}</Text>
            <Animated.View style={{ transform: [{ scale: saveScale }] }}>
              <Pressable
                style={[s.createSaveBtn, !isFormValid && s.createSaveBtnDisabled]}
                disabled={!isFormValid}
                onPress={submitCreate}
                onPressIn={() =>
                  Animated.spring(saveScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start()
                }
                onPressOut={() =>
                  Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, speed: 36, bounciness: 5 }).start()
                }
              >
                <Text style={s.createSaveText}>{isTr ? 'Kaydet' : 'Save'}</Text>
              </Pressable>
            </Animated.View>
          </View>

          <ScrollView style={s.createBody} contentContainerStyle={s.createBodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type chips */}
            <Text style={s.createFieldLabel}>{isTr ? 'KAYIT TÜRÜ' : 'RECORD TYPE'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.createChipsRow}>
              {RECORD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[s.createChip, recType === t && s.createChipActive]}
                  onPress={() => setRecType(t)}
                >
                  <Text style={[s.createChipText, recType === t && s.createChipTextActive]}>
                    {recordTypeLabel(t, isTr)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={s.createFieldLabel}>{isTr ? 'BAŞLIK' : 'TITLE'}</Text>
            <TextInput
              style={[s.createInput, focusedField === 'title' && s.createInputFocused]}
              placeholder={isTr ? 'Kayıt başlığı' : 'Record title'}
              placeholderTextColor={C.outlineVariant}
              value={recTitle}
              onChangeText={setRecTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Date */}
            <Text style={s.createFieldLabel}>{isTr ? 'TARİH (YYYY-AA-GG)' : 'DATE (YYYY-MM-DD)'}</Text>
            <TextInput
              style={[s.createInput, focusedField === 'date' && s.createInputFocused]}
              placeholder={new Date().toISOString().slice(0, 10)}
              placeholderTextColor={C.outlineVariant}
              value={recDate}
              onChangeText={setRecDate}
              autoCapitalize="none"
              onFocus={() => setFocusedField('date')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Note */}
            <Text style={s.createFieldLabel}>{isTr ? 'NOT (OPSİYONEL)' : 'NOTE (OPTIONAL)'}</Text>
            <TextInput
              style={[s.createInput, s.createInputMultiline, focusedField === 'note' && s.createInputFocused]}
              placeholder={isTr ? 'Ek not...' : 'Additional notes...'}
              placeholderTextColor={C.outlineVariant}
              value={recNote}
              onChangeText={setRecNote}
              multiline
              numberOfLines={4}
              onFocus={() => setFocusedField('note')}
              onBlur={() => setFocusedField(null)}
            />

            {error ? <Text style={s.createError}>{error}</Text> : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 120,
  },

  // Header
  headerRow: {
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  addBtn: {
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primaryDim,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addBtnText: {
    color: C.onPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Summary cards strip
  summaryScroll: {
    marginHorizontal: -22,
  },
  summaryScrollContent: {
    paddingHorizontal: 22,
    gap: 10,
    paddingBottom: 4,
  },
  summaryCard: {
    width: 112,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: C.onSurface,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  summaryCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  summaryCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.outlineVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 3,
    textAlign: 'center',
  },
  summaryCardBadge: {
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 24,
    shadowColor: C.onSurface,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    marginVertical: 2,
    backgroundColor: C.outlineVariant,
    opacity: 0.35,
  },

  // Header expense badge
  headerExpensesBadge: {
    backgroundColor: '#eef6ef',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#d4e8d6',
    shadowColor: '#47664a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    maxWidth: 156,
  },
  headerExpensesTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerExpensesYearPill: {
    backgroundColor: '#d4e8d6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  headerExpensesYearText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2e4230',
  },
  headerExpensesLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#5d7c60',
    textTransform: 'uppercase',
  },
  headerExpensesAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2e4230',
    letterSpacing: -0.8,
    lineHeight: 24,
    marginBottom: 6,
  },
  headerExpensesCurrency: {
    fontSize: 12,
    fontWeight: '600',
    color: '#47664a',
  },

  // Expenses pastel premium card
  expensesCard: {
    borderRadius: 22,
    backgroundColor: '#eef6ef',
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#d4e8d6',
    overflow: 'hidden',
    shadowColor: '#47664a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  expensesAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#47664a',
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  expensesInner: {
    paddingLeft: 22,
    paddingRight: 20,
    paddingVertical: 18,
  },
  expensesTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expensesLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#5d7c60',
    textTransform: 'uppercase',
  },
  expensesYearPill: {
    borderRadius: 8,
    backgroundColor: '#d4e8d6',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  expensesYearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2e4230',
  },
  expensesTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 14,
  },
  expensesTotal: {
    fontSize: 38,
    fontWeight: '800',
    color: '#2e4230',
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  expensesCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#47664a',
    marginBottom: 6,
  },
  expensesBreakRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  expensesBreakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  expensesDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  expensesBreakLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5d7c60',
  },
  expensesBreakAmt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2e4230',
  },

  // Header expense badge extras
  headerExpensesBreakRow: {
    flexDirection: 'column',
    gap: 3,
    alignSelf: 'stretch',
  },
  headerExpensesBreakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerExpensesDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  headerExpensesBreakText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#5d7c60',
    flex: 1,
  },
  headerExpensesBreakAmt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2e4230',
  },
  headerExpensesEmpty: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2e4230',
    letterSpacing: -0.5,
    marginBottom: 2,
    opacity: 0.35,
  },
  headerExpensesEmptyHint: {
    fontSize: 9,
    fontWeight: '600',
    color: '#5d7c60',
    opacity: 0.7,
  },

  // Expense chart card
  expenseChartCard: {
    borderRadius: 22,
    backgroundColor: '#eef6ef',
    borderWidth: 1,
    borderColor: '#d4e8d6',
    padding: 18,
    gap: 14,
    shadowColor: '#47664a',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  expenseChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseChartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: 0.2,
  },
  expenseChartYearPill: {
    borderRadius: 8,
    backgroundColor: '#eef6ef',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  expenseChartYearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#47664a',
  },
  expenseStackBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#cde5cf',
    gap: 2,
  },
  expenseStackSegment: {
    height: '100%',
  },
  expenseStackFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  expenseStackLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  expenseChartRows: {
    gap: 10,
  },
  expenseChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseChartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  expenseChartLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5d605a',
    width: 60,
    flexShrink: 0,
  },
  expenseChartBarWrap: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#cde5cf',
  },
  expenseChartBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  expenseChartPct: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a9c95',
    width: 32,
    textAlign: 'right',
    flexShrink: 0,
  },
  expenseChartAmt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30332e',
    width: 80,
    textAlign: 'right',
    flexShrink: 0,
  },
  expenseChartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#c8deca',
    paddingTop: 10,
  },
  expenseChartFooterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5d605a',
  },
  expenseChartFooterValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#30332e',
  },
  expenseChartEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  expenseChartEmptyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5d7c60',
    textAlign: 'center',
    lineHeight: 19,
    opacity: 0.75,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  timelineCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.outlineVariant,
  },

  // Category cards
  categoryList: {
    backgroundColor: C.surface,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: C.onSurface,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  categoryCardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surfaceContainer,
  },
  categoryIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryCardBody: {
    flex: 1,
    gap: 3,
  },
  categoryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  categoryCardSub: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onSurfaceVariant,
    lineHeight: 16,
  },
  categoryCardRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  countBadge: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  categoryStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    maxWidth: 80,
    textAlign: 'right',
  },

  // Filter chips
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
    marginBottom: 12,
  },
  filterChip: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: C.primary,
    backgroundColor: '#edf5ea',
  },
  filterChipText: {
    color: C.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: C.primary,
    fontWeight: '700',
  },

  // Timeline
  timelineContainer: {
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.onSurface,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  timelineCardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surfaceContainer,
  },
  timelineIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timelineBody: {
    flex: 1,
    gap: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  timelineMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: C.onSurfaceVariant,
  },
  timelineNote: {
    fontSize: 11,
    fontWeight: '400',
    color: C.onSurfaceVariant,
    lineHeight: 15,
    marginTop: 1,
  },
  typeTagPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Empty state
  emptyWrap: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'flex-start',
    gap: 6,
  },
  emptyTitle: {
    color: C.onSurface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptyText: {
    color: C.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  emptyCta: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${C.primary}40`,
    backgroundColor: '#edf5ea',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  emptyCtaText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Detail bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(48,51,46,0.40)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 6,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
    marginBottom: 16,
    opacity: 0.5,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTypePill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sheetTypeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetDate: {
    fontSize: 12,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  sheetNote: {
    fontSize: 14,
    fontWeight: '400',
    color: C.onSurfaceVariant,
    lineHeight: 21,
    marginTop: 4,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  sheetCloseBtn: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  sheetDeleteBtn: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,59,33,0.3)',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDeleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.urgent,
  },
  sheetDeleteConfirmBtn: {
    height: 40,
    borderRadius: 20,
    backgroundColor: C.urgent,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDeleteConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Create modal
  createScreen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surfaceContainer,
  },
  createCancelBtn: {
    height: 36,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  createHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  createSaveBtn: {
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSaveBtnDisabled: {
    opacity: 0.45,
  },
  createSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onPrimary,
  },
  createBody: {
    flex: 1,
  },
  createBodyContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 0,
  },
  createFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },
  createChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  createChip: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createChipActive: {
    borderColor: C.primary,
    backgroundColor: '#edf5ea',
  },
  createChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  createChipTextActive: {
    color: C.primary,
    fontWeight: '700',
  },
  createInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    color: C.onSurface,
    fontSize: 15,
    fontWeight: '500',
  },
  createInputMultiline: {
    height: 96,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  createInputFocused: {
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  createError: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: C.urgent,
    lineHeight: 18,
  },
});
