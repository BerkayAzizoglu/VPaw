import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export type HealthHubCategory = 'all' | 'vaccine' | 'vet' | 'record' | 'weight';

export type AddHealthRecordType = 'vaccine' | 'diagnosis' | 'procedure' | 'prescription' | 'test';

export type AddHealthRecordPayload = {
  type: AddHealthRecordType;
  title: string;
  date: string;
  note?: string;
};

export type HealthHubSummary = {
  latestWeight: string;
  vaccineStatus: string;
  lastVetVisit: string;
};

export type HealthHubTimelineItem = {
  id: string;
  type: Exclude<HealthHubCategory, 'all'>;
  date: string;
  title: string;
  notes?: string;
};

type HealthHubScreenProps = {
  summary: HealthHubSummary;
  timeline: HealthHubTimelineItem[];
  initialCategory?: HealthHubCategory;
  categoryResetKey?: string | number;
  onPrimaryCta?: () => void;
  onAddRecord?: (payload: AddHealthRecordPayload) => void;
  onDeleteRecord?: (timelineItemId: string) => void;
  locale?: 'en' | 'tr';
};

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function categoryLabel(category: HealthHubCategory, isTr: boolean) {
  if (category === 'all') return isTr ? 'Tümü' : 'All';
  if (category === 'vaccine') return isTr ? 'Aşılar' : 'Vaccines';
  if (category === 'vet') return isTr ? 'Vet Ziy.' : 'Vet Visits';
  if (category === 'record') return isTr ? 'Kayıtlar' : 'Records';
  return isTr ? 'Kilo' : 'Weight';
}

function typeTag(type: Exclude<HealthHubCategory, 'all'>, isTr: boolean) {
  if (type === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (type === 'vet') return isTr ? 'Vet' : 'Vet';
  if (type === 'record') return isTr ? 'Kayıt' : 'Record';
  return isTr ? 'Kilo' : 'Weight';
}

const RECORD_TYPES: AddHealthRecordType[] = ['vaccine', 'diagnosis', 'procedure', 'prescription', 'test'];

function recordTypeLabel(type: AddHealthRecordType, isTr: boolean) {
  if (type === 'vaccine') return isTr ? 'Aşı' : 'Vaccine';
  if (type === 'diagnosis') return isTr ? 'Teşhis' : 'Diagnosis';
  if (type === 'procedure') return isTr ? 'Prosedür' : 'Procedure';
  if (type === 'prescription') return isTr ? 'İlaç' : 'Prescription';
  return isTr ? 'Test' : 'Test';
}

function isValidDate(value: string) {
  const ms = new Date(`${value}T12:00:00.000Z`).getTime();
  return Number.isFinite(ms);
}

export default function HealthHubScreen({
  summary,
  timeline,
  initialCategory = 'all',
  categoryResetKey,
  onPrimaryCta,
  onAddRecord,
  onDeleteRecord,
  locale = 'en',
}: HealthHubScreenProps) {
  const isTr = locale === 'tr';
  const [category, setCategory] = useState<HealthHubCategory>(initialCategory);
  const [selectedItem, setSelectedItem] = useState<HealthHubTimelineItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [recType, setRecType] = useState<AddHealthRecordType>('diagnosis');
  const [recTitle, setRecTitle] = useState('');
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recNote, setRecNote] = useState('');
  const [focusedField, setFocusedField] = useState<'title' | 'date' | 'note' | null>(null);
  const [error, setError] = useState('');
  const saveScale = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory, categoryResetKey]);

  const filteredTimeline = useMemo(() => {
    if (category === 'all') return timeline;
    return timeline.filter((item) => item.type === category);
  }, [category, timeline]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<HealthHubCategory, number>> = { all: timeline.length };
    for (const item of timeline) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }, [timeline]);

  const isFormValid = recTitle.trim().length > 0 && recDate.trim().length > 0 && isValidDate(recDate);

  const openCreate = () => {
    setRecType('diagnosis');
    setRecTitle('');
    setRecDate(new Date().toISOString().slice(0, 10));
    setRecNote('');
    setError('');
    setCreateOpen(true);
  };

  const submitCreate = () => {
    const cleanTitle = recTitle.trim();
    if (!cleanTitle) {
      setError(isTr ? 'Başlık girin.' : 'Please enter a title.');
      return;
    }
    if (!isValidDate(recDate)) {
      setError(isTr ? 'Geçerli tarih girin (YYYY-AA-GG).' : 'Please enter a valid date (YYYY-MM-DD).');
      return;
    }
    onAddRecord?.({
      type: recType,
      title: cleanTitle,
      date: recDate,
      note: recNote.trim() || undefined,
    });
    setCreateOpen(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{isTr ? 'Sağlık' : 'Health'}</Text>
          {onAddRecord ? (
            <Pressable style={styles.addBtn} onPress={openCreate}>
              <Text style={styles.addBtnText}>{isTr ? '+ Ekle' : '+ Add'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard title={isTr ? 'Kilo' : 'Weight'} value={summary.latestWeight} />
          <SummaryCard title={isTr ? 'Aşı Durumu' : 'Vaccine Status'} value={summary.vaccineStatus} />
          <SummaryCard title={isTr ? 'Son Vet Ziyareti' : 'Last Vet Visit'} value={summary.lastVetVisit} />
        </View>

        <Text style={styles.sectionTitle}>{isTr ? 'Geçmiş' : 'Timeline'}</Text>

        <View style={styles.filtersRow}>
          {(['all', 'record', 'vaccine', 'vet', 'weight'] as HealthHubCategory[]).map((item) => {
            const count = categoryCounts[item] ?? 0;
            const isActive = category === item;
            return (
              <Pressable key={item} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setCategory(item)}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {categoryLabel(item, isTr)}{count > 0 ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.timelineCard}>
          {filteredTimeline.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{isTr ? 'Henüz kayıt yok' : 'No health records yet'}</Text>
              <Text style={styles.emptyText}>{isTr ? 'İlk kaydı eklemek için + Ekle düğmesine dokun.' : 'Tap + Add to log your first health record.'}</Text>
              <Pressable style={styles.emptyCta} onPress={onAddRecord ? openCreate : onPrimaryCta}>
                <Text style={styles.emptyCtaText}>{isTr ? 'Kayıt Ekle' : 'Add Record'}</Text>
              </Pressable>
            </View>
          ) : (
            filteredTimeline.map((item, index) => (
              <Pressable
                key={item.id}
                style={[styles.eventRow, index !== filteredTimeline.length - 1 && styles.eventRowDivider]}
                onPress={() => { setDeleteConfirm(false); setSelectedItem(item); }}
              >
                <View style={styles.eventHeadRow}>
                  <Text style={styles.eventDate}>{item.date}</Text>
                  <Text style={[styles.eventTypeTag, item.type === 'vaccine' && styles.eventTypeTagVaccine, item.type === 'vet' && styles.eventTypeTagVet]}>
                    {typeTag(item.type, isTr)}
                  </Text>
                </View>
                <Text style={styles.eventTitle}>{item.title}</Text>
                {item.notes ? <Text style={styles.eventNote}>{item.notes}</Text> : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Detail / Delete modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <Pressable style={styles.detailOverlay} onPress={() => setSelectedItem(null)}>
          <Pressable style={styles.detailSheet} onPress={() => {}}>
            {selectedItem ? (
              <>
                <View style={styles.detailHeadRow}>
                  <Text style={[styles.detailTypeTag, selectedItem.type === 'vaccine' && styles.eventTypeTagVaccine, selectedItem.type === 'vet' && styles.eventTypeTagVet]}>
                    {typeTag(selectedItem.type, isTr)}
                  </Text>
                  <Text style={styles.detailDate}>{selectedItem.date}</Text>
                </View>
                <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                {selectedItem.notes ? <Text style={styles.detailNote}>{selectedItem.notes}</Text> : null}

                <View style={styles.detailActions}>
                  <Pressable style={styles.detailCloseBtn} onPress={() => setSelectedItem(null)}>
                    <Text style={styles.detailCloseBtnText}>{isTr ? 'Kapat' : 'Close'}</Text>
                  </Pressable>

                  {onDeleteRecord && (selectedItem.type === 'record' || selectedItem.type === 'vaccine') ? (
                    deleteConfirm ? (
                      <Pressable
                        style={styles.detailDeleteConfirmBtn}
                        onPress={() => {
                          onDeleteRecord(selectedItem.id);
                          setSelectedItem(null);
                          setDeleteConfirm(false);
                        }}
                      >
                        <Text style={styles.detailDeleteConfirmText}>{isTr ? 'Sil — emin misin?' : 'Confirm Delete'}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.detailDeleteBtn} onPress={() => setDeleteConfirm(true)}>
                        <Text style={styles.detailDeleteBtnText}>{isTr ? 'Sil' : 'Delete'}</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

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
            <Text style={styles.modalTitle}>{isTr ? 'Kayıt Ekle' : 'Add Health Record'}</Text>

            <Text style={styles.fieldLabel}>{isTr ? 'Tür' : 'Type'}</Text>
            <View style={styles.chips}>
              {RECORD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, recType === t ? styles.chipActive : styles.chipInactive]}
                  onPress={() => setRecType(t)}
                >
                  <Text style={[styles.chipText, recType === t && styles.chipTextActive]}>{recordTypeLabel(t, isTr)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{isTr ? 'Başlık' : 'Title'}</Text>
            <TextInput
              style={[styles.input, focusedField === 'title' && styles.inputFocused]}
              placeholder={isTr ? 'Kayıt başlığı' : 'Record title'}
              placeholderTextColor="#a4a4a4"
              value={recTitle}
              onChangeText={setRecTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={styles.fieldLabel}>{isTr ? 'Tarih (YYYY-AA-GG)' : 'Date (YYYY-MM-DD)'}</Text>
            <TextInput
              style={[styles.input, focusedField === 'date' && styles.inputFocused]}
              placeholder="2026-03-22"
              placeholderTextColor="#a4a4a4"
              value={recDate}
              onChangeText={setRecDate}
              autoCapitalize="none"
              onFocus={() => setFocusedField('date')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={styles.fieldLabel}>{isTr ? 'Not (opsiyonel)' : 'Note (optional)'}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, focusedField === 'note' && styles.inputFocused]}
              placeholder={isTr ? 'Ek not...' : 'Additional note...'}
              placeholderTextColor="#a4a4a4"
              value={recNote}
              onChangeText={setRecNote}
              multiline
              numberOfLines={3}
              onFocus={() => setFocusedField('note')}
              onBlur={() => setFocusedField(null)}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.secondaryBtnText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <Pressable
                  style={[styles.primaryBtn, !isFormValid && styles.primaryBtnDisabled]}
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
    gap: 12,
  },
  headerRow: {
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
  summaryGrid: {
    gap: 8,
  },
  summaryCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryTitle: {
    color: '#8a8a8a',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    marginTop: 4,
    color: '#2d2d2d',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: '#7f9a70',
    backgroundColor: '#eef5ea',
  },
  filterChipText: {
    color: '#5f5f5f',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#4f6b43',
  },
  timelineCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  emptyWrap: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  emptyTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyText: {
    color: '#888',
    fontSize: 12,
    lineHeight: 18,
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
  eventRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  eventRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  eventHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: {
    color: '#8a8a8a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  eventTypeTag: {
    color: '#6f7f65',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventTypeTagVaccine: {
    color: '#5a7a9e',
  },
  eventTypeTagVet: {
    color: '#8a6a3a',
  },
  eventTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  eventNote: {
    color: '#747474',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 6,
  },
  detailHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailTypeTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6f7f65',
  },
  detailDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a8a',
  },
  detailTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  detailNote: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  detailCloseBtn: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5f5f5f',
  },
  detailDeleteBtn: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(194,108,108,0.3)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c26c6c',
  },
  detailDeleteConfirmBtn: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c26c6c',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
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
    marginTop: 10,
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
  chipInactive: {
    opacity: 0.82,
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
  inputMultiline: {
    minHeight: 72,
    paddingTop: 10,
    textAlignVertical: 'top',
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
  primaryBtnText: {
    color: '#faf8f5',
    fontSize: 13,
    fontWeight: '700',
  },
});
