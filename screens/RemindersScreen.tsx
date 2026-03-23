import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

const BASE_SUBTYPES: ReminderSubtype[] = ['vaccine', 'vet_visit', 'medication', 'food', 'litter', 'walk', 'custom'];

function subtypeLabel(subtype: ReminderSubtype, isTr: boolean) {
  if (subtype === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (subtype === 'vet_visit') return isTr ? 'Vet Ziyareti' : 'Vet Visit';
  if (subtype === 'medication') return isTr ? 'İlaç' : 'Medication';
  if (subtype === 'food') return isTr ? 'Mama' : 'Food';
  if (subtype === 'litter') return isTr ? 'Kum' : 'Litter';
  if (subtype === 'walk') return isTr ? 'Yürüyüş' : 'Walk';
  return isTr ? 'Özel' : 'Custom';
}

function subtypeColor(subtype: ReminderSubtype | undefined) {
  if (subtype === 'vaccine') return '#5a7a9e';
  if (subtype === 'vet_visit') return '#8a6a3a';
  if (subtype === 'medication') return '#7a6a9a';
  if (subtype === 'food') return '#5f7f59';
  if (subtype === 'litter') return '#4a8a7a';
  if (subtype === 'walk') return '#9a7a3a';
  return '#8a8a8a';
}

function isValidDate(value: string) {
  const ms = new Date(`${value}T12:00:00.000Z`).getTime();
  return Number.isFinite(ms);
}

function isMedicalSubtype(subtype: ReminderSubtype | undefined) {
  return subtype === 'vet_visit' || subtype === 'vaccine' || subtype === 'medication';
}

function buildRowSub(item: ReminderItem, isTr: boolean) {
  const parts: string[] = [];
  if (item.petName) parts.push(item.petName);
  parts.push(item.date);
  if (item.subtype) parts.push(subtypeLabel(item.subtype, isTr));
  return parts.join(' • ');
}

function ReminderSection({
  title,
  items,
  empty,
  isTr,
  onComplete,
  onDelete,
  actionLabel,
}: {
  title: string;
  items: ReminderItem[];
  empty: string;
  isTr: boolean;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  actionLabel?: 'done' | 'overdue' | 'history';
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>{empty}</Text>
        ) : (
          items.map((item, index) => (
            <View key={item.id} style={[styles.rowWrap, index !== items.length - 1 && styles.rowDivider]}>
              {item.subtype ? (
                <View style={[styles.subtypeDot, { backgroundColor: subtypeColor(item.subtype) }]} />
              ) : null}
              <View style={styles.rowBody}>
                <Pressable
                  style={styles.rowPressable}
                  onPress={() => {
                    if (confirmDeleteId === item.id) {
                      setConfirmDeleteId(null);
                    } else if (actionLabel !== 'history') {
                      onComplete?.(item.id);
                    }
                  }}
                >
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, actionLabel === 'history' && styles.rowTitleHistory]}>{item.title}</Text>
                    <Text style={styles.rowSub}>{buildRowSub(item, isTr)}</Text>
                  </View>
                  {actionLabel === 'overdue' ? (
                    <Text style={styles.overdueTag}>{isTr ? 'Gecikmiş' : 'Overdue'}</Text>
                  ) : actionLabel === 'history' ? (
                    <Text style={styles.historyTag}>{isTr ? 'Tamam' : 'Done'}</Text>
                  ) : (
                    <Text style={styles.rowAction}>{isTr ? 'Tamam' : 'Done'}</Text>
                  )}
                </Pressable>

                {onDelete ? (
                  confirmDeleteId === item.id ? (
                    <View style={styles.deleteConfirmRow}>
                      <Pressable style={styles.deleteConfirmBtn} onPress={() => { onDelete(item.id); setConfirmDeleteId(null); }}>
                        <Text style={styles.deleteConfirmText}>{isTr ? 'Sil — emin misin?' : 'Confirm Delete'}</Text>
                      </Pressable>
                      <Pressable onPress={() => setConfirmDeleteId(null)}>
                        <Text style={styles.deleteCancelText}>{isTr ? 'Vazgeç' : 'Cancel'}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.deleteBtn} onPress={() => setConfirmDeleteId(item.id)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}

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
  const [createOpen, setCreateOpen] = useState(false);
  const [subtype, setSubtype] = useState<ReminderSubtype>(activePetType === 'Dog' ? 'walk' : 'food');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<'title' | 'date' | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [group, setGroup] = useState<ReminderGroup>('medical');
  const saveScale = useMemo(() => new Animated.Value(1), []);
  const isFullyEmpty = today.length === 0 && upcoming.length === 0 && overdue.length === 0;

  const subtypeOptions = useMemo(() => {
    if (activePetType === 'Cat') {
      return BASE_SUBTYPES.filter((item) => item !== 'walk');
    }
    return BASE_SUBTYPES;
  }, [activePetType]);

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

  const isFormValid = entryTitle.trim().length > 0
    && entryDate.trim().length > 0
    && isValidDate(entryDate)
    && subtypeOptions.includes(subtype)
    && !(activePetType === 'Cat' && subtype === 'walk');

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

  const submitCreate = () => {
    const cleanedTitle = entryTitle.trim();
    if (!cleanedTitle) {
      setError(isTr ? 'Başlık girin.' : 'Please enter a reminder title.');
      return;
    }
    if (!isValidDate(entryDate)) {
      setError(isTr ? 'Geçerli tarih girin (YYYY-AA-GG).' : 'Please enter a valid date (YYYY-MM-DD).');
      return;
    }
    if (!subtypeOptions.includes(subtype)) {
      setError(isTr ? 'Geçerli bir tür seçin.' : 'Please select a valid reminder type.');
      return;
    }

    onCreate?.({
      petId: activePetId,
      subtype,
      title: cleanedTitle,
      date: entryDate,
    });
    setCreateOpen(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isTr ? 'Hatırlatmalar' : 'Reminders'}</Text>
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>{isTr ? '+ Ekle' : '+ Add'}</Text>
          </Pressable>
        </View>

        <View style={styles.groupRow}>
          <Pressable
            style={[styles.groupChip, group === 'medical' && styles.groupChipActive]}
            onPress={() => setGroup('medical')}
          >
            <Text style={[styles.groupChipText, group === 'medical' && styles.groupChipTextActive]}>
              {isTr ? 'Tıbbi Takip' : 'Medical Follow-up'}
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

        {isFullyEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{isTr ? 'Hatırlatma yok' : 'No reminders set'}</Text>
            <Text style={styles.emptyBody}>{isTr ? 'İlk hatırlatmanı ekle ve takipte kal.' : 'Create your first reminder to stay on track.'}</Text>
            <Pressable style={styles.emptyCta} onPress={openCreate}>
              <Text style={styles.emptyCtaText}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>
            </Pressable>
          </View>
        ) : null}

        <ReminderSection
          title={isTr ? 'Bugün' : 'Today'}
          items={filteredToday}
          empty={isTr ? 'Bugün hatırlatma yok.' : 'No reminders for today.'}
          isTr={isTr}
          onComplete={onComplete}
          onDelete={onDeleteReminder}
          actionLabel="done"
        />
        <ReminderSection
          title={isTr ? 'Yaklaşan' : 'Upcoming'}
          items={filteredUpcoming}
          empty={isTr ? 'Yaklaşan hatırlatma yok.' : 'No upcoming reminders.'}
          isTr={isTr}
          onComplete={onComplete}
          onDelete={onDeleteReminder}
          actionLabel="done"
        />
        <ReminderSection
          title={isTr ? 'Gecikmiş' : 'Overdue'}
          items={filteredOverdue}
          empty={isTr ? 'Gecikmiş hatırlatma yok.' : 'No overdue reminders.'}
          isTr={isTr}
          onComplete={onComplete}
          onDelete={onDeleteReminder}
          actionLabel="overdue"
        />

        {filteredCompleted.length > 0 ? (
          <>
            <Pressable style={styles.completedToggle} onPress={() => setShowCompleted((v) => !v)}>
              <Text style={styles.completedToggleText}>
                {isTr
                  ? `${showCompleted ? '▾' : '▸'} Geçmiş (${filteredCompleted.length})`
                  : `${showCompleted ? '▾' : '▸'} History (${filteredCompleted.length})`}
              </Text>
            </Pressable>
            {showCompleted ? (
              <ReminderSection
                title=""
                items={filteredCompleted}
                empty=""
                isTr={isTr}
                onDelete={onDeleteReminder}
                actionLabel="history"
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={createOpen}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={false}
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>

            <Text style={styles.fieldLabel}>{isTr ? 'Tür' : 'Type'}</Text>
            <View style={styles.chips}>
              {subtypeOptions.map((item) => (
                <Pressable
                  key={item}
                  style={({ pressed }) => [
                    styles.chip,
                    subtype !== item && styles.chipInactive,
                    subtype === item && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                  onPress={() => setSubtype(item)}
                >
                  <View style={[styles.chipDot, { backgroundColor: subtypeColor(item) }]} />
                  <Text style={[styles.chipText, subtype === item && styles.chipTextActive]}>{subtypeLabel(item, isTr)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{isTr ? 'Başlık' : 'Title'}</Text>
            <TextInput
              style={[styles.input, focusedField === 'title' && styles.inputFocused]}
              placeholder={isTr ? 'Hatırlatma başlığı' : 'Reminder title'}
              placeholderTextColor="#a4a4a4"
              value={entryTitle}
              onChangeText={setEntryTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={styles.fieldLabel}>{isTr ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
            <TextInput
              style={[styles.input, focusedField === 'date' && styles.inputFocused]}
              placeholder="2026-03-22"
              placeholderTextColor="#a4a4a4"
              value={entryDate}
              onChangeText={setEntryDate}
              autoCapitalize="none"
              onFocus={() => setFocusedField('date')}
              onBlur={() => setFocusedField(null)}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.secondaryBtnText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    !isFormValid && styles.primaryBtnDisabled,
                    pressed && isFormValid && styles.primaryBtnPressed,
                  ]}
                  disabled={!isFormValid}
                  onPress={submitCreate}
                  onPressIn={() => Animated.spring(saveScale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 6 }).start()}
                  onPressOut={() => Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, speed: 36, bounciness: 5 }).start()}
                >
                  <Text style={styles.primaryBtnText}>{isTr ? 'Kaydet' : 'Save'}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  content: {
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    color: '#2d2d2d',
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  addBtn: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#faf8f5',
    fontSize: 12,
    fontWeight: '700',
  },
  groupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  groupChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupChipActive: {
    borderColor: '#7f9a70',
    backgroundColor: '#eef5ea',
  },
  groupChipText: {
    color: '#6f6f6f',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  groupChipTextActive: {
    color: '#4f6b43',
  },
  emptyCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  emptyTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyBody: {
    color: '#888',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  emptyCta: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyCtaText: {
    color: '#4f6b43',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  subtypeDot: {
    width: 3,
    borderRadius: 2,
    marginVertical: 10,
    marginLeft: 8,
  },
  rowBody: {
    flex: 1,
  },
  rowPressable: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowTitleHistory: {
    color: '#9a9a9a',
    fontWeight: '500',
  },
  rowSub: {
    marginTop: 2,
    color: '#7a7a7a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  rowAction: {
    color: '#5f7f59',
    fontSize: 12,
    fontWeight: '700',
  },
  overdueTag: {
    color: '#c26c6c',
    fontSize: 12,
    fontWeight: '700',
  },
  historyTag: {
    color: '#b0b0b0',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  deleteConfirmBtn: {
    borderRadius: 12,
    backgroundColor: '#c26c6c',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteCancelText: {
    color: '#8a8a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: '#c0c0c0',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  completedToggle: {
    paddingVertical: 4,
  },
  completedToggleText: {
    color: '#8a8a8a',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#faf8f5',
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 24,
  },
  modalCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
    marginBottom: 8,
  },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 6,
    color: '#7f7f7f',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipActive: {
    borderColor: '#7f9a70',
    backgroundColor: '#eef5ea',
  },
  chipInactive: {
    opacity: 0.82,
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    color: '#5f5f5f',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#4f6b43',
  },
  input: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    color: '#2d2d2d',
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#9ab395',
    shadowColor: '#8ca486',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorText: {
    marginTop: 8,
    color: '#c26c6c',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  secondaryBtn: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#5f5f5f',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    color: '#faf8f5',
    fontSize: 13,
    fontWeight: '700',
  },
});
