import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AiInsight } from '../lib/insightsEngine';

type InsightItem = {
  label: string;
  value: string;
  sub?: string;
};

type InsightsScreenProps = {
  title?: string;
  items: InsightItem[];
  insights?: AiInsight[];
  onInsightAction?: (insight: AiInsight) => void;
  onEmptyCta?: () => void;
};

export default function InsightsScreen({ title = 'Summary & Insights', items, insights = [], onInsightAction, onEmptyCta }: InsightsScreenProps) {
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
        {insights.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <View style={styles.grid}>
              {insights.map((insight) => (
                <View key={insight.id} style={styles.card}>
                  <Text style={styles.cardLabel}>{`${insight.type.toUpperCase()} • ${insight.priority.toUpperCase()}`}</Text>
                  <Text style={styles.cardSub}>{insight.message}</Text>
                  {insight.actionType && insight.actionLabel ? (
                    <Text style={styles.cardAction} onPress={() => onInsightAction?.(insight)}>
                      {insight.actionLabel}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>No insights yet</Text>
              <Text style={styles.cardSub}>Add some data and we'll start analyzing your pet's health.</Text>
              <Pressable style={styles.cardActionBtn} onPress={onEmptyCta}>
                <Text style={styles.cardAction}>Log Weight</Text>
              </Pressable>
            </View>
          </>
        )}
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
  sectionTitle: {
    marginTop: 6,
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
  cardAction: {
    color: '#4f6b43',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  cardActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  emptyTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
});
