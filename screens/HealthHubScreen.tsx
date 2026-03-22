import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type HealthHubScreenProps = {
  onOpenVaccinations?: () => void;
  onOpenVetVisits?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenPassport?: () => void;
};

function HubCard({ title, sub, onPress }: { title: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{sub}</Text>
    </Pressable>
  );
}

export default function HealthHubScreen({ onOpenVaccinations, onOpenVetVisits, onOpenHealthRecords, onOpenPassport }: HealthHubScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>Health / Records</Text>
        <View style={styles.grid}>
          <HubCard title="Vaccinations" sub="Track due vaccines and history" onPress={onOpenVaccinations} />
          <HubCard title="Vet Visits" sub="Manage encounters and outcomes" onPress={onOpenVetVisits} />
          <HubCard title="Health Records" sub="Diagnoses, tests, procedures" onPress={onOpenHealthRecords} />
          <HubCard title="Health Card" sub="Export and summary view" onPress={onOpenPassport} />
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
    gap: 14,
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    color: '#2d2d2d',
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  grid: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardTitle: {
    color: '#2d2d2d',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  cardSub: {
    marginTop: 4,
    color: '#7d7d7d',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});

