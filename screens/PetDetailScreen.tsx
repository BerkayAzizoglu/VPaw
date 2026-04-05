import React from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  HeartPulse,
  Mars,
  Stethoscope,
  Syringe,
  Venus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from '../lib/healthMvpModel';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';

type PetDetailScreenProps = {
  pet: PetProfile;
  weightEntries?: WeightPoint[];
  weightGoal?: number;
  vaccineCountOverride?: number;
  latestVaccineOverride?: { name: string; rawDate: string } | null;
  locale?: 'en' | 'tr';
  onBack: () => void;
  onEdit?: () => void;
  onOpenWeightTracking?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVetVisits?: () => void;
  onOpenVaccinations?: () => void;
  onOpenHealthHub?: () => void;
};

const HEADER_BUTTON_SIZE = 46;
const HEADER_BAR_HEIGHT = 64;
const TITLE_FONT_FAMILY = Platform.select({ ios: 'Georgia', android: 'serif' });

function formatAge(birthDate: string, isTr: boolean): string {
  const now = new Date();
  const [ry, rm, rd] = birthDate.split('-').map(Number);
  const y = Number.isFinite(ry) ? ry : now.getFullYear();
  const m = Number.isFinite(rm) ? rm : 1;
  const d = Number.isFinite(rd) ? rd : 1;
  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - m;
  if (now.getDate() < d) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);
  return isTr ? `${years}y ${months}a` : `${years}y ${months}m`;
}

function fmtDate(value: string, isTr: boolean): string {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value || '-';
  const d = new Date(ms);
  const monthsTr = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${isTr ? monthsTr[d.getMonth()] : monthsEn[d.getMonth()]} ${d.getFullYear()}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  );
}

export default function PetDetailScreen({
  pet,
  weightEntries = [],
  weightGoal,
  vaccineCountOverride,
  latestVaccineOverride,
  locale = 'en',
  onBack,
  onEdit,
  onOpenWeightTracking,
  onOpenHealthRecords,
  onOpenVetVisits,
  onOpenVaccinations,
  onOpenHealthHub,
}: PetDetailScreenProps) {
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [headerFxEnabled, setHeaderFxEnabled] = React.useState(false);
  const swipePanResponder = useEdgeSwipeBack({
    onBack,
    fullScreenGestureEnabled: false,
    enterVariant: 'soft',
  });

  const latestWeight = weightEntries[weightEntries.length - 1];
  const currentKg = latestWeight?.value ?? null;
  const goalRatio = weightGoal && weightGoal > 0 && currentKg != null
    ? Math.min(1, Math.max(0.08, currentKg / weightGoal))
    : 0.14;

  const vaccineCount = vaccineCountOverride ?? (pet.vaccinations ?? []).length;
  const legacyLastVaccine = [...(pet.vaccinations ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  const displayLastVaccine: { name: string; rawDate: string } | null =
    latestVaccineOverride ?? (legacyLastVaccine ? { name: legacyLastVaccine.name, rawDate: legacyLastVaccine.date } : null);
  const facts = [
    { key: 'type', label: isTr ? 'Tur' : 'Type', value: pet.petType === 'Dog' ? (isTr ? 'Kopek' : 'Dog') : (isTr ? 'Kedi' : 'Cat') },
    { key: 'breed', label: isTr ? 'Irk' : 'Breed', value: pet.breed || (isTr ? 'Belirtilmedi' : 'Not set') },
    { key: 'age', label: isTr ? 'Yas' : 'Age', value: formatAge(pet.birthDate, isTr) },
    { key: 'chip', label: isTr ? 'Chip' : 'Microchip', value: pet.microchip || (isTr ? 'Eklenmedi' : 'Not added') },
  ];

  const topInset = Math.max(insets.top, 14);
  const topBarHeight = topInset + HEADER_BAR_HEIGHT;
  const topChromeHeight = topInset + HEADER_BUTTON_SIZE + 18;
  const topChromeOpacity = scrollY.interpolate({
    inputRange: [0, 10, 80],
    outputRange: [0, 0.45, 1],
    extrapolate: 'clamp',
  });
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 24, 64],
    outputRange: [1, 0.65, 0],
    extrapolate: 'clamp',
  });
  const compactProfileOpacity = scrollY.interpolate({
    inputRange: [16, 58, 120],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });

  React.useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const nextEnabled = value > 10;
      setHeaderFxEnabled((prev) => (prev === nextEnabled ? prev : nextEnabled));
    });

    return () => {
      scrollY.removeListener(id);
    };
  }, [scrollY]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#f7f5f1', '#f3f0ea', '#efebe4']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.06, y: 0.02 }}
        end={{ x: 0.96, y: 0.98 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.screen} {...swipePanResponder.panHandlers}>
        <Animated.ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: topBarHeight + 18,
              paddingBottom: 168 + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={24}
        >
          <View style={styles.heroCard}>
            <Image source={{ uri: pet.image }} style={styles.heroImage} />
            <View style={styles.heroBody}>
              <View style={styles.heroNameRow}>
                <Text numberOfLines={1} style={styles.heroName}>
                  {pet.name}
                </Text>
                <View style={styles.genderPill}>
                  {pet.gender === 'male' ? (
                    <Mars size={15} color="#4b3529" strokeWidth={2.1} />
                  ) : (
                    <Venus size={15} color="#4b3529" strokeWidth={2.1} />
                  )}
                  <Text style={styles.genderText}>
                    {pet.gender === 'male' ? (isTr ? 'Erkek' : 'Male') : (isTr ? 'Dişi' : 'Female')}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroBreed}>{pet.breed}</Text>
              <Text style={styles.heroMeta}>{formatAge(pet.birthDate, isTr)}</Text>
              {pet.microchip ? (
                <View style={styles.chipPill}>
                  <Text style={styles.chipText}>Chip {pet.microchip}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'PROFILE' : 'PROFILE'} />
            <View style={styles.factsGrid}>
              {facts.map((item) => (
                <View key={item.key} style={styles.factCard}>
                  <Text style={styles.factLabel}>{item.label}</Text>
                  <Text style={styles.factValue} numberOfLines={2}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'HEALTH SHORTCUTS' : 'HEALTH SHORTCUTS'} />
            <View style={styles.shortcutsGrid}>
              <Pressable onPress={onOpenWeightTracking} style={({ pressed }) => [styles.shortcutCard, pressed && styles.cardPressed]}>
                <View style={styles.shortcutIconShell}>
                  <Activity size={18} color="#47664a" strokeWidth={2} />
                </View>
                <Text style={styles.shortcutTitle}>{isTr ? 'Kilo' : 'Weight'}</Text>
                <Text style={styles.shortcutValue}>
                  {currentKg != null ? `${currentKg.toFixed(1)} kg` : (isTr ? 'Kayit yok' : 'No record')}
                </Text>
              </Pressable>

              <Pressable onPress={onOpenVaccinations} style={({ pressed }) => [styles.shortcutCard, pressed && styles.cardPressed]}>
                <View style={styles.shortcutIconShell}>
                  <Syringe size={18} color="#47664a" strokeWidth={2} />
                </View>
                <Text style={styles.shortcutTitle}>{isTr ? 'Asilar' : 'Vaccines'}</Text>
                <Text style={styles.shortcutValue}>{String(vaccineCount)}</Text>
              </Pressable>

              <Pressable onPress={onOpenVetVisits} style={({ pressed }) => [styles.shortcutCard, pressed && styles.cardPressed]}>
                <View style={styles.shortcutIconShell}>
                  <Stethoscope size={18} color="#47664a" strokeWidth={2} />
                </View>
                <Text style={styles.shortcutTitle}>{isTr ? 'Ziyaretler' : 'Vet Visits'}</Text>
                <Text style={styles.shortcutValue}>{isTr ? 'Ac' : 'Open'}</Text>
              </Pressable>

              <Pressable onPress={onOpenHealthRecords} style={({ pressed }) => [styles.shortcutCard, pressed && styles.cardPressed]}>
                <View style={styles.shortcutIconShell}>
                  <FileText size={18} color="#47664a" strokeWidth={2} />
                </View>
                <Text style={styles.shortcutTitle}>{isTr ? 'Kayitlar' : 'Records'}</Text>
                <Text style={styles.shortcutValue}>{isTr ? 'Ac' : 'Open'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'WEIGHT' : 'WEIGHT'} />
            <Pressable
              onPress={onOpenWeightTracking}
              style={({ pressed }) => [styles.weightCard, pressed && styles.cardPressed]}
            >
              <View style={styles.weightCardTop}>
                <View style={styles.weightTrackShell}>
                  <View style={[styles.weightTrackFill, { width: `${Math.round(goalRatio * 100)}%` }]} />
                  <View style={styles.weightTrackKnob} />
                </View>
                <Activity size={52} color="rgba(111,137,115,0.24)" strokeWidth={1.8} />
              </View>
              <Text style={styles.weightCaption}>
                {weightGoal && currentKg != null
                  ? `${currentKg.toFixed(1)} kg • ${isTr ? 'hedef' : 'goal'} ${weightGoal.toFixed(1)} kg`
                  : isTr
                    ? 'Hedef belirlenmedi'
                    : 'No goal set'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'HEALTH HUB' : 'HEALTH HUB'} />
            <Pressable
              style={({ pressed }) => [styles.healthHubEntryRow, pressed && styles.cardPressed]}
              onPress={onOpenHealthHub}
            >
              <View style={styles.healthHubEntryLead}>
                <View style={styles.rowIconShell}>
                  <HeartPulse size={18} color="#47664a" strokeWidth={1.9} />
                </View>
                <View style={styles.healthHubEntryText}>
                  <Text style={styles.healthHubEntryLabel}>
                    {isTr ? 'Saglik merkezi' : 'Health hub'}
                  </Text>
                  <Text style={styles.healthHubEntrySubtext}>
                    {isTr ? 'Tum kayitlar ve bagli bakim akislari' : 'All records and connected care flows'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#47664a" strokeWidth={2.2} />
            </Pressable>
          </View>

          {displayLastVaccine ? (
            <View style={styles.vaccineHintRow}>
              <Text style={styles.vaccineHintLabel}>
                {isTr ? 'Son aşı' : 'Latest vaccine'}
              </Text>
              <Text style={styles.vaccineHintValue}>
                {displayLastVaccine.name} • {fmtDate(displayLastVaccine.rawDate, isTr)}
              </Text>
            </View>
          ) : null}
        </Animated.ScrollView>

        <View pointerEvents="box-none" style={styles.topChrome}>
          <Animated.View
            renderToHardwareTextureAndroid
            pointerEvents="none"
            style={[
              styles.topChromeSurface,
              {
                height: topChromeHeight,
                opacity: topChromeOpacity,
              },
            ]}
          >
            {headerFxEnabled ? <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFillObject} /> : null}
            <LinearGradient
              colors={['rgba(248,244,237,0.96)', 'rgba(243,231,219,0.78)', 'rgba(248,244,237,0.22)', 'rgba(248,244,237,0)']}
              locations={[0, 0.46, 0.78, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          <View style={[styles.topBarRow, { height: topBarHeight + 2, paddingTop: topInset + 4 }]}>
            <View style={styles.topBarSide}>
              <Pressable style={styles.iconBtn} onPress={onBack}>
                <ChevronLeft size={24} color="#362116" strokeWidth={2.1} />
              </Pressable>
            </View>

            <View style={styles.topBarCenter}>
              <Animated.Text numberOfLines={1} style={[styles.topBarTitle, { opacity: titleOpacity }]}>
                PET PROFILE
              </Animated.Text>
              <Animated.View style={[styles.topBarCompactProfile, { opacity: compactProfileOpacity }]}>
                <Image source={{ uri: pet.image }} style={styles.topBarCompactAvatar} />
                <Text numberOfLines={1} style={styles.topBarCompactName}>
                  {pet.name}
                </Text>
              </Animated.View>
            </View>

            <View style={[styles.topBarSide, styles.topBarSideRight]}>
              {onEdit ? (
                <Pressable style={styles.iconBtn} onPress={onEdit}>
                  <Edit2 size={20} color="#362116" strokeWidth={2.1} />
                </Pressable>
              ) : (
                <View style={styles.iconGhost} />
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7f5f1',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 18,
    gap: 18,
  },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topChromeSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(104,120,114,0.12)',
  },
  topBarRow: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarSide: {
    width: 54,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topBarSideRight: {
    alignItems: 'flex-end',
  },
  iconBtn: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.12)',
  },
  iconGhost: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
  },
  topBarTitle: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    color: '#26312f',
    letterSpacing: 0.5,
    fontFamily: TITLE_FONT_FAMILY,
    paddingHorizontal: 8,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 58,
  },
  topBarCompactProfile: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    maxWidth: '72%',
  },
  topBarCompactAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: '#eef0eb',
  },
  topBarCompactName: {
    fontSize: 12,
    lineHeight: 15,
    color: '#26312f',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
    padding: 18,
    flexDirection: 'row',
    gap: 16,
  },
  heroImage: {
    width: 108,
    height: 108,
    borderRadius: 24,
    backgroundColor: '#eef0eb',
  },
  heroBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroName: {
    flexShrink: 1,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#26312f',
    letterSpacing: -0.9,
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5d605a',
  },
  heroBreed: {
    fontSize: 17,
    lineHeight: 23,
    color: '#33403d',
    fontWeight: '500',
  },
  heroMeta: {
    fontSize: 15,
    color: '#68706b',
    fontWeight: '400',
  },
  chipPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f5f3ee',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
  },
  chipText: {
    fontSize: 12,
    color: '#5d605a',
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.3,
    color: '#47664a',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(104,120,114,0.14)',
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  factCard: {
    width: '48%',
    minHeight: 86,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  factLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#7a827d',
    fontWeight: '700',
  },
  factValue: {
    fontSize: 16,
    lineHeight: 21,
    color: '#26312f',
    fontWeight: '600',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutCard: {
    width: '48%',
    minHeight: 110,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  shortcutIconShell: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ef',
  },
  shortcutTitle: {
    fontSize: 15,
    lineHeight: 19,
    color: '#26312f',
    fontWeight: '700',
  },
  shortcutValue: {
    fontSize: 13,
    lineHeight: 18,
    color: '#66706b',
    fontWeight: '500',
  },
  weightCard: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.98,
  },
  weightCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightTrackShell: {
    flex: 1,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(71,102,74,0.10)',
    overflow: 'hidden',
  },
  weightTrackFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#47664a',
  },
  weightTrackKnob: {
    position: 'absolute',
    top: -4,
    left: 50,
    width: 10,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#6f8973',
  },
  weightCaption: {
    fontSize: 13,
    color: '#5d605a',
    fontWeight: '500',
  },
  inlineCard: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineCardLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inlineCardTitle: {
    flex: 1,
    fontSize: 16,
    color: '#26312f',
    fontWeight: '500',
  },
  rowIconShell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ef',
  },
  countBubble: {
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#47664a',
  },
  countBubbleText: {
    fontSize: 24,
    lineHeight: 28,
    color: '#fffaf5',
    fontWeight: '800',
  },
  healthHubEntryRow: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(104,120,114,0.10)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthHubEntryLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  healthHubEntryText: {
    flex: 1,
    gap: 3,
  },
  healthHubEntryLabel: {
    fontSize: 17,
    color: '#26312f',
    fontWeight: '600',
  },
  healthHubEntrySubtext: {
    fontSize: 13,
    lineHeight: 18,
    color: '#66706b',
    fontWeight: '500',
  },
  vaccineHintRow: {
    paddingHorizontal: 10,
    gap: 4,
  },
  vaccineHintLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#7a827d',
    fontWeight: '700',
  },
  vaccineHintValue: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '500',
  },
});

