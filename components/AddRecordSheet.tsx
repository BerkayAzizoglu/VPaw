/**
 * AddRecordSheet — near full-screen bottom sheet for adding:
 *   • Vet Visit  (mode='vetVisit')
 *   • Vaccine    (mode='vaccine')
 *   • Health Record (mode='record')
 *
 * Shares the same spring-slide pattern as the breed insight sheet.
 * Design pass is deferred — layout and fields are the focus here.
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

export type AddRecordMode = 'vetVisit' | 'vaccine' | 'record';

type Props = {
  visible: boolean;
  mode: AddRecordMode;
  initialTitle?: string;
  initialType?: AddHealthRecordType;
  locale: 'en' | 'tr';
  onClose: () => void;
  onSave: (payload: AddHealthRecordPayload) => void;
};

// ─── Design tokens (mirrors app palette) ─────────────────────────────────────

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
};

// ─── Option arrays ────────────────────────────────────────────────────────────

const VISIT_REASONS = ['checkup', 'vaccine', 'illness', 'injury', 'follow_up', 'other'] as const;
type VisitReason = (typeof VISIT_REASONS)[number];

const RECORD_TYPES: AddHealthRecordType[] = ['diagnosis', 'procedure', 'prescription', 'test'];

const STATUS_OPTIONS = ['active', 'resolved', 'normal', 'abnormal', 'completed'] as const;
type RecordStatus = (typeof STATUS_OPTIONS)[number];

const VACCINES_TR = ['Karma Aşı', 'Kuduz', 'Leptospiroz', 'Bordetella', 'FeLV', 'FIV', 'Giardia', 'Chlamydophila'];
const VACCINES_EN = ['Core Vaccine', 'Rabies', 'Leptospirosis', 'Bordetella', 'FeLV', 'FIV', 'Giardia', 'Chlamydophila'];

const CURRENCIES = ['₺', '$', '€'] as const;

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
  initialTitle = '',
  initialType = 'diagnosis',
  locale,
  onClose,
  onSave,
}: Props) {
  const isTr = locale === 'tr';
  const { height: screenH } = useWindowDimensions();
  const sheetH = screenH * 0.93;

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

  // Reset all fields when sheet opens
  useEffect(() => {
    if (!visible) return;
    setFormDate(todayStr());
    setNotes('');
    setFocusedField(null);
    setFormError('');
    // vet visit
    setVisitReason('checkup');
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
  }, [visible, initialTitle, initialType, mode]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid =
    mode === 'vetVisit' ? isValidDate(formDate) :
    mode === 'vaccine' ? (vaccineName.trim().length > 0 && isValidDate(formDate)) :
    (recTitle.trim().length > 0 && isValidDate(formDate));

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!isValid) {
      setFormError(isTr ? 'Lütfen zorunlu alanları doldurun.' : 'Please fill in all required fields.');
      return;
    }
    setFormError('');

    let payload: AddHealthRecordPayload;

    if (mode === 'vetVisit') {
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
        clinicName: clinicName.trim() || undefined,
        vetName: vetName.trim() || undefined,
        fee: fee.trim() ? parseFloat(fee.replace(',', '.')) : undefined,
        feeCurrency: fee.trim() ? feeCurrency : undefined,
        dueDate: followUpEnabled && isValidDate(followUpDate) ? followUpDate : undefined,
      };
    } else if (mode === 'vaccine') {
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
  const sheetTitle =
    mode === 'vetVisit' ? (isTr ? 'Veteriner Ziyareti' : 'Vet Visit') :
    mode === 'vaccine'  ? (isTr ? 'Aşı Kaydı'          : 'Vaccine Record') :
                          (isTr ? 'Sağlık Kaydı'        : 'Health Record');

  // ── Label helpers ──────────────────────────────────────────────────────────
  function visitReasonLabel(r: VisitReason) {
    const m: Record<VisitReason, [string, string]> = {
      checkup: ['Kontrol', 'Checkup'], vaccine: ['Aşı', 'Vaccine'],
      illness: ['Hastalık', 'Illness'], injury: ['Yaralanma', 'Injury'],
      follow_up: ['Takip', 'Follow-up'], other: ['Diğer', 'Other'],
    };
    return isTr ? m[r][0] : m[r][1];
  }

  function recTypeLabel(t: AddHealthRecordType) {
    if (t === 'diagnosis') return isTr ? 'Teşhis' : 'Diagnosis';
    if (t === 'procedure') return isTr ? 'İşlem' : 'Procedure';
    if (t === 'prescription') return isTr ? 'Reçete' : 'Prescription';
    return 'Test';
  }

  function statusLabel(s: RecordStatus) {
    if (s === 'active') return isTr ? 'Aktif' : 'Active';
    if (s === 'resolved') return isTr ? 'Çözüldü' : 'Resolved';
    if (s === 'normal') return 'Normal';
    if (s === 'abnormal') return isTr ? 'Anormal' : 'Abnormal';
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

  // ── Form bodies ────────────────────────────────────────────────────────────

  const renderVetVisitForm = () => (
    <>
      {renderLabel(isTr ? 'ZİYARET NEDENİ' : 'VISIT REASON', true)}
      {renderChips(VISIT_REASONS, visitReason, (v) => v && setVisitReason(v as VisitReason), visitReasonLabel)}

      {renderLabel(isTr ? 'ZİYARET TARİHİ' : 'VISIT DATE', true)}
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
              <Pressable onPress={() => closeAnim()} hitSlop={16} style={st.cancelBtn}>
                <Text style={st.cancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Text style={st.headerTitle}>{sheetTitle}</Text>
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
            </View>
            <View style={st.divider} />
          </View>

          {/* ── Scrollable form ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={st.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {mode === 'vetVisit' ? renderVetVisitForm() : null}
            {mode === 'vaccine'  ? renderVaccineForm()  : null}
            {mode === 'record'   ? renderRecordForm()   : null}
            {formError ? <Text style={st.error}>{formError}</Text> : null}
            <View style={{ height: 48 }} />
          </ScrollView>
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
