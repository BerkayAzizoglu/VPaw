import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';
import type { VetVisitReasonCategory } from '../lib/healthMvpModel';
import StickyBlurTopBar, { getStickyHeaderContentTop } from '../components/StickyBlurTopBar';

export type VisitActionType = 'vaccine' | 'diagnosis' | 'procedure' | 'test' | 'prescription';
type ReminderPreset = 'same_day' | 'one_day_before' | 'custom';

export type CreateVetVisitPayload = {
  date: string;
  clinic?: string;
  reason: VetVisitReasonCategory;
  status?: 'planned' | 'completed' | 'canceled';
  amount?: number;
  currency?: string;
  note?: string;
  reminderEnabled: boolean;
  reminderDate?: string;
  actions: Array<{
    type: VisitActionType;
    title: string;
    note?: string;
  }>;
};

type VetVisitsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  onAddVisit?: () => void;
  onEditVisit?: (id: string, payload: CreateVetVisitPayload) => void;
  onOpenDocuments?: () => void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  visits?: VisitItem[];
  /** Raw visit id prefix used to strip 'mvp-vet-' from VisitItem.id before calling onEditVisit */
  visitIdPrefix?: string;
};

export type VisitItem = {
  id: string;
  icon: 'stethoscope' | 'pulse';
  date: string;
  /** ISO date string (YYYY-MM-DD) for form editing */
  rawDate?: string;
  title: string;
  clinic: string;
  doctor: string;
  amount?: number;
  currency?: string;
  paymentText?: string;
  attachments: string[];
  attachPlaceholder?: boolean;
  status?: 'planned' | 'completed' | 'canceled';
};

function Icon({ kind, size = 18, color = '#7a7a7a' }: { kind: 'back' | 'stethoscope' | 'wallet' | 'clinic' | 'file' | 'plus' | 'pulse' | 'edit' | 'check'; size?: number; color?: string }) {
  if (kind === 'edit') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.4 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M13.5 6.5L17.5 10.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 12.5L9.5 16.5L18.5 7.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'stethoscope') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4V8.2C7 10.8 8.8 12.8 11.1 13.3V15.1C11.1 17.2 12.8 19 14.9 19C17 19 18.7 17.3 18.7 15.2V14.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M14.8 4V8.2C14.8 10.9 13 13 10.5 13.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="18.9" cy="12.8" r="2.2" stroke={color} strokeWidth={1.9} />
      </Svg>
    );
  }

  if (kind === 'pulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3.8 12H8.3L10.2 8.5L13 16L15.1 11.5H20.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'wallet') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 7.5H17.5C18.6 7.5 19.5 8.4 19.5 9.5V15.5C19.5 16.6 18.6 17.5 17.5 17.5H6.5C5.4 17.5 4.5 16.6 4.5 15.5V8.5C4.5 7.9 4.9 7.5 5.5 7.5Z" stroke={color} strokeWidth={1.8} />
        <Path d="M16 12H19.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'clinic') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 18.5V9.2L10.5 6.8L14.5 9.2V18.5" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d="M3.8 18.5H20.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M9 12.2H12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M10.5 10.7V13.7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'file') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.2 4.8H15.4L18.8 8.2V19.2H7.2V4.8Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d="M15.2 4.8V8.2H18.8" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Line x1="9.6" y1="12" x2="16" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}


const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_TR = ['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA'];

function VisitCard({
  item,
  isTr,
  isUpcoming,
  onEdit,
  onOpenDocuments,
}: {
  item: VisitItem;
  isTr: boolean;
  isUpcoming: boolean;
  onEdit?: () => void;
  onOpenDocuments?: () => void;
}) {
  const parts = item.date.split('-');
  const monthIdx = parseInt(parts[1] ?? '1', 10) - 1;
  const day = parts[2] ?? '—';
  const mon = (isTr ? MONTHS_TR : MONTHS_EN)[monthIdx] ?? '—';
  const year = parts[0]?.slice(2) ?? '—';

  return (
    <View style={styles.visitCardNew}>
      {/* Date column */}
      <View style={styles.visitCardDateCol}>
        <Text style={styles.visitCardMon}>{mon}</Text>
        <Text style={styles.visitCardDay}>{day}</Text>
        {!isUpcoming && <Text style={styles.visitCardYear}>{`'${year}`}</Text>}
      </View>

      {/* Divider */}
      <View style={styles.visitCardDivider} />

      {/* Body */}
      <View style={styles.visitCardBody}>
        <Text style={styles.visitCardClinic} numberOfLines={1}>
          {item.clinic || (isTr ? 'Veteriner Kliniği' : 'Vet Clinic')}
        </Text>
        {item.title ? (
          <Text style={styles.visitCardTitle} numberOfLines={1}>{item.title}</Text>
        ) : null}
        <View style={styles.visitCardMeta}>
          {isUpcoming ? (
            <View style={styles.visitCardPlannedBadge}>
              <Text style={styles.visitCardPlannedText}>{isTr ? 'Planlandı' : 'Planned'}</Text>
            </View>
          ) : (
            <>
              {item.amount != null ? (
                <View style={styles.visitCardAmountPill}>
                  <Text style={styles.visitCardAmountText}>
                    {item.amount.toLocaleString('tr-TR')} {item.currency ?? 'TL'}
                  </Text>
                </View>
              ) : null}
              {item.attachments.length > 0 ? (
                <Pressable
                  style={styles.visitCardDocPill}
                  onPress={onOpenDocuments}
                  disabled={!onOpenDocuments}
                >
                  <Icon kind="file" size={11} color="#5d605a" />
                  <Text style={styles.visitCardDocText}>
                    {item.attachments.length} {isTr ? 'belge' : 'doc'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* Edit button */}
      {onEdit ? (
        <Pressable style={styles.visitCardEditBtn} onPress={onEdit} hitSlop={8}>
          <Icon kind="edit" size={14} color={isUpcoming ? '#4a6e4e' : '#5d605a'} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function VetVisitsScreen({
  onBack,
  backPreview,
  onAddVisit,
  onEditVisit,
  onOpenDocuments,
  status = 'ready',
  onRetry,
  visits,
}: VetVisitsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).vetVisits;
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const topInset = Math.max(insets.top, 14);

  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [visitDate, setVisitDate] = useState(today);
  const [visitClinic, setVisitClinic] = useState('');
  const [visitReason, setVisitReason] = useState<VetVisitReasonCategory>('checkup');
  const [visitStatus, setVisitStatus] = useState<'planned' | 'completed' | 'canceled'>('completed');
  const [visitNote, setVisitNote] = useState('');
  const [visitAmount, setVisitAmount] = useState('');
  const [visitCurrency, setVisitCurrency] = useState('TL');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderPreset, setReminderPreset] = useState<ReminderPreset>('same_day');
  const [reminderDate, setReminderDate] = useState(today);
  const [selectedActions, setSelectedActions] = useState<Record<VisitActionType, boolean>>({
    vaccine: false,
    diagnosis: false,
    procedure: false,
    test: false,
    prescription: false,
  });
  const [selectedActionOptions, setSelectedActionOptions] = useState<Record<VisitActionType, string>>({
    vaccine: '',
    diagnosis: '',
    procedure: '',
    test: '',
    prescription: '',
  });
  const [customActionTitles, setCustomActionTitles] = useState<Record<VisitActionType, string>>({
    vaccine: '',
    diagnosis: '',
    procedure: '',
    test: '',
    prescription: '',
  });
  const [actionNotes, setActionNotes] = useState<Record<VisitActionType, string>>({
    vaccine: '',
    diagnosis: '',
    procedure: '',
    test: '',
    prescription: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const savePressScale = useRef(new Animated.Value(1)).current;

  const actionOrder: VisitActionType[] = ['vaccine', 'diagnosis', 'procedure', 'test', 'prescription'];
  const actionLabels: Record<VisitActionType, string> = isTr
    ? {
      vaccine: 'Aşı',
      diagnosis: 'Tanı',
      procedure: 'Prosedür',
      test: 'Test',
      prescription: 'Reçete',
    }
    : {
      vaccine: 'Vaccine',
      diagnosis: 'Diagnosis',
      procedure: 'Procedure',
      test: 'Test',
      prescription: 'Prescription',
    };

  const actionOptions: Record<VisitActionType, Array<{ value: string; label: string }>> = isTr
    ? {
      vaccine: [
        { value: 'rabies', label: 'Kuduz' },
        { value: 'dhpp', label: 'DHPP' },
        { value: 'bordetella', label: 'Bordetella' },
        { value: 'leptospirosis', label: 'Leptospirosis' },
        { value: 'other', label: 'Diğer' },
      ],
      diagnosis: [
        { value: 'allergy', label: 'Alerji' },
        { value: 'infection', label: 'Enfeksiyon' },
        { value: 'gastro', label: 'Gastrointestinal' },
        { value: 'dermatology', label: 'Dermatoloji' },
        { value: 'other', label: 'Diğer' },
      ],
      procedure: [
        { value: 'neutering', label: 'Kısırlaştırma' },
        { value: 'dental_cleaning', label: 'Diş Temizliği' },
        { value: 'minor_surgery', label: 'Minor Cerrahi' },
        { value: 'wound_care', label: 'Yara Bakımı' },
        { value: 'other', label: 'Diğer' },
      ],
      test: [
        { value: 'blood_test', label: 'Kan Testi' },
        { value: 'fecal_test', label: 'Dışkı Testi' },
        { value: 'xray', label: 'Röntgen' },
        { value: 'ultrasound', label: 'Ultrason' },
        { value: 'other', label: 'Diğer' },
      ],
      prescription: [
        { value: 'antibiotic', label: 'Antibiyotik' },
        { value: 'anti_inflammatory', label: 'Anti-inflamatuar' },
        { value: 'antiparasitic', label: 'Antiparaziter' },
        { value: 'supplement', label: 'Takviye' },
        { value: 'other', label: 'Diğer' },
      ],
    }
    : {
      vaccine: [
        { value: 'rabies', label: 'Rabies' },
        { value: 'dhpp', label: 'DHPP' },
        { value: 'bordetella', label: 'Bordetella' },
        { value: 'leptospirosis', label: 'Leptospirosis' },
        { value: 'other', label: 'Other' },
      ],
      diagnosis: [
        { value: 'allergy', label: 'Allergy' },
        { value: 'infection', label: 'Infection' },
        { value: 'gastro', label: 'Gastrointestinal' },
        { value: 'dermatology', label: 'Dermatology' },
        { value: 'other', label: 'Other' },
      ],
      procedure: [
        { value: 'neutering', label: 'Neutering' },
        { value: 'dental_cleaning', label: 'Dental Cleaning' },
        { value: 'minor_surgery', label: 'Minor Surgery' },
        { value: 'wound_care', label: 'Wound Care' },
        { value: 'other', label: 'Other' },
      ],
      test: [
        { value: 'blood_test', label: 'Blood Test' },
        { value: 'fecal_test', label: 'Fecal Test' },
        { value: 'xray', label: 'X-ray' },
        { value: 'ultrasound', label: 'Ultrasound' },
        { value: 'other', label: 'Other' },
      ],
      prescription: [
        { value: 'antibiotic', label: 'Antibiotic' },
        { value: 'anti_inflammatory', label: 'Anti-inflammatory' },
        { value: 'antiparasitic', label: 'Antiparasitic' },
        { value: 'supplement', label: 'Supplement' },
        { value: 'other', label: 'Other' },
      ],
    };

  const reasonOptions: Array<{ value: VetVisitReasonCategory; label: string }> = isTr
    ? [
      { value: 'checkup', label: 'Kontrol' },
      { value: 'vaccine', label: 'Aşı' },
      { value: 'illness', label: 'Hastalık' },
      { value: 'injury', label: 'Yaralanma' },
      { value: 'follow_up', label: 'Takip' },
      { value: 'other', label: 'Diğer' },
    ]
    : [
      { value: 'checkup', label: 'Checkup' },
      { value: 'vaccine', label: 'Vaccine' },
      { value: 'illness', label: 'Illness' },
      { value: 'injury', label: 'Injury' },
      { value: 'follow_up', label: 'Follow-up' },
      { value: 'other', label: 'Other' },
    ];

  const toggleAction = (type: VisitActionType) => {
    setSelectedActions((prev) => {
      const nextEnabled = !prev[type];
      if (!nextEnabled) {
        setSelectedActionOptions((optPrev) => ({ ...optPrev, [type]: '' }));
        setCustomActionTitles((titlePrev) => ({ ...titlePrev, [type]: '' }));
        setActionNotes((notePrev) => ({ ...notePrev, [type]: '' }));
      }
      return { ...prev, [type]: nextEnabled };
    });
  };

  const resetCreateForm = () => {
    setVisitDate(today);
    setVisitClinic('');
    setVisitReason('checkup');
    setVisitStatus('completed');
    setVisitNote('');
    setVisitAmount('');
    setVisitCurrency('TL');
    setReminderEnabled(false);
    setReminderPreset('same_day');
    setReminderDate(today);
    setSelectedActions({
      vaccine: false,
      diagnosis: false,
      procedure: false,
      test: false,
      prescription: false,
    });
    setSelectedActionOptions({
      vaccine: '',
      diagnosis: '',
      procedure: '',
      test: '',
      prescription: '',
    });
    setCustomActionTitles({
      vaccine: '',
      diagnosis: '',
      procedure: '',
      test: '',
      prescription: '',
    });
    setActionNotes({
      vaccine: '',
      diagnosis: '',
      procedure: '',
      test: '',
      prescription: '',
    });
  };

  const openEditModal = (item: VisitItem) => {
    resetCreateForm();
    setEditingVisitId(item.id);
    setVisitDate(item.rawDate ?? item.date);
    setVisitClinic(item.clinic ?? '');
    if (item.status) setVisitStatus(item.status);
    if (item.amount != null) setVisitAmount(String(item.amount));
    if (item.currency) setVisitCurrency(item.currency);
    setIsCreateVisible(true);
  };

  const reminderPresetOptions: Array<{ value: ReminderPreset; label: string }> = isTr
    ? [
      { value: 'one_day_before', label: '1 gün önce' },
      { value: 'same_day', label: 'Aynı gün' },
      { value: 'custom', label: 'Özel tarih' },
    ]
    : [
      { value: 'one_day_before', label: '1 day before' },
      { value: 'same_day', label: 'Same day' },
      { value: 'custom', label: 'Custom' },
    ];

  const getReminderDateByPreset = (baseIso: string, preset: ReminderPreset) => {
    const base = new Date(baseIso);
    if (!Number.isFinite(base.getTime())) return baseIso;
    if (preset === 'same_day') return base.toISOString();
    if (preset === 'one_day_before') {
      const next = new Date(base.getTime() - 24 * 60 * 60 * 1000);
      return next.toISOString();
    }
    return reminderDate;
  };

  useEffect(() => {
    if (!reminderEnabled) return;
    if (reminderPreset === 'custom') return;
    const visitIso = parseInputDate(visitDate);
    if (!visitIso) return;
    const autoReminder = getReminderDateByPreset(visitIso, reminderPreset);
    const dateOnly = autoReminder.slice(0, 10);
    setReminderDate(dateOnly);
  }, [reminderEnabled, reminderPreset, visitDate]);

  const fallbackVisits: VisitItem[] = [
    {
      id: 'v1',
      icon: 'stethoscope',
      date: copy.visits.v1Date,
      title: copy.visits.v1Title,
      clinic: copy.visits.v1Clinic,
      doctor: copy.visits.v1Doctor,
      amount: 145,
      currency: 'USD',
      attachments: ['Checkup_Results...', 'Invoice.pdf'],
    },
    {
      id: 'v2',
      icon: 'pulse',
      date: copy.visits.v2Date,
      title: copy.visits.v2Title,
      clinic: copy.visits.v2Clinic,
      doctor: copy.visits.v2Doctor,
      paymentText: copy.addPayment,
      attachments: ['Prescription.pd...'],
    },
    {
      id: 'v3',
      icon: 'stethoscope',
      date: copy.visits.v3Date,
      title: copy.visits.v3Title,
      clinic: copy.visits.v3Clinic,
      doctor: copy.visits.v3Doctor,
      amount: 120,
      currency: 'USD',
      attachments: [],
      attachPlaceholder: true,
    },
  ];

  const parseInputDate = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = new Date(`${normalized}T12:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const isCreateFormValid = useMemo(() => {
    const visitDateIso = parseInputDate(visitDate);
    if (!visitDateIso) return false;

    const hasInvalidStructuredSelection = actionOrder.some((type) => {
      if (!selectedActions[type]) return false;
      const selectedValue = selectedActionOptions[type];
      if (!selectedValue) return true;
      if (selectedValue === 'other' && !customActionTitles[type].trim()) return true;
      return false;
    });
    if (hasInvalidStructuredSelection) return false;

    if (!reminderEnabled) return true;
    if (reminderPreset !== 'custom') return true;
    return !!parseInputDate(reminderDate);
  }, [
    actionOrder,
    customActionTitles,
    parseInputDate,
    reminderDate,
    reminderEnabled,
    reminderPreset,
    selectedActionOptions,
    selectedActions,
    visitDate,
  ]);

  const handleSubmitCreate = () => {
    const visitDateIso = parseInputDate(visitDate);
    if (!visitDateIso) {
      Alert.alert(
        isTr ? 'Geçersiz tarih' : 'Invalid date',
        isTr ? 'Tarihi YYYY-AA-GG formatında girin.' : 'Please enter date as YYYY-MM-DD.',
      );
      return;
    }

    const actions = actionOrder
      .filter((type) => selectedActions[type])
      .map((type) => {
        const selectedValue = selectedActionOptions[type];
        const selectedLabel = actionOptions[type].find((item) => item.value === selectedValue)?.label;
        const title =
          selectedValue === 'other'
            ? (customActionTitles[type].trim() || actionLabels[type])
            : (selectedLabel || actionLabels[type]);

        return {
          type,
          title,
          note: actionNotes[type].trim() || undefined,
        };
      });

    const hasInvalidStructuredSelection = actionOrder.some((type) => {
      if (!selectedActions[type]) return false;
      const selectedValue = selectedActionOptions[type];
      if (!selectedValue) return true;
      if (selectedValue === 'other' && !customActionTitles[type].trim()) return true;
      return false;
    });
    if (hasInvalidStructuredSelection) {
      Alert.alert(
        isTr ? 'Eksik seçim' : 'Missing selection',
        isTr ? 'Seçili işlemler için kategori seçin. Diğer seçtiyseniz kısa bir başlık yazın.' : 'Select a category for each chosen action. If you picked Other, add a short title.',
      );
      return;
    }

    const reminderDateIso = reminderEnabled
      ? (reminderPreset === 'custom'
          ? parseInputDate(reminderDate)
          : getReminderDateByPreset(visitDateIso, reminderPreset))
      : null;
    if (reminderEnabled && !reminderDateIso) {
      Alert.alert(
        isTr ? 'Gecersiz hatirlatma tarihi' : 'Invalid reminder date',
        isTr ? 'Hatirlatma tarihi YYYY-AA-GG formatinda olmali.' : 'Reminder date must be in YYYY-MM-DD format.',
      );
      return;
    }

    const parsedAmount = Number(visitAmount.replace(',', '.').replace(/[^0-9.]/g, ''));
    const payload: CreateVetVisitPayload = {
      date: visitDateIso,
      clinic: visitClinic.trim() || undefined,
      reason: visitReason,
      status: visitStatus,
      note: visitNote.trim() || undefined,
      amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      currency: visitAmount.trim() ? visitCurrency : undefined,
      reminderEnabled,
      reminderDate: reminderDateIso ?? undefined,
      actions,
    };

    if (editingVisitId && onEditVisit) {
      onEditVisit(editingVisitId, payload);
      setIsCreateVisible(false);
      setEditingVisitId(null);
      resetCreateForm();
    }
  };

  const visitsData = visits ?? fallbackVisits;
  const canceledVisits = useMemo(() => visitsData.filter((v) => v.status === 'canceled'), [visitsData]);
  const pastVisits = useMemo(() => visitsData.filter((v) => v.status !== 'canceled' && v.date <= today), [visitsData, today]);
  const plannedVisits = useMemo(() => visitsData.filter((v) => v.status !== 'canceled' && v.date > today), [visitsData, today]);

  const totalCurrency = visitsData.find((v) => v.currency)?.currency ?? 'TL';
  const visitsCountText = isTr ? `${visitsData.length} Ziyaret` : `${visitsData.length} Visits`;

  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;
  const annualAmount = visitsData
    .filter((v) => v.date.startsWith(String(currentYear)))
    .reduce((sum, v) => sum + (v.amount ?? 0), 0);
  const prevYearAmount = visitsData
    .filter((v) => v.date.startsWith(String(prevYear)))
    .reduce((sum, v) => sum + (v.amount ?? 0), 0);
  const totalAmount = visitsData.reduce((sum, item) => sum + (item.amount ?? 0), 0);

  const yearChangeLabel = (() => {
    if (prevYearAmount <= 0 && annualAmount <= 0) return isTr ? `BU YIL` : 'THIS YEAR';
    if (prevYearAmount <= 0) return isTr ? `${currentYear}` : String(currentYear);
    const pct = Math.round(((annualAmount - prevYearAmount) / prevYearAmount) * 100);
    const arrow = pct >= 0 ? '↑' : '↓';
    return isTr
      ? `${arrow} %${Math.abs(pct)} GEÇEN YILA GÖRE`
      : `${arrow} ${Math.abs(pct)}% VS LAST YEAR`;
  })();

  const totalCostText = annualAmount > 0 ? `${annualAmount.toLocaleString('tr-TR')} ${totalCurrency}` : copy.totalCost;

  const screenState = status;
  const showMainContent = screenState === 'ready';
  const showAddButton = screenState !== 'loading' && screenState !== 'error';
  const stateTitle = screenState === 'loading'
    ? (isTr ? 'Ziyaretler yükleniyor' : 'Loading vet visits')
    : screenState === 'empty'
      ? (isTr ? 'Henüz ziyaret kaydı yok' : 'No vet visits yet')
      : (isTr ? 'Ziyaret kayıtları alınamadı' : 'Could not load vet visits');
  const stateBody = screenState === 'loading'
    ? (isTr ? 'Geçmiş kayıtlar hazırlanıyor, lütfen bekleyin.' : 'Preparing your medical history, please wait.')
    : screenState === 'empty'
      ? (isTr ? 'İlk veteriner ziyaretinizi eklediğinizde bu alan otomatik olarak dolacaktır.' : 'This area will fill automatically once your first visit is added.')
      : (isTr ? 'Bağlantıyı kontrol edip tekrar deneyin.' : 'Please check your connection and try again.');

  const swipePanResponder = useEdgeSwipeBack({
    onBack,
    enabled: !isCreateVisible,
    fullScreenGestureEnabled: false,
    enterVariant: 'soft',
  });

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePanResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.frontLayer, swipePanResponder.frontLayerStyle]} {...swipePanResponder.panHandlers}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: getStickyHeaderContentTop(topInset),
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={24}
        directionalLockEnabled
      >

        {showMainContent ? (
          <>
            {/* ── Upcoming visits ── */}
            {plannedVisits.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>{isTr ? 'YAKLAŞAN ZİYARETLER' : 'UPCOMING VISITS'}</Text>
                {plannedVisits.map((item) => (
                  <VisitCard
                    key={item.id}
                    item={item}
                    isTr={isTr}
                    isUpcoming={true}
                    onEdit={() => openEditModal(item)}
                  />
                ))}
              </>
            ) : null}

            {/* ── Completed visits ── */}
            {pastVisits.length > 0 ? (
              <>
                <View style={[styles.sectionHeaderRow, plannedVisits.length > 0 && { marginTop: 28 }]}>
                  <Text style={styles.sectionLabel}>{isTr ? 'TAMAMLANAN ZİYARETLER' : 'COMPLETED VISITS'}</Text>
                </View>
                <View style={styles.completedList}>
                  {pastVisits.map((item) => (
                    <VisitCard
                      key={item.id}
                      item={item}
                      isTr={isTr}
                      isUpcoming={false}
                      onOpenDocuments={onOpenDocuments}
                      onEdit={onEditVisit ? () => openEditModal(item) : undefined}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {/* ── Canceled visits ── */}
            {canceledVisits.length > 0 ? (
              <>
                <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
                  <Text style={styles.sectionLabel}>{isTr ? 'İPTAL EDİLEN ZİYARETLER' : 'CANCELED VISITS'}</Text>
                </View>
                <View style={styles.completedList}>
                  {canceledVisits.map((item) => (
                    <VisitCard
                      key={item.id}
                      item={item}
                      isTr={isTr}
                      isUpcoming={false}
                      onOpenDocuments={onOpenDocuments}
                      onEdit={onEditVisit ? () => openEditModal(item) : undefined}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {/* ── Stats grid ── */}
            {visitsData.length > 0 ? (
              <View style={styles.statsGrid}>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>{isTr ? 'YILLIK HARCAMA' : 'ANNUAL SPEND'}</Text>
                  <Text style={styles.statGridValue}>{totalCostText}</Text>
                  <Text style={[styles.statGridSub, annualAmount !== prevYearAmount && prevYearAmount > 0 ? styles.statGridSubGreen : null]}>{yearChangeLabel}</Text>
                </View>
                <View style={styles.statGridCard}>
                  <Text style={styles.statGridLabel}>{isTr ? 'TOPLAM ZİYARET' : 'TOTAL VISITS'}</Text>
                  <Text style={styles.statGridValue}>{String(visitsData.length)}</Text>
                  <Text style={styles.statGridSub}>{isTr ? 'KATILIMDAN BERİ' : 'SINCE JOINING'}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <ScreenStateCard
            mode={screenState as ScreenStateMode}
            title={stateTitle}
            body={stateBody}
            actionLabel={screenState === 'error' ? (isTr ? 'Tekrar Dene' : 'Retry') : screenState === 'empty' ? (isTr ? 'Ziyaret Ekle' : 'Add Visit') : undefined}
            onAction={screenState === 'error' ? (onRetry ?? (() => Alert.alert(isTr ? 'Tekrar Dene' : 'Retry', isTr ? 'Lütfen kısa bir süre sonra tekrar deneyin.' : 'Please try again in a moment.'))) : screenState === 'empty' ? (onAddVisit ?? (() => Alert.alert(isTr ? 'Yeni Ziyaret' : 'New Visit', isTr ? 'Ilk ziyareti ekleyerek bu alani doldurun.' : 'Add your first visit to populate this area.'))) : undefined}
          />
        )}
      </Animated.ScrollView>

      <StickyBlurTopBar
        title={isTr ? 'VETERINER ZIYARETLERI' : 'VET VISITS'}
        topInset={topInset}
        scrollY={scrollY}
        titleColor="#2f352f"
        overlayColors={['rgba(63,93,71,0.56)', 'rgba(63,93,71,0.38)', 'rgba(63,93,71,0.18)', 'rgba(63,93,71,0)']}
        borderColor="rgba(49,73,56,0.24)"
        leftSlot={(
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#5d605a" />
          </Pressable>
        )}
        rightSlot={showAddButton ? (
          <Pressable style={styles.backBtn} onPress={() => onAddVisit?.()}>
            <Icon kind="plus" size={18} color="#5d605a" />
          </Pressable>
        ) : undefined}
      />

      <Modal
        visible={isCreateVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={() => { setIsCreateVisible(false); setEditingVisitId(null); resetCreateForm(); }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboardWrap}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editingVisitId ? (isTr ? 'Ziyareti Düzenle' : 'Edit Visit') : (isTr ? 'Veteriner Ziyareti Ekle' : 'Create Vet Visit')}</Text>
              <ScrollView style={styles.modalMainScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{isTr ? 'Ziyaret Bilgisi' : 'Visit info'}</Text>
                  <Text style={styles.modalHelperText}>
                    {isTr ? 'Veteriner görüşmesinin tarihini ve ana nedenini seçin.' : 'Set the encounter date and the primary reason for this visit.'}
                  </Text>

                  <Text style={styles.modalLabel}>{isTr ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
                  <TextInput
                    style={[styles.modalInput, focusedField === 'visitDate' ? styles.modalInputFocused : null]}
                    value={visitDate}
                    onChangeText={setVisitDate}
                    placeholder="2026-03-22"
                    placeholderTextColor="#a4a4a4"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('visitDate')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <Text style={styles.modalLabel}>{isTr ? 'Klinik (opsiyonel)' : 'Clinic (optional)'}</Text>
                  <TextInput
                    style={[styles.modalInput, focusedField === 'visitClinic' ? styles.modalInputFocused : null]}
                    value={visitClinic}
                    onChangeText={setVisitClinic}
                    placeholder={isTr ? 'Örn: Harmony Vet Clinic' : 'e.g. Harmony Vet Clinic'}
                    placeholderTextColor="#a4a4a4"
                    onFocus={() => setFocusedField('visitClinic')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <Text style={styles.modalLabel}>{isTr ? 'Ücret (opsiyonel)' : 'Cost (optional)'}</Text>
                  <View style={styles.amountRow}>
                    <TextInput
                      style={[styles.modalInput, styles.amountInput, focusedField === 'visitAmount' ? styles.modalInputFocused : null]}
                      value={visitAmount}
                      onChangeText={setVisitAmount}
                      keyboardType="decimal-pad"
                      placeholder={isTr ? 'Örn: 1200' : 'e.g. 1200'}
                      placeholderTextColor="#a4a4a4"
                      onFocus={() => setFocusedField('visitAmount')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable
                      style={styles.currencyToggle}
                      onPress={() => setVisitCurrency((c) => c === 'TL' ? 'USD' : c === 'USD' ? 'EUR' : 'TL')}
                    >
                      <Text style={styles.currencyToggleText}>{visitCurrency}</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.modalLabel}>{isTr ? 'Ziyaret Durumu' : 'Visit status'}</Text>
                  <View style={styles.chipsRow}>
                    {(['completed', 'planned', 'canceled'] as const).map((s) => {
                      const label = s === 'completed'
                        ? (isTr ? 'Tamamlandı' : 'Completed')
                        : s === 'planned'
                          ? (isTr ? 'Planlandı' : 'Planned')
                          : (isTr ? 'İptal Edildi' : 'Canceled');
                      return (
                        <Pressable
                          key={s}
                          style={({ pressed }) => [
                            styles.chipBtn,
                            visitStatus !== s ? styles.chipBtnInactive : null,
                            visitStatus === s ? styles.chipBtnActive : null,
                            pressed ? styles.chipBtnPressed : null,
                          ]}
                          onPress={() => setVisitStatus(s)}
                        >
                          <Text style={[styles.chipBtnText, visitStatus === s ? styles.chipBtnTextActive : null]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.modalLabel}>{isTr ? 'Ziyaret Nedeni' : 'Visit reason'}</Text>
                  <Text style={styles.modalLabelHint}>
                    {isTr ? 'Ornek: rutin kontrol, asi takibi, hastalik' : 'Example: routine checkup, vaccine follow-up, illness'}
                  </Text>
                  <View style={styles.chipsRow}>
                    {reasonOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        style={({ pressed }) => [
                          styles.chipBtn,
                          visitReason !== option.value ? styles.chipBtnInactive : null,
                          visitReason === option.value ? styles.chipBtnActive : null,
                          pressed ? styles.chipBtnPressed : null,
                        ]}
                        onPress={() => setVisitReason(option.value)}
                      >
                        <Text style={[styles.chipBtnText, visitReason === option.value ? styles.chipBtnTextActive : null]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{isTr ? 'Ziyaret Sonuçları' : 'Visit outcomes'}</Text>
                  <Text style={styles.modalHelperText}>
                    {isTr ? 'Bu ziyarette neler olduğunu seçin. Boş bırakılırsa genel kontrol olarak kaydedilir.' : 'Select what happened during this visit. If left empty, it is saved as a general checkup.'}
                  </Text>
                  <Text style={styles.modalLabel}>{isTr ? 'Bu ziyarette ne oldu?' : 'What happened during this visit?'}</Text>
                  <View style={styles.chipsRow}>
                    {actionOrder.map((type) => (
                      <Pressable
                        key={type}
                        style={({ pressed }) => [
                          styles.chipBtn,
                          !selectedActions[type] ? styles.chipBtnInactive : null,
                          selectedActions[type] ? styles.chipBtnActive : null,
                          pressed ? styles.chipBtnPressed : null,
                        ]}
                        onPress={() => toggleAction(type)}
                      >
                        <Text style={[styles.chipBtnText, selectedActions[type] ? styles.chipBtnTextActive : null]}>{actionLabels[type]}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{isTr ? 'Detaylar' : 'Details'}</Text>
                  <Text style={styles.modalHelperText}>
                    {isTr ? 'Serbest metin yerine secenek kullanin. Not alani opsiyoneldir.' : 'Prefer structured options over free text. Note is optional.'}
                  </Text>

                  <ScrollView style={styles.inlineFieldsWrap} showsVerticalScrollIndicator={false}>
                    {actionOrder.map((type) => (
                      selectedActions[type] ? (
                        <View key={type} style={styles.inlineFieldBlock}>
                          <Text style={styles.inlineFieldTitle}>{actionLabels[type]}</Text>
                          <View style={styles.chipsRow}>
                            {actionOptions[type].map((option) => (
                              <Pressable
                                key={`${type}-${option.value}`}
                                style={({ pressed }) => [
                                  styles.chipBtn,
                                  selectedActionOptions[type] !== option.value ? styles.chipBtnInactive : null,
                                  selectedActionOptions[type] === option.value ? styles.chipBtnActive : null,
                                  pressed ? styles.chipBtnPressed : null,
                                ]}
                                onPress={() => setSelectedActionOptions((prev) => ({ ...prev, [type]: option.value }))}
                              >
                                <Text style={[styles.chipBtnText, selectedActionOptions[type] === option.value ? styles.chipBtnTextActive : null]}>{option.label}</Text>
                              </Pressable>
                            ))}
                          </View>

                          {selectedActionOptions[type] === 'other' ? (
                            <TextInput
                              style={[styles.modalInput, focusedField === `${type}-title` ? styles.modalInputFocused : null]}
                              value={customActionTitles[type]}
                              onChangeText={(value) => setCustomActionTitles((prev) => ({ ...prev, [type]: value }))}
                              placeholder={isTr ? 'Kisa baslik yazin' : 'Write a short title'}
                              placeholderTextColor="#a4a4a4"
                              onFocus={() => setFocusedField(`${type}-title`)}
                              onBlur={() => setFocusedField(null)}
                            />
                          ) : null}

                          <TextInput
                            style={[styles.modalInput, styles.modalInputTall, focusedField === `${type}-note` ? styles.modalInputFocused : null]}
                            value={actionNotes[type]}
                            onChangeText={(value) => setActionNotes((prev) => ({ ...prev, [type]: value }))}
                            placeholder={isTr ? 'Opsiyonel not' : 'Optional note'}
                            placeholderTextColor="#a4a4a4"
                            multiline
                            onFocus={() => setFocusedField(`${type}-note`)}
                            onBlur={() => setFocusedField(null)}
                          />
                        </View>
                      ) : null
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{isTr ? 'Hatirlatma' : 'Reminder'}</Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{isTr ? 'Hatirlatma olustur' : 'Create reminder'}</Text>
                    <Switch
                      value={reminderEnabled}
                      onValueChange={setReminderEnabled}
                      thumbColor="#ffffff"
                      trackColor={{ false: '#d8d8d8', true: '#7f9a70' }}
                    />
                  </View>

                  {reminderEnabled ? (
                    <>
                      <Text style={styles.modalLabel}>{isTr ? 'Hatirlatma zamani' : 'Reminder timing'}</Text>
                      <View style={styles.chipsRow}>
                        {reminderPresetOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            style={({ pressed }) => [
                              styles.chipBtn,
                              reminderPreset !== option.value ? styles.chipBtnInactive : null,
                              reminderPreset === option.value ? styles.chipBtnActive : null,
                              pressed ? styles.chipBtnPressed : null,
                            ]}
                            onPress={() => setReminderPreset(option.value)}
                          >
                            <Text style={[styles.chipBtnText, reminderPreset === option.value ? styles.chipBtnTextActive : null]}>{option.label}</Text>
                          </Pressable>
                        ))}
                      </View>

                      {reminderPreset === 'custom' ? (
                        <>
                          <Text style={styles.modalLabel}>{isTr ? 'Ozel tarih (YYYY-AA-GG)' : 'Custom date (YYYY-MM-DD)'}</Text>
                          <TextInput
                            style={[styles.modalInput, focusedField === 'reminderDate' ? styles.modalInputFocused : null]}
                            value={reminderDate}
                            onChangeText={setReminderDate}
                            placeholder="2026-03-29"
                            placeholderTextColor="#a4a4a4"
                            autoCapitalize="none"
                            onFocus={() => setFocusedField('reminderDate')}
                            onBlur={() => setFocusedField(null)}
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </View>

                <Text style={styles.attachmentHint}>
                  {isTr ? 'Dosya ekleme (yakinda): Rapor / recete PDF' : 'Attachment (coming soon): report / prescription PDF'}
                </Text>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    setIsCreateVisible(false);
                    setEditingVisitId(null);
                    resetCreateForm();
                  }}
                >
                  <Text style={styles.modalSecondaryText}>{isTr ? 'Vazgec' : 'Cancel'}</Text>
                </Pressable>
                <Animated.View style={{ transform: [{ scale: savePressScale }] }}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalPrimaryBtn,
                      !isCreateFormValid ? styles.modalPrimaryBtnDisabled : null,
                      pressed && isCreateFormValid ? styles.modalPrimaryBtnPressed : null,
                    ]}
                    disabled={!isCreateFormValid}
                    onPress={handleSubmitCreate}
                    onPressIn={() => Animated.spring(savePressScale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
                    onPressOut={() => Animated.spring(savePressScale, { toValue: 1, useNativeDriver: true, speed: 36, bounciness: 5 }).start()}
                  >
                    <Text style={styles.modalPrimaryText}>{isTr ? 'Kaydet' : 'Save'}</Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── shell ──────────────────────────────────────────────────────────────────
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
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 60,
    gap: 16,
  },

  // ── header ─────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30332e',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.3,
  },
  headerPlaceholder: {
    width: 80,
  },
  addPill: {
    height: 38,
    borderRadius: 19,
    backgroundColor: '#47664a',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b5a3f',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e9ffe6',
  },

  // ── section headers ────────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#5d605a',
    textTransform: 'uppercase',
  },

  // ── completed visits list wrapper ────────────────────────────────────────
  completedList: {
    gap: 8,
  },

  // ── unified visit card ────────────────────────────────────────────────────
  visitCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#30332e',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  visitCardDateCol: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#f4f6f2',
    flexShrink: 0,
  },
  visitCardMon: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4a6e4e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  visitCardDay: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2e4230',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  visitCardYear: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9a9d93',
    letterSpacing: 0.2,
  },
  visitCardDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#edeee9',
    flexShrink: 0,
  },
  visitCardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 3,
  },
  visitCardClinic: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.1,
  },
  visitCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5d605a',
  },
  visitCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  visitCardPlannedBadge: {
    backgroundColor: '#d6e8d6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  visitCardPlannedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3a6040',
    letterSpacing: 0.2,
  },
  visitCardAmountPill: {
    backgroundColor: '#f0f4f0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visitCardAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#47664a',
  },
  visitCardDocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f2f2f0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visitCardDocText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5d605a',
  },
  visitCardEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#e8ede8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },

  viewDocumentsBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#edf5ea',
  },
  viewDocumentsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b5a3f',
  },

  // ── view all history button ────────────────────────────────────────────────
  viewAllHistoryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewAllHistoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#47664a',
  },

  // ── stats bento grid ───────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statGridCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#eeeee8',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 4,
  },
  statGridLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#5d605a',
    textTransform: 'uppercase',
  },
  statGridValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  statGridSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#797c75',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statGridSubGreen: {
    color: '#47664a',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#faf9f8',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 16,
  },
  modalKeyboardWrap: {
    flex: 1,
    width: '100%',
  },
  modalCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 12,
  },
  modalMainScroll: {
    maxHeight: 560,
  },
  modalSection: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  modalSectionTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 4,
  },
  modalHelperText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7f7f7f',
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#7a7a7a',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  modalLabelHint: {
    marginTop: -2,
    marginBottom: 6,
    fontSize: 11,
    lineHeight: 16,
    color: '#8b8b8b',
  },
  modalInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#2d2d2d',
  },
  modalInputFocused: {
    borderColor: '#9ab395',
    shadowColor: '#8ca486',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modalInputTall: {
    minHeight: 56,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
  },
  currencyToggle: {
    height: 42,
    minWidth: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#f6f4f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  currencyToggleText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#47664a',
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chipBtn: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnActive: {
    borderColor: '#7f9a70',
    backgroundColor: '#eef5ea',
  },
  chipBtnInactive: {
    opacity: 0.82,
  },
  chipBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipBtnText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5f5f5f',
    fontWeight: '600',
  },
  chipBtnTextActive: {
    color: '#4f6b43',
  },
  inlineFieldsWrap: {
    marginTop: 6,
    maxHeight: 240,
  },
  inlineFieldBlock: {
    marginBottom: 10,
    gap: 6,
  },
  inlineFieldTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#4d4d4d',
  },
  switchRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#4a4a4a',
  },
  attachmentHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#8d8d8d',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondaryBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  modalSecondaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5c5c5c',
    fontWeight: '600',
  },
  modalPrimaryBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d2d',
  },
  modalPrimaryBtnDisabled: {
    opacity: 0.55,
  },
  modalPrimaryBtnPressed: {
    opacity: 0.92,
  },
  modalPrimaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#faf8f5',
    fontWeight: '700',
  },
});
