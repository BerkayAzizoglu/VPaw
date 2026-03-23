import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, FileText, FlaskConical, Pill, Paperclip } from 'lucide-react-native';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import type { MedicalEvent } from '../lib/healthMvpModel';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentsScreenProps = {
  onBack: () => void;
  petName: string;
  medicalEvents: MedicalEvent[];
  locale?: 'en' | 'tr';
};

type DocItem = {
  id: string;
  kind: 'test' | 'prescription' | 'attachment';
  title: string;
  date: string;
  note?: string;
  status?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: 'en' | 'tr'): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DocCard({ item, locale }: { item: DocItem; locale: 'en' | 'tr' }) {
  const isTr = locale === 'tr';

  const iconBox = (() => {
    if (item.kind === 'test') return { bg: '#e3eef8', fg: '#3a4e7a', icon: <FlaskConical size={18} color="#3a4e7a" strokeWidth={2.2} /> };
    if (item.kind === 'prescription') return { bg: '#f5ede3', fg: '#7a5a3a', icon: <Pill size={18} color="#7a5a3a" strokeWidth={2.2} /> };
    return { bg: '#ede8f5', fg: '#5a4a7a', icon: <Paperclip size={18} color="#5a4a7a" strokeWidth={2.2} /> };
  })();

  const kindLabel = (() => {
    if (item.kind === 'test') return isTr ? 'Lab Testi' : 'Lab Test';
    if (item.kind === 'prescription') return isTr ? 'Reçete' : 'Prescription';
    return isTr ? 'Belge' : 'Document';
  })();

  return (
    <View style={styles.docCard}>
      <View style={[styles.iconBox, { backgroundColor: iconBox.bg }]}>
        {iconBox.icon}
      </View>
      <View style={styles.docBody}>
        <View style={styles.docTopRow}>
          <Text style={styles.docTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.kindPill, { backgroundColor: iconBox.bg }]}>
            <Text style={[styles.kindPillText, { color: iconBox.fg }]}>{kindLabel}</Text>
          </View>
        </View>
        <Text style={styles.docDate}>{formatDate(item.date, locale)}</Text>
        {item.note ? <Text style={styles.docNote} numberOfLines={2}>{item.note}</Text> : null}
      </View>
    </View>
  );
}

function Section({ title, items, locale }: { title: string; items: DocItem[]; locale: 'en' | 'tr' }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map((item, i) => (
          <View key={item.id}>
            {i > 0 && <View style={styles.divider} />}
            <DocCard item={item} locale={locale} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DocumentsScreen({
  onBack,
  petName,
  medicalEvents,
  locale = 'en',
}: DocumentsScreenProps) {
  const isTr = locale === 'tr';
  const swipePan = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });

  const { tests, prescriptions, attachments } = useMemo(() => {
    const tests: DocItem[] = [];
    const prescriptions: DocItem[] = [];
    const attachments: DocItem[] = [];

    for (const ev of medicalEvents) {
      if (ev.type === 'test') {
        tests.push({ id: ev.id, kind: 'test', title: ev.title, date: ev.eventDate, note: ev.note, status: ev.status });
      } else if (ev.type === 'prescription') {
        prescriptions.push({ id: ev.id, kind: 'prescription', title: ev.title, date: ev.eventDate, note: ev.note, status: ev.status });
      } else if (ev.type === 'attachment') {
        attachments.push({ id: ev.id, kind: 'attachment', title: ev.title, date: ev.eventDate, note: ev.note });
      }
    }

    // Sort each group newest first
    const byDate = (a: DocItem, b: DocItem) => b.date.localeCompare(a.date);
    tests.sort(byDate);
    prescriptions.sort(byDate);
    attachments.sort(byDate);

    return { tests, prescriptions, attachments };
  }, [medicalEvents]);

  const totalCount = tests.length + prescriptions.length + attachments.length;

  return (
    <View style={styles.screen} {...swipePan.panHandlers}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <ChevronLeft size={20} color="#5d605a" strokeWidth={2.4} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isTr ? 'Belgeler' : 'Documents'}</Text>
            {petName ? <Text style={styles.headerSub}>{petName}</Text> : null}
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{totalCount}</Text>
          </View>
        </View>

        {totalCount === 0 ? (
          /* Empty state */
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBox}>
              <FileText size={32} color="#b1b3ab" strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>{isTr ? 'Henüz belge yok' : 'No documents yet'}</Text>
            <Text style={styles.emptyBody}>
              {isTr
                ? 'Sağlık kayıtları, reçeteler ve lab sonuçları burada görünür.'
                : 'Health records, prescriptions, and lab results will appear here.'}
            </Text>
          </View>
        ) : (
          <>
            <Section
              title={isTr ? 'Lab Testleri' : 'Lab Tests'}
              items={tests}
              locale={locale}
            />
            <Section
              title={isTr ? 'Reçeteler' : 'Prescriptions'}
              items={prescriptions}
              locale={locale}
            />
            <Section
              title={isTr ? 'Ekler & Dosyalar' : 'Attachments & Files'}
              items={attachments}
              locale={locale}
            />
          </>
        )}
      </ScrollView>
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
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: '#30332e',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 17,
    color: '#5d605a',
    fontWeight: '500',
  },
  countPill: {
    height: 28,
    minWidth: 28,
    borderRadius: 14,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countPillText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#5d605a',
    fontWeight: '700',
  },

  // Sections
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    lineHeight: 15,
    color: '#787878',
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: 60,
  },

  // Doc card
  docCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  docBody: {
    flex: 1,
    gap: 4,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  docTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#30332e',
    fontWeight: '600',
  },
  kindPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  kindPillText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  docDate: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9a9c95',
    fontWeight: '500',
  },
  docNote: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '400',
  },

  // Empty state
  emptyWrap: {
    marginTop: 60,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#eeeee8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#30332e',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d605a',
    fontWeight: '400',
    textAlign: 'center',
  },
});
