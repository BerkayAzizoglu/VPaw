import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import AppleTopBar, { TopBarCircleButton } from '../components/AppleTopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReminderSubtype = 'vet_visit' | 'vaccine' | 'medication' | 'food' | 'litter' | 'walk' | 'custom';

export type ReminderSuggestion = {
  id: string;
  title: string;
  subtype: ReminderSubtype;
  source: 'medication' | 'vet_visit' | 'vaccine';
};

type DailyCareTemplate = {
  id: string;
  title: string;
  subtype: ReminderSubtype;
};

type ReminderItem = {
  id: string;
  title: string;
  date: string;
  dueDate?: string;
  petName?: string;
  petId?: string;
  subtype?: ReminderSubtype;
  status?: 'pending' | 'done' | 'snoozed';
};

type RemindersScreenProps = {
  title?: string;
  today: ReminderItem[];
  upcoming: ReminderItem[];
  overdue: ReminderItem[];
  completed?: ReminderItem[];
  activePetId?: string;
  activePetType?: 'Dog' | 'Cat';
  openCreateNonce?: number;
  subtypePreset?: ReminderSubtype;
  locale?: 'en' | 'tr';
  suggestions?: ReminderSuggestion[];
  onComplete?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onEdit?: (id: string, payload: { title: string; date: string; subtype: ReminderSubtype }) => void;
  onDeleteReminder?: (id: string) => void;
  onOpenNotifications?: () => void;
  onCreate?: (payload: {
    petId: string;
    subtype: ReminderSubtype;
    title: string;
    date: string;
    frequency?: 'once' | 'daily';
  }) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_SUBTYPES: ReminderSubtype[] = ['vaccine', 'vet_visit', 'medication', 'food', 'litter', 'walk', 'custom'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function subtypeLabel(subtype: ReminderSubtype, isTr: boolean) {
  if (subtype === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (subtype === 'vet_visit') return isTr ? 'Vet Ziyareti' : 'Vet Visit';
  if (subtype === 'medication') return isTr ? 'İlaç' : 'Medication';
  if (subtype === 'food') return isTr ? 'Mama' : 'Food';
  if (subtype === 'litter') return isTr ? 'Kum' : 'Litter';
  if (subtype === 'walk') return isTr ? 'Yürüyüş' : 'Walk';
  return isTr ? 'Özel' : 'Custom';
}

function subtypeAccent(subtype: ReminderSubtype | undefined): { bg: string; fg: string } {
  if (subtype === 'vaccine') return { bg: '#ddeaf5', fg: '#3a6080' };
  if (subtype === 'vet_visit') return { bg: '#edffe3', fg: '#3a6e45' };
  if (subtype === 'medication') return { bg: '#ede8f5', fg: '#5a4a7a' };
  if (subtype === 'food') return { bg: '#eef4eb', fg: '#4a6c44' };
  if (subtype === 'litter') return { bg: '#e3f5f2', fg: '#3a6a62' };
  if (subtype === 'walk') return { bg: '#f5ede3', fg: '#7a5a3a' };
  return { bg: '#eeeee8', fg: '#5d605a' };
}

function isValidDate(value: string) {
  return Number.isFinite(new Date(`${value}T12:00:00.000Z`).getTime());
}

function isMedicalSubtype(subtype: ReminderSubtype | undefined) {
  return subtype === 'vet_visit' || subtype === 'vaccine' || subtype === 'medication';
}

function relativeDateLabel(dueDate: string | undefined, isTr: boolean) {
  if (!dueDate) return { text: '—', color: '#9a9c95', bg: '#f0f0ea' };
  const ms = new Date(dueDate).getTime();
  if (!Number.isFinite(ms)) return { text: '—', color: '#9a9c95', bg: '#f0f0ea' };
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const targetStart = new Date(ms); targetStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays === 0) return { text: isTr ? 'Bugün' : 'Today', color: '#2d6a38', bg: '#e8f5ea' };
  if (diffDays === 1) return { text: isTr ? 'Yarın' : 'Tomorrow', color: '#3a6e45', bg: '#eef6ef' };
  if (diffDays > 1 && diffDays <= 6) return { text: isTr ? `${diffDays} gün sonra` : `In ${diffDays} days`, color: '#4a7a54', bg: '#f0f7f1' };
  if (diffDays === -1) return { text: isTr ? 'Dün gecikti' : 'Due yesterday', color: '#b84040', bg: '#fdeaea' };
  if (diffDays < -1) return { text: isTr ? `${Math.abs(diffDays)} gün gecikti` : `${Math.abs(diffDays)}d overdue`, color: '#b84040', bg: '#fdeaea' };
  const d = new Date(ms);
  const M_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const M_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return { text: `${d.getDate()} ${isTr ? (M_TR[d.getMonth()] ?? '') : (M_EN[d.getMonth()] ?? '')}`, color: '#5d605a', bg: '#f0f0ea' };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Icon({ kind, size = 18, color = '#5d605a' }: { kind: 'check' | 'clock' | 'add' | 'close' | 'chevronDown' | 'chevronRight'; size?: number; color?: string }) {
  if (kind === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 12.2L10.2 15.6L17.5 8.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'clock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8V12L14.8 13.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (kind === 'add') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'close') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 7L17 17M17 7L7 17" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      </Svg>
    );
  }
  if (kind === 'chevronDown') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  // chevronRight
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6L15 12L9 18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ReminderEmptyIcon() {
  return (
    <View style={styles.emptyIconShell}>
      <View style={styles.emptyIconGlow} />
      <Svg width={74} height={74} viewBox="0 0 74 74" fill="none">
        <Path
          d="M22 18.5C22 16.8431 23.3431 15.5 25 15.5H49C50.6569 15.5 52 16.8431 52 18.5V50.5C52 52.1569 50.6569 53.5 49 53.5H25C23.3431 53.5 22 52.1569 22 50.5V18.5Z"
          fill="#FFFFFF"
          stroke="#D8DDD4"
          strokeWidth={2}
        />
        <Path d="M22 25.5H52" stroke="#E4E8E1" strokeWidth={2} />
        <Path d="M29 12.5V20.5" stroke="#47664A" strokeWidth={3} strokeLinecap="round" />
        <Path d="M45 12.5V20.5" stroke="#47664A" strokeWidth={3} strokeLinecap="round" />
        <Path d="M29.5 33.5H36.5" stroke="#C5CEC1" strokeWidth={3} strokeLinecap="round" />
        <Path d="M29.5 41.5H43.5" stroke="#D6DDD2" strokeWidth={3} strokeLinecap="round" />
        <Path
          d="M48.5 37.5C48.5 34.4624 50.9624 32 54 32C57.0376 32 59.5 34.4624 59.5 37.5V40.5455C59.5 41.6346 59.8192 42.6998 60.4181 43.6095L61.0399 44.5542C61.4418 45.1648 61.0037 46 60.2727 46H47.7273C46.9963 46 46.5582 45.1648 46.9601 44.5542L47.5819 43.6095C48.1808 42.6998 48.5 41.6346 48.5 40.5455V37.5Z"
          fill="#47664A"
        />
        <Path d="M52 48.3C52.2405 49.2865 53.05 50 54 50C54.95 50 55.7595 49.2865 56 48.3" stroke="#47664A" strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// ─── Reminder Row ─────────────────────────────────────────────────────────────

function ReminderRow({
  item,
  isOverdue,
  isHistory,
  isTr,
  onComplete,
  onSnooze,
  onEdit,
  onDelete,
}: {
  item: ReminderItem;
  isOverdue: boolean;
  isHistory: boolean;
  isTr: boolean;
  onComplete?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = subtypeAccent(item.subtype);
  const rel = relativeDateLabel(item.dueDate, isTr);

  const handleComplete = () => {
    if (completing) return;
    setCompleting(true);
    timerRef.current = setTimeout(() => { onComplete?.(item.id); }, 700);
  };

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <View style={[styles.reminderCard, isOverdue && styles.reminderCardOverdue]}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: completing ? '#47664a' : isOverdue ? '#c05050' : accent.fg }]} />

      <View style={styles.cardContent}>
        {/* Main row */}
        <View style={styles.cardMainRow}>
          {/* Checkbox */}
          {!isHistory ? (
            <Pressable
              style={[styles.checkCircle, { borderColor: completing ? '#47664a' : accent.fg }, completing && styles.checkCircleDone]}
              onPress={handleComplete}
              hitSlop={10}
            >
              {completing ? <Icon kind="check" size={13} color="#fff" /> : null}
            </Pressable>
          ) : (
            <View style={[styles.checkCircle, styles.checkCircleDone, { borderColor: '#9a9c95' }]}>
              <Icon kind="check" size={13} color="#fff" />
            </View>
          )}

          {/* Title + meta */}
          <View style={styles.cardTitleArea}>
            <Text
              style={[styles.cardTitle, (isHistory || completing) && styles.cardTitleDone]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {completing ? (
              <Text style={styles.completingText}>{isTr ? 'Tamamlanıyor…' : 'Marking done…'}</Text>
            ) : (
              <View style={styles.cardMetaRow}>
                {/* Relative date badge */}
                <View style={[styles.dateBadge, { backgroundColor: rel.bg }]}>
                  <Text style={[styles.dateBadgeText, { color: rel.color }]}>{rel.text}</Text>
                </View>
                {/* Subtype tag */}
                {item.subtype && item.subtype !== 'custom' ? (
                  <Text style={styles.subtypeTag}>{subtypeLabel(item.subtype, isTr)}</Text>
                ) : null}
                {/* Pet name */}
                {item.petName ? (
                  <Text style={styles.petTag} numberOfLines={1}>{item.petName}</Text>
                ) : null}
              </View>
            )}
          </View>
        </View>

        {/* Action row */}
        {!isHistory && !completing && (
          <View style={styles.cardActionsRow}>
            {onSnooze ? (
              <Pressable style={styles.cardActionBtn} onPress={() => onSnooze(item.id)}>
                <Text style={styles.cardActionText}>{isTr ? 'Ertele' : 'Snooze'}</Text>
              </Pressable>
            ) : null}
            {onEdit ? (
              <Pressable style={styles.cardActionBtn} onPress={() => onEdit(item.id)}>
                <Text style={styles.cardActionText}>{isTr ? 'Düzenle' : 'Edit'}</Text>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }} />
            {confirmDelete ? (
              <View style={styles.deleteConfirmRow}>
                <Pressable style={styles.deleteConfirmBtn} onPress={() => { onDelete?.(item.id); setConfirmDelete(false); }}>
                  <Text style={styles.deleteConfirmText}>{isTr ? 'Sil' : 'Delete'}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirmDelete(false)} hitSlop={8}>
                  <Icon kind="close" size={14} color="#b1b3ab" />
                </Pressable>
              </View>
            ) : onDelete ? (
              <Pressable onPress={() => setConfirmDelete(true)} hitSlop={10} style={styles.deleteTrigger}>
                <Icon kind="close" size={13} color="#c8cac4" />
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Reminder Section ─────────────────────────────────────────────────────────

function ReminderSection({
  label,
  items,
  isOverdue = false,
  isHistory = false,
  isTr,
  onComplete,
  onSnooze,
  onEdit,
  onDelete,
}: {
  label: string;
  items: ReminderItem[];
  isOverdue?: boolean;
  isHistory?: boolean;
  isTr: boolean;
  onComplete?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      {label ? <Text style={styles.sectionLabel}>{label}</Text> : null}
      <View style={styles.sectionCards}>
        {items.map((item) => (
          <ReminderRow
            key={item.id}
            item={item}
            isOverdue={isOverdue}
            isHistory={isHistory}
            isTr={isTr}
            onComplete={onComplete}
            onSnooze={onSnooze}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </View>
    </View>
  );
}

function ReminderSectionEmpty({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyCardCompact}>
      <ReminderEmptyIcon />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RemindersScreen({
  today,
  upcoming,
  overdue,
  completed = [],
  activePetId = '',
  activePetType = 'Dog',
  openCreateNonce,
  subtypePreset,
  locale = 'en',
  suggestions = [],
  onComplete,
  onSnooze,
  onEdit,
  onDeleteReminder,
  onOpenNotifications,
  onCreate,
}: RemindersScreenProps) {
  const isTr = locale === 'tr';

  // ── state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [subtype, setSubtype] = useState<ReminderSubtype>('custom');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryFrequency, setEntryFrequency] = useState<'once' | 'daily'>('once');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'title' | 'date' | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [group, setGroup] = useState<'medical' | 'care'>('medical');

  // ── edit modal state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editSubtype, setEditSubtype] = useState<ReminderSubtype>('custom');
  const [editError, setEditError] = useState('');
  const [editFocused, setEditFocused] = useState<'title' | 'date' | null>(null);
  const saveScale = useMemo(() => new Animated.Value(1), []);

  const subtypeOptions = useMemo(
    () => (activePetType === 'Cat' ? BASE_SUBTYPES.filter((s) => s !== 'walk') : BASE_SUBTYPES),
    [activePetType],
  );

  const isFullyEmpty = today.length === 0 && upcoming.length === 0 && overdue.length === 0;
  const filteredToday = useMemo(
    () => today.filter((item) => (group === 'medical' ? isMedicalSubtype(item.subtype) : !isMedicalSubtype(item.subtype))),
    [group, today],
  );
  const filteredUpcoming = useMemo(
    () => upcoming.filter((item) => (group === 'medical' ? isMedicalSubtype(item.subtype) : !isMedicalSubtype(item.subtype))),
    [group, upcoming],
  );
  const filteredOverdue = useMemo(
    () => overdue.filter((item) => (group === 'medical' ? isMedicalSubtype(item.subtype) : !isMedicalSubtype(item.subtype))),
    [group, overdue],
  );
  const filteredCompleted = useMemo(
    () => completed.filter((item) => (group === 'medical' ? isMedicalSubtype(item.subtype) : !isMedicalSubtype(item.subtype))),
    [completed, group],
  );
  const medicalToday = useMemo(() => today.filter((item) => isMedicalSubtype(item.subtype)), [today]);
  const medicalUpcoming = useMemo(() => upcoming.filter((item) => isMedicalSubtype(item.subtype)), [upcoming]);
  const medicalOverdue = useMemo(() => overdue.filter((item) => isMedicalSubtype(item.subtype)), [overdue]);
  const careToday = useMemo(() => today.filter((item) => !isMedicalSubtype(item.subtype)), [today]);
  const careUpcoming = useMemo(() => upcoming.filter((item) => !isMedicalSubtype(item.subtype)), [upcoming]);
  const careOverdue = useMemo(() => overdue.filter((item) => !isMedicalSubtype(item.subtype)), [overdue]);
  const hasMedicalItems = medicalToday.length > 0 || medicalUpcoming.length > 0 || medicalOverdue.length > 0;
  const hasCareItems = careToday.length > 0 || careUpcoming.length > 0 || careOverdue.length > 0;

  // ── daily care templates ──
  const dailyCareTemplates: DailyCareTemplate[] = activePetType === 'Cat'
    ? [
        { id: 'tpl-food', title: isTr ? 'Mama' : 'Food', subtype: 'food' },
        { id: 'tpl-litter', title: isTr ? 'Kum Temizliği' : 'Litter Box', subtype: 'litter' },
      ]
    : [
        { id: 'tpl-food', title: isTr ? 'Mama' : 'Food', subtype: 'food' },
        { id: 'tpl-walk', title: isTr ? 'Yürüyüş' : 'Walk', subtype: 'walk' },
      ];

  // ── create ──
  const selectPreset = (id: string, title: string, st: ReminderSubtype, freq: 'once' | 'daily' = 'once') => {
    setSelectedPresetId(id);
    setEntryTitle(title ?? '');
    setSubtype(st);
    setEntryFrequency(freq);
    setError('');
  };

  const openCreate = (preset?: { id: string; title: string; subtype: ReminderSubtype; freq: 'once' | 'daily' }) => {
    setEntryDate(new Date().toISOString().slice(0, 10));
    setError('');
    if (preset) {
      setEntryTitle(preset.title ?? '');
      setSubtype(preset.subtype);
      setSelectedPresetId(preset.id);
      setEntryFrequency(preset.freq);
    } else {
      setEntryTitle('');
      setSubtype('custom');
      setSelectedPresetId(null);
      setEntryFrequency('once');
    }
    setCreateOpen(true);
  };

  useEffect(() => {
    if (!openCreateNonce) return;
    openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateNonce]);

  const safeEntryTitle = entryTitle ?? '';
  const isFormValid = safeEntryTitle.trim().length > 0 && isValidDate(entryDate);

  const submitCreate = () => {
    if (!safeEntryTitle.trim()) { setError(isTr ? 'Başlık girin.' : 'Please enter a title.'); return; }
    if (!isValidDate(entryDate)) { setError(isTr ? 'Geçerli tarih girin (YYYY-AA-GG).' : 'Enter a valid date (YYYY-MM-DD).'); return; }
    onCreate?.({ petId: activePetId, subtype, title: safeEntryTitle.trim(), date: entryDate, frequency: entryFrequency });
    setCreateOpen(false);
  };

  // ── edit ──
  const allItems = useMemo(() => [...today, ...upcoming, ...overdue, ...completed], [today, upcoming, overdue, completed]);

  const openEdit = (id: string) => {
    const item = allItems.find((r) => r.id === id);
    if (!item) return;
    setEditId(id);
    setEditTitle(item.title ?? '');
    setEditDate(item.dueDate?.slice(0, 10) ?? item.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setEditSubtype((item.subtype ?? 'custom') as ReminderSubtype);
    setEditError('');
    setEditOpen(true);
  };

  const safeEditTitle = editTitle ?? '';
  const isEditValid = safeEditTitle.trim().length > 0 && isValidDate(editDate);

  const submitEdit = () => {
    if (!safeEditTitle.trim()) { setEditError(isTr ? 'Başlık girin.' : 'Please enter a title.'); return; }
    if (!isValidDate(editDate)) { setEditError(isTr ? 'Geçerli tarih girin (YYYY-AA-GG).' : 'Enter a valid date (YYYY-MM-DD).'); return; }
    onEdit?.(editId, { title: safeEditTitle.trim(), date: editDate, subtype: editSubtype });
    setEditOpen(false);
  };

  // ── stats ──
  const totalActive = today.length + upcoming.length + overdue.length;
  const overdueCount = overdue.length;

  return (
    <View style={styles.screen}>
      <AppleTopBar
        title={isTr ? 'Hatirlatmalar' : 'Reminders'}
        backgroundColor="rgba(246, 244, 240, 0.66)"
        rightSlot={
          <View style={styles.topBarActions}>
            {onOpenNotifications ? (
              <TopBarCircleButton onPress={onOpenNotifications}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#5d605a" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="#5d605a" strokeWidth={1.9} strokeLinecap="round" />
                </Svg>
                {overdue.length > 0 ? <View style={styles.topBarDot} /> : null}
              </TopBarCircleButton>
            ) : null}
            <TopBarCircleButton onPress={() => openCreate()}>
              <Icon kind="add" size={17} color="#4f655f" />
            </TopBarCircleButton>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>{isTr ? 'PLANLAMA' : 'PLANNING'}</Text>
            <Text style={styles.headerTitle}>{isTr ? 'Hatırlatmalar' : 'Reminders'}</Text>
          </View>
          <View style={styles.headerActions}>
            {onOpenNotifications ? (
              <Pressable style={styles.notifBtn} onPress={onOpenNotifications} hitSlop={8}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#5d605a" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="#5d605a" strokeWidth={1.9} strokeLinecap="round" />
                </Svg>
                {overdue.length > 0 ? (
                  <View style={styles.notifDot} />
                ) : null}
              </Pressable>
            ) : null}
            <Pressable style={styles.addPill} onPress={() => openCreate()}>
              <Icon kind="add" size={16} color="#fff" />
              <Text style={styles.addPillText}>{isTr ? 'Ekle' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Stats row (always visible when any data exists) ── */}
        <View style={styles.heroIntro}>
          <Text style={styles.heroLabel}>{isTr ? 'PLANLAMA' : 'PLANNING'}</Text>
          <Text style={styles.heroTitle}>{isTr ? 'Hatirlatmalar' : 'Reminders'}</Text>
          <Text style={styles.heroText}>
            {isTr
              ? 'Gunluk bakim ve tibbi takibi ayni sakin akis icinde yonet.'
              : 'Manage daily care and medical follow-ups in one calm flow.'}
          </Text>
        </View>

        {(totalActive > 0 || completed.length > 0) && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalActive}</Text>
              <Text style={styles.statLabel}>{isTr ? 'AKTİF' : 'ACTIVE'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, overdueCount > 0 && styles.statValueDanger]}>{overdueCount}</Text>
              <Text style={styles.statLabel}>{isTr ? 'GECİKMİŞ' : 'OVERDUE'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completed.length}</Text>
              <Text style={styles.statLabel}>{isTr ? 'TAMAMLANAN' : 'COMPLETED'}</Text>
            </View>
          </View>
        )}

        <View>

          {/* ── Suggestions strip ── */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsLabel}>
                {isTr ? 'AKTİF KAYITLARDAN ÖNERİLER' : 'SUGGESTED FROM RECORDS'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {suggestions.map((s) => {
                  const accent = subtypeAccent(s.subtype);
                  return (
                    <Pressable
                      key={s.id}
                      style={styles.suggestionCard}
                      onPress={() => openCreate({ id: s.id, title: s.title, subtype: s.subtype, freq: 'once' })}
                    >
                      <View style={[styles.suggestionAccent, { backgroundColor: accent.fg }]} />
                      <View style={styles.suggestionBody}>
                        <Text style={styles.suggestionTitle} numberOfLines={2}>{s.title}</Text>
                        <Text style={styles.suggestionSub}>{subtypeLabel(s.subtype, isTr)}</Text>
                      </View>
                      <View style={styles.suggestionArrow}>
                        <Icon kind="add" size={14} color={accent.fg} />
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Group tabs ── */}
          <View style={styles.groupRow}>
            <Pressable
              style={[styles.groupChip, group === 'medical' && styles.groupChipActive]}
              onPress={() => setGroup('medical')}
            >
              <Text style={[styles.groupChipText, group === 'medical' && styles.groupChipTextActive]}>
                {isTr ? 'Tıbbi Takip' : 'Medical'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.groupChip, group === 'care' && styles.groupChipActive]}
              onPress={() => setGroup('care')}
            >
              <Text style={[styles.groupChipText, group === 'care' && styles.groupChipTextActive]}>
                {isTr ? 'Günlük Bakım' : 'Daily Care'}
              </Text>
            </Pressable>
          </View>

          {/* ── Empty state ── */}
          {isFullyEmpty && (
            <View style={styles.emptyCard}>
              <ReminderEmptyIcon />
              <Text style={styles.emptyTitle}>{isTr ? 'Hatırlatma yok' : 'No reminders yet'}</Text>
              <Text style={styles.emptyBody}>
                {isTr
                  ? 'İlk hatırlatmanı ekle ve takipte kal.'
                  : 'Create your first reminder to stay on track.'}
              </Text>
              <Pressable style={styles.emptyCta} onPress={() => openCreate()}>
                <Text style={styles.emptyCtaText}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>
              </Pressable>
            </View>
          )}

          {/* ── Overdue ── */}
          <ReminderSection
            label={isTr ? 'GECİKMİŞ' : 'OVERDUE'}
            items={filteredOverdue}
            isOverdue
            isTr={isTr}
            onComplete={onComplete}
            onSnooze={onSnooze}
            onEdit={openEdit}
            onDelete={onDeleteReminder}
          />

          {/* ── Today ── */}
          <ReminderSection
            label={isTr ? 'BUGÜN' : 'TODAY'}
            items={filteredToday}
            isTr={isTr}
            onComplete={onComplete}
            onSnooze={onSnooze}
            onEdit={openEdit}
            onDelete={onDeleteReminder}
          />

          {/* ── Upcoming ── */}
          <ReminderSection
            label={isTr ? 'YAKLAŞAN' : 'UPCOMING'}
            items={filteredUpcoming}
            isTr={isTr}
            onComplete={onComplete}
            onSnooze={onSnooze}
            onEdit={openEdit}
            onDelete={onDeleteReminder}
          />

          {/* ── Completed toggle ── */}
          {filteredCompleted.length > 0 && (
            <Pressable
              style={styles.completedToggle}
              onPress={() => setShowCompleted((v) => !v)}
            >
              <Text style={styles.completedToggleText}>
                {isTr ? `Geçmiş (${filteredCompleted.length})` : `History (${filteredCompleted.length})`}
              </Text>
              <Icon kind={showCompleted ? 'chevronDown' : 'chevronRight'} size={15} color="#5d605a" />
            </Pressable>
          )}
          {showCompleted && (
            <ReminderSection
              label=""
              items={filteredCompleted}
              isHistory
              isTr={isTr}
              onDelete={onDeleteReminder}
            />
          )}

        </View>
      </ScrollView>

      {/* ── Create Modal ── */}
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setCreateOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.createScroll} keyboardShouldPersistTaps="handled">

              {/* ── Suggestions ── */}
              {suggestions.length > 0 && (
                <View style={styles.createSection}>
                  <Text style={styles.createSectionLabel}>{isTr ? 'AKTİF KAYITLARDAN ÖNERİLER' : 'SUGGESTIONS FROM RECORDS'}</Text>
                  {suggestions.map((s) => {
                    const accent = subtypeAccent(s.subtype);
                    const isSelected = selectedPresetId === s.id;
                    return (
                      <Pressable
                        key={s.id}
                        style={[styles.presetRow, isSelected && { borderColor: accent.fg, backgroundColor: accent.bg }]}
                        onPress={() => selectPreset(s.id, s.title, s.subtype, 'once')}
                      >
                        <View style={[styles.presetDot, { backgroundColor: accent.fg }]} />
                        <View style={styles.presetBody}>
                          <Text style={[styles.presetTitle, isSelected && { color: accent.fg }]} numberOfLines={1}>{s.title}</Text>
                          <Text style={styles.presetSub}>{subtypeLabel(s.subtype, isTr)}</Text>
                        </View>
                        {isSelected ? <Icon kind="check" size={16} color={accent.fg} /> : <Icon kind="chevronRight" size={16} color="#b1b3ab" />}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* ── Daily Care ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>{isTr ? 'GÜNLÜK BAKIM' : 'DAILY CARE'}</Text>
                <View style={styles.dailyCareRow}>
                  {dailyCareTemplates.map((t) => {
                    const accent = subtypeAccent(t.subtype);
                    const isSelected = selectedPresetId === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        style={[styles.dailyCareChip, isSelected && { backgroundColor: accent.bg, borderColor: accent.fg }]}
                        onPress={() => selectPreset(t.id, t.title, t.subtype, 'daily')}
                      >
                        <View style={[styles.subtypeDot, { backgroundColor: isSelected ? accent.fg : '#b1b3ab' }]} />
                        <Text style={[styles.dailyCareChipText, isSelected && { color: accent.fg }]}>{t.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {selectedPresetId && dailyCareTemplates.some((t) => t.id === selectedPresetId) && (
                  <View style={styles.freqBadge}>
                    <Text style={styles.freqBadgeText}>{isTr ? '📅 Her gün tekrar eder' : '📅 Repeats daily'}</Text>
                  </View>
                )}
              </View>

              {/* ── Custom ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>{isTr ? 'ÖZEL' : 'CUSTOM'}</Text>
                <TextInput
                  style={[styles.modalInput, focusedField === 'title' && styles.modalInputFocused]}
                  placeholder={isTr ? 'Başlık yaz...' : 'Write a title...'}
                  placeholderTextColor="#b1b3ab"
                  value={safeEntryTitle}
                  onChangeText={(v) => {
                    setEntryTitle(v ?? '');
                    if ((v ?? '').trim()) { setSelectedPresetId(null); setSubtype('custom'); setEntryFrequency('once'); }
                    setError('');
                  }}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* ── Date ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>{isTr ? 'TARİH (YYYY-AA-GG)' : 'DATE (YYYY-MM-DD)'}</Text>
                <TextInput
                  style={[styles.modalInput, focusedField === 'date' && styles.modalInputFocused]}
                  placeholder="2026-04-15"
                  placeholderTextColor="#b1b3ab"
                  value={entryDate}
                  onChangeText={(v) => { setEntryDate(v); setError(''); }}
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  onFocus={() => setFocusedField('date')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {error ? <Text style={styles.modalError}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.modalCancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Animated.View style={[styles.modalSaveWrap, { transform: [{ scale: saveScale }] }]}>
                <Pressable
                  style={[styles.modalSaveBtn, !isFormValid && styles.modalSaveBtnDisabled]}
                  disabled={!isFormValid}
                  onPress={submitCreate}
                  onPressIn={() => Animated.spring(saveScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
                  onPressOut={() => Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, speed: 36, bounciness: 5 }).start()}
                >
                  <Text style={styles.modalSaveText}>{isTr ? 'Kaydet' : 'Save'}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setEditOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{isTr ? 'Hatırlatmayı Düzenle' : 'Edit Reminder'}</Text>

            {/* subtype chips */}
            <Text style={styles.modalFieldLabel}>{isTr ? 'Tür' : 'Type'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subtypeScroll}>
              {subtypeOptions.map((item) => {
                const accent = subtypeAccent(item);
                const isActive = editSubtype === item;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.subtypeChip,
                      isActive
                        ? { backgroundColor: accent.bg, borderColor: accent.fg }
                        : styles.subtypeChipInactive,
                    ]}
                    onPress={() => setEditSubtype(item)}
                  >
                    <View style={[styles.subtypeDot, { backgroundColor: isActive ? accent.fg : '#b1b3ab' }]} />
                    <Text style={[styles.subtypeChipText, isActive && { color: accent.fg }]}>
                      {subtypeLabel(item, isTr)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* title */}
            <Text style={styles.modalFieldLabel}>{isTr ? 'Başlık' : 'Title'}</Text>
            <TextInput
              style={[styles.modalInput, editFocused === 'title' && styles.modalInputFocused]}
              placeholder={isTr ? 'Hatırlatma başlığı' : 'Reminder title'}
              placeholderTextColor="#b1b3ab"
              value={safeEditTitle}
              onChangeText={(v) => { setEditTitle(v); setEditError(''); }}
              onFocus={() => setEditFocused('title')}
              onBlur={() => setEditFocused(null)}
            />

            {/* date */}
            <Text style={styles.modalFieldLabel}>{isTr ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
            <TextInput
              style={[styles.modalInput, editFocused === 'date' && styles.modalInputFocused]}
              placeholder="2026-04-15"
              placeholderTextColor="#b1b3ab"
              value={editDate}
              onChangeText={(v) => { setEditDate(v); setEditError(''); }}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              onFocus={() => setEditFocused('date')}
              onBlur={() => setEditFocused(null)}
            />

            {editError ? <Text style={styles.modalError}>{editError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setEditOpen(false)}>
                <Text style={styles.modalCancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveBtn, !isEditValid && styles.modalSaveBtnDisabled]}
                disabled={!isEditValid}
                onPress={submitEdit}
              >
                <Text style={styles.modalSaveText}>{isTr ? 'Kaydet' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingTop: 110,
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 0,
  },

  // ── Header ──
  header: {
    display: 'none',
  },
  heroIntro: {
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#5d605a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  heroText: {
    marginTop: 6,
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 21,
    color: '#6d726d',
    fontWeight: '500',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#c05050',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#5d605a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 38, height: 38,
    backgroundColor: '#fff',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7, right: 7,
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#c05050',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  addPill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#47664a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#47664a',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.5,
  },
  statValueDanger: {
    color: '#c96a6a',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5d605a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#eeeee8',
    alignSelf: 'center',
  },

  // ── Group tabs ──
  // ── Suggestions strip ──
  suggestionsSection: {
    marginBottom: 20,
  },
  suggestionsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9a9d97',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  suggestionsScroll: {
    gap: 10,
    paddingRight: 4,
  },
  suggestionCard: {
    width: 164,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  suggestionAccent: {
    width: 4,
  },
  suggestionBody: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 12,
    gap: 4,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1c1c1e',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  suggestionSub: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '500',
  },
  suggestionArrow: {
    paddingRight: 10,
    paddingTop: 10,
  },

  groupRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  groupChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e4e4dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupChipActive: {
    backgroundColor: '#47664a',
    borderColor: '#47664a',
  },
  groupChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d605a',
  },
  groupChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyCardCompact: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    width: '86%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyIconShell: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: '#f3f5ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    position: 'relative',
    overflow: 'visible',
  },
  emptyIconGlow: {
    position: 'absolute',
    inset: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(71,102,74,0.08)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#30332e',
  },
  emptyBody: {
    fontSize: 14,
    color: '#5d605a',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 6,
    height: 40,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Section ──
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#5d605a',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  // ── Row ──
  sectionCards: {
    gap: 8,
  },
  reminderCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reminderCardOverdue: {
    borderColor: 'rgba(184,64,64,0.18)',
    backgroundColor: '#fffafa',
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 10,
    gap: 10,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkCircleDone: {
    backgroundColor: '#47664a',
    borderColor: '#47664a',
  },
  cardTitleArea: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  cardTitleDone: {
    color: '#9a9c95',
    textDecorationLine: 'line-through',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  subtypeTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8e8e93',
  },
  petTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8e8e93',
    flexShrink: 1,
  },
  completingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#47664a',
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionBtn: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f2f2f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5d605a',
  },
  // kept for compatibility
  doneBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eef6ef',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d4e8d6',
  },
  deleteTrigger: {
    padding: 4,
  },
  overduePill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#fdf0f0',
    borderWidth: 1,
    borderColor: '#f5dede',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overduePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c96a6a',
  },
  historyBadge: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5d605a',
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  deleteConfirmBtn: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#fdf0f0',
    borderWidth: 1,
    borderColor: '#f5dede',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c96a6a',
  },

  // ── Completed toggle ──
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  completedToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d605a',
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e4e4dc',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  createScroll: {
    maxHeight: 440,
  },
  createSection: {
    marginBottom: 16,
  },
  createSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9a9d97',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    marginBottom: 6,
    gap: 10,
  },
  presetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presetBody: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#30332e',
  },
  presetSub: {
    fontSize: 11,
    color: '#8a8d87',
    fontWeight: '500',
  },
  dailyCareRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dailyCareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f2',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  dailyCareChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d605a',
  },
  freqBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#eef4eb',
    alignSelf: 'flex-start',
  },
  freqBadgeText: {
    fontSize: 12,
    color: '#4a6c44',
    fontWeight: '500',
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5d605a',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtypeScroll: {
    gap: 8,
    paddingBottom: 18,
  },
  subtypeChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  subtypeChipInactive: {
    backgroundColor: '#f6f4f0',
    borderColor: '#e4e4dc',
  },
  subtypeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subtypeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d605a',
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e4e4dc',
    backgroundColor: '#f9f8f6',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#30332e',
    marginBottom: 14,
  },
  modalInputFocused: {
    borderColor: '#47664a',
    backgroundColor: '#fff',
  },
  modalError: {
    fontSize: 13,
    color: '#c96a6a',
    fontWeight: '500',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e4e4dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5d605a',
  },
  modalSaveWrap: {
    flex: 2,
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#47664a',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalSaveBtnDisabled: {
    backgroundColor: '#b1b3ab',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
