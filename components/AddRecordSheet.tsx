/**
 * AddRecordSheet — unified wizard-style health record entry sheet.
 *
 * Step 0: Type picker (vetVisit / vaccine / record)
 * Then type-specific steps:
 *   vetVisit — 3 steps: reason → date+clinic → status+fee+notes
 *   vaccine  — 2 steps: name selection → dates+notes
 *   record   — 3 steps: record type → title+date → status+notes
 */

import React, { useEffect, useRef, useState } from 'react';
import {
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
import type { AddHealthRecordPayload, AddHealthRecordType } from '../screens/HealthHubScreen';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddRecordMode = 'vetVisit' | 'vaccine' | 'record' | 'typeSelect';
export type AddRecordContext = 'quick' | 'detailed';

type EntryType = 'vetVisit' | 'vaccine' | 'record';

type WizardState =
  | { type: null }
  | { type: 'vetVisit'; step: 1 | 2 | 3 }
  | { type: 'vaccine'; step: 1 | 2 }
  | { type: 'record'; step: 1 | 2 | 3 };

type Props = {
  visible: boolean;
  mode: AddRecordMode;
  context?: AddRecordContext;
  initialTitle?: string;
  initialType?: AddHealthRecordType;
  locale: 'en' | 'tr';
  onClose: () => void;
  onSave: (payload: AddHealthRecordPayload) => void;
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

const VISIT_STATUS_OPTIONS = ['completed', 'planned', 'canceled'] as const;
type VisitStatus = (typeof VISIT_STATUS_OPTIONS)[number];

const RECORD_TYPES: AddHealthRecordType[] = ['diagnosis', 'procedure', 'prescription', 'test'];

const STATUS_OPTIONS = ['active', 'resolved', 'normal', 'abnormal', 'completed'] as const;
type RecordStatus = (typeof STATUS_OPTIONS)[number];

const VACCINES_TR = ['Karma Aşı (DHPPi)', 'Kuduz', 'Leptospiroz', 'Bordetella', 'FeLV', 'FIV', 'Giardia', 'Klamidya'];
const VACCINES_EN = ['Core Vaccine (DHPPi)', 'Rabies', 'Leptospirosis', 'Bordetella', 'FeLV', 'FIV', 'Giardia', 'Chlamydophila'];

const CURRENCIES = ['₺', '$', '€'] as const;

const TOTAL_STEPS: Record<EntryType, number> = { vetVisit: 3, vaccine: 2, record: 3 };

// ─── Card configs ─────────────────────────────────────────────────────────────

type ReasonCard = { value: VisitReason; symbol: string; labelEn: string; labelTr: string };
const REASON_CARDS: ReasonCard[] = [
  { value: 'checkup',  symbol: '🩺', labelEn: 'Checkup',   labelTr: 'Kontrol'   },
  { value: 'vaccine',  symbol: '💉', labelEn: 'Vaccine',   labelTr: 'Aşı'       },
  { value: 'illness',  symbol: '🌡', labelEn: 'Illness',   labelTr: 'Hastalık'  },
  { value: 'injury',   symbol: '🩹', labelEn: 'Injury',    labelTr: 'Yaralanma' },
  { value: 'follow_up',symbol: '📅', labelEn: 'Follow-up', labelTr: 'Takip'     },
  { value: 'other',    symbol: '···', labelEn: 'Other',    labelTr: 'Diğer'     },
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
  { type: 'diagnosis',   symbol: '🔍', labelEn: 'Diagnosis', labelTr: 'Teşhis',      descEn: 'Condition or illness',  descTr: 'Hastalık, durum'        },
  { type: 'procedure',   symbol: '✂', labelEn: 'Procedure', labelTr: 'İşlem',       descEn: 'Surgery or operation',  descTr: 'Ameliyat, uygulama'     },
  { type: 'prescription',symbol: '💊', labelEn: 'Treatment', labelTr: 'Tedavi',      descEn: 'Medication or therapy', descTr: 'İlaç, terapi'           },
  { type: 'test',        symbol: '🧪', labelEn: 'Lab / Test', labelTr: 'Lab / Test', descEn: 'Blood work, imaging',   descTr: 'Tahlil, görüntüleme'    },
];

type TypeCard = {
  key: EntryType;
  symbol: string;
  accent: string;
  labelEn: string;
  labelTr: string;
  descEn: string;
  descTr: string;
};
const TYPE_CARDS: TypeCard[] = [
  { key: 'vetVisit', symbol: '⚕', accent: '#4a7c59', labelEn: 'Vet Visit',      labelTr: 'Veteriner Ziyareti', descEn: 'Clinic visit, checkup, examination', descTr: 'Klinik ziyareti, muayene, kontrol' },
  { key: 'vaccine',  symbol: '💉', accent: '#3d6e9e', labelEn: 'Vaccine',        labelTr: 'Aşı',                descEn: 'Vaccination record and reminders',   descTr: 'Aşı kaydı ve hatırlatma tarihi'   },
  { key: 'record',   symbol: '✚', accent: '#9b4040', labelEn: 'Health Record',  labelTr: 'Sağlık Kaydı',       descEn: 'Diagnosis, procedure, test, treatment', descTr: 'Tanı, işlem, test, reçete'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(new Date(`${v}T12:00:00.000Z`).getTime());
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function modeToWizard(m: AddRecordMode): WizardState {
  if (m === 'vetVisit') return { type: 'vetVisit', step: 1 };
  if (m === 'vaccine')  return { type: 'vaccine',  step: 1 };
  if (m === 'record')   return { type: 'record',   step: 1 };
  return { type: null };
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
}: Props) {
  const isTr = locale === 'tr';
  const { height: screenH } = useWindowDimensions();
  const sheetH = screenH * 0.93;

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [wizard, setWizard] = useState<WizardState>(modeToWizard(mode));

  // ── Animations ─────────────────────────────────────────────────────────────
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

  const animateStep = (direction: 'forward' | 'back') => {
    const from = direction === 'forward' ? 60 : -60;
    slideAnim.setValue(from);
    Animated.spring(slideAnim, { toValue: 0, damping: 24, stiffness: 280, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (visible) openAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Drag-to-dismiss ─────────────────────────────────────────────────────────
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
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

  // ── Form state ──────────────────────────────────────────────────────────────

  const [formDate, setFormDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Vet Visit
  const [visitReason, setVisitReason] = useState<VisitReason>('checkup');
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('completed');
  const [clinicName, setClinicName] = useState('');
  const [vetName, setVetName] = useState('');
  const [fee, setFee] = useState('');
  const [feeCurrency, setFeeCurrency] = useState<(typeof CURRENCIES)[number]>('₺');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpContext, setFollowUpContext] = useState('');

  // Vaccine
  const [vaccineName, setVaccineName] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [vaccineClinic, setVaccineClinic] = useState('');
  const [vaccineVet, setVaccineVet] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [atVet, setAtVet] = useState(false);
  const vaccineNameInputRef = useRef<TextInput>(null);
  const vaccineDateInputRef = useRef<TextInput>(null);

  // Health Record
  const [recType, setRecType] = useState<AddHealthRecordType>(initialType);
  const [recTitle, setRecTitle] = useState(initialTitle);
  const [recStatus, setRecStatus] = useState<RecordStatus | null>(null);
  const [valueNumber, setValueNumber] = useState('');
  const [valueUnit, setValueUnit] = useState('');
  const [dueDate, setDueDate] = useState('');

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    setWizard(modeToWizard(mode));
    slideAnim.setValue(0);
    setFormDate(todayStr());
    setNotes('');
    setFocusedField(null);
    setVisitReason('checkup');
    setVisitStatus('completed');
    setClinicName('');
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
    setRecType(initialType);
    setRecTitle(mode === 'record' ? initialTitle : '');
    setRecStatus(null);
    setValueNumber('');
    setValueUnit('');
    setDueDate('');
  }, [visible, initialTitle, initialType, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ───────────────────────────────────────────────────────────────

  const selectType = (entry: EntryType) => {
    animateStep('forward');
    setWizard({ type: entry, step: 1 });
    if (entry === 'vaccine') {
      requestAnimationFrame(() => vaccineNameInputRef.current?.focus());
    }
  };

  const goBack = () => {
    if (wizard.type === null) { closeAnim(); return; }
    if (wizard.step === 1) {
      if (mode === 'typeSelect') { animateStep('back'); setWizard({ type: null }); }
      else closeAnim();
      return;
    }
    animateStep('back');
    setWizard((prev) => {
      if (prev.type === null) return prev;
      return { ...prev, step: (prev.step - 1) as never };
    });
  };

  const goNext = () => {
    if (wizard.type === null) return;
    const total = TOTAL_STEPS[wizard.type];
    if (wizard.step >= total) { handleSave(); return; }
    animateStep('forward');
    setWizard((prev) => {
      if (prev.type === null) return prev;
      return { ...prev, step: (prev.step + 1) as never };
    });
  };

  // Auto-advance when a reason or type card is tapped
  const selectReasonAndAdvance = (r: VisitReason) => {
    setVisitReason(r);
    animateStep('forward');
    setWizard({ type: 'vetVisit', step: 2 });
  };

  const selectRecTypeAndAdvance = (t: AddHealthRecordType) => {
    setRecType(t);
    animateStep('forward');
    setWizard({ type: 'record', step: 2 });
  };

  const selectVaccineAndAdvance = (name: string) => {
    setVaccineName(name);
    animateStep('forward');
    setWizard({ type: 'vaccine', step: 2 });
    requestAnimationFrame(() => vaccineDateInputRef.current?.focus());
  };

  // ── Per-step validity ────────────────────────────────────────────────────────

  const isCurrentStepValid = (() => {
    if (wizard.type === null) return false;
    if (wizard.type === 'vetVisit') {
      if (wizard.step === 1) return true; // reason has default, auto-advance
      if (wizard.step === 2) return isValidDate(formDate);
      return true; // step 3 optional
    }
    if (wizard.type === 'vaccine') {
      if (wizard.step === 1) return vaccineName.trim().length > 0;
      return isValidDate(formDate);
    }
    if (wizard.type === 'record') {
      if (wizard.step === 1) return true; // type has default, auto-advance
      if (wizard.step === 2) return recTitle.trim().length > 0 && isValidDate(formDate);
      return true; // step 3 optional
    }
    return false;
  })();

  const isOnLastStep = wizard.type !== null && wizard.step === TOTAL_STEPS[wizard.type];

  // ── Submit ───────────────────────────────────────────────────────────────────

  const canSave =
    wizard.type === 'vetVisit' ? isValidDate(formDate) :
    wizard.type === 'vaccine'  ? (vaccineName.trim().length > 0 && isValidDate(formDate)) :
    wizard.type === 'record'   ? (recTitle.trim().length > 0 && isValidDate(formDate)) :
    false;

  function handleSave() {
    if (!canSave) return;

    let payload: AddHealthRecordPayload;

    if (wizard.type === 'vetVisit') {
      const rLabelTr: Record<VisitReason, string> = {
        checkup: 'Kontrol', vaccine: 'Aşı', illness: 'Hastalık',
        injury: 'Yaralanma', follow_up: 'Takip', other: 'Diğer',
      };
      const rLabelEn: Record<VisitReason, string> = {
        checkup: 'Checkup', vaccine: 'Vaccine', illness: 'Illness',
        injury: 'Injury', follow_up: 'Follow-up', other: 'Other',
      };
      const reasonStr = isTr ? rLabelTr[visitReason] : rLabelEn[visitReason];
      payload = {
        type: 'procedure',
        title: isTr ? `Veteriner Ziyareti – ${reasonStr}` : `Vet Visit – ${reasonStr}`,
        date: formDate,
        note: notes.trim() || undefined,
        visitReason,
        visitStatus,
        clinicName: clinicName.trim() || undefined,
        vetName: vetName.trim() || undefined,
        fee: fee.trim() ? parseFloat(fee.replace(',', '.')) : undefined,
        feeCurrency: fee.trim() ? feeCurrency : undefined,
        dueDate: followUpEnabled && isValidDate(followUpDate) ? followUpDate : undefined,
        followUpContext: visitReason === 'follow_up' && followUpContext.trim() ? followUpContext.trim() : undefined,
      };
    } else if (wizard.type === 'vaccine') {
      payload = {
        type: 'vaccine',
        title: vaccineName.trim(),
        date: formDate,
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
        date: formDate,
        note: notes.trim() || undefined,
        status: recStatus ?? undefined,
        valueNumber: valueNumber.trim() ? parseFloat(valueNumber.replace(',', '.')) : undefined,
        valueUnit: valueUnit.trim() || undefined,
        dueDate: isValidDate(dueDate) ? dueDate : undefined,
      };
    }

    onSave(payload);
    closeAnim();
  }

  // ── Label helpers ─────────────────────────────────────────────────────────────

  function visitStatusLabel(s: VisitStatus) {
    if (s === 'completed') return isTr ? 'Tamamlandı' : 'Completed';
    if (s === 'planned')   return isTr ? 'Planlandı'  : 'Planned';
    return isTr ? 'İptal' : 'Canceled';
  }

  function statusLabel(s: RecordStatus) {
    if (s === 'active')     return isTr ? 'Aktif'      : 'Active';
    if (s === 'resolved')   return isTr ? 'Çözüldü'   : 'Resolved';
    if (s === 'normal')     return 'Normal';
    if (s === 'abnormal')   return isTr ? 'Anormal'   : 'Abnormal';
    return isTr ? 'Tamamlandı' : 'Completed';
  }

  function recTitlePlaceholder() {
    if (recType === 'diagnosis')    return isTr ? 'Örn: Kulak iltihabı, kalça displazisi' : 'e.g. Otitis externa, hip dysplasia';
    if (recType === 'procedure')    return isTr ? 'Örn: Diş temizliği, kısırlaştırma'    : 'e.g. Teeth cleaning, spay';
    if (recType === 'prescription') return isTr ? 'Örn: Amoksisilin 250mg, Frontline'    : 'e.g. Amoxicillin 250mg, Frontline';
    return isTr ? 'Örn: Tam kan sayımı, röntgen' : 'e.g. CBC blood panel, X-ray';
  }

  // ── Reusable render helpers ────────────────────────────────────────────────────

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
    },
  ) => (
    <TextInput
      ref={opts?.inputRef}
      style={[st.input, opts?.multiline && st.inputMultiline, focusedField === fieldKey && st.inputFocused]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.outlineVariant}
      multiline={opts?.multiline}
      numberOfLines={opts?.multiline ? 4 : 1}
      keyboardType={opts?.numeric ? 'decimal-pad' : 'default'}
      autoCapitalize={opts?.noCapitalize ? 'none' : 'sentences'}
      returnKeyType={opts?.returnKeyType}
      onSubmitEditing={opts?.onSubmitEditing}
      onFocus={() => setFocusedField(fieldKey)}
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

  // ── Step indicator ────────────────────────────────────────────────────────────

  const renderStepDots = () => {
    if (wizard.type === null) return null;
    const total = TOTAL_STEPS[wizard.type];
    return (
      <View style={st.stepDotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              st.stepDot,
              i + 1 < wizard.step ? st.stepDotDone :
              i + 1 === wizard.step ? st.stepDotCurrent :
              st.stepDotFuture,
            ]}
          />
        ))}
      </View>
    );
  };

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

  // ── Vet Visit steps ───────────────────────────────────────────────────────────

  const renderVetStep1 = () => (
    <>
      <Text style={st.stepQuestion}>{isTr ? 'Neden geldiniz?' : 'What is the reason for the visit?'}</Text>
      <View style={st.reasonGrid}>
        {REASON_CARDS.map((card) => (
          <Pressable
            key={card.value}
            style={[st.reasonCard, visitReason === card.value && st.reasonCardActive]}
            onPress={() => selectReasonAndAdvance(card.value)}
          >
            <Text style={st.reasonSymbol}>{card.symbol}</Text>
            <Text style={[st.reasonLabel, visitReason === card.value && st.reasonLabelActive]}>
              {isTr ? card.labelTr : card.labelEn}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  const renderVetStep2 = () => (
    <>
      <Text style={st.stepHint}>{isTr ? 'Ziyaret bilgilerini girin' : 'Enter visit details'}</Text>
      {visitReason === 'follow_up' ? (
        <>
          {renderLabel(isTr ? 'NE TAKİBİ?' : 'FOLLOWING UP ON?')}
          {renderInput(
            followUpContext,
            setFollowUpContext,
            isTr ? 'Örn: Kulak iltihabı tedavisi, geçen haftaki muayene...' : 'e.g. Otitis treatment, last week\'s exam...',
            'followUpCtx',
          )}
        </>
      ) : null}
      {renderLabel(isTr ? 'TARİH' : 'DATE', true)}
      {renderInput(formDate, setFormDate, 'YYYY-MM-DD', 'date', { noCapitalize: true })}

      <View style={st.twoCol}>
        <View style={{ flex: 1 }}>
          {renderLabel(isTr ? 'KLİNİK' : 'CLINIC')}
          {renderInput(clinicName, setClinicName, isTr ? 'Klinik adı' : 'Clinic name', 'clinic')}
        </View>
        <View style={{ flex: 1 }}>
          {renderLabel(isTr ? 'VETERİNER' : 'VET')}
          {renderInput(vetName, setVetName, isTr ? 'Veteriner adı' : 'Vet name', 'vet')}
        </View>
      </View>
    </>
  );

  const renderVetStep3 = () => (
    <>
      <Text style={st.stepHint}>{isTr ? 'Ek bilgiler (opsiyonel)' : 'Additional info (optional)'}</Text>
      {renderLabel(isTr ? 'ZİYARET DURUMU' : 'VISIT STATUS')}
      {renderChips(VISIT_STATUS_OPTIONS, visitStatus, (v) => v && setVisitStatus(v as VisitStatus), visitStatusLabel)}

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

      <View style={st.toggleRow}>
        <Text style={st.label}>{isTr ? 'TAKİP RANDEVUSU' : 'FOLLOW-UP'}</Text>
        <Switch
          value={followUpEnabled}
          onValueChange={setFollowUpEnabled}
          trackColor={{ false: C.outlineVariant, true: C.primary }}
          thumbColor="#fff"
          ios_backgroundColor={C.outlineVariant}
        />
      </View>
      {followUpEnabled
        ? renderInput(followUpDate, setFollowUpDate, 'YYYY-MM-DD', 'followUp', { noCapitalize: true })
        : null}

      {renderLabel(isTr ? 'NOTLAR' : 'NOTES')}
      {renderInput(notes, setNotes, isTr ? 'Muayene notu, bulgular...' : 'Exam notes, findings...', 'notes', { multiline: true })}
    </>
  );

  // ── Vaccine steps ─────────────────────────────────────────────────────────────

  const renderVaccineStep1 = () => {
    const suggestions = isTr ? VACCINES_TR : VACCINES_EN;
    const normalizedName = vaccineName.trim().toLocaleLowerCase(locale);
    return (
      <>
        <Text style={st.stepQuestion}>{isTr ? 'Hangi aşı?' : 'Which vaccine?'}</Text>
        <Text style={st.stepHint}>{isTr ? 'Listeden seçin veya kendiniz yazın' : 'Choose from the list or type a custom name'}</Text>
        {renderInput(vaccineName, (v) => { setVaccineName(v); }, isTr ? 'Aşı adı' : 'Vaccine name', 'vaccineName', {
          inputRef: vaccineNameInputRef,
          returnKeyType: 'next',
          onSubmitEditing: () => { if (vaccineName.trim()) goNext(); },
        })}
        <Text style={st.suggestSectionLabel}>{isTr ? 'YAYGIN AŞILAR' : 'COMMON VACCINES'}</Text>
        <View style={st.vaccineGrid}>
          {suggestions.map((s) => {
            const isActive = normalizedName === s.toLocaleLowerCase(locale);
            return (
              <Pressable
                key={s}
                style={[st.vaccineChip, isActive && st.vaccineChipActive]}
                onPress={() => selectVaccineAndAdvance(s)}
              >
                <Text style={[st.vaccineChipText, isActive && st.vaccineChipTextActive]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      </>
    );
  };

  const renderVaccineStep2 = () => (
    <>
      <Text style={st.stepHint}>{isTr ? `${vaccineName} — tarihleri girin` : `${vaccineName} — enter dates`}</Text>
      {renderLabel(isTr ? 'AŞI TARİHİ' : 'DATE GIVEN', true)}
      {renderInput(formDate, setFormDate, 'YYYY-MM-DD', 'date', {
        noCapitalize: true,
        inputRef: vaccineDateInputRef,
      })}

      {renderLabel(isTr ? 'SONRAKİ DOZ TARİHİ' : 'NEXT DUE DATE')}
      {renderInput(nextDueDate, setNextDueDate, 'YYYY-MM-DD', 'nextDue', { noCapitalize: true })}

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

      {renderLabel(isTr ? 'NOTLAR' : 'NOTES')}
      {renderInput(notes, setNotes, isTr ? 'Reaksiyon, hekim notu...' : 'Reaction, vet notes...', 'notes', { multiline: true })}
    </>
  );

  // ── Health Record steps ───────────────────────────────────────────────────────

  const renderRecordStep1 = () => (
    <>
      <Text style={st.stepQuestion}>{isTr ? 'Kayıt türü?' : 'What type of record?'}</Text>
      <View style={st.recTypeGrid}>
        {REC_TYPE_CARDS.map((card) => (
          <Pressable
            key={card.type}
            style={[st.recTypeCard, recType === card.type && st.recTypeCardActive]}
            onPress={() => selectRecTypeAndAdvance(card.type)}
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
  );

  const renderRecordStep2 = () => (
    <>
      <Text style={st.stepHint}>{isTr ? 'Başlık ve tarih girin' : 'Enter title and date'}</Text>
      {renderLabel(isTr ? 'BAŞLIK' : 'TITLE', true)}
      {renderInput(recTitle, setRecTitle, recTitlePlaceholder(), 'title')}

      {renderLabel(isTr ? 'TARİH' : 'DATE', true)}
      {renderInput(formDate, setFormDate, 'YYYY-MM-DD', 'date', { noCapitalize: true })}

      {recType === 'test' ? (
        <>
          {renderLabel(isTr ? 'SONUÇ DEĞERİ' : 'TEST RESULT')}
          <View style={st.valueRow}>
            <TextInput
              style={[st.input, st.valueNumInput, focusedField === 'value' && st.inputFocused]}
              value={valueNumber}
              onChangeText={setValueNumber}
              placeholder="0.0"
              placeholderTextColor={C.outlineVariant}
              keyboardType="decimal-pad"
              onFocus={() => setFocusedField('value')}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[st.input, st.valueUnitInput, focusedField === 'unit' && st.inputFocused]}
              value={valueUnit}
              onChangeText={setValueUnit}
              placeholder={isTr ? 'Birim (mg/dL, IU/L...)' : 'Unit (mg/dL, IU/L...)'}
              placeholderTextColor={C.outlineVariant}
              autoCapitalize="none"
              onFocus={() => setFocusedField('unit')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </>
      ) : null}
    </>
  );

  const renderRecordStep3 = () => (
    <>
      <Text style={st.stepHint}>{isTr ? 'Durum ve notlar (opsiyonel)' : 'Status and notes (optional)'}</Text>
      {renderLabel(isTr ? 'DURUM' : 'STATUS')}
      {renderChips(STATUS_OPTIONS, recStatus, setRecStatus, statusLabel, true)}

      {renderLabel(isTr ? 'TAKİP TARİHİ' : 'FOLLOW-UP DATE')}
      {renderInput(dueDate, setDueDate, 'YYYY-MM-DD', 'dueDate', { noCapitalize: true })}

      {renderLabel(isTr ? 'NOTLAR' : 'NOTES')}
      {renderInput(notes, setNotes, isTr ? 'Teşhis detayı, bulgular...' : 'Diagnosis details, findings...', 'notes', { multiline: true })}
    </>
  );

  // ── Current step content ──────────────────────────────────────────────────────

  const renderStepContent = () => {
    if (wizard.type === null) return null;
    if (wizard.type === 'vetVisit') {
      if (wizard.step === 1) return renderVetStep1();
      if (wizard.step === 2) return renderVetStep2();
      return renderVetStep3();
    }
    if (wizard.type === 'vaccine') {
      if (wizard.step === 1) return renderVaccineStep1();
      return renderVaccineStep2();
    }
    if (wizard.type === 'record') {
      if (wizard.step === 1) return renderRecordStep1();
      if (wizard.step === 2) return renderRecordStep2();
      return renderRecordStep3();
    }
    return null;
  };

  // ── Header titles ─────────────────────────────────────────────────────────────

  const headerTitle = (() => {
    if (wizard.type === null) return isTr ? 'Kayıt Ekle' : 'Add Record';
    if (wizard.type === 'vetVisit') {
      if (wizard.step === 1) return isTr ? 'Veteriner Ziyareti' : 'Vet Visit';
      if (wizard.step === 2) return isTr ? 'Ziyaret Detayı' : 'Visit Details';
      return isTr ? 'Ek Bilgi' : 'Additional Info';
    }
    if (wizard.type === 'vaccine') {
      if (wizard.step === 1) return isTr ? 'Aşı Seçimi' : 'Select Vaccine';
      return isTr ? 'Aşı Tarihleri' : 'Vaccine Dates';
    }
    if (wizard.step === 1) return isTr ? 'Kayıt Türü' : 'Record Type';
    if (wizard.step === 2) return isTr ? 'Kayıt Detayı' : 'Record Details';
    return isTr ? 'Ek Bilgi' : 'Additional Info';
  })();

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
              {/* Left: back or cancel */}
              <Pressable onPress={goBack} hitSlop={16} style={st.headerSideBtn}>
                {wizard.type !== null && (wizard.step > 1 || mode === 'typeSelect') ? (
                  <Text style={st.backText}>‹ {isTr ? 'Geri' : 'Back'}</Text>
                ) : (
                  <Text style={st.cancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
                )}
              </Pressable>

              <Text style={st.headerTitle}>{headerTitle}</Text>

              {/* Right: next or save, or close on picker */}
              {wizard.type === null ? (
                <Pressable onPress={() => closeAnim()} hitSlop={16} style={[st.headerSideBtn, st.headerSideBtnRight]}>
                  <Text style={st.cancelText}>{isTr ? 'Kapat' : 'Close'}</Text>
                </Pressable>
              ) : isOnLastStep ? (
                <Pressable
                  onPress={handleSave}
                  hitSlop={16}
                  style={[st.headerSideBtn, st.headerSideBtnRight, !canSave && st.btnDisabled]}
                  disabled={!canSave}
                >
                  <Text style={[st.saveText, !canSave && st.saveTextDisabled]}>{isTr ? 'Kaydet' : 'Save'}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={goNext}
                  hitSlop={16}
                  style={[st.headerSideBtn, st.headerSideBtnRight, !isCurrentStepValid && st.btnDisabled]}
                  disabled={!isCurrentStepValid}
                >
                  <Text style={[st.nextText, !isCurrentStepValid && st.saveTextDisabled]}>{isTr ? 'İleri' : 'Next'}</Text>
                </Pressable>
              )}
            </View>

            {/* Step dots */}
            {renderStepDots()}
            <View style={st.divider} />
          </View>

          {/* Content */}
          {wizard.type === null ? (
            renderTypePicker()
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={st.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                {renderStepContent()}
              </Animated.View>
              <View style={{ height: 48 }} />
            </ScrollView>
          )}
        </Animated.View>
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
  nextText: { fontSize: 15, fontWeight: '600', color: C.primary },
  saveTextDisabled: { color: C.outlineVariant },
  btnDisabled: {},
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)' },

  // Step dots
  stepDotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
  stepDot: { width: 6, height: 6, borderRadius: 3 },
  stepDotCurrent: { backgroundColor: C.primary, width: 18, borderRadius: 3 },
  stepDotDone: { backgroundColor: C.outlineVariant },
  stepDotFuture: { backgroundColor: C.surfaceContainer, borderWidth: 1, borderColor: C.outlineVariant },

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

  // Body
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 48 },

  // Step headings
  stepQuestion: { fontSize: 18, fontWeight: '700', color: C.onSurface, letterSpacing: -0.4, marginBottom: 6 },
  stepHint: { fontSize: 13, color: C.onSurfaceVariant, marginBottom: 4, letterSpacing: -0.1 },

  // Reason grid (2-column)
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
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
  recTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
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

  // Vaccine chips (wrapped grid)
  suggestSectionLabel: { fontSize: 10, fontWeight: '700', color: C.outlineVariant, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
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

  // Chips
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

  // At-vet toggle
  atVetRow: { flexDirection: 'row', gap: 10 },
  atVetChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  atVetChipActive: { backgroundColor: C.primaryTint, borderColor: C.primary },
  atVetChipText: { fontSize: 14, fontWeight: '600', color: C.onSurfaceVariant },
  atVetChipTextActive: { color: C.primary },

  // Test result
  valueRow: { flexDirection: 'row', gap: 10 },
  valueNumInput: { flex: 1 },
  valueUnitInput: { flex: 1.6 },
});
