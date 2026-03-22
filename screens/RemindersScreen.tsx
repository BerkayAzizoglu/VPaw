import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type ReminderSubtype = 'vet_visit' | 'vaccine' | 'medication' | 'food' | 'litter' | 'walk' | 'custom';

type ReminderItem = {
  id: string;
  title: string;
  date: string;
  petName?: string;
  petId?: 'luna' | 'milo';
  subtype?: ReminderSubtype;
};

type RemindersScreenProps = {
  title?: string;
  today: ReminderItem[];
  upcoming: ReminderItem[];
  overdue: ReminderItem[];
  activePetId?: 'luna' | 'milo';
  activePetType?: 'Dog' | 'Cat';
  openCreateNonce?: number;
  subtypePreset?: ReminderSubtype;
  onComplete?: (id: string) => void;
  onCreate?: (payload: {
    petId: 'luna' | 'milo';
    subtype: ReminderSubtype;
    title: string;
    date: string;
  }) => void;
};

const BASE_SUBTYPES: ReminderSubtype[] = ['vaccine', 'vet_visit', 'medication', 'food', 'litter', 'walk', 'custom'];

function subtypeLabel(subtype: ReminderSubtype) {
  if (subtype === 'vaccine') return 'Vaccine';
  if (subtype === 'vet_visit') return 'Vet Visit';
  if (subtype === 'medication') return 'Medication';
  if (subtype === 'food') return 'Food';
  if (subtype === 'litter') return 'Litter';
  if (subtype === 'walk') return 'Walk';
  return 'Custom';
}

function isValidDate(value: string) {
  const ms = new Date(`${value}T12:00:00.000Z`).getTime();
  return Number.isFinite(ms);
}

function ReminderSection({
  title,
  items,
  empty,
  onComplete,
  actionLabel,
}: {
  title: string;
  items: ReminderItem[];
  empty: string;
  onComplete?: (id: string) => void;
  actionLabel?: 'Done' | 'Overdue';
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>{empty}</Text>
        ) : (
          items.map((item, index) => (
            <Pressable key={item.id} style={[styles.row, index !== items.length - 1 && styles.rowDivider]} onPress={() => onComplete?.(item.id)}>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.petName ? `${item.petName} • ${item.date}` : item.date}</Text>
              </View>
              {actionLabel === 'Overdue' ? <Text style={styles.overdueTag}>Overdue</Text> : <Text style={styles.rowAction}>Done</Text>}
            </Pressable>
          ))
        )}
      </View>
    </>
  );
}

export default function RemindersScreen({
  title = 'Reminders',
  today,
  upcoming,
  overdue,
  activePetId = 'luna',
  activePetType = 'Dog',
  openCreateNonce,
  subtypePreset,
  onComplete,
  onCreate,
}: RemindersScreenProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [subtype, setSubtype] = useState<ReminderSubtype>(activePetType === 'Dog' ? 'walk' : 'food');
  const [entryTitle, setEntryTitle] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const subtypeOptions = useMemo(() => {
    if (activePetType === 'Cat') {
      return BASE_SUBTYPES.filter((item) => item !== 'walk');
    }
    return BASE_SUBTYPES;
  }, [activePetType]);

  const openCreate = () => {
    const preferred = subtypePreset ?? (activePetType === 'Dog' ? 'walk' : 'food');
    setSubtype(preferred);
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

  const submitCreate = () => {
    const cleanedTitle = entryTitle.trim();
    if (!cleanedTitle) {
      setError('Please enter a reminder title.');
      return;
    }
    if (!isValidDate(entryDate)) {
      setError('Please enter a valid date (YYYY-MM-DD).');
      return;
    }
    if (activePetType === 'Cat' && subtype === 'walk') {
      setError('Walk reminder is available only for dogs.');
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
          <View style={styles.headerSpacer} />
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        <ReminderSection title="Today" items={today} empty="No reminders for today." onComplete={onComplete} actionLabel="Done" />
        <ReminderSection title="Upcoming" items={upcoming} empty="No upcoming reminders." onComplete={onComplete} actionLabel="Done" />
        <ReminderSection title="Overdue" items={overdue} empty="No overdue reminders." onComplete={onComplete} actionLabel="Overdue" />
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Reminder</Text>

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chips}>
              {subtypeOptions.map((item) => (
                <Pressable
                  key={item}
                  style={[styles.chip, subtype === item && styles.chipActive]}
                  onPress={() => setSubtype(item)}
                >
                  <Text style={[styles.chipText, subtype === item && styles.chipTextActive]}>{subtypeLabel(item)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Reminder title"
              placeholderTextColor="#a4a4a4"
              value={entryTitle}
              onChangeText={setEntryTitle}
            />

            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-03-22"
              placeholderTextColor="#a4a4a4"
              value={entryDate}
              onChangeText={setEntryDate}
              autoCapitalize="none"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={submitCreate}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
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
  headerSpacer: {
    width: 2,
    height: 2,
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
  row: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
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
  emptyText: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: '#faf8f5',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: '#7f9a70',
    backgroundColor: '#eef5ea',
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
  primaryBtnText: {
    color: '#faf8f5',
    fontSize: 13,
    fontWeight: '700',
  },
});
