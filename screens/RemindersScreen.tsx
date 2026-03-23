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

// ─── Types ────────────────────────────────────────────────────────────────────

type ReminderSubtype = 'vet_visit' | 'vaccine' | 'medication' | 'food' | 'litter' | 'walk' | 'custom';
type ReminderGroup = 'medical' | 'care';

type ReminderItem = {
  id: string;
  title: string;
  date: string;
  petName?: string;
  petId?: string;
  subtype?: ReminderSubtype;
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
  onComplete?: (id: string) => void;
  onDeleteReminder?: (id: string) => void;
  onCreate?: (payload: {
    petId: string;
    subtype: ReminderSubtype;
    title: string;
    date: string;
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

function buildRowSub(item: ReminderItem, isTr: boolean) {
  const parts: string[] = [];
  if (item.petName) parts.push(item.petName);
  if (item.subtype) parts.push(subtypeLabel(item.subtype, isTr));
  return parts.join(' · ');
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

// ─── Reminder Row ─────────────────────────────────────────────────────────────

function ReminderRow({
  item,
  isLast,
  isOverdue,
  isHistory,
  isTr,
  onComplete,
  onDelete,
}: {
  item: ReminderItem;
  isLast: boolean;
  isOverdue: boolean;
  isHistory: boolean;
  isTr: boolean;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accent = subtypeAccent(item.subtype);
  const sub = buildRowSub(item, isTr);

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      {/* subtype icon box */}
      <View style={[styles.rowIconBox, { backgroundColor: accent.bg }]}>
        <Icon kind={isOverdue ? 'clock' : 'check'} size={16} color={accent.fg} />
      </View>

      {/* body */}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, isHistory && styles.rowTitleHistory]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.rowMetaRow}>
          <Text style={styles.rowDate}>{item.date}</Text>
          {sub ? (
            <>
              <View style={styles.rowMetaDot} />
              <Text style={styles.rowSub}>{sub}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* right action */}
      {isHistory ? (
        <View style={styles.historyBadge}>
          <Text style={styles.historyBadgeText}>{isTr ? 'Tamam' : 'Done'}</Text>
        </View>
      ) : confirmDelete ? (
        <View style={styles.deleteConfirmRow}>
          <Pressable style={styles.deleteConfirmBtn} onPress={() => { onDelete?.(item.id); setConfirmDelete(false); }}>
            <Text style={styles.deleteConfirmText}>{isTr ? 'Sil' : 'Delete'}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirmDelete(false)}>
            <Icon kind="close" size={16} color="#b1b3ab" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.rowActions}>
          {isOverdue ? (
            <View style={styles.overduePill}>
              <Text style={styles.overduePillText}>{isTr ? 'Gecikmiş' : 'Overdue'}</Text>
            </View>
          ) : (
            <Pressable
              style={styles.doneBtn}
              onPress={() => onComplete?.(item.id)}
              hitSlop={8}
            >
              <Icon kind="check" size={15} color="#47664a" />
            </Pressable>
          )}
          {onDelete ? (
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={10} style={styles.deleteTrigger}>
              <Icon kind="close" size={13} color="#b1b3ab" />
            </Pressable>
          ) : null}
        </View>
      )}
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
  onDelete,
}: {
  label: string;
  items: ReminderItem[];
  isOverdue?: boolean;
  isHistory?: boolean;
  isTr: boolean;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>
        {items.map((item, idx) => (
          <ReminderRow
            key={item.id}
            item={item}
            isLast={idx === items.length - 1}
            isOverdue={isOverdue}
            isHistory={isHistory}
            isTr={isTr}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
      </View>
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
  onComplete,
  onDeleteReminder,
  onCreate,
}: RemindersScreenProps) {
  const isTr = locale === 'tr';

  // ── state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [subtype, setSubtype] = useState<ReminderSubtype>(activePetType === 'Dog' ? 'walk' : 'food');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'title' | 'date' | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [group, setGroup] = useState<ReminderGroup>('medical');
  const saveScale = useMemo(() => new Animated.Value(1), []);

  // ── entrance animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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

  // ── create ──
  const openCreate = () => {
    const preferred = subtypePreset ?? (activePetType === 'Dog' ? 'walk' : 'food');
    const safePreferred = subtypeOptions.includes(preferred) ? preferred : subtypeOptions[0];
    setSubtype(safePreferred);
    setEntryTitle('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setError('');
    setCreateOpen(true);
  };

  useEffect(() => {
    if (!openCreateNonce) return;
    openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateNonce]);

  const isFormValid =
    entryTitle.trim().length > 0 &&
    isValidDate(entryDate) &&
    subtypeOptions.includes(subtype) &&
    !(activePetType === 'Cat' && subtype === 'walk');

  const submitCreate = () => {
    if (!entryTitle.trim()) { setError(isTr ? 'Başlık girin.' : 'Please enter a title.'); return; }
    if (!isValidDate(entryDate)) { setError(isTr ? 'Geçerli tarih girin (YYYY-AA-GG).' : 'Enter a valid date (YYYY-MM-DD).'); return; }
    if (!subtypeOptions.includes(subtype)) { setError(isTr ? 'Geçerli tür seçin.' : 'Select a valid type.'); return; }
    onCreate?.({ petId: activePetId, subtype, title: entryTitle.trim(), date: entryDate });
    setCreateOpen(false);
  };

  // ── stats ──
  const totalActive = today.length + upcoming.length + overdue.length;
  const overdueCount = overdue.length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View>
            <Text style={styles.headerLabel}>{isTr ? 'PLANLAMA' : 'PLANNING'}</Text>
            <Text style={styles.headerTitle}>{isTr ? 'Hatırlatmalar' : 'Reminders'}</Text>
          </View>
          <Pressable style={styles.addPill} onPress={openCreate}>
            <Icon kind="add" size={15} color="#fff" />
            <Text style={styles.addPillText}>{isTr ? 'Ekle' : 'Add'}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Stats row ── */}
          {!isFullyEmpty && (
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
              <Text style={styles.emptyTitle}>{isTr ? 'Hatırlatma yok' : 'No reminders yet'}</Text>
              <Text style={styles.emptyBody}>
                {isTr
                  ? 'İlk hatırlatmanı ekle ve takipte kal.'
                  : 'Create your first reminder to stay on track.'}
              </Text>
              <Pressable style={styles.emptyCta} onPress={openCreate}>
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
            onDelete={onDeleteReminder}
          />

          {/* ── Today ── */}
          <ReminderSection
            label={isTr ? 'BUGÜN' : 'TODAY'}
            items={filteredToday}
            isTr={isTr}
            onComplete={onComplete}
            onDelete={onDeleteReminder}
          />

          {/* ── Upcoming ── */}
          <ReminderSection
            label={isTr ? 'YAKLAŞAN' : 'UPCOMING'}
            items={filteredUpcoming}
            isTr={isTr}
            onComplete={onComplete}
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

        </Animated.View>
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
            {/* handle */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>

            {/* subtype chips */}
            <Text style={styles.modalFieldLabel}>{isTr ? 'Tür' : 'Type'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subtypeScroll}>
              {subtypeOptions.map((item) => {
                const accent = subtypeAccent(item);
                const isActive = subtype === item;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.subtypeChip,
                      isActive
                        ? { backgroundColor: accent.bg, borderColor: accent.fg }
                        : styles.subtypeChipInactive,
                    ]}
                    onPress={() => setSubtype(item)}
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
              style={[styles.modalInput, focusedField === 'title' && styles.modalInputFocused]}
              placeholder={isTr ? 'Hatırlatma başlığı' : 'Reminder title'}
              placeholderTextColor="#b1b3ab"
              value={entryTitle}
              onChangeText={(v) => { setEntryTitle(v); setError(''); }}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />

            {/* date */}
            <Text style={styles.modalFieldLabel}>{isTr ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
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

            {error ? <Text style={styles.modalError}>{error}</Text> : null}

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
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 0,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0ea',
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#30332e',
    lineHeight: 20,
  },
  rowTitleHistory: {
    color: '#9a9c95',
    textDecorationLine: 'line-through',
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5d605a',
  },
  rowMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#b1b3ab',
  },
  rowSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5d605a',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
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
    marginBottom: 20,
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
