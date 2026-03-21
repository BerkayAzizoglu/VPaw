import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

export type WeightPoint = {
  label: string;
  value: number;
  date: string;
  change: string;
};

type WeightTrackingScreenProps = {
  onBack: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVetVisits?: () => void;
  petName: string;
  entries: WeightPoint[];
  onAddEntry: (value: number) => void;
};

const yMin = 4.5;
const yMax = 6;
const CHART_HEIGHT = 160;
const CHART_INSET = 10;
const AnimatedPath = Animated.createAnimatedComponent(Path);

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

export default function WeightTrackingScreen({ onBack, onOpenHealthRecords, onOpenVetVisits, petName, entries, onAddEntry }: WeightTrackingScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(entries.length - 1, 0));
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const lineAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(240, width - 96);
  const chartHeight = CHART_HEIGHT;

  useEffect(() => {
    setSelectedIndex(Math.max(entries.length - 1, 0));
  }, [entries.length]);

  const chart = useMemo(() => {
    const safeEntries = entries.length > 0 ? entries : [{ label: 'Today', value: 0, date: 'Today', change: 'Stable' }];
    const usableWidth = chartWidth - CHART_INSET * 2;
    const usableHeight = chartHeight - CHART_INSET * 2;
    const xStep = safeEntries.length > 1 ? usableWidth / (safeEntries.length - 1) : 0;
    const points = safeEntries.map((p, idx) => {
      const x = CHART_INSET + idx * xStep;
      const normalized = (p.value - yMin) / (yMax - yMin);
      const y = chartHeight - CHART_INSET - Math.max(0, Math.min(1, normalized)) * usableHeight;
      return { x, y };
    });

    const linePath = buildSmoothPath(points);
    const baseY = chartHeight - CHART_INSET;
    const areaPath = `${linePath} L ${chartWidth - CHART_INSET} ${baseY} L ${CHART_INSET} ${baseY} Z`;
    const selected = points[Math.min(selectedIndex, points.length - 1)] ?? points[0];
    const lineLength = computePolylineLength(points);

    return { points, linePath, areaPath, selected, lineLength };
  }, [entries, selectedIndex, chartHeight, chartWidth]);

  useEffect(() => {
    lineAnim.setValue(0);
    Animated.timing(lineAnim, {
      toValue: 1,
      duration: 620,
      useNativeDriver: false,
    }).start();
  }, [entries.length, lineAnim]);

  const lineDashOffset = lineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [chart.lineLength, 0],
  });

  const updateSelectionFromX = (locationX: number) => {
    if (entries.length <= 1) {
      setSelectedIndex(0);
      setScrubX(CHART_INSET);
      return;
    }

    const clampedX = Math.max(CHART_INSET, Math.min(chartWidth - CHART_INSET, locationX));
    setScrubX(clampedX);

    const ratio = (clampedX - CHART_INSET) / (chartWidth - CHART_INSET * 2);
    const idx = Math.round(ratio * (entries.length - 1));
    setSelectedIndex(idx);
  };

  const interpolatedSample = useMemo(() => {
    if (!isScrubbing || scrubX == null || entries.length === 0) return null;
    if (entries.length === 1) return { value: entries[0].value, date: entries[0].date, x: scrubX };

    const ratio = Math.max(0, Math.min(1, (scrubX - CHART_INSET) / (chartWidth - CHART_INSET * 2)));
    const segment = ratio * (entries.length - 1);
    const left = Math.floor(segment);
    const right = Math.min(entries.length - 1, left + 1);
    const t = segment - left;

    const leftEntry = entries[left];
    const rightEntry = entries[right];
    const value = leftEntry.value + (rightEntry.value - leftEntry.value) * t;

    const leftDate = parseEntryDate(leftEntry.date);
    const rightDate = parseEntryDate(rightEntry.date);
    let date = leftEntry.date;
    if (leftDate && rightDate) {
      const ms = leftDate.getTime() + (rightDate.getTime() - leftDate.getTime()) * t;
      date = new Date(ms).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return { value, date, x: scrubX };
  }, [entries, isScrubbing, scrubX, chartWidth]);

  const selectedWeight = entries[Math.min(selectedIndex, Math.max(entries.length - 1, 0))];
  const displayedValue = interpolatedSample?.value ?? selectedWeight?.value ?? 0;
  const displayedDate = interpolatedSample?.date ?? selectedWeight?.date ?? 'No date';

  const normalizedDisplayed = (displayedValue - yMin) / (yMax - yMin);
  const displayedY = chartHeight - CHART_INSET - Math.max(0, Math.min(1, normalizedDisplayed)) * (chartHeight - CHART_INSET * 2);
  const displayedX = interpolatedSample?.x ?? chart.selected.x;

  const latestWeight = entries[entries.length - 1];
  const deltaFromCurrent = latestWeight ? displayedValue - latestWeight.value : 0;
  const comparisonText = Math.abs(deltaFromCurrent) < 0.01
    ? 'Current'
    : `${deltaFromCurrent > 0 ? '+' : ''}${deltaFromCurrent.toFixed(1)} kg vs current`;

  const saveEntry = () => {
    const parsed = Number(newWeight.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Enter a valid weight in kg.');
      return;
    }

    onAddEntry(parsed);
    setNewWeight('');
    setFormError(null);
    setShowAdd(false);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!isScrubbing}>
        <View style={styles.headerRow}>
          <Pressable style={styles.topIconBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#808080" />
          </Pressable>

          <View style={styles.headerTitles}>
            <Text style={styles.petName}>{petName}</Text>
            <Text style={styles.petSub}>Weight tracking</Text>
          </View>

          <Pressable style={styles.topIconBtn} onPress={() => setShowAdd(true)}>
            <Icon kind="plus" size={20} color="#808080" />
          </Pressable>
        </View>

        <View style={styles.currentCard}>
          <View style={styles.currentHeader}>
            <View style={styles.currentIconWrap}>
              <Icon kind="up" size={16} color="#7f8f88" />
            </View>
            <Text style={styles.currentHeaderText}>CURRENT WEIGHT</Text>
          </View>

          <View style={styles.currentValueRow}>
            <Text style={styles.currentValue}>{displayedValue.toFixed(1)} <Text style={styles.currentUnit}>kg</Text></Text>
            <View style={styles.changePill}>
              <Icon kind="spark" size={10} color="#2e7d32" />
              <Text style={styles.changePillText}>{comparisonText}</Text>
            </View>
          </View>

          <Text style={styles.currentSub}>{displayedDate}</Text>
        </View>

        <Text style={styles.sectionTitle}>Last 90 Days</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartWrap}>
            <View
              style={[styles.chartTouchLayer, { width: chartWidth, height: chartHeight }]}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
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
            {entries.map((point, idx) => (
              <Pressable key={`${point.label}-${idx}`} onPress={() => setSelectedIndex(idx)} style={styles.xLabelBtn}>
                <Text style={[styles.xLabel, selectedIndex === idx && styles.xLabelActive]}>{point.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Smart Insights</Text>
        <Pressable style={styles.insightCard} onPress={onOpenHealthRecords}>
          <View style={[styles.insightIconWrap, styles.insightIconGood]}>
            <Icon kind="check" size={20} color="#2e7d32" />
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>Within healthy range</Text>
            <Text style={styles.insightText}>{petName}'s weight aligns perfectly with the breed's ideal bracket.</Text>
          </View>
        </Pressable>

        <Pressable style={styles.insightCard} onPress={onOpenVetVisits}>
          <View style={styles.insightIconWrap}>
            <Icon kind="left" size={20} color="#6f6f6f" />
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightTitle}>Weight stable over 2 weeks</Text>
            <Text style={styles.insightText}>No sudden changes detected. Maintain current diet.</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.historyCard}>
          {entries.slice().reverse().map((item, idx) => (
            <View key={`${item.date}-${idx}`} style={[styles.historyRow, idx !== entries.length - 1 && styles.historyDivider]}>
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

      {showAdd ? (
        <View style={styles.addSheet}>
          <View style={styles.addSheetHeader}>
            <Text style={styles.addSheetTitle}>Add Weight Entry</Text>
            <Pressable onPress={() => { setShowAdd(false); setFormError(null); }}>
              <Icon kind="close" size={18} color="#7a7a7a" />
            </Pressable>
          </View>
          <TextInput
            value={newWeight}
            onChangeText={setNewWeight}
            keyboardType="decimal-pad"
            placeholder="e.g. 5.3"
            placeholderTextColor="#9b9b9b"
            style={styles.addInput}
          />
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <Pressable style={styles.addSaveBtn} onPress={saveEntry}>
            <Text style={styles.addSaveText}>Save</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Icon kind="plus" size={20} color="#faf8f5" />
        <Text style={styles.addText}>Add entry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  content: {
    paddingTop: 44,
    paddingHorizontal: 24,
    paddingBottom: 110,
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
    fontSize: 60,
    lineHeight: 64,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -1.1,
  },
  currentUnit: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '500',
    color: '#787878',
  },
  changePill: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  changePillText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#2e7d32',
    letterSpacing: 0.3,
  },
  currentSub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  sectionTitle: {
    marginLeft: 4,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '600',
    color: 'rgba(45,45,45,0.9)',
    letterSpacing: 0.4,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartWrap: {
    alignItems: 'center',
  },
  chartTouchLayer: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  xLabelsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  xLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#787878',
  },
  xLabelActive: {
    color: '#2d2d2d',
    fontWeight: '600',
  },
  insightCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168,197,181,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightIconGood: {
    backgroundColor: '#e8f5e9',
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 22,
    lineHeight: 26,
    color: '#2d2d2d',
    fontWeight: '600',
  },
  insightText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: '#787878',
  },
  historyCard: {
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  historyRow: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.02)',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  historyDateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232,227,219,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDate: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(45,45,45,0.9)',
    fontWeight: '500',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyWeight: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  historyDelta: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  addBtn: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 26,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  addText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#fff',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  addSheet: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 90,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  addSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSheetTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  addInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45,45,45,0.16)',
    backgroundColor: '#faf8f5',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#2d2d2d',
  },
  formError: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#b55858',
  },
  addSaveBtn: {
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSaveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});









