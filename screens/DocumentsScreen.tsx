import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, FileText, FlaskConical, Image as ImageIcon, Paperclip, Pill } from 'lucide-react-native';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import type { HealthDocumentItem, HealthDocumentType } from '../lib/healthDocumentsVault';

type DocumentsScreenProps = {
  onBack: () => void;
  petName: string;
  documents: HealthDocumentItem[];
  locale?: 'en' | 'tr';
};

type TypeFilter = 'all' | HealthDocumentType;
type DateFilter = 'newest' | 'oldest';

function parseDateMs(iso: string) {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDate(iso: string, locale: 'en' | 'tr'): string {
  const ms = parseDateMs(iso);
  if (ms <= 0) return iso;
  return new Date(ms).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getTypeLabel(type: HealthDocumentType, locale: 'en' | 'tr') {
  if (type === 'lab') return locale === 'tr' ? 'Lab' : 'Lab';
  if (type === 'prescription') return locale === 'tr' ? 'Reçete' : 'Prescription';
  if (type === 'image') return locale === 'tr' ? 'Görsel' : 'Image';
  if (type === 'document') return locale === 'tr' ? 'Belge' : 'Document';
  return locale === 'tr' ? 'Diğer' : 'Other';
}

function iconForType(type: HealthDocumentType) {
  if (type === 'lab') return <FlaskConical size={18} color="#3a4e7a" strokeWidth={2.2} />;
  if (type === 'prescription') return <Pill size={18} color="#7a5a3a" strokeWidth={2.2} />;
  if (type === 'image') return <ImageIcon size={18} color="#3d6f63" strokeWidth={2.2} />;
  if (type === 'document') return <FileText size={18} color="#5a4a7a" strokeWidth={2.2} />;
  return <Paperclip size={18} color="#596068" strokeWidth={2.2} />;
}

function bgForType(type: HealthDocumentType) {
  if (type === 'lab') return '#e3eef8';
  if (type === 'prescription') return '#f5ede3';
  if (type === 'image') return '#e5f3ef';
  if (type === 'document') return '#ede8f5';
  return '#eceff1';
}

export default function DocumentsScreen({
  onBack,
  petName,
  documents,
  locale = 'en',
}: DocumentsScreenProps) {
  const isTr = locale === 'tr';
  const swipePan = useEdgeSwipeBack({ onBack, fullScreenGestureEnabled: true });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('newest');
  const [query, setQuery] = useState('');

  const filteredDocuments = useMemo(() => {
    const q = normalizeText(query);
    const list = documents
      .filter((item) => typeFilter === 'all' || item.type === typeFilter)
      .filter((item) => {
        if (!q) return true;
        return normalizeText(item.title).includes(q) || normalizeText(item.note ?? '').includes(q);
      })
      .sort((a, b) => dateFilter === 'newest' ? parseDateMs(b.date) - parseDateMs(a.date) : parseDateMs(a.date) - parseDateMs(b.date));
    return list;
  }, [dateFilter, documents, query, typeFilter]);

  const typeFilters: TypeFilter[] = ['all', 'lab', 'prescription', 'document', 'image', 'other'];

  return (
    <View style={styles.screen} {...swipePan.panHandlers}>
      <StatusBar style="dark" />
      <FlatList
        data={filteredDocuments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Pressable style={styles.backBtn} onPress={onBack}>
                <ChevronLeft size={20} color="#5d605a" strokeWidth={2.4} />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>{isTr ? 'Belgeler' : 'Documents'}</Text>
                {petName ? <Text style={styles.headerSub}>{petName}</Text> : null}
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{filteredDocuments.length}</Text>
              </View>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={isTr ? 'Belge ara...' : 'Search documents...'}
              placeholderTextColor="#9aa09a"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />

            <View style={styles.filtersRow}>
              <FlatList
                data={typeFilters}
                horizontal
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
                renderItem={({ item }) => {
                  const selected = typeFilter === item;
                  const label = item === 'all' ? (isTr ? 'Tümü' : 'All') : getTypeLabel(item, locale);
                  return (
                    <Pressable
                      onPress={() => setTypeFilter(item)}
                      style={[styles.filterChip, selected && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{label}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View style={styles.dateRow}>
              <Pressable
                style={[styles.dateChip, dateFilter === 'newest' && styles.dateChipActive]}
                onPress={() => setDateFilter('newest')}
              >
                <Text style={[styles.dateChipText, dateFilter === 'newest' && styles.dateChipTextActive]}>{isTr ? 'Yeni → Eski' : 'Newest'}</Text>
              </Pressable>
              <Pressable
                style={[styles.dateChip, dateFilter === 'oldest' && styles.dateChipActive]}
                onPress={() => setDateFilter('oldest')}
              >
                <Text style={[styles.dateChipText, dateFilter === 'oldest' && styles.dateChipTextActive]}>{isTr ? 'Eski → Yeni' : 'Oldest'}</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <FileText size={28} color="#b1b3ab" strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>
              {query || typeFilter !== 'all'
                ? (isTr ? 'Belge bulunamadı' : 'No documents found')
                : (isTr ? 'Henüz belge yok' : 'No documents yet')}
            </Text>
            <Text style={styles.emptyBody}>
              {query || typeFilter !== 'all'
                ? (isTr ? 'Filtreleri temizleyin veya farklı bir arama deneyin.' : 'Try clearing filters or using a different search.')
                : (isTr
                    ? 'Belgeler, veteriner ziyaretlerine veya sağlık kayıtlarına ek olarak eklenir.'
                    : 'Documents are added as attachments to vet visits or health records.')}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.docCard}>
            <View style={[styles.iconBox, { backgroundColor: bgForType(item.type) }]}>
              {iconForType(item.type)}
            </View>
            <View style={styles.docBody}>
              <View style={styles.docTopRow}>
                <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.kindPill, { backgroundColor: bgForType(item.type) }]}>
                  <Text style={styles.kindPillText}>{getTypeLabel(item.type, locale)}</Text>
                </View>
              </View>
              <Text style={styles.docMeta}>
                {formatDate(item.date, locale)} · {item.sourceType === 'vet_visit' ? (isTr ? 'Vet ziyareti' : 'Vet visit') : (isTr ? 'Sağlık kaydı' : 'Medical record')}
              </Text>
              {item.note ? <Text style={styles.docNote} numberOfLines={2}>{item.note}</Text> : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f4f0' },
  content: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  headerWrap: { gap: 12, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, gap: 1 },
  headerTitle: { fontSize: 20, lineHeight: 26, color: '#30332e', fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: 13, lineHeight: 17, color: '#5d605a', fontWeight: '500' },
  countPill: { height: 28, minWidth: 28, borderRadius: 14, backgroundColor: '#eeeee8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  countPillText: { fontSize: 13, lineHeight: 16, color: '#5d605a', fontWeight: '700' },
  searchInput: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8dbd3',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    color: '#30332e',
    fontSize: 13,
  },
  filtersRow: { marginTop: 2 },
  filterScrollContent: { gap: 8, paddingRight: 6 },
  filterChip: { height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#ccd1c8', backgroundColor: '#fff', paddingHorizontal: 12, justifyContent: 'center' },
  filterChipActive: { borderColor: '#47664a', backgroundColor: '#edf5ea' },
  filterChipText: { fontSize: 12, lineHeight: 16, color: '#5d605a', fontWeight: '600' },
  filterChipTextActive: { color: '#47664a', fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: { height: 28, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: '#eeeee8' },
  dateChipActive: { backgroundColor: '#dfeadf' },
  dateChipText: { fontSize: 12, color: '#5d605a', fontWeight: '600' },
  dateChipTextActive: { color: '#2f5634', fontWeight: '700' },
  emptyWrap: { marginTop: 32, alignItems: 'center', paddingHorizontal: 24 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#eeeee8', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 16, lineHeight: 22, color: '#30332e', fontWeight: '700' },
  emptyBody: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#6c706a', textAlign: 'center' },
  docCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: 16,
    padding: 12,
  },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  docBody: { flex: 1, gap: 4 },
  docTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  docTitle: { flex: 1, fontSize: 14, lineHeight: 19, color: '#30332e', fontWeight: '700' },
  kindPill: { height: 22, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  kindPillText: { fontSize: 11, lineHeight: 14, color: '#434843', fontWeight: '700' },
  docMeta: { fontSize: 12, lineHeight: 16, color: '#70756e', fontWeight: '500' },
  docNote: { fontSize: 12, lineHeight: 16, color: '#5d605a' },
});
