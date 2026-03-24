import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { AiInsight } from '../lib/insightsEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  locale?: 'en' | 'tr';
};

// ─── Design tokens ───────────────────────────────────────────────────────────

const C = {
  bg: '#f6f4f0',
  surface: '#ffffff',
  surfaceContainer: '#eeeee8',
  primary: '#47664a',
  onSurface: '#30332e',
  onSurfaceVariant: '#5d605a',
  outlineVariant: '#b1b3ab',
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconSvg({ kind, size = 18, color = '#5d605a' }: {
  kind: 'stethoscope' | 'syringe' | 'pill' | 'alert' | 'trend' | 'suggestion' | 'spark' | 'check';
  size?: number;
  color?: string;
}) {
  if (kind === 'stethoscope') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4V8.2C7 10.8 8.8 12.8 11.1 13.3V15.1C11.1 17.2 12.8 19 14.9 19C17 19 18.7 17.3 18.7 15.2V14.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.8 4V8.2C14.8 10.9 13 13 10.5 13.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Circle cx="18.9" cy="12.8" r="2.2" stroke={color} strokeWidth={1.9} />
    </Svg>
  );
  if (kind === 'syringe') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5L18.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M6 18L14.7 9.3L17.7 12.3L9 21H6V18Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Path d="M12 12L14 14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M9.8 14.2L11.8 16.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
  if (kind === 'pill') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.5 14.5L14.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M7.8 7.8C6 9.6 6 12.5 7.8 14.3L9.8 16.3C11.6 18.1 14.5 18.1 16.3 16.3C18.1 14.5 18.1 11.6 16.3 9.8L14.3 7.8C12.5 6 9.6 6 7.8 7.8Z" stroke={color} strokeWidth={1.9} />
    </Svg>
  );
  if (kind === 'alert') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5L21 19H3L12 5Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Path d="M12 10V13.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Circle cx="12" cy="16.5" r="0.8" fill={color} />
    </Svg>
  );
  if (kind === 'trend') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3.5 16L8.5 11L12 14L18 8" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.5 8H18V11.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  if (kind === 'suggestion') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.9} />
      <Path d="M9.8 9.6C10.1 8.7 10.9 8.1 12 8.1C13.3 8.1 14.2 8.9 14.2 10.1C14.2 11.1 13.7 11.6 12.8 12.1C12.1 12.5 11.8 12.9 11.8 13.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="11.8" cy="16.1" r="0.8" fill={color} />
    </Svg>
  );
  if (kind === 'check') return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12L10 17L19 8" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  // spark
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4L13.3 8L17.5 9.3L13.3 10.6L12 14.6L10.7 10.6L6.5 9.3L10.7 8L12 4Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priorityColors(priority: AiInsight['priority']) {
  if (priority === 'high') return { bar: '#c0392b', bg: '#fdf0ee', pill: '#fbe0dc', pillText: '#a33020' };
  if (priority === 'medium') return { bar: '#c48d42', bg: '#fdf7ee', pill: '#faecd8', pillText: '#9a6a28' };
  return { bar: '#47664a', bg: '#f0f5f0', pill: '#daeeda', pillText: '#356038' };
}

function typeColors(type: AiInsight['type']) {
  if (type === 'alert') return { bg: '#fde8e3', fg: '#b94747' };
  if (type === 'trend') return { bg: '#e3eef8', fg: '#3a4e7a' };
  return { bg: '#e8f0e8', fg: '#47664a' };
}

function typeLabel(type: AiInsight['type'], isTr: boolean) {
  if (type === 'alert') return isTr ? 'Uyarı' : 'Alert';
  if (type === 'trend') return isTr ? 'Trend' : 'Trend';
  return isTr ? 'Öneri' : 'Suggestion';
}

function priorityLabel(priority: AiInsight['priority'], isTr: boolean) {
  if (priority === 'high') return isTr ? 'Yüksek' : 'High';
  if (priority === 'medium') return isTr ? 'Orta' : 'Medium';
  return isTr ? 'Düşük' : 'Low';
}

// Determine which icon to use per stat label
function iconForItem(label: string): { kind: 'stethoscope' | 'syringe' | 'pill' | 'alert' | 'trend' | 'suggestion' | 'spark' | 'check'; bg: string; fg: string } {
  const l = label.toLowerCase();
  if (l.includes('visit') || l.includes('ziyaret')) return { kind: 'stethoscope', bg: '#edffe3', fg: '#3a6e45' };
  if (l.includes('vaccine') || l.includes('aşı')) return { kind: 'syringe', bg: '#ddeaf5', fg: '#3a6080' };
  if (l.includes('med') || l.includes('ilaç')) return { kind: 'pill', bg: '#ede8f5', fg: '#5a4a7a' };
  if (l.includes('alert') || l.includes('uyarı')) return { kind: 'alert', bg: '#fde8e3', fg: '#b94747' };
  return { kind: 'spark', bg: '#eeeee8', fg: '#5d605a' };
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function InsightsScreen({
  title,
  items,
  insights = [],
  onInsightAction,
  onEmptyCta,
  locale = 'en',
}: InsightsScreenProps) {
  const isTr = locale === 'tr';
  const screenTitle = title ?? (isTr ? 'Özet & İçgörüler' : 'Summary & Insights');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Text style={styles.headerLabel}>{isTr ? 'SAĞLIK ANALİZİ' : 'HEALTH ANALYSIS'}</Text>
          <Text style={styles.headerTitle}>{screenTitle}</Text>
        </View>

        {/* ── Stats grid ── */}
        {items.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>{isTr ? 'ÖZET' : 'OVERVIEW'}</Text>
            <View style={styles.statsGrid}>
              {items.map((item) => {
                const icon = iconForItem(item.label);
                return (
                  <View key={item.label} style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: icon.bg }]}>
                      <IconSvg kind={icon.kind} size={18} color={icon.fg} />
                    </View>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label.toUpperCase()}</Text>
                    {item.sub ? (
                      <Text style={styles.statSub} numberOfLines={2}>{item.sub}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* ── AI Insights ── */}
        <Text style={styles.sectionLabel}>{isTr ? 'AKILLI İÇGÖRÜLER' : 'SMART INSIGHTS'}</Text>

        {insights.length > 0 ? (
          <View style={styles.insightsList}>
            {insights.map((insight) => {
              const pc = priorityColors(insight.priority);
              const tc = typeColors(insight.type);
              return (
                <View key={insight.id} style={[styles.insightCard, { borderLeftColor: pc.bar }]}>
                  <View style={styles.insightTop}>
                    <View style={[styles.insightIconBox, { backgroundColor: tc.bg }]}>
                      <IconSvg
                        kind={insight.type === 'alert' ? 'alert' : insight.type === 'trend' ? 'trend' : 'suggestion'}
                        size={16}
                        color={tc.fg}
                      />
                    </View>
                    <View style={styles.insightMeta}>
                      <Text style={styles.insightTypeText}>{typeLabel(insight.type, isTr)}</Text>
                      <View style={[styles.priorityPill, { backgroundColor: pc.pill }]}>
                        <Text style={[styles.priorityPillText, { color: pc.pillText }]}>
                          {priorityLabel(insight.priority, isTr)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.insightMessage}>{insight.message}</Text>
                  {insight.actionType && insight.actionLabel ? (
                    <Pressable
                      style={styles.insightActionBtn}
                      onPress={() => onInsightAction?.(insight)}
                    >
                      <Text style={styles.insightActionText}>{insight.actionLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <IconSvg kind="spark" size={26} color="#a6b3a5" />
            </View>
            <Text style={styles.emptyTitle}>
              {isTr ? 'Henüz içgörü yok' : 'No insights yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {isTr
                ? 'Veri ekledikçe hayvanının sağlık analizini göstermeye başlarız.'
                : "Add some health data and we'll start analyzing your pet's trends."}
            </Text>
            {onEmptyCta ? (
              <Pressable style={styles.emptyCtaBtn} onPress={onEmptyCta}>
                <Text style={styles.emptyCtaText}>{isTr ? 'Kilo Ekle →' : 'Log Weight →'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: 56, paddingHorizontal: 22, paddingBottom: 120, gap: 14 },

  // Header
  headerRow: { marginBottom: 4 },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.7,
    lineHeight: 36,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.outlineVariant,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  // Stats grid — 2 columns
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.055)',
    shadowColor: C.onSurface,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.onSurface,
    letterSpacing: -0.3,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.outlineVariant,
    textTransform: 'uppercase',
  },
  statSub: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
    color: C.onSurfaceVariant,
    fontWeight: '500',
  },

  // Insights list
  insightsList: { gap: 10 },
  insightCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.055)',
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
    shadowColor: C.onSurface,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  insightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  insightTypeText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.onSurface,
  },
  priorityPill: {
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  insightMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    fontWeight: '500',
  },
  insightActionBtn: {
    alignSelf: 'flex-start',
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eaf2ea',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

  // Empty state
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.055)',
    padding: 24,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.onSurface,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyCtaBtn: {
    marginTop: 16,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e9ffe6',
  },
});
