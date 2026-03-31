/**
 * AddRecordSheet — unified health record entry sheet.
 *
 * Modes:
 *   'typeSelect' — Step 0 type picker, then transitions to the appropriate form
 *   'vetVisit'   — Vet visit form (context-based: 'quick' or 'detailed')
 *   'vaccine'    — Vaccine form
 *   'record'     — Health record form (diagnosis / procedure / test / note)
 *
 * Context:
 *   'quick'    — opened from Home or Health Hub (default)
 *   'detailed' — opened from Vet Visits screen (same form, more prominent status)
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

type EntryType = 'vetVisit' | 'vaccine' | 'diagnosis' | 'treatment' | 'test' | 'note';

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

const VACCINES_TR = ['Karma Aşı', 'Kuduz', 'Leptospiroz', 'Bordetella', 'FeLV', 'FIV', 'Giardia', 'Chlamydophila'];
const VACCINES_EN = ['Core Vaccine', 'Rabies', 'Leptospirosis', 'Bordetella', 'FeLV', 'FIV', 'Giardia', 'Chlamydophila'];

const CURRENCIES = ['₺', '$', '€'] as const;

// ─── Type picker config ────────────────────────────────────────────────────────

type TypeOption = {
  key: EntryType;
  labelEn: string;
  labelTr: string;
  descEn: string;
  descTr: string;
  accent: string;
  symbol: string;
};

const TYPE_OPTIONS: TypeOption[] = [
  {
    key: 'vetVisit',
    labelEn: 'Vet Visit',
    labelTr: 'Veteriner Ziyareti',
    descEn: 'Clinic visit, examination, checkup',
    descTr: 'Klinik ziyareti, muayene, kontrol',
    accent: '#4a7c59',
    symbol: '⚕',
  },
  {
    key: 'vaccine',
    labelEn: 'Vaccine',
    labelTr: 'Aşı',
    descEn: 'Vaccination record with due date',
    descTr: 'Aşı kaydı ve hatırlatma tarihi',
    accent: '#3d6e9e',
    symbol: '💉',
  },
  {
    key: 'diagnosis',
    labelEn: 'Diagnosis / Condition',
    labelTr: 'Tanı / Durum',
    descEn: 'Allergy, chronic condition, illness',
    descTr: 'Alerji, kronik durum, hastalık',
    accent: '#9b4040',
    symbol: '✚',
  },
  {
    key: 'treatment',
    labelEn: 'Treatment / Procedure',
    labelTr: 'Tedavi / İşlem',
    descEn: 'Surgery, dental, medication course',
    descTr: 'Ameliyat, diş, ilaç tedavisi',
    accent: '#6b4ea8',
    symbol: '✦',
  },
  {
    key: 'test',
    labelEn: 'Test / Lab Result',
    labelTr: 'Test / Lab Sonucu',
    descEn: 'Blood panel, urinalysis, imaging',
    descTr: 'Kan testi, idrar, görüntüleme',
    accent: '#2d7a5c',
    symbol: '◎',
  },
  {
    key: 'note',
    labelEn: 'Note',
    labelTr: 'Not',
    descEn: 'General observation or reminder',
    descTr: 'Genel gözlem veya hatırlatma',
    accent: '#8b6914',
    symbol: '≡',
  },
];

// Mapping from EntryType to form mode + initial record type
function entryTypeToForm(entry: EntryType): { mode: AddRecordMode; recType: AddHealthRecordType } {
  switch (entry) {
    case 'vetVisit':  return { mode: 'vetVisit',  recType: 'procedure' };
    case 'vaccine':   return { mode: 'vaccine',   recType: 'procedure' };
    case 'diagnosis': return { mode: 'record',    recType: 'diagnosis' };
    case 'treatment': return { mode: 'record',    recType: 'procedure' };
    case 'test':      return { mode: 'record',    recType: 'test' };
    case 'note':      return { mode: 'record',    recType: 'prescription' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(new Date(`${v}T12:00:00.000Z`).getTime());
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

  // ── Navigation step (type selector vs form) ────────────────────────────────
  const [step, setStep] = useState<'pick' | 'form'>(mode === 'typeSelect' ? 'pick' : 'form');
  const [activeMode, setActiveMode] = useState<AddRecordMode>(mode === 'typeSelect' ? 'vetVisit' : mode);
  const stepAnim = useRef(new Animated.Value(0)).current;

  // ── Animation ──────────────────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(sheetH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (visible) openAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Drag-to-dismiss (handle zone only) ────────────────────────────────────
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

  // ── Form state ─────────────────────────────────────────────────────────────

  // Shared
  const [formDate, setFormDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Vet Visit
  const [visitReason, setVisitReason] = useState<VisitReason>('checkup');
  const [visitStatus, setVisitStatus] = useState<VisitStatus>('completed');
  const [clinicName, setClinicName] = useState('');
  const [vetName, setVetName] = useState('');
  const [fee, setFee] = useState('');
  const [feeCurrency, setFeeCurrency] = useState<(typeof CURRENCIES)[number]>('₺');
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');

  // Vaccine
  const [vaccineName, setVaccineName] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [vaccineClinic, setVaccineClinic] = useState('');
  const [vaccineVet, setVaccineVet] = useState('');
  const [batchNumber, setBatchNumber] = useState('');

  // Health Record
  const [recType, setRecType] = useState<AddHealthRecordType>(initialType);
  const [recTitle, setRecTitle] = useState(initialTitle);
  const [recStatus, setRecStatus] = useState<RecordStatus | null>(null);
  const [valueNumber, setValueNumber] = useState('');
  const [valueUnit, setValueUnit] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Reset all fields and step when sheet opens
  useEffect(() => {
    if (!visible) return;
    // Step reset
    const initialStep = mode === 'typeSelect' ? 'pick' : 'form';
    setStep(initialStep);
    setActiveMode(mode === 'typeSelect' ? 'vetVisit' : mode);
    stepAnim.setValue(0);
    // Field reset
    setFormDate(todayStr());
    setNotes('');
    setFocusedField(null);
    setFormError('');
    // vet visit
    setVisitReason('checkup');
    setVisitStatus('completed');
    setClinicName('');
    setVetName('');
    setFee('');
    setFeeCurrency('₺');
    setFollowUpEnabled(false);
    setFollowUpDate('');
    // vaccine
    setVaccineName(mode === 'vaccine' ? initialTitle : '');
    setNextDueDate('');
    setVaccineClinic('');
    setVaccineVet('');
    setBatchNumber('');
    // record
    setRecType(initialType);
    setRecTitle(mode === 'record' ? initialTitle : '');
    setRecStatus(null);
    setValueNumber('');
    setValueUnit('');
    setDueDate('');
  }, [visible, initialTitle, initialType, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Type selector → form transition ────────────────────────────────────────
  const selectType = (entry: EntryType) => {
    const { mode: nextMode, recType: nextRecType } = entryTypeToForm(entry);
    setActiveMode(nextMode);
    setRecType(nextRecType);
    setStep('form');
    Animated.timing(stepAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };

  const goBackToPicker = () => {
    setStep('pick');
    stepAnim.setValue(0);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid =
    activeMode === 'vetVisit' ? isValidDate(formDate) :
    activeMode === 'vaccine'  ? (vaccineName.trim().length > 0 && isValidDate(formDate)) :
    (recTitle.trim().length > 0 && isValidDate(formDate));

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!isValid) {
      setFormError(isTr ? 'Lütfen zorunlu alanları doldurun.' : 'Please fill in all required fields.');
      return;
    }
    setFormError('');

    let payload: AddHealthRecordPayload;

    if (activeMode === 'vetVisit') {
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
      };
    } else if (activeMode === 'vaccine') {
      payload = {
        type: 'vaccine',
        title: vaccineName.trim(),
        date: formDate,
        note: notes.trim() || undefined,
        dueDate: isValidDate(nextDueDate) ? nextDueDate : undefined,
        clinicName: vaccineClinic.trim() || undefined,
        vetName: vaccineVet.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
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

  // ── Titles ─────────────────────────────────────────────────────────────────
  const formTitle = (() => {
    if (step === 'pick') return isTr ? 'Kayıt Ekle' : 'Add Record';
    if (activeMode === 'vetVisit') return isTr ? (context === 'detailed' ? 'Veteriner Ziyareti' : 'Veteriner Ziyareti') : (context === 'detailed' ? 'Vet Visit' : 'Vet Visit');
    if (activeMode === 'vaccine')  return isTr ? 'Aşı Kaydı' : 'Vaccine Record';
    return isTr ? 'Sağlık Kaydı' : 'Health Record';
  })();

  // ── Label helpers ──────────────────────────────────────────────────────────
  function visitReasonLabel(r: VisitReason) {
    const m: Record<VisitReason, [string, string]> = {
      checkup: ['Kontrol', 'Checkup'], vaccine: ['Aşı', 'Vaccine'],
      illness: ['Hastalık', 'Illness'], injury: ['Yaralanma', 'Injury'],
      follow_up: ['Takip', 'Follow-up'], other: ['Diğer', 'Other'],
    };
    return isTr ? m[r][0] : m[r][1];
  }

  function visitStatusLabel(s: VisitStatus) {
    if (s === 'completed') return isTr ? 'Tamamlandı' : 'Completed';
    if (s === 'planned')   return isTr ? 'Planlandı'  : 'Planned';
    return isTr ? 'İptal' : 'Canceled';
  }

  function recTypeLabel(t: AddHealthRecordType) {
    if (t === 'diagnosis')   return isTr ? 'Teşhis'  : 'Diagnosis';
    if (t === 'procedure')   return isTr ? 'İşlem'   : 'Procedure';
    if (t === 'prescription') return isTr ? 'Reçete' : 'Prescription';
    return 'Test';
  }

  function statusLabel(s: RecordStatus) {
    if (s === 'active')     return isTr ? 'Aktif'      : 'Active';
    if (s === 'resolved')   return isTr ? 'Çözüldü'   : 'Resolved';
    if (s === 'normal')     return 'Normal';
    if (s === 'abnormal')   return isTr ? 'Anormal'   : 'Abnormal';
    return isTr ? 'Tamamlandı' : 'Completed';
  }

  // ── Reusable render helpers ────────────────────────────────────────────────

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
    opts?: { multiline?: boolean; numeric?: boolean; noCapitalize?: boolean },
  ) => (
    <TextInput
      style={[
        st.input,
        opts?.multiline && st.inputMultiline,
        focusedField === fieldKey && st.inputFocused,
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.outlineVariant}
      multiline={opts?.multiline}
      numberOfLines={opts?.multiline ? 4 : 1}
      keyboardType={opts?.numeric ? 'decimal-pad' : 'default'}
      autoCapitalize={opts?.noCapitalize ? 'none' : 'sentences'}
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
          onPress={() => onSelect(nullable && selected === opt ? null : (opt as T))}
        >
          <Text style={[st.chipText, selected === opt && st.chipTextActive]}>
            {labelFn(opt)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  // ── Type picker ────────────────────────────────────────────────────────────

  const renderTypePicker = () => (
    <View style={st.pickerList}>
      {TYPE_OPTIONS.map((opt, index) => (
        <Pressable
          key={opt.key}
          style={[st.pickerRow, index < TYPE_OPTIONS.length - 1 && st.pickerRowBorder]}
          onPress={() => selectType(opt.key)}
        >
          <View style={[st.pickerAccentBar, { backgroundColor: opt.accent }]} />
          <View style={[st.pickerIconBox, { backgroundColor: opt.accent + '18' }]}>
            <Text style={[st.pickerIcon, { color: opt.accent }]}>{opt.symbol}</Text>
          </View>
          <View style={st.pickerTextCol}>
            <Text style={st.pickerLabel}>{isTr ? opt.labelTr : opt.labelEn}</Text>
            <Text style={st.pickerDesc}>{isTr ? opt.descTr : opt.descEn}</Text>
          </View>
          <Text style={st.pickerChevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );

  // ── Form bodies ────────────────────────────────────────────────────────────

  const renderVetVisitForm = () => (
    <>
      {/* Status — always shown, more prominent in detailed context */}
      {renderLabel(isTr ? 'ZİYARET DURUMU' : 'VISIT STATUS', true)}
      {renderChips(VISIT_STATUS_OPTIONS, visitStatus, (v) => v && setVisitStatus(v as VisitStatus), visitStatusLabel)}

      {renderLabel(isTr ? 'ZİYARET NEDENİ' : 'VISIT REASON', true)}
      {renderChips(VISIT_REASONS, visitReason, (v) => v && setVisitReason(v as VisitReason), visitReasonLabel)}

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
        <Text style={st.label}>{isTr ? 'TAKİP RANDEVUSU' : 'FOLLOW-UP APPOINTMENT'}</Text>
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

  const renderVaccineForm = () => {
    const suggestions = isTr ? VACCINES_TR : VACCINES_EN;
    return (
      <>
        {renderLabel(isTr ? 'AŞI ADI' : 'VACCINE NAME', true)}
        {renderInput(vaccineName, setVaccineName, isTr ? 'Aşı adı' : 'Vaccine name', 'vaccineName')}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.suggestRow}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              style={[st.suggest, vaccineName === s && st.suggestActive]}
              onPress={() => setVaccineName(s)}
            >
              <Text style={[st.suggestText, vaccineName === s && st.suggestTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {renderLabel(isTr ? 'AŞI TARİHİ' : 'VACCINE DATE', true)}
        {renderInput(formDate, setFormDate, 'YYYY-MM-DD', 'date', { noCapitalize: true })}

        {renderLabel(isTr ? 'SONRAKİ HATIRLATMA TARİHİ' : 'NEXT DUE DATE')}
        {renderInput(nextDueDate, setNextDueDate, 'YYYY-MM-DD', 'nextDue', { noCapitalize: true })}

        <View style={st.twoCol}>
          <View style={{ flex: 1 }}>
            {renderLabel(isTr ? 'KLİNİK' : 'CLINIC')}
            {renderInput(vaccineClinic, setVaccineClinic, isTr ? 'Klinik adı' : 'Clinic name', 'vClinic')}
          </View>
          <View style={{ flex: 1 }}>
            {renderLabel(isTr ? 'VETERİNER' : 'VET')}
            {renderInput(vaccineVet, setVaccineVet, isTr ? 'Veteriner adı' : 'Vet name', 'vVet')}
          </View>
        </View>

        {renderLabel(isTr ? 'SERİ / LOT NO' : 'BATCH / LOT NO')}
        {renderInput(batchNumber, setBatchNumber, isTr ? 'Seri numarası' : 'Batch number', 'batch', { noCapitalize: true })}

        {renderLabel(isTr ? 'NOTLAR' : 'NOTES')}
        {renderInput(notes, setNotes, isTr ? 'Reaksiyon, hekim notu...' : 'Reaction, vet notes...', 'notes', { multiline: true })}
      </>
    );
  };

  const renderRecordForm = () => (
    <>
      {renderLabel(isTr ? 'KAYIT TÜRÜ' : 'RECORD TYPE', true)}
      {renderChips(RECORD_TYPES, recType, (v) => v && setRecType(v as AddHealthRecordType), recTypeLabel)}

      {renderLabel(isTr ? 'BAŞLIK' : 'TITLE', true)}
      {renderInput(recTitle, setRecTitle, isTr ? 'Kayıt başlığı' : 'Record title', 'title')}

      {renderLabel(isTr ? 'TARİH' : 'DATE', true)}
      {renderInput(formDate, setFormDate, 'YYYY-MM-DD', 'date', { noCapitalize: true })}

      {renderLabel(isTr ? 'DURUM' : 'STATUS')}
      {renderChips(STATUS_OPTIONS, recStatus, setRecStatus, statusLabel, true)}

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

      {renderLabel(isTr ? 'TAKİP / KONTROL TARİHİ' : 'FOLLOW-UP DATE')}
      {renderInput(dueDate, setDueDate, 'YYYY-MM-DD', 'dueDate', { noCapitalize: true })}

      {renderLabel(isTr ? 'NOTLAR' : 'NOTES')}
      {renderInput(notes, setNotes, isTr ? 'Teşhis detayı, bulgular...' : 'Diagnosis details, findings...', 'notes', { multiline: true })}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => closeAnim()}>
      <KeyboardAvoidingView
        style={st.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, st.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeAnim()} />

        {/* Sheet */}
        <Animated.View style={[st.sheet, { height: sheetH, transform: [{ translateY }] }]}>

          {/* ── Drag zone: handle + header + divider ── */}
          <View {...pan.panHandlers}>
            <View style={st.handleZone}>
              <View style={st.handle} />
            </View>
            <View style={st.header}>
              {/* Left action */}
              {step === 'form' && mode === 'typeSelect' ? (
                <Pressable onPress={goBackToPicker} hitSlop={16} style={st.cancelBtn}>
                  <Text style={st.backText}>‹ {isTr ? 'Geri' : 'Back'}</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => closeAnim()} hitSlop={16} style={st.cancelBtn}>
                  <Text style={st.cancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
                </Pressable>
              )}

              <Text style={st.headerTitle}>{formTitle}</Text>

              {/* Right action */}
              {step === 'form' ? (
                <Pressable
                  onPress={handleSave}
                  hitSlop={16}
                  style={[st.saveBtn, !isValid && st.saveBtnDisabled]}
                  disabled={!isValid}
                >
                  <Text style={[st.saveText, !isValid && st.saveTextDisabled]}>
                    {isTr ? 'Kaydet' : 'Save'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => closeAnim()} hitSlop={16} style={st.saveBtn}>
                  <Text style={st.cancelText}>{isTr ? 'Kapat' : 'Close'}</Text>
                </Pressable>
              )}
            </View>
            <View style={st.divider} />
          </View>

          {/* ── Content ── */}
          {step === 'pick' ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={st.pickerBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={st.pickerHint}>
                {isTr ? 'Hangi tür kaydı eklemek istiyorsunuz?' : 'What type of record would you like to add?'}
              </Text>
              {renderTypePicker()}
              <View style={{ height: 48 }} />
            </ScrollView>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={st.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activeMode === 'vetVisit' ? renderVetVisitForm() : null}
              {activeMode === 'vaccine'  ? renderVaccineForm()  : null}
              {activeMode === 'record'   ? renderRecordForm()   : null}
              {formError ? <Text style={st.error}>{formError}</Text> : null}
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
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },

  // ── Handle ──
  handleZone: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.outlineVariant,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  cancelBtn: {
    minWidth: 60,
  },
  cancelText: {
    fontSize: 15,
    color: C.onSurfaceVariant,
  },
  backText: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '500',
  },
  saveBtn: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveBtnDisabled: {},
  saveText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },
  saveTextDisabled: {
    color: C.outlineVariant,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // ── Picker ──
  pickerBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pickerHint: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    marginBottom: 16,
    letterSpacing: -0.1,
  },
  pickerList: {
    backgroundColor: C.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  pickerRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  pickerAccentBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  pickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerTextCol: {
    flex: 1,
    gap: 2,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  pickerDesc: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    lineHeight: 16,
  },
  pickerChevron: {
    fontSize: 20,
    color: C.outlineVariant,
    marginRight: 2,
  },

  // ── Body ──
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
  },

  // ── Fields ──
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: C.onSurfaceVariant,
    letterSpacing: 0.7,
    marginTop: 18,
    marginBottom: 8,
  },
  required: {
    color: C.urgent,
  },
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
  inputFocused: {
    borderColor: C.primary,
  },
  inputMultiline: {
    height: 96,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  // ── Chips ──
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primaryDim,
  },
  chipText: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // ── Vaccine suggestions ──
  suggestRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 6,
    paddingBottom: 2,
  },
  suggest: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: C.surfaceLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  suggestActive: {
    backgroundColor: '#edf5ea',
    borderColor: C.primary,
  },
  suggestText: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  suggestTextActive: {
    color: C.primary,
    fontWeight: '600',
  },

  // ── Two-column layout ──
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },

  // ── Fee row ──
  feeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  feeInput: {
    flex: 1,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 6,
  },
  currencyChip: {
    width: 38,
    height: 46,
    borderRadius: 10,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currencyChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primaryDim,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurfaceVariant,
  },
  currencyTextActive: {
    color: '#fff',
  },

  // ── Toggle row ──
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },

  // ── Test result value row ──
  valueRow: {
    flexDirection: 'row',
    gap: 10,
  },
  valueNumInput: {
    flex: 1,
  },
  valueUnitInput: {
    flex: 1.6,
  },

  // ── Error ──
  error: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: C.urgent,
    lineHeight: 18,
  },
});
