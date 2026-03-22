import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type InsightItem = {
  label: string;
  value: string;
  sub?: string;
};

type InsightsScreenProps = {
  title?: string;
  items: InsightItem[];
};

export default function InsightsScreen({ title = 'Summary & Insights', items }: InsightsScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.grid}>
          {items.map((item) => (
            <View key={item.label} style={styles.card}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardValue}>{item.value}</Text>
              {item.sub ? <Text style={styles.cardSub}>{item.sub}</Text> : null}
            </View>
          ))}
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
  cardLabel: {
    color: '#7a7a7a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardValue: {
    marginTop: 6,
    color: '#2d2d2d',
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '700',
  },
  cardSub: {
    marginTop: 3,
    color: '#8a8a8a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});

