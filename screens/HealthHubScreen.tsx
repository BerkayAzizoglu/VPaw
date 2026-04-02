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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBreedHealthEntry, type BreedHealthEntry, type DailyCareCategory } from '../lib/breedHealthData';
import { generateBreedInsight } from '../lib/breedInsightsEngine';
import type { AiInsight } from '../lib/insightsEngine';
import AddRecordSheet, { type AddRecordMode } from '../components/AddRecordSheet';
import type { VaccinationsAttentionCounts } from '../lib/healthMvpModel';
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

// â”€â”€â”€ Colour palette (matches reference design system) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Exported types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  /** ID of the parent vet visit, if this record was created during a visit */
  vetVisitId?: string;
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
  vaccineAttentionCounts?: VaccinationsAttentionCounts;
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function timelineFilterIcon(type: HealthHubCategory, active: boolean) {
  const strokeWidth = active ? 2.35 : 2.15;
  if (type === 'all') return <Home size={14} color={active ? C.primary : C.onSurfaceVariant} strokeWidth={strokeWidth} />;
  if (type === 'vaccine') return <Syringe size={14} color={active ? C.accentVaccine : C.onSurfaceVariant} strokeWidth={strokeWidth} />;
  if (type === 'weight') return <TrendingUp size={14} color={active ? C.accentWeight : C.onSurfaceVariant} strokeWidth={strokeWidth} />;
  if (type === 'vet') return <Stethoscope size={14} color={active ? C.accentVet : C.onSurfaceVariant} strokeWidth={strokeWidth} />;
  return <FileText size={14} color={active ? C.accentRecord : C.onSurfaceVariant} strokeWidth={strokeWidth} />;
}


function statusTone(status: string | undefined) {
  const value = status?.toLowerCase() ?? '';
  if (value.includes('needs attention') || value.includes('dikkat')) {
    return { bg: '#fde8e3', text: '#a73b21', border: 'rgba(167,59,33,0.14)' };
  }
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

function healthAreaStatusMeta(
  rawStatus: string | undefined,
  key: AreaRowKey,
  overdueCount: number,
  isTr: boolean,
) {
  const value = rawStatus?.toLowerCase() ?? '';
  if (key === 'vaccines' && overdueCount > 0) {
    return { kind: 'attention' as const, label: isTr ? 'Dikkat gerekli' : 'Needs attention' };
  }
  if (value.includes('needs attention') || value.includes('dikkat')) {
    return { kind: 'attention' as const, label: isTr ? 'Dikkat gerekli' : 'Needs attention' };
  }
  if (value.includes('overdue') || value.includes('gecik')) {
    return { kind: 'attention' as const, label: isTr ? 'Dikkat gerekli' : 'Needs attention' };
  }
  if (value.includes('due soon') || value.includes('yaklas')) {
    return { kind: 'soon' as const, label: isTr ? 'Yaklasiyor' : 'Due soon' };
  }
  if (value.includes('no data') || value.includes('veri yok')) {
    return { kind: 'empty' as const, label: isTr ? 'Veri yok' : 'No data' };
  }
  return { kind: 'ok' as const, label: isTr ? 'Guncel' : 'Up to date' };
}

function emptyAreaGuidance(key: AreaRowKey, isTr: boolean) {
  if (key === 'vet') return isTr ? 'Ilk veteriner ziyaretini ekleyin.' : 'Add first vet visit.';
  if (key === 'vaccines') return isTr ? 'Ilk asiyi girip takip baslatin.' : 'Log first vaccine to start tracking.';
  if (key === 'weight') return isTr ? 'Trend icin ilk kiloyu ekleyin.' : 'Add first weight to start trends.';
  if (key === 'records') return isTr ? 'Ilk saglik kaydini ekleyin.' : 'Add first health record.';
  return isTr ? 'Ilk belgeyi yukleyin.' : 'Upload first record.';
}

function actionLabelForArea(key: AreaRowKey, isTr: boolean) {
  if (key === 'vet') return isTr ? 'Veteriner ziyareti ekle' : 'Add Vet Visit';
  if (key === 'vaccines') return isTr ? 'Asi kaydi ekle' : 'Log Vaccine';
  if (key === 'weight') return isTr ? 'Ilk kiloyu ekle' : 'Add first weight';
  if (key === 'records') return isTr ? 'Saglik kaydi ekle' : 'Add first record';
  return isTr ? 'Ilk belgeyi yukle' : 'Upload first record';
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
  // Handles ISO date "2025-02-21" â†’ "Feb 21" / "Åub 21"
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

// â”€â”€â”€ Breed Insights helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const weightLabel = `${entry.weightRangeKg[0]}-${entry.weightRangeKg[1]} kg`;
  const lifespanLabel = `${entry.lifespanYears[0]}-${entry.lifespanYears[1]} ${isTr ? 'yıl' : 'yrs'}`;
  const topRisks = entry.healthRisks.slice(0, 3);

  // When the avatar is the pet's photo, the header reads as the pet â€” not breed data.
  // Primary = pet name, secondary = breed label. When no pet name, fall back to breed.
  const hasPetIdentity = !!avatarUri && !!petName;
  const primaryLabel = hasPetIdentity ? petName! : entry.breed;
  const secondaryLabel = hasPetIdentity
    ? `${isTr ? 'Irk' : 'Breed'}: ${entry.breed}`
    : `${typeLabel} | ${weightLabel} | ${lifespanLabel}`;
  const tertiaryLabel = hasPetIdentity ? `${typeLabel} | ${weightLabel}` : undefined;

  return (
    <Pressable
      style={({ pressed }) => [bs.teaserRow, pressed && bs.teaserRowPressed]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(71,102,74,0.08)' }}
    >
      {/* Header row: avatar/icon + pet name (or breed) + chevron */}
      <View style={bs.teaserHeaderRow}>
        {avatarUri ? (
          <View style={bs.teaserAvatarFrame}>
            <Image source={{ uri: avatarUri }} style={bs.teaserAvatar} resizeMode="cover" />
          </View>
        ) : (
          <View style={bs.teaserIconBox}>
            <BreedDnaIcon size={19} color={C.primary} />
          </View>
        )}
        <View style={bs.teaserBody}>
          <Text style={bs.teaserBreedName} numberOfLines={1}>{primaryLabel}</Text>
          <Text style={bs.teaserSub} numberOfLines={1}>{secondaryLabel}</Text>
          {tertiaryLabel ? (
            <Text style={bs.teaserMeta} numberOfLines={1}>{tertiaryLabel}</Text>
          ) : null}
        </View>
        <ChevronRight size={15} color="rgba(71,102,74,0.62)" strokeWidth={2.2} />
      </View>

      {/* Divider */}
      <View style={bs.teaserDivider} />

      {/* Bottom row */}
      <View style={bs.teaserBottomRow}>
        {/* Breed-standard stats â€” clearly separate from pet identity above */}
        {!hasPetIdentity ? (
          <Text style={bs.teaserStandardLine} numberOfLines={1}>
            {typeLabel} | {weightLabel} | {lifespanLabel}
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
              <LockIcon size={11} color={C.primary} />
              <Text style={bs.teaserLockText}>Pro</Text>
            </View>
            <Text style={bs.teaserLockHint} numberOfLines={1}>
              {isTr ? 'Irk sağlık profilinin kilidini aç' : 'Unlock breed health profile'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const bs = StyleSheet.create({
  // â”€â”€ Breed teaser card (in scroll) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  teaserRow: {
    marginHorizontal: 0,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: 'rgba(121,124,117,0.20)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  teaserRowPressed: {
    backgroundColor: '#f8f7f4',
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
    backgroundColor: 'rgba(71,102,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
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
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  teaserSub: {
    marginTop: 2,
    fontSize: 11,
    color: 'rgba(93,96,90,0.82)',
    fontWeight: '500',
  },
  teaserMeta: {
    marginTop: 2,
    fontSize: 10.5,
    color: 'rgba(93,96,90,0.76)',
    fontWeight: '500',
  },
  teaserDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(121,124,117,0.16)',
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
    backgroundColor: '#fff2ee',
    borderWidth: 1,
    borderColor: 'rgba(167,59,33,0.22)',
  },
  teaserChipText: {
    fontSize: 10.5,
    color: '#8c4332',
    fontWeight: '700',
  },
  teaserStandardLine: {
    fontSize: 10.5,
    color: 'rgba(93,96,90,0.84)',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  teaserInsightPreview: {
    fontSize: 11.5,
    color: '#4f5a52',
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
    borderRadius: 6,
    backgroundColor: 'rgba(71,102,74,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.20)',
  },
  teaserLockText: {
    fontSize: 10.5,
    color: C.primary,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  teaserLockHint: {
    fontSize: 11,
    color: 'rgba(93,96,90,0.78)',
    fontWeight: '400',
    flex: 1,
  },

  // â”€â”€ Bottom sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(121,124,117,0.18)',
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
    backgroundColor: 'rgba(121,124,117,0.38)',
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
    backgroundColor: 'rgba(71,102,74,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetPetName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(93,96,90,0.72)',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  sheetBreedName: {
    fontSize: 20,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.4,
  },
  sheetBreedSub: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(93,96,90,0.86)',
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(121,124,117,0.16)',
    marginBottom: 18,
  },
  // AI observation card
  observationCard: {
    borderRadius: 10,
    backgroundColor: '#f7f1e5',
    borderWidth: 1,
    borderColor: '#e3d3b5',
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
    color: '#8b6a30',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  observationText: {
    fontSize: 13,
    lineHeight: 19.5,
    color: '#564929',
    fontWeight: '400',
  },
  // Section mini label
  miniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(71,102,74,0.72)',
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
    borderRadius: 8,
    backgroundColor: '#fff1eb',
    borderWidth: 1,
    borderColor: '#e6bfb1',
  },
  chipText: {
    fontSize: 12,
    color: '#86412e',
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
    backgroundColor: 'rgba(71,102,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  careText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18.5,
    color: '#3f4c43',
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
    backgroundColor: C.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18.5,
    color: '#3f4c43',
    fontWeight: '500',
  },
  // Close button
  sheetCloseRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sheetCloseBtn: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f3f6f1',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primaryDim,
  },
  // Premium lock overlay (over sheet)
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  lockOverlayTint: {
    backgroundColor: 'rgba(28,34,30,0.42)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lockContent: {
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  lockIconRing: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  lockSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(246,250,247,0.92)',
    textAlign: 'center',
    fontWeight: '400',
  },
  lockBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.24)',
  },
  lockBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primaryDim,
  },
});




// â”€â”€â”€ Main screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function HealthHubScreen({
  scrollToTopSignal = 0,
  summary,
  timeline,
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
  vaccineAttentionCounts,
}: HealthHubScreenProps) {
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();

  // â”€â”€ local state â”€â”€
  const [selectedItem, setSelectedItem] = useState<HealthHubTimelineItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetMode, setAddSheetMode] = useState<AddRecordMode>('typeSelect');
  const [addSheetPresetTitle, setAddSheetPresetTitle] = useState('');
  const [addSheetPresetType, setAddSheetPresetType] = useState<AddHealthRecordType>('diagnosis');
  const [timelineFilter, setTimelineFilter] = useState<HealthHubCategory>('all');
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

  // â”€â”€ breed insights (memoised) â”€â”€
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
  const timelineFilterOptions = useMemo(
    () => ([
      { key: 'all' as const, label: isTr ? 'Tum' : 'All' },
      { key: 'vaccine' as const, label: isTr ? 'Asi' : 'Vaccines' },
      { key: 'weight' as const, label: isTr ? 'Kilo' : 'Weight' },
      { key: 'vet' as const, label: 'Vet' },
      { key: 'record' as const, label: isTr ? 'Kayit' : 'Records' },
    ]),
    [isTr],
  );
  const filteredTimelinePreview = useMemo(() => {
    const base = timelineFilter === 'all' ? timeline : timeline.filter((item) => item.type === timelineFilter);
    // When viewing 'all', suppress record items that are linked to a vet visit already shown in the list.
    // This prevents duplicates like "General Checkup · Record" + "General Checkup · Vet Visit" for the same event.
    if (timelineFilter !== 'all') return base;
    const visibleVetVisitIds = new Set(
      base
        .filter((item) => item.type === 'vet')
        .map((item) => {
          // vet items have id "visit-{visitId}"
          return item.id.startsWith('visit-') ? item.id.slice(6) : null;
        })
        .filter(Boolean) as string[],
    );
    return base.filter((item) => {
      if (item.type !== 'record') return true;
      if (!item.vetVisitId) return true;
      return !visibleVetVisitIds.has(item.vetVisitId);
    });
  }, [timeline, timelineFilter]);
  const createSavedPayloadRef = useRef<AddHealthRecordPayload | null>(null);
  const headerBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!createPreset?.openCreate) return;
    openCreate(createPreset.type ?? 'diagnosis', createPreset.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPreset?.nonce, createPreset?.openCreate]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [scrollToTopSignal]);

  const healthAreas = useMemo(() => {
    const areaCardMap = new Map<AreaRowKey, HealthHubAreaCard>((areaCards ?? []).map((card) => [card.key, card]));
    const definitions: Array<{ key: AreaRowKey; title: string; fallbackSubtitle: string; onPress?: () => void }> = [
      {
        key: 'vet',
        title: isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits',
        fallbackSubtitle: isTr ? 'Klinik gecmisi ve randevular' : 'Visits, checkups, and scheduled care',
        onPress: onOpenVetVisits,
      },
      {
        key: 'vaccines',
        title: isTr ? 'Asilar' : 'Vaccines',
        fallbackSubtitle: isTr ? 'Son durum ve sonraki dozlar' : 'Coverage and upcoming doses',
        onPress: onOpenVaccines,
      },
      {
        key: 'weight',
        title: isTr ? 'Agirlik Profili' : 'Weight Profile',
        fallbackSubtitle: isTr ? 'Trend ve son olcumler' : 'Trends and recent weigh-ins',
        onPress: onOpenWeightTracking,
      },
      {
        key: 'records',
        title: isTr ? 'Saglik Kayitlari' : 'Health Records',
        fallbackSubtitle: isTr ? 'Tani, test ve tedavi gecmisi' : 'Diagnoses, tests, and treatment history',
        onPress: onOpenHealthRecords,
      },
      {
        key: 'documents',
        title: isTr ? 'Belgeler' : 'Documents',
        fallbackSubtitle: isTr ? 'Raporlar, faturalar ve dosyalar' : 'Reports, invoices, and uploaded files',
        onPress: onOpenDocuments,
      },
    ];

    return definitions.map((definition) => {
      const overview = domainOverview?.[definition.key === 'vet' ? 'vet' : definition.key];
      const card = areaCardMap.get(definition.key);
      const statusMeta = healthAreaStatusMeta(
        card?.statusText ?? overview?.statusText,
        definition.key,
        vaccineAttentionCounts?.overdueCount ?? 0,
        isTr,
      );
      const helperText = statusMeta.kind === 'empty'
        ? emptyAreaGuidance(definition.key, isTr)
        : overview?.infoText
          ?? card?.highlight.detail
          ?? card?.highlight.secondary
          ?? definition.fallbackSubtitle;

      return {
        key: definition.key,
        title: definition.title,
        onPress: definition.onPress,
        countText: card?.countText ?? overview?.countText ?? (isTr ? '0 kayit' : '0 records'),
        statusLabel: statusMeta.label,
        statusKind: statusMeta.kind,
        helperText,
        actionLabel: statusMeta.kind === 'empty' ? actionLabelForArea(definition.key, isTr) : null,
      };
    });
  }, [areaCards, domainOverview, isTr, onOpenDocuments, onOpenHealthRecords, onOpenVaccines, onOpenVetVisits, onOpenWeightTracking, vaccineAttentionCounts?.overdueCount]);

  const healthSummaryData = useMemo(() => {
    const overdueItems = vaccineAttentionCounts?.overdueCount ?? 0;
    const dueSoonItems = healthAreas.filter((item) => item.statusKind === 'soon').length;
    const missingDataAreas = healthAreas.filter((item) => item.statusKind === 'empty').length;
    const nextRecommendedArea = healthAreas.find((item) => item.statusKind === 'attention')
      ?? healthAreas.find((item) => item.statusKind === 'soon')
      ?? healthAreas.find((item) => item.statusKind === 'empty')
      ?? null;
    const summaryMessage = overdueItems > 0
      ? (isTr ? 'Bugun dikkat isteyen saglik girdileri var.' : 'There are health items that need attention today.')
      : dueSoonItems > 0
        ? (isTr ? 'Yaklasan saglik aksiyonlari hazir bekliyor.' : 'Upcoming health actions are ready to review.')
        : missingDataAreas > 0
          ? (isTr ? 'Eksik alanlari tamamlayarak daha guclu bir saglik kaydi kurun.' : 'Fill missing areas to build a stronger health record.')
          : (isTr ? 'Kayitlar duzenli gorunuyor.' : 'Your health records look well organized.');
    const recommendedLabel = nextRecommendedArea
      ? (isTr ? 'Sonraki en iyi adim' : 'Recommended next step')
      : (isTr ? 'Saglik ozeti' : 'Health snapshot');
    const recommendedAction = nextRecommendedArea
      ? (nextRecommendedArea.actionLabel ?? nextRecommendedArea.title)
      : (isTr ? 'Kayitlari guncel tutmaya devam edin.' : 'Keep your records up to date.');

    return { overdueItems, dueSoonItems, missingDataAreas, summaryMessage, recommendedLabel, recommendedAction };
  }, [healthAreas, isTr, vaccineAttentionCounts?.overdueCount]);
  const handleOpenTimelineHistory = () => {
    if (timelineFilter === 'vaccine') {
      onOpenVaccines?.();
      return;
    }
    if (timelineFilter === 'weight') {
      onOpenWeightTracking?.();
      return;
    }
    if (timelineFilter === 'vet') {
      onOpenVetVisits?.();
      return;
    }
    onOpenHealthRecords?.();
  };

  const primaryInsight = topInsights?.[0] ?? null;
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
  // â”€â”€ form helpers â”€â”€
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

  const quickActionItems = useMemo(() => ([
    {
      key: 'vaccine' as const,
      title: isTr ? 'Asi kaydi ekle' : 'Log Vaccine',
      subtitle: isTr ? 'Dozlari ve sonraki tarihleri duzenleyin' : 'Track doses and next due dates',
      shortHint: isTr ? 'Immunizasyon' : 'Immunization',
      onPress: () => openCreate('vaccine'),
      icon: <Syringe size={18} color="#41688c" strokeWidth={2.2} />,
      tone: 'vaccine' as const,
    },
    {
      key: 'weight' as const,
      title: isTr ? 'Kilo ekle' : 'Add Weight',
      subtitle: isTr ? 'Trend takibi icin yeni olcum ekleyin' : 'Log a fresh weigh-in for trend tracking',
      shortHint: isTr ? 'Olcum girişi' : 'Measurement',
      onPress: onAddWeightEntry,
      icon: <TrendingUp size={18} color="#5f4f93" strokeWidth={2.2} />,
      tone: 'weight' as const,
    },
    {
      key: 'document' as const,
      title: isTr ? 'Belge yukle' : 'Upload Document',
      subtitle: isTr ? 'Raporlari ve dosyalari tek yerde tutun' : 'Keep reports and files ready in one place',
      shortHint: isTr ? 'Dosya eki' : 'Attachment',
      onPress: onOpenDocuments,
      icon: <Files size={18} color="#7a5a3a" strokeWidth={2.2} />,
      tone: 'document' as const,
    },
  ]), [isTr, onAddWeightEntry, onOpenDocuments]);

  const primaryQuickActionKey = useMemo(() => {
    const vaccinesStatus = healthAreas.find((item) => item.key === 'vaccines')?.statusKind;
    if (vaccinesStatus === 'attention' || vaccinesStatus === 'soon') return 'vaccine';
    const weightStatus = healthAreas.find((item) => item.key === 'weight')?.statusKind;
    if (weightStatus === 'empty') return 'weight';
    return 'vaccine';
  }, [healthAreas]);

  const primaryQuickAction = useMemo(
    () => quickActionItems.find((item) => item.key === primaryQuickActionKey) ?? quickActionItems[0],
    [primaryQuickActionKey, quickActionItems],
  );
  const secondaryQuickActions = useMemo(
    () => quickActionItems.filter((item) => item.key !== primaryQuickAction.key),
    [primaryQuickAction.key, quickActionItems],
  );

  const springDown = (v: Animated.Value, toValue = 0.96) =>
    () => Animated.spring(v, { toValue, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const springUp = (v: Animated.Value) =>
    () => Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 7 }).start();

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={s.sectionEyebrow}>{isTr ? 'Genel Durum' : 'Health Summary'}</Text>
            <Text style={s.sectionLead}>{healthSummaryData.summaryMessage}</Text>
          </View>
        </View>
        <View style={s.summaryRecommendationRow}>
          <Text style={s.summaryRecommendationLabel}>{healthSummaryData.recommendedLabel}</Text>
          <Text style={s.summaryRecommendationValue}>{healthSummaryData.recommendedAction}</Text>
        </View>
        <View style={s.summaryOverviewCard}>
          <View style={s.summaryMetricRow}>
            <View style={[s.summaryMetricItem, s.summaryMetricUrgent]}>
              <View style={s.summaryMetricLabelRow}>
                <View style={[s.summaryMetricDot, s.summaryMetricDotUrgent]} />
                <Text style={s.summaryMetricLabel}>{isTr ? 'Geciken oge' : 'Overdue items'}</Text>
              </View>
              <Text style={[s.summaryMetricValue, s.summaryMetricValueUrgent]}>{healthSummaryData.overdueItems}</Text>
            </View>
            <View style={s.summaryMetricDivider} />
            <View style={s.summaryMetricItem}>
              <View style={s.summaryMetricLabelRow}>
                <View style={[s.summaryMetricDot, s.summaryMetricDotSoon]} />
                <Text style={s.summaryMetricLabel}>{isTr ? 'Yaklasan alan' : 'Due soon areas'}</Text>
              </View>
              <Text style={[s.summaryMetricValue, s.summaryMetricValueSoon]}>{healthSummaryData.dueSoonItems}</Text>
            </View>
            <View style={s.summaryMetricDivider} />
            <View style={s.summaryMetricItem}>
              <View style={s.summaryMetricLabelRow}>
                <View style={[s.summaryMetricDot, s.summaryMetricDotMissing]} />
                <Text style={s.summaryMetricLabel}>{isTr ? 'Eksik veri alani' : 'Missing data areas'}</Text>
              </View>
              <Text style={[s.summaryMetricValue, s.summaryMetricValueMissing]}>{healthSummaryData.missingDataAreas}</Text>
            </View>
          </View>
        </View>

        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={s.sectionEyebrow}>{isTr ? 'Hizli Islemler' : 'Quick Actions'}</Text>
            <Text style={s.sectionLeadSecondary}>{isTr ? 'Veri girisini net aksiyonlarla baslatin.' : 'Start structured input with clear actions.'}</Text>
          </View>
        </View>
        <View style={s.quickActionZone}>
          <Pressable
            style={[s.quickActionPrimaryCard, primaryQuickAction.tone === 'vaccine' ? s.quickActionPrimaryVaccine : s.quickActionPrimaryVet]}
            onPress={primaryQuickAction.onPress}
            disabled={!primaryQuickAction.onPress}
          >
            <View style={s.quickActionPrimaryHead}>
              <View style={[
                s.quickActionPrimaryIconWrap,
                primaryQuickAction.tone === 'vaccine'
                  ? s.quickActionIconVaccine
                  : s.quickActionIconVet,
              ]}>
                {primaryQuickAction.icon}
              </View>
              <View style={s.quickActionPrimaryBadge}>
                <Text style={s.quickActionPrimaryBadgeText}>{isTr ? 'Onerilen' : 'Recommended'}</Text>
              </View>
            </View>
            <Text style={s.quickActionPrimaryTitle}>{primaryQuickAction.title}</Text>
            <Text style={s.quickActionPrimarySub}>{primaryQuickAction.subtitle}</Text>
          </Pressable>

          <View style={s.quickActionSecondaryList}>
            {secondaryQuickActions.map((action, index) => (
              <Pressable
                key={action.key}
                style={[s.quickActionSecondaryRow, index === secondaryQuickActions.length - 1 ? s.quickActionSecondaryRowLast : null]}
                onPress={action.onPress}
                disabled={!action.onPress}
              >
                <View
                  style={[
                    s.quickActionSecondaryIconWrap,
                    action.tone === 'weight'
                      ? s.quickActionIconWeight
                      : action.tone === 'document'
                        ? s.quickActionIconDocument
                        : action.tone === 'vaccine'
                          ? s.quickActionIconVaccine
                          : s.quickActionIconVet,
                  ]}
                >
                  {action.icon}
                </View>
                <View style={s.quickActionSecondaryTextWrap}>
                  <Text style={s.quickActionSecondaryTitle}>{action.title}</Text>
                  <Text style={s.quickActionSecondarySub} numberOfLines={1}>{action.shortHint}</Text>
                </View>
                <ChevronRight size={14} color={C.primary} strokeWidth={2.2} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={s.sectionEyebrow}>{isTr ? 'Saglik Alanlari' : 'Health Areas'}</Text>
            <Text style={s.sectionLeadSecondary}>{isTr ? 'Her alanin durumunu ve sonraki dogru adimi gorun.' : 'See each area status and the next right action.'}</Text>
          </View>
        </View>
        <View style={s.healthAreaList}>
          {healthAreas.map((item) => {
            const statusPillTone = item.statusKind === 'attention'
              ? s.healthAreaStatusAttention
              : item.statusKind === 'soon'
                ? s.healthAreaStatusSoon
                : item.statusKind === 'empty'
                  ? s.healthAreaStatusEmpty
                  : s.healthAreaStatusOk;
            const statusTextTone = item.statusKind === 'attention'
              ? s.healthAreaStatusTextAttention
              : item.statusKind === 'soon'
                ? s.healthAreaStatusTextSoon
                : item.statusKind === 'empty'
                  ? s.healthAreaStatusTextEmpty
                  : s.healthAreaStatusTextOk;
            const iconTone = item.key === 'vet'
              ? s.healthAreaIconVet
              : item.key === 'vaccines'
                ? s.healthAreaIconVaccine
                : item.key === 'weight'
                  ? s.healthAreaIconWeight
                  : item.key === 'documents'
                    ? s.healthAreaIconDocument
                    : s.healthAreaIconRecord;
            return (
              <Pressable key={item.key} style={s.healthAreaCard} onPress={() => item.onPress?.()}>
                <View style={s.healthAreaCardTop}>
                  <View style={s.healthAreaIdentity}>
                    <View style={[s.healthAreaIconWrap, iconTone]}>
                      <HealthHubCategoryIcon kind={item.key} size={20} />
                    </View>
                    <View style={s.healthAreaTitleWrap}>
                      <Text style={s.healthAreaTitle}>{item.title}</Text>
                      <Text style={s.healthAreaCount}>{item.countText}</Text>
                    </View>
                  </View>
                  <View style={[s.healthAreaStatusPill, statusPillTone]}>
                    <Text style={[s.healthAreaStatusText, statusTextTone]}>{item.statusLabel}</Text>
                  </View>
                </View>
                <Text style={[s.healthAreaHelper, item.statusKind === 'empty' ? s.healthAreaHelperEmpty : null]}>{item.helperText}</Text>
                {item.actionLabel ? (
                  <View style={s.healthAreaActionHintWrap}>
                    <Text style={s.healthAreaActionHint}>{item.actionLabel}</Text>
                  </View>
                ) : null}
                <View style={s.healthAreaCardFooter}>
                  <View style={s.healthAreaChevronCapsule}>
                    <ChevronRight size={14} color={C.primary} strokeWidth={2.2} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={s.sectionEyebrow}>{isTr ? 'Son Aktivite' : 'Recent Activity'}</Text>
            <Text style={s.sectionLeadSecondary}>{isTr ? 'En son eklenen saglik guncellemeleri.' : 'A lightweight preview of the latest health updates.'}</Text>
          </View>
          <Pressable style={s.historyCta} onPress={handleOpenTimelineHistory}>
            <Text style={s.historyCtaText}>{isTr ? 'Tum gecmisi gor' : 'View full history'}</Text>
            <ChevronRight size={14} color={C.primary} strokeWidth={2.2} />
          </Pressable>
        </View>
        <View style={s.timelineFilterRowCompact}>
          {timelineFilterOptions.map((option) => {
            const active = option.key === timelineFilter;
            return (
              <Pressable
                key={option.key}
                style={[s.timelineTab, active ? s.timelineTabActive : null]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTimelineFilter(option.key);
                }}
              >
                {timelineFilterIcon(option.key, active)}
                <Text style={[s.timelineTabText, active ? s.timelineTabTextActive : null]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.timelinePreviewCard}>
          {filteredTimelinePreview.length > 0 ? (
            filteredTimelinePreview.slice(0, 3).map((item, idx) => (
              <View key={item.id} style={[s.timelinePreviewRowModern, idx < Math.min(filteredTimelinePreview.length, 3) - 1 && s.timelinePreviewRowDividerModern]}>
                <View style={[s.timelinePreviewIconWrapModern, { backgroundColor: `${timelineTypeAccent(item.type)}14` }]}>
                  {timelineFilterIcon(item.type, true)}
                </View>
                <View style={s.timelinePreviewBodyModern}>
                  <Text style={s.timelinePreviewTitleModern} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.timelinePreviewMetaModern} numberOfLines={1}>{item.date} · {typeTag(item.type, isTr)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={s.timelinePreviewEmptyModern}>
              <Text style={s.timelinePreviewEmptyTitle}>{isTr ? 'Henuz aktivite yok' : 'No activity yet'}</Text>
              <Text style={s.timelinePreviewEmptyTextModern}>{isTr ? 'Asi veya veteriner ziyareti ekleyerek gecmisi baslatin.' : 'Start with a vaccine or vet visit to build history.'}</Text>
            </View>
          )}
        </View>
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


      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* BREED INSIGHTS BOTTOM SHEET                                           */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        visible={breedSheetOpen}
        transparent
        animationType="none"
        onRequestClose={closeBreedSheet}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Animated backdrop */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(16,20,16,0.34)', opacity: sheetBackdropOpacity }]}
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
                        <BreedDnaIcon size={24} color={C.primary} />
                      </View>
                    )}
                    <View style={bs.sheetHeaderText}>
                      {petName ? (
                        <Text style={bs.sheetPetName} numberOfLines={1}>{petName}</Text>
                      ) : null}
                      <Text style={bs.sheetBreedName} numberOfLines={1}>{breedEntry.breed}</Text>
                      <Text style={bs.sheetBreedSub}>
                        {breedEntry.petType === 'Dog' ? (isTr ? 'Köpek' : 'Dog') : (isTr ? 'Kedi' : 'Cat')}
                        {' | '}{breedEntry.weightRangeKg[0]}-{breedEntry.weightRangeKg[1]} kg
                        {' | '}{breedEntry.lifespanYears[0]}-{breedEntry.lifespanYears[1]} {isTr ? 'yıl' : 'yrs'}
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
                    <View key={i} style={[bs.chip, breedInsight?.matchedRisks.includes(isTr ? r.label_tr : r.label) && { borderColor: '#cf7f64', backgroundColor: '#f9ddd3' }]}>
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
                          <DailyCareIcon category={item.category} size={15} color={C.primary} />
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
                android_ripple={{ color: 'rgba(71,102,74,0.08)' }}
              >
                <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
                <View style={[StyleSheet.absoluteFillObject, bs.lockOverlayTint]} />
                <View style={bs.lockContent}>
                  <View style={bs.lockIconRing}>
                    <LockIcon size={24} color={C.primary} />
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* DETAIL / DELETE BOTTOM SHEET                                          */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                          {isTr ? 'Sil - emin misin?' : 'Confirm Delete'}
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ADD RECORD SHEET                                                       */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  filterChipActive: {
    borderColor: 'rgba(71,102,74,0.18)',
    backgroundColor: '#edf5ea',
  },
  filterChipIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
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

  // â”€â”€ Health Status Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
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

  // â”€â”€ Quick Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 22,
    marginBottom: 18,
    paddingTop: 2,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
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

  // â”€â”€ Timeline Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ¦¦ Timeline Preview ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
  timelinePreviewBlock: {
    marginBottom: 20,
  },
  timelinePreviewList: {
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderRadius: 12,
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
  timelinePreviewIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  timelinePreviewEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  timelinePreviewEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    fontWeight: '500',
  },
  // â”€â”€ Area List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  areaListShell: {
    backgroundColor: C.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(93,96,90,0.10)',
    marginBottom: 20,
  },
  areaListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  areaListRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.10)',
  },
  areaListIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f4f4ee',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  areaListBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  areaListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  areaListSub: {
    fontSize: 12,
    fontWeight: '500',
    color: C.onSurfaceVariant,
  },
  areaListStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  areaListStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // â”€â”€ AI Text Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  sectionHeaderRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47664a',
    letterSpacing: 0.1,
  },
  sectionLead: {
    marginTop: 5,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#24342d',
    maxWidth: 320,
  },
  sectionLeadSecondary: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#6b736d',
    maxWidth: 310,
  },
  summaryRecommendationRow: {
    marginTop: -1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
  },
  summaryRecommendationLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#6b736d',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  summaryRecommendationValue: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#24342d',
    letterSpacing: -0.2,
  },
  summaryOverviewCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#3e5145',
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  summaryMetricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryMetricItem: {
    flex: 1,
    gap: 6,
  },
  summaryMetricUrgent: {
  },
  summaryMetricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryMetricDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  summaryMetricDotUrgent: {
    backgroundColor: '#b13b2a',
  },
  summaryMetricDotSoon: {
    backgroundColor: '#9b6400',
  },
  summaryMetricDotMissing: {
    backgroundColor: '#5f665f',
  },
  summaryMetricValue: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    color: '#24342d',
    letterSpacing: -1.1,
  },
  summaryMetricValueUrgent: {
    color: '#962f1f',
  },
  summaryMetricValueSoon: {
    color: '#8b5a00',
  },
  summaryMetricValueMissing: {
    color: '#4f5650',
  },
  summaryMetricLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: '#66706a',
  },
  summaryMetricDivider: {
    width: 1,
    marginHorizontal: 14,
    backgroundColor: 'rgba(71,102,74,0.08)',
  },
  quickActionZone: {
    marginBottom: 26,
    gap: 10,
  },
  quickActionPrimaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#405248',
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  quickActionPrimaryVet: {
    backgroundColor: 'rgba(250,255,250,0.93)',
  },
  quickActionPrimaryVaccine: {
    backgroundColor: 'rgba(248,252,255,0.93)',
  },
  quickActionPrimaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickActionPrimaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionPrimaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(71,102,74,0.10)',
  },
  quickActionPrimaryBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#47664a',
    letterSpacing: 0.1,
  },
  quickActionPrimaryTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: '#24342d',
    letterSpacing: -0.2,
  },
  quickActionPrimarySub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#67716b',
  },
  quickActionSecondaryList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    backgroundColor: 'rgba(255,255,255,0.82)',
    overflow: 'hidden',
  },
  quickActionSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.10)',
  },
  quickActionSecondaryRowLast: {
    borderBottomWidth: 0,
  },
  quickActionSecondaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionSecondaryTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  quickActionSecondaryTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#24342d',
  },
  quickActionSecondarySub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
    color: '#6f7872',
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  quickActionIconVet: {
    backgroundColor: '#eaf5eb',
  },
  quickActionIconVaccine: {
    backgroundColor: '#edf4fa',
  },
  quickActionIconWeight: {
    backgroundColor: '#f2edfb',
  },
  quickActionIconDocument: {
    backgroundColor: '#f7efe6',
  },
  healthAreaList: {
    gap: 14,
    marginBottom: 28,
  },
  healthAreaCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#405248',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  healthAreaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthAreaIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  healthAreaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f4f4ee',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthAreaIconVet: {
    backgroundColor: '#eaf5ec',
    borderColor: 'rgba(78,121,90,0.20)',
  },
  healthAreaIconVaccine: {
    backgroundColor: '#e9f0fa',
    borderColor: 'rgba(65,104,140,0.20)',
  },
  healthAreaIconWeight: {
    backgroundColor: '#f2edfb',
    borderColor: 'rgba(95,79,147,0.20)',
  },
  healthAreaIconRecord: {
    backgroundColor: '#eeeaf8',
    borderColor: 'rgba(90,74,122,0.20)',
  },
  healthAreaIconDocument: {
    backgroundColor: '#f8efe4',
    borderColor: 'rgba(122,90,58,0.20)',
  },
  healthAreaTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  healthAreaTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: '#24342d',
    letterSpacing: -0.2,
  },
  healthAreaCount: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#6b736d',
  },
  healthAreaStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    minWidth: 96,
    alignItems: 'center',
  },
  healthAreaStatusAttention: {
    backgroundColor: '#fde8e3',
    borderColor: 'rgba(167,59,33,0.18)',
  },
  healthAreaStatusSoon: {
    backgroundColor: '#fdf2dd',
    borderColor: 'rgba(155,100,0,0.18)',
  },
  healthAreaStatusEmpty: {
    backgroundColor: '#eef1ee',
    borderColor: 'rgba(95,102,95,0.16)',
  },
  healthAreaStatusOk: {
    backgroundColor: '#eaf4ec',
    borderColor: 'rgba(65,109,73,0.16)',
  },
  healthAreaStatusText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  healthAreaStatusTextAttention: {
    color: '#a73b21',
  },
  healthAreaStatusTextSoon: {
    color: '#9b6400',
  },
  healthAreaStatusTextEmpty: {
    color: '#5f665f',
  },
  healthAreaStatusTextOk: {
    color: '#416d49',
  },
  healthAreaHelper: {
    marginTop: 13,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: '#5f6762',
  },
  healthAreaHelperEmpty: {
    color: '#56605a',
    fontWeight: '600',
  },
  healthAreaActionHintWrap: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(71,102,74,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
  },
  healthAreaActionHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47664a',
  },
  healthAreaCardFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  healthAreaChevronCapsule: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: 'rgba(71,102,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
  },
  historyCtaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47664a',
  },
  timelineFilterRowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timelineTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.56)',
  },
  timelineTabActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
  },
  timelineTabText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#727972',
  },
  timelineTabTextActive: {
    color: '#24342d',
  },
  timelinePreviewCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    overflow: 'hidden',
  },
  timelinePreviewRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timelinePreviewRowDividerModern: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(93,96,90,0.10)',
  },
  timelinePreviewIconWrapModern: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelinePreviewBodyModern: {
    flex: 1,
    gap: 2,
  },
  timelinePreviewTitleModern: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#24342d',
  },
  timelinePreviewMetaModern: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: '#6b736d',
  },
  timelinePreviewEmptyModern: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  timelinePreviewEmptyTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#24342d',
  },
  timelinePreviewEmptyTextModern: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    color: '#6b736d',
  },});















