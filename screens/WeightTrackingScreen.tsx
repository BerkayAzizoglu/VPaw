import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
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
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';

export type WeightPoint = {
  label: string;
  value: number;
  date: string;
  change: string;
};

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
};

type WeightReference = {
  min: number;
  max: number;
  note: string;
};

const CHART_HEIGHT = 160;
const CHART_INSET = 10;
const AnimatedPath = Animated.createAnimatedComponent(Path);

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

export default function WeightTrackingScreen({ onBack, backPreview, previewMode = false, onOpenHealthRecords, onOpenVetVisits, petName, petType, petBreed, microchip, entries, onAddEntry }: WeightTrackingScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).weightTracking;

  const [selectedIndex, setSelectedIndex] = useState(Math.max(entries.length - 1, 0));
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [entryDate, setEntryDate] = useState(toYmd(new Date()));
  const [entryNote, setEntryNote] = useState('');
  const [focusedField, setFocusedField] = useState<'weight' | 'date' | 'note' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const lineAnim = useRef(new Animated.Value(0)).current;
  const savePressScale = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(240, width - 96);
  const chartHeight = CHART_HEIGHT;
  const edgeSwipeResponder = useEdgeSwipeBack({
    onBack,
    enabled: !previewMode && !isScrubbing && !focusedField,
    edgeWidth: 24,
    triggerDx: 70,
    maxDy: 30,
  });

  const reference = useMemo(() => getWeightReference(petType, petBreed, copy.refs), [petType, petBreed, copy.refs]);
  const microchipDisplay = microchip && microchip.trim().length > 0
    ? microchip
    : (locale === 'tr' ? 'Tanımlı değil' : 'Not set');

  useEffect(() => {
    setSelectedIndex(Math.max(entries.length - 1, 0));
  }, [entries.length]);

  const safeEntries = entries.length > 0 ? entries : [{ label: copy.todayFallback, value: reference.min, date: copy.todayFallback, change: copy.stableFallback }];

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
      date = new Date(ms).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return { value, date, x: scrubX };
  }, [safeEntries, isScrubbing, scrubX, chartWidth, locale]);

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
    : `${deltaFromCurrent > 0 ? '+' : ''}${deltaFromCurrent.toFixed(1)} kg ${copy.currentSuffix}`;

  const rangeText = `${reference.min.toFixed(1)} - ${reference.max.toFixed(1)} kg`;
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

  const saveEntry = () => {
    const parsed = Number(newWeight.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError(copy.enterValidWeight);
      return;
    }
    const parsedDate = new Date(`${entryDate.trim()}T12:00:00.000Z`);
    if (!Number.isFinite(parsedDate.getTime())) {
      setFormError(locale === 'tr' ? 'Lütfen tarihi YYYY-AA-GG formatında girin.' : 'Please enter date as YYYY-MM-DD.');
      return;
    }

    onAddEntry(parsed, {
      date: parsedDate.toISOString(),
      note: entryNote.trim() || undefined,
    });
    setNewWeight('');
    setEntryDate(toYmd(new Date()));
    setEntryNote('');
    setFormError(null);
    setShowAdd(false);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!previewMode && !isScrubbing && !edgeSwipeResponder.isSwiping}>
        <View style={styles.headerRow}>
          <Pressable style={styles.topIconBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#808080" />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.petName}>{petName}</Text>
            <Text style={styles.petSub}>{copy.subtitle}</Text>
          </View>

          <View style={styles.topIconBtnPlaceholder} />
        </View>

        <View style={styles.currentCard}>
          <View style={styles.currentHeader}>
            <View style={styles.currentIconWrap}>
              <Icon kind="up" size={16} color="#7f8f88" />
            </View>
            <Text style={styles.currentHeaderText}>{copy.currentWeight}</Text>
          </View>

          <View style={styles.currentValueRow}>
            <Text style={styles.currentValue}>{displayedValue.toFixed(1)} <Text style={styles.currentUnit}>kg</Text></Text>
            <View style={styles.changePill}>
              <Icon kind="spark" size={10} color="#2e7d32" />
              <Text style={styles.changePillText}>{comparisonText}</Text>
            </View>
          </View>

          <Text style={styles.currentSub}>{displayedDate}</Text>
          <Text style={styles.referenceLine}>{copy.healthyReferencePrefix} ({petBreed ?? petType ?? 'Pet'}): {rangeText}</Text>
          <Text style={styles.microchipLine}>{locale === 'tr' ? 'Mikroçip: ' : 'Microchip: '}{microchipDisplay}</Text>
          <Text style={styles.referenceNote}>{reference.note}</Text>
        </View>

        <Text style={styles.sectionTitle}>{copy.last90Days}</Text>
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
                    <Stop offset="0" stopColor="#2d2d2d" stopOpacity="0.22" />
                    <Stop offset="1" stopColor="#2d2d2d" stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                <Rect
                  x={CHART_INSET}
                  y={refBandY}
                  width={chartWidth - CHART_INSET * 2}
                  height={Math.max(2, refBandH)}
                  fill="rgba(76, 175, 80, 0.10)"
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
                  stroke="#a8c5b5"
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
                  stroke="rgba(168,197,181,0.24)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />

                <Circle cx={displayedX} cy={displayedY} r={isScrubbing ? 8.5 : 7.2} fill="#ffffff" stroke="#a8c5b5" strokeWidth={2} />
                <Circle cx={displayedX} cy={displayedY} r={isScrubbing ? 3.6 : 3} fill="#a8c5b5" />
              </Svg>
            </View>
          </View>

          <View style={styles.xLabelsRow}>
            {safeEntries.map((point, idx) => (
              <Pressable key={`${point.label}-${idx}`} onPress={() => setSelectedIndex(idx)} style={styles.xLabelBtn}>
                <Text style={[styles.xLabel, selectedIndex === idx && styles.xLabelActive]}>{point.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.inlineToggle} onPress={() => { setShowAdd((prev) => !prev); setFormError(null); }}>
            <Icon kind={showAdd ? 'close' : 'plus'} size={16} color="#faf8f5" />
            <Text style={styles.inlineToggleText}>{showAdd ? (locale === 'tr' ? 'Girişi Kapat' : 'Close Entry') : (locale === 'tr' ? 'Kilo Girişi Ekle' : 'Add Weight Entry')}</Text>
          </Pressable>
        </View>

        {showAdd ? (
          <View style={styles.inlineEntryCard}>
            <Text style={styles.inlineEntryTitle}>{copy.addWeightEntry}</Text>
            <Text style={styles.addSheetHint}>{locale === 'tr' ? 'Grafik ile bağlantılı, tarihli bir kayıt ekleyin.' : 'Add a dated entry linked to this chart.'}</Text>

            <Text style={styles.addFieldLabel}>{locale === 'tr' ? 'Ağırlık (kg)' : 'Weight (kg)'}</Text>
            <TextInput
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder={copy.weightPlaceholder}
              placeholderTextColor="#9b9b9b"
              onFocus={() => setFocusedField('weight')}
              onBlur={() => setFocusedField(null)}
              style={[styles.addInput, focusedField === 'weight' && styles.addInputFocused]}
            />

            <Text style={styles.addFieldLabel}>{locale === 'tr' ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
            <View style={styles.quickDateRow}>
              <Pressable style={styles.quickDateChip} onPress={() => setEntryDate(toYmd(new Date()))}>
                <Text style={styles.quickDateChipText}>{locale === 'tr' ? 'Bugün' : 'Today'}</Text>
              </Pressable>
              <Pressable
                style={styles.quickDateChip}
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setEntryDate(toYmd(yesterday));
                }}
              >
                <Text style={styles.quickDateChipText}>{locale === 'tr' ? 'Dün' : 'Yesterday'}</Text>
              </Pressable>
            </View>
            <TextInput
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-03-22"
              placeholderTextColor="#9b9b9b"
              onFocus={() => setFocusedField('date')}
              onBlur={() => setFocusedField(null)}
              style={[styles.addInput, focusedField === 'date' && styles.addInputFocused]}
            />

            <Text style={styles.addFieldLabel}>{locale === 'tr' ? 'Not (opsiyonel)' : 'Note (optional)'}</Text>
            <TextInput
              value={entryNote}
              onChangeText={setEntryNote}
              placeholder={locale === 'tr' ? 'Örn. yemek değişti, aktivite arttı...' : 'e.g. diet changed, activity increased...'}
              placeholderTextColor="#9b9b9b"
              onFocus={() => setFocusedField('note')}
              onBlur={() => setFocusedField(null)}
              multiline
              style={[styles.addInput, styles.addInputNote, focusedField === 'note' && styles.addInputFocused]}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <Animated.View style={{ transform: [{ scale: savePressScale }] }}>
              <Pressable
                style={styles.addSaveBtn}
                onPress={saveEntry}
                onPressIn={() => Animated.timing(savePressScale, { toValue: 0.98, duration: 90, useNativeDriver: true }).start()}
                onPressOut={() => Animated.timing(savePressScale, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
              >
                <Text style={styles.addSaveText}>{locale === 'tr' ? 'Kaydı Kaydet' : 'Save Entry'}</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{copy.smartInsights}</Text>
        <Pressable style={styles.insightCard} onPress={onOpenHealthRecords}>
          <View style={[styles.insightIconWrap, rangeStatus === 'within' ? styles.insightIconGood : styles.insightIconWarn]}>
            <Icon kind={rangeStatus === 'within' ? 'check' : 'left'} size={20} color={rangeStatus === 'within' ? '#2e7d32' : '#9a6a2f'} />
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>{primaryInsightTitle}</Text>
            <Text style={styles.insightText}>{primaryInsightText}</Text>
          </View>
        </Pressable>

        <Pressable style={styles.insightCard} onPress={onOpenVetVisits}>
          <View style={styles.insightIconWrap}>
            <Icon kind="left" size={20} color="#6f6f6f" />
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>{copy.referenceAwareTitle}</Text>
            <Text style={styles.insightText}>{copy.referenceAwareBody}</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>{copy.history}</Text>
        <View style={styles.historyCard}>
          {safeEntries.slice().reverse().map((item, idx) => (
            <View key={`${item.date}-${idx}`} style={[styles.historyRow, idx !== safeEntries.length - 1 && styles.historyDivider]}>
              <View style={styles.historyLeft}>
                <View style={styles.historyDateIcon}>
                  <Icon kind="calendar" size={18} color="#8c8c8c" />
                </View>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyWeight}>{item.value.toFixed(1)} kg</Text>
                <Text style={styles.historyDelta}>{item.change}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frontLayer: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 44,
    paddingHorizontal: 24,
    paddingBottom: 44,
    gap: 20,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f1ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitles: {
    flex: 1,
    paddingHorizontal: 12,
  },
  petName: {
    fontSize: 35,
    lineHeight: 38,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.6,
  },
  petSub: {
    marginTop: 1,
    fontSize: 22,
    lineHeight: 26,
    color: '#787878',
    fontWeight: '500',
  },
  currentCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(168,197,181,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentHeaderText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.65,
    color: 'rgba(120,120,120,0.8)',
  },
  currentValueRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  currentValue: {
    fontSize: 52,
    lineHeight: 56,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -1,
  },
  currentUnit: {
    fontSize: 33,
    lineHeight: 36,
    fontWeight: '500',
    color: '#8a8a8a',
  },
  changePill: {
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(129, 199, 132, 0.28)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  changePillText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#2e7d32',
    fontWeight: '700',
  },
  currentSub: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 28,
    color: '#4e4e4e',
    fontWeight: '500',
  },
  referenceLine: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#627362',
    fontWeight: '700',
  },
  microchipLine: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#6c6c6c',
    fontWeight: '600',
  },
  referenceNote: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#7b7b7b',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 34,
    lineHeight: 38,
    color: '#2d2d2d',
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
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
    color: '#9b9b9b',
    fontWeight: '600',
  },
  xLabelActive: {
    color: '#5f6f67',
  },
  insightCard: {
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  insightIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconGood: {
    backgroundColor: 'rgba(129, 199, 132, 0.22)',
  },
  insightIconWarn: {
    backgroundColor: 'rgba(255, 193, 7, 0.18)',
  },
  insightBody: {
    flex: 1,
    paddingTop: 2,
    gap: 4,
  },
  insightTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  insightText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#777',
    fontWeight: '500',
  },
  historyCard: {
    borderRadius: 18,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  historyRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyDateIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f3f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDate: {
    fontSize: 22,
    lineHeight: 25,
    color: '#3f3f3f',
    fontWeight: '500',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyWeight: {
    fontSize: 22,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  historyDelta: {
    fontSize: 16,
    lineHeight: 18,
    color: '#8a8a8a',
    fontWeight: '500',
  },
  inlineToggle: {
    marginTop: 10,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineToggleText: {
    color: '#faf8f5',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  inlineEntryCard: {
    marginTop: -4,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inlineEntryTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  addSheetHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7a7a7a',
    fontWeight: '500',
  },
  addFieldLabel: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#747474',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  addInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#2d2d2d',
    backgroundColor: '#fafafa',
  },
  addInputFocused: {
    borderColor: 'rgba(168,197,181,0.95)',
    backgroundColor: '#fff',
    shadowColor: '#9bb7a7',
    shadowOpacity: 0.22,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addInputNote: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDateChip: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#f8f8f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateChipText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#5f5f5f',
    fontWeight: '700',
  },
  formError: {
    fontSize: 12,
    lineHeight: 16,
    color: '#c15a5a',
    fontWeight: '600',
  },
  addSaveBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSaveText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#fff',
    fontWeight: '700',
  },
});





