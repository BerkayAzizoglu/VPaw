import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type VaccinationsScreenProps = {
  onBack: () => void;
};

type HistoryItem = {
  name: string;
  subtitle: string;
  status: 'overdue' | 'dueSoon' | 'upToDate';
  dueDate: string;
  tint?: 'danger' | 'neutral';
};

const HISTORY: HistoryItem[] = [
  {
    name: 'Bordetella',
    subtitle: 'Kennel Cough',
    status: 'overdue',
    dueDate: 'Feb 20, 2026',
    tint: 'danger',
  },
  {
    name: 'Rabies',
    subtitle: '1-year vaccine',
    status: 'dueSoon',
    dueDate: 'Apr 12, 2026',
    tint: 'neutral',
  },
  {
    name: 'DHPP',
    subtitle: 'Distemper, Parvo, etc.',
    status: 'upToDate',
    dueDate: 'Jan 15, 2027',
    tint: 'neutral',
  },
  {
    name: 'Leptospirosis',
    subtitle: 'Bacterial infection',
    status: 'upToDate',
    dueDate: 'Mar 10, 2027',
    tint: 'neutral',
  },
];

function Icon({ kind, size = 22, color = '#7a7a7a' }: { kind: 'back' | 'shield' | 'warning' | 'clock' | 'check' | 'syringe' | 'arrow'; size?: number; color?: string }) {
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'shield') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3.8L18 6.1V11.3C18 15 15.5 18 12 20.2C8.5 18 6 15 6 11.3V6.1L12 3.8Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'warning') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8.2V12.2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx="12" cy="15.8" r="1" fill={color} />
      </Svg>
    );
  }

  if (kind === 'clock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8V12L14.8 13.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'check') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 12.2L10.2 15.6L17.5 8.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'arrow') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6L15 12L9 18" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 5.5L18.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M6 18L14.7 9.3L17.7 12.3L9 21H6V18Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Path d="M12 12L14 14M9.8 14.2L11.8 16.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

function StatusPill({ status }: { status: HistoryItem['status'] }) {
  if (status === 'overdue') {
    return (
      <View style={[styles.pill, styles.pillDanger]}>
        <Text style={[styles.pillText, styles.pillTextDanger]}>Overdue</Text>
      </View>
    );
  }

  if (status === 'dueSoon') {
    return (
      <View style={[styles.pill, styles.pillWarn]}>
        <Text style={[styles.pillText, styles.pillTextWarn]}>Due soon</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pill, styles.pillSafe]}>
      <Text style={[styles.pillText, styles.pillTextSafe]}>Up to date</Text>
    </View>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const iconColor = item.status === 'overdue' ? '#c96a6a' : item.status === 'dueSoon' ? '#c48d42' : '#718562';
  const iconKind = item.status === 'overdue' ? 'warning' : item.status === 'dueSoon' ? 'clock' : 'shield';

  return (
    <View style={[styles.historyCard, item.tint === 'danger' ? styles.historyCardDanger : styles.historyCardNeutral]}>
      <View style={styles.historyTop}>
        <View style={styles.historyLeft}>
          <View style={[styles.historyIconWrap, item.status === 'overdue' ? styles.historyIconDanger : styles.historyIconNeutral]}>
            <Icon kind={iconKind} size={22} color={iconColor} />
          </View>
          <View>
            <Text style={styles.historyTitle}>{item.name}</Text>
            <Text style={styles.historySubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <StatusPill status={item.status} />
      </View>

      <View style={styles.historyDivider} />

      <View style={styles.historyBottom}>
        <Text style={styles.historyDueLabel}>Due Date</Text>
        <Text style={styles.historyDueValue}>{item.dueDate}</Text>
      </View>
    </View>
  );
}

export default function VaccinationsScreen({ onBack }: VaccinationsScreenProps) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#7a7a7a" />
          </Pressable>
          <Text style={styles.headerTitle}>Vaccinations</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.attentionCard}>
          <View style={styles.attentionTop}>
            <View style={styles.attentionTexts}>
              <Text style={styles.attentionTitle}>Needs{`\n`}Attention</Text>
              <Text style={styles.attentionSub}>Let's ensure your pet{`\n`}stays fully protected and{`\n`}healthy.</Text>
            </View>
            <View style={styles.attentionIconWrap}>
              <Icon kind="shield" size={28} color="#c96a6a" />
            </View>
          </View>

          <View style={styles.attentionDivider} />

          <View style={styles.attentionPillsRow}>
            <View style={[styles.pill, styles.pillDanger]}>
              <Icon kind="warning" size={15} color="#b55858" />
              <Text style={[styles.pillText, styles.pillTextDanger]}>1 Overdue</Text>
            </View>
            <View style={[styles.pill, styles.pillWarn]}>
              <Icon kind="clock" size={15} color="#ad762d" />
              <Text style={[styles.pillText, styles.pillTextWarn]}>1 Due soon</Text>
            </View>
          </View>

          <Pressable style={styles.resolveLink}>
            <Text style={styles.resolveText}>Resolve</Text>
            <Icon kind="arrow" size={16} color="#c96a6a" />
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>NEXT UP</Text>
        <View style={styles.nextCard}>
          <View style={styles.nextAccent} />
          <View style={styles.nextIconWrap}>
            <Icon kind="syringe" size={28} color="#c48d42" />
          </View>
          <View style={styles.nextMain}>
            <Text style={styles.nextTitle}>Rabies</Text>
            <Text style={styles.nextSub}>1-year vaccine</Text>
          </View>
          <View style={styles.nextRight}>
            <Text style={styles.nextDate}>Apr 12</Text>
            <Text style={styles.nextSoon}>in 3 weeks</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>VACCINE HISTORY</Text>
        <View style={styles.historyList}>
          {HISTORY.map((item) => (
            <HistoryCard key={item.name} item={item} />
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.addBtn}>
        <Text style={styles.addPlus}>+</Text>
        <Text style={styles.addText}>Add Vaccination</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  content: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 16,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f1f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.4,
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  attentionCard: {
    marginTop: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f5ece1',
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  attentionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attentionTexts: {
    flex: 1,
    paddingRight: 12,
  },
  attentionTitle: {
    fontSize: 39,
    lineHeight: 49,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.6,
  },
  attentionSub: {
    marginTop: 8,
    fontSize: 23,
    lineHeight: 31,
    color: '#787878',
    fontWeight: '500',
  },
  attentionIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5e3e3',
    backgroundColor: '#fdf3f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionDivider: {
    marginTop: 18,
    height: 1,
    backgroundColor: 'rgba(245,236,225,0.7)',
  },
  attentionPillsRow: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  pillDanger: {
    backgroundColor: '#fdf3f3',
    borderColor: '#f5e3e3',
  },
  pillWarn: {
    backgroundColor: '#fcf6ee',
    borderColor: '#f2ebd9',
  },
  pillSafe: {
    backgroundColor: '#f4f7f2',
    borderColor: '#e6eddc',
  },
  pillText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pillTextDanger: {
    color: '#b55858',
  },
  pillTextWarn: {
    color: '#ad762d',
  },
  pillTextSafe: {
    color: '#718562',
  },
  resolveLink: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  resolveText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#c96a6a',
  },
  sectionLabel: {
    marginTop: 2,
    marginLeft: 4,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#787878',
    letterSpacing: 1.4,
  },
  nextCard: {
    height: 122,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  nextAccent: {
    position: 'absolute',
    left: 0,
    top: 1,
    bottom: 1,
    width: 6,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    backgroundColor: 'rgba(196,141,66,0.9)',
  },
  nextIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fcf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  nextMain: {
    flex: 1,
    gap: 2,
  },
  nextTitle: {
    fontSize: 29,
    lineHeight: 35,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  nextSub: {
    fontSize: 15,
    lineHeight: 23,
    color: '#787878',
    fontWeight: '500',
  },
  nextRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
    gap: 4,
  },
  nextDate: {
    fontSize: 18,
    lineHeight: 27,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  nextSoon: {
    fontSize: 14,
    lineHeight: 21,
    color: '#c48d42',
    fontWeight: '600',
  },
  historyList: {
    gap: 16,
  },
  historyCard: {
    height: 146,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 21,
    paddingVertical: 21,
  },
  historyCardDanger: {
    borderColor: '#f5e3e3',
    shadowColor: '#c96a6a',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  historyCardNeutral: {
    borderColor: 'rgba(0,0,0,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  historyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconDanger: {
    backgroundColor: '#fdf3f3',
  },
  historyIconNeutral: {
    backgroundColor: '#faf9f8',
  },
  historyTitle: {
    fontSize: 17,
    lineHeight: 25,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  historySubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '500',
  },
  historyDivider: {
    marginTop: 16,
    marginBottom: 16,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  historyBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  historyDueLabel: {
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '500',
  },
  historyDueValue: {
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(45,45,45,0.9)',
    fontWeight: '600',
  },
  addBtn: {
    position: 'absolute',
    left: 88,
    right: 88,
    bottom: 44,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  addPlus: {
    fontSize: 24,
    lineHeight: 24,
    color: '#faf8f5',
    fontWeight: '400',
    marginTop: -1,
  },
  addText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#faf8f5',
    fontWeight: '700',
  },
});
