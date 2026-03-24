import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View, Image, RefreshControl, Switch } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RefreshCw, PawPrint } from 'lucide-react-native';
import type { PetProfile } from '../components/AuthGate';
import type { WeightPoint } from './WeightTrackingScreen';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import type { HealthCardSummary } from '../lib/healthEventAdapters';
import type { PetPassportExportSelection } from '../lib/petHealthPassportPdf';

type PetHealthPassportScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  pet: PetProfile;
  weightEntries: WeightPoint[];
  onOpenVaccinations?: () => void;
  onOpenVetVisits?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenWeight?: () => void;
  onOpenPremium?: () => void;
  isPremiumPlan?: boolean;
  healthCardSummary?: HealthCardSummary;
  onExportPdf?: (selection: PetPassportExportSelection) => Promise<void> | void;
};

type ExportRowKey = 'summary' | 'vaccines' | 'visits' | 'health' | 'weight' | 'documents';

type ExportRowMeta = {
  key: ExportRowKey;
  icon: 'vaccine' | 'pulse' | 'health' | 'weight' | 'download';
  title: string;
  helper?: string;
  priority?: 'high' | 'normal';
};

function Icon({ kind, size = 20, color = '#6f6f6f' }: { kind: 'back' | 'vaccine' | 'pulse' | 'health' | 'weight' | 'download' | 'lock'; size?: number; color?: string }) {
  if (kind === 'back') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M15 6L9 12L15 18" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (kind === 'lock') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M8 11V7.5C8 5.57 9.57 4 11.5 4S15 5.57 15 7.5V11" stroke={color} strokeWidth={1.8} strokeLinecap="round" /><Path d="M6 11H17C17.55 11 18 11.45 18 12V19C18 19.55 17.55 20 17 20H6C5.45 20 5 19.55 5 19V12C5 11.45 5.45 11 6 11Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" /></Svg>;
  if (kind === 'vaccine') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M14.5 5.5L18.5 9.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" /><Path d="M6 18L14.7 9.3L17.7 12.3L9 21H6V18Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" /></Svg>;
  if (kind === 'pulse') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3.5 12H8L10 8L13 16L15.2 11.5H20.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (kind === 'health') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 20.3C8.7 17.8 5 14.9 5 11.1C5 8.9 6.8 7.2 9 7.2C10.4 7.2 11.6 7.9 12.2 9C12.8 7.9 14 7.2 15.4 7.2C17.6 7.2 19.4 8.9 19.4 11.1C19.4 14.9 15.7 17.8 12.4 20.3" stroke={color} strokeWidth={1.8} strokeLinejoin="round" /></Svg>;
  if (kind === 'weight') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M7 4.8H15.5L19 8.2V19.2H7V4.8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" /><Path d="M9.4 12H16.4" stroke={color} strokeWidth={1.6} strokeLinecap="round" /><Path d="M9.4 15.2H16.4" stroke={color} strokeWidth={1.6} strokeLinecap="round" /></Svg>;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 6V14" stroke={color} strokeWidth={2} strokeLinecap="round" /><Path d="M8.5 10.5L12 14L15.5 10.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M6 18.2H18" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

function PawSwitch({ value, onValueChange, disabled }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.pawSwitchWrap}>
      {value ? (
        <View style={styles.pawMark} pointerEvents="none">
          <PawPrint size={9} color="#5f7f59" strokeWidth={3.1} />
        </View>
      ) : null}
      <View style={styles.pawSwitchScale}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          thumbColor={value ? '#ffffff' : '#f4f4f4'}
          trackColor={{ false: '#d8d8d8', true: '#6e8f66' }}
          ios_backgroundColor="#d8d8d8"
        />
      </View>
    </View>
  );
}

export default function PetHealthPassportScreen({
  onBack,
  backPreview,
  pet,
  weightEntries,
  onOpenVaccinations,
  onOpenVetVisits,
  onOpenHealthRecords,
  onOpenWeight,
  onOpenPremium,
  isPremiumPlan = false,
  healthCardSummary,
  onExportPdf,
}: PetHealthPassportScreenProps) {
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const swipePanResponder = useEdgeSwipeBack({ onBack, fullScreenGestureEnabled: true });

  const initialRows = useMemo<Record<ExportRowKey, string[]>>(() => {
    const noRecords = isTr ? 'Kayıt yok' : 'No records yet';
    const fallback: Record<ExportRowKey, string[]> = {
      summary: [isTr ? 'Özet kartı eklenecek' : 'Health summary included'],
      vaccines: pet.vaccinations.length ? pet.vaccinations.map((v) => `${v.name} • ${v.date}`) : [noRecords],
      visits: healthCardSummary?.exportRows.visits.length ? healthCardSummary.exportRows.visits : [noRecords],
      health: healthCardSummary?.exportRows.health.length ? healthCardSummary.exportRows.health : [noRecords],
      weight: weightEntries.length ? weightEntries.map((w) => `${w.value.toFixed(1)} kg • ${w.date}`) : [noRecords],
      documents: [isTr ? 'Belge kasasından eklenecek' : 'Included from document vault'],
    };

    if (!healthCardSummary) return fallback;

    return {
      summary: fallback.summary,
      vaccines: healthCardSummary.exportRows.vaccines.length ? healthCardSummary.exportRows.vaccines : fallback.vaccines,
      visits: healthCardSummary.exportRows.visits.length ? healthCardSummary.exportRows.visits : fallback.visits,
      health: healthCardSummary.exportRows.health.length ? healthCardSummary.exportRows.health : fallback.health,
      weight: healthCardSummary.exportRows.weight.length ? healthCardSummary.exportRows.weight : fallback.weight,
      documents: fallback.documents,
    };
  }, [healthCardSummary, pet, weightEntries]);

  const [recordsByRow, setRecordsByRow] = useState<Record<ExportRowKey, string[]>>(initialRows);

  const [sectionIncluded, setSectionIncluded] = useState<Record<ExportRowKey, boolean>>({
    summary: true,
    vaccines: true,
    visits: isPremiumPlan,
    health: isPremiumPlan,
    weight: isPremiumPlan,
    documents: isPremiumPlan,
  });

  useEffect(() => {
    setRecordsByRow(initialRows);
    setSectionIncluded({
      summary: true,
      vaccines: true,
      visits: isPremiumPlan,
      health: isPremiumPlan,
      weight: isPremiumPlan,
      documents: isPremiumPlan,
    });
  }, [initialRows, isPremiumPlan, pet.id]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const latestWeight = weightEntries[weightEntries.length - 1]?.value ?? 0;
  const ageText = isTr ? `${pet.ageYears} yıl` : `${pet.ageYears} years`;

  const rowMeta: Record<ExportRowKey, ExportRowMeta> = {
    summary: { key: 'summary', icon: 'health', title: isTr ? 'Sağlık Özeti' : 'Health Summary', helper: isTr ? 'Ön sayfada temel sağlık özeti yer alır.' : 'Adds a concise overview to the first page.', priority: 'high' },
    vaccines: { key: 'vaccines', icon: 'vaccine', title: isTr ? 'Aşılar' : 'Vaccinations', helper: isTr ? 'Aşı geçmişi ve durum bilgileri.' : 'Vaccine history and status.' },
    visits: { key: 'visits', icon: 'pulse', title: isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits', helper: isTr ? 'Veteriner ziyaretleri zaman çizelgesi.' : 'Chronology of clinic visits.' },
    health: { key: 'health', icon: 'health', title: isTr ? 'Sağlık Kayıtları' : 'Medical Records', helper: isTr ? 'Tanı, test ve klinik notlar.' : 'Diagnoses, tests, and clinical notes.' },
    weight: { key: 'weight', icon: 'weight', title: isTr ? 'Kilo Takibi' : 'Weight Tracking', helper: isTr ? 'Trend grafiği ve kilo özetleri.' : 'Trend chart and weight snapshots.' },
    documents: { key: 'documents', icon: 'download', title: isTr ? 'Belgeleri dahil et' : 'Include documents', helper: isTr ? 'Belgeleri eklemek dosya boyutunu artırabilir.' : 'Including documents may increase file size.' },
  };

  const includeRows = useMemo<ExportRowKey[]>(() => ['summary', 'vaccines', 'visits', 'health', 'weight'], []);
  const selectedCount = useMemo(() => includeRows.filter((key) => sectionIncluded[key]).length + (sectionIncluded.documents ? 1 : 0), [includeRows, sectionIncluded]);

  const handleExportPress = async () => {
    if (!onExportPdf) {
      Alert.alert(isTr ? 'PDF hazır değil' : 'PDF not ready');
      return;
    }

    const selectedForKey = (key: ExportRowKey) => {
      if (!sectionIncluded[key]) return 0;
      return recordsByRow[key]?.length ?? 0;
    };

    const timelineSelectedCount =
      selectedForKey('visits')
      + selectedForKey('health');

    const selection: PetPassportExportSelection = isPremiumPlan
      ? {
          includeSections: {
            summary: true,
            timeline: sectionIncluded.visits || sectionIncluded.health,
            vaccines: sectionIncluded.vaccines,
            weight: sectionIncluded.weight,
            documents: sectionIncluded.documents,
          },
          limits: {
            timeline: timelineSelectedCount,
            vaccines: selectedForKey('vaccines'),
            weight: selectedForKey('weight'),
          },
        }
      : {
          includeSections: {
            summary: false,
            timeline: false,
            vaccines: true,
            weight: false,
            documents: false,
          },
          limits: {
            vaccines: selectedForKey('vaccines'),
          },
        };

    try {
      setIsExporting(true);
      await onExportPdf(selection);
    } finally {
      setIsExporting(false);
    }
  };

  const ensurePremium = () => {
    if (isPremiumPlan) return true;
    if (onOpenPremium) {
      onOpenPremium();
    } else {
      Alert.alert(
        isTr ? 'Premium Özellik' : 'Premium Feature',
        isTr ? 'Free planda PDF dışa aktarmada yalnızca Aşı Kayıtları kullanılabilir.' : 'On Free plan, PDF export includes only Vaccination Records.',
      );
    }
    return false;
  };

  const toggleSection = (key: ExportRowKey) => {
    if (!isPremiumPlan && key !== 'vaccines') {
      ensurePremium();
      return;
    }

    if (!isPremiumPlan && key === 'vaccines') return;

    setSectionIncluded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.screen}>
      {backPreview ? (
        <Animated.View pointerEvents="none" style={[styles.backLayer, swipePanResponder.backLayerStyle]}>
          {backPreview}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.frontLayer, swipePanResponder.frontLayerStyle]} {...swipePanResponder.panHandlers}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!swipePanResponder.isSwiping}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6f6f6f" colors={['#6f6f6f']} />}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={onBack}><Icon kind="back" size={22} /></Pressable>
          <Text style={styles.title}>{isTr ? 'Pet Sağlık Kartı' : 'Pet Health Card'}</Text>
          <View style={styles.backBtnGhost}>{refreshing ? <RefreshCw size={16} color="#6f6f6f" /> : null}</View>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.docPill}><Text style={styles.docPillText}>{isTr ? 'Detaylı Sağlık Dokümanı' : 'Detailed Health Document'}</Text></View>
          <View style={styles.identityTop}>
            <Image source={{ uri: pet.image }} style={styles.petImage} />
            <View style={styles.identityTexts}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petMeta}>{pet.breed}</Text>
              <Text style={styles.petMetaStrong}>{ageText} • {latestWeight.toFixed(1)} kg</Text>
            </View>
          </View>
          <View style={styles.identityDivider} />
          <View style={styles.identityBottom}>
            <View><Text style={styles.identityLabel}>{isTr ? 'MİKROÇİP' : 'MICROCHIP'}</Text><Text style={styles.identityValue}>{pet.microchip}</Text></View>
            <View><Text style={styles.identityLabel}>{isTr ? 'SAHİP' : 'OWNER'}</Text><Text style={styles.identityValue}>-</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{isTr ? 'Pet Sağlık Kartı' : 'Pet Health Card'}</Text>
        <Text style={styles.sectionSub}>{isTr ? 'Dışa aktarılan rapora nelerin dahil olacağını seçin.' : 'Choose what to include in your exported report.'}</Text>
        {!isPremiumPlan ? (
          <View style={styles.freeHintPill}>
            <Text style={styles.freeHintText}>{isTr ? 'Free sürüm: yalnızca Aşı Kayıtları PDF’e dahil edilir.' : 'Free: only Vaccination Records are included in PDF.'}</Text>
          </View>
        ) : null}

        <Text style={styles.groupTitle}>{isTr ? 'RAPORA EKLE' : 'INCLUDE IN REPORT'}</Text>
        <View style={styles.exportCard}>
          {includeRows.map((key, idx) => {
            const meta = rowMeta[key];
            const isLocked = !isPremiumPlan && key !== 'vaccines';
            return (
              <View key={key} style={[styles.scopeRow, idx !== includeRows.length - 1 && styles.exportRowBorder, meta.priority === 'high' && styles.scopeRowPrimary]}>
                <View style={styles.exportLeft}>
                  <View style={[styles.exportIcon, meta.priority === 'high' && styles.exportIconPrimary]}>
                    <Icon kind={meta.icon} size={18} color={meta.priority === 'high' ? '#3e5b45' : '#6f7f67'} />
                  </View>
                  <View style={styles.exportTextWrap}>
                    <View style={styles.exportTitleRow}>
                      <Text style={[styles.exportTitle, meta.priority === 'high' && styles.exportTitlePrimary]}>{meta.title}</Text>
                      {isLocked ? <Icon kind="lock" size={13} color="#c48d42" /> : null}
                    </View>
                    <Text style={styles.exportSub}>{meta.helper}</Text>
                  </View>
                </View>
                <PawSwitch
                  value={sectionIncluded[key]}
                  onValueChange={() => toggleSection(key)}
                  disabled={isLocked}
                />
              </View>
            );
          })}
        </View>

        <Text style={styles.groupTitle}>{isTr ? 'EKLER' : 'ATTACHMENTS'}</Text>
        <View style={styles.exportCard}>
          <View style={styles.scopeRow}>
            <View style={styles.exportLeft}>
              <View style={styles.exportIcon}>
                <Icon kind="download" size={18} color="#6f7f67" />
              </View>
              <View style={styles.exportTextWrap}>
                <View style={styles.exportTitleRow}>
                  <Text style={styles.exportTitle}>{rowMeta.documents.title}</Text>
                  {!isPremiumPlan ? <Icon kind="lock" size={13} color="#c48d42" /> : null}
                </View>
                <Text style={styles.exportSub}>{rowMeta.documents.helper}</Text>
              </View>
            </View>
            <PawSwitch
              value={sectionIncluded.documents}
              onValueChange={() => toggleSection('documents')}
              disabled={!isPremiumPlan}
            />
          </View>
        </View>
      </ScrollView>

      <Pressable style={[styles.exportBtn, isExporting && styles.exportBtnDisabled]} onPress={handleExportPress} disabled={isExporting}>
        <Icon kind="download" size={18} color="#faf8f5" />
        <Text style={styles.exportBtnText}>
          {isExporting
            ? (isTr ? 'PDF oluşturuluyor...' : 'Generating PDF...')
            : isPremiumPlan
            ? (isTr ? `PDF Dışa Aktar (${selectedCount})` : `Export PDF (${selectedCount})`)
            : (isTr ? 'PDF Dışa Aktar (Demo)' : 'Export PDF (Demo)')}
        </Text>
      </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf9f8' },
  backLayer: { ...StyleSheet.absoluteFillObject },
  frontLayer: { flex: 1, overflow: 'hidden' },
  content: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 110, gap: 14 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f1ef', alignItems: 'center', justifyContent: 'center' },
  backBtnGhost: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, lineHeight: 28, color: '#2d2d2d', fontWeight: '700' },
  identityCard: { marginTop: 6, backgroundColor: '#fff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  docPill: { alignSelf: 'flex-start', borderRadius: 12, backgroundColor: '#fcf6ee', borderWidth: 1, borderColor: '#f2ebd9', paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  docPillText: { fontSize: 11, lineHeight: 15, color: '#c48d42', fontWeight: '700' },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  petImage: { width: 72, height: 72, borderRadius: 16 },
  identityTexts: { flex: 1 },
  petName: { fontSize: 32, lineHeight: 34, color: '#2d2d2d', fontWeight: '800' },
  petMeta: { marginTop: 2, fontSize: 14, lineHeight: 20, color: '#787878' },
  petMetaStrong: { marginTop: 2, fontSize: 14, lineHeight: 20, color: '#3f3f3f', fontWeight: '600' },
  identityDivider: { marginTop: 12, marginBottom: 10, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },
  identityBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  identityLabel: { fontSize: 11, lineHeight: 16, color: '#8b8b8b', fontWeight: '700', letterSpacing: 0.6 },
  identityValue: { marginTop: 2, fontSize: 16, lineHeight: 20, color: '#2d2d2d', fontWeight: '600' },
  sectionTitle: { marginTop: 8, fontSize: 30, lineHeight: 34, color: '#2d2d2d', fontWeight: '700' },
  sectionSub: { fontSize: 14, lineHeight: 21, color: '#6f747a' },
  groupTitle: { marginTop: 10, fontSize: 11, lineHeight: 15, color: '#8a9098', fontWeight: '800', letterSpacing: 0.8 },
  freeHintPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff3e6',
    borderWidth: 1,
    borderColor: '#f2dfc6',
  },
  freeHintText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9a6a2f',
    fontWeight: '600',
  },
  exportCard: { borderRadius: 20, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', overflow: 'hidden', paddingVertical: 4 },
  scopeRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#F7F8FA' },
  scopeRowPrimary: { backgroundColor: '#F3F5F8' },
  exportRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  exportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exportTextWrap: { flex: 1 },
  exportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  exportIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f3f0', alignItems: 'center', justifyContent: 'center' },
  exportIconPrimary: { backgroundColor: '#eaf0ee' },
  exportTitle: { fontSize: 16, lineHeight: 20, color: '#2d2d2d', fontWeight: '700' },
  exportTitlePrimary: { color: '#34483d' },
  exportSub: { marginTop: 4, fontSize: 12, lineHeight: 17, color: '#7b8188' },
  pawSwitchScale: {
    width: 42,
    alignItems: 'center',
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
  },
  pawSwitchWrap: {
    position: 'relative',
    width: 42,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pawMark: {
    position: 'absolute',
    right: -1,
    top: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    opacity: 1,
  },
  exportBtn: { position: 'absolute', left: 50, right: 50, bottom: 24, height: 52, borderRadius: 26, backgroundColor: '#2d2d2d', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  exportBtnDisabled: { opacity: 0.72 },
  exportBtnText: { fontSize: 16, lineHeight: 22, color: '#faf8f5', fontWeight: '700' },
});




