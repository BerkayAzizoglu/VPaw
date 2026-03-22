import React, { useMemo, useRef, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';

type VaccinationsScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  onResolve?: () => void;
  onAddVaccination?: () => void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  historyItems?: VaccinationsHistoryItem[];
  attentionCounts?: VaccinationsAttentionCounts;
  nextUpData?: VaccinationsNextUpData;
};

export type VaccinationsHistoryItem = {
  name: string;
  subtitle: string;
  status: 'overdue' | 'dueSoon' | 'upToDate';
  dueDate: string;
  tint?: 'danger' | 'neutral';
};

export type VaccinationsAttentionCounts = {
  overdueCount: number;
  dueSoonCount: number;
};

export type VaccinationsNextUpData = {
  name: string;
  subtitle: string;
  date: string;
  inWeeks: string;
};

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

function StatusPill({ status, labels }: { status: VaccinationsHistoryItem['status']; labels: { overdue: string; dueSoon: string; upToDate: string } }) {
  if (status === 'overdue') {
    return (
      <View style={[styles.pill, styles.pillDanger]}>
        <Text style={[styles.pillText, styles.pillTextDanger]}>{labels.overdue}</Text>
      </View>
    );
  }

  if (status === 'dueSoon') {
    return (
      <View style={[styles.pill, styles.pillWarn]}>
        <Text style={[styles.pillText, styles.pillTextWarn]}>{labels.dueSoon}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pill, styles.pillSafe]}>
      <Text style={[styles.pillText, styles.pillTextSafe]}>{labels.upToDate}</Text>
    </View>
  );
}

function HistoryCard({ item, statusLabels, dueDateLabel }: { item: VaccinationsHistoryItem; statusLabels: { overdue: string; dueSoon: string; upToDate: string }; dueDateLabel: string }) {
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
        <StatusPill status={item.status} labels={statusLabels} />
      </View>

      <View style={styles.historyDivider} />

      <View style={styles.historyBottom}>
        <Text style={styles.historyDueLabel}>{dueDateLabel}</Text>
        <Text style={styles.historyDueValue}>{item.dueDate}</Text>
      </View>
    </View>
  );
}

export default function VaccinationsScreen({
  onBack,
  backPreview,
  onResolve,
  onAddVaccination,
  status = 'ready',
  onRetry,
  historyItems,
  attentionCounts,
  nextUpData,
}: VaccinationsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).vaccinations;
  const isTr = locale === 'tr';

  const fallbackHistory: VaccinationsHistoryItem[] = [
    { name: 'Bordetella', subtitle: copy.history.bordetellaSub, status: 'overdue', dueDate: copy.history.bordetellaDate, tint: 'danger' },
    { name: copy.nextCard.name, subtitle: copy.history.rabiesSub, status: 'dueSoon', dueDate: copy.history.rabiesDate, tint: 'neutral' },
    { name: 'DHPP', subtitle: copy.history.dhppSub, status: 'upToDate', dueDate: copy.history.dhppDate, tint: 'neutral' },
    { name: 'Leptospirosis', subtitle: copy.history.leptoSub, status: 'upToDate', dueDate: copy.history.leptoDate, tint: 'neutral' },
  ];
  const history = historyItems && historyItems.length > 0 ? historyItems : fallbackHistory;
  const overdueLabel = attentionCounts ? `${attentionCounts.overdueCount} ${copy.statuses.overdue}` : copy.oneOverdue;
  const dueSoonLabel = attentionCounts ? `${attentionCounts.dueSoonCount} ${copy.statuses.dueSoon}` : copy.oneDueSoon;
  const nextCard = nextUpData ?? copy.nextCard;

  const screenState = status;
  const showMainContent = screenState === 'ready';
  const showAddButton = screenState !== 'loading' && screenState !== 'error';
  const stateTitle = screenState === 'loading'
    ? (isTr ? 'A��lar y�kleniyor' : 'Loading vaccinations')
    : screenState === 'empty'
      ? (isTr ? 'Hen�z a�� kayd� yok' : 'No vaccination records yet')
      : (isTr ? 'A�� kay�tlar� al�namad�' : 'Could not load vaccinations');
  const stateBody = screenState === 'loading'
    ? (isTr ? 'Kay�tlar haz�rlan�yor, l�tfen k�sa bir s�re bekleyin.' : 'Preparing records, please wait a moment.')
    : screenState === 'empty'
      ? (isTr ? '�lk a�� kayd�n� ekledi�inizde bu alan otomatik olarak dolacakt�r.' : 'This area will populate automatically once you add the first vaccination.')
      : (isTr ? 'Ba�lant�y� kontrol edip tekrar deneyin.' : 'Please check your connection and try again.');

  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePanResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.frontLayer, swipePanResponder.frontLayerStyle]} {...swipePanResponder.panHandlers}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={!swipePanResponder.isSwiping}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#7a7a7a" />
          </Pressable>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {showMainContent ? (
          <>
            <View style={styles.attentionCard}>
              <View style={styles.attentionTop}>
                <View style={styles.attentionTexts}>
                  <Text style={styles.attentionTitle}>{copy.needsAttention}</Text>
                  <Text style={styles.attentionSub}>{copy.needsAttentionBody}</Text>
                </View>
                <View style={styles.attentionIconWrap}>
                  <Icon kind="shield" size={28} color="#c96a6a" />
                </View>
              </View>

              <View style={styles.attentionDivider} />

              <View style={styles.attentionPillsRow}>
                <View style={[styles.pill, styles.pillDanger]}>
                  <Icon kind="warning" size={15} color="#b55858" />
                  <Text style={[styles.pillText, styles.pillTextDanger]}>{overdueLabel}</Text>
                </View>
                <View style={[styles.pill, styles.pillWarn]}>
                  <Icon kind="clock" size={15} color="#ad762d" />
                  <Text style={[styles.pillText, styles.pillTextWarn]}>{dueSoonLabel}</Text>
                </View>
              </View>

              <Pressable
                style={styles.resolveLink}
                onPress={() => {
                  if (onResolve) {
                    onResolve();
                    return;
                  }
                  Alert.alert(
                    isTr ? 'Yak�nda' : 'Coming soon',
                    isTr ? 'Bu i�lem bir sonraki ad�mda aktif edilecek.' : 'This action will be enabled in the next step.',
                  );
                }}
              >
                <Text style={styles.resolveText}>{copy.resolve}</Text>
                <Icon kind="arrow" size={16} color="#c96a6a" />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>{copy.nextUp}</Text>
            <View style={styles.nextCard}>
              <View style={styles.nextAccent} />
              <View style={styles.nextIconWrap}>
                <Icon kind="syringe" size={28} color="#c48d42" />
              </View>
              <View style={styles.nextMain}>
                <Text style={styles.nextTitle}>{nextCard.name}</Text>
                <Text style={styles.nextSub}>{nextCard.subtitle}</Text>
              </View>
              <View style={styles.nextRight}>
                <Text style={styles.nextDate}>{nextCard.date}</Text>
                <Text style={styles.nextSoon}>{nextCard.inWeeks}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>{copy.vaccineHistory}</Text>
            <View style={styles.historyList}>
              {history.map((item) => (
                <HistoryCard key={`${item.name}-${item.dueDate}`} item={item} statusLabels={copy.statuses} dueDateLabel={copy.dueDate} />
              ))}
            </View>
          </>
        ) : (
          <ScreenStateCard
            mode={screenState as ScreenStateMode}
            title={stateTitle}
            body={stateBody}
            actionLabel={screenState === 'error' ? (isTr ? 'Tekrar Dene' : 'Retry') : undefined}
            onAction={screenState === 'error' ? (onRetry ?? (() => Alert.alert(isTr ? 'Tekrar Dene' : 'Retry', isTr ? 'L�tfen k�sa bir s�re sonra tekrar deneyin.' : 'Please try again in a moment.'))) : undefined}
          />
        )}
      </ScrollView>

      {showAddButton ? (
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            if (onAddVaccination) {
              onAddVaccination();
              return;
            }
            Alert.alert(
              isTr ? 'Yak�nda' : 'Coming soon',
              isTr ? 'A�� ekleme ak��� bir sonraki ad�mda aktif edilecek.' : 'Add vaccination flow will be enabled in the next step.',
            );
          }}
        >
          <Text style={styles.addPlus}>+</Text>
          <Text style={styles.addText}>{copy.addVaccination}</Text>
        </Pressable>
      ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  backLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  frontLayer: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 110,
    gap: 18,
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
    fontSize: 28,
    lineHeight: 32,
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f5ece1',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
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
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.6,
  },
  attentionSub: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: '#787878',
    fontWeight: '500',
  },
  attentionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    height: 32,
    borderRadius: 18,
    paddingHorizontal: 10,
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
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#c96a6a',
  },
  sectionLabel: {
    marginTop: 6,
    marginLeft: 4,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: '#787878',
    letterSpacing: 1.4,
  },
  nextCard: {
    height: 116,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
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
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fcf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  nextMain: {
    flex: 1,
    gap: 2,
  },
  nextTitle: {
    fontSize: 24,
    lineHeight: 30,
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
    fontSize: 16,
    lineHeight: 24,
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
    gap: 12,
  },
  historyCard: {
    minHeight: 140,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 21,
    paddingVertical: 18,
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
    gap: 12,
    flex: 1,
  },
  historyIconWrap: {
    width: 44,
    height: 44,
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
    alignSelf: 'center',
    bottom: 28,
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 30,
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

