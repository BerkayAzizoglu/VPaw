import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useLocale } from '../hooks/useLocale';
import { useAppSettings } from '../hooks/useAppSettings';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import type { WeightPoint } from '../lib/healthMvpModel';
import type { WeightUnit } from '../hooks/useAppSettings';

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
  entries: WeightPoint[];
  onAddEntry: (value: number, options?: { date?: string; note?: string }) => void;
  weightGoal?: number;
  onSetWeightGoal?: (goal: number) => void;
  totalExpenses?: { total: number; currency: string };
};

type WeightReference = {
  min: number;
  max: number;
  note: string;
};

// ─── Chart constants ──────────────────────────────────────────────────────────

const CHART_HEIGHT = 160;
const CHART_INSET = 10;
const AnimatedPath = Animated.createAnimatedComponent(Path);

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

function formatTemplate(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => params[key] ?? '');
}

// ─── Icon component ───────────────────────────────────────────────────────────

function Icon({ kind, size = 20, color = '#787878' }: { kind: 'back' | 'plus' | 'up' | 'check' | 'left' | 'calendar' | 'spark' | 'close'; size?: number; color?: string }) {
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

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 12.2L10.2 15.6L17.5 8.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
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
  microchip,
  entries,
  onAddEntry,
  weightGoal,
  onSetWeightGoal,
  totalExpenses,
}: WeightTrackingScreenProps) {
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const copy = getWording(locale).weightTracking;
  const { settings } = useAppSettings();
  const weightUnit = settings.weightUnit;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(Math.max(entries.length - 1, 0));
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [entryDate, setEntryDate] = useState(toYmd(new Date()));
  const [entryNote, setEntryNote] = useState('');
  const [focusedField, setFocusedField] = useState<'weight' | 'date' | 'note' | 'goal' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);

  const lineAnim = useRef(new Animated.Value(0)).current;
  const savePressScale = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(240, width - 96);
  const chartHeight = CHART_HEIGHT;

  const edgeSwipeResponder = useEdgeSwipeBack({
    onBack,
    enabled: !previewMode && !isScrubbing && !focusedField,
  });

  // ─── Derived / memoized ─────────────────────────────────────────────────────
  const reference = useMemo(() => getWeightReference(petType, petBreed, copy.refs), [petType, petBreed, copy.refs]);
  const microchipDisplay = microchip && microchip.trim().length > 0
    ? microchip
    : (isTr ? 'Tanımlı değil' : 'Not set');

  useEffect(() => {
    setSelectedIndex(Math.max(entries.length - 1, 0));
  }, [entries.length]);

  const safeEntries = entries.length > 0 ? entries : [{ label: copy.todayFallback, value: reference.min, date: copy.todayFallback, change: copy.stableFallback }];

  const MAX_X_LABELS = 5;
  const visibleLabelIndices = useMemo(() => {
    const n = safeEntries.length;
    if (n <= MAX_X_LABELS) return new Set(Array.from({ length: n }, (_, i) => i));
    const result = new Set<number>();
    result.add(0);
    result.add(n - 1);
    const step = (n - 1) / (MAX_X_LABELS - 1);
    for (let i = 1; i < MAX_X_LABELS - 1; i++) result.add(Math.round(i * step));
    return result;
  }, [safeEntries.length]);

  const yBounds = useMemo(() => {
    const values = safeEntries.map((e) => e.value);
    values.push(reference.min, reference.max);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(0.8, max - min);
    const pad = span * 0.14;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [safeEntries, reference.max, reference.min]);

  const toY = (value: number) => {
    const usableHeight = chartHeight - CHART_INSET * 2;
    const normalized = (value - yBounds.min) / Math.max(0.1, yBounds.max - yBounds.min);
    return chartHeight - CHART_INSET - Math.max(0, Math.min(1, normalized)) * usableHeight;
  };

  const chart = useMemo(() => {
    const usableWidth = chartWidth - CHART_INSET * 2;
    const xStep = safeEntries.length > 1 ? usableWidth / (safeEntries.length - 1) : 0;
    const points = safeEntries.map((p, idx) => ({
      x: CHART_INSET + idx * xStep,
      y: toY(p.value),
    }));

    const linePath = buildSmoothPath(points);
    const baseY = chartHeight - CHART_INSET;
    const areaPath = `${linePath} L ${chartWidth - CHART_INSET} ${baseY} L ${CHART_INSET} ${baseY} Z`;
    const selected = points[Math.min(selectedIndex, points.length - 1)] ?? points[0];
    const lineLength = computePolylineLength(points);

    return { points, linePath, areaPath, selected, lineLength };
  }, [chartHeight, chartWidth, safeEntries, selectedIndex, yBounds.max, yBounds.min]);

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
  }, [previewMode, safeEntries.length, lineAnim]);

  const lineDashOffset = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [chart.lineLength, 0],
  });

  const updateSelectionFromX = (locationX: number) => {
    if (safeEntries.length <= 1) {
      setSelectedIndex(0);
      setScrubX(CHART_INSET);
      return;
    }

    const clampedX = Math.max(CHART_INSET, Math.min(chartWidth - CHART_INSET, locationX));
    setScrubX(clampedX);

    const ratio = (clampedX - CHART_INSET) / (chartWidth - CHART_INSET * 2);
    const idx = Math.round(ratio * (safeEntries.length - 1));
    setSelectedIndex(idx);
  };

  const interpolatedSample = useMemo(() => {
    if (!isScrubbing || scrubX == null || safeEntries.length === 0) return null;
    if (safeEntries.length === 1) return { value: safeEntries[0].value, date: safeEntries[0].date, x: scrubX };

    const ratio = Math.max(0, Math.min(1, (scrubX - CHART_INSET) / (chartWidth - CHART_INSET * 2)));
    const segment = ratio * (safeEntries.length - 1);
    const left = Math.floor(segment);
    const right = Math.min(safeEntries.length - 1, left + 1);
    const t = segment - left;

    const leftEntry = safeEntries[left];
    const rightEntry = safeEntries[right];
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
  }, [safeEntries, isScrubbing, scrubX, chartWidth, isTr]);

  const selectedWeight = safeEntries[Math.min(selectedIndex, Math.max(safeEntries.length - 1, 0))];
  const displayedValue = interpolatedSample?.value ?? selectedWeight?.value ?? 0;
  const displayedDate = interpolatedSample?.date ?? selectedWeight?.date ?? copy.noDate;

  const displayedY = toY(displayedValue);
  const displayedX = interpolatedSample?.x ?? chart.selected.x;
  const refMinY = toY(reference.min);
  const refMaxY = toY(reference.max);
  const refBandY = Math.min(refMinY, refMaxY);
  const refBandH = Math.abs(refMaxY - refMinY);

  const latestWeight = safeEntries[safeEntries.length - 1];
  const deltaFromCurrent = latestWeight ? displayedValue - latestWeight.value : 0;

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

  // ─── Goal progress ──────────────────────────────────────────────────────────
  const currentWeightForGoal = latestWeight?.value ?? 0;
  const goalProgress = weightGoal && weightGoal > 0
    ? Math.min(1, Math.max(0, currentWeightForGoal / weightGoal))
    : null;

  // ─── Save entry ─────────────────────────────────────────────────────────────
  const saveEntry = () => {
    const parsed = Number(newWeight.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError(copy.enterValidWeight);
      return;
    }
    const parsedDate = new Date(`${entryDate.trim()}T12:00:00.000Z`);
    if (!Number.isFinite(parsedDate.getTime())) {
      setFormError(isTr ? 'Lütfen tarihi YYYY-AA-GG formatında girin.' : 'Please enter date as YYYY-MM-DD.');
      return;
    }

    onAddEntry(toKgFromUnit(parsed, weightUnit), {
      date: parsedDate.toISOString(),
      note: entryNote.trim() || undefined,
    });
    setNewWeight('');
    setEntryDate(toYmd(new Date()));
    setEntryNote('');
    setFormError(null);
    setShowAdd(false);
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
    setShowGoalModal(false);
  };

  // ─── Expense display ─────────────────────────────────────────────────────────
  const expenseLabel = isTr ? 'Harcama' : 'Expenses';
  const expenseValue = totalExpenses
    ? `${totalExpenses.total.toLocaleString(isTr ? 'tr-TR' : 'en-US')} ${totalExpenses.currency}`
    : null;

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, edgeSwipeResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.frontLayer, edgeSwipeResponder.frontLayerStyle]} {...edgeSwipeResponder.panHandlers}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!previewMode && !isScrubbing && !edgeSwipeResponder.isSwiping}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <Pressable style={styles.backCircle} onPress={onBack}>
              <Icon kind="back" size={22} color="#5d605a" />
            </Pressable>

            <Text style={styles.headerPetName}>{petName}</Text>

            {expenseValue ? (
              <View style={styles.expenseBadge}>
                <Text style={styles.expenseBadgeLabel}>{expenseLabel.toUpperCase()}</Text>
                <Text style={styles.expenseBadgeValue}>{expenseValue}</Text>
              </View>
            ) : (
              <View style={styles.headerPlaceholder} />
            )}
          </View>

          {/* ── Current weight card ─────────────────────────────────────────── */}
          <View style={styles.currentCard}>
            <Text style={styles.currentCardLabel}>
              {isTr ? 'GÜNCEL KİLO' : 'CURRENT WEIGHT'}
            </Text>

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
            <Text style={styles.microchipLine}>
              {isTr ? 'Mikroçip: ' : 'Microchip: '}{microchipDisplay}
            </Text>
            <Text style={styles.referenceNote}>{reference.note}</Text>
          </View>

          {/* ── Section title ────────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>{copy.last90Days}</Text>

          {/* ── Chart card ──────────────────────────────────────────────────── */}
          <View style={styles.chartCard}>
            <View style={styles.chartWrap}>
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
                      <Stop offset="1" stopColor="#47664a" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>

                  <Rect
                    x={CHART_INSET}
                    y={refBandY}
                    width={chartWidth - CHART_INSET * 2}
                    height={Math.max(2, refBandH)}
                    fill="rgba(71,102,74,0.10)"
                    rx={6}
                  />

                  {[0.2, 0.4, 0.6, 0.8].map((n) => (
                    <Line
                      key={n}
                      x1={CHART_INSET}
                      y1={CHART_INSET + (chartHeight - CHART_INSET * 2) * n}
                      x2={chartWidth - CHART_INSET}
                      y2={CHART_INSET + (chartHeight - CHART_INSET * 2) * n}
                      stroke="rgba(0,0,0,0.05)"
                      strokeDasharray="2 6"
                    />
                  ))}

                  <Path d={chart.areaPath} fill="url(#areaFade)" />
                  <AnimatedPath
                    d={chart.linePath}
                    fill="none"
                    stroke="#47664a"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={`${chart.lineLength} ${chart.lineLength}`}
                    strokeDashoffset={lineDashOffset as unknown as number}
                  />

                  <Line
                    x1={displayedX}
                    y1={displayedY}
                    x2={displayedX}
                    y2={chartHeight - CHART_INSET}
                    stroke="rgba(71,102,74,0.24)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />

                  <Circle cx={displayedX} cy={displayedY} r={isScrubbing ? 8.5 : 7.2} fill="#ffffff" stroke="#47664a" strokeWidth={2} />
                  <Circle cx={displayedX} cy={displayedY} r={isScrubbing ? 3.6 : 3} fill="#47664a" />
                </Svg>
              </View>
            </View>

            <View style={styles.xLabelsRow}>
              {safeEntries.map((point, idx) => (
                <Pressable key={`${point.label}-${idx}`} onPress={() => setSelectedIndex(idx)} style={styles.xLabelBtn}>
                  <Text style={[styles.xLabel, selectedIndex === idx && styles.xLabelActive]}>
                    {visibleLabelIndices.has(idx) || selectedIndex === idx ? point.label : ''}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add weight entry pill inside chart card */}
            <Pressable
              style={styles.addEntryPill}
              onPress={() => { setShowAdd(true); setFormError(null); }}
            >
              <Icon kind="plus" size={15} color="#fff" />
              <Text style={styles.addEntryPillText}>
                {isTr ? 'Kilo Girişi Ekle' : 'Add Weight Entry'}
              </Text>
            </Pressable>
          </View>

          {/* ── Smart insights ──────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>{copy.smartInsights}</Text>
          <Pressable
            style={styles.insightCard}
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
              <Text style={styles.insightTitle}>{primaryInsightTitle}</Text>
              <Text style={styles.insightText}>{primaryInsightText}</Text>
            </View>
          </Pressable>

          <Pressable style={styles.insightCard} onPress={onOpenVetVisits}>
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
              <Text style={styles.insightTitle}>{trendInsight.title}</Text>
              <Text style={styles.insightText}>{trendInsight.body}</Text>
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
                <Text style={styles.insightTitle}>{recencyInsight.title}</Text>
                <Text style={styles.insightText}>{recencyInsight.body}</Text>
              </View>
            </View>
          ) : null}

          {/* ── History ─────────────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>{copy.history}</Text>
          <View style={styles.historyCard}>
            {safeEntries.slice().reverse().map((item, idx) => (
              <View
                key={`${item.date}-${idx}`}
                style={[styles.historyRow, idx !== safeEntries.length - 1 && styles.historyDivider]}
              >
                <View style={styles.historyLeft}>
                  <View style={styles.historyDateIconBox}>
                    <Icon kind="calendar" size={16} color="#5d605a" />
                  </View>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyWeight}>{toDisplayVal(item.value, weightUnit).toFixed(1)} {weightUnit}</Text>
                  <View style={styles.historyDeltaPill}>
                    <Text style={styles.historyDeltaText}>{item.change}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── Bottom-sheet: Add weight entry ─────────────────────────────────── */}
        <Modal
          visible={showAdd}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAdd(false)}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{copy.addWeightEntry}</Text>
              <Pressable onPress={() => setShowAdd(false)} style={styles.sheetCloseBtn}>
                <Icon kind="close" size={18} color="#5d605a" />
              </Pressable>
            </View>
            <Text style={styles.sheetHint}>
              {isTr ? 'Grafik ile bağlantılı, tarihli bir kayıt ekleyin.' : 'Add a dated entry linked to this chart.'}
            </Text>

            <Text style={styles.fieldLabel}>{isTr ? `Ağırlık (${weightUnit})` : `Weight (${weightUnit})`}</Text>
            <TextInput
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder={copy.weightPlaceholder}
              placeholderTextColor="#b1b3ab"
              onFocus={() => setFocusedField('weight')}
              onBlur={() => setFocusedField(null)}
              style={[styles.fieldInput, focusedField === 'weight' && styles.fieldInputFocused]}
            />

            <Text style={styles.fieldLabel}>{isTr ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
            <View style={styles.quickDateRow}>
              <Pressable style={styles.quickDateChip} onPress={() => setEntryDate(toYmd(new Date()))}>
                <Text style={styles.quickDateChipText}>{isTr ? 'Bugün' : 'Today'}</Text>
              </Pressable>
              <Pressable
                style={styles.quickDateChip}
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setEntryDate(toYmd(yesterday));
                }}
              >
                <Text style={styles.quickDateChipText}>{isTr ? 'Dün' : 'Yesterday'}</Text>
              </Pressable>
            </View>
            <TextInput
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-03-22"
              placeholderTextColor="#b1b3ab"
              onFocus={() => setFocusedField('date')}
              onBlur={() => setFocusedField(null)}
              style={[styles.fieldInput, focusedField === 'date' && styles.fieldInputFocused]}
            />

            <Text style={styles.fieldLabel}>{isTr ? 'Not (opsiyonel)' : 'Note (optional)'}</Text>
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

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

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
          </View>
        </Modal>

        {/* ── Bottom-sheet: Weight goal ───────────────────────────────────────── */}
        <Modal
          visible={showGoalModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGoalModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowGoalModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isTr ? 'Hedef Kilo Belirle' : 'Set Weight Goal'}</Text>
              <Pressable onPress={() => setShowGoalModal(false)} style={styles.sheetCloseBtn}>
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
          </View>
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
  },

  // Content
  content: {
    paddingTop: 44,
    paddingHorizontal: 20,
    paddingBottom: 44,
    gap: 20,
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
  headerPetName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.2,
    marginHorizontal: 8,
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
    backgroundColor: '#47664a',
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
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  currentCardLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#5d605a',
    textTransform: 'uppercase',
  },
  currentValueRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
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
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eef6ef',
    borderWidth: 1,
    borderColor: '#d4e8d6',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
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
    color: '#5d605a',
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
    height: 5,
    borderRadius: 999,
    backgroundColor: '#eeeee8',
    overflow: 'hidden',
  },
  goalBarFill: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#47664a',
  },

  referenceLine: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
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
    color: '#5d605a',
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

  // Chart card
  chartCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTouchLayer: {
    borderRadius: 16,
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
  addEntryPill: {
    marginTop: 12,
    marginHorizontal: 4,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addEntryPillText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },

  // Insight cards
  insightCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  insightIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
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
  insightTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#30332e',
    fontWeight: '700',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d605a',
    fontWeight: '400',
  },

  // History card
  historyCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    borderRadius: 10,
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
    borderRadius: 999,
    backgroundColor: '#eeeee8',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyDeltaText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#5d605a',
    fontWeight: '600',
  },

  // Bottom-sheet modal
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#b1b3ab',
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 18,
    lineHeight: 24,
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
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '400',
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 15,
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
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fieldInputNote: {
    height: 76,
    textAlignVertical: 'top',
    paddingTop: 12,
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
    height: 48,
    borderRadius: 14,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sheetSaveBtnText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#fff',
    fontWeight: '700',
  },

  // Header placeholder (fills space when no expense badge)
  headerPlaceholder: {
    width: 80,
  },

  // SET GOAL card (no goal set)
  setGoalCard: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#eef6ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.15)',
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
    backgroundColor: '#eef6ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.15)',
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
