import React, { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View, Image, RefreshControl, Switch } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Plus, RefreshCw, Trash2, PawPrint, ChevronDown, ChevronUp } from 'lucide-react-native';
import type { PetProfile } from '../components/AuthGate';
import type { WeightPoint } from './WeightTrackingScreen';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import type { HealthCardSummary } from '../lib/healthEventAdapters';

type PetHealthPassportScreenProps = {
  onBack: () => void;
  backPreview?: ReactNode;
  pet: PetProfile;
  weightEntries: WeightPoint[];
  onOpenVaccinations?: () => void;
  onOpenVetVisits?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenWeight?: () => void;
  isPremiumPlan?: boolean;
  healthCardSummary?: HealthCardSummary;
};

type ExportRowKey = 'vaccines' | 'visits' | 'health' | 'weight' | 'allergy' | 'surgery' | 'meds';

type ExportRowMeta = {
  key: ExportRowKey;
  icon: 'vaccine' | 'pulse' | 'health' | 'weight';
  title: string;
  onPress?: () => void;
};

const rowOrder: ExportRowKey[] = ['vaccines', 'visits', 'health', 'weight', 'allergy', 'surgery', 'meds'];

function Icon({ kind, size = 20, color = '#6f6f6f' }: { kind: 'back' | 'vaccine' | 'pulse' | 'health' | 'weight' | 'download'; size?: number; color?: string }) {
  if (kind === 'back') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M15 6L9 12L15 18" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
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
  isPremiumPlan = false,
  healthCardSummary,
}: PetHealthPassportScreenProps) {
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const [refreshing, setRefreshing] = useState(false);
  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: true, edgeWidth: 24, triggerDx: 70, maxDy: 30 });
  const [expandedKey, setExpandedKey] = useState<ExportRowKey | null>(null);

  const initialRows = useMemo<Record<ExportRowKey, string[]>>(() => {
    const fallback: Record<ExportRowKey, string[]> = {
      vaccines: pet.vaccinations.length ? pet.vaccinations.map((v) => `${v.name} • ${v.date}`) : ['Rabies • Apr 12, 2026'],
      visits: ['Annual Checkup • Mar 5, 2026', 'Ear follow-up • Oct 12, 2025', 'Dental check • Jan 20, 2025'],
      health: ['Chicken Protein • Active', 'Flea Bites • Resolved'],
      weight: weightEntries.length ? weightEntries.map((w) => `${w.value.toFixed(1)} kg • ${w.date}`) : ['5.2 kg • Apr 15, 2026'],
      allergy: pet.allergiesLog.length ? pet.allergiesLog.map((a) => `${a.category} • ${a.status}`) : ['No allergy records'],
      surgery: pet.surgeriesLog.length ? pet.surgeriesLog.map((s) => `${s.name} • ${s.date}`) : ['No surgery records'],
      meds: pet.diabetesLog.length ? pet.diabetesLog.map((d) => `${d.type} • ${d.status}`) : ['No active medication'],
    };

    if (!healthCardSummary) return fallback;

    return {
      vaccines: healthCardSummary.exportRows.vaccines.length ? healthCardSummary.exportRows.vaccines : fallback.vaccines,
      visits: healthCardSummary.exportRows.visits.length ? healthCardSummary.exportRows.visits : fallback.visits,
      health: healthCardSummary.exportRows.health.length ? healthCardSummary.exportRows.health : fallback.health,
      weight: healthCardSummary.exportRows.weight.length ? healthCardSummary.exportRows.weight : fallback.weight,
      allergy: healthCardSummary.exportRows.allergy.length ? healthCardSummary.exportRows.allergy : fallback.allergy,
      surgery: healthCardSummary.exportRows.surgery.length ? healthCardSummary.exportRows.surgery : fallback.surgery,
      meds: healthCardSummary.exportRows.meds.length ? healthCardSummary.exportRows.meds : fallback.meds,
    };
  }, [healthCardSummary, pet, weightEntries]);

  const [recordsByRow, setRecordsByRow] = useState<Record<ExportRowKey, string[]>>(initialRows);

  const [recordIncluded, setRecordIncluded] = useState<Record<ExportRowKey, boolean[]>>(() => ({
    vaccines: recordsByRow.vaccines.map(() => true),
    visits: recordsByRow.visits.map(() => isPremiumPlan),
    health: recordsByRow.health.map(() => isPremiumPlan),
    weight: recordsByRow.weight.map(() => isPremiumPlan),
    allergy: recordsByRow.allergy.map(() => isPremiumPlan),
    surgery: recordsByRow.surgery.map(() => isPremiumPlan),
    meds: recordsByRow.meds.map(() => isPremiumPlan),
  }));

  const [sectionIncluded, setSectionIncluded] = useState<Record<ExportRowKey, boolean>>({
    vaccines: true,
    visits: isPremiumPlan,
    health: isPremiumPlan,
    weight: isPremiumPlan,
    allergy: isPremiumPlan,
    surgery: isPremiumPlan,
    meds: isPremiumPlan,
  });

  useEffect(() => {
    setRecordsByRow(initialRows);
    setRecordIncluded({
      vaccines: initialRows.vaccines.map(() => true),
      visits: initialRows.visits.map(() => isPremiumPlan),
      health: initialRows.health.map(() => isPremiumPlan),
      weight: initialRows.weight.map(() => isPremiumPlan),
      allergy: initialRows.allergy.map(() => isPremiumPlan),
      surgery: initialRows.surgery.map(() => isPremiumPlan),
      meds: initialRows.meds.map(() => isPremiumPlan),
    });
    setSectionIncluded({
      vaccines: true,
      visits: isPremiumPlan,
      health: isPremiumPlan,
      weight: isPremiumPlan,
      allergy: isPremiumPlan,
      surgery: isPremiumPlan,
      meds: isPremiumPlan,
    });
  }, [initialRows, isPremiumPlan, pet.id]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  };

  const latestWeight = weightEntries[weightEntries.length - 1]?.value ?? 0;
  const ageText = isTr ? `${pet.ageYears} yıl` : `${pet.ageYears} years`;

  const rowMeta: Record<ExportRowKey, ExportRowMeta> = {
    vaccines: { key: 'vaccines', icon: 'vaccine', title: isTr ? 'Aşı Kayıtları' : 'Vaccination Records', onPress: onOpenVaccinations },
    visits: { key: 'visits', icon: 'pulse', title: isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits', onPress: onOpenVetVisits },
    health: { key: 'health', icon: 'health', title: isTr ? 'Sağlık Kayıtları' : 'Health Records', onPress: onOpenHealthRecords },
    weight: { key: 'weight', icon: 'weight', title: isTr ? 'Kilo Günlüğü' : 'Weight Log', onPress: onOpenWeight },
    allergy: { key: 'allergy', icon: 'health', title: isTr ? 'Alerjiler' : 'Allergies' },
    surgery: { key: 'surgery', icon: 'pulse', title: isTr ? 'Ameliyatlar' : 'Surgeries' },
    meds: { key: 'meds', icon: 'vaccine', title: isTr ? 'Kullandığı İlaçlar' : 'Current Medications' },
  };

  const selectedCount = useMemo(() => {
    let sum = 0;
    rowOrder.forEach((key) => {
      if (!sectionIncluded[key]) return;
      recordIncluded[key].forEach((flag) => {
        if (flag) sum += 1;
      });
    });
    return sum;
  }, [recordIncluded, sectionIncluded]);

  const ensurePremium = () => {
    if (isPremiumPlan) return true;
    Alert.alert(
      isTr ? 'Premium Özellik' : 'Premium Feature',
      isTr ? 'Free planda PDF dışa aktarmada yalnızca Aşı Kayıtları kullanılabilir.' : 'On Free plan, PDF export includes only Vaccination Records.',
    );
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

  const openSection = (key: ExportRowKey) => {
    if (!isPremiumPlan && key !== 'vaccines') {
      ensurePremium();
      return;
    }
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const toggleRecord = (key: ExportRowKey, index: number) => {
    if (!isPremiumPlan && key !== 'vaccines') {
      ensurePremium();
      return;
    }

    if (!isPremiumPlan && key === 'vaccines') return;

    setRecordIncluded((prev) => {
      const next = { ...prev };
      next[key] = [...next[key]];
      next[key][index] = !next[key][index];
      return next;
    });
  };

  const addRecord = (key: ExportRowKey) => {
    if (!isPremiumPlan) {
      ensurePremium();
      return;
    }

    setRecordsByRow((prev) => {
      const next = { ...prev };
      next[key] = [...next[key], isTr ? `Yeni kayıt ${next[key].length + 1}` : `New record ${next[key].length + 1}`];
      return next;
    });

    setRecordIncluded((prev) => {
      const next = { ...prev };
      next[key] = [...next[key], true];
      return next;
    });
  };

  const removeRecord = (key: ExportRowKey, index: number) => {
    if (!isPremiumPlan) {
      ensurePremium();
      return;
    }

    setRecordsByRow((prev) => {
      const next = { ...prev };
      next[key] = next[key].filter((_, i) => i !== index);
      return next;
    });

    setRecordIncluded((prev) => {
      const next = { ...prev };
      next[key] = next[key].filter((_, i) => i !== index);
      return next;
    });
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
          <Text style={styles.title}>{isTr ? 'Pet Sağlık Pasaportu' : 'Pet Health Passport'}</Text>
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
            <View><Text style={styles.identityLabel}>{isTr ? 'SAHİP' : 'OWNER'}</Text><Text style={styles.identityValue}>Alex Morrison</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{isTr ? 'Dışa Aktarıma Dahil Et' : 'Include in Export'}</Text>
        <Text style={styles.sectionSub}>{isTr ? 'Pasaporta eklenecek kayıtları seçin.' : 'Select records to include in this passport.'}</Text>
        {!isPremiumPlan ? (
          <View style={styles.freeHintPill}>
            <Text style={styles.freeHintText}>{isTr ? 'Free sürüm: yalnızca Aşı Kayıtları PDF’e dahil edilir.' : 'Free: only Vaccination Records are included in PDF.'}</Text>
          </View>
        ) : null}

        <View style={styles.exportCard}>
          {rowOrder.map((key, idx) => {
            const meta = rowMeta[key];
            const records = recordsByRow[key];
            const expanded = expandedKey === key;

            return (
              <View key={key} style={[idx !== rowOrder.length - 1 && styles.exportRowBorder]}>
                <Pressable style={styles.exportRow} onPress={() => openSection(key)}>
                  <View style={styles.exportLeft}>
                    <View style={styles.exportIcon}><Icon kind={meta.icon} size={18} color="#6f7f67" /></View>
                    <View style={styles.exportTextWrap}>
                      <Text style={styles.exportTitle}>{meta.title}</Text>
                      <Text style={styles.exportSub}>{records.length} {isTr ? 'kayıt mevcut' : 'records available'}</Text>
                    </View>
                  </View>

                  <View style={styles.exportRight}>
                    {expanded ? <ChevronUp size={16} color="#9a9a9a" /> : <ChevronDown size={16} color="#9a9a9a" />}
                    <PawSwitch
                      value={sectionIncluded[key]}
                      onValueChange={() => toggleSection(key)}
                      disabled={!isPremiumPlan && key === 'vaccines'}
                    />
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.recordsWrap}>
                    {records.map((record, recordIndex) => (
                      <View key={`${key}-${recordIndex}`} style={styles.recordRow}>
                        <Text style={styles.recordText}>{record}</Text>
                        <View style={styles.recordActions}>
                          <PawSwitch
                            value={recordIncluded[key][recordIndex] ?? true}
                            onValueChange={() => toggleRecord(key, recordIndex)}
                            disabled={!isPremiumPlan && key === 'vaccines'}
                          />
                          {isPremiumPlan ? (
                            <Pressable onPress={() => removeRecord(key, recordIndex)} style={styles.iconActionBtn}>
                              <Trash2 size={14} color="#b75e5e" />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ))}

                    <View style={styles.recordsFooter}>
                      {meta.onPress ? (
                        <Pressable style={styles.linkBtn} onPress={meta.onPress}>
                          <Text style={styles.linkBtnText}>{isTr ? 'Kaynak ekranı aç' : 'Open source screen'}</Text>
                        </Pressable>
                      ) : <View />}

                      <Pressable style={styles.addRecordBtn} onPress={() => addRecord(key)}>
                        <Plus size={14} color="#2d2d2d" />
                        <Text style={styles.addRecordText}>{isTr ? 'Kayıt Ekle' : 'Add Record'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Pressable style={styles.exportBtn}>
        <Icon kind="download" size={18} color="#faf8f5" />
        <Text style={styles.exportBtnText}>
          {isPremiumPlan
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
  sectionSub: { fontSize: 14, lineHeight: 20, color: '#808080' },
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
  exportCard: { borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', overflow: 'hidden' },
  exportRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  exportRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  exportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exportTextWrap: { flex: 1 },
  exportIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f2f3f0', alignItems: 'center', justifyContent: 'center' },
  exportTitle: { fontSize: 16, lineHeight: 20, color: '#2d2d2d', fontWeight: '700' },
  exportSub: { marginTop: 2, fontSize: 13, lineHeight: 17, color: '#8a8a8a' },
  exportRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordsWrap: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  recordRow: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#faf9f8',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recordText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#636363', fontWeight: '500' },
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordsFooter: { marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addRecordBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 8, backgroundColor: '#f1f1ef' },
  addRecordText: { fontSize: 12, lineHeight: 16, color: '#2d2d2d', fontWeight: '600' },
  linkBtn: { paddingHorizontal: 8, height: 28, justifyContent: 'center' },
  linkBtnText: { fontSize: 12, lineHeight: 16, color: '#7a7a7a', fontWeight: '600' },
  iconActionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
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
  exportBtnText: { fontSize: 16, lineHeight: 22, color: '#faf8f5', fontWeight: '700' },
});




