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
import { useLocale } from '../hooks/useLocale';
import { getWording } from '../lib/wording';

type HealthRecordsScreenProps = {
  onBack: () => void;
};

function Icon({ kind, size = 20, color = '#7a7a7a' }: { kind: 'back' | 'record' | 'pulse' | 'clock' | 'alert' | 'plus'; size?: number; color?: string }) {
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'record') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4.8H15.5L19 8.2V19.2H7V4.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M15.4 4.8V8.3H19" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M9.3 12H16M9.3 15.2H16" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'pulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3.5 12H8L10 8L13 16L15.2 11.5H20.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'clock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
        <Path d="M12 8V12L14.6 13.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'plus') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.8} />
      <Path d="M12 8V12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="12" cy="15.8" r="1" fill={color} />
    </Svg>
  );
}

function StatPill({ kind, text }: { kind: 'record' | 'pulse' | 'clock'; text: string }) {
  const iconColor = kind === 'pulse' ? '#c96a6a' : '#c48d42';
  const finalKind = kind === 'record' ? 'record' : kind;

  return (
    <View style={styles.statPill}>
      <Icon kind={finalKind as any} size={15} color={iconColor} />
      <Text style={styles.statPillText}>{text}</Text>
    </View>
  );
}

export default function HealthRecordsScreen({ onBack }: HealthRecordsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).healthRecords;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#7a7a7a" />
          </Pressable>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <View style={styles.headerPh} />
        </View>

        <Text style={styles.pageTitle}>{copy.overview}</Text>

        <View style={styles.statsRow}>
          <StatPill kind="record" text={copy.recordsCount} />
          <StatPill kind="pulse" text={copy.activeCount} />
          <StatPill kind="clock" text={copy.upToDate} />
        </View>

        <View style={styles.segmentWrap}>
          <View style={styles.segmentActive}><Text style={styles.segmentActiveText}>{copy.allergies}</Text></View>
          <Text style={styles.segmentText}>{copy.diagnoses}</Text>
          <Text style={styles.segmentText}>{copy.labResults}</Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeadText}>{copy.activeSection}</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.activeCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconDanger}><Icon kind="alert" size={22} color="#c96a6a" /></View>
              <View>
                <Text style={styles.cardTitle}>{copy.activeTitle}</Text>
                <Text style={styles.cardDate}>{copy.activeDate}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardBody}>{copy.activeBody}</Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottomRow}>
            <View style={styles.activePill}><Text style={styles.activePillText}>{copy.activeBadge}</Text></View>
            <View style={styles.severityWrap}>
              <View style={styles.severityDots}>
                <View style={styles.dotDanger} />
                <View style={styles.dotDanger} />
                <View style={styles.dotDanger} />
              </View>
              <Text style={styles.severityText}>{copy.activeSeverity}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionHeadText}>{copy.historySection}</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.historyCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardIconNeutral}><Icon kind="alert" size={22} color="#9a9a9a" /></View>
              <View>
                <Text style={styles.cardTitleMuted}>{copy.historyTitle}</Text>
                <Text style={styles.cardDateMuted}>{copy.historyDate}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardBodyMuted}>{copy.historyBody}</Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottomRow}>
            <View style={styles.resolvedPill}><Text style={styles.resolvedPillText}>{copy.resolvedBadge}</Text></View>
            <View style={styles.severityWrapMuted}>
              <View style={styles.severityDots}>
                <View style={styles.dotWarn} />
                <View style={styles.dotWarn} />
                <View style={styles.dotEmpty} />
              </View>
              <Text style={styles.severityText}>{copy.historySeverity}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.addBtn}>
        <Icon kind="plus" size={20} color="#faf8f5" />
        <Text style={styles.addBtnText}>{copy.addRecord}</Text>
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
    paddingBottom: 110,
    gap: 16,
  },
  headerRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f1ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    color: '#2d2d2d',
    fontWeight: '600',
  },
  headerPh: {
    width: 40,
    height: 40,
  },
  pageTitle: {
    marginTop: 8,
    fontSize: 40,
    lineHeight: 46,
    color: '#2d2d2d',
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statPill: {
    height: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statPillText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(45,45,45,0.8)',
    fontWeight: '700',
  },
  segmentWrap: {
    marginTop: 8,
    height: 49,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  segmentActive: {
    width: 107,
    height: 41,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentActiveText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  segmentText: {
    width: 107,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '700',
  },
  sectionHead: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeadText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '800',
    letterSpacing: 0.65,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  activeCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#fff',
    paddingHorizontal: 21,
    paddingTop: 21,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  historyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#fff',
    paddingHorizontal: 21,
    paddingTop: 21,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconDanger: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#faf9f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconNeutral: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#faf9f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 20,
    lineHeight: 24,
    color: '#787878',
    fontWeight: '600',
  },
  cardTitleMuted: {
    fontSize: 34,
    lineHeight: 40,
    color: 'rgba(45,45,45,0.7)',
    fontWeight: '700',
  },
  cardDateMuted: {
    fontSize: 28,
    lineHeight: 30,
    color: '#787878',
    fontWeight: '600',
  },
  cardBody: {
    marginTop: 14,
    marginLeft: 60,
    fontSize: 28,
    lineHeight: 38,
    color: '#787878',
  },
  cardBodyMuted: {
    marginTop: 14,
    marginLeft: 60,
    fontSize: 28,
    lineHeight: 38,
    color: 'rgba(120,120,120,0.8)',
  },
  cardDivider: {
    marginTop: 16,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginLeft: 60,
  },
  cardBottomRow: {
    marginTop: 12,
    marginLeft: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activePill: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f5e3e3',
    backgroundColor: '#fff0f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#c96a6a',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  activePillText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#c96a6a',
    fontWeight: '800',
  },
  resolvedPill: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(228,235,224,0.6)',
    backgroundColor: 'rgba(244,247,242,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedPillText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(92,107,84,0.8)',
    fontWeight: '600',
  },
  severityWrap: {
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#faf9f8',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityWrapMuted: {
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#faf9f8',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.7,
  },
  severityDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  dotDanger: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c96a6a',
  },
  dotWarn: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(196,141,66,0.5)',
  },
  dotEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  severityText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#787878',
    fontWeight: '600',
  },
  addBtn: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  addBtnText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#fff',
    fontWeight: '600',
  },
});
