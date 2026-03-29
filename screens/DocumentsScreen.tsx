import React, { useMemo, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronRight, FileText, Files, FlaskConical, Image as ImageIcon, Paperclip, Pill } from 'lucide-react-native';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import type { HealthDocumentItem, HealthDocumentType } from '../lib/healthDocumentsVault';
import AppleTopBar from '../components/AppleTopBar';

type DocumentsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  petName: string;
  documents: HealthDocumentItem[];
  locale?: 'en' | 'tr';
};

type TypeFilter = 'all' | HealthDocumentType;

function parseDateMs(iso: string) {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function formatDate(iso: string, locale: 'en' | 'tr'): string {
  const ms = parseDateMs(iso);
  if (ms <= 0) return iso;
  return new Date(ms).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getTypeLabel(type: HealthDocumentType, locale: 'en' | 'tr') {
  if (type === 'lab') return locale === 'tr' ? 'Lab' : 'Lab';
  if (type === 'prescription') return locale === 'tr' ? 'Recete' : 'Prescription';
  if (type === 'image') return locale === 'tr' ? 'Gorsel' : 'Image';
  if (type === 'document') return locale === 'tr' ? 'Belge' : 'Document';
  return locale === 'tr' ? 'Diger' : 'Other';
}

function getSourceLabel(sourceType: HealthDocumentItem['sourceType'], locale: 'en' | 'tr') {
  return sourceType === 'vet_visit'
    ? (locale === 'tr' ? 'Vet ziyareti' : 'Vet visit')
    : (locale === 'tr' ? 'Saglik kaydi' : 'Health record');
}

function iconForType(type: HealthDocumentType) {
  if (type === 'lab') return <FlaskConical size={18} color="#41688c" strokeWidth={2.1} />;
  if (type === 'prescription') return <Pill size={18} color="#86623e" strokeWidth={2.1} />;
  if (type === 'image') return <ImageIcon size={18} color="#356f64" strokeWidth={2.1} />;
  if (type === 'document') return <Files size={18} color="#5d5981" strokeWidth={2.1} />;
  return <Paperclip size={18} color="#626a70" strokeWidth={2.1} />;
}

function bgForType(type: HealthDocumentType) {
  if (type === 'lab') return '#e7f0fb';
  if (type === 'prescription') return '#f7eee5';
  if (type === 'image') return '#e8f5f1';
  if (type === 'document') return '#f0ebf8';
  return '#eef1f3';
}

export default function DocumentsScreen({
  onBack,
  backPreview,
  petName,
  documents,
  locale = 'en',
}: DocumentsScreenProps) {
  const isTr = locale === 'tr';
  const swipePan = useEdgeSwipeBack({ onBack, fullScreenGestureEnabled: true, enterVariant: 'drift' });
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => parseDateMs(b.date) - parseDateMs(a.date)),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const q = normalizeText(query);
    return sortedDocuments.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return normalizeText(item.title).includes(q) || normalizeText(item.note ?? '').includes(q);
    });
  }, [query, sortedDocuments, typeFilter]);

  const highlightDocument = filteredDocuments[0] ?? sortedDocuments[0] ?? null;
  const typeFilters: TypeFilter[] = ['all', 'lab', 'prescription', 'document', 'image', 'other'];
  const typeSummary = typeFilters
    .filter((type) => type !== 'all')
    .map((type) => ({
      type,
      count: sortedDocuments.filter((item) => item.type === type).length,
      label: getTypeLabel(type, locale),
    }))
    .filter((entry) => entry.count > 0);

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePan.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.frontLayer, swipePan.frontLayerStyle]} {...swipePan.panHandlers}>
        <StatusBar style="dark" />
        <AppleTopBar
          title={isTr ? 'Belgeler' : 'Documents'}
          onBack={onBack}
          backgroundColor="rgba(246, 244, 240, 0.66)"
          rightSlot={
            <View style={styles.headerCount}>
              <Text style={styles.headerCountText}>{filteredDocuments.length}</Text>
            </View>
          }
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!swipePan.isSwiping}
        >
          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>{isTr ? 'Belge kasasi' : 'Document Vault'}</Text>
            <Text style={styles.heroBody}>
              {isTr
                ? `${petName} icin lab, recete ve ziyaret eklerini kaynagina gore duzenli gosterir.`
                : `Keeps ${petName}'s labs, prescriptions, and visit attachments organized by source.`}
            </Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isTr ? 'Belge veya not ara...' : 'Search documents or notes...'}
            placeholderTextColor="#99a09a"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {typeSummary.length > 0 ? (
            <View style={styles.summaryGrid}>
              {typeSummary.slice(0, 4).map((entry) => (
                <Pressable
                  key={entry.type}
                  onPress={() => setTypeFilter(entry.type)}
                  style={({ pressed }) => [
                    styles.summaryTile,
                    typeFilter === entry.type && styles.summaryTileActive,
                    pressed && styles.summaryTilePressed,
                  ]}
                >
                  <View style={[styles.summaryIcon, { backgroundColor: bgForType(entry.type) }]}>
                    {iconForType(entry.type)}
                  </View>
                  <Text style={styles.summaryCount}>{entry.count}</Text>
                  <Text style={styles.summaryLabel}>{entry.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {highlightDocument ? (
            <View style={styles.featuredCard}>
              <View style={styles.featuredTopRow}>
                <View style={[styles.featuredIcon, { backgroundColor: bgForType(highlightDocument.type) }]}>
                  {iconForType(highlightDocument.type)}
                </View>
                <View style={styles.featuredBody}>
                  <Text style={styles.featuredEyebrow}>{isTr ? 'EN GUNCEL DOSYA' : 'LATEST FILE'}</Text>
                  <Text style={styles.featuredTitle} numberOfLines={2}>
                    {highlightDocument.title}
                  </Text>
                  <Text style={styles.featuredMeta}>
                    {getTypeLabel(highlightDocument.type, locale)} • {getSourceLabel(highlightDocument.sourceType, locale)}
                  </Text>
                </View>
              </View>
              <View style={styles.featuredBottomRow}>
                <View style={styles.featuredDatePill}>
                  <Text style={styles.featuredDateText}>{formatDate(highlightDocument.date, locale)}</Text>
                </View>
                {highlightDocument.note ? (
                  <Text style={styles.featuredNote} numberOfLines={2}>
                    {highlightDocument.note}
                  </Text>
                ) : (
                  <Text style={styles.featuredNoteMuted}>
                    {isTr ? 'Kayit acilmadan kaynagi net gorunur.' : 'Source context stays clear before opening.'}
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {typeFilters.map((item) => {
              const selected = typeFilter === item;
              const label = item === 'all' ? (isTr ? 'Tumu' : 'All') : getTypeLabel(item, locale);
              return (
                <Pressable
                  key={item}
                  onPress={() => setTypeFilter(item)}
                  style={[styles.filterChip, selected && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredDocuments.length > 0 ? (
            <View style={styles.listShell}>
              {filteredDocuments.map((item, index) => (
                <View key={item.id} style={[styles.row, index < filteredDocuments.length - 1 && styles.rowDivider]}>
                  <View style={[styles.rowIcon, { backgroundColor: bgForType(item.type) }]}>
                    {iconForType(item.type)}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {getSourceLabel(item.sourceType, locale)} • {formatDate(item.date, locale)}
                    </Text>
                    {item.note ? (
                      <Text style={styles.rowNote} numberOfLines={2}>
                        {item.note}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowChevronShell}>
                    <ChevronRight size={16} color="#73817d" strokeWidth={2.2} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}>
                <FileText size={28} color="#b1b3ab" strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>
                {query || typeFilter !== 'all'
                  ? (isTr ? 'Belge bulunamadi' : 'No documents found')
                  : (isTr ? 'Henuz belge yok' : 'No documents yet')}
              </Text>
              <Text style={styles.emptyBody}>
                {query || typeFilter !== 'all'
                  ? (isTr ? 'Filtreleri temizleyin veya farkli bir arama deneyin.' : 'Try clearing filters or using a different search.')
                  : (isTr ? 'Vet ziyaretleri ve saglik kayitlarina eklenen dosyalar burada toplanir.' : 'Files linked to visits and records will gather here.')}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f4f0' },
  backLayer: { ...StyleSheet.absoluteFillObject },
  frontLayer: { flex: 1, overflow: 'hidden', backgroundColor: '#f6f4f0' },
  content: { paddingTop: 108, paddingHorizontal: 20, paddingBottom: 36, gap: 16 },
  headerCount: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(98,115,111,0.10)',
  },
  headerCountText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#5f6a66',
    fontWeight: '700',
  },
  heroBlock: {
    gap: 6,
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '800',
    color: '#26312f',
    letterSpacing: -0.8,
  },
  heroBody: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 21,
    color: '#6a726d',
    fontWeight: '500',
  },
  searchInput: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9ddd5',
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 14,
    color: '#30332e',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryTile: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(102,118,113,0.08)',
    padding: 14,
    gap: 8,
  },
  summaryTileActive: {
    borderColor: 'rgba(62,102,96,0.20)',
    shadowColor: '#64827b',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryTilePressed: {
    transform: [{ scale: 0.986 }],
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontSize: 28,
    lineHeight: 31,
    color: '#2f3432',
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 17,
    color: '#6a726d',
    fontWeight: '600',
  },
  featuredCard: {
    borderRadius: 30,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.08)',
    padding: 18,
    gap: 14,
    shadowColor: '#71857e',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  featuredTopRow: {
    flexDirection: 'row',
    gap: 14,
  },
  featuredIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBody: {
    flex: 1,
    gap: 4,
  },
  featuredEyebrow: {
    fontSize: 10,
    lineHeight: 14,
    color: '#7d847f',
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  featuredTitle: {
    fontSize: 21,
    lineHeight: 26,
    color: '#2d3330',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  featuredMeta: {
    fontSize: 13,
    lineHeight: 17,
    color: '#68706b',
    fontWeight: '600',
  },
  featuredBottomRow: {
    gap: 8,
  },
  featuredDatePill: {
    alignSelf: 'flex-start',
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f1eb',
  },
  featuredDateText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#646c68',
    fontWeight: '700',
  },
  featuredNote: {
    fontSize: 14,
    lineHeight: 20,
    color: '#525b57',
    fontWeight: '500',
  },
  featuredNoteMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8b918d',
    fontWeight: '500',
  },
  filterRow: {
    gap: 8,
    paddingRight: 6,
  },
  filterChip: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d2d6cf',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 13,
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: '#6b8d86',
    backgroundColor: '#edf5f2',
  },
  filterChipText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64706a',
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#315d58',
  },
  listShell: {
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.08)',
  },
  row: {
    minHeight: 88,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(164,170,163,0.34)',
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 21,
    color: '#2f3432',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7b817c',
    fontWeight: '600',
  },
  rowNote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5f6662',
    fontWeight: '500',
  },
  rowChevronShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4ef',
    borderWidth: 1,
    borderColor: 'rgba(108,121,116,0.08)',
  },
  emptyWrap: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#30332e',
    fontWeight: '700',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#6c706a',
    textAlign: 'center',
  },
});
