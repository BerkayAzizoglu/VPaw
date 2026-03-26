import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CheckCircle,
  ChevronRight,
  FileText,
  Plus,
  Pill,
  Scale,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingUp,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

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
  documentsPreview?: Array<{ id: string; title: string; date: string; type: string }>;
  medicationCourses?: Array<{ id: string; name: string; startDate: string; status: string; dose?: number; doseUnit?: string; frequency?: string; endDate?: string }>;
  onCompleteMedication?: (id: string) => void;
  onDeleteMedication?: (id: string) => void;
  weightGoal?: number;
  locale?: 'en' | 'tr';
};
type HealthHubIconKind = 'vet' | 'records' | 'vaccines' | 'weight' | 'documents';
type AreaRowKey = HealthHubIconKind;
type AreaRowTheme = {
  start: string;
  end: string;
  iconBg: string;
  iconTint: string;
  titleColor: string;
  subColor: string;
  badgeBg: string;
  badgeText: string;
  statusText: string;
  chevron: string;
  divider: string;
};

const AREA_ROW_THEMES: Record<AreaRowKey, AreaRowTheme> = {
  vet: {
    start: '#102736',
    end: '#173f4a',
    iconBg: 'rgba(255,255,255,0.08)',
    iconTint: '#e7f8ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.82)',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeText: '#6bb6c7',
    statusText: 'rgba(189,216,227,0.92)',
    chevron: '#6bb6c7',
    divider: 'rgba(255,255,255,0.10)',
  },
  records: {
    start: '#102736',
    end: '#173f4a',
    iconBg: 'rgba(255,255,255,0.08)',
    iconTint: '#edf7ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.82)',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeText: '#8eadc0',
    statusText: 'rgba(189,216,227,0.92)',
    chevron: '#8eadc0',
    divider: 'rgba(255,255,255,0.10)',
  },
  vaccines: {
    start: '#102736',
    end: '#173f4a',
    iconBg: 'rgba(255,255,255,0.08)',
    iconTint: '#e4f7ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.82)',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeText: '#75b9d6',
    statusText: 'rgba(189,216,227,0.92)',
    chevron: '#75b9d6',
    divider: 'rgba(255,255,255,0.10)',
  },
  weight: {
    start: '#102736',
    end: '#173f4a',
    iconBg: 'rgba(255,255,255,0.08)',
    iconTint: '#e6f8ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.82)',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeText: '#88b7bf',
    statusText: 'rgba(189,216,227,0.92)',
    chevron: '#88b7bf',
    divider: 'rgba(255,255,255,0.10)',
  },
  documents: {
    start: '#102736',
    end: '#173f4a',
    iconBg: 'rgba(255,255,255,0.14)',
    iconTint: '#ebf6fc',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.82)',
    badgeBg: 'rgba(255,255,255,0.08)',
    badgeText: '#9eb3c0',
    statusText: 'rgba(189,216,227,0.92)',
    chevron: '#9eb3c0',
    divider: 'rgba(255,255,255,0.10)',
  },
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

function FolderHeartIcon({ size = 21, color = '#7aa2b8' }: { size?: number; color?: string }) {
  const heartPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(heartPulse, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [heartPulse]);

  const heartScale = heartPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });
  const heartOpacity = heartPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10.638 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v3.417"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: heartScale }],
            opacity: heartOpacity,
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M14.62 18.8A2.25 2.25 0 1 1 18 15.836a2.25 2.25 0 1 1 3.38 2.966l-2.626 2.856a.998.998 0 0 1-1.507 0z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function HealthHubCategoryIcon({
  kind,
  size = 21,
  colorOverride,
}: {
  kind: HealthHubIconKind;
  size?: number;
  colorOverride?: string;
}) {
  const strokeWidth = 1.9;
  if (kind === 'vet') return <Stethoscope size={size} strokeWidth={strokeWidth} color={colorOverride ?? C.fgVet} />;
  if (kind === 'records') return <FolderHeartIcon size={size} color={colorOverride ?? C.fgRecords} />;
  if (kind === 'vaccines') return <Syringe size={size} strokeWidth={strokeWidth} color={colorOverride ?? C.fgVaccines} />;
  if (kind === 'weight') return <Scale size={size} strokeWidth={strokeWidth} color={colorOverride ?? C.fgWeight} />;
  return <FileText size={size} strokeWidth={strokeWidth} color={colorOverride ?? C.fgDocuments} />;
}

const RECORD_TYPES: AddHealthRecordType[] = ['vaccine', 'diagnosis', 'procedure', 'prescription', 'test'];
const SWIPE_ACTION_WIDTH = 174;
const SWIPE_OPEN_THRESHOLD = 28;

function fmtShort(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return n.toLocaleString('tr-TR');
}

const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_SHORT_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function fmtVisitDate(raw: string, isTr: boolean): string {
  // Handles ISO date "2025-02-21" → "Feb 21" / "Şub 21"
  // Also handles already-formatted strings by returning them as-is
  const parts = raw.split('-');
  if (parts.length === 3) {
    const monthIdx = parseInt(parts[1] ?? '1', 10) - 1;
    const day = parts[2]?.replace(/^0/, '') ?? '';
    const months = isTr ? MONTHS_SHORT_TR : MONTHS_SHORT_EN;
    const mon = months[monthIdx];
    if (mon && day) return `${mon} ${day}`;
  }
  return raw;
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
  documentsPreview,
  medicationCourses,
  onCompleteMedication,
  onDeleteMedication,
  weightGoal,
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
  const [openSwipeKey, setOpenSwipeKey] = useState<string | null>(null);
  const swipeXByKeyRef = useRef<Record<string, Animated.Value>>({});
  const swipePressLockUntilRef = useRef(0);
  const iconAnimByKeyRef = useRef<Record<string, Animated.Value>>({});

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
        icon: <HealthHubCategoryIcon kind="vet" colorOverride={AREA_ROW_THEMES.vet.iconTint} />,
        iconBg: AREA_ROW_THEMES.vet.iconBg,
        onPress: onOpenVetVisits,
        overview: domainOverview?.vet,
      },
      
      {
        key: 'vaccines',
        title: isTr ? 'Aşılar' : 'Vaccines',
        subtitle: isTr ? 'Yapılan ve planlanan aşılar' : 'Administered & upcoming vaccines',
        icon: <HealthHubCategoryIcon kind="vaccines" colorOverride={AREA_ROW_THEMES.vaccines.iconTint} />,
        iconBg: AREA_ROW_THEMES.vaccines.iconBg,
        onPress: onOpenVaccines,
        overview: domainOverview?.vaccines,
      },
      {
        key: 'weight',
        title: isTr ? 'Kilo Takibi' : 'Weight Tracking',
        subtitle: isTr ? 'Trend ve değişim analizi' : 'Trends & body condition',
        icon: <HealthHubCategoryIcon kind="weight" colorOverride={AREA_ROW_THEMES.weight.iconTint} />,
        iconBg: AREA_ROW_THEMES.weight.iconBg,
        onPress: onOpenWeightTracking,
        overview: domainOverview?.weight,
      },
      {
        key: 'records',
        title: isTr ? 'Sağlık Kayıtları' : 'Health Records',
        subtitle: isTr ? 'Tanı, prosedür, test sonuçları' : 'Diagnosis, procedures & tests',
        icon: <HealthHubCategoryIcon kind="records" colorOverride={AREA_ROW_THEMES.records.iconTint} />,
        iconBg: AREA_ROW_THEMES.records.iconBg,
        onPress: onOpenHealthRecords ?? (() => setCategory('record')),
        overview: domainOverview?.records,
      },
    ],
    [domainOverview, isTr, onOpenHealthRecords, onOpenVaccines, onOpenVetVisits, onOpenWeightTracking],
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

  const getSwipeX = (key: string) => {
    if (!swipeXByKeyRef.current[key]) swipeXByKeyRef.current[key] = new Animated.Value(0);
    return swipeXByKeyRef.current[key];
  };
  const getIconAnim = (key: string) => {
    if (!iconAnimByKeyRef.current[key]) iconAnimByKeyRef.current[key] = new Animated.Value(0);
    return iconAnimByKeyRef.current[key];
  };

  const setSwipeOpen = (key: string, open: boolean) => {
    if (openSwipeKey && openSwipeKey !== key) {
      const prevX = getSwipeX(openSwipeKey);
      Animated.spring(prevX, { toValue: 0, useNativeDriver: true, speed: 28, bounciness: 6 }).start();
    }
    const targetX = getSwipeX(key);
    Animated.spring(targetX, {
      toValue: open ? -SWIPE_ACTION_WIDTH : 0,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
    setOpenSwipeKey(open ? key : openSwipeKey === key ? null : openSwipeKey);
  };

  const handleQuickAddForKey = (key: string) => {
    setSwipeOpen(key, false);
    if (key === 'vet') {
      if (onOpenVetVisits) onOpenVetVisits();
      else openCreate('procedure', isTr ? 'Veteriner Ziyareti' : 'Vet Visit');
      return;
    }
    if (key === 'vaccines') {
      if (onOpenVaccines) onOpenVaccines();
      else openCreate('vaccine', isTr ? 'Aşı Kaydı' : 'Vaccine Record');
      return;
    }
    if (key === 'records') {
      if (onOpenHealthRecords) onOpenHealthRecords();
      else openCreate('diagnosis', isTr ? 'Sağlık Kaydı' : 'Health Record');
      return;
    }
    if (key === 'weight') {
      if (onOpenWeightTracking) onOpenWeightTracking();
      return;
    }
    if (key === 'documents') {
      onOpenDocuments?.();
    }
  };

  useEffect(() => {
    const keys: AreaRowKey[] = ['vet', 'vaccines', 'weight', 'records', 'documents'];
    const loops = keys.map((key, idx) => {
      const v = getIconAnim(key);
      v.setValue(0);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(idx * 180),
          Animated.timing(v, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2200, useNativeDriver: true }),
        ]),
      );
    });
    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <View pointerEvents="none" style={s.pageBgLayer}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="healthHubPageBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#081a24" />
              <Stop offset="55%" stopColor="#0e2a37" />
              <Stop offset="100%" stopColor="#123743" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#healthHubPageBg)" />
          <Rect x="0" y="0" width="100" height="100" fill="rgba(255,255,255,0.02)" />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <Animated.View style={[s.headerRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.headerLabel}>{isTr ? 'SAĞLIK KAYITLARI' : 'CARE RECORDS'}</Text>
          <Text style={s.headerTitle}>{isTr ? 'Sağlık Merkezi' : 'Health Hub'}</Text>
        </Animated.View>

        {/* ── CATEGORY SECTION HEADER ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionLabel, s.sectionLabelAreas]}>{isTr ? 'SAĞLIK ALANLARI' : 'HEALTH AREAS'}</Text>
          <View style={[s.sectionHeaderLine, s.sectionHeaderLineAreas]} />
        </View>

        {/* ── CATEGORY CARDS ── */}
        <Animated.View style={[s.categoryList, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {hubEntries.map((entry, idx) => {
            const rowTheme = AREA_ROW_THEMES[entry.key as Exclude<AreaRowKey, 'documents'>];
            const gradientId = `healthHubAreaGradient-${entry.key}`;
            const swipeX = getSwipeX(entry.key);
            const panResponder = PanResponder.create({
              onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8,
              onMoveShouldSetPanResponderCapture: (_evt, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8,
              onPanResponderTerminationRequest: () => false,
              onShouldBlockNativeResponder: () => true,
              onPanResponderMove: (_evt, g) => {
                const base = openSwipeKey === entry.key ? -SWIPE_ACTION_WIDTH : 0;
                const nextX = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, g.dx + base));
                swipeX.setValue(nextX);
              },
              onPanResponderRelease: (_evt, g) => {
                swipePressLockUntilRef.current = Date.now() + 220;
                const movedLeftEnough = g.dx < -SWIPE_OPEN_THRESHOLD;
                const movedRightEnough = g.dx > 24;
                if (movedLeftEnough) {
                  setSwipeOpen(entry.key, true);
                  return;
                }
                if (movedRightEnough) {
                  setSwipeOpen(entry.key, false);
                  return;
                }
                setSwipeOpen(entry.key, openSwipeKey === entry.key);
              },
              onPanResponderTerminate: () => {
                swipePressLockUntilRef.current = Date.now() + 220;
                setSwipeOpen(entry.key, openSwipeKey === entry.key);
              },
            });
            const rowInner = (
              <Pressable
                style={({ pressed }) => [
                  s.categoryCard,
                  idx < hubEntries.length - 1 && s.categoryCardDividerSoft,
                  pressed && s.categoryCardPressed,
                ]}
                onPress={() => {
                  if (Date.now() < swipePressLockUntilRef.current) return;
                  if (openSwipeKey === entry.key) {
                    setSwipeOpen(entry.key, false);
                    return;
                  }
                  entry.onPress?.();
                }}
                android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
              >
                <View pointerEvents="none" style={s.rowGradientFill}>
                  <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <Defs>
                      <LinearGradient id={gradientId} x1="0" y1="0.5" x2="1" y2="0.5">
                        <Stop offset="0%" stopColor={rowTheme.start} />
                        <Stop offset="100%" stopColor={rowTheme.end} />
                      </LinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
                  </Svg>
                </View>

                <View
                  style={[
                    s.categoryIconBox,
                    {
                      backgroundColor: entry.iconBg,
                      borderColor: `${rowTheme.chevron}66`,
                      shadowColor: rowTheme.chevron,
                    },
                  ]}
                >
                  <Animated.View
                    style={{
                      transform: [
                        {
                          scale: getIconAnim(entry.key).interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 1.04, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    {entry.icon}
                  </Animated.View>
                </View>

                <View style={s.categoryCardBody}>
                  <Text style={[s.categoryCardTitle, { color: rowTheme.titleColor }]}>{entry.title}</Text>
                  <Text style={[s.categoryCardSub, { color: rowTheme.subColor }]} numberOfLines={1}>
                    {entry.overview?.infoText ?? entry.subtitle}
                  </Text>
                </View>

                <View style={s.categoryCardRight}>
                  {entry.overview?.countText ? (
                    <View style={[s.countBadge, { backgroundColor: rowTheme.badgeBg, borderColor: `${rowTheme.chevron}4D` }]}>
                      <Text style={[s.countBadgeText, { color: rowTheme.badgeText }]}>{entry.overview.countText}</Text>
                    </View>
                  ) : null}
                  {entry.overview?.statusText ? (
                    <Text style={[s.categoryStatusText, { color: rowTheme.statusText }]} numberOfLines={1}>
                      {entry.overview.statusText}
                    </Text>
                  ) : null}
                </View>

                <ChevronRight size={16} color={rowTheme.chevron} />
              </Pressable>
            );

            return (
              <View key={entry.key} style={s.swipeRowWrap}>
                <View style={[s.swipeActionsRail, { backgroundColor: '#0f2a38' }]}>
                  <Pressable style={[s.swipeDetailsBtn, { borderColor: `${rowTheme.chevron}55` }]} onPress={() => { setSwipeOpen(entry.key, false); entry.onPress?.(); }}>
                    <Text style={s.swipeDetailsText}>{isTr ? 'Detaylar' : 'Details'}</Text>
                  </Pressable>
                  <Pressable style={[s.swipePlusBtn, { backgroundColor: `${rowTheme.chevron}33`, borderColor: `${rowTheme.chevron}80` }]} onPress={() => handleQuickAddForKey(entry.key)}>
                    <Plus size={18} color="#e7f7ff" strokeWidth={2.2} />
                  </Pressable>
                </View>
                <Animated.View style={{ transform: [{ translateX: swipeX }] }} {...panResponder.panHandlers}>
                  {rowInner}
                </Animated.View>
              </View>
            );
          })}
        </Animated.View>

        <View style={[s.sectionHeaderRow, s.sectionHeaderRowSpaced]}>
          <Text style={[s.sectionLabel, s.sectionLabelDocs]}>{isTr ? 'BELGELER' : 'DOCUMENTS'}</Text>
          <View style={[s.sectionHeaderLine, s.sectionHeaderLineDocs]} />
        </View>
        <Animated.View style={[s.categoryList, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {(() => {
            const docsKey = 'documents';
            const docsSwipeX = getSwipeX(docsKey);
            const docsResponder = PanResponder.create({
              onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8,
              onMoveShouldSetPanResponderCapture: (_evt, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 8,
              onPanResponderTerminationRequest: () => false,
              onShouldBlockNativeResponder: () => true,
              onPanResponderMove: (_evt, g) => {
                const base = openSwipeKey === docsKey ? -SWIPE_ACTION_WIDTH : 0;
                const nextX = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, g.dx + base));
                docsSwipeX.setValue(nextX);
              },
              onPanResponderRelease: (_evt, g) => {
                swipePressLockUntilRef.current = Date.now() + 220;
                const movedLeftEnough = g.dx < -SWIPE_OPEN_THRESHOLD;
                const movedRightEnough = g.dx > 24;
                if (movedLeftEnough) {
                  setSwipeOpen(docsKey, true);
                  return;
                }
                if (movedRightEnough) {
                  setSwipeOpen(docsKey, false);
                  return;
                }
                setSwipeOpen(docsKey, openSwipeKey === docsKey);
              },
              onPanResponderTerminate: () => {
                swipePressLockUntilRef.current = Date.now() + 220;
                setSwipeOpen(docsKey, openSwipeKey === docsKey);
              },
            });
            return (
              <View style={s.swipeRowWrap}>
                <View style={[s.swipeActionsRail, { backgroundColor: '#0f2a38' }]}>
                  <Pressable style={[s.swipeDetailsBtn, { borderColor: `${AREA_ROW_THEMES.documents.chevron}55` }]} onPress={() => { setSwipeOpen(docsKey, false); onOpenDocuments?.(); }}>
                    <Text style={s.swipeDetailsText}>{isTr ? 'Detaylar' : 'Details'}</Text>
                  </Pressable>
                  <Pressable style={[s.swipePlusBtn, { backgroundColor: `${AREA_ROW_THEMES.documents.chevron}33`, borderColor: `${AREA_ROW_THEMES.documents.chevron}80` }]} onPress={() => handleQuickAddForKey(docsKey)}>
                    <Plus size={18} color="#e7f7ff" strokeWidth={2.2} />
                  </Pressable>
                </View>
                <Animated.View style={{ transform: [{ translateX: docsSwipeX }] }} {...docsResponder.panHandlers}>
          <Pressable
                    style={({ pressed }) => [s.categoryCard, pressed && s.categoryCardPressed]}
                    onPress={() => {
                      if (Date.now() < swipePressLockUntilRef.current) return;
                      if (openSwipeKey === docsKey) {
                        setSwipeOpen(docsKey, false);
                        return;
              }
              onOpenDocuments?.();
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
          >
            <View pointerEvents="none" style={s.rowGradientFill}>
              <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="healthHubAreaGradient-documents" x1="0" y1="0.5" x2="1" y2="0.5">
                    <Stop offset="0%" stopColor={AREA_ROW_THEMES.documents.start} />
                    <Stop offset="100%" stopColor={AREA_ROW_THEMES.documents.end} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="100" fill="url(#healthHubAreaGradient-documents)" />
              </Svg>
            </View>
            <View
              style={[
                s.categoryIconBox,
                {
                  backgroundColor: AREA_ROW_THEMES.documents.iconBg,
                  borderColor: `${AREA_ROW_THEMES.documents.chevron}66`,
                  shadowColor: AREA_ROW_THEMES.documents.chevron,
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: getIconAnim('documents').interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.04, 1],
                      }),
                    },
                  ],
                }}
              >
                <HealthHubCategoryIcon kind="documents" size={21} colorOverride={AREA_ROW_THEMES.documents.iconTint} />
              </Animated.View>
            </View>
            <View style={s.categoryCardBody}>
              <Text style={[s.categoryCardTitle, { color: AREA_ROW_THEMES.documents.titleColor }]}>{isTr ? 'Belgeler' : 'Documents'}</Text>
              <Text style={[s.categoryCardSub, { color: AREA_ROW_THEMES.documents.subColor }]} numberOfLines={1}>
                {domainOverview?.documents?.infoText ?? (isTr ? 'Tüm kayıt ekleri tek yerde' : 'All record attachments in one place')}
              </Text>
              {documentsPreview && documentsPreview.length > 0 ? (
                <Text style={[s.vaultPreviewText, { color: AREA_ROW_THEMES.documents.subColor }]} numberOfLines={2}>
                  {documentsPreview.map((item) => item.title).slice(0, 2).join(' • ')}
                </Text>
              ) : null}
            </View>
            <View style={s.categoryCardRight}>
              {domainOverview?.documents?.countText ? (
                <View style={[s.countBadge, { backgroundColor: AREA_ROW_THEMES.documents.badgeBg, borderColor: `${AREA_ROW_THEMES.documents.chevron}4D` }]}>
                  <Text style={[s.countBadgeText, { color: AREA_ROW_THEMES.documents.badgeText }]}>{domainOverview.documents.countText}</Text>
                </View>
              ) : null}
              <Text style={[s.vaultCtaText, { color: AREA_ROW_THEMES.documents.statusText }]}>{isTr ? 'Tüm Belgeler' : 'View All'}</Text>
            </View>
            <ChevronRight size={16} color={AREA_ROW_THEMES.documents.chevron} />
          </Pressable>
                </Animated.View>
              </View>
            );
          })()}
        </Animated.View>

        {/* ── ACTIVE MEDICATIONS ── */}
        {medicationCourses && medicationCourses.filter((m) => m.status === 'active' || m.status === 'paused').length > 0 ? (
          <>
            <View style={[s.sectionHeaderRow, s.sectionHeaderRowSpaced]}>
              <Text style={[s.sectionLabel, s.sectionLabelMeds]}>{isTr ? 'AKTİF İLAÇLAR' : 'ACTIVE MEDICATIONS'}</Text>
              <View style={[s.sectionHeaderLine, s.sectionHeaderLineMeds]} />
            </View>
            <Animated.View style={[s.categoryList, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {medicationCourses
                .filter((m) => m.status === 'active' || m.status === 'paused')
                .map((med) => {
                  const doseLabel = med.dose ? `${med.dose}${med.doseUnit ?? ''} ${med.frequency ?? ''}`.trim() : (isTr ? 'Doz belirtilmedi' : 'No dose specified');
                  return (
                    <View key={med.id} style={s.medCard}>
                      <View style={s.medIconBox}>
                        <Pill size={18} color="#7a4a9a" strokeWidth={1.9} />
                      </View>
                      <View style={s.medBody}>
                        <Text style={s.medName} numberOfLines={1}>{med.name}</Text>
                        <Text style={s.medSub} numberOfLines={1}>{doseLabel}</Text>
                        {med.status === 'paused' ? (
                          <View style={s.medPausedPill}>
                            <Text style={s.medPausedText}>{isTr ? 'Duraklatıldı' : 'Paused'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={s.medActions}>
                        {onCompleteMedication ? (
                          <Pressable style={s.medCompleteBtn} onPress={() => onCompleteMedication(med.id)}>
                            <CheckCircle size={16} color="#3a6e45" strokeWidth={2} />
                          </Pressable>
                        ) : null}
                        {onDeleteMedication ? (
                          <Pressable style={s.medDeleteBtn} onPress={() => onDeleteMedication(med.id)}>
                            <Trash2 size={14} color="#c0392b" strokeWidth={2} />
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
            </Animated.View>
          </>
        ) : null}

        {/* ── EXPENSE CHART ── */}
        {summary.totalExpenses && false ? <Animated.View style={[s.expenseChartCard, { opacity: fadeAnim }]}>
          <View style={s.expenseChartHeader}>
            <Text style={s.expenseChartTitle}>{isTr ? 'Harcama Analizi' : 'Expense Breakdown'}</Text>
            <View style={s.expenseChartYearPill}>
              <Text style={s.expenseChartYearText}>{new Date().getFullYear()}</Text>
            </View>
          </View>

          {summary.totalExpenses?.breakdown.length ? (() => {
            const { total, currency, breakdown } = summary.totalExpenses!;
            return (
              <>
                {/* Stacked proportional bar */}
                <View style={s.expenseStackBar}>
                  {breakdown.map((item: { label: string; amount: number; color: string }, i: number) => (
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
                  {breakdown.map((item: { label: string; amount: number; color: string }) => {
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
        </Animated.View> : null}

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
                  {onOpenDocuments && selectedItem.type !== 'weight' ? (
                    <Pressable style={s.sheetCloseBtn} onPress={onOpenDocuments}>
                      <Text style={s.sheetCloseBtnText}>{isTr ? 'Belgeleri Gör' : 'View Documents'}</Text>
                    </Pressable>
                  ) : null}
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
    backgroundColor: '#0b1c25',
  },
  pageBgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Header
  headerRow: {
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(196,222,234,0.84)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#eef7fb',
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
  goalWrap: {
    marginTop: 8,
    gap: 4,
    width: '100%',
  },
  goalTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  goalFill: {
    height: 3,
    borderRadius: 2,
  },
  goalText: {
    fontSize: 9,
    color: C.onSurfaceVariant,
    fontWeight: '600',
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
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  sectionHeaderRowSpaced: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: 'rgba(196,222,234,0.84)',
    textTransform: 'uppercase',
  },
  sectionLabelAreas: {
    color: 'rgba(132,204,220,0.92)',
  },
  sectionLabelDocs: {
    color: 'rgba(173,190,204,0.92)',
  },
  sectionLabelMeds: {
    color: 'rgba(139,210,196,0.92)',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(189,216,227,0.24)',
  },
  sectionHeaderLineAreas: {
    backgroundColor: 'rgba(132,204,220,0.28)',
  },
  sectionHeaderLineDocs: {
    backgroundColor: 'rgba(173,190,204,0.26)',
  },
  sectionHeaderLineMeds: {
    backgroundColor: 'rgba(139,210,196,0.28)',
  },
  timelineCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.outlineVariant,
  },

  // Category cards
  categoryList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#0b1b24',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  categoryCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  categoryCardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.95,
  },
  categoryCardDividerSoft: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(8,24,34,0.45)',
  },
  swipeRowWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeActionsRail: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_ACTION_WIDTH,
    backgroundColor: '#102a38',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 0,
    gap: 10,
  },
  swipeDetailsBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDetailsText: {
    color: '#e7f7ff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  swipePlusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.surfaceContainer,
  },
  vaccineCategoryCard: {
    backgroundColor: '#0d4644',
  },
  vaccineCategoryCardDivider: {
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  rowGradientFill: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  vaccineCategoryIconBox: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  categoryCardBody: {
    flex: 1,
    gap: 4,
  },
  categoryCardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  vaccineCategoryTitle: {
    color: '#ecfffb',
  },
  categoryCardSub: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onSurfaceVariant,
    lineHeight: 17,
  },
  vaccineCategorySub: {
    color: 'rgba(236,255,251,0.84)',
  },
  vaultPreviewText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurface,
    fontWeight: '600',
  },
  categoryCardRight: {
    alignItems: 'flex-end',
    gap: 5,
    minWidth: 82,
  },
  countBadge: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  vaccineCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  vaccineCountBadgeText: {
    color: '#ecfffb',
  },
  categoryStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    maxWidth: 84,
    textAlign: 'right',
  },
  vaccineCategoryStatusText: {
    color: 'rgba(236,255,251,0.84)',
  },
  vaultCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primaryDim,
  },

  // Medication cards
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  medIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3eaf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medBody: {
    flex: 1,
    gap: 2,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurface,
  },
  medSub: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  medPausedPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fdf4e3',
    borderWidth: 1,
    borderColor: 'rgba(180,130,0,0.2)',
  },
  medPausedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8a6800',
  },
  medActions: {
    flexDirection: 'row',
    gap: 6,
  },
  medCompleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#e9ffe6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(58,110,69,0.15)',
  },
  medDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fdf0ef',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.15)',
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


