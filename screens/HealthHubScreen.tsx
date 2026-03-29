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
import * as Haptics from 'expo-haptics';
import { getBreedHealthEntry, type BreedHealthEntry, type DailyCareCategory } from '../lib/breedHealthData';
import { generateBreedInsight } from '../lib/breedInsightsEngine';
import AddRecordSheet, { type AddRecordMode } from '../components/AddRecordSheet';
import {
  CheckCircle,
  ChevronRight,
  FileText,
  Files,
  Footprints,
  HeartPulse,
  Home,
  Plus,
  Pill,
  Stethoscope,
  Syringe,
  Trash2,
  TrendingUp,
  Utensils,
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

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
  onCreateFlowClosed?: (result: 'saved' | 'cancelled', payload?: AddHealthRecordPayload) => void;
  onDeleteRecord?: (timelineItemId: string) => void;
  onOpenVetVisits?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVaccines?: () => void;
  onOpenWeightTracking?: () => void;
  onAddWeightEntry?: () => void;
  onOpenDocuments?: () => void;
  domainOverview?: HealthHubDomainOverview;
  documentsPreview?: Array<{ id: string; title: string; date: string; type: string }>;
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HealthHubScreen({
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
  documentsPreview,
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
}: HealthHubScreenProps) {
  const isTr = locale === 'tr';

  // ── local state ──
  const [category, setCategory] = useState<HealthHubCategory>(initialCategory);
  const [selectedItem, setSelectedItem] = useState<HealthHubTimelineItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [addSheetMode, setAddSheetMode] = useState<AddRecordMode>('record');
  const [addSheetPresetTitle, setAddSheetPresetTitle] = useState('');
  const [addSheetPresetType, setAddSheetPresetType] = useState<AddHealthRecordType>('diagnosis');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickTranslateY = useRef(new Animated.Value(500)).current;
  const quickBackdropOpacity = useRef(new Animated.Value(0)).current;
  const quickHeightRef = useRef(500);
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
  const qaScales = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => { setCategory(initialCategory); }, [initialCategory, categoryResetKey]);

  useEffect(() => {
    if (!createPreset?.openCreate) return;
    openCreate(createPreset.type ?? 'diagnosis', createPreset.title);
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
  const openCreate = (presetType: AddHealthRecordType = 'diagnosis', presetTitle = '') => {
    const mode: AddRecordMode =
      presetType === 'procedure' ? 'vetVisit' :
      presetType === 'vaccine'   ? 'vaccine'  : 'record';
    setAddSheetMode(mode);
    setAddSheetPresetTitle(presetTitle ?? '');
    setAddSheetPresetType(presetType);
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

  // ── Quick-add sheet animation ────────────────────────────────────────────────
  const quickSheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          quickTranslateY.setValue(gs.dy);
          quickBackdropOpacity.setValue(Math.max(0, 1 - gs.dy / Math.max(quickHeightRef.current, 1)));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.7) {
          Animated.parallel([
            Animated.spring(quickTranslateY, { toValue: quickHeightRef.current, damping: 28, stiffness: 400, useNativeDriver: true }),
            Animated.timing(quickBackdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => setQuickAddOpen(false));
        } else {
          Animated.parallel([
            Animated.spring(quickTranslateY, { toValue: 0, damping: 26, stiffness: 380, mass: 0.85, useNativeDriver: true }),
            Animated.timing(quickBackdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  function openQuickAdd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuickAddOpen(true);
    quickTranslateY.setValue(quickHeightRef.current);
    Animated.parallel([
      Animated.spring(quickTranslateY, { toValue: 0, damping: 26, stiffness: 380, mass: 0.85, useNativeDriver: true }),
      Animated.timing(quickBackdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  function closeQuickAdd(onClosed?: () => void) {
    Animated.parallel([
      Animated.spring(quickTranslateY, { toValue: quickHeightRef.current, damping: 28, stiffness: 400, useNativeDriver: true }),
      Animated.timing(quickBackdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setQuickAddOpen(false); onClosed?.(); });
  }

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
              <Stop offset="0%" stopColor="#0a1e26" />
              <Stop offset="42%" stopColor="#10313b" />
              <Stop offset="100%" stopColor="#18454e" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#healthHubPageBg)" />
          <Rect x="0" y="0" width="100" height="100" fill="rgba(217,245,240,0.03)" />
        </Svg>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerLabel}>{isTr ? 'SAĞLIK KAYITLARI' : 'CARE RECORDS'}</Text>
            <Text style={s.headerTitle}>{isTr ? 'Sağlık Merkezi' : 'Health Hub'}</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: headerBtnScale }] }}>
            <Pressable
              style={s.headerAddBtn}
              onPressIn={springDown(headerBtnScale, 0.88)}
              onPressOut={springUp(headerBtnScale)}
              onPress={openQuickAdd}
              android_ripple={{ color: 'rgba(127,196,184,0.18)', borderless: true, radius: 24 }}
            >
              <Plus size={20} color="#7fc4b8" strokeWidth={2.4} />
            </Pressable>
          </Animated.View>
        </View>

        {/* ── CATEGORY SECTION HEADER ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionLabel, s.sectionLabelAreas]}>{isTr ? 'SAĞLIK ALANLARI' : 'HEALTH AREAS'}</Text>
          <View style={[s.sectionHeaderLine, s.sectionHeaderLineAreas]} />
        </View>

        {/* ── CATEGORY CARDS ── */}
        <View style={s.categoryList}>
          {hubEntries.map((entry, idx) => {
            const rowTheme = AREA_ROW_THEMES[entry.key as Exclude<AreaRowKey, 'documents'>];
            const gradientId = `healthHubAreaGradient-${entry.key}`;
            return (
              <Animated.View key={entry.key} style={{ transform: [{ scale: getCardScale(entry.key) }] }}>
              <Pressable
                style={[
                  s.categoryCard,
                  idx < hubEntries.length - 1 && s.categoryCardDividerSoft,
                ]}
                onPressIn={springDown(getCardScale(entry.key), 0.97)}
                onPressOut={springUp(getCardScale(entry.key))}
                onPress={() => entry.onPress?.()}
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
              </Animated.View>
            );
          })}
        </View>

        <View style={[s.sectionHeaderRow, s.sectionHeaderRowSpaced]}>
          <Text style={[s.sectionLabel, s.sectionLabelDocs]}>{isTr ? 'BELGELER' : 'DOCUMENTS'}</Text>
          <View style={[s.sectionHeaderLine, s.sectionHeaderLineDocs]} />
        </View>
        <View style={s.categoryList}>
          {(() => {
            return (
              <Pressable
                style={({ pressed }) => [s.categoryCard, pressed && s.categoryCardPressed]}
                onPress={() => onOpenDocuments?.()}
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
            );
          })()}
        </View>

        {/* ── ACTIVE MEDICATIONS ── */}
        {medicationCourses && medicationCourses.filter((m) => m.status === 'active' || m.status === 'paused').length > 0 ? (
          <>
            <View style={[s.sectionHeaderRow, s.sectionHeaderRowSpaced]}>
              <Text style={[s.sectionLabel, s.sectionLabelMeds]}>{isTr ? 'AKTİF İLAÇLAR' : 'ACTIVE MEDICATIONS'}</Text>
              <View style={[s.sectionHeaderLine, s.sectionHeaderLineMeds]} />
            </View>
            <View style={s.categoryList}>
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
            </View>
          </>
        ) : null}

        {/* ── BREED INSIGHTS ── */}
        {breedEntry ? (
          <>
            <View style={[s.sectionHeaderRow, s.sectionHeaderRowSpaced]}>
              <Text style={[s.sectionLabel, { color: 'rgba(127,196,184,0.55)' }]}>
                {isTr ? 'IRK SAĞLIK PROFİLİ' : 'BREED INSIGHTS'}
              </Text>
              <View style={[s.sectionHeaderLine, { backgroundColor: 'rgba(127,196,184,0.15)' }]} />
            </View>
            <View style={{ marginBottom: 8 }}>
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
          </>
        ) : null}

        {/* ── EXPENSE CHART ── */}
        {summary.totalExpenses && false ? <View style={s.expenseChartCard}>
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
        </View> : null}

      </ScrollView>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* QUICK-ADD BOTTOM SHEET                                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Modal visible={quickAddOpen} transparent animationType="none" onRequestClose={() => closeQuickAdd()}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: quickBackdropOpacity }]} pointerEvents="none" />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeQuickAdd()} />
          <Animated.View
            style={[bs.sheet, { transform: [{ translateY: quickTranslateY }] }]}
            onLayout={(e) => { quickHeightRef.current = e.nativeEvent.layout.height; }}
          >
            <View style={bs.sheetHandleArea} {...quickSheetPan.panHandlers}>
              <View style={bs.sheetHandle} />
            </View>
            <Text style={qa.title}>{isTr ? 'Kayıt Ekle' : 'Add Record'}</Text>

            {/* Vet Visit */}
            <Animated.View style={{ transform: [{ scale: qaScales[0] }] }}>
              <Pressable
                style={({ pressed }) => [qa.row, pressed && qa.rowPressed]}
                onPressIn={springDown(qaScales[0], 0.97)}
                onPressOut={springUp(qaScales[0])}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeQuickAdd(() => openCreate('procedure', isTr ? 'Veteriner Ziyareti' : 'Vet Visit')); }}
              >
                <View style={[qa.iconBox, { backgroundColor: 'rgba(100,200,180,0.12)', borderColor: 'rgba(100,200,180,0.22)' }]}>
                  <Stethoscope size={20} color="#7fc4b8" strokeWidth={1.8} />
                </View>
                <View style={qa.rowBody}>
                  <Text style={qa.rowLabel}>{isTr ? 'Veteriner Ziyareti' : 'Vet Visit'}</Text>
                  <Text style={qa.rowSub}>{isTr ? 'Muayene ve kontrol kaydı' : 'Checkup or examination record'}</Text>
                </View>
                <ChevronRight size={14} color="rgba(127,196,184,0.4)" strokeWidth={2.2} />
              </Pressable>
            </Animated.View>

            {/* Vaccine */}
            <Animated.View style={{ transform: [{ scale: qaScales[1] }] }}>
              <Pressable
                style={({ pressed }) => [qa.row, pressed && qa.rowPressed]}
                onPressIn={springDown(qaScales[1], 0.97)}
                onPressOut={springUp(qaScales[1])}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeQuickAdd(() => openCreate('vaccine', isTr ? 'Aşı Kaydı' : 'Vaccine Record')); }}
              >
                <View style={[qa.iconBox, { backgroundColor: 'rgba(100,160,240,0.12)', borderColor: 'rgba(100,160,240,0.22)' }]}>
                  <Syringe size={20} color="#88aaee" strokeWidth={1.8} />
                </View>
                <View style={qa.rowBody}>
                  <Text style={qa.rowLabel}>{isTr ? 'Aşı' : 'Vaccine'}</Text>
                  <Text style={qa.rowSub}>{isTr ? 'Aşı ve hatırlatma kaydı' : 'Vaccination & booster record'}</Text>
                </View>
                <ChevronRight size={14} color="rgba(127,196,184,0.4)" strokeWidth={2.2} />
              </Pressable>
            </Animated.View>

            {/* Weight */}
            <Animated.View style={{ transform: [{ scale: qaScales[2] }] }}>
              <Pressable
                style={({ pressed }) => [qa.row, pressed && qa.rowPressed]}
                onPressIn={springDown(qaScales[2], 0.97)}
                onPressOut={springUp(qaScales[2])}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeQuickAdd(() => onAddWeightEntry ? onAddWeightEntry() : onOpenWeightTracking?.()); }}
              >
                <View style={[qa.iconBox, { backgroundColor: 'rgba(240,180,80,0.12)', borderColor: 'rgba(240,180,80,0.22)' }]}>
                  <BathroomScaleIcon size={20} color="#e8c46a" />
                </View>
                <View style={qa.rowBody}>
                  <Text style={qa.rowLabel}>{isTr ? 'Kilo' : 'Weight'}</Text>
                  <Text style={qa.rowSub}>{isTr ? 'Güncel kilo ölçümü ekle' : 'Log a new weight measurement'}</Text>
                </View>
                <ChevronRight size={14} color="rgba(127,196,184,0.4)" strokeWidth={2.2} />
              </Pressable>
            </Animated.View>

            {/* Health Record */}
            <Animated.View style={{ transform: [{ scale: qaScales[3] }] }}>
              <Pressable
                style={({ pressed }) => [qa.row, qa.rowLast, pressed && qa.rowPressed]}
                onPressIn={springDown(qaScales[3], 0.97)}
                onPressOut={springUp(qaScales[3])}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeQuickAdd(() => openCreate('diagnosis', isTr ? 'Sağlık Kaydı' : 'Health Record')); }}
              >
                <View style={[qa.iconBox, { backgroundColor: 'rgba(180,130,240,0.12)', borderColor: 'rgba(180,130,240,0.22)' }]}>
                  <FileText size={20} color="#c4a0e8" strokeWidth={1.8} />
                </View>
                <View style={qa.rowBody}>
                  <Text style={qa.rowLabel}>{isTr ? 'Sağlık Kaydı' : 'Health Record'}</Text>
                  <Text style={qa.rowSub}>{isTr ? 'Teşhis, reçete, test sonucu' : 'Diagnosis, prescription, test result'}</Text>
                </View>
                <ChevronRight size={14} color="rgba(127,196,184,0.4)" strokeWidth={2.2} />
              </Pressable>
            </Animated.View>

            <View style={{ height: 24 }} />
          </Animated.View>
        </View>
      </Modal>

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
    paddingTop: 56,
    paddingHorizontal: 22,
    paddingBottom: 132,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  headerAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(127,196,184,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(127,196,184,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  headerAddBtnPressed: {
    backgroundColor: 'rgba(127,196,184,0.18)',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: 'rgba(181,226,229,0.78)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#f1fbfc',
    letterSpacing: -1.2,
    lineHeight: 44,
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
    gap: 12,
    marginBottom: 10,
  },
  sectionHeaderRowSpaced: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: 'rgba(196,222,234,0.78)',
    textTransform: 'uppercase',
  },
  sectionLabelAreas: {
    color: 'rgba(143,223,223,0.92)',
  },
  sectionLabelDocs: {
    color: 'rgba(184,205,214,0.88)',
  },
  sectionLabelMeds: {
    color: 'rgba(139,210,196,0.92)',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(189,216,227,0.18)',
  },
  sectionHeaderLineAreas: {
    backgroundColor: 'rgba(143,223,223,0.24)',
  },
  sectionHeaderLineDocs: {
    backgroundColor: 'rgba(184,205,214,0.22)',
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
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 24,
    marginBottom: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(170,222,222,0.08)',
    shadowColor: '#07151b',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  categoryCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  categoryCardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.95,
  },
  categoryCardDividerSoft: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(225,247,247,0.08)',
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
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(231,250,249,0.22)',
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  vaccineCategoryIconBox: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  categoryCardBody: {
    flex: 1,
    gap: 5,
  },
  categoryCardTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.35,
  },
  vaccineCategoryTitle: {
    color: '#ecfffb',
  },
  categoryCardSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: C.onSurfaceVariant,
    lineHeight: 18,
  },
  vaccineCategorySub: {
    color: 'rgba(236,255,251,0.84)',
  },
  vaultPreviewText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(225,238,243,0.78)',
    fontWeight: '600',
  },
  categoryCardRight: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 92,
  },
  countBadge: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(235,251,251,0.22)',
  },
  vaccineCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.primary,
  },
  vaccineCountBadgeText: {
    color: '#ecfffb',
  },
  categoryStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: C.onSurfaceVariant,
    maxWidth: 94,
    textAlign: 'right',
  },
  vaccineCategoryStatusText: {
    color: 'rgba(236,255,251,0.84)',
  },
  vaultCtaText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#d9eef4',
    letterSpacing: 0.15,
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

});

// ─── Quick-add sheet styles ───────────────────────────────────────────────────
const qa = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dff2ef',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,196,184,0.08)',
  },
  rowLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,196,184,0.08)',
  },
  rowPressed: {
    backgroundColor: 'rgba(127,196,184,0.06)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dff2ef',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 12,
    color: 'rgba(160,210,204,0.6)',
    fontWeight: '400',
  },
});
