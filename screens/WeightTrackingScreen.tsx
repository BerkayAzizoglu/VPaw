import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../hooks/useLocale';
import { useAppSettings } from '../hooks/useAppSettings';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import type { WeightPoint } from '../lib/healthMvpModel';
import type { WeightUnit } from '../hooks/useAppSettings';
import StickyBlurTopBar, { getStickyHeaderContentTop } from '../components/StickyBlurTopBar';

export type { WeightPoint };

type WeightTrackingScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  previewMode?: boolean;
  onOpenHealthRecords?: () => void;
  onOpenVetVisits?: () => void;
  petName: string;
  petType?: 'Dog' | 'Cat';
  petBreed?: string;
  microchip?: string;
  entries?: WeightPoint[];
  onAddEntry: (value: number, options?: { date?: string; note?: string }) => void;
  onUpdateEntry?: (entryIndex: number, value: number, options?: { date?: string; note?: string }) => void;
  onDeleteEntry?: (entryIndex: number) => void;
  weightGoal?: number;
  onSetWeightGoal?: (goal: number) => void;
  totalExpenses?: { total: number; currency: string };
  initialShowAdd?: boolean;
  /** True if user has an active premium subscription */
  isPremium?: boolean;
  /** Called when user taps the upgrade CTA inside the premium gate */
  onUpgrade?: () => void;
};

type WeightReference = {
  min: number;
  max: number;
  note: string;
};

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_HEIGHT = 204;
const CHART_INSET = 12;
const PREMIUM_LOCKED_RANGES: ChartRange[] = ['all', '1y', '6m'];
const PW_ROW_HEIGHT = 34;
const PW_WHEEL_HEIGHT = 136;
const PW_ROW_PADDING = (PW_WHEEL_HEIGHT - PW_ROW_HEIGHT) / 2;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const WEIGHT_CARD_BG = '#47664a';
const WEIGHT_HEADER_OVERLAY: [string, string, string, string] = [
  'rgba(63,93,71,0.56)',
  'rgba(63,93,71,0.38)',
  'rgba(63,93,71,0.18)',
  'rgba(63,93,71,0)',
];
const weightHeaderLogo = require('../assets/illustrations/weight-logo.png');

// ─── Unit conversion ─────────────────────────────────────────────────────────

const KG_TO_LB = 2.20462;
function toDisplayVal(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}
function toKgFromUnit(displayVal: number, unit: WeightUnit): number {
  return unit === 'lb' ? displayVal / KG_TO_LB : displayVal;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getWeightReference(
  petType: 'Dog' | 'Cat' | undefined,
  breedRaw: string | undefined,
  refs: ReturnType<typeof getWording>['weightTracking']['refs'],
): WeightReference {
  const breed = (breedRaw ?? '').toLowerCase();

  if (petType === 'Cat') {
    if (breed.includes('british shorthair')) return { min: 3.2, max: 7.7, note: refs.catBritish };
    if (breed.includes('maine coon')) return { min: 4.5, max: 8.2, note: refs.catMaine };
    if (breed.includes('ragdoll')) return { min: 3.6, max: 9, note: refs.catRagdoll };
    if (breed.includes('siamese')) return { min: 2.5, max: 5.5, note: refs.catSiamese };
    return { min: 3, max: 6, note: refs.catDefault };
  }

  if (petType === 'Dog') {
    if (breed.includes('golden retriever')) return { min: 25, max: 34, note: refs.dogGolden };
    if (breed.includes('labrador')) return { min: 25, max: 36, note: refs.dogLabrador };
    if (breed.includes('german shepherd')) return { min: 22, max: 40, note: refs.dogGerman };
    if (breed.includes('kangal')) return { min: 40, max: 65, note: refs.dogKangal };
    if (breed.includes('terrier')) return { min: 6, max: 12, note: refs.dogTerrier };
    return { min: 10, max: 30, note: refs.dogDefault };
  }

  return { min: 3, max: 12, note: refs.default };
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`;
  }
  return path;
}

function computePolylineLength(points: Array<{ x: number; y: number }>) {
  let len = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.max(len, 1);
}

function parseEntryDate(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type DateParts = { day: number; month: number; year: number };
type DragGesture = { dx: number; dy: number; vy: number };

function toDateParts(date: Date): DateParts {
  return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function clampDateParts(parts: DateParts, today: DateParts): DateParts {
  const year = Math.max(today.year - 20, Math.min(today.year, parts.year));
  const month = Math.max(1, Math.min(12, parts.month));
  const dim = daysInMonth(year, month);
  const day = Math.max(1, Math.min(dim, parts.day));
  return { day, month, year };
}

function dateFromParts(parts: DateParts) {
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function toTenths(displayWeight: number) {
  return Math.max(0, Math.round(displayWeight * 10));
}

function toWeightDisplay(tenths: number) {
  return (tenths / 10).toFixed(1);
}

function toDatePartsFromStored(raw: string) {
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return { year: Number(ymd[1]), month: Number(ymd[2]), day: Number(ymd[3]) };
  }
  const parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime())) return toDateParts(parsed);
  return toDateParts(new Date());
}

function formatPickerDateLabel(date: Date, isTr: boolean) {
  return date.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWeightDateLabel(raw: string | undefined, isTr: boolean) {
  if (!raw) return isTr ? 'Tarih yok' : 'No date';
  const parsed = parseEntryDate(raw);
  if (!parsed || !Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTemplate(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');
}

// ─── Icon component ───────────────────────────────────────────────────────────

function Icon({ kind, size = 20, color = '#787878' }: { kind: 'back' | 'plus' | 'up' | 'check' | 'left' | 'right' | 'calendar' | 'spark' | 'trendline' | 'close'; size?: number; color?: string }) {
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
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

  if (kind === 'close') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 7L17 17M17 7L7 17" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'up') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 17V7M12 7L8.5 10.5M12 7L15.5 10.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'left') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M15.5 12H8.5M8.5 12L11.5 9M8.5 12L11.5 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'right') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M8.5 12H15.5M15.5 12L12.5 9M15.5 12L12.5 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'spark') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 4L13.3 8L17.5 9.3L13.3 10.6L12 14.6L10.7 10.6L6.5 9.3L10.7 8L12 4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'calendar') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.2 5.8V8M16.8 5.8V8M5.8 9H18.2M7 19H17C18.1 19 19 18.1 19 17V8C19 6.9 18.1 6 17 6H7C5.9 6 5 6.9 5 8V17C5 18.1 5.9 19 7 19Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'trendline') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4.5 17.5L9.4 12.6L12.3 15.2L19.5 8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15.7 8H19.5V11.7" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 12.2L10.2 15.6L17.5 8.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type PickerWheelItem = {
  value: string;
  label: string;
};

type ChartRange = 'all' | '1y' | '6m' | '3m' | '1m' | '1w';

function PickerWheelColumn({
  items,
  selectedValue,
  onValueChange,
  width,
}: {
  items: PickerWheelItem[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  width: number;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const selectedIndex = Math.max(0, items.findIndex((item) => item.value === selectedValue));

  useEffect(() => {
    if (!items.length) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * PW_ROW_HEIGHT, animated: false });
    });
  }, [items, selectedIndex]);

  return (
    <View style={[styles.column, { width }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        snapToInterval={PW_ROW_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={styles.columnContent}
        onMomentumScrollEnd={(event) => {
          const index = Math.max(0, Math.min(Math.round(event.nativeEvent.contentOffset.y / PW_ROW_HEIGHT), items.length - 1));
          const next = items[index];
          if (next && next.value !== selectedValue) onValueChange(next.value);
        }}
      >
        {items.map((item) => {
          const active = item.value === selectedValue;
          return (
            <Pressable
              key={item.value}
              onPress={() => onValueChange(item.value)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed, active && styles.rowActive]}
            >
              <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={styles.selectionBand} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeightTrackingScreen({
  onBack,
  backPreview,
  previewMode = false,
  onOpenHealthRecords,
  onOpenVetVisits,
  petName,
  petType,
  petBreed,
  microchip: _microchip,
  entries = [],
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  weightGoal,
  onSetWeightGoal,
  totalExpenses: _totalExpenses,
  initialShowAdd,
  isPremium = false,
  onUpgrade,
}: WeightTrackingScreenProps) {
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const copy = getWording(locale).weightTracking;
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const weightUnit = settings.weightUnit;
  const scrollY = useRef(new Animated.Value(0)).current;
  const topInset = Math.max(insets.top, 14);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(Math.max(entries.length - 1, 0));
  const [chartRange, setChartRange] = useState<ChartRange>('all');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  useEffect(() => {
    if (initialShowAdd) openAddSheet('add', latestWeight?.value ?? 1, new Date(), '', null);
  }, []);
  const [entryFormMode, setEntryFormMode] = useState<'add' | 'edit'>('add');
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);
  const [weightTenths, setWeightTenths] = useState(0);
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [entryDateParts, setEntryDateParts] = useState<DateParts>(toDateParts(new Date()));
  const [entryNote, setEntryNote] = useState('');
  const [focusedField, setFocusedField] = useState<'note' | 'goal' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);
  const [showPremiumBanner, setShowPremiumBanner] = useState(false);

  const lineAnim = useRef(new Animated.Value(0)).current;
  const savePressScale = useRef(new Animated.Value(1)).current;
  const addSheetTranslateY = useRef(new Animated.Value(680)).current;
  const addSheetBackdropOpacity = useRef(new Animated.Value(0)).current;
  const addSheetHeightRef = useRef(680);
  const goalSheetTranslateY = useRef(new Animated.Value(420)).current;
  const goalSheetBackdropOpacity = useRef(new Animated.Value(0)).current;
  const goalSheetHeightRef = useRef(420);
  const { width } = useWindowDimensions();
  // 20px paddingH * 2 = 40, chartCard paddingH 12 * 2 = 24, yAxis 36 + gap 4 = 40, total ~104
  const chartWidth = Math.max(200, width - 104);
  const chartHeight = CHART_HEIGHT;

  const edgeSwipeResponder = useEdgeSwipeBack({
    onBack,
    enabled: !previewMode && !isScrubbing && !focusedField && !showAdd && !showAddDatePicker && !showGoalModal,
  });

  // ─── Derived / memoized ─────────────────────────────────────────────────────
  const reference = useMemo(() => getWeightReference(petType, petBreed, copy.refs), [petType, petBreed, copy.refs]);
  const allEntriesSorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const da = parseEntryDate(a.date);
      const db = parseEntryDate(b.date);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
  }, [entries]);

  const chartEntries = useMemo(() => {
    if (allEntriesSorted.length === 0) return [];
    if (chartRange === 'all') return allEntriesSorted;

    const latestDate = parseEntryDate(allEntriesSorted[allEntriesSorted.length - 1]?.date);
    if (!latestDate) return allEntriesSorted;

    const from = new Date(latestDate);
    if (chartRange === '1y') from.setFullYear(from.getFullYear() - 1);
    if (chartRange === '6m') from.setMonth(from.getMonth() - 6);
    if (chartRange === '3m') from.setMonth(from.getMonth() - 3);
    if (chartRange === '1m') from.setMonth(from.getMonth() - 1);
    if (chartRange === '1w') from.setDate(from.getDate() - 7);

    const filtered = allEntriesSorted.filter((entry) => {
      const d = parseEntryDate(entry.date);
      return d ? d.getTime() >= from.getTime() : true;
    });
    return filtered.length > 0 ? filtered : [allEntriesSorted[allEntriesSorted.length - 1]];
  }, [allEntriesSorted, chartRange]);

  useEffect(() => {
    setSelectedIndex(Math.max(chartEntries.length - 1, 0));
  }, [chartEntries.length, chartRange]);

  const hasEntries = allEntriesSorted.length > 0;
  const safeChartEntries = hasEntries
    ? chartEntries
    : [{ label: isTr ? 'No records' : 'No records', value: reference.min, date: '', change: '' }];

  const yBounds = useMemo(() => {
    const values = safeChartEntries.map((e) => e.value);
    values.push(reference.min, reference.max);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(0.8, max - min);
    const pad = span * 0.14;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [safeChartEntries, reference.max, reference.min]);

  const toY = (value: number) => {
    const usableHeight = chartHeight - CHART_INSET * 2;
    const normalized = (value - yBounds.min) / Math.max(0.1, yBounds.max - yBounds.min);
    return chartHeight - CHART_INSET - Math.max(0, Math.min(1, normalized)) * usableHeight;
  };

  const chart = useMemo(() => {
    const usableWidth = chartWidth - CHART_INSET * 2;
    const xStep = safeChartEntries.length > 1 ? usableWidth / (safeChartEntries.length - 1) : 0;
    const points = safeChartEntries.map((p, idx) => ({
      x: CHART_INSET + idx * xStep,
      y: toY(p.value),
    }));

    const linePath = buildSmoothPath(points);
    const baseY = chartHeight - CHART_INSET;
    const areaPath = `${linePath} L ${chartWidth - CHART_INSET} ${baseY} L ${CHART_INSET} ${baseY} Z`;
    const selected = points[Math.min(selectedIndex, points.length - 1)] ?? points[0];
    const lineLength = computePolylineLength(points);

    return { points, linePath, areaPath, selected, lineLength };
  }, [chartHeight, chartWidth, safeChartEntries, selectedIndex, yBounds.max, yBounds.min]);

  useEffect(() => {
    if (previewMode) {
      lineAnim.setValue(1);
      return;
    }
    lineAnim.setValue(0);
    Animated.timing(lineAnim, {
      toValue: 1,
      duration: 620,
      useNativeDriver: false,
    }).start();
  }, [previewMode, safeChartEntries.length, lineAnim]);

  const lineDashOffset = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [chart.lineLength, 0],
  });

  const updateSelectionFromX = (locationX: number) => {
    if (safeChartEntries.length <= 1) {
      setSelectedIndex(0);
      setScrubX(CHART_INSET);
      return;
    }

    const clampedX = Math.max(CHART_INSET, Math.min(chartWidth - CHART_INSET, locationX));
    setScrubX(clampedX);

    const ratio = (clampedX - CHART_INSET) / (chartWidth - CHART_INSET * 2);
    const idx = Math.round(ratio * (safeChartEntries.length - 1));
    setSelectedIndex(idx);
  };

  const interpolatedSample = useMemo(() => {
    if (!isScrubbing || scrubX == null || safeChartEntries.length === 0) return null;
    if (safeChartEntries.length === 1) return { value: safeChartEntries[0].value, date: safeChartEntries[0].date, x: scrubX };

    const ratio = Math.max(0, Math.min(1, (scrubX - CHART_INSET) / (chartWidth - CHART_INSET * 2)));
    const segment = ratio * (safeChartEntries.length - 1);
    const left = Math.floor(segment);
    const right = Math.min(safeChartEntries.length - 1, left + 1);
    const t = segment - left;

    const leftEntry = safeChartEntries[left];
    const rightEntry = safeChartEntries[right];
    const value = leftEntry.value + (rightEntry.value - leftEntry.value) * t;

    const leftDate = parseEntryDate(leftEntry.date);
    const rightDate = parseEntryDate(rightEntry.date);
    let date = leftEntry.date;
    if (leftDate && rightDate) {
      const ms = leftDate.getTime() + (rightDate.getTime() - leftDate.getTime()) * t;
      date = new Date(ms).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return { value, date, x: scrubX };
  }, [safeChartEntries, isScrubbing, scrubX, chartWidth, isTr]);

  const selectedWeight = safeChartEntries[Math.min(selectedIndex, Math.max(safeChartEntries.length - 1, 0))];
  const displayedValue = interpolatedSample?.value ?? selectedWeight?.value ?? 0;
  const displayedDate = hasEntries
    ? formatWeightDateLabel(interpolatedSample?.date ?? selectedWeight?.date, isTr)
    : (isTr ? 'Kayit yok' : 'No records yet');

  const displayedY = toY(displayedValue);
  const displayedX = interpolatedSample?.x ?? chart.selected.x;
  const refMinY = toY(reference.min);
  const refMaxY = toY(reference.max);
  const refBandY = Math.min(refMinY, refMaxY);
  const refBandH = Math.abs(refMaxY - refMinY);

  const latestWeight = hasEntries ? allEntriesSorted[allEntriesSorted.length - 1] : null;
  const deltaFromCurrent = latestWeight ? displayedValue - latestWeight.value : 0;

  const chartEdgeLabels = useMemo(() => {
    if (!hasEntries || safeChartEntries.length === 0) return null;
    const start = safeChartEntries[0]?.label ?? '';
    const mid = safeChartEntries[Math.floor((safeChartEntries.length - 1) / 2)]?.label ?? '';
    const end = safeChartEntries[safeChartEntries.length - 1]?.label ?? '';
    return { start, mid, end };
  }, [hasEntries, safeChartEntries]);

  const rangeStatus = displayedValue < reference.min ? 'below' : displayedValue > reference.max ? 'above' : 'within';
  const comparisonText = Math.abs(deltaFromCurrent) < 0.01
    ? copy.current
    : `${deltaFromCurrent > 0 ? '+' : ''}${toDisplayVal(deltaFromCurrent, weightUnit).toFixed(1)} ${weightUnit} ${copy.currentSuffix}`;

  const rangeText = `${toDisplayVal(reference.min, weightUnit).toFixed(1)} - ${toDisplayVal(reference.max, weightUnit).toFixed(1)} ${weightUnit}`;
  const targetName = petBreed ?? petType ?? copy.petFallback;

  const primaryInsightTitle = rangeStatus === 'within'
    ? copy.withinHealthyRange
    : rangeStatus === 'below'
      ? copy.belowHealthyRange
      : copy.aboveHealthyRange;

  const primaryInsightText = rangeStatus === 'within'
    ? formatTemplate(copy.trendInRange, { name: petName, target: targetName })
    : rangeStatus === 'below'
      ? formatTemplate(copy.trendBelow, { name: petName, target: targetName })
      : formatTemplate(copy.trendAbove, { name: petName, target: targetName });
  const resolvedPrimaryInsightTitle = hasEntries ? primaryInsightTitle : (isTr ? 'Kayit bekleniyor' : 'Waiting for data');
  const resolvedPrimaryInsightText = hasEntries
    ? primaryInsightText
    : (isTr
      ? 'Ilk olcumden sonra saglik araligi ve kilo yorumu burada daha anlamli gorunur.'
      : 'After the first entry, healthy-range and weight commentary will appear here.');

  // ─── Trend insight (real data-driven) ──────────────────────────────────────
  const trendInsight = useMemo(() => {
    if (entries.length < 2) {
      return {
        title: isTr ? 'Veri Toplanıyor' : 'Building Your Data',
        body: isTr
          ? `${petName} için daha fazla kilo kaydı ekledikçe haftalık trend analizi burada görünecek.`
          : `Add more weight entries for ${petName} to see weekly trend analysis here.`,
        kind: 'neutral' as const,
      };
    }

    const sorted = [...entries].sort((a, b) => {
      const da = parseEntryDate(a.date);
      const db = parseEntryDate(b.date);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

    const newest = sorted[sorted.length - 1];
    const newestDate = parseEntryDate(newest.date);

    // Find a comparison entry ~30 days back (or oldest available)
    let compEntry = sorted[0];
    if (newestDate) {
      const thirtyDaysAgo = newestDate.getTime() - 30 * 24 * 60 * 60 * 1000;
      const candidates = sorted.filter((e) => {
        const d = parseEntryDate(e.date);
        return d && d.getTime() <= thirtyDaysAgo;
      });
      if (candidates.length > 0) compEntry = candidates[candidates.length - 1];
    }

    const compDate = parseEntryDate(compEntry.date);
    const deltaKg = newest.value - compEntry.value;
    const daysDiff = newestDate && compDate
      ? Math.max(1, (newestDate.getTime() - compDate.getTime()) / (24 * 60 * 60 * 1000))
      : 30;
    const weeklyRate = (deltaKg / daysDiff) * 7;
    const absWeekly = Math.abs(weeklyRate);
    const direction = deltaKg > 0.05 ? 'up' : deltaKg < -0.05 ? 'down' : 'stable';
    const days = Math.round(daysDiff);
    const rateStr = absWeekly < 0.1
      ? isTr ? `< 0.1 ${weightUnit}/hafta` : `< 0.1 ${weightUnit}/week`
      : `${toDisplayVal(absWeekly, weightUnit).toFixed(1)} ${weightUnit}/${isTr ? 'hafta' : 'week'}`;

    if (direction === 'stable') {
      return {
        title: isTr ? 'Stabil Kilo' : 'Stable Weight',
        body: isTr
          ? `${petName}'in kilosu son ${days} günde sabit kaldı. Tutarlı bir seyir izliyor.`
          : `${petName}'s weight has been stable over the last ${days} days. Consistent trend.`,
        kind: rangeStatus === 'within' ? 'positive' as const : 'neutral' as const,
      };
    }

    if (direction === 'down') {
      if (rangeStatus === 'above') {
        return {
          title: isTr ? 'Olumlu İlerleme' : 'Positive Progress',
          body: isTr
            ? `${petName} sağlıklı aralığa doğru ilerliyor — ${rateStr} hızında azalma.`
            : `${petName} is trending toward the healthy range at ${rateStr}.`,
          kind: 'positive' as const,
        };
      }
      if (rangeStatus === 'below') {
        return {
          title: isTr ? 'Dikkat: Kilo Kaybı' : 'Attention: Weight Loss',
          body: isTr
            ? `${petName} zaten sağlıklı aralığın altında ve kilo kaybı devam ediyor (${rateStr}). Veterinere danışın.`
            : `${petName} is already below range and losing weight (${rateStr}). Consult your vet.`,
          kind: 'warning' as const,
        };
      }
      return {
        title: isTr ? 'Kilo Azalıyor' : 'Weight Decreasing',
        body: isTr
          ? `${petName}'in kilosu ${rateStr} hızında azalıyor; sağlıklı aralık içinde seyrediyor.`
          : `${petName}'s weight is decreasing at ${rateStr}, still within the healthy range.`,
        kind: 'neutral' as const,
      };
    }

    // direction === 'up'
    if (rangeStatus === 'below') {
      return {
        title: isTr ? 'İyileşiyor' : 'Recovering Well',
        body: isTr
          ? `${petName} sağlıklı aralığa doğru kilo alıyor — ${rateStr} hızında artış.`
          : `${petName} is gaining toward the healthy range at ${rateStr}.`,
        kind: 'positive' as const,
      };
    }
    if (rangeStatus === 'above') {
      return {
        title: isTr ? 'Kilo Artışı Sürüyor' : 'Weight Still Rising',
        body: isTr
          ? `${petName} sağlıklı aralığın üzerinde ve kilo artışı devam ediyor (${rateStr}). Porsiyon kontrolü önerilir.`
          : `${petName} is above the healthy range and still gaining (${rateStr}). Consider portion control.`,
        kind: 'warning' as const,
      };
    }
    return {
      title: isTr ? 'Kilo Artıyor' : 'Weight Increasing',
      body: isTr
        ? `${petName}'in kilosu ${rateStr} hızında artıyor; sağlıklı aralık içinde takip ediliyor.`
        : `${petName}'s weight is increasing at ${rateStr}, tracking within the healthy range.`,
      kind: 'neutral' as const,
    };
  }, [entries, isTr, petName, rangeStatus]);

  // ─── Recency insight (last measurement timing) ─────────────────────────────
  const recencyInsight = useMemo(() => {
    if (entries.length === 0) return null;

    const sorted = [...entries].sort((a, b) => {
      const da = parseEntryDate(a.date);
      const db = parseEntryDate(b.date);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

    const lastEntry = sorted[sorted.length - 1];
    const lastDate = parseEntryDate(lastEntry.date);
    if (!lastDate) return null;

    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

    if (daysSince <= 7) {
      return {
        title: isTr ? 'Düzenli Takip' : 'Tracking Regularly',
        body: isTr
          ? `Son kayıt ${daysSince === 0 ? 'bugün' : `${daysSince} gün önce`}. Harika gidiyor!`
          : `Last entry ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`}. Great consistency!`,
        kind: 'positive' as const,
      };
    }
    if (daysSince <= 21) {
      return {
        title: isTr ? 'Düzenli Takip Önerilir' : 'Regular Tracking Suggested',
        body: isTr
          ? `Son kayıt ${daysSince} gün önce. Haftada bir ölçüm ideal takip sağlar.`
          : `Last entry was ${daysSince} days ago. Weekly measurements provide the best trend data.`,
        kind: 'neutral' as const,
      };
    }
    return {
      title: isTr ? 'Ölçüm Zamanı' : 'Time to Measure',
      body: isTr
        ? `Son kayıt ${daysSince} gün önce. Düzenli ölçüm sağlık trendlerini daha net ortaya koyar.`
        : `It's been ${daysSince} days since the last entry. Regular measurements help spot health trends early.`,
      kind: 'warning' as const,
    };
  }, [entries, isTr, weightUnit]);

  const toneLabel = React.useCallback((tone: 'good' | 'warn' | 'neutral') => {
    if (tone === 'good') return isTr ? 'İyi' : 'Good';
    if (tone === 'warn') return isTr ? 'Dikkat' : 'Watch';
    return isTr ? 'Nötr' : 'Neutral';
  }, [isTr]);

  const toneStyles = React.useCallback((tone: 'good' | 'warn' | 'neutral') => {
    if (tone === 'good') {
      return {
        pill: styles.insightToneGood,
        pillText: styles.insightToneGoodText,
      };
    }
    if (tone === 'warn') {
      return {
        pill: styles.insightToneWarn,
        pillText: styles.insightToneWarnText,
      };
    }
    return {
      pill: styles.insightToneNeutral,
      pillText: styles.insightToneNeutralText,
    };
  }, []);

  // ─── Goal progress ──────────────────────────────────────────────────────────
  const closeAddSheet = (onClosed?: () => void) => {
    Animated.parallel([
      Animated.spring(addSheetTranslateY, {
        toValue: addSheetHeightRef.current,
        damping: 28,
        stiffness: 380,
        useNativeDriver: true,
      }),
      Animated.timing(addSheetBackdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAdd(false);
      setEntryFormMode('add');
      setEditingEntryIndex(null);
      setWeightTenths(0);
      setShowAddDatePicker(false);
      setEntryDateParts(toDateParts(new Date()));
      setEntryNote('');
      setFormError(null);
      onClosed?.();
    });
  };

  const openAddSheet = (mode: 'add' | 'edit', nextWeight: number, nextDate: Date, nextNote: string, entryIndex: number | null) => {
    const displayWeight = toDisplayVal(nextWeight, weightUnit);
    const safeDate = clampDateParts(toDateParts(nextDate), toDateParts(new Date()));

    setEntryFormMode(mode);
    setEditingEntryIndex(entryIndex);
    setWeightTenths(toTenths(displayWeight));
    setShowAddDatePicker(false);
    setEntryDateParts(safeDate);
    setEntryNote(nextNote);
    setFormError(null);
    setShowAdd(true);

    addSheetTranslateY.setValue(addSheetHeightRef.current);
    addSheetBackdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(addSheetTranslateY, {
        toValue: 0,
        damping: 26,
        stiffness: 360,
        mass: 0.85,
        useNativeDriver: true,
      }),
      Animated.timing(addSheetBackdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const addSheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g: DragGesture) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g: DragGesture) => g.dy > 2 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g: DragGesture) => {
        if (g.dy > 0) {
          addSheetTranslateY.setValue(g.dy);
          addSheetBackdropOpacity.setValue(Math.max(0, 1 - g.dy / Math.max(addSheetHeightRef.current, 1)));
          return;
        }
        addSheetTranslateY.setValue(g.dy * 0.12);
      },
      onPanResponderRelease: (_, g: DragGesture) => {
        if (g.dy > 68 || g.vy > 0.5) {
          closeAddSheet();
          return;
        }
        Animated.parallel([
          Animated.spring(addSheetTranslateY, {
            toValue: 0,
            damping: 24,
            stiffness: 300,
            mass: 0.85,
            useNativeDriver: true,
          }),
          Animated.timing(addSheetBackdropOpacity, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  const currentWeightForGoal = latestWeight?.value ?? 0;
  const goalProgress = weightGoal && weightGoal > 0
    ? Math.min(1, Math.max(0, currentWeightForGoal / weightGoal))
    : null;

  const closeGoalSheet = React.useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.spring(goalSheetTranslateY, {
        toValue: goalSheetHeightRef.current,
        damping: 28,
        stiffness: 380,
        useNativeDriver: true,
      }),
      Animated.timing(goalSheetBackdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowGoalModal(false);
      cb?.();
    });
  }, [goalSheetBackdropOpacity, goalSheetTranslateY]);

  useEffect(() => {
    if (!showGoalModal) return;
    goalSheetTranslateY.setValue(goalSheetHeightRef.current);
    goalSheetBackdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(goalSheetTranslateY, {
        toValue: 0,
        damping: 24,
        stiffness: 300,
        mass: 0.86,
        useNativeDriver: true,
      }),
      Animated.timing(goalSheetBackdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [goalSheetBackdropOpacity, goalSheetHeightRef, goalSheetTranslateY, showGoalModal]);

  const goalSheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g: DragGesture) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g: DragGesture) => g.dy > 2 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g: DragGesture) => {
        if (g.dy > 0) {
          goalSheetTranslateY.setValue(g.dy);
          goalSheetBackdropOpacity.setValue(Math.max(0, 1 - g.dy / Math.max(goalSheetHeightRef.current, 1)));
        }
      },
      onPanResponderRelease: (_, g: DragGesture) => {
        if (g.dy > 80 || g.vy > 0.6) {
          closeGoalSheet();
          return;
        }
        Animated.parallel([
          Animated.spring(goalSheetTranslateY, {
            toValue: 0,
            damping: 24,
            stiffness: 300,
            useNativeDriver: true,
          }),
          Animated.timing(goalSheetBackdropOpacity, {
            toValue: 1,
            duration: 130,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  const addPickerToday = toDateParts(new Date());
  const addWeightItems = useMemo(() => Array.from({ length: 2001 }, (_, index) => ({
    value: String(index),
    label: (index / 10).toFixed(1),
  })), []);

  // ─── Save entry ─────────────────────────────────────────────────────────────
  const saveEntry = () => {
    const parsed = weightTenths / 10;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError(copy.enterValidWeight);
      return;
    }
    const parsedDate = dateFromParts(entryDateParts);
    if (!Number.isFinite(parsedDate.getTime())) {
      setFormError(isTr ? 'Lütfen geçerli bir tarih seçin.' : 'Please choose a valid date.');
      return;
    }
    const todayEnd = endOfDay(new Date());
    if (parsedDate.getTime() > todayEnd.getTime()) {
      setFormError(isTr ? 'Gelecekteki bir tarih seçemezsiniz.' : 'Future dates are not allowed.');
      return;
    }

    if (entryFormMode === 'edit' && editingEntryIndex !== null) {
      onUpdateEntry?.(editingEntryIndex, toKgFromUnit(parsed, weightUnit), {
        date: parsedDate.toISOString(),
        note: entryNote.trim() || undefined,
      });
    } else {
      onAddEntry(toKgFromUnit(parsed, weightUnit), {
        date: parsedDate.toISOString(),
        note: entryNote.trim() || undefined,
      });
    }
    setWeightTenths(0);
    setShowAddDatePicker(false);
    setEntryDateParts(toDateParts(new Date()));
    setEntryNote('');
    setFormError(null);
    closeAddSheet();
  };

  const deleteEntry = () => {
    if (entryFormMode !== 'edit' || editingEntryIndex == null || !onDeleteEntry) return;
    Alert.alert(
      isTr ? 'Kaydı Sil' : 'Delete Entry',
      isTr ? 'Bu kilo kaydı kalıcı olarak silinecek. Emin misiniz?' : 'This weight entry will be removed permanently. Are you sure?',
      [
        { text: isTr ? 'Vazgeç' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteEntry(editingEntryIndex);
            closeAddSheet();
          },
        },
      ],
      { cancelable: true },
    );
  };

  // ─── Save goal ──────────────────────────────────────────────────────────────
  const saveGoal = () => {
    const parsed = Number(goalInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setGoalError(isTr ? 'Geçerli bir hedef kilo girin.' : 'Please enter a valid goal weight.');
      return;
    }
    if (onSetWeightGoal) {
      onSetWeightGoal(toKgFromUnit(parsed, weightUnit));
    }
    setGoalInput('');
    setGoalError(null);
    closeGoalSheet();
  };

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, edgeSwipeResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.frontLayer, edgeSwipeResponder.frontLayerStyle]} {...edgeSwipeResponder.panHandlers}>
        <StatusBar style="dark" />
        <Animated.ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: getStickyHeaderContentTop(topInset),
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!previewMode && !isScrubbing}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={24}
          directionalLockEnabled
        >
          {/* ── Current weight card ─────────────────────────────────────────── */}
          <View style={styles.currentCard}>
            <Text style={styles.currentCardLabel}>
              {isTr ? 'GÜNCEL KİLO' : 'CURRENT WEIGHT'}
            </Text>

            {hasEntries ? (
              <View style={styles.currentValueRow}>
                <Text style={styles.currentValue}>
                  {toDisplayVal(displayedValue, weightUnit).toFixed(1)}{' '}
                  <Text style={styles.currentUnit}>{weightUnit}</Text>
                </Text>
                <View style={styles.changePill}>
                  <Icon kind="spark" size={10} color="#47664a" />
                  <Text style={styles.changePillText}>{comparisonText}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCurrentState}>
                <Text style={styles.emptyCurrentTitle}>{isTr ? 'Kayit yok' : 'No records yet'}</Text>
                <Text style={styles.emptyCurrentText}>
                  {isTr ? 'Ilk kaydi ekleyin, grafik ve trendler hazir olsun.' : 'Add your first entry to unlock charts and trends.'}
                </Text>
                <Pressable
                  style={styles.historyAddBtn}
                  onPress={() => openAddSheet('add', latestWeight?.value ?? 1, new Date(), '', null)}
                >
                  <Text style={styles.historyAddBtnText}>{isTr ? 'Kilo Ekle' : 'Add Weight'}</Text>
                </Pressable>
              </View>
            )}

            <Text style={styles.currentSub}>{displayedDate}</Text>

            {/* ── Goal section ── */}
            {weightGoal != null && goalProgress != null ? (
              /* Goal set — show progress */
              <Pressable
                style={styles.goalSection}
                onPress={() => {
                  setGoalInput(toDisplayVal(weightGoal, weightUnit).toFixed(1));
                  setGoalError(null);
                  setShowGoalModal(true);
                }}
              >
                <View style={styles.goalSectionTop}>
                  <View style={styles.goalSectionLeft}>
                    <Text style={styles.goalSectionLabel}>{isTr ? 'HEDEF KİLO' : 'WEIGHT GOAL'}</Text>
                    <Text style={styles.goalSectionValue}>{toDisplayVal(weightGoal, weightUnit).toFixed(1)} <Text style={styles.goalSectionUnit}>{weightUnit}</Text></Text>
                  </View>
                  <View style={styles.goalSectionRight}>
                    <Text style={styles.goalDiffLabel}>{isTr ? 'Fark' : 'Gap'}</Text>
                    <Text style={[
                      styles.goalDiffValue,
                      { color: currentWeightForGoal <= weightGoal ? '#47664a' : '#c96a6a' },
                    ]}>
                      {currentWeightForGoal <= weightGoal ? '' : '+'}{toDisplayVal(currentWeightForGoal - weightGoal, weightUnit).toFixed(1)} {weightUnit}
                    </Text>
                  </View>
                </View>
                <View style={styles.goalBarTrack}>
                  <View style={[styles.goalBarFill, { width: `${Math.round(goalProgress * 100)}%` as any }]} />
                </View>
                <Text style={styles.goalEditHint}>{isTr ? 'Hedefi düzenle →' : 'Edit goal →'}</Text>
              </Pressable>
            ) : (
              /* No goal — show SET GOAL card */
              <Pressable
                style={styles.setGoalCard}
                onPress={() => {
                  setGoalInput('');
                  setGoalError(null);
                  setShowGoalModal(true);
                }}
              >
                <View style={styles.setGoalLeft}>
                  <Icon kind="up" size={16} color="#47664a" />
                  <Text style={styles.setGoalTitle}>{isTr ? 'Hedef Kilo Belirle' : 'Set Weight Goal'}</Text>
                </View>
                <Text style={styles.setGoalArrow}>→</Text>
              </Pressable>
            )}

            <Text style={styles.referenceLine}>
              {copy.healthyReferencePrefix} ({petBreed ?? petType ?? 'Pet'}): {rangeText}
            </Text>
            {hasEntries ? <Text style={styles.referenceNote}>{reference.note}</Text> : null}
          </View>

          {/* ── Chart header & range controls ────────────────────────────────── */}
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartHeaderTitleWrap}>
              <View style={styles.chartHeaderIcon}>
                <Icon kind="trendline" size={16} color="#47664a" />
              </View>
              <Text style={styles.sectionTitle}>{copy.last90Days}</Text>
            </View>
            {!isPremium ? (
              <View style={styles.freeLimitBadge}>
                <Text style={styles.freeLimitBadgeText}>{isTr ? 'Free · 90 gün' : 'Free · 90 days'}</Text>
              </View>
            ) : (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>{isTr ? '✦ Premium' : '✦ Premium'}</Text>
              </View>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rangeRow}
          >
            {([
              { key: 'all', labelEn: 'All',    labelTr: 'Tümü'   },
              { key: '1y',  labelEn: '1 Year', labelTr: '1 Yıl'  },
              { key: '6m',  labelEn: '6 Mo',   labelTr: '6 Ay'   },
              { key: '3m',  labelEn: '3 Mo',   labelTr: '3 Ay'   },
              { key: '1m',  labelEn: '1 Mo',   labelTr: '1 Ay'   },
              { key: '1w',  labelEn: '1 Week', labelTr: '1 Hafta' },
            ] as Array<{ key: ChartRange; labelEn: string; labelTr: string }>).map((option) => {
              const isActive = chartRange === option.key;
              const isLocked = !isPremium && PREMIUM_LOCKED_RANGES.includes(option.key);
              const label = isTr ? option.labelTr : option.labelEn;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => {
                    if (isLocked) {
                      setShowPremiumBanner(true);
                      return;
                    }
                    setShowPremiumBanner(false);
                    setChartRange(option.key);
                  }}
                  style={[
                    styles.rangeChip,
                    isActive && styles.rangeChipActive,
                    isLocked && styles.rangeChipLocked,
                  ]}
                >
                  {isLocked ? (
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                      <Path d="M17 11H7V8a5 5 0 1 1 10 0v3ZM7 11h10v10H7V11Z" stroke="#a3a9a6" strokeWidth={2} strokeLinejoin="round"/>
                    </Svg>
                  ) : null}
                  <Text style={[
                    styles.rangeChipText,
                    isActive && styles.rangeChipTextActive,
                    isLocked && styles.rangeChipTextLocked,
                  ]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── Premium gate banner ──────────────────────────────────────────── */}
          {showPremiumBanner && (
            <View style={styles.premiumGateBanner}>
              <View style={styles.premiumGateLeft}>
                <Text style={styles.premiumGateTitle}>
                  {isTr ? 'Sınırsız geçmiş' : 'Unlimited history'}
                </Text>
                <Text style={styles.premiumGateBody}>
                  {isTr
                    ? 'Tüm kilo kayıtlarına erişmek için Premium planına geç.'
                    : 'Upgrade to Premium to view your full weight history.'}
                </Text>
              </View>
              <Pressable
                style={styles.premiumGateBtn}
                onPress={() => { setShowPremiumBanner(false); onUpgrade?.(); }}
              >
                <Text style={styles.premiumGateBtnText}>{isTr ? 'Geç' : 'Upgrade'}</Text>
              </Pressable>
            </View>
          )}

          {/* ── Chart card ──────────────────────────────────────────────────── */}
          <View style={styles.chartCard}>

            {/* Y-axis + chart row */}
            <View style={styles.chartRow}>
              {/* Y-axis labels */}
              {hasEntries ? (
                <View style={[styles.yAxis, { height: chartHeight }]}>
                  <Text style={styles.yAxisLabel}>
                    {toDisplayVal(yBounds.max, weightUnit).toFixed(1)}
                  </Text>
                  <View style={styles.yAxisSpacer} />
                  <Text style={styles.yAxisLabel}>
                    {toDisplayVal(yBounds.min, weightUnit).toFixed(1)}
                  </Text>
                  <Text style={styles.yAxisUnit}>{weightUnit}</Text>
                </View>
              ) : (
                <View style={styles.yAxisPlaceholder} />
              )}

              {/* Chart SVG */}
              <View style={{ flex: 1 }}>
                <View
                  style={[styles.chartTouchLayer, { width: chartWidth, height: chartHeight }]}
                  onStartShouldSetResponder={() => !previewMode}
                  onMoveShouldSetResponder={() => !previewMode}
                  onResponderGrant={(e) => {
                    setIsScrubbing(true);
                    updateSelectionFromX(e.nativeEvent.locationX);
                  }}
                  onResponderMove={(e) => updateSelectionFromX(e.nativeEvent.locationX)}
                  onResponderRelease={() => {
                    setIsScrubbing(false);
                    setScrubX(null);
                  }}
                  onResponderTerminate={() => {
                    setIsScrubbing(false);
                    setScrubX(null);
                  }}
                >
                  <Svg width={chartWidth} height={chartHeight}>
                    <Defs>
                      <LinearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#47664a" stopOpacity="0.22" />
                        <Stop offset="0.7" stopColor="#47664a" stopOpacity="0.05" />
                        <Stop offset="1" stopColor="#47664a" stopOpacity="0" />
                      </LinearGradient>
                      <LinearGradient id="refBandFade" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#47664a" stopOpacity="0.07" />
                        <Stop offset="1" stopColor="#47664a" stopOpacity="0.12" />
                      </LinearGradient>
                    </Defs>

                    {/* Subtle horizontal grid lines */}
                    {[0.25, 0.5, 0.75].map((n) => (
                      <Line
                        key={n}
                        x1={CHART_INSET}
                        y1={CHART_INSET + (chartHeight - CHART_INSET * 2) * n}
                        x2={chartWidth - CHART_INSET}
                        y2={CHART_INSET + (chartHeight - CHART_INSET * 2) * n}
                        stroke="rgba(0,0,0,0.06)"
                        strokeWidth={1}
                      />
                    ))}

                    {/* Healthy reference band */}
                    <Rect
                      x={CHART_INSET}
                      y={refBandY}
                      width={chartWidth - CHART_INSET * 2}
                      height={Math.max(3, refBandH)}
                      fill="url(#refBandFade)"
                      rx={8}
                    />
                    {/* Reference band top & bottom borders */}
                    <Line
                      x1={CHART_INSET}
                      y1={refBandY}
                      x2={chartWidth - CHART_INSET}
                      y2={refBandY}
                      stroke="rgba(71,102,74,0.20)"
                      strokeWidth={1}
                      strokeDasharray="3 5"
                    />
                    <Line
                      x1={CHART_INSET}
                      y1={refBandY + Math.max(3, refBandH)}
                      x2={chartWidth - CHART_INSET}
                      y2={refBandY + Math.max(3, refBandH)}
                      stroke="rgba(71,102,74,0.14)"
                      strokeWidth={1}
                      strokeDasharray="3 5"
                    />

                    {hasEntries ? (
                      <>
                        {/* Area fill */}
                        <Path d={chart.areaPath} fill="url(#areaFade)" />

                        {/* Main line */}
                        <AnimatedPath
                          d={chart.linePath}
                          fill="none"
                          stroke="#47664a"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={`${chart.lineLength} ${chart.lineLength}`}
                          strokeDashoffset={lineDashOffset as unknown as number}
                        />

                        {/* Scrub vertical guide */}
                        <Line
                          x1={displayedX}
                          y1={CHART_INSET}
                          x2={displayedX}
                          y2={chartHeight - CHART_INSET}
                          stroke="rgba(71,102,74,0.12)"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />

                        {/* Data point: outer glow ring */}
                        {isScrubbing && (
                          <Circle cx={displayedX} cy={displayedY} r={14} fill="rgba(71,102,74,0.08)" />
                        )}
                        {/* Data point: white bg */}
                        <Circle cx={displayedX} cy={displayedY} r={isScrubbing ? 9 : 7} fill="#ffffff" stroke="#47664a" strokeWidth={2.2} />
                        {/* Data point: inner fill */}
                        <Circle cx={displayedX} cy={displayedY} r={isScrubbing ? 4 : 3} fill="#47664a" />
                      </>
                    ) : null}
                  </Svg>
                </View>

                {/* Healthy range label — overlaid on the reference band */}
                {hasEntries && refBandH > 14 ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.refBandLabelWrap,
                      { top: refBandY + 4, right: CHART_INSET + 6 },
                    ]}
                  >
                    <Text style={styles.refBandLabelText}>
                      {isTr ? 'Sağlıklı' : 'Healthy'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* X-axis date labels */}
            {hasEntries && chartEdgeLabels ? (
              <View style={styles.xLabelsCompact}>
                <View style={styles.xLabelsCompactRow}>
                  <Text style={styles.xLabelCompact}>{chartEdgeLabels.start}</Text>
                  <Text style={styles.xLabelCompactCenter}>{chartEdgeLabels.mid}</Text>
                  <Text style={styles.xLabelCompact}>{chartEdgeLabels.end}</Text>
                </View>
                <View style={styles.xLabelSelectedPill}>
                  <Text style={styles.xLabelSelectedText}>{selectedWeight?.label ?? ''}</Text>
                </View>
              </View>
            ) : null}

            {!hasEntries ? (
              <View style={styles.chartEmptyState}>
                <Text style={styles.chartEmptyTitle}>{isTr ? 'Grafik hazır' : 'Chart is ready'}</Text>
                <Text style={styles.chartEmptyText}>
                  {isTr ? 'İlk kaydı ekleyin, ilerleme anında görünsün.' : 'Add your first entry to see progress instantly.'}
                </Text>
                <Pressable
                  style={styles.historyAddBtn}
                  onPress={() => openAddSheet('add', latestWeight?.value ?? 1, new Date(), '', null)}
                >
                  <Text style={styles.historyAddBtnText}>{isTr ? 'İlk Kaydı Ekle' : 'Add First Entry'}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* ── Smart insights ──────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>{copy.smartInsights}</Text>
          <View style={styles.insightStack}>
          <Pressable
            style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]}
            onPress={onOpenHealthRecords}
          >
            <View style={[styles.insightIconBox, rangeStatus === 'within' ? styles.insightIconGood : styles.insightIconWarn]}>
              <Icon
                kind={rangeStatus === 'within' ? 'check' : 'left'}
                size={20}
                color={rangeStatus === 'within' ? '#47664a' : '#c48d42'}
              />
            </View>
            <View style={styles.insightBody}>
              <View style={styles.insightTitleRow}>
                <Text style={styles.insightTitle}>{resolvedPrimaryInsightTitle}</Text>
                <View
                  style={[
                    styles.insightTonePill,
                    ...(rangeStatus === 'within'
                      ? [styles.insightToneGood]
                      : [styles.insightToneWarn]),
                  ]}
                >
                  <Text
                    style={[
                      styles.insightToneText,
                      ...(rangeStatus === 'within'
                        ? [styles.insightToneGoodText]
                        : [styles.insightToneWarnText]),
                    ]}
                  >
                    {toneLabel(rangeStatus === 'within' ? 'good' : 'warn')}
                  </Text>
                </View>
              </View>
              <Text style={styles.insightText}>{resolvedPrimaryInsightText}</Text>
            </View>
            <View style={styles.insightChevron}>
              <Icon kind="right" size={16} color="#9ca39a" />
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.insightCard, pressed && styles.insightCardPressed]} onPress={onOpenVetVisits}>
            <View style={[
              styles.insightIconBox,
              trendInsight.kind === 'positive' ? styles.insightIconGood
              : trendInsight.kind === 'warning' ? styles.insightIconWarn
              : styles.insightIconNeutral,
            ]}>
              <Icon
                kind={trendInsight.kind === 'positive' ? 'check' : trendInsight.kind === 'warning' ? 'up' : 'spark'}
                size={20}
                color={trendInsight.kind === 'positive' ? '#47664a' : trendInsight.kind === 'warning' ? '#c48d42' : '#5d605a'}
              />
            </View>
            <View style={styles.insightBody}>
              <View style={styles.insightTitleRow}>
                <Text style={styles.insightTitle}>{trendInsight.title}</Text>
                <View
                  style={[
                    styles.insightTonePill,
                    toneStyles(
                      trendInsight.kind === 'positive'
                        ? 'good'
                        : trendInsight.kind === 'warning'
                          ? 'warn'
                          : 'neutral',
                    ).pill,
                  ]}
                >
                  <Text
                    style={[
                      styles.insightToneText,
                      toneStyles(
                        trendInsight.kind === 'positive'
                          ? 'good'
                          : trendInsight.kind === 'warning'
                            ? 'warn'
                            : 'neutral',
                      ).pillText,
                    ]}
                  >
                    {toneLabel(
                      trendInsight.kind === 'positive'
                        ? 'good'
                        : trendInsight.kind === 'warning'
                          ? 'warn'
                          : 'neutral',
                    )}
                  </Text>
                </View>
              </View>
              <Text style={styles.insightText}>{trendInsight.body}</Text>
            </View>
            <View style={styles.insightChevron}>
              <Icon kind="right" size={16} color="#9ca39a" />
            </View>
          </Pressable>

          {recencyInsight ? (
            <View style={styles.insightCard}>
              <View style={[
                styles.insightIconBox,
                recencyInsight.kind === 'positive' ? styles.insightIconGood
                : recencyInsight.kind === 'warning' ? styles.insightIconWarn
                : styles.insightIconNeutral,
              ]}>
                <Icon
                  kind="calendar"
                  size={20}
                  color={recencyInsight.kind === 'positive' ? '#47664a' : recencyInsight.kind === 'warning' ? '#c48d42' : '#5d605a'}
                />
              </View>
              <View style={styles.insightBody}>
                <View style={styles.insightTitleRow}>
                  <Text style={styles.insightTitle}>{recencyInsight.title}</Text>
                  <View
                    style={[
                      styles.insightTonePill,
                      toneStyles(
                        recencyInsight.kind === 'positive'
                          ? 'good'
                          : recencyInsight.kind === 'warning'
                            ? 'warn'
                            : 'neutral',
                      ).pill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.insightToneText,
                        toneStyles(
                          recencyInsight.kind === 'positive'
                            ? 'good'
                            : recencyInsight.kind === 'warning'
                              ? 'warn'
                              : 'neutral',
                        ).pillText,
                      ]}
                    >
                      {toneLabel(
                        recencyInsight.kind === 'positive'
                          ? 'good'
                          : recencyInsight.kind === 'warning'
                            ? 'warn'
                            : 'neutral',
                      )}
                    </Text>
                  </View>
                </View>
                <Text style={styles.insightText}>{recencyInsight.body}</Text>
              </View>
            </View>
          ) : null}
          </View>

          {/* ── History ─────────────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>{copy.history}</Text>
          {hasEntries ? (
            <View style={styles.historyCard}>
              {allEntriesSorted.slice().reverse().map((item, idx) => {
                const sortedIndex = allEntriesSorted.length - 1 - idx;
                return (
                <Pressable
                  key={`${item.date}-${idx}`}
                  style={[styles.historyRow, idx !== allEntriesSorted.length - 1 && styles.historyDivider]}
                  onPress={() => {
                    const safeParts = clampDateParts(toDatePartsFromStored(item.date), addPickerToday);
                    openAddSheet('edit', item.value, dateFromParts(safeParts), item.note ?? '', sortedIndex);
                  }}
                >
                  <View style={styles.historyLeft}>
                    <View style={styles.historyDateIconBox}>
                      <Icon kind="calendar" size={16} color="#5d605a" />
                    </View>
                    <Text style={styles.historyDate}>{formatWeightDateLabel(item.date, isTr)}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyWeight}>{toDisplayVal(item.value, weightUnit).toFixed(1)} {weightUnit}</Text>
                    <View style={styles.historyDeltaPill}>
                      <Text style={styles.historyDeltaText}>{item.change}</Text>
                    </View>
                  </View>
                </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.historyEmptyCard}>
              <Text style={styles.historyEmptyTitle}>{isTr ? 'Henuz kayit yok' : 'No entries yet'}</Text>
              <Text style={styles.historyEmptyText}>
                {isTr ? 'Ilk kayit eklendiginde gecmis burada listelenir.' : 'Your history will appear here after the first entry.'}
              </Text>
              <Pressable
                style={styles.historyAddBtn}
                onPress={() => openAddSheet('add', latestWeight?.value ?? 1, new Date(), '', null)}
              >
                <Text style={styles.historyAddBtnText}>{isTr ? 'Ilk Kaydi Ekle' : 'Add First Entry'}</Text>
              </Pressable>
            </View>
          )}
        </Animated.ScrollView>

        <StickyBlurTopBar
          title={isTr ? 'KILO PROFILI' : 'WEIGHT PROFILE'}
          topInset={topInset}
          scrollY={scrollY}
          titleColor="#2f352f"
          overlayColors={WEIGHT_HEADER_OVERLAY}
          borderColor="rgba(49,73,56,0.24)"
          titleVariant="hub"
          centerLogoSource={weightHeaderLogo}
          centerLogoWidth={102}
          centerLogoHeight={102}
          centerLogoOffsetY={-8}
          leftSlot={(
            <Pressable style={styles.backCircle} onPress={onBack}>
              <Icon kind="back" size={22} color="#5d605a" />
            </Pressable>
          )}
          rightSlot={(
            <Pressable
              style={styles.backCircle}
              onPress={() => openAddSheet('add', latestWeight?.value ?? 1, new Date(), '', null)}
            >
              <Icon kind="plus" size={20} color="#5d605a" />
            </Pressable>
          )}
        />

        {/* ── Bottom-sheet: Add weight entry ─────────────────────────────────── */}
        <Modal
          visible={showAdd}
          transparent
          animationType="none"
          onRequestClose={() => closeAddSheet()}
        >
          <View style={styles.sheetModalRoot}>
            <Animated.View pointerEvents="none" style={[styles.sheetBackdrop, { opacity: addSheetBackdropOpacity }]} />
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeAddSheet()} />
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY: addSheetTranslateY }] }]}
              onLayout={(e) => {
                addSheetHeightRef.current = e.nativeEvent.layout.height;
              }}
            >
              <View style={styles.sheetDragArea} {...addSheetPan.panHandlers}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{copy.addWeightEntry}</Text>
                </View>
                <Text style={styles.sheetHint}>
                  {isTr ? 'Grafik ile bağlantılı, tarihli bir kayıt ekleyin.' : 'Add a dated entry linked to this chart.'}
                </Text>
              </View>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.addSheetSummary}>
                  <View style={styles.addSheetSummaryBlock}>
                    <Text style={styles.addSheetSummaryLabel}>{isTr ? 'SEÇİLİ KİLO' : 'SELECTED WEIGHT'}</Text>
                    <Text style={styles.addSheetSummaryValue}>
                      {toWeightDisplay(weightTenths)} <Text style={styles.addSheetSummaryUnit}>{weightUnit}</Text>
                    </Text>
                  </View>
                  <View style={styles.addSheetSummaryBlockRight}>
                    <Text style={styles.addSheetSummaryLabel}>{isTr ? 'TARİH' : 'DATE'}</Text>
                    <Text style={styles.addSheetSummaryDate}>{formatPickerDateLabel(dateFromParts(entryDateParts), isTr)}</Text>
                  </View>
                </View>

                <View style={styles.addSheetBlock}>
                  <Text style={styles.fieldLabel}>{isTr ? `AĞIRLIK (${weightUnit})` : `WEIGHT (${weightUnit})`}</Text>
                  <View style={styles.weightPickerRow}>
                    <PickerWheelColumn
                      items={addWeightItems}
                      selectedValue={String(weightTenths)}
                      onValueChange={(value) => setWeightTenths(Number(value))}
                      width={168}
                    />
                    <Text style={styles.weightPickerUnit}>{weightUnit}</Text>
                  </View>
                </View>

                <View style={styles.addSheetBlock}>
                  <Text style={styles.fieldLabel}>{isTr ? 'TARİH' : 'DATE'}</Text>
                  <View style={styles.addDateRow}>
                    <Pressable style={styles.addDateButton} onPress={() => setShowAddDatePicker((prev) => !prev)}>
                      <Icon kind="calendar" size={16} color="#5d605a" />
                      <Text style={styles.addDateButtonText}>{formatPickerDateLabel(dateFromParts(entryDateParts), isTr)}</Text>
                    </Pressable>
                  </View>
                  {showAddDatePicker ? (
                    <View style={styles.addDatePickerWrap}>
                      <DateTimePicker
                        value={dateFromParts(entryDateParts)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'compact' : 'default'}
                        maximumDate={endOfDay(new Date())}
                        onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                          if (Platform.OS === 'android') setShowAddDatePicker(false);
                          if (!selectedDate || !Number.isFinite(selectedDate.getTime())) return;
                          setEntryDateParts(clampDateParts(toDateParts(selectedDate), addPickerToday));
                        }}
                      />
                    </View>
                  ) : null}
                  <View style={styles.datePickerRowCompact}>
                    <Text style={styles.datePickerHint}>
                      {isTr ? 'Tarih seçildikten sonra not ekleyip kaydet.' : 'Pick date, add note, then save.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.addSheetBlock}>
                  <Text style={styles.fieldLabel}>{isTr ? 'NOT (OPSİYONEL)' : 'NOTE (OPTIONAL)'}</Text>
                  <TextInput
                    value={entryNote}
                    onChangeText={setEntryNote}
                    placeholder={isTr ? 'Örn. yemek değişti, aktivite arttı...' : 'e.g. diet changed, activity increased...'}
                    placeholderTextColor="#b1b3ab"
                    onFocus={() => setFocusedField('note')}
                    onBlur={() => setFocusedField(null)}
                    multiline
                    style={[styles.fieldInput, styles.fieldInputNote, focusedField === 'note' && styles.fieldInputFocused]}
                  />
                </View>

                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                {entryFormMode === 'edit' && onDeleteEntry ? (
                  <Pressable style={styles.sheetDeleteBtn} onPress={deleteEntry}>
                    <Text style={styles.sheetDeleteBtnText}>{isTr ? 'Kaydı Sil' : 'Delete Entry'}</Text>
                  </Pressable>
                ) : null}

                <Animated.View style={{ transform: [{ scale: savePressScale }] }}>
                  <Pressable
                    style={styles.sheetSaveBtn}
                    onPress={saveEntry}
                    onPressIn={() => Animated.timing(savePressScale, { toValue: 0.98, duration: 90, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.timing(savePressScale, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
                  >
                    <Text style={styles.sheetSaveBtnText}>{isTr ? 'Kaydı Kaydet' : 'Save Entry'}</Text>
                  </Pressable>
                </Animated.View>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        {/* ── Bottom-sheet: Weight goal ───────────────────────────────────────── */}
        <Modal
          visible={showGoalModal}
          transparent
          animationType="none"
          onRequestClose={() => closeGoalSheet()}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <Animated.View pointerEvents="none" style={[styles.sheetBackdrop, { opacity: goalSheetBackdropOpacity }]} />
          <Pressable style={styles.sheetBackdrop} onPress={() => closeGoalSheet()} />
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: goalSheetTranslateY }] }]}
            onLayout={(event) => { goalSheetHeightRef.current = event.nativeEvent.layout.height; }}
          >
            <View style={styles.sheetHandle} {...goalSheetPan.panHandlers} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isTr ? 'Hedef Kilo Belirle' : 'Set Weight Goal'}</Text>
              <Pressable onPress={() => closeGoalSheet()} style={styles.sheetCloseBtn}>
                <Icon kind="close" size={18} color="#5d605a" />
              </Pressable>
            </View>
            <Text style={styles.sheetHint}>
              {isTr ? 'Hedefe ulaşma ilerlemenizi kilo kartında görebilirsiniz.' : 'You can track progress toward this goal in the weight card.'}
            </Text>

            <Text style={styles.fieldLabel}>{isTr ? `Hedef Ağırlık (${weightUnit})` : `Goal Weight (${weightUnit})`}</Text>
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="decimal-pad"
              placeholder={isTr ? 'Örn. 7.5' : 'e.g. 7.5'}
              placeholderTextColor="#b1b3ab"
              onFocus={() => setFocusedField('goal')}
              onBlur={() => setFocusedField(null)}
              style={[styles.fieldInput, focusedField === 'goal' && styles.fieldInputFocused]}
            />

            {goalError ? <Text style={styles.formError}>{goalError}</Text> : null}

            <Pressable
              style={styles.sheetSaveBtn}
              onPress={saveGoal}
            >
              <Text style={styles.sheetSaveBtnText}>{isTr ? 'Hedefi Kaydet' : 'Save Goal'}</Text>
            </Pressable>
          </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
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

  // Content
  content: {
    paddingHorizontal: 20,
    paddingBottom: 44,
    gap: 20,
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
  expenseBadge: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  expenseBadgeLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: '#5d605a',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  expenseBadgeValue: {
    fontSize: 15,
    lineHeight: 20,
    color: '#47664a',
    fontWeight: '800',
  },
  goalPill: {
    height: 32,
    borderRadius: 999,
    backgroundColor: WEIGHT_CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  goalPillText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '700',
  },

  // Current weight card
  currentCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(93,96,90,0.10)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  currentCardLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: WEIGHT_CARD_BG,
    textTransform: 'uppercase',
  },
  currentValueRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  emptyCurrentState: {
    marginTop: 12,
    gap: 6,
  },
  emptyCurrentTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: '#30332e',
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  emptyCurrentText: {
    maxWidth: 290,
    fontSize: 14,
    lineHeight: 20,
    color: '#69706b',
    fontWeight: '500',
  },
  currentValue: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -1,
  },
  currentUnit: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '500',
    color: '#5d605a',
  },
  changePill: {
    height: 24,
    borderRadius: 6,
    backgroundColor: '#eef4ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  changePillText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#47664a',
    fontWeight: '700',
  },
  currentSub: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
    color: '#56625a',
    fontWeight: '500',
  },

  // Goal progress
  goalRow: {
    marginTop: 14,
    gap: 6,
  },
  goalCompareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalCompareText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5d605a',
    fontWeight: '500',
  },
  goalCompareValue: {
    fontWeight: '700',
    color: '#30332e',
  },
  goalBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(71,102,74,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    overflow: 'hidden',
  },
  goalBarFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: WEIGHT_CARD_BG,
  },

  referenceLine: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#47664a',
    fontWeight: '700',
  },
  microchipLine: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#5d605a',
    fontWeight: '500',
  },
  referenceNote: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#69706b',
    fontWeight: '400',
  },

  // Section title
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: '#30332e',
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chartHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(71,102,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeRow: {
    paddingBottom: 4,
    gap: 8,
  },
  rangeChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f1f0ea',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipActive: {
    backgroundColor: '#eef4ef',
    borderColor: 'rgba(71,102,74,0.20)',
  },
  rangeChipText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#5d605a',
    fontWeight: '600',
  },
  rangeChipTextActive: {
    color: '#47664a',
    fontWeight: '700',
  },
  rangeChipLocked: {
    opacity: 0.55,
    borderStyle: 'dashed',
  },
  rangeChipTextLocked: {
    color: '#9a9f98',
  },

  // Chart header badges
  freeLimitBadge: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f1eb',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  freeLimitBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#7a7f78',
    fontWeight: '600',
  },
  premiumBadge: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#edf5ea',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#47664a',
    fontWeight: '700',
  },

  // Premium gate banner
  premiumGateBanner: {
    borderRadius: 18,
    backgroundColor: '#f9f7f2',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumGateLeft: {
    flex: 1,
    gap: 3,
  },
  premiumGateTitle: {
    fontSize: 14,
    lineHeight: 18,
    color: '#30332e',
    fontWeight: '700',
  },
  premiumGateBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6a706b',
    fontWeight: '400',
  },
  premiumGateBtn: {
    height: 36,
    borderRadius: 14,
    backgroundColor: '#47664a',
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumGateBtnText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Chart card
  chartCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(93,96,90,0.09)',
    shadowColor: '#47664a',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  yAxis: {
    width: 36,
    paddingTop: 2,
    paddingBottom: 2,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexDirection: 'column',
    gap: 0,
  },
  yAxisSpacer: {
    flex: 1,
  },
  yAxisLabel: {
    fontSize: 10,
    lineHeight: 13,
    color: '#9a9f98',
    fontWeight: '600',
    textAlign: 'right',
  },
  yAxisUnit: {
    fontSize: 9,
    lineHeight: 12,
    color: '#b1b3ab',
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 2,
  },
  yAxisPlaceholder: {
    width: 36,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTouchLayer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refBandLabelWrap: {
    position: 'absolute',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(71,102,74,0.10)',
  },
  refBandLabelText: {
    fontSize: 9,
    lineHeight: 12,
    color: '#47664a',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  xLabelsCompact: {
    marginTop: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  xLabelsCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xLabelCompact: {
    fontSize: 11,
    lineHeight: 14,
    color: '#9a9f98',
    fontWeight: '600',
  },
  xLabelCompactCenter: {
    fontSize: 11,
    lineHeight: 14,
    color: '#a8aca6',
    fontWeight: '500',
  },
  xLabelSelectedPill: {
    alignSelf: 'center',
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(71,102,74,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLabelSelectedText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#47664a',
    fontWeight: '700',
  },
  xLabelsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  xLabelBtn: {
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  xLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#b1b3ab',
    fontWeight: '600',
  },
  xLabelActive: {
    color: '#47664a',
  },
  chartEmptyState: {
    marginTop: 14,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f6f4f0',
    borderWidth: 1,
    borderColor: 'rgba(103,116,111,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  chartEmptyTitle: {
    fontSize: 13,
    lineHeight: 17,
    color: '#30332e',
    fontWeight: '700',
  },
  chartEmptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6e736e',
    fontWeight: '500',
  },

  // Insight cards
  insightStack: {
    gap: 10,
  },
  insightCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(93,96,90,0.12)',
    shadowColor: '#28362d',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  insightCardPressed: {
    transform: [{ scale: 0.995 }],
    opacity: 0.94,
  },
  insightIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconGood: {
    backgroundColor: '#eef6ef',
  },
  insightIconWarn: {
    backgroundColor: '#fef6ea',
  },
  insightIconNeutral: {
    backgroundColor: '#eeeee8',
  },
  insightBody: {
    flex: 1,
    paddingTop: 2,
    gap: 4,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  insightTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#30332e',
    fontWeight: '700',
    flexShrink: 1,
  },
  insightTonePill: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightToneText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  insightToneGood: {
    backgroundColor: '#eaf5ed',
  },
  insightToneGoodText: {
    color: '#47664a',
  },
  insightToneWarn: {
    backgroundColor: '#fff3e2',
  },
  insightToneWarnText: {
    color: '#a36e1e',
  },
  insightToneNeutral: {
    backgroundColor: '#eeefeb',
  },
  insightToneNeutralText: {
    color: '#64695f',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d605a',
    fontWeight: '400',
  },
  insightChevron: {
    alignSelf: 'center',
    paddingLeft: 2,
  },

  // History card
  historyCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(93,96,90,0.10)',
  },
  historyRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(177,179,171,0.2)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyDateIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDate: {
    fontSize: 14,
    lineHeight: 18,
    color: '#30332e',
    fontWeight: '500',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyWeight: {
    fontSize: 16,
    lineHeight: 20,
    color: '#30332e',
    fontWeight: '700',
  },
  historyDeltaPill: {
    borderRadius: 6,
    backgroundColor: '#eeeee8',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  historyDeltaText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#5d605a',
    fontWeight: '600',
  },
  historyEmptyCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(93,96,90,0.10)',
    gap: 6,
  },
  historyEmptyTitle: {
    fontSize: 16,
    lineHeight: 21,
    color: '#30332e',
    fontWeight: '700',
  },
  historyEmptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#69706b',
    fontWeight: '500',
  },
  historyAddBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    backgroundColor: '#eef4ef',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyAddBtnText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#47664a',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Bottom-sheet modal
  sheetModalRoot: {
    flex: 1,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 10,
    maxHeight: '82%',
  },
  sheetScroll: {
    maxHeight: 480,
  },
  sheetScrollContent: {
    paddingBottom: 2,
    gap: 2,
  },
  sheetDragArea: {
    gap: 6,
  },
  addSheetSummary: {
    marginTop: 0,
    marginBottom: 6,
    borderRadius: 16,
    backgroundColor: '#f3f1eb',
    borderWidth: 1,
    borderColor: '#e4e0d6',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  addSheetSummaryBlock: {
    flex: 1,
    gap: 4,
  },
  addSheetSummaryBlockRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  addSheetSummaryLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: '#6f736d',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  addSheetSummaryValue: {
    fontSize: 21,
    lineHeight: 24,
    color: '#30332e',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addSheetSummaryUnit: {
    fontSize: 14,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '500',
  },
  addSheetSummaryDate: {
    fontSize: 13,
    lineHeight: 17,
    color: '#30332e',
    fontWeight: '600',
  },
  addSheetBlock: {
    gap: 8,
    marginTop: 4,
  },
  weightPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  weightPickerDot: {
    fontSize: 24,
    lineHeight: 28,
    color: '#a5aaa1',
    fontWeight: '500',
    marginTop: -2,
  },
  weightPickerUnit: {
    fontSize: 14,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '600',
    marginLeft: 2,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#b1b3ab',
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 22,
    color: '#30332e',
    fontWeight: '700',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5d605a',
    fontWeight: '400',
  },
  fieldLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: '#5d605a',
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  fieldInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b1b3ab',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#30332e',
    backgroundColor: '#f6f4f0',
  },
  fieldInputFocused: {
    borderColor: '#47664a',
    backgroundColor: '#fff',
    shadowColor: '#47664a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  fieldInputNote: {
    height: 68,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDateChip: {
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#b1b3ab',
    backgroundColor: '#f6f4f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateChipText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#30332e',
    fontWeight: '700',
  },
  formError: {
    fontSize: 12,
    lineHeight: 16,
    color: '#c96a6a',
    fontWeight: '600',
  },
  sheetSaveBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sheetSaveBtnText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '700',
  },
  sheetDeleteBtn: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5b6b6',
    backgroundColor: '#fff4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDeleteBtnText: {
    fontSize: 13,
    lineHeight: 17,
    color: '#b95252',
    fontWeight: '700',
  },

  // Picker wheels
  column: {
    height: PW_WHEEL_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#f6f4f0',
    borderWidth: 1,
    borderColor: 'rgba(118,126,121,0.06)',
    overflow: 'hidden',
    position: 'relative',
  },
  columnContent: {
    paddingVertical: PW_ROW_PADDING,
  },
  row: {
    height: PW_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPressed: {
    opacity: 0.82,
  },
  rowActive: {
    backgroundColor: 'rgba(71,102,74,0.10)',
  },
  rowText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: '#6f736d',
  },
  rowTextActive: {
    color: '#30332e',
    fontWeight: '700',
  },
  selectionBand: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: (PW_WHEEL_HEIGHT - PW_ROW_HEIGHT) / 2,
    height: PW_ROW_HEIGHT,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: 'rgba(71,102,74,0.06)',
  },

  // Header placeholder (fills space when no expense badge)
  headerPlaceholder: {
    width: 80,
  },

  // SET GOAL card (no goal set)
  setGoalCard: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#eef4ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setGoalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setGoalTitle: {
    fontSize: 14,
    lineHeight: 18,
    color: '#47664a',
    fontWeight: '700',
  },
  setGoalArrow: {
    fontSize: 16,
    color: '#47664a',
    fontWeight: '700',
  },

  // Goal section (goal is set)
  goalSection: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#eef4ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.20)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  goalSectionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalSectionLeft: {
    gap: 2,
  },
  goalSectionRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  goalSectionLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: '#47664a',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  goalSectionValue: {
    fontSize: 20,
    lineHeight: 24,
    color: '#30332e',
    fontWeight: '700',
  },
  goalSectionUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5d605a',
  },
  goalDiffLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: '#5d605a',
    fontWeight: '600',
  },
  goalDiffValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  goalEditHint: {
    fontSize: 11,
    lineHeight: 14,
    color: '#47664a',
    fontWeight: '600',
    textAlign: 'right',
  },
});
