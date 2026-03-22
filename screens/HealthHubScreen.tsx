import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type HealthHubCategory = 'all' | 'vaccine' | 'vet' | 'record' | 'weight';

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
};

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function categoryLabel(category: HealthHubCategory) {
  if (category === 'all') return 'All';
  if (category === 'vaccine') return 'Vaccines';
  if (category === 'vet') return 'Vet Visits';
  if (category === 'record') return 'Records';
  return 'Weight';
}

function typeTag(type: Exclude<HealthHubCategory, 'all'>) {
  if (type === 'vaccine') return 'Vaccine';
  if (type === 'vet') return 'Vet';
  if (type === 'record') return 'Record';
  return 'Weight';
}

export default function HealthHubScreen({
  summary,
  timeline,
  initialCategory = 'all',
  categoryResetKey,
}: HealthHubScreenProps) {
  const [category, setCategory] = useState<HealthHubCategory>(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory, categoryResetKey]);

  const filteredTimeline = useMemo(() => {
    if (category === 'all') return timeline;
    return timeline.filter((item) => item.type === category);
  }, [category, timeline]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Health</Text>

        <View style={styles.summaryGrid}>
          <SummaryCard title="Weight" value={summary.latestWeight} />
          <SummaryCard title="Vaccine Status" value={summary.vaccineStatus} />
          <SummaryCard title="Last Vet Visit" value={summary.lastVetVisit} />
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>

        <View style={styles.filtersRow}>
          {(['all', 'record', 'vaccine', 'vet', 'weight'] as HealthHubCategory[]).map((item) => (
            <Pressable key={item} style={[styles.filterChip, category === item && styles.filterChipActive]} onPress={() => setCategory(item)}>
              <Text style={[styles.filterChipText, category === item && styles.filterChipTextActive]}>{categoryLabel(item)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.timelineCard}>
          {filteredTimeline.length === 0 ? (
            <Text style={styles.emptyText}>No entries in this category yet.</Text>
          ) : (
            filteredTimeline.map((item, index) => (
              <View key={item.id} style={[styles.eventRow, index !== filteredTimeline.length - 1 && styles.eventRowDivider]}>
                <View style={styles.eventHeadRow}>
                  <Text style={styles.eventDate}>{item.date}</Text>
                  <Text style={styles.eventTypeTag}>{typeTag(item.type)}</Text>
                </View>
                <Text style={styles.eventTitle}>{item.title}</Text>
                {item.notes ? <Text style={styles.eventNote}>{item.notes}</Text> : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    color: '#2d2d2d',
    fontWeight: '700',
    letterSpacing: -0.6,
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
  emptyText: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
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
});
