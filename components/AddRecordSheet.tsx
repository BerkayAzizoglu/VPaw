/**
 * AddRecordSheet — single-page progressive-disclosure health record entry.
 *
 * Type picker → form with sections that cascade in one by one as user fills them.
 * No multi-step wizard. All on one scrollable page with animated section reveals.
 *
 * VetVisit:  status → reason → date → clinic+vet → notes+follow-up → fee (completed)
 * Vaccine:   picker/custom → date → next-due+clinic+batch → atVet+notes
 * Record:    type → title+date → status+files+notes (auto after title+date valid)
 * Weight:    delegates to onSelectWeight immediately
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { AddHealthRecordPayload, AddHealthRecordType } from '../screens/HealthHubScreen';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddRecordMode = 'vetVisit' | 'vaccine' | 'record' | 'typeSelect';
export type AddRecordContext = 'quick' | 'detailed';

type EntryType = 'vetVisit' | 'vaccine' | 'record';
type TypeCardKey = EntryType | 'weight';

type Props = {
  visible: boolean;
  mode: AddRecordMode;
  context?: AddRecordContext;
  initialTitle?: string;
  initialType?: AddHealthRecordType;
  locale: 'en' | 'tr';
  onClose: () => void;
  onSave: (payload: AddHealthRecordPayload) => void;
  onSelectWeight?: () => void;
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: '#f6f4f0',
  surface: '#ffffff',
  surfaceLow: '#f4f4ee',
  surfaceContainer: '#eeeee8',
  primary: '#47664a',
  primaryDim: '#3b5a3f',
  primaryTint: '#edf5ea',
  onSurface: '#30332e',
  onSurfaceVariant: '#5d605a',
  outlineVariant: '#b1b3ab',
  outline: '#797c75',
  urgent: '#a73b21',
  separator: 'rgba(0,0,0,0.07)',
};

// ─── Option arrays ────────────────────────────────────────────────────────────

const VISIT_REASONS = ['checkup', 'vaccine', 'illness', 'injury', 'follow_up', 'other'] as const;
type VisitReason = (typeof VISIT_REASONS)[number];

// 'canceled' is only settable when editing an existing visit; excluded from create flow
const VISIT_STATUS_CREATE_OPTIONS = ['planned', 'completed'] as const;
type VisitStatus = 'completed' | 'planned' | 'canceled';

const STATUS_OPTIONS = ['active', 'resolved', 'normal', 'abnormal', 'completed'] as const;
type RecordStatus = (typeof STATUS_OPTIONS)[number];

const VACCINES_TR = [
  'Karma Aşı (DHPPi)', 'Kuduz', 'Leptospiroz', 'Bordetella',
  'FeLV', 'FIV', 'Giardia', 'Klamidya',
];
const VACCINES_EN = [
  'Core Vaccine (DHPPi)', 'Rabies', 'Leptospirosis', 'Bordetella',
  'FeLV', 'FIV', 'Giardia', 'Chlamydophila',
];

const CURRENCIES = ['₺', '$', '€'] as const;

const VET_OUTCOME_KEYS = ['vaccine', 'diagnosis', 'procedure', 'lab', 'medication'] as const;
type VetOutcomeKey = (typeof VET_OUTCOME_KEYS)[number];
const VET_OUTCOME_LABELS: Record<VetOutcomeKey, { en: string; tr: string }> = {
  vaccine:    { en: 'Vaccine given',      tr: 'Aşı yapıldı'    },
  diagnosis:  { en: 'Diagnosis made',     tr: 'Teşhis konuldu' },
  procedure:  { en: 'Procedure done',     tr: 'İşlem yapıldı'  },
  lab:        { en: 'Lab / Test',         tr: 'Lab / Test'     },
  medication: { en: 'Medication started', tr: 'İlaç başlandı'  },
};

// ─── Card configs ─────────────────────────────────────────────────────────────

type ReasonCard = { value: VisitReason; symbol: string; labelEn: string; labelTr: string };
const REASON_CARDS: ReasonCard[] = [
  { value: 'checkup',   symbol: '🩺',  labelEn: 'Checkup',   labelTr: 'Kontrol'   },
  { value: 'vaccine',   symbol: '💉',  labelEn: 'Vaccine',   labelTr: 'Aşı'       },
  { value: 'illness',   symbol: '🌡',  labelEn: 'Illness',   labelTr: 'Hastalık'  },
  { value: 'injury',    symbol: '🩹',  labelEn: 'Injury',    labelTr: 'Yaralanma' },
  { value: 'follow_up', symbol: '📅',  labelEn: 'Follow-up', labelTr: 'Takip'     },
  { value: 'other',     symbol: '···', labelEn: 'Other',     labelTr: 'Diğer'     },
];

type RecTypeCard = {
  type: AddHealthRecordType;
  symbol: string;
  labelEn: string;
  labelTr: string;
  descEn: string;
  descTr: string;
};
const REC_TYPE_CARDS: RecTypeCard[] = [
  { type: 'diagnosis',    symbol: '🔍', labelEn: 'Diagnosis',  labelTr: 'Teşhis',     descEn: 'Condition or illness',  descTr: 'Hastalık, durum'    },
  { type: 'procedure',    symbol: '✂',  labelEn: 'Procedure',  labelTr: 'İşlem',      descEn: 'Surgery or operation',  descTr: 'Ameliyat, uygulama' },
  { type: 'prescription', symbol: '💊', labelEn: 'Treatment',  labelTr: 'Tedavi',     descEn: 'Medication or therapy', descTr: 'İlaç, terapi'       },
  { type: 'test',         symbol: '🧪', labelEn: 'Lab / Test', labelTr: 'Lab / Test', descEn: 'Blood work, imaging',   descTr: 'Tahlil, görüntüleme'},
];

type TypeCard = {
  key: TypeCardKey;
  symbol: string;
  accent: string;
  labelEn: string;
  labelTr: string;
  descEn: string;
  descTr: string;
};
const TYPE_CARDS: TypeCard[] = [
  { key: 'vetVisit', symbol: '⚕',  accent: '#4a7c59', labelEn: 'Vet Visit',    labelTr: 'Veteriner Ziyareti', descEn: 'Clinic visit, checkup, examination',    descTr: 'Klinik ziyareti, muayene, kontrol' },
  { key: 'vaccine',  symbol: '💉', accent: '#3d6e9e', labelEn: 'Vaccine',       labelTr: 'Aşı',                descEn: 'Vaccination record and reminders',      descTr: 'Aşı kaydı ve hatırlatma tarihi'   },
  { key: 'record',   symbol: '✚',  accent: '#9b4040', labelEn: 'Health Record', labelTr: 'Sağlık Kaydı',       descEn: 'Diagnosis, procedure, test, treatment', descTr: 'Tanı, işlem, test, reçete'        },
  { key: 'weight',   symbol: '⚖️', accent: '#3a4e7a', labelEn: 'Weight',        labelTr: 'Kilo',               descEn: 'Log a weigh-in for trend tracking',     descTr: 'Tartı girişi ve trend takibi'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(new Date(`${v}T12:00:00.000Z`).getTime());
}

function todayStr() {
  return toYmdLocal(new Date());
}

function toYmdLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseFlexibleDateToYmd(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    const dt = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0, 0);
    if (Number.isFinite(dt.getTime())) return toYmdLocal(dt);
  }
  const dmy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const dt = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12, 0, 0, 0);
    if (Number.isFinite(dt.getTime())) return toYmdLocal(dt);
  }
  const fallback = new Date(raw);
  if (!Number.isFinite(fallback.getTime())) return null;
  return toYmdLocal(fallback);
}

type ClinicSuggestion = { id: string; name: string; address: string };

const GOOGLE_MAPS_WEB_API_KEY = (
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ||
  ''
).trim();

async function fetchNearbyClinicSuggestions(latitude: number, longitude: number, locale: 'en' | 'tr') {
  if (!GOOGLE_MAPS_WEB_API_KEY) return [];
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: '4500',
    keyword: 'veterinary clinic',
    language: locale === 'tr' ? 'tr' : 'en',
    key: GOOGLE_MAPS_WEB_API_KEY,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json() as {
    status?: string;
    results?: Array<{ place_id?: string; name?: string; vicinity?: string; formatted_address?: string }>;
  };
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
  return (data.results ?? [])
    .map((entry, idx) => ({
      id: `nearby-${entry.place_id ?? idx}`,
      name: (entry.name ?? '').trim(),
      address: (entry.vicinity ?? entry.formatted_address ?? '').trim(),
    }))
    .filter((e) => e.name.length > 0);
}

async function fetchSearchClinicSuggestions(query: string, locale: 'en' | 'tr') {
  if (!GOOGLE_MAPS_WEB_API_KEY || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    query: `${query} veterinary clinic`,
    language: locale === 'tr' ? 'tr' : 'en',
    key: GOOGLE_MAPS_WEB_API_KEY,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json() as {
    status?: string;
    results?: Array<{ place_id?: string; name?: string; formatted_address?: string }>;
  };
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
  return (data.results ?? [])
    .map((entry, idx) => ({
      id: `search-${entry.place_id ?? idx}`,
      name: (entry.name ?? '').trim(),
      address: (entry.formatted_address ?? '').trim(),
    }))
    .filter((e) => e.name.length > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddRecordSheet({
  visible,
  mode,
  context = 'quick',
  initialTitle = '',
  initialType = 'diagnosis',
  locale,
  onClose,
  onSave,
  onSelectWeight,
}: Props) {
  const isTr = locale === 'tr';
  const { height: screenH } = useWindowDimensions();
  const sheetH = screenH * 0.93;

  // ── Section reveal animations (8 slots) ──────────────────────────────────────
  // Shared across entry types (mutually exclusive; reset on type change)
  const sec = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current;
  const mounted = useRef(true);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    mounted.current = false;
    revealTimers.current.forEach(clearTimeout);
  }, []);

  const showSec = (i: number, delay = 0) => {
    const run = () => {
      if (!mounted.current) return;
      sec[i].setValue(0);
      Animated.spring(sec[i], { toValue: 1, damping: 20, stiffness: 240, useNativeDriver: true }).start();
    };
    if (delay > 0) {
      const id = setTimeout(run, delay);
      revealTimers.current.push(id);
    } else {
      run();
    }
  };

  const resetSecs = () => {
    revealTimers.current.forEach(clearTimeout);
    revealTimers.current = [];
    sec.forEach((a) => a.setValue(0));
  };

  const scrollRef = useRef<ScrollView>(null);
  const scrollToBottom = (delay = 0) => {
    const id = setTimeout(() => {
      if (mounted.current) scrollRef.current?.scrollToEnd({ animated: true });
    }, delay);
    revealTimers.current.push(id);
  };

  // ── Entry type ────────────────────────────────────────────────────────────────
  const [entryType, setEntryType] = useState<EntryType | null>(
    mode === 'typeSelect' ? null : (mode as EntryType),
  );

  // ── Per-type reveal levels ────────────────────────────────────────────────────
  // vetVisit: 0=status shown, 1=+reason, 2=+date+rest cascade
  const [vetLevel, setVetLevel] = useState(0);
  // vaccine: 0=picker shown, 1=+date+rest cascade
  const [vacLevel, setVacLevel] = useState(0);
  // record: 0=type shown, 1=+title+date, 2=+details (auto when title+date valid)
  const [recLevel, setRecLevel] = useState(0);

  // Track whether fee section was triggered (avoid double-animate)
  const feeRevealedRef = useRef(false);

  // ── Sheet open/close animations ───────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(sheetH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openAnim = () => {
    translateY.setValue(sheetH);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 22, stiffness: 220, mass: 0.85, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 230, useNativeDriver: true }),
    ]).start();
  };

  const closeAnim = (cb?: () => void) => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: sheetH, damping: 28, stiffness: 400, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 190, useNativeDriver: true }),
    ]).start(() => { onClose(); cb?.(); });
  };

  const typeInAnim = () => {
    slideAnim.setValue(48);
    Animated.spring(slideAnim, { toValue: 0, damping: 24, stiffness: 280, useNativeDriver: true }).start();
  };

  const typeOutAnim = () => {
    slideAnim.setValue(-40);
    Animated.spring(slideAnim, { toValue: 0, damping: 24, stiffness: 280, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (visible) openAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Drag-to-dismiss ───────────────────────────────────────────────────────────
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 6 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
          backdropOpacity.setValue(Math.max(0, 1 - gs.dy / sheetH));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 90 || gs.vy > 0.65) {
          closeAnim();
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, damping: 26, stiffness: 360, mass: 0.85, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  // ── Form state ────────────────────────────────────────────────────────────────

  const [formDate, setFormDate] = useState(todayStr());
  const [activeDatePickerField, setActiveDatePickerField] = useState<
    'visitDate' | 'nextDueDate' | 'followUpDate' | 'dueDate' | null
  >(null);
  const [notes, setNotes] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Vet Visit
  const [visitReason, setVisitReason] = useState<VisitReason>('checkup');
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('planned');
  const [clinicName, setClinicName] = useState('');
  const [clinicPickedFromMap, setClinicPickedFromMap] = useState(false);
  const [clinicPickerVisible, setClinicPickerVisible] = useState(false);
  const [clinicPickerBusy, setClinicPickerBusy] = useState(false);
  const [clinicSearchBusy, setClinicSearchBusy] = useState(false);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [clinicNearbyResults, setClinicNearbyResults] = useState<ClinicSuggestion[]>([]);
  const [clinicSearchResults, setClinicSearchResults] = useState<ClinicSuggestion[]>([]);
  const [vetName, setVetName] = useState('');
  const [fee, setFee] = useState('');
  const [feeCurrency, setFeeCurrency] = useState<(typeof CURRENCIES)[number]>('₺');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpContext, setFollowUpContext] = useState('');
  const [visitOutcomes, setVisitOutcomes] = useState<VetOutcomeKey[]>([]);

  // Vaccine
  const [vaccineName, setVaccineName] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [vaccineClinic, setVaccineClinic] = useState('');
  const [vaccineVet, setVaccineVet] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [atVet, setAtVet] = useState(false);
  const [isCustomVaccine, setIsCustomVaccine] = useState(false);
  const vaccineNameInputRef = useRef<TextInput>(null);
  const clinicInputRef = useRef<TextInput>(null);
  const vetInputRef = useRef<TextInput>(null);

  // Health Record
  const [recType, setRecType] = useState<AddHealthRecordType>(initialType);
  const [recTitle, setRecTitle] = useState(initialTitle);
  const [recStatus, setRecStatus] = useState<RecordStatus | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [attachedFileUris, setAttachedFileUris] = useState<string[]>([]);

  // ── Reset on open ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    resetSecs();
    const et = mode === 'typeSelect' ? null : (mode as EntryType);
    setEntryType(et);
    setVetLevel(0); setVacLevel(0); setRecLevel(0);
    feeRevealedRef.current = false;
    setActiveDatePickerField(null);
    setFormDate(todayStr());
    setNotes('');
    setFocusedField(null);
    setVisitReason('checkup');
    setVisitStatus('planned');
    setClinicName('');
    setClinicPickedFromMap(false);
    setClinicPickerVisible(false);
    setClinicPickerBusy(false);
    setClinicSearchBusy(false);
    setClinicSearchQuery('');
    setClinicNearbyResults([]);
    setClinicSearchResults([]);
    setVetName('');
    setFee('');
    setFeeCurrency('₺');
    setFollowUpEnabled(false);
    setFollowUpDate('');
    setFollowUpContext('');
    setVaccineName(mode === 'vaccine' ? initialTitle : '');
    setNextDueDate('');
    setVaccineClinic('');
    setVaccineVet('');
    setBatchNumber('');
    setAtVet(false);
    setVisitOutcomes([]);
    setIsCustomVaccine(false);
    setRecType(initialType);
    setRecTitle(mode === 'record' ? initialTitle : '');
    setRecStatus(null);
    setDueDate('');
    setAttachedFileUris([]);

    // Pre-set type: reveal first section immediately
    if (et !== null) {
      showSec(0, 80);
      // Vaccine direct mode with pre-filled name: cascade all sections
      if (et === 'vaccine' && initialTitle) {
        setVacLevel(1);
        showSec(1, 300);
        showSec(2, 580);
        showSec(3, 860);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTitle, initialType, mode]);

  // ── Navigation ────────────────────────────────────────────────────────────────

  const selectType = (key: TypeCardKey) => {
    if (key === 'weight') { closeAnim(() => onSelectWeight?.()); return; }
    resetSecs();
    setVetLevel(0); setVacLevel(0); setRecLevel(0);
    feeRevealedRef.current = false;
    setEntryType(key as EntryType);
    setVisitStatus('planned');
    typeInAnim();
    showSec(0, 60);
  };

  const goBack = () => {
    if (entryType !== null && mode === 'typeSelect') {
      setEntryType(null);
      typeOutAnim();
    } else {
      closeAnim();
    }
  };

  // ── VetVisit reveal handlers ──────────────────────────────────────────────────

  const handleStatusSelect = (s: 'planned' | 'completed') => {
    setVisitStatus(s);
    if (vetLevel < 1) {
      setVetLevel(1);
      showSec(1, 200);
      scrollToBottom(550);
    }
  };

  const handleReasonSelect = (r: VisitReason) => {
    setVisitReason(r);
    if (vetLevel < 2) {
      setVetLevel(2);
      setActiveDatePickerField(null);
      showSec(2, 200);   // date
      showSec(3, 460);   // clinic + vet
      showSec(4, 720);   // notes + follow-up + outcomes
      if (visitStatus === 'completed') {
        showSec(5, 980);  // fee
        feeRevealedRef.current = true;
      }
      scrollToBottom(1100);
    }
  };

  // When visitStatus changes to completed AFTER reason was already selected
  useEffect(() => {
    if (entryType !== 'vetVisit' || vetLevel < 2 || feeRevealedRef.current) return;
    if (visitStatus === 'completed') {
      feeRevealedRef.current = true;
      showSec(5, 180);
      scrollToBottom(500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitStatus]);

  // ── Vaccine reveal handlers ───────────────────────────────────────────────────

  const handleVaccineSelect = (name: string) => {
    setVaccineName(name);
    if (vacLevel < 1) {
      setVacLevel(1);
      showSec(1, 200);   // given date
      showSec(2, 460);   // next due + clinic + batch
      showSec(3, 720);   // atVet + notes
      scrollToBottom(950);
    }
  };

  const handleCustomVaccineAdvance = () => {
    if (vaccineName.trim().length > 0) handleVaccineSelect(vaccineName.trim());
  };

  // ── Record reveal handlers ────────────────────────────────────────────────────

  const handleRecTypeSelect = (t: AddHealthRecordType) => {
    setRecType(t);
    if (recLevel < 1) {
      setRecLevel(1);
      showSec(1, 200);   // title + date
      scrollToBottom(500);
    }
  };

  const normalizedFormDate = parseFlexibleDateToYmd(formDate);

  // Auto-reveal status+files+notes once title AND date are both valid
  useEffect(() => {
    if (entryType !== 'record' || recLevel < 1 || recLevel >= 2) return;
    if (recTitle.trim().length > 0 && isValidDate(normalizedFormDate ?? '')) {
      setRecLevel(2);
      showSec(2, 220);
      scrollToBottom(520);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recTitle, formDate]);

  // ── canSave ───────────────────────────────────────────────────────────────────
  const canSave =
    entryType === 'vetVisit' ? isValidDate(normalizedFormDate ?? '') :
    entryType === 'vaccine'  ? (vaccineName.trim().length > 0 && isValidDate(normalizedFormDate ?? '')) :
    entryType === 'record'   ? (recTitle.trim().length > 0 && isValidDate(normalizedFormDate ?? '')) :
    false;

  // ── handleSave ────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!canSave) return;
    const finalDate = normalizedFormDate ?? formDate;
    let payload: AddHealthRecordPayload;

    if (entryType === 'vetVisit') {
      const rLabelTr: Record<VisitReason, string> = {
        checkup: 'Kontrol', vaccine: 'Aşı', illness: 'Hastalık',
        injury: 'Yaralanma', follow_up: 'Takip', other: 'Diğer',
      };
      const rLabelEn: Record<VisitReason, string> = {
        checkup: 'Checkup', vaccine: 'Vaccine', illness: 'Illness',
        injury: 'Injury', follow_up: 'Follow-up', other: 'Other',
      };
      const reasonStr = isTr ? rLabelTr[visitReason] : rLabelEn[visitReason];
      const outcomeNote = visitOutcomes.length > 0
        ? (isTr
          ? `Yapılanlar: ${visitOutcomes.map((k) => VET_OUTCOME_LABELS[k].tr).join(', ')}`
          : `Done: ${visitOutcomes.map((k) => VET_OUTCOME_LABELS[k].en).join(', ')}`)
        : '';
      const fullNote = [outcomeNote, notes.trim()].filter(Boolean).join('\n') || undefined;
      payload = {
        type: 'procedure',
        title: isTr ? `Veteriner Ziyareti – ${reasonStr}` : `Vet Visit – ${reasonStr}`,
        date: finalDate,
        note: fullNote,
        visitReason,
        visitStatus,
        clinicName: clinicName.trim() || undefined,
        vetName: vetName.trim() || undefined,
        fee: fee.trim() ? parseFloat(fee.replace(',', '.')) : undefined,
        feeCurrency: fee.trim() ? feeCurrency : undefined,
        dueDate: followUpEnabled && isValidDate(followUpDate) ? followUpDate : undefined,
        followUpContext: visitReason === 'follow_up' && followUpContext.trim() ? followUpContext.trim() : undefined,
      };
    } else if (entryType === 'vaccine') {
      payload = {
        type: 'vaccine',
        title: vaccineName.trim(),
        date: finalDate,
        note: notes.trim() || undefined,
        dueDate: isValidDate(nextDueDate) ? nextDueDate : undefined,
        clinicName: vaccineClinic.trim() || undefined,
        vetName: vaccineVet.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        linkedToVetVisit: atVet || undefined,
      };
    } else {
      payload = {
        type: recType,
        title: recTitle.trim(),
        date: finalDate,
        note: notes.trim() || undefined,
        status: recStatus ?? undefined,
        dueDate: isValidDate(dueDate) ? dueDate : undefined,
        attachedFileUris: attachedFileUris.length > 0 ? [...attachedFileUris] : undefined,
      };
    }
    onSave(payload);
    closeAnim();
  }

  // ── Label helpers ─────────────────────────────────────────────────────────────

  function visitStatusLabel(s: 'planned' | 'completed') {
    return s === 'completed'
      ? (isTr ? 'Tamamlandı' : 'Completed')
      : (isTr ? 'Planlandı' : 'Planned');
  }

  function statusLabel(s: RecordStatus) {
    if (s === 'active')   return isTr ? 'Aktif'    : 'Active';
    if (s === 'resolved') return isTr ? 'Çözüldü' : 'Resolved';
    if (s === 'normal')   return 'Normal';
    if (s === 'abnormal') return isTr ? 'Anormal' : 'Abnormal';
    return isTr ? 'Tamamlandı' : 'Completed';
  }

  function recTitlePlaceholder() {
    if (recType === 'diagnosis')    return isTr ? 'Örn: Kulak iltihabı, kalça displazisi' : 'e.g. Otitis externa, hip dysplasia';
    if (recType === 'procedure')    return isTr ? 'Örn: Diş temizliği, kısırlaştırma'    : 'e.g. Teeth cleaning, spay';
    if (recType === 'prescription') return isTr ? 'Örn: Amoksisilin 250mg, Frontline'    : 'e.g. Amoxicillin 250mg, Frontline';
    return isTr ? 'Örn: Tam kan sayımı, röntgen' : 'e.g. CBC blood panel, X-ray';
  }

  // ── Reusable render helpers ───────────────────────────────────────────────────

  const renderLabel = (text: string, required?: boolean) => (
    <Text style={st.label}>
      {text}{required ? <Text style={st.required}> *</Text> : null}
    </Text>
  );

  const renderInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    fieldKey: string,
    opts?: {
      multiline?: boolean;
      numeric?: boolean;
      noCapitalize?: boolean;
      inputRef?: React.RefObject<TextInput | null>;
      returnKeyType?: 'done' | 'next';
      onSubmitEditing?: () => void;
      editable?: boolean;
      onFocus?: () => void;
    },
  ) => (
    <TextInput
      ref={opts?.inputRef}
      style={[
        st.input,
        opts?.multiline && st.inputMultiline,
        focusedField === fieldKey && st.inputFocused,
        (opts?.editable ?? true) ? null : st.inputDisabledShell,
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.outlineVariant}
      multiline={opts?.multiline}
      numberOfLines={opts?.multiline ? 4 : 1}
      keyboardType={opts?.numeric ? 'decimal-pad' : 'default'}
      autoCapitalize={opts?.noCapitalize ? 'none' : 'sentences'}
      returnKeyType={opts?.returnKeyType}
      editable={opts?.editable ?? true}
      onSubmitEditing={opts?.onSubmitEditing}
      onFocus={() => { setFocusedField(fieldKey); opts?.onFocus?.(); }}
      onBlur={() => setFocusedField(null)}
    />
  );

  const renderChips = <T extends string>(
    options: readonly T[],
    selected: T | null,
    onSelect: (v: T | null) => void,
    labelFn: (v: T) => string,
    nullable?: boolean,
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipsRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          style={[st.chip, selected === opt && st.chipActive]}
          onPress={() => onSelect(nullable && selected === opt ? null : opt)}
        >
          <Text style={[st.chipText, selected === opt && st.chipTextActive]}>{labelFn(opt)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderDateSelector = (
    fieldKey: 'visitDate' | 'nextDueDate' | 'followUpDate' | 'dueDate',
    value: string,
    setValue: (next: string) => void,
    required = false,
  ) => {
    const normalizedValue = parseFlexibleDateToYmd(value);
    const pickerValue = new Date(`${(normalizedValue ?? todayStr())}T12:00:00`);
    const isOpen = activeDatePickerField === fieldKey;

    const handleDatePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (!selectedDate || !Number.isFinite(selectedDate.getTime())) return;
      setValue(toYmdLocal(selectedDate));
      setActiveDatePickerField(null);
    };

    return (
      <>
        {renderLabel(isTr ? 'TARİH' : 'DATE', required)}
        <Pressable
          style={[st.dateTapRow, focusedField === fieldKey && st.inputFocused]}
          onPress={() => {
            setFocusedField(fieldKey);
            setActiveDatePickerField(isOpen ? null : fieldKey);
          }}
        >
          <View style={st.dateTapMain}>
            <Text style={st.dateTapEyebrow}>{isTr ? 'Takvimden seç' : 'Pick from calendar'}</Text>
            <Text style={[st.dateTapText, !value.trim() && st.dateTapPlaceholder]}>
              {(parseFlexibleDateToYmd(value) ?? value) || 'YYYY-MM-DD'}
            </Text>
          </View>
          <View style={st.dateTapBadge}>
            <Text style={st.dateTapBadgeText}>⌄</Text>
          </View>
        </Pressable>
        {isOpen ? (
          <View style={st.datePickerWrap}>
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              onChange={handleDatePickerChange}
              maximumDate={new Date(2100, 11, 31)}
              minimumDate={new Date(2000, 0, 1)}
            />
          </View>
        ) : null}
      </>
    );
  };

  // ── Clinic map helpers ────────────────────────────────────────────────────────

  const loadNearbyClinicSuggestions = async () => {
    setClinicPickerBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setClinicNearbyResults([]); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const items = await fetchNearbyClinicSuggestions(location.coords.latitude, location.coords.longitude, locale);
      setClinicNearbyResults(items);
    } finally {
      setClinicPickerBusy(false);
    }
  };

  const openClinicPicker = async () => {
    setClinicPickerVisible(true);
    setClinicSearchQuery('');
    setClinicSearchResults([]);
    if (clinicNearbyResults.length === 0 && !clinicPickerBusy) {
      await loadNearbyClinicSuggestions();
    }
  };

  const selectClinicSuggestion = (clinic: ClinicSuggestion) => {
    setClinicName(clinic.name);
    setClinicPickedFromMap(true);
    setClinicPickerVisible(false);
    setClinicSearchQuery('');
    setFocusedField(null);
    requestAnimationFrame(() => vetInputRef.current?.focus());
  };

  useEffect(() => {
    if (!clinicPickerVisible) return;
    const query = clinicSearchQuery.trim();
    if (query.length < 2) { setClinicSearchResults([]); setClinicSearchBusy(false); return; }
    let cancelled = false;
    setClinicSearchBusy(true);
    const timer = setTimeout(async () => {
      const results = await fetchSearchClinicSuggestions(query, locale);
      if (!cancelled) { setClinicSearchResults(results); setClinicSearchBusy(false); }
    }, 260);
    return () => { cancelled = true; clearTimeout(timer); setClinicSearchBusy(false); };
  }, [clinicPickerVisible, clinicSearchQuery, locale]);

  const toggleOutcome = (key: VetOutcomeKey) => {
    setVisitOutcomes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const pickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'livePhotos'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAttachedFileUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const visibleClinicResults = clinicSearchQuery.trim().length >= 2
    ? clinicSearchResults
    : clinicNearbyResults;

  // ── Section animation wrapper ─────────────────────────────────────────────────
  // Each section slides up and fades in using its sec[i] animated value
  const S = (i: number, children: React.ReactNode) => (
    <Animated.View
      style={{
        opacity: sec[i],
        transform: [{ translateY: sec[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );

  const SepLine = () => <View style={st.sectionSep} />;

  // ── Type picker ───────────────────────────────────────────────────────────────

  const renderTypePicker = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={st.pickerBody} showsVerticalScrollIndicator={false}>
      <Text style={st.pickerHint}>{isTr ? 'Ne kaydetmek istiyorsunuz?' : 'What would you like to log?'}</Text>
      <View style={st.pickerList}>
        {TYPE_CARDS.map((card, index) => (
          <Pressable
            key={card.key}
            style={[st.pickerRow, index < TYPE_CARDS.length - 1 && st.pickerRowBorder]}
            onPress={() => selectType(card.key)}
          >
            <View style={[st.pickerAccentBar, { backgroundColor: card.accent }]} />
            <View style={[st.pickerIconBox, { backgroundColor: card.accent + '18' }]}>
              <Text style={[st.pickerIcon, { color: card.accent }]}>{card.symbol}</Text>
            </View>
            <View style={st.pickerTextCol}>
              <Text style={st.pickerLabel}>{isTr ? card.labelTr : card.labelEn}</Text>
              <Text style={st.pickerDesc}>{isTr ? card.descTr : card.descEn}</Text>
            </View>
            <Text style={st.pickerChevron}>›</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 48 }} />
    </ScrollView>
  );

  // ── VetVisit single-page form ─────────────────────────────────────────────────

  const renderVetForm = () => (
    <>
      {/* ── Section 0: Status ──────────────────────────────────────────────────── */}
      {S(0, (
        <>
          <Text style={st.questionLabel}>
            {isTr ? 'Bu ziyaret nasıl?' : 'How is this visit?'}
          </Text>
          <View style={st.statusBigRow}>
            {VISIT_STATUS_CREATE_OPTIONS.map((s) => (
              <Pressable
                key={s}
                style={[st.bigStatusChip, visitStatus === s && st.bigStatusChipActive]}
                onPress={() => handleStatusSelect(s)}
              >
                <Text style={st.bigStatusEmoji}>{s === 'completed' ? '✓' : '📅'}</Text>
                <Text style={[st.bigStatusLabel, visitStatus === s && st.bigStatusLabelActive]}>
                  {visitStatusLabel(s)}
                </Text>
                <Text style={[st.bigStatusSub, visitStatus === s && st.bigStatusSubActive]}>
                  {s === 'completed'
                    ? (isTr ? 'Gerçekleşti' : 'Already happened')
                    : (isTr ? 'Yaklaşıyor' : 'Coming up')}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ))}

      {/* ── Section 1: Reason ──────────────────────────────────────────────────── */}
      {vetLevel >= 1 && S(1, (
        <>
          <SepLine />
          <Text style={st.questionLabel}>
            {isTr ? 'Ziyaret sebebi?' : 'Reason for visit?'}
          </Text>
          <View style={st.reasonGrid}>
            {REASON_CARDS.map((card) => (
              <Pressable
                key={card.value}
                style={[st.reasonCard, visitReason === card.value && st.reasonCardActive]}
                onPress={() => handleReasonSelect(card.value)}
              >
                <Text style={st.reasonSymbol}>{card.symbol}</Text>
                <Text style={[st.reasonLabel, visitReason === card.value && st.reasonLabelActive]}>
                  {isTr ? card.labelTr : card.labelEn}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ))}

      {/* ── Section 2: Date ────────────────────────────────────────────────────── */}
      {vetLevel >= 2 && S(2, (
        <>
          <SepLine />
          {renderDateSelector('visitDate', formDate, setFormDate, true)}
        </>
      ))}

      {/* ── Section 3: Clinic + Vet ────────────────────────────────────────────── */}
      {vetLevel >= 2 && S(3, (
        <>
          <SepLine />
          {renderLabel(isTr ? 'KLİNİK' : 'CLINIC')}
          <View style={st.mapInputShell}>
            <TextInput
              ref={clinicInputRef}
              style={st.mapInputField}
              value={clinicName}
              onChangeText={(v) => {
                setClinicName(v);
                if (clinicPickedFromMap) setClinicPickedFromMap(false);
              }}
              placeholder={isTr ? 'Klinik adı yaz veya haritadan seç' : 'Type clinic or pick from map'}
              placeholderTextColor={C.outlineVariant}
              returnKeyType="next"
              onSubmitEditing={() => {
                if (clinicName.trim().length > 1)
                  requestAnimationFrame(() => vetInputRef.current?.focus());
              }}
              onFocus={() => setFocusedField('clinic')}
              onBlur={() => setFocusedField(null)}
            />
            <Pressable style={st.mapIndicatorBtn} onPress={openClinicPicker}>
              <View style={st.mapIndicatorGlyph}>
                <View style={st.mapIndicatorGlyphDot} />
              </View>
              <Text style={st.mapIndicatorText}>{isTr ? 'Haritadan' : 'Map'}</Text>
              <Text style={st.mapIndicatorChevron}>›</Text>
            </Pressable>
          </View>
          {clinicPickedFromMap ? (
            <Text style={st.mapPickedCaption}>{isTr ? 'Haritadan seçildi' : 'Picked from map'}</Text>
          ) : null}

          {renderLabel(isTr ? 'VETERİNER' : 'VET')}
          {renderInput(vetName, setVetName, isTr ? 'Veteriner adı' : 'Vet name', 'vet', {
            inputRef: vetInputRef,
          })}
        </>
      ))}

      {/* ── Section 4: Notes + Follow-up (+ outcomes for completed) ────────────── */}
      {vetLevel >= 2 && S(4, (
        <>
          <SepLine />

          {visitStatus === 'completed' ? (
            <>
              {renderLabel(isTr ? 'NE YAPILDI?' : 'WHAT WAS DONE?')}
              <View style={st.outcomeChipsGrid}>
                {VET_OUTCOME_KEYS.map((key) => {
                  const active = visitOutcomes.includes(key);
                  return (
                    <Pressable
                      key={key}
                      style={[st.outcomeChip, active && st.outcomeChipActive]}
                      onPress={() => toggleOutcome(key)}
                    >
                      <Text style={[st.outcomeChipText, active && st.outcomeChipTextActive]}>
                        {isTr ? VET_OUTCOME_LABELS[key].tr : VET_OUTCOME_LABELS[key].en}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {visitReason === 'follow_up' ? (
            <>
              {renderLabel(isTr ? 'NE TAKİBİ?' : 'FOLLOWING UP ON?')}
              {renderInput(
                followUpContext, setFollowUpContext,
                isTr ? 'Örn: Kulak iltihabı tedavisi...' : 'e.g. Otitis treatment...',
                'followUpCtx',
              )}
            </>
          ) : null}

          {renderLabel(isTr ? 'NOT' : 'NOTES')}
          {renderInput(notes, setNotes,
            isTr ? 'Muayene notu, bulgular...' : 'Exam notes, findings...',
            'notes', { multiline: true })}

          <View style={st.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>{isTr ? 'TAKİP RANDEVUSU' : 'FOLLOW-UP'}</Text>
              {visitStatus === 'completed' ? (
                <Text style={st.toggleSubtext}>
                  {isTr ? 'Tamamlanan ziyaret sonrası takip önerilir' : 'Recommended after completed visits'}
                </Text>
              ) : null}
            </View>
            <Switch
              value={followUpEnabled}
              onValueChange={setFollowUpEnabled}
              trackColor={{ false: C.outlineVariant, true: C.primary }}
              thumbColor="#fff"
              ios_backgroundColor={C.outlineVariant}
            />
          </View>
          {followUpEnabled
            ? renderDateSelector('followUpDate', followUpDate, setFollowUpDate)
            : null}
        </>
      ))}

      {/* ── Section 5: Fee (completed visits only) ─────────────────────────────── */}
      {visitStatus === 'completed' && S(5, (
        <>
          <SepLine />
          {renderLabel(isTr ? 'ÜCRET' : 'FEE')}
          <View style={st.feeRow}>
            <TextInput
              style={[st.input, st.feeInput, focusedField === 'fee' && st.inputFocused]}
              value={fee}
              onChangeText={setFee}
              placeholder="0.00"
              placeholderTextColor={C.outlineVariant}
              keyboardType="decimal-pad"
              onFocus={() => setFocusedField('fee')}
              onBlur={() => setFocusedField(null)}
            />
            <View style={st.currencyRow}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[st.currencyChip, feeCurrency === c && st.currencyChipActive]}
                  onPress={() => setFeeCurrency(c)}
                >
                  <Text style={[st.currencyText, feeCurrency === c && st.currencyTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ))}
    </>
  );

  // ── Vaccine single-page form ──────────────────────────────────────────────────

  const renderVaccineForm = () => {
    const suggestions = isTr ? VACCINES_TR : VACCINES_EN;
    return (
      <>
        {/* ── Section 0: Vaccine picker ─────────────────────────────────────────── */}
        {S(0, (
          <>
            <Text style={st.questionLabel}>{isTr ? 'Hangi aşı?' : 'Which vaccine?'}</Text>
            {isCustomVaccine ? (
              <>
                <Text style={st.stepHint}>{isTr ? 'Aşı adını yazın' : 'Type the vaccine name'}</Text>
                {renderInput(vaccineName, setVaccineName,
                  isTr ? 'Aşı adı' : 'Vaccine name', 'vaccineName', {
                    inputRef: vaccineNameInputRef,
                    returnKeyType: 'next',
                    onSubmitEditing: handleCustomVaccineAdvance,
                  })}
                {vaccineName.trim().length > 0 && vacLevel < 1 ? (
                  <Pressable style={st.continueBtn} onPress={handleCustomVaccineAdvance}>
                    <Text style={st.continueBtnText}>{isTr ? 'Devam →' : 'Continue →'}</Text>
                  </Pressable>
                ) : null}
                <Pressable hitSlop={8} onPress={() => { setIsCustomVaccine(false); setVaccineName(''); }}>
                  <Text style={st.backToListText}>{isTr ? '← Listeye dön' : '← Back to list'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={st.suggestSectionLabel}>{isTr ? 'YAYGIN AŞILAR' : 'COMMON VACCINES'}</Text>
                <View style={st.vaccineGrid}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s}
                      style={[st.vaccineChip, vaccineName === s && st.vaccineChipActive]}
                      onPress={() => handleVaccineSelect(s)}
                    >
                      <Text style={[st.vaccineChipText, vaccineName === s && st.vaccineChipTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={[st.vaccineChip, st.vaccineChipOther]}
                    onPress={() => {
                      setIsCustomVaccine(true);
                      requestAnimationFrame(() => vaccineNameInputRef.current?.focus());
                    }}
                  >
                    <Text style={st.vaccineChipOtherText}>{isTr ? '+ Diğer' : '+ Other'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ))}

        {/* ── Section 1: Given date ─────────────────────────────────────────────── */}
        {vacLevel >= 1 && S(1, (
          <>
            <SepLine />
            <Text style={st.sectionHeadline}>{vaccineName}</Text>
            {renderDateSelector('visitDate', formDate, setFormDate, true)}
          </>
        ))}

        {/* ── Section 2: Next due + Clinic + Batch ──────────────────────────────── */}
        {vacLevel >= 1 && S(2, (
          <>
            <SepLine />
            {renderLabel(isTr ? 'SONRAKİ DOZ TARİHİ' : 'NEXT DUE DATE')}
            {renderDateSelector('nextDueDate', nextDueDate, setNextDueDate)}
            <View style={st.twoCol}>
              <View style={{ flex: 1 }}>
                {renderLabel(isTr ? 'KLİNİK' : 'CLINIC')}
                {renderInput(vaccineClinic, setVaccineClinic, isTr ? 'Klinik adı' : 'Clinic name', 'vClinic')}
              </View>
              <View style={{ flex: 1 }}>
                {renderLabel(isTr ? 'SERİ NO' : 'BATCH NO')}
                {renderInput(batchNumber, setBatchNumber, isTr ? 'Seri no' : 'Batch no', 'batch', { noCapitalize: true })}
              </View>
            </View>
          </>
        ))}

        {/* ── Section 3: AtVet + Notes ───────────────────────────────────────────── */}
        {vacLevel >= 1 && S(3, (
          <>
            <SepLine />
            {renderLabel(isTr ? 'VETERİNERDE Mİ YAPILDI?' : 'DONE AT A VET?')}
            <View style={st.atVetRow}>
              {(['yes', 'no'] as const).map((v) => {
                const isActive = atVet ? v === 'yes' : v === 'no';
                return (
                  <Pressable
                    key={v}
                    style={[st.atVetChip, isActive && st.atVetChipActive]}
                    onPress={() => setAtVet(v === 'yes')}
                  >
                    <Text style={[st.atVetChipText, isActive && st.atVetChipTextActive]}>
                      {v === 'yes' ? (isTr ? 'Evet' : 'Yes') : (isTr ? 'Hayır' : 'No')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {renderLabel(isTr ? 'NOT' : 'NOTES')}
            {renderInput(notes, setNotes,
              isTr ? 'Reaksiyon, hekim notu...' : 'Reaction, vet notes...',
              'notes', { multiline: true })}
          </>
        ))}
      </>
    );
  };

  // ── Health Record single-page form ────────────────────────────────────────────

  const renderRecordForm = () => (
    <>
      {/* ── Section 0: Record type ────────────────────────────────────────────── */}
      {S(0, (
        <>
          <Text style={st.questionLabel}>{isTr ? 'Kayıt türü?' : 'What type of record?'}</Text>
          <View style={st.recTypeGrid}>
            {REC_TYPE_CARDS.map((card) => (
              <Pressable
                key={card.type}
                style={[st.recTypeCard, recType === card.type && st.recTypeCardActive]}
                onPress={() => handleRecTypeSelect(card.type)}
              >
                <Text style={st.recTypeSymbol}>{card.symbol}</Text>
                <Text style={[st.recTypeLabel, recType === card.type && st.recTypeLabelActive]}>
                  {isTr ? card.labelTr : card.labelEn}
                </Text>
                <Text style={st.recTypeDesc}>{isTr ? card.descTr : card.descEn}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ))}

      {/* ── Section 1: Title + Date ───────────────────────────────────────────── */}
      {recLevel >= 1 && S(1, (
        <>
          <SepLine />
          {renderLabel(isTr ? 'BAŞLIK' : 'TITLE', true)}
          {renderInput(recTitle, setRecTitle, recTitlePlaceholder(), 'title')}
          {renderDateSelector('visitDate', formDate, setFormDate, true)}
        </>
      ))}

      {/* ── Section 2: Status + Files + Notes (auto after title+date valid) ───── */}
      {recLevel >= 2 && S(2, (
        <>
          <SepLine />
          {renderLabel(isTr ? 'DURUM' : 'STATUS')}
          {renderChips(STATUS_OPTIONS, recStatus, setRecStatus, statusLabel, true)}

          {renderLabel(isTr ? 'TAKİP TARİHİ' : 'FOLLOW-UP DATE')}
          {renderDateSelector('dueDate', dueDate, setDueDate)}

          {renderLabel(isTr ? 'BELGELER / DOSYALAR' : 'DOCUMENTS / FILES')}
          <Pressable style={st.attachBtn} onPress={pickAttachment}>
            <Text style={st.attachBtnIcon}>📎</Text>
            <Text style={st.attachBtnText}>
              {isTr ? 'Fotoğraf veya belge ekle' : 'Attach photo or document'}
            </Text>
          </Pressable>
          {attachedFileUris.length > 0 ? (
            <View style={st.attachList}>
              {attachedFileUris.map((uri, idx) => (
                <View key={uri} style={st.attachItem}>
                  <Text style={st.attachItemName} numberOfLines={1}>
                    {`📄 ${uri.split('/').pop() ?? `File ${idx + 1}`}`}
                  </Text>
                  <Pressable
                    hitSlop={10}
                    onPress={() => setAttachedFileUris((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={st.attachItemRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {renderLabel(isTr ? 'NOTLAR' : 'NOTES')}
          {renderInput(notes, setNotes,
            isTr ? 'Teşhis detayı, bulgular...' : 'Diagnosis details, findings...',
            'notes', { multiline: true })}
        </>
      ))}
    </>
  );

  // ── Header title ──────────────────────────────────────────────────────────────

  const headerTitle =
    entryType === 'vetVisit' ? (isTr ? 'Veteriner Ziyareti' : 'Vet Visit') :
    entryType === 'vaccine'  ? (isTr ? 'Aşı' : 'Vaccine') :
    entryType === 'record'   ? (isTr ? 'Sağlık Kaydı' : 'Health Record') :
    (isTr ? 'Kayıt Ekle' : 'Add Record');

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => closeAnim()}>
      <KeyboardAvoidingView style={st.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Backdrop */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, st.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeAnim()} />

        {/* Sheet */}
        <Animated.View style={[st.sheet, { height: sheetH, transform: [{ translateY }] }]}>

          {/* Handle + Header */}
          <View {...pan.panHandlers}>
            <View style={st.handleZone}>
              <View style={st.handle} />
            </View>
            <View style={st.header}>
              <Pressable onPress={goBack} hitSlop={16} style={st.headerSideBtn}>
                {entryType !== null && mode === 'typeSelect' ? (
                  <Text style={st.backText}>‹ {isTr ? 'Geri' : 'Back'}</Text>
                ) : (
                  <Text style={st.cancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
                )}
              </Pressable>

              <Text style={st.headerTitle}>{headerTitle}</Text>

              {entryType === null ? (
                <Pressable onPress={() => closeAnim()} hitSlop={16} style={[st.headerSideBtn, st.headerSideBtnRight]}>
                  <Text style={st.cancelText}>{isTr ? 'Kapat' : 'Close'}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleSave}
                  hitSlop={16}
                  style={[st.headerSideBtn, st.headerSideBtnRight, !canSave && st.btnDisabled]}
                  disabled={!canSave}
                >
                  <Text style={[st.saveText, !canSave && st.saveTextDisabled]}>
                    {isTr ? 'Kaydet' : 'Save'}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={st.divider} />
          </View>

          {/* Content */}
          {entryType === null ? (
            renderTypePicker()
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={st.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                {entryType === 'vetVisit' ? renderVetForm()
                  : entryType === 'vaccine' ? renderVaccineForm()
                  : renderRecordForm()}
              </Animated.View>
              <View style={{ height: 64 }} />
            </ScrollView>
          )}
        </Animated.View>

        {/* Clinic picker modal */}
        <Modal
          visible={clinicPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setClinicPickerVisible(false)}
        >
          <View style={st.pickerModalRoot}>
            <Pressable style={st.pickerModalBackdrop} onPress={() => setClinicPickerVisible(false)} />
            <View style={st.pickerModalCard}>
              <View style={st.pickerModalHandle} />
              <Text style={st.pickerModalTitle}>
                {isTr ? 'Haritadan klinik seç' : 'Select clinic from map'}
              </Text>
              <Text style={st.pickerModalHint}>
                {isTr ? 'Yakındakiler veya aramayla seçebilirsiniz' : 'Pick nearby clinics or search by name'}
              </Text>
              <View style={st.pickerSearchRow}>
                <TextInput
                  style={[st.input, st.pickerSearchInput]}
                  value={clinicSearchQuery}
                  onChangeText={setClinicSearchQuery}
                  placeholder={isTr ? 'Klinik ara' : 'Search clinic'}
                  placeholderTextColor={C.outlineVariant}
                  autoCapitalize="words"
                />
                <Pressable style={st.pickerNearbyBtn} onPress={loadNearbyClinicSuggestions}>
                  {clinicPickerBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={st.pickerNearbyBtnText}>{isTr ? 'Yakın' : 'Nearby'}</Text>
                  )}
                </Pressable>
              </View>
              <View style={st.pickerMapNotice}>
                <View style={st.pickerMapNoticeDot} />
                <Text style={st.pickerMapNoticeText}>
                  {isTr ? 'Harita göstergesi aktif' : 'Map indicator enabled'}
                </Text>
              </View>
              <ScrollView style={st.pickerResultList} keyboardShouldPersistTaps="handled">
                {clinicSearchBusy ? (
                  <View style={st.pickerBusyRow}>
                    <ActivityIndicator size="small" color={C.primary} />
                  </View>
                ) : null}
                {visibleClinicResults.map((item) => (
                  <Pressable
                    key={item.id}
                    style={st.pickerResultItem}
                    onPress={() => selectClinicSuggestion(item)}
                  >
                    <Text style={st.pickerResultName}>{item.name}</Text>
                    {item.address ? (
                      <Text style={st.pickerResultAddress}>{item.address}</Text>
                    ) : null}
                  </Pressable>
                ))}
                {!clinicSearchBusy && visibleClinicResults.length === 0 ? (
                  <Text style={st.pickerEmptyText}>
                    {isTr ? 'Klinik bulunamadı. Aramayı değiştirin.' : 'No clinic found. Try another query.'}
                  </Text>
                ) : null}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },

  // Handle
  handleZone: { alignItems: 'center', paddingTop: 12, paddingBottom: 2 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.outlineVariant },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: C.onSurface, letterSpacing: -0.2 },
  headerSideBtn: { minWidth: 60 },
  headerSideBtnRight: { alignItems: 'flex-end' },
  cancelText: { fontSize: 15, color: C.onSurfaceVariant },
  backText: { fontSize: 15, color: C.primary, fontWeight: '500' },
  saveText: { fontSize: 15, fontWeight: '600', color: C.primary },
  saveTextDisabled: { color: C.outlineVariant },
  btnDisabled: {},
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Type picker
  pickerBody: { paddingHorizontal: 20, paddingTop: 16 },
  pickerHint: { fontSize: 13, color: C.onSurfaceVariant, marginBottom: 16, letterSpacing: -0.1 },
  pickerList: { backgroundColor: C.surface, borderRadius: 10, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator },
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  pickerRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separator },
  pickerAccentBar: { width: 3, height: 36, borderRadius: 2 },
  pickerIconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pickerIcon: { fontSize: 16, fontWeight: '700' },
  pickerTextCol: { flex: 1, gap: 2 },
  pickerLabel: { fontSize: 15, fontWeight: '600', color: C.onSurface, letterSpacing: -0.2 },
  pickerDesc: { fontSize: 12, color: C.onSurfaceVariant, lineHeight: 16 },
  pickerChevron: { fontSize: 20, color: C.outlineVariant, marginRight: 2 },

  // Body (form scroll container)
  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 48 },

  // Section separator
  sectionSep: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 22 },

  // Question label (prominent prompt at top of each section)
  questionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: C.onSurface,
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  // Section headline (e.g. vaccine name echo after selection)
  sectionHeadline: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.2,
    marginBottom: 6,
  },

  // Step hint (small subtext)
  stepHint: { fontSize: 13, color: C.onSurfaceVariant, marginBottom: 4, letterSpacing: -0.1 },

  // Status big chips (Planned / Completed)
  statusBigRow: { flexDirection: 'row', gap: 12 },
  bigStatusChip: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bigStatusChipActive: { borderColor: C.primary, backgroundColor: C.primaryTint },
  bigStatusEmoji: { fontSize: 24, marginBottom: 2 },
  bigStatusLabel: { fontSize: 15, fontWeight: '700', color: C.onSurface, letterSpacing: -0.2, textAlign: 'center' },
  bigStatusLabelActive: { color: C.primary },
  bigStatusSub: { fontSize: 11, color: C.onSurfaceVariant, fontWeight: '400', textAlign: 'center' },
  bigStatusSubActive: { color: C.primary, opacity: 0.75 },

  // Reason grid (2-column)
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  reasonCard: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  reasonCardActive: { borderColor: C.primary, backgroundColor: C.primaryTint },
  reasonSymbol: { fontSize: 26 },
  reasonLabel: { fontSize: 13, fontWeight: '600', color: C.onSurfaceVariant, textAlign: 'center' },
  reasonLabelActive: { color: C.primary },

  // Record type grid (2-column)
  recTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recTypeCard: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  recTypeCardActive: { borderColor: C.primary, backgroundColor: C.primaryTint },
  recTypeSymbol: { fontSize: 24, marginBottom: 2 },
  recTypeLabel: { fontSize: 14, fontWeight: '600', color: C.onSurface },
  recTypeLabelActive: { color: C.primary },
  recTypeDesc: { fontSize: 11, color: C.onSurfaceVariant, lineHeight: 15 },

  // Vaccine chips
  suggestSectionLabel: { fontSize: 10, fontWeight: '700', color: C.outlineVariant, letterSpacing: 0.8, marginTop: 16, marginBottom: 10 },
  vaccineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vaccineChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  vaccineChipActive: { backgroundColor: C.primaryTint, borderColor: C.primary },
  vaccineChipText: { fontSize: 13, color: C.onSurfaceVariant, fontWeight: '500' },
  vaccineChipTextActive: { color: C.primary, fontWeight: '600' },
  vaccineChipOther: { borderStyle: 'dashed', borderColor: C.primary },
  vaccineChipOtherText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // Continue button (custom vaccine advance)
  continueBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  continueBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Back-to-list link
  backToListText: { fontSize: 13, color: C.primary, fontWeight: '500', marginTop: 10, marginBottom: 2 },

  // Fields
  label: { fontSize: 11, fontWeight: '600', color: C.onSurfaceVariant, letterSpacing: 0.7, marginTop: 18, marginBottom: 8 },
  required: { color: C.urgent },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: C.onSurface,
    minHeight: 46,
  },
  inputFocused: { borderColor: C.primary },
  inputMultiline: { height: 96, textAlignVertical: 'top', paddingTop: 12 },
  inputDisabledShell: { backgroundColor: '#f2f2ef', borderColor: '#d4d5cf' },
  inputDisabledText: { color: C.outlineVariant },

  // Date tap row
  dateTapRow: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.16)',
    backgroundColor: '#fafbf8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateTapMain: { flex: 1, gap: 3 },
  dateTapEyebrow: { fontSize: 11, color: C.onSurfaceVariant, fontWeight: '600', letterSpacing: 0.2 },
  dateTapText: { fontSize: 17, lineHeight: 22, color: C.onSurface, fontWeight: '600' },
  dateTapPlaceholder: { color: C.outlineVariant, fontWeight: '500' },
  dateTapBadge: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(71,102,74,0.10)',
    borderWidth: 1, borderColor: 'rgba(71,102,74,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  dateTapBadgeText: { fontSize: 16, color: C.primary, fontWeight: '800', marginTop: -1 },
  datePickerWrap: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.10)',
    backgroundColor: '#fbfcfa',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    alignSelf: 'stretch',
  },

  // Clinic map input
  mapInputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 12,
    backgroundColor: '#fff',
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
  },
  mapInputField: {
    flex: 1,
    fontSize: 15,
    color: C.onSurface,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  mapIndicatorBtn: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: C.primaryTint,
    borderWidth: 1,
    borderColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapIndicatorGlyph: {
    width: 10, height: 10, borderRadius: 5,
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  mapIndicatorGlyphDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary },
  mapIndicatorText: { fontSize: 12, color: C.primary, fontWeight: '700' },
  mapIndicatorChevron: { fontSize: 14, color: C.primary, fontWeight: '700', marginLeft: -2 },
  mapPickedCaption: { marginTop: 6, fontSize: 12, color: C.primary, fontWeight: '600' },

  // Chips (horizontal scroll)
  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: C.surfaceContainer, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: C.primary, borderColor: C.primaryDim },
  chipText: { fontSize: 13, color: C.onSurfaceVariant, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Two-column
  twoCol: { flexDirection: 'row', gap: 10 },

  // Fee
  feeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  feeInput: { flex: 1 },
  currencyRow: { flexDirection: 'row', gap: 6 },
  currencyChip: { width: 38, height: 46, borderRadius: 10, backgroundColor: C.surfaceContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  currencyChipActive: { backgroundColor: C.primary, borderColor: C.primaryDim },
  currencyText: { fontSize: 14, fontWeight: '600', color: C.onSurfaceVariant },
  currencyTextActive: { color: '#fff' },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  toggleSubtext: { fontSize: 11, lineHeight: 15, color: C.onSurfaceVariant, fontWeight: '400', marginTop: 1 },

  // At-vet
  atVetRow: { flexDirection: 'row', gap: 10 },
  atVetChip: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: C.surfaceContainer, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  atVetChipActive: { backgroundColor: C.primaryTint, borderColor: C.primary },
  atVetChipText: { fontSize: 14, fontWeight: '600', color: C.onSurfaceVariant },
  atVetChipTextActive: { color: C.primary },

  // Outcome chips
  outcomeChipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  outcomeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.surfaceContainer, borderWidth: 1.5, borderColor: 'transparent' },
  outcomeChipActive: { backgroundColor: C.primaryTint, borderColor: C.primary },
  outcomeChipText: { fontSize: 13, fontWeight: '500', color: C.onSurfaceVariant },
  outcomeChipTextActive: { color: C.primary, fontWeight: '600' },

  // File attachments
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, borderColor: C.outlineVariant, borderStyle: 'dashed',
    backgroundColor: C.surfaceLow, paddingHorizontal: 14, paddingVertical: 12,
  },
  attachBtnIcon: { fontSize: 18 },
  attachBtnText: { fontSize: 14, lineHeight: 19, color: C.onSurfaceVariant, fontWeight: '500' },
  attachList: { gap: 6, marginTop: 6 },
  attachItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 10, backgroundColor: C.surfaceContainer, paddingHorizontal: 12, paddingVertical: 9 },
  attachItemName: { flex: 1, fontSize: 13, lineHeight: 17, color: C.onSurface, fontWeight: '500' },
  attachItemRemove: { fontSize: 14, color: C.outlineVariant, fontWeight: '600' },

  // Clinic picker modal
  pickerModalRoot: { flex: 1, justifyContent: 'flex-end' },
  pickerModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  pickerModalCard: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20,
    maxHeight: '78%',
  },
  pickerModalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.outlineVariant, alignSelf: 'center', marginBottom: 12 },
  pickerModalTitle: { fontSize: 20, fontWeight: '700', color: C.onSurface, letterSpacing: -0.3 },
  pickerModalHint: { marginTop: 4, fontSize: 13, color: C.onSurfaceVariant },
  pickerSearchRow: { marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  pickerSearchInput: { flex: 1, marginTop: 0, marginBottom: 0 },
  pickerNearbyBtn: { height: 46, minWidth: 86, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  pickerNearbyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pickerMapNotice: { marginTop: 10, borderRadius: 12, backgroundColor: '#edf1eb', borderWidth: 1, borderColor: '#d7dfd2', paddingVertical: 9, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerMapNoticeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  pickerMapNoticeText: { fontSize: 12, color: '#47664a', fontWeight: '600' },
  pickerResultList: { marginTop: 12 },
  pickerBusyRow: { paddingVertical: 10 },
  pickerResultItem: { borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.separator, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  pickerResultName: { fontSize: 15, fontWeight: '700', color: C.onSurface },
  pickerResultAddress: { marginTop: 3, fontSize: 12, color: C.onSurfaceVariant, lineHeight: 17 },
  pickerEmptyText: { fontSize: 13, color: C.onSurfaceVariant, paddingVertical: 10 },
});
