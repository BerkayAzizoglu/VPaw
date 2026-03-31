import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBreedHealthEntry, type BreedHealthEntry, type DailyCareCategory } from '../lib/breedHealthData';
import { generateBreedInsight } from '../lib/breedInsightsEngine';
import type { AiInsight } from '../lib/insightsEngine';
import AddRecordSheet, { type AddRecordMode } from '../components/AddRecordSheet';
import type { VaccinationsHistoryItem, VaccinationsAttentionCounts, VaccinationsNextUpData, HealthRecordsData } from '../lib/healthMvpModel';
import {
  ChevronRight,
  FileText,
  Files,
  Footprints,
  HeartPulse,
  Home,
  Plus,
  Stethoscope,
  Syringe,
  TrendingUp,
  Utensils,
} from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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
  // Extended fields (v2)
  visitReason?: string;
  visitStatus?: string;  // 'completed' | 'planned' | 'canceled'
  clinicName?: string;
  vetName?: string;
  fee?: number;
  feeCurrency?: string;
  batchNumber?: string;
  status?: string;
  valueNumber?: number;
  valueUnit?: string;
  dueDate?: string;
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
  metaLine?: string;
  statusLabel?: string;
};
type HealthHubDomainKey = 'vet' | 'records' | 'vaccines' | 'reminders' | 'weight' | 'documents';
export type HealthHubDomainOverview = Partial<
  Record<HealthHubDomainKey, { countText: string; statusText: string; infoText: string }>
>;
export type HealthHubAreaCard = {
  key: AreaRowKey;
  title: string;
  subtitle: string;
  countText?: string;
  statusText?: string;
  highlight:
    | {
        kind: 'date';
        label?: string;
        primary: string;
        secondary: string;
        detail?: string;
        attention?: boolean;
      }
    | {
        kind: 'metric';
        label?: string;
        primary: string;
        secondary?: string;
        detail?: string;
        attention?: boolean;
      }
    | {
        kind: 'text';
        label?: string;
        primary: string;
        secondary?: string;
        detail?: string;
        attention?: boolean;
      };
};
type HealthHubScreenProps = {
  scrollToTopSignal?: number;
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
  onCreateFlowClosed?: (result: 'saved' | 'cancelled', payload?: AddHealthRecordPayload) => void;
  onDeleteRecord?: (timelineItemId: string) => void;
  onOpenVetVisits?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVaccines?: () => void;
  onOpenWeightTracking?: () => void;
  onAddWeightEntry?: () => void;
  onOpenDocuments?: () => void;
  domainOverview?: HealthHubDomainOverview;
  areaCards?: HealthHubAreaCard[];
  documentsPreview?: Array<{ id: string; title: string; date: string; type: string; contextLine?: string }>;
  topInsights?: AiInsight[];
  onOpenInsights?: () => void;
  medicationCourses?: Array<{ id: string; name: string; startDate: string; status: string; dose?: number; doseUnit?: string; frequency?: string; endDate?: string }>;
  onCompleteMedication?: (id: string) => void;
  onDeleteMedication?: (id: string) => void;
  weightGoal?: number;
  locale?: 'en' | 'tr';
  petBreed?: string;
  petType?: 'Dog' | 'Cat';
  petName?: string;
  petAvatarUri?: string;
  isPremium?: boolean;
  onUpgradePremium?: () => void;
  vaccineHistoryItems?: VaccinationsHistoryItem[];
  vaccineAttentionCounts?: VaccinationsAttentionCounts;
  vaccineNextUpData?: VaccinationsNextUpData;
  healthRecordsData?: HealthRecordsData;
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
    start: '#112b36',
    end: '#18444d',
    iconBg: 'rgba(241,255,255,0.10)',
    iconTint: '#e7f8ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.78)',
    badgeBg: 'rgba(244,255,255,0.10)',
    badgeText: '#88d3d2',
    statusText: 'rgba(200,227,232,0.88)',
    chevron: '#86d1cb',
    divider: 'rgba(255,255,255,0.08)',
  },
  records: {
    start: '#112b36',
    end: '#18444d',
    iconBg: 'rgba(241,255,255,0.10)',
    iconTint: '#edf7ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.78)',
    badgeBg: 'rgba(244,255,255,0.10)',
    badgeText: '#9fc0c8',
    statusText: 'rgba(200,227,232,0.88)',
    chevron: '#a0c6cc',
    divider: 'rgba(255,255,255,0.08)',
  },
  vaccines: {
    start: '#112b36',
    end: '#18444d',
    iconBg: 'rgba(241,255,255,0.10)',
    iconTint: '#e4f7ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.78)',
    badgeBg: 'rgba(244,255,255,0.10)',
    badgeText: '#91cdd8',
    statusText: 'rgba(200,227,232,0.88)',
    chevron: '#8bc8d1',
    divider: 'rgba(255,255,255,0.08)',
  },
  weight: {
    start: '#112b36',
    end: '#18444d',
    iconBg: 'rgba(241,255,255,0.10)',
    iconTint: '#e6f8ff',
    titleColor: '#f2f8fb',
    subColor: 'rgba(223,236,243,0.78)',
    badgeBg: 'rgba(244,255,255,0.10)',
    badgeText: '#9ec4c8',
    statusText: 'rgba(200,227,232,0.88)',
    chevron: '#95c5c1',
    divider: 'rgba(255,255,255,0.08)',
  },
  documents: {
    start: '#13323d',
    end: '#1d5059',
    iconBg: 'rgba(244,255,255,0.12)',
    iconTint: '#ebf6fc',
    titleColor: '#f2f8fb',
    subColor: 'rgba(226,238,244,0.82)',
    badgeBg: 'rgba(244,255,255,0.10)',
    badgeText: '#c2d6de',
    statusText: 'rgba(212,232,236,0.9)',
    chevron: '#b9d5de',
    divider: 'rgba(255,255,255,0.08)',
  },
};

const HEALTH_MODULE_CARD_THEMES: Record<AreaRowKey, {
  background: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  watermark: string;
  shadow: string;
}> = {
  vet: {
    background: '#2e4230',
    iconBg: 'rgba(255,255,255,0.15)',
    iconColor: '#f2fbf2',
    badgeBg: 'rgba(255,255,255,0.10)',
    badgeText: '#f2fbf2',
    watermark: 'rgba(255,255,255,0.06)',
    shadow: '#1a2a1c',
  },
  vaccines: {
    background: '#56757c',
    iconBg: 'rgba(255,255,255,0.10)',
    iconColor: '#f2fbff',
    badgeBg: 'rgba(255,255,255,0.12)',
    badgeText: '#f1f7f9',
    watermark: 'rgba(255,255,255,0.06)',
    shadow: '#27434b',
  },
  records: {
    background: '#d8c3a5',
    iconBg: 'rgba(255,255,255,0.24)',
    iconColor: '#6e573c',
    badgeBg: 'rgba(255,255,255,0.22)',
    badgeText: '#6e573c',
    watermark: 'rgba(110,87,60,0.08)',
    shadow: '#a78f72',
  },
  weight: {
    background: '#c99272',
    iconBg: 'rgba(255,255,255,0.14)',
    iconColor: '#fff7f2',
    badgeBg: 'rgba(255,255,255,0.16)',
    badgeText: '#fff8f3',
    watermark: 'rgba(255,255,255,0.08)',
    shadow: '#8f5d42',
  },
  documents: {
    background: '#e9ece8',
    iconBg: 'rgba(255,255,255,0.58)',
    iconColor: '#6e746f',
    badgeBg: 'rgba(255,255,255,0.38)',
    badgeText: '#6e746f',
    watermark: 'rgba(110,116,111,0.07)',
    shadow: '#c8cdc7',
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

function categoryToAreaKey(category: HealthHubCategory): AreaRowKey | null {
  if (category === 'vet') return 'vet';
  if (category === 'vaccine') return 'vaccines';
  if (category === 'record') return 'records';
  if (category === 'weight') return 'weight';
  return null;
}

function statusTone(status: string | undefined) {
  const value = status?.toLowerCase() ?? '';
  if (value.includes('overdue') || value.includes('gecik')) {
    return { bg: '#fde8e3', text: '#a73b21', border: 'rgba(167,59,33,0.14)' };
  }
  if (value.includes('due soon') || value.includes('yaklas')) {
    return { bg: '#fdf2dd', text: '#9b6400', border: 'rgba(155,100,0,0.14)' };
  }
  if (value.includes('up to date') || value.includes('guncel')) {
    return { bg: '#eaf4ec', text: '#416d49', border: 'rgba(65,109,73,0.14)' };
  }
  if (value.includes('monitor')) {
    return { bg: '#eef1fb', text: '#4e5f96', border: 'rgba(78,95,150,0.14)' };
  }
  if (value.includes('planned') || value.includes('plan')) {
    return { bg: '#edf4fa', text: '#41688c', border: 'rgba(65,104,140,0.14)' };
  }
  if (value.includes('resolved')) {
    return { bg: '#f0f2ee', text: '#5d605a', border: 'rgba(93,96,90,0.14)' };
  }
  return { bg: '#f1f3ef', text: '#5d605a', border: 'rgba(93,96,90,0.12)' };
}

function insightPriorityTone(priority: AiInsight['priority']) {
  if (priority === 'high') return { bg: '#fde8e3', text: '#a73b21' };
  if (priority === 'medium') return { bg: '#fdf2dd', text: '#9b6400' };
  return { bg: '#eaf4ec', text: '#416d49' };
}

function FolderHeartIcon({ size = 21, color = '#7aa2b8' }: { size?: number; color?: string }) {
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
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            alignItems: 'center',
            justifyContent: 'center',
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
      </View>
    </View>
  );
}

function CombIcon({ size = 16, color = '#7fc4b8' }: { size?: number; color?: string }) {
  const sw = 1.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="7.2" width="17" height="4.2" rx="2.1" stroke={color} strokeWidth={sw} />
      <Path d="M6 11.4V17.2M9 11.4V17.2M12 11.4V17.2M15 11.4V17.2M18 11.4V16.1" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

function BathroomScaleIcon({ size = 20, color = '#7aa2b8' }: { size?: number; color?: string }) {
  const sw = 1.9;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4.1" y="4.1" width="15.8" height="15.8" rx="4.2" stroke={color} strokeWidth={sw} />
      <Path d="M8.4 11.1C8.9 8.8 10.2 7.7 12 7.7C13.8 7.7 15.1 8.8 15.6 11.1" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Circle cx="12" cy="10.2" r="0.9" fill={color} />
      <Path d="M12 10.2L14 8.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
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
  if (kind === 'weight') return <BathroomScaleIcon size={size} color={colorOverride ?? C.fgWeight} />;
  return <Files size={size} strokeWidth={strokeWidth} color={colorOverride ?? C.fgDocuments} />;
}

const RECORD_TYPES: AddHealthRecordType[] = ['vaccine', 'diagnosis', 'procedure', 'prescription', 'test'];

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

// ─── Breed Insights helpers ───────────────────────────────────────────────────
function DailyCareIcon({ category, size = 16, color = '#7fc4b8' }: { category: DailyCareCategory; size?: number; color?: string }) {
  const sw = 1.85;
  if (category === 'grooming') return <CombIcon size={size} color={color} />;
  if (category === 'exercise') return <Footprints size={size} color={color} strokeWidth={sw} />;
  if (category === 'feeding') return <Utensils size={size} color={color} strokeWidth={sw} />;
  if (category === 'environment') return <Home size={size} color={color} strokeWidth={sw} />;
  return <HeartPulse size={size} color={color} strokeWidth={sw} />;
}

function BreedDnaIcon({ size = 22, color = '#7fc4b8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 3C5.5 3 6 6.5 9 9.5C12 12.5 12.5 16 12.5 16" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M18.5 3C18.5 3 18 6.5 15 9.5C12 12.5 11.5 16 11.5 16" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M5.5 21C5.5 21 6 17.5 9 14.5C12 11.5 12.5 8 12.5 8" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M18.5 21C18.5 21 18 17.5 15 14.5C12 11.5 11.5 8 11.5 8" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M6 10H18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M6 14H18" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function LockIcon({ size = 24, color = '#e0f4f2' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 11h14v11H5z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 16v2" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Breed teaser card shown in the Health Hub scroll view */
function BreedTeaserRow({
  entry,
  isPremium,
  onPress,
  isTr,
  avatarUri,
  insightText,
  petName,
}: {
  entry: BreedHealthEntry;
  isPremium: boolean;
  onPress: () => void;
  isTr: boolean;
  avatarUri?: string;
  insightText?: string;
  petName?: string;
}) {
  const typeLabel = entry.petType === 'Dog' ? (isTr ? 'Köpek' : 'Dog') : (isTr ? 'Kedi' : 'Cat');
  const weightLabel = `${entry.weightRangeKg[0]}–${entry.weightRangeKg[1]} kg`;
  const lifespanLabel = `${entry.lifespanYears[0]}–${entry.lifespanYears[1]} ${isTr ? 'yıl' : 'yrs'}`;
  const topRisks = entry.healthRisks.slice(0, 3);
  const pressScale = useRef(new Animated.Value(1)).current;

  // When the avatar is the pet's photo, the header reads as the pet — not breed data.
  // Primary = pet name, secondary = breed label. When no pet name, fall back to breed.
  const hasPetIdentity = !!avatarUri && !!petName;
  const primaryLabel = hasPetIdentity ? petName! : entry.breed;
  const secondaryLabel = hasPetIdentity
    ? `${isTr ? 'Irk' : 'Breed'}: ${entry.breed}`
    : `${typeLabel}  ·  ${weightLabel}  ·  ${lifespanLabel}`;

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
    <Pressable
      style={bs.teaserRow}
      onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 7 }).start()}
      onPress={onPress}
      android_ripple={{ color: 'rgba(127,196,184,0.10)' }}
    >
      {/* Header row: avatar/icon + pet name (or breed) + chevron */}
      <View style={bs.teaserHeaderRow}>
        {avatarUri ? (
          <View style={bs.teaserAvatarFrame}>
            <Image source={{ uri: avatarUri }} style={bs.teaserAvatar} resizeMode="cover" />
          </View>
        ) : (
          <View style={bs.teaserIconBox}>
            <BreedDnaIcon size={19} color="#7fc4b8" />
          </View>
        )}
        <View style={bs.teaserBody}>
          <Text style={bs.teaserBreedName} numberOfLines={1}>{primaryLabel}</Text>
          <Text style={bs.teaserSub} numberOfLines={1}>{secondaryLabel}</Text>
        </View>
        <ChevronRight size={15} color="rgba(127,196,184,0.5)" strokeWidth={2.2} />
      </View>

      {/* Divider */}
      <View style={bs.teaserDivider} />

      {/* Bottom row */}
      <View style={bs.teaserBottomRow}>
        {/* Breed-standard stats — clearly separate from pet identity above */}
        {hasPetIdentity ? (
          <Text style={bs.teaserStandardLine} numberOfLines={1}>
            {typeLabel}  ·  {weightLabel}  ·  {lifespanLabel}
          </Text>
        ) : null}

        {isPremium ? (
          <>
            <View style={bs.teaserChips}>
              {topRisks.map((r, i) => (
                <View key={i} style={bs.teaserChip}>
                  <Text style={bs.teaserChipText} numberOfLines={1}>
                    {isTr ? r.label_tr.split(' ')[0] : r.label.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>
            {insightText ? (
              <Text style={bs.teaserInsightPreview} numberOfLines={2}>{insightText}</Text>
            ) : null}
          </>
        ) : (
          <View style={bs.teaserLockRow}>
            <View style={bs.teaserLockBadge}>
              <LockIcon size={11} color="#88c4bc" />
              <Text style={bs.teaserLockText}>Pro</Text>
            </View>
            <Text style={bs.teaserLockHint} numberOfLines={1}>
              {isTr ? 'Irk sağlık profilini kilidi aç' : 'Unlock breed health profile'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
    </Animated.View>
  );
}

const bs = StyleSheet.create({
  // ── Breed teaser card (in scroll) ──────────────────────────────────────────
  teaserRow: {
    marginHorizontal: 0,
    borderRadius: 20,
    backgroundColor: '#0f2d3a',
    borderWidth: 1,
    borderColor: 'rgba(127,196,184,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  teaserRowPressed: {
    backgroundColor: '#0d2736',
  },
  teaserHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 14,
  },
  teaserAvatarFrame: {
    width: 40,
    height: 40,
    borderRadius: 11,
    overflow: 'hidden',
    flexShrink: 0,
  },
  teaserAvatar: {
    width: '100%',
    height: '100%',
  },
  teaserIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(127,196,184,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(127,196,184,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  teaserBody: {
    flex: 1,
    minWidth: 0,
  },
  teaserBreedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dff2ef',
    letterSpacing: -0.2,
  },
  teaserSub: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(160,210,204,0.65)',
    fontWeight: '500',
  },
  teaserDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(127,196,184,0.10)',
    marginHorizontal: 16,
  },
  teaserBottomRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 15,
    gap: 9,
  },
  teaserChips: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  teaserChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(163,67,33,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(220,100,60,0.20)',
  },
  teaserChipText: {
    fontSize: 10.5,
    color: '#f0b49a',
    fontWeight: '700',
  },
  teaserStandardLine: {
    fontSize: 10.5,
    color: 'rgba(127,196,184,0.38)',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  teaserInsightPreview: {
    fontSize: 11.5,
    color: 'rgba(160,210,204,0.52)',
    fontWeight: '400',
    lineHeight: 17,
  },
  teaserLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teaserLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(127,196,184,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(127,196,184,0.18)',
  },
  teaserLockText: {
    fontSize: 10.5,
    color: '#88c4bc',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  teaserLockHint: {
    fontSize: 11,
    color: 'rgba(136,196,188,0.45)',
    fontWeight: '400',
    flex: 1,
  },

  // ── Bottom sheet ───────────────────────────────────────────────────────────
  sheet: {
    backgroundColor: '#0b1f2b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 60,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127,196,184,0.25)',
  },
  sheetAvatarFrame: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    flexShrink: 0,
  },
  sheetAvatar: {
    width: '100%',
    height: '100%',
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sheetIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(127,196,184,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(127,196,184,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetPetName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(160,210,204,0.6)',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  sheetBreedName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#dff2ef',
    letterSpacing: -0.4,
  },
  sheetBreedSub: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(160,210,204,0.68)',
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(127,196,184,0.10)',
    marginBottom: 18,
  },
  // AI observation card
  observationCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(180,130,60,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(200,160,80,0.18)',
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  observationIconCol: {
    paddingTop: 1,
  },
  observationTextCol: {
    flex: 1,
  },
  observationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(210,170,90,0.8)',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  observationText: {
    fontSize: 13,
    lineHeight: 19.5,
    color: 'rgba(230,210,170,0.88)',
    fontWeight: '400',
  },
  // Section mini label
  miniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(127,196,184,0.55)',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  miniLabelSpaced: {
    marginTop: 18,
  },
  // Risk chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(163,67,33,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(220,100,60,0.22)',
  },
  chipText: {
    fontSize: 12,
    color: '#f4bfaa',
    fontWeight: '600',
  },
  // Daily care items
  careItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  careIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(127,196,184,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  careText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18.5,
    color: 'rgba(196,230,226,0.82)',
    fontWeight: '500',
    paddingTop: 5,
  },
  // Care tips (bullet)
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 7,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#7fc4b8',
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18.5,
    color: 'rgba(196,230,226,0.82)',
    fontWeight: '500',
  },
  // Close button
  sheetCloseRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sheetCloseBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: 'rgba(127,196,184,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(127,196,184,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7fc4b8',
  },
  // Premium lock overlay (over sheet)
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  lockOverlayTint: {
    backgroundColor: 'rgba(5,16,24,0.55)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  lockContent: {
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  lockIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(127,196,184,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(127,196,184,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e6f6f4',
    letterSpacing: -0.3,
  },
  lockSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(196,230,226,0.75)',
    textAlign: 'center',
    fontWeight: '400',
  },
  lockBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#7fc4b8',
    shadowColor: '#7fc4b8',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  lockBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#071820',
  },
});

// ─── Vaccine category sub-components ─────────────────────────────────────────
const HUB_SEGMENT_ACCENTS = {
  allergies:  { accent: '#a63050', accentBg: '#fdf0f3', label: 'Allergies', labelTr: 'Alerjiler' },
  diagnoses:  { accent: '#1e6b85', accentBg: '#edf6fa', label: 'Diagnoses', labelTr: 'Tanılar' },
  labResults: { accent: '#5242a0', accentBg: '#f0eef8', label: 'Lab Results', labelTr: 'Lab Sonuçları' },
} as const;

function HubFeaturedVaccineCard({ data, isTr }: { data: VaccinationsNextUpData; isTr: boolean }) {
  const dayStr = data.date.split(/[.\-\/\s]/)[0] ?? '—';
  return (
    <View style={hvs.featuredCard}>
      <View style={hvs.featuredBlob} />
      <View style={hvs.featuredTop}>
        <View style={hvs.featuredLeft}>
          <View style={hvs.glassTag}>
            <Text style={hvs.glassTagText}>{isTr ? 'YAKLAŞAN' : 'UPCOMING'}</Text>
          </View>
          <Text style={hvs.featuredTitle}>{data.name}</Text>
          <Text style={hvs.featuredSub}>{data.subtitle}</Text>
        </View>
        <View style={hvs.featuredDateBox}>
          <Text style={hvs.featuredDateNum}>{dayStr}</Text>
          <Text style={hvs.featuredDateSub}>{data.inWeeks}</Text>
        </View>
      </View>
      <View style={hvs.featuredMeta}>
        <Syringe size={14} color="rgba(255,255,255,0.8)" />
        <Text style={hvs.featuredMetaText}>{data.date}</Text>
      </View>
    </View>
  );
}

function HubVaccineCard({ item, isTr: _isTr }: { item: VaccinationsHistoryItem; isTr: boolean }) {
  const isOverdue = item.status === 'overdue';
  const isDueSoon = item.status === 'dueSoon';
  const iconBg = isOverdue ? '#fdf0f0' : isDueSoon ? '#fef6ea' : '#eaf2f4';
  const iconColor = isOverdue ? '#c96a6a' : isDueSoon ? '#c48d42' : '#56757c';
  const pillBg = iconBg;
  const pillBorder = isOverdue ? '#f5dede' : isDueSoon ? '#f5e9d1' : '#c0d8de';
  const pillLabel = isOverdue ? (_isTr ? 'Gecikmiş' : 'Overdue') : isDueSoon ? (_isTr ? 'Yaklaşan' : 'Due soon') : (_isTr ? 'Güncel' : 'Up to date');
  return (
    <View style={hvs.vaccineCard}>
      <View style={[hvs.vaccineIconBox, { backgroundColor: iconBg }]}>
        {isOverdue
          ? <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          : isDueSoon
            ? <Svg width={22} height={22} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} stroke={iconColor} strokeWidth={2} fill="none" /><Path d="M12 6v6l4 2" stroke={iconColor} strokeWidth={2} strokeLinecap="round" fill="none" /></Svg>
            : <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        }
      </View>
      <View style={hvs.vaccineMain}>
        <Text style={hvs.vaccineName}>{item.name}</Text>
        <View style={hvs.vaccineMetaRow}>
          <Text style={hvs.vaccineSub}>{item.subtitle}</Text>
          <View style={hvs.vaccineDot} />
          <Text style={hvs.vaccineDueText}>{item.dueDate}</Text>
        </View>
      </View>
      <View style={[hvs.vaccinePill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
        <Text style={[hvs.vaccinePillText, { color: iconColor }]}>{pillLabel}</Text>
      </View>
    </View>
  );
}

const hvs = StyleSheet.create({
  featuredCard: {
    backgroundColor: '#1e5c6e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 8,
    overflow: 'hidden',
  },
  featuredBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -30,
    right: -20,
  },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  featuredLeft: { flex: 1, marginRight: 12 },
  glassTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  glassTagText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  featuredTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  featuredSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  featuredDateBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 60,
  },
  featuredDateNum: { color: '#fff', fontSize: 22, fontWeight: '700' },
  featuredDateSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  featuredMetaText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  vaccineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  vaccineIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  vaccineMain: { flex: 1 },
  vaccineName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  vaccineMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
  vaccineSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  vaccineDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  vaccineDueText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  vaccinePill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  vaccinePillText: { fontSize: 11, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HealthHubScreen({
  scrollToTopSignal = 0,
  summary,
  timeline,
  initialCategory = 'all',
  categoryResetKey,
  createPreset,
  onPrimaryCta,
  onAddRecord,
  onCreateFlowClosed,
  onDeleteRecord,
  onOpenVetVisits,
  onOpenHealthRecords,
  onOpenVaccines,
  onOpenWeightTracking,
  onAddWeightEntry,
  onOpenDocuments,
  domainOverview,
  areaCards,
  documentsPreview,
  topInsights,
  onOpenInsights,
  medicationCourses,
  onCompleteMedication,
  onDeleteMedication,
  weightGoal,
  locale = 'en',
  petBreed,
  petType,
  petName,
  petAvatarUri,
  isPremium = false,
  onUpgradePremium,
  vaccineHistoryItems,
  vaccineAttentionCounts,
  vaccineNextUpData,
  healthRecordsData,
}: HealthHubScreenProps) {
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();

  // ── local state ──
  const [category, setCategory] = useState<HealthHubCategory>(initialCategory);
  const [selectedItem, setSelectedItem] = useState<HealthHubTimelineItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetMode, setAddSheetMode] = useState<AddRecordMode>('typeSelect');
  const [recordsSegment, setRecordsSegment] = useState<'allergies' | 'diagnoses' | 'labResults'>('allergies');
  const [addSheetPresetTitle, setAddSheetPresetTitle] = useState('');
  const [addSheetPresetType, setAddSheetPresetType] = useState<AddHealthRecordType>('diagnosis');
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView | null>(null);
  const [breedSheetOpen, setBreedSheetOpen] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(800)).current;
  const sheetBackdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(800);

  const breedSheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          sheetTranslateY.setValue(gs.dy);
          sheetBackdropOpacity.setValue(Math.max(0, 1 - gs.dy / Math.max(sheetHeightRef.current, 1)));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.8) {
          Animated.parallel([
            Animated.spring(sheetTranslateY, { toValue: sheetHeightRef.current, damping: 28, stiffness: 400, useNativeDriver: true }),
            Animated.timing(sheetBackdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => setBreedSheetOpen(false));
        } else {
          Animated.parallel([
            Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 380, mass: 0.85, useNativeDriver: true }),
            Animated.timing(sheetBackdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  function openBreedSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBreedSheetOpen(true);
    sheetTranslateY.setValue(sheetHeightRef.current);
    Animated.parallel([
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 26, stiffness: 380, mass: 0.85, useNativeDriver: true }),
      Animated.timing(sheetBackdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  function closeBreedSheet() {
    Animated.parallel([
      Animated.spring(sheetTranslateY, { toValue: sheetHeightRef.current, damping: 28, stiffness: 400, useNativeDriver: true }),
      Animated.timing(sheetBackdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setBreedSheetOpen(false));
  }

  // ── breed insights (memoised) ──
  const breedEntry = useMemo(
    () => (petBreed ? getBreedHealthEntry(petBreed, petType, { useFallback: true }) : undefined),
    [petBreed, petType],
  );
  const breedInsight = useMemo(
    () =>
      breedEntry
        ? generateBreedInsight({ entry: breedEntry, timeline, summary, weightGoal, locale })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breedEntry, timeline, summary, weightGoal, locale],
  );
  const iconAnimByKeyRef = useRef<Record<string, Animated.Value>>({});
  const cardScaleByKeyRef = useRef<Record<string, Animated.Value>>({});
  const createSavedPayloadRef = useRef<AddHealthRecordPayload | null>(null);
  const headerBtnScale = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();

  useEffect(() => { setCategory(initialCategory); }, [initialCategory, categoryResetKey]);

  useEffect(() => {
    if (!createPreset?.openCreate) return;
    openCreate(createPreset.type ?? 'diagnosis', createPreset.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPreset?.nonce, createPreset?.openCreate]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [scrollToTopSignal]);

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
        title: isTr ? 'Ağırlık Profili' : 'Weight Profile',
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
  const moduleCards = useMemo(
    () => areaCards?.filter((item) => item.key !== 'documents') ?? [],
    [areaCards],
  );
  const documentCard = useMemo(
    () => areaCards?.find((item) => item.key === 'documents'),
    [areaCards],
  );
  const hasDocumentsPreview = !!documentsPreview?.[0]?.title;
  const documentCountValue = Number.parseInt(documentCard?.countText ?? '', 10);
  const documentPrimaryText = !hasDocumentsPreview && (Number.isNaN(documentCountValue) ? false : documentCountValue <= 0)
    ? (isTr ? 'Veri yok' : 'No data')
    : (documentCard?.highlight.primary ?? '');
  const focusedAreaKey = categoryToAreaKey(category);
  const primaryInsight = topInsights?.[0] ?? null;
  const secondaryInsight = topInsights?.[1] ?? null;
  const moduleCardWidth = Math.max(148, Math.floor((width - 22 * 2 - 14) / 2));
  const moduleCardHeight = moduleCardWidth;
  const documentsCardHeight = Math.max(118, Math.min(134, Math.round(moduleCardHeight * 0.66)));
  const compactDateLayout = moduleCardWidth < 182;
  const adaptiveCardTitleSize = moduleCardWidth < 160 ? 13 : moduleCardWidth < 172 ? 14 : 15;
  const adaptiveCardTitleLineHeight = adaptiveCardTitleSize + 3;
  const adaptivePrimarySize = moduleCardWidth < 160 ? 17 : 19;
  const adaptivePrimaryLineHeight = adaptivePrimarySize + 4;
  const adaptiveDateDetailSize = moduleCardWidth < 160 ? 14 : 15;
  const adaptiveCardPadding = moduleCardWidth < 160 ? 14 : 16;
  const adaptiveIconWrapSize = moduleCardWidth < 160 ? 34 : 38;
  const adaptiveIconGlyph = moduleCardWidth < 160 ? 16 : 18;
  const adaptiveDateBadgeSize = moduleCardWidth < 160 ? 58 : 64;
  const adaptiveWatermarkSize = moduleCardWidth < 160 ? 74 : 84;
  const adaptiveCountPillPaddingH = moduleCardWidth < 160 ? 8 : 9;
  const adaptiveCountPillPaddingV = moduleCardWidth < 160 ? 4 : 5;
  const adaptiveCountFontSize = moduleCardWidth < 160 ? 10 : 11;
  const topInset = Math.max(insets.top, 14);
  const topBarHeight = topInset + 56;
  const topChromeHeight = topInset + 58;
  const topChromeOpacity = scrollY.interpolate({
    inputRange: [0, 8, 84],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });
  const headerTitleScale = scrollY.interpolate({
    inputRange: [0, 84, 180],
    outputRange: [1.06, 0.97, 0.9],
    extrapolate: 'clamp',
  });
  const headerTitleTranslateX = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });
  const headerTitleTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [3, 0],
    extrapolate: 'clamp',
  });
  const headerColorBlendOpacity = scrollY.interpolate({
    inputRange: [4, 56, 170],
    outputRange: [0, 0.46, 0.74],
    extrapolate: 'clamp',
  });

  // ── form helpers ──
  const openCreate = (presetType: AddHealthRecordType = 'diagnosis', presetTitle = '') => {
    const mode: AddRecordMode =
      presetType === 'procedure' ? 'vetVisit' :
      presetType === 'vaccine'   ? 'vaccine'  : 'record';
    setAddSheetMode(mode);
    setAddSheetPresetTitle(presetTitle ?? '');
    setAddSheetPresetType(presetType);
    setAddSheetOpen(true);
  };

  const openTypeSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddSheetMode('typeSelect');
    setAddSheetOpen(true);
  };

  const getIconAnim = (key: string) => {
    if (!iconAnimByKeyRef.current[key]) iconAnimByKeyRef.current[key] = new Animated.Value(0);
    return iconAnimByKeyRef.current[key];
  };

  const getCardScale = (key: string) => {
    if (!cardScaleByKeyRef.current[key]) cardScaleByKeyRef.current[key] = new Animated.Value(1);
    return cardScaleByKeyRef.current[key];
  };

  const springDown = (v: Animated.Value, toValue = 0.96) =>
    () => Animated.spring(v, { toValue, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const springUp = (v: Animated.Value) =>
    () => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 7 }).start();


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
    <ExpoLinearGradient
      colors={['#FFFFFF', '#ECE9E6']}
      locations={[0, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={s.screen}
    >
      <Animated.ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[s.content, { paddingTop: topBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={s.heroBlock}>
          {category !== 'all' ? (
            <Pressable style={s.focusChip} onPress={() => setCategory('all')}>
              <Text style={s.focusChipText}>
                {isTr ? `${categoryLabel(category, isTr)} odagi` : `${categoryLabel(category, isTr)} focus`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* ── Health Status Banner ─────────────────────────────────────── */}
        {category === 'all' && (
          <View style={s.statusBannerRow}>
            {(vaccineAttentionCounts?.overdueCount ?? 0) > 0 && (
              <View style={[s.statusPillItem, s.statusPillRed]}>
                <Text style={[s.statusPillItemText, s.statusPillRedText]}>
                  {vaccineAttentionCounts!.overdueCount} {isTr ? 'Gecikmiş' : 'Overdue'}
                </Text>
              </View>
            )}
            {(vaccineAttentionCounts?.dueSoonCount ?? 0) > 0 && (
              <View style={[s.statusPillItem, s.statusPillAmber]}>
                <Text style={[s.statusPillItemText, s.statusPillAmberText]}>
                  {vaccineAttentionCounts!.dueSoonCount} {isTr ? 'Yaklaşan' : 'Due Soon'}
                </Text>
              </View>
            )}
            {(vaccineAttentionCounts?.overdueCount ?? 0) === 0 && (vaccineAttentionCounts?.dueSoonCount ?? 0) === 0 && (
              <View style={[s.statusPillItem, s.statusPillGreen]}>
                <Text style={[s.statusPillItemText, s.statusPillGreenText]}>
                  {isTr ? 'Tümü güncel' : 'All up to date'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        {category === 'all' && (
          <View style={s.quickActionsRow}>
            <Pressable style={s.quickActionChip} onPress={openTypeSelect}>
              <Plus size={14} color={C.primary} strokeWidth={2.4} />
              <Text style={s.quickActionChipText}>{isTr ? 'Kayıt Ekle' : 'Add Record'}</Text>
            </Pressable>
            {(vaccineAttentionCounts?.overdueCount ?? 0) > 0 ? (
              <Pressable
                style={[s.quickActionChip, s.quickActionChipUrgent]}
                onPress={() => { setAddSheetMode('vaccine'); setAddSheetOpen(true); }}
              >
                <Syringe size={14} color="#a73b21" strokeWidth={2.1} />
                <Text style={[s.quickActionChipText, s.quickActionChipUrgentText]}>{isTr ? 'Aşı Ekle' : 'Log Vaccine'}</Text>
              </Pressable>
            ) : (
              <Pressable style={s.quickActionChip} onPress={onAddWeightEntry}>
                <TrendingUp size={14} color={C.primary} strokeWidth={2.1} />
                <Text style={s.quickActionChipText}>{isTr ? 'Kilo Ekle' : 'Log Weight'}</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={[s.moduleCardsGrid, { minHeight: Math.max(moduleCardHeight, 206) * 2 + 14 }]}>
          {moduleCards.map((card) => {
            const entry = hubEntries.find((item) => item.key === card.key);
            if (!entry) return null;
            const active = focusedAreaKey === entry.key;
            const theme = HEALTH_MODULE_CARD_THEMES[entry.key as Exclude<AreaRowKey, 'documents'>];
            const isLightCard = entry.key === 'records';
            const showAttention = !!card.highlight.attention;
            const dateCategoryLabel =
              entry.key === 'vet'
                ? (isTr ? 'Ziyaret' : 'Visit')
                : entry.key === 'vaccines'
                  ? (isTr ? 'Aşı' : 'Vaccine')
                  : '';
            return (
              <Animated.View key={entry.key} style={[s.moduleCardGridItem, { width: moduleCardWidth, transform: [{ scale: getCardScale(entry.key) }] }]}>
                <Pressable
                  style={[
                    s.moduleCard,
                    {
                      backgroundColor: theme.background,
                      shadowColor: theme.shadow,
                      height: moduleCardHeight,
                      paddingHorizontal: adaptiveCardPadding,
                      paddingTop: adaptiveCardPadding,
                      paddingBottom: adaptiveCardPadding,
                    },
                    active && s.moduleCardActive,
                  ]}
                  onPressIn={springDown(getCardScale(entry.key), 0.985)}
                  onPressOut={springUp(getCardScale(entry.key))}
                  onPress={() => entry.onPress?.()}
                >
                  <View style={s.moduleCardWatermark}>
                    <HealthHubCategoryIcon kind={entry.key as Exclude<AreaRowKey, 'documents'>} size={adaptiveWatermarkSize} colorOverride={theme.watermark} />
                  </View>

                  <View style={s.moduleCardContent}>
                    <View style={s.moduleCardHeaderRow}>
                      <View
                        style={[
                          s.moduleCardIcon,
                          {
                            backgroundColor: theme.iconBg,
                            width: adaptiveIconWrapSize,
                            height: adaptiveIconWrapSize,
                            borderRadius: adaptiveIconWrapSize / 2,
                          },
                        ]}
                      >
                        <HealthHubCategoryIcon kind={entry.key as Exclude<AreaRowKey, 'documents'>} size={adaptiveIconGlyph} colorOverride={theme.iconColor} />
                      </View>
                      <View style={s.moduleCardHeaderText}>
                        <Text
                          style={[s.moduleCardTitle, { fontSize: adaptiveCardTitleSize, lineHeight: adaptiveCardTitleLineHeight }, isLightCard && s.moduleCardTitleDark]}
                          numberOfLines={2}
                        >
                          {card.title}
                        </Text>
                      </View>
                    </View>

                    {card.highlight.kind === 'date' ? (
                      <View style={[s.moduleDateBlock, showAttention && s.moduleHighlightAttentionPanel]}>
                        <View style={[s.moduleDateRow, compactDateLayout && s.moduleDateRowCompact]}>
                          <View
                            style={[
                              s.moduleDateBadge,
                              {
                                width: adaptiveDateBadgeSize,
                                minHeight: adaptiveDateBadgeSize,
                                borderRadius: Math.round(adaptiveDateBadgeSize * 0.22),
                                paddingVertical: moduleCardWidth < 160 ? 8 : 9,
                              },
                              isLightCard && s.moduleDateBadgeLight,
                            ]}
                          >
                            <Text style={[s.moduleDatePrimary, s.moduleDatePrimaryCompact, isLightCard && s.moduleDatePrimaryDark, showAttention && s.moduleDatePrimaryAttention]}>
                              {card.highlight.primary}
                            </Text>
                            <Text style={[s.moduleDateSecondary, s.moduleDateSecondaryCompact, isLightCard && s.moduleDateSecondaryDark]}>
                              {card.highlight.secondary}
                            </Text>
                          </View>
                          <View style={[s.moduleDateTextCol, compactDateLayout && s.moduleDateTextColCompact]}>
                            {card.highlight.detail ? (
                              <Text
                                style={[s.moduleMetricPrimary, s.moduleMetricPrimaryCompact, { fontSize: adaptiveDateDetailSize, lineHeight: adaptiveDateDetailSize + 4 }, s.moduleDateDetailText, isLightCard && s.moduleMetricPrimaryDark, showAttention && s.moduleMetricPrimaryAttention]}
                                numberOfLines={compactDateLayout ? 1 : 2}
                              >
                                {card.highlight.detail}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={[s.moduleMetricBlock, showAttention && s.moduleHighlightAttentionPanel]}>
                        <Text
                          style={[s.moduleMetricPrimary, { fontSize: adaptivePrimarySize, lineHeight: adaptivePrimaryLineHeight }, isLightCard && s.moduleMetricPrimaryDark, showAttention && s.moduleMetricPrimaryAttention]}
                          numberOfLines={2}
                        >
                          {card.highlight.primary}
                        </Text>
                        {card.highlight.secondary ? (
                          <Text style={[s.moduleMetricSecondary, isLightCard && s.moduleMetricSecondaryDark]} numberOfLines={2}>
                            {card.highlight.secondary}
                          </Text>
                        ) : null}
                        {card.highlight.detail ? (
                          <Text style={[s.moduleHighlightDetail, isLightCard && s.moduleHighlightDetailDark]} numberOfLines={2}>
                            {card.highlight.detail}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    <View style={s.moduleCardFooterAbsolute}>
                      {card.countText ? (
                        <View
                          style={[
                            s.moduleCardCountPill,
                            {
                              paddingHorizontal: adaptiveCountPillPaddingH,
                              paddingVertical: adaptiveCountPillPaddingV,
                            },
                            isLightCard && s.moduleCardCountPillDark,
                          ]}
                        >
                          <View style={[s.moduleCardCountDot, isLightCard && s.moduleCardCountDotDark]} />
                          <Text style={[s.moduleCardCountText, { fontSize: adaptiveCountFontSize }, isLightCard && s.moduleCardCountTextDark]}>{card.countText}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Vaccine category detail section ─────────────────────────────── */}
        {category === 'vaccine' && (
          <View style={s.categoryDetailSection}>
            {(vaccineAttentionCounts?.overdueCount ?? 0) + (vaccineAttentionCounts?.dueSoonCount ?? 0) > 0 && (
              <View style={s.vaccineAttentionRow}>
                {(vaccineAttentionCounts?.overdueCount ?? 0) > 0 && (
                  <View style={[s.vaccineAttentionPill, { backgroundColor: '#fdf0f0', borderColor: '#f5dede' }]}>
                    <Svg width={13} height={13} viewBox="0 0 24 24">
                      <Path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#c96a6a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Svg>
                    <Text style={[s.vaccineAttentionText, { color: '#c96a6a' }]}>
                      {vaccineAttentionCounts!.overdueCount} {isTr ? 'Gecikmiş' : 'Overdue'}
                    </Text>
                  </View>
                )}
                {(vaccineAttentionCounts?.dueSoonCount ?? 0) > 0 && (
                  <View style={[s.vaccineAttentionPill, { backgroundColor: '#fef6ea', borderColor: '#f5e9d1' }]}>
                    <Svg width={13} height={13} viewBox="0 0 24 24">
                      <Circle cx={12} cy={12} r={10} stroke="#c48d42" strokeWidth={2} fill="none" />
                      <Path d="M12 6v6l4 2" stroke="#c48d42" strokeWidth={2} strokeLinecap="round" fill="none" />
                    </Svg>
                    <Text style={[s.vaccineAttentionText, { color: '#c48d42' }]}>
                      {vaccineAttentionCounts!.dueSoonCount} {isTr ? 'Yaklaşan' : 'Due Soon'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {vaccineNextUpData && <HubFeaturedVaccineCard data={vaccineNextUpData} isTr={isTr} />}

            {vaccineHistoryItems && vaccineHistoryItems.length > 0 ? (
              <>
                <Text style={s.categorySectionLabel}>{isTr ? 'AŞI GEÇMİŞİ' : 'VACCINE HISTORY'}</Text>
                {vaccineHistoryItems.map((item) => (
                  <HubVaccineCard key={`${item.name}-${item.dueDate}`} item={item} isTr={isTr} />
                ))}
              </>
            ) : (
              !vaccineNextUpData && (
                <View>
                  <Text style={s.categoryEmptyText}>{isTr ? 'Henüz aşı kaydı yok' : 'No vaccine data yet'}</Text>
                  <Pressable style={s.emptyCta} onPress={() => openCreate('vaccine')}>
                    <Text style={s.emptyCtaText}>{isTr ? 'Aşı Ekle' : 'Add Vaccine'}</Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        )}

        {/* ── Record category detail section ──────────────────────────────── */}
        {category === 'record' && (
          <View style={s.categoryDetailSection}>
            <View style={s.recordSegmentRow}>
              {(['allergies', 'diagnoses', 'labResults'] as const).map((seg) => {
                const accent = HUB_SEGMENT_ACCENTS[seg];
                const isActive = recordsSegment === seg;
                return (
                  <Pressable
                    key={seg}
                    style={[s.recordSegmentChip, isActive && { backgroundColor: accent.accentBg, borderColor: accent.accent }]}
                    onPress={() => setRecordsSegment(seg)}
                  >
                    <Text style={[s.recordSegmentText, isActive && { color: accent.accent }]}>
                      {isTr ? accent.labelTr : accent.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {healthRecordsData?.bySegment?.[recordsSegment] ? (
              <>
                <Text style={s.categorySectionLabel}>{isTr ? 'AKTİF' : 'ACTIVE'}</Text>
                <View style={s.recordCard}>
                  <View style={[s.recordAccentStripe, { backgroundColor: HUB_SEGMENT_ACCENTS[recordsSegment].accent }]} />
                  <View style={s.recordCardInner}>
                    <Text style={s.recordCardTitle}>{healthRecordsData.bySegment[recordsSegment]!.activeTitle}</Text>
                    <Text style={s.recordCardDate}>{healthRecordsData.bySegment[recordsSegment]!.activeDate}</Text>
                    <Text style={s.recordCardBody} numberOfLines={2}>{healthRecordsData.bySegment[recordsSegment]!.activeBody}</Text>
                  </View>
                </View>

                {!!healthRecordsData.bySegment[recordsSegment]!.historyTitle && (
                  <>
                    <Text style={s.categorySectionLabel}>{isTr ? 'GEÇMİŞ' : 'HISTORY'}</Text>
                    <View style={[s.recordCard, s.recordCardMuted]}>
                      <View style={[s.recordAccentStripe, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                      <View style={s.recordCardInner}>
                        <Text style={s.recordCardTitleMuted}>{healthRecordsData.bySegment[recordsSegment]!.historyTitle}</Text>
                        <Text style={s.recordCardDate}>{healthRecordsData.bySegment[recordsSegment]!.historyDate}</Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            ) : (
              <View>
                <Text style={s.categoryEmptyText}>{isTr ? 'Henüz sağlık kaydı yok' : 'No record data yet'}</Text>
                <Pressable style={s.emptyCta} onPress={() => openCreate('diagnosis')}>
                  <Text style={s.emptyCtaText}>{isTr ? 'Kayıt Ekle' : 'Add Record'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <Animated.View style={[s.documentsFullWidthWrap, { transform: [{ scale: getCardScale('documents') }] }]}>
          <Pressable
            style={[s.moduleCard, s.documentCard, s.documentCardLight, { backgroundColor: HEALTH_MODULE_CARD_THEMES.documents.background, shadowColor: HEALTH_MODULE_CARD_THEMES.documents.shadow, height: documentsCardHeight }]}
            onPressIn={springDown(getCardScale('documents'), 0.985)}
            onPressOut={springUp(getCardScale('documents'))}
            onPress={() => onOpenDocuments?.()}
          >
            <View style={[s.moduleCardContent, s.documentCardContent]}>
              <View style={s.moduleCardHeaderRow}>
                <View style={[s.moduleCardIcon, { backgroundColor: HEALTH_MODULE_CARD_THEMES.documents.iconBg }]}>
                  <HealthHubCategoryIcon kind="documents" size={18} colorOverride={HEALTH_MODULE_CARD_THEMES.documents.iconColor} />
                </View>
                <View style={s.moduleCardHeaderText}>
                  <Text style={[s.moduleCardTitle, { fontSize: adaptiveCardTitleSize, lineHeight: adaptiveCardTitleLineHeight }, s.moduleCardTitleDark, s.documentCardTitle]}>
                    {documentCard?.title ?? (isTr ? 'Belgeler' : 'Documents')}
                  </Text>
                </View>
              </View>

              {documentPrimaryText ? (
                <View style={s.documentMetricBlock}>
                  {documentCard?.highlight.label ? (
                    <Text style={[s.moduleHighlightLabel, s.moduleHighlightLabelDark]}>{documentCard.highlight.label}</Text>
                  ) : null}
                  <Text style={[s.moduleMetricPrimary, s.moduleMetricPrimaryDark]} numberOfLines={1}>
                    {documentPrimaryText}
                  </Text>
                  {documentCard?.highlight.secondary ? (
                    <Text style={[s.moduleMetricSecondary, s.moduleMetricSecondaryDark]} numberOfLines={1}>
                      {documentCard.highlight.secondary}
                    </Text>
                  ) : null}
                  {documentCard?.highlight.detail ? (
                    <Text style={[s.moduleHighlightDetail, s.moduleHighlightDetailDark]} numberOfLines={2}>
                      {documentCard.highlight.detail}
                    </Text>
                  ) : null}
                </View>
              ) : documentsPreview?.[0]?.title ? (
                <Text style={[s.documentCardPreview, s.documentCardPreviewDark]} numberOfLines={1}>
                  {documentsPreview[0].title}
                </Text>
              ) : null}

              <View style={s.documentCardFooter}>
                {documentCard?.countText ? (
                  <View style={[s.moduleCardCountPill, s.moduleCardCountPillDark]}>
                    <View style={[s.moduleCardCountDot, s.moduleCardCountDotDark]} />
                    <Text style={[s.moduleCardCountText, s.moduleCardCountTextDark]}>{documentCard.countText}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── Timeline Preview (last 5, all category) ──────────────────── */}
        {category === 'all' && timeline.length > 0 && (
          <View style={s.timelinePreviewBlock}>
            <View style={s.sectionHeaderCompact}>
              <View style={s.sectionTextWrap}>
                <Text style={s.sectionTitle}>{isTr ? 'Son Aktivite' : 'Recent Activity'}</Text>
              </View>
            </View>
            <View style={s.timelinePreviewList}>
              {timeline.slice(0, 5).map((item, idx) => (
                <View
                  key={item.id}
                  style={[s.timelinePreviewRow, idx < Math.min(timeline.length, 5) - 1 && s.timelinePreviewRowDivider]}
                >
                  <View style={[s.timelinePreviewDot, { backgroundColor: timelineTypeAccent(item.type) }]} />
                  <View style={s.timelinePreviewBody}>
                    <Text style={s.timelinePreviewTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.timelinePreviewMeta}>{item.date} · {typeTag(item.type, isTr)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {breedEntry ? (
          <View style={[s.sectionBlock, s.breedSectionBlock]}>
            <View style={s.sectionHeaderCompact}>
              <View style={s.sectionTextWrap}>
                <Text style={s.sectionTitle}>{isTr ? 'Irk İçgörüleri' : 'Breed Insights'}</Text>
              </View>
            </View>
            <BreedTeaserRow
              entry={breedEntry}
              isPremium={isPremium}
              onPress={openBreedSheet}
              isTr={isTr}
              avatarUri={petAvatarUri}
              insightText={breedInsight?.text}
              petName={petName}
            />
          </View>
        ) : null}

        <View style={s.aiTextRow}>
          <TrendingUp size={16} color={C.primary} strokeWidth={2.1} />
          <Text style={s.aiTextRowMessage} numberOfLines={2}>
            {primaryInsight?.message ?? (
              isTr
                ? 'Daha derin analiz için Insights ekranını açın.'
                : 'Open Insights for deeper AI analysis.'
            )}
          </Text>
          {onOpenInsights ? (
            <Pressable style={s.aiTextRowBtn} onPress={onOpenInsights}>
              <Text style={s.aiTextRowBtnText}>{isTr ? 'Aç' : 'Open'}</Text>
              <ChevronRight size={13} color={C.primary} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

      </Animated.ScrollView>

      <View pointerEvents="box-none" style={s.topChrome}>
        <Animated.View pointerEvents="none" style={[s.topChromeSurface, { height: topChromeHeight, opacity: topChromeOpacity }]}>
          <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFillObject} />
          <Animated.View style={[s.headerColorBlendWrap, { opacity: headerColorBlendOpacity }]}>
            <ExpoLinearGradient
              colors={['rgba(46,66,48,0.22)', 'rgba(86,117,124,0.18)', 'rgba(201,146,114,0.18)', 'rgba(216,195,165,0.15)']}
              locations={[0, 0.35, 0.7, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <ExpoLinearGradient
              colors={['rgba(86,117,124,0.14)', 'rgba(216,195,165,0.11)', 'rgba(46,66,48,0.12)', 'rgba(201,146,114,0.11)']}
              locations={[0, 0.35, 0.65, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <ExpoLinearGradient
            colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
            locations={[0, 0.45, 0.8, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <View style={[s.topBarRow, { height: topBarHeight + 2, paddingTop: topInset + 2 }]}>
          <Animated.Text
            numberOfLines={1}
            style={[
              s.topBarTitle,
              {
                transform: [
                  { translateX: headerTitleTranslateX },
                  { translateY: headerTitleTranslateY },
                  { scale: headerTitleScale },
                ],
              },
            ]}
          >
            Health Hub
          </Animated.Text>
          <Animated.View style={{ transform: [{ scale: headerBtnScale }] }}>
            <Pressable
              style={s.heroActionButton}
              onPressIn={springDown(headerBtnScale, 0.9)}
              onPressOut={springUp(headerBtnScale)}
              onPress={openTypeSelect}
              android_ripple={{ color: 'rgba(71,102,74,0.10)', borderless: false }}
            >
              <Plus size={18} color={C.primary} strokeWidth={2.4} />
            </Pressable>
          </Animated.View>
        </View>
      </View>


      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* BREED INSIGHTS BOTTOM SHEET                                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={breedSheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeBreedSheet}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Animated backdrop */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.62)', opacity: sheetBackdropOpacity }]}
            pointerEvents="none"
          />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeBreedSheet} />

          {/* Animated sheet */}
          <Animated.View
            style={[bs.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
            onLayout={(e) => { sheetHeightRef.current = e.nativeEvent.layout.height; }}
          >
            {/* Draggable hero zone: handle + header + divider */}
            <View {...breedSheetPan.panHandlers}>
              <View style={bs.sheetHandleArea}>
                <View style={bs.sheetHandle} />
              </View>
              {breedEntry ? (
                <>
                  <View style={bs.sheetHeaderRow}>
                    {petAvatarUri ? (
                      <View style={bs.sheetAvatarFrame}>
                        <Image source={{ uri: petAvatarUri }} style={bs.sheetAvatar} resizeMode="cover" />
                      </View>
                    ) : (
                      <View style={bs.sheetIconCircle}>
                        <BreedDnaIcon size={24} color="#7fc4b8" />
                      </View>
                    )}
                    <View style={bs.sheetHeaderText}>
                      {petName ? (
                        <Text style={bs.sheetPetName} numberOfLines={1}>{petName}</Text>
                      ) : null}
                      <Text style={bs.sheetBreedName} numberOfLines={1}>{breedEntry.breed}</Text>
                      <Text style={bs.sheetBreedSub}>
                        {breedEntry.petType === 'Dog' ? (isTr ? 'Köpek' : 'Dog') : (isTr ? 'Kedi' : 'Cat')}
                        {'  ·  '}{breedEntry.weightRangeKg[0]}–{breedEntry.weightRangeKg[1]} kg
                        {'  ·  '}{breedEntry.lifespanYears[0]}–{breedEntry.lifespanYears[1]} {isTr ? 'yıl' : 'yrs'}
                      </Text>
                    </View>
                  </View>
                  <View style={bs.sheetDivider} />
                </>
              ) : null}
            </View>

            {breedEntry ? (
              <ScrollView
                contentContainerStyle={bs.sheetScroll}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* AI Observation */}
                {breedInsight ? (
                  <View style={bs.observationCard}>
                    <View style={bs.observationIconCol}>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 3L13.5 7.5L18 9L13.5 10.5L12 15L10.5 10.5L6 9L10.5 7.5L12 3Z" stroke="#c9a44a" strokeWidth={1.8} strokeLinejoin="round" />
                        <Path d="M18.5 3.5L19.2 5.3L21 6L19.2 6.7L18.5 8.5L17.8 6.7L16 6L17.8 5.3L18.5 3.5Z" stroke="#c9a44a" strokeWidth={1.6} strokeLinejoin="round" />
                      </Svg>
                    </View>
                    <View style={bs.observationTextCol}>
                      <Text style={bs.observationLabel}>{isTr ? 'SAĞLIK ANALİZİ' : 'HEALTH ANALYSIS'}</Text>
                      <Text style={bs.observationText}>{breedInsight.text}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Genetic Risks */}
                <Text style={bs.miniLabel}>{isTr ? 'GENETİK RİSKLER' : 'GENETIC RISKS'}</Text>
                <View style={bs.chipsRow}>
                  {breedEntry.healthRisks.map((r, i) => (
                    <View key={i} style={[bs.chip, breedInsight?.matchedRisks.includes(isTr ? r.label_tr : r.label) && { borderColor: 'rgba(240,120,70,0.45)', backgroundColor: 'rgba(163,67,33,0.30)' }]}>
                      <Text style={bs.chipText}>{isTr ? r.label_tr : r.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Daily Care */}
                {(breedEntry.dailyCare?.length ?? 0) > 0 ? (
                  <>
                    <Text style={[bs.miniLabel, bs.miniLabelSpaced]}>{isTr ? 'GÜNLÜK BAKIM' : 'DAILY CARE'}</Text>
                    {breedEntry.dailyCare!.map((item, i) => (
                      <View key={i} style={bs.careItem}>
                        <View style={bs.careIconBox}>
                          <DailyCareIcon category={item.category} size={15} color="#7fc4b8" />
                        </View>
                        <Text style={bs.careText}>{isTr ? item.label_tr : item.label}</Text>
                      </View>
                    ))}
                  </>
                ) : null}

                {/* Care Tips */}
                <Text style={[bs.miniLabel, bs.miniLabelSpaced]}>{isTr ? 'VETERİNER ÖNERİLERİ' : 'VET RECOMMENDATIONS'}</Text>
                {breedEntry.careTips.map((tip, i) => (
                  <View key={i} style={bs.tipRow}>
                    <View style={bs.tipDot} />
                    <Text style={bs.tipText}>{isTr ? tip.label_tr : tip.label}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Close button */}
            <View style={bs.sheetCloseRow}>
              <Pressable style={bs.sheetCloseBtn} onPress={closeBreedSheet}>
                <Text style={bs.sheetCloseBtnText}>{isTr ? 'Kapat' : 'Close'}</Text>
              </Pressable>
            </View>

            {/* Premium lock overlay */}
            {!isPremium && (
              <Pressable
                style={bs.lockOverlay}
                onPress={() => { closeBreedSheet(); onUpgradePremium?.(); }}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
              >
                <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFillObject} />
                <View style={[StyleSheet.absoluteFillObject, bs.lockOverlayTint]} />
                <View style={bs.lockContent}>
                  <View style={bs.lockIconRing}>
                    <LockIcon size={24} color="#c8ede8" />
                  </View>
                  <Text style={bs.lockTitle}>{isTr ? 'Premium Özellik' : 'Premium Feature'}</Text>
                  <Text style={bs.lockSub}>
                    {isTr
                      ? 'Irk sağlık profili, günlük bakım rehberi ve AI analizini görmek için Pro\'ya geçin.'
                      : 'Upgrade to Pro to unlock breed health profiles, daily care guides, and AI analysis.'}
                  </Text>
                  <View style={bs.lockBtn}>
                    <Text style={bs.lockBtnText}>{isTr ? 'Pro\'ya Geç' : 'Upgrade to Pro'}</Text>
                  </View>
                </View>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </Modal>

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
      {/* ADD RECORD SHEET                                                       */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <AddRecordSheet
        visible={addSheetOpen}
        mode={addSheetMode}
        initialTitle={addSheetPresetTitle}
        initialType={addSheetPresetType}
        locale={locale}
        onClose={() => {
          const savedPayload = createSavedPayloadRef.current;
          createSavedPayloadRef.current = null;
          setAddSheetOpen(false);
          onCreateFlowClosed?.(savedPayload ? 'saved' : 'cancelled', savedPayload ?? undefined);
        }}
        onSave={(payload) => {
          createSavedPayloadRef.current = payload;
          onAddRecord?.(payload);
        }}
      />
    </ExpoLinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE9E6',
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 164,
  },
  heroBlock: {
    marginBottom: 10,
    gap: 12,
  },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  topChromeSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(115,139,134,0.20)',
  },
  headerColorBlendWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  topBarRow: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'left',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#24342d',
    letterSpacing: -1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#24342d',
    letterSpacing: -1,
  },
  heroActionButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2c4530',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  focusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.12)',
  },
  focusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#47664a',
  },
  overviewStripModern: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    shadowColor: '#203127',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  overviewItem: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(48,51,46,0.48)',
  },
  overviewValue: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#24342d',
  },
  overviewDivider: {
    width: 1,
    marginVertical: 6,
    backgroundColor: 'rgba(93,96,90,0.10)',
  },
  sectionBlock: {
    marginBottom: 24,
  },
  moduleCardsSection: {
    marginBottom: 24,
    gap: 14,
  },
  moduleCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 12,
  },
  moduleCardGridItem: {
    marginBottom: 0,
  },
  documentsFullWidthWrap: {
    width: '100%',
    marginTop: 8,
    marginBottom: 22,
  },
  moduleCard: {
    minHeight: 206,
    borderRadius: 31,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  moduleCardActive: {
    transform: [{ scale: 1.01 }],
  },
  moduleCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCardBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  moduleCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  moduleCardWatermark: {
    position: 'absolute',
    top: 10,
    right: -6,
    transform: [{ rotate: '9deg' }],
  },
  moduleCardContent: {
    flex: 1,
    marginTop: 10,
    paddingBottom: 28,
    gap: 8,
    justifyContent: 'space-between',
  },
  moduleCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moduleCardHeaderText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  moduleCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f7fbfb',
    letterSpacing: -0.35,
  },
  moduleCardTitleDark: {
    color: '#2e4230',
  },
  moduleCardFooter: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleCardFooterAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  moduleDateBlock: {
    marginTop: 4,
    gap: 0,
  },
  moduleDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moduleDateRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  moduleDateBadge: {
    width: 66,
    minHeight: 66,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flexShrink: 0,
  },
  moduleDateBadgeLight: {
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderColor: 'rgba(87,96,89,0.10)',
  },
  moduleCalendarBadge: {
    width: 60,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.17)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    flexShrink: 0,
  },
  moduleCalendarBadgeLight: {
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  moduleCalendarHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  moduleCalendarHeaderLight: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  moduleDateTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  moduleDateTextColCompact: {
    width: '100%',
  },
  moduleDateEyebrow: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(244,250,251,0.7)',
  },
  moduleDateEyebrowDark: {
    color: 'rgba(78,89,82,0.68)',
  },
  moduleDateMeta: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '700',
    color: 'rgba(244,250,251,0.72)',
  },
  moduleDateMetaDark: {
    color: 'rgba(78,89,82,0.74)',
  },
  moduleMetricBlock: {
    marginTop: 6,
    gap: 4,
  },
  moduleHighlightAttentionPanel: {
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  moduleHighlightLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(244,250,251,0.64)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  moduleHighlightLabelDark: {
    color: 'rgba(101,109,104,0.86)',
  },
  moduleHighlightLabelAttention: {
    color: '#fff1e6',
  },
  moduleDatePrimary: {
    fontSize: 40,
    lineHeight: 41,
    fontWeight: '800',
    color: '#f8fbfb',
    letterSpacing: -1.6,
  },
  moduleDatePrimaryDark: {
    color: '#2e4230',
  },
  moduleDatePrimaryAttention: {
    color: '#fff8f2',
  },
  moduleDatePrimaryCompact: {
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  moduleDateSecondary: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: 'rgba(244,250,251,0.86)',
    marginTop: -2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  moduleDateSecondaryDark: {
    color: '#5e694d',
  },
  moduleDateSecondaryCompact: {
    fontSize: 9.5,
    lineHeight: 12,
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  moduleMetricPrimary: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '800',
    color: '#f8fbfb',
    letterSpacing: -0.6,
    maxWidth: '92%',
  },
  moduleMetricPrimaryDark: {
    color: '#2e4230',
  },
  moduleMetricPrimaryAttention: {
    color: '#fff8f2',
  },
  moduleMetricPrimaryCompact: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.35,
    maxWidth: '100%',
  },
  moduleDateDetailText: {
    marginTop: 1,
    letterSpacing: -0.2,
  },
  moduleMetricSecondary: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
    color: 'rgba(244,250,251,0.84)',
  },
  moduleMetricSecondaryDark: {
    color: '#5e694d',
  },
  moduleHighlightDetail: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: 'rgba(239,247,248,0.74)',
    maxWidth: '100%',
  },
  moduleHighlightDetailDark: {
    color: 'rgba(94,105,77,0.84)',
  },
  documentCard: {
    minHeight: 112,
    borderRadius: 24,
  },
  documentCardContent: {
    marginTop: 0,
    paddingBottom: 2,
    gap: 5,
    justifyContent: 'flex-start',
  },
  documentMetricBlock: {
    marginTop: 2,
    gap: 2,
  },
  documentCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  documentCardLight: {
    borderWidth: 1,
    borderColor: 'rgba(101,109,104,0.08)',
  },
  documentCardPreview: {
    marginTop: 2,
    maxWidth: '84%',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    color: '#f6fbfc',
  },
  documentCardPreviewDark: {
    color: '#656d68',
  },
  documentCardTitle: {
    color: '#47504b',
  },
  moduleCardCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  moduleCardCountPillDark: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  moduleCardCountDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    opacity: 0.82,
  },
  moduleCardCountDotDark: {
    backgroundColor: '#3a6040',
    opacity: 1,
  },
  moduleCardCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f2f8f9',
  },
  moduleCardCountTextDark: {
    color: '#5a625d',
  },
  sectionBlockLast: {
    marginBottom: 18,
  },
  breedSectionBlock: {
    marginTop: 4,
  },
  sectionHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sectionTextWrap: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#24342d',
    letterSpacing: -0.5,
  },
  sectionMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(71,102,74,0.76)',
    paddingTop: 4,
  },
  sectionActionGhost: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  sectionActionGhostText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#47664a',
  },
  moduleShell: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    shadowColor: '#203127',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  moduleRowFocused: {
    backgroundColor: 'rgba(71,102,74,0.045)',
  },
  moduleRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.12)',
  },
  moduleIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4ee',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.06)',
  },
  moduleIconWrapActive: {
    backgroundColor: '#eef5ef',
    borderColor: 'rgba(71,102,74,0.12)',
  },
  moduleBody: {
    flex: 1,
    gap: 6,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#24342d',
    letterSpacing: -0.25,
  },
  moduleCount: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(48,51,46,0.52)',
  },
  moduleInfo: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(48,51,46,0.68)',
  },
  moduleAside: {
    alignItems: 'flex-end',
    gap: 10,
    minWidth: 92,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  documentsShell: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  documentRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.12)',
  },
  documentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#f0ebf8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(93,89,129,0.08)',
  },
  documentBody: {
    flex: 1,
    gap: 4,
  },
  documentTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#24342d',
  },
  documentContext: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(48,51,46,0.58)',
  },
  emptyPanel: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    alignItems: 'center',
  },
  emptyPanelStatic: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    gap: 6,
  },
  emptyPanelIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#f1f3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPanelBody: {
    flex: 1,
    gap: 4,
  },
  emptyPanelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#24342d',
  },
  emptyPanelText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: 'rgba(48,51,46,0.58)',
  },
  activityShell: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  activityRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.12)',
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.06)',
  },
  activityBody: {
    flex: 1,
    gap: 4,
  },
  activityTitleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  activityTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#24342d',
    lineHeight: 19,
  },
  activityDate: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(48,51,46,0.48)',
  },
  activityMeta: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(48,51,46,0.60)',
  },
  activityNote: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    color: 'rgba(48,51,46,0.52)',
  },
  inlineStatusPill: {
    marginTop: 2,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
  },
  inlineStatusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  aiPreviewCard: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    gap: 12,
  },
  aiPreviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiPreviewIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#eaf4ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPriorityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  aiPriorityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiPreviewMessage: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    color: '#24342d',
  },
  aiPreviewSecondary: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    color: 'rgba(48,51,46,0.60)',
  },
  aiPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiPreviewFooterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#47664a',
  },

  // Header
  headerAddBtnPressed: {
    backgroundColor: 'rgba(127,196,184,0.18)',
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

  timelineCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.outlineVariant,
  },

  // Category cards
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
  vaccineCategoryIconBox: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  vaccineCategoryTitle: {
    color: '#ecfffb',
  },
  vaccineCategorySub: {
    color: 'rgba(236,255,251,0.84)',
  },
  vaccineCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  vaccineCountBadgeText: {
    color: '#ecfffb',
  },
  vaccineCategoryStatusText: {
    color: 'rgba(236,255,251,0.84)',
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

  // ── Category detail sections ──────────────────────────────────────────────
  categoryDetailSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  vaccineAttentionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  vaccineAttentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  vaccineAttentionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categorySectionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  categoryEmptyText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  recordSegmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  recordSegmentChip: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  recordSegmentText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  recordCardMuted: {
    opacity: 0.6,
  },
  recordAccentStripe: {
    width: 4,
  },
  recordCardInner: {
    flex: 1,
    padding: 12,
  },
  recordCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recordCardTitleMuted: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  recordCardDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  recordCardBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 4,
  },

  // ── Health Status Banner ──────────────────────────────────────────────────
  statusBannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 22,
    marginBottom: 12,
    minHeight: 44,
    alignItems: 'center',
  },
  statusPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillItemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillRed: {
    backgroundColor: '#fde8e3',
    borderColor: 'rgba(167,59,33,0.22)',
  },
  statusPillRedText: {
    color: '#a73b21',
  },
  statusPillAmber: {
    backgroundColor: '#fdf2dd',
    borderColor: 'rgba(155,100,0,0.22)',
  },
  statusPillAmberText: {
    color: '#9b6400',
  },
  statusPillGreen: {
    backgroundColor: '#eaf4ec',
    borderColor: 'rgba(65,109,73,0.22)',
  },
  statusPillGreenText: {
    color: '#416d49',
  },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
  },
  quickActionChipUrgent: {
    backgroundColor: 'rgba(253,232,227,0.88)',
    borderColor: 'rgba(167,59,33,0.20)',
  },
  quickActionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  quickActionChipUrgentText: {
    color: '#a73b21',
  },

  // ── Timeline Preview ──────────────────────────────────────────────────────
  timelinePreviewBlock: {
    marginBottom: 20,
  },
  timelinePreviewList: {
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
  },
  timelinePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timelinePreviewRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.10)',
  },
  timelinePreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  timelinePreviewBody: {
    flex: 1,
    gap: 2,
  },
  timelinePreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  timelinePreviewMeta: {
    fontSize: 11,
    fontWeight: '500',
    color: C.onSurfaceVariant,
  },

  // ── AI Text Row ───────────────────────────────────────────────────────────
  aiTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 12,
    marginBottom: 8,
  },
  aiTextRowMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: C.onSurfaceVariant,
  },
  aiTextRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  aiTextRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

});
