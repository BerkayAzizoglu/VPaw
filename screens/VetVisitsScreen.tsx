import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useLocale } from '../hooks/useLocale';
import { getWording } from '../lib/wording';
import ScreenStateCard, { type ScreenStateMode } from '../components/ScreenStateCard';

type VetVisitsScreenProps = {
  onBack: () => void;
  onAddVisit?: () => void;
  status?: 'ready' | ScreenStateMode;
  onRetry?: () => void;
  visits?: VisitItem[];
};

export type VisitItem = {
  id: string;
  icon: 'stethoscope' | 'pulse';
  date: string;
  title: string;
  clinic: string;
  doctor: string;
  amount?: string;
  paymentText?: string;
  attachments: string[];
  attachPlaceholder?: boolean;
};

function Icon({ kind, size = 18, color = '#7a7a7a' }: { kind: 'back' | 'stethoscope' | 'wallet' | 'clinic' | 'file' | 'plus' | 'pulse'; size?: number; color?: string }) {
  if (kind === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'stethoscope') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4V8.2C7 10.8 8.8 12.8 11.1 13.3V15.1C11.1 17.2 12.8 19 14.9 19C17 19 18.7 17.3 18.7 15.2V14.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M14.8 4V8.2C14.8 10.9 13 13 10.5 13.3" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="18.9" cy="12.8" r="2.2" stroke={color} strokeWidth={1.9} />
      </Svg>
    );
  }

  if (kind === 'pulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3.8 12H8.3L10.2 8.5L13 16L15.1 11.5H20.2" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (kind === 'wallet') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 7.5H17.5C18.6 7.5 19.5 8.4 19.5 9.5V15.5C19.5 16.6 18.6 17.5 17.5 17.5H6.5C5.4 17.5 4.5 16.6 4.5 15.5V8.5C4.5 7.9 4.9 7.5 5.5 7.5Z" stroke={color} strokeWidth={1.8} />
        <Path d="M16 12H19.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'clinic') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6.5 18.5V9.2L10.5 6.8L14.5 9.2V18.5" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d="M3.8 18.5H20.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M9 12.2H12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M10.5 10.7V13.7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'file') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.2 4.8H15.4L18.8 8.2V19.2H7.2V4.8Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Path d="M15.2 4.8V8.2H18.8" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
        <Line x1="9.6" y1="12" x2="16" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6V18M6 12H18" stroke={color} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}

function StatPill({ icon, text }: { icon: 'stethoscope' | 'wallet'; text: string }) {
  return (
    <View style={styles.statPill}>
      <Icon kind={icon} size={14} color="#6f7b63" />
      <Text style={styles.statPillText}>{text}</Text>
    </View>
  );
}

function AttachmentChip({ label }: { label: string }) {
  return (
    <Pressable style={styles.attachmentChip}>
      <Icon kind="file" size={14} color="#757575" />
      <Text style={styles.attachmentText}>{label}</Text>
    </Pressable>
  );
}

function TimelineCard({ item, attachDocuments }: { item: VisitItem; attachDocuments: string }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineIconWrap}>
        <Icon kind={item.icon} size={18} color="#6a7b5f" />
      </View>

      <View style={styles.visitCard}>
        <View style={styles.cardTopRow}>
          <View style={styles.dateTag}>
            <Text style={styles.dateTagText}>{item.date.toUpperCase()}</Text>
          </View>

          {item.amount ? (
            <View style={styles.amountTag}>
              <Icon kind="wallet" size={14} color="#5c6b54" />
              <Text style={styles.amountText}>{item.amount}</Text>
            </View>
          ) : (
            <View style={styles.paymentTag}>
              <Icon kind="wallet" size={12} color="#b55858" />
              <Text style={styles.paymentText}>{item.paymentText}</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.metaRow}>
          <Icon kind="clinic" size={15} color="#9a9a9a" />
          <Text style={styles.metaText}>{item.clinic}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaDot} />
          <Text style={styles.metaDoctor}>{item.doctor}</Text>
        </View>

        <View style={styles.cardDivider} />

        {item.attachPlaceholder ? (
          <Pressable style={styles.attachPlaceholder}>
            <Text style={styles.attachPlaceholderText}>{attachDocuments}</Text>
          </Pressable>
        ) : (
          <View style={styles.attachmentsWrap}>
            {item.attachments.map((attachment) => (
              <AttachmentChip key={attachment} label={attachment} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default function VetVisitsScreen({ onBack, onAddVisit, status = 'ready', onRetry, visits }: VetVisitsScreenProps) {
  const { locale } = useLocale();
  const copy = getWording(locale).vetVisits;
  const isTr = locale === 'tr';

  const fallbackVisits: VisitItem[] = [
    {
      id: 'v1',
      icon: 'stethoscope',
      date: copy.visits.v1Date,
      title: copy.visits.v1Title,
      clinic: copy.visits.v1Clinic,
      doctor: copy.visits.v1Doctor,
      amount: '$145.00',
      attachments: ['Checkup_Results...', 'Invoice.pdf'],
    },
    {
      id: 'v2',
      icon: 'pulse',
      date: copy.visits.v2Date,
      title: copy.visits.v2Title,
      clinic: copy.visits.v2Clinic,
      doctor: copy.visits.v2Doctor,
      paymentText: copy.addPayment,
      attachments: ['Prescription.pd...'],
    },
    {
      id: 'v3',
      icon: 'stethoscope',
      date: copy.visits.v3Date,
      title: copy.visits.v3Title,
      clinic: copy.visits.v3Clinic,
      doctor: copy.visits.v3Doctor,
      amount: '$120.00',
      attachments: [],
      attachPlaceholder: true,
    },
  ];

  const visitsData = visits ?? fallbackVisits;
  const totalAmount = visitsData.reduce((sum, item) => {
    const raw = item.amount ? Number(item.amount.replace(/[^0-9.-]/g, '')) : 0;
    return sum + (Number.isFinite(raw) ? raw : 0);
  }, 0);
  const visitsCountText = isTr ? `${visitsData.length} Ziyaret` : `${visitsData.length} Visits`;
  const totalCostText = totalAmount > 0 ? `$${totalAmount.toFixed(0)} ${isTr ? 'Toplam' : 'Total'}` : copy.totalCost;

  const screenState = status;
  const showMainContent = screenState === 'ready';
  const showAddButton = screenState !== 'loading' && screenState !== 'error';
  const stateTitle = screenState === 'loading'
    ? (isTr ? 'Ziyaretler yükleniyor' : 'Loading vet visits')
    : screenState === 'empty'
      ? (isTr ? 'Henüz ziyaret kaydý yok' : 'No vet visits yet')
      : (isTr ? 'Ziyaret kayýtlarý alýnamadý' : 'Could not load vet visits');
  const stateBody = screenState === 'loading'
    ? (isTr ? 'Geçmiþ kayýtlar hazýrlanýyor, lütfen bekleyin.' : 'Preparing your medical history, please wait.')
    : screenState === 'empty'
      ? (isTr ? 'Ýlk veteriner ziyaretinizi eklediðinizde bu alan otomatik olarak dolacaktýr.' : 'This area will fill automatically once your first visit is added.')
      : (isTr ? 'Baðlantýyý kontrol edip tekrar deneyin.' : 'Please check your connection and try again.');

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Icon kind="back" size={22} color="#7a7a7a" />
          </Pressable>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {showMainContent ? (
          <>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{copy.medicalHistory}</Text>
              <View style={styles.statsRow}>
                <StatPill icon="stethoscope" text={visitsCountText} />
                <StatPill icon="wallet" text={totalCostText} />
              </View>
            </View>

            <View style={styles.timelineWrap}>
              <View style={styles.timelineLine} />
              <View style={styles.cardsColumn}>
                {visitsData.map((item) => (
                  <TimelineCard key={item.id} item={item} attachDocuments={copy.attachDocuments} />
                ))}
              </View>
            </View>
          </>
        ) : (
          <ScreenStateCard
            mode={screenState as ScreenStateMode}
            title={stateTitle}
            body={stateBody}
            actionLabel={screenState === 'error' ? (isTr ? 'Tekrar Dene' : 'Retry') : undefined}
            onAction={screenState === 'error' ? (onRetry ?? (() => Alert.alert(isTr ? 'Tekrar Dene' : 'Retry', isTr ? 'Lütfen kýsa bir süre sonra tekrar deneyin.' : 'Please try again in a moment.'))) : undefined}
          />
        )}
      </ScrollView>

      {showAddButton ? (
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            if (onAddVisit) {
              onAddVisit();
              return;
            }
            Alert.alert(
              isTr ? 'Yakýnda' : 'Coming soon',
              isTr ? 'Ziyaret ekleme akýþý bir sonraki adýmda aktif edilecek.' : 'Add visit flow will be enabled in the next step.',
            );
          }}
        >
          <Icon kind="plus" size={20} color="#faf8f5" />
          <Text style={styles.addBtnText}>{copy.addVisit}</Text>
        </Pressable>
      ) : null}
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
    gap: 24,
  },
  headerRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f1ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.4,
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  titleWrap: {
    gap: 10,
    paddingLeft: 4,
  },
  title: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    height: 34,
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
  timelineWrap: {
    position: 'relative',
    paddingLeft: 0,
  },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 14,
    bottom: 12,
    width: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardsColumn: {
    gap: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#faf9f8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
  visitCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTag: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#faf9f8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateTagText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#787878',
  },
  amountTag: {
    height: 34,
    borderRadius: 999,
    backgroundColor: '#f4f7f2',
    borderWidth: 1,
    borderColor: '#dce3d8',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#718562',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  amountText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    color: '#5c6b54',
  },
  paymentTag: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fdf3f3',
    borderWidth: 1,
    borderColor: '#f5e3e3',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 128,
    shadowColor: '#c96a6a',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  paymentText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: '#b55858',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 37,
    lineHeight: 43,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#2d2d2d',
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '500',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,120,0.4)',
    marginLeft: 6,
  },
  metaDoctor: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(45,45,45,0.8)',
    fontWeight: '500',
  },
  cardDivider: {
    marginTop: 16,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  attachmentsWrap: {
    marginTop: 14,
    gap: 8,
  },
  attachmentChip: {
    alignSelf: 'flex-start',
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(232,227,219,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(45,45,45,0.8)',
    fontWeight: '600',
  },
  attachPlaceholder: {
    marginTop: 14,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachPlaceholderText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#787878',
    fontWeight: '500',
  },
  addBtn: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    height: 56,
    borderRadius: 999,
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  addBtnText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#faf8f5',
    letterSpacing: 0.4,
  },
});
