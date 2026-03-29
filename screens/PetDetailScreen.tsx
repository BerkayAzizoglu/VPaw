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
  Bug,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  Mars,
  PawPrint,
  Scale,
  Syringe,
  Venus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PetProfile, RoutineCareRecord } from '../lib/petProfileTypes';
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

function nextRoutineDue(record: RoutineCareRecord, isTr: boolean): string {
  if (!record.enabled || !record.lastDate) return isTr ? 'Kayıt yok' : 'No record';
  const ms = new Date(record.lastDate).getTime();
  if (!Number.isFinite(ms)) return isTr ? 'Kayıt yok' : 'No record';
  const dueMs = ms + record.intervalDays * 86400000;
  const diffDays = Math.round((dueMs - Date.now()) / 86400000);
  if (diffDays < 0) return isTr ? 'Gecikti' : 'Overdue';
  if (diffDays === 0) return isTr ? 'Bugün' : 'Today';
  if (diffDays === 1) return isTr ? 'Yarın' : 'Tomorrow';
  return isTr ? `${diffDays} gün sonra` : `In ${diffDays} days`;
}

function routineDueColor(record: RoutineCareRecord): string {
  if (!record.enabled || !record.lastDate) return '#8d8176';
  const ms = new Date(record.lastDate).getTime();
  if (!Number.isFinite(ms)) return '#8d8176';
  const dueMs = ms + record.intervalDays * 86400000;
  const diffDays = Math.round((dueMs - Date.now()) / 86400000);
  if (diffDays < 0) return '#b26c5e';
  if (diffDays <= 7) return '#b18457';
  return '#7b8f72';
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  );
}

function RoutineRow({
  label,
  subtitle,
  status,
  statusColor,
}: {
  label: string;
  subtitle?: string | null;
  status: string;
  statusColor?: string;
}) {
  return (
    <View style={styles.routineRow}>
      <View style={styles.routineLead}>
        <View style={styles.rowIconShell}>
          <Bug size={18} color="#37261b" strokeWidth={1.9} />
        </View>
        <View style={styles.routineTextGroup}>
          <Text style={styles.routineTitle}>{label}</Text>
          {subtitle ? <Text style={styles.routineSub}>{subtitle}</Text> : null}
        </View>
      </View>
      <Text style={[styles.routineValue, statusColor ? { color: statusColor } : null]}>{status}</Text>
    </View>
  );
}

function QuickAccessRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.quickRow} onPress={onPress}>
      <View style={styles.quickLead}>
        <View style={styles.quickIconWrap}>{icon}</View>
        <Text style={styles.quickLabel}>{label}</Text>
      </View>
      <ChevronRight size={18} color="#2a1a12" strokeWidth={2.2} />
    </Pressable>
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
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -4],
    extrapolate: 'clamp',
  });
  const heroScale = scrollY.interpolate({
    inputRange: [-140, 0, 1],
    outputRange: [1.02, 1, 1],
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
        colors={['#f8f4ed', '#f1e3d3', '#deccb9']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.06, y: 0.02 }}
        end={{ x: 0.96, y: 0.98 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,252,247,0.94)', 'rgba(255,255,255,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ribbonPrimary}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,248,236,0.72)', 'rgba(255,255,255,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.ribbonSecondary}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,243,224,0.68)', 'rgba(255,255,255,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.ribbonAccent}
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
          <Animated.View
            style={[
              styles.heroCard,
              {
                transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
              },
            ]}
          >
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
          </Animated.View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'KİLO' : 'WEIGHT'} />
            <Pressable
              onPress={onOpenWeightTracking}
              style={({ pressed }) => [styles.weightCard, pressed && styles.cardPressed]}
            >
              <View style={styles.weightCardTop}>
                <View style={styles.weightTrackShell}>
                  <View style={[styles.weightTrackFill, { width: `${Math.round(goalRatio * 100)}%` }]} />
                  <View style={styles.weightTrackKnob} />
                </View>
                <Activity size={52} color="rgba(184,148,122,0.34)" strokeWidth={1.8} />
              </View>
              <Text style={styles.weightCaption}>
                {weightGoal && currentKg != null
                  ? isTr
                    ? `${currentKg.toFixed(1)} kg • hedef ${weightGoal.toFixed(1)} kg`
                    : `${currentKg.toFixed(1)} kg • goal ${weightGoal.toFixed(1)} kg`
                  : isTr
                    ? 'Hedef belirlenmedi'
                    : 'No goal set'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'AŞILAR' : 'VACCINATIONS'} />
            <Pressable
              onPress={onOpenVaccinations}
              style={({ pressed }) => [styles.inlineCard, pressed && styles.cardPressed]}
            >
              <View style={styles.inlineCardLead}>
                <View style={styles.rowIconShell}>
                  <Syringe size={18} color="#3c261a" strokeWidth={1.9} />
                </View>
                <Text style={styles.inlineCardTitle}>
                  {isTr ? 'Kayıtlı aşılar' : 'Recorded vaccines'}
                </Text>
              </View>
              <View style={styles.countBubble}>
                <Text style={styles.countBubbleText}>{vaccineCount}</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'RUTİN BAKIM' : 'ROUTINE CARE'} />
            <View style={styles.blockCard}>
              <RoutineRow
                label={isTr ? 'İç Parazit' : 'Internal Parasite'}
                subtitle={pet.routineCare.internalParasite.lastDate ? fmtDate(pet.routineCare.internalParasite.lastDate, isTr) : null}
                status={nextRoutineDue(pet.routineCare.internalParasite, isTr)}
                statusColor={routineDueColor(pet.routineCare.internalParasite)}
              />
              <View style={styles.blockDivider} />
              <RoutineRow
                label={isTr ? 'Dış Parazit' : 'External Parasite'}
                subtitle={pet.routineCare.externalParasite.lastDate ? fmtDate(pet.routineCare.externalParasite.lastDate, isTr) : null}
                status={nextRoutineDue(pet.routineCare.externalParasite, isTr)}
                statusColor={routineDueColor(pet.routineCare.externalParasite)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title={isTr ? 'HIZLI ERİŞİM' : 'QUICK ACCESS'} />
            <View style={styles.blockCard}>
              <QuickAccessRow
                icon={<PawPrint size={19} color="#2c1a12" strokeWidth={2} />}
                label={isTr ? 'Veteriner Ziyaretleri' : 'Vet Visits'}
                onPress={onOpenVetVisits}
              />
              <View style={styles.blockDivider} />
              <QuickAccessRow
                icon={<FileText size={19} color="#2c1a12" strokeWidth={2} />}
                label={isTr ? 'Sağlık Kayıtları' : 'Health Records'}
                onPress={onOpenHealthRecords}
              />
              <View style={styles.blockDivider} />
              <QuickAccessRow
                icon={<Scale size={19} color="#2c1a12" strokeWidth={2} />}
                label={isTr ? 'Kilo Profili' : 'Weight Profile'}
                onPress={onOpenWeightTracking}
              />
            </View>
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
    backgroundColor: '#ead8c8',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 18,
    gap: 18,
  },
  ribbonPrimary: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 240,
    height: 1040,
    opacity: 0.94,
    transform: [{ rotate: '24deg' }],
  },
  ribbonSecondary: {
    position: 'absolute',
    top: 120,
    left: 156,
    width: 160,
    height: 980,
    opacity: 0.78,
    transform: [{ rotate: '36deg' }],
  },
  ribbonAccent: {
    position: 'absolute',
    top: 280,
    right: -20,
    width: 110,
    height: 680,
    opacity: 0.52,
    transform: [{ rotate: '17deg' }],
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
    borderBottomColor: 'rgba(100,73,52,0.16)',
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
    backgroundColor: 'rgba(255,250,244,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(164,135,111,0.18)',
    shadowColor: '#896347',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  iconGhost: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
  },
  topBarTitle: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    color: '#2d190f',
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
    backgroundColor: '#f2e6dc',
  },
  topBarCompactName: {
    fontSize: 12,
    lineHeight: 15,
    color: '#2f1b11',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroCard: {
    backgroundColor: 'rgba(255,250,244,0.72)',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#7e5f47',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroImage: {
    width: 108,
    height: 108,
    borderRadius: 28,
    backgroundColor: '#efe7df',
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
    color: '#2a1710',
    letterSpacing: -0.9,
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,249,243,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(169,143,118,0.18)',
  },
  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#554035',
  },
  heroBreed: {
    fontSize: 17,
    lineHeight: 23,
    color: '#39251b',
    fontWeight: '500',
  },
  heroMeta: {
    fontSize: 15,
    color: '#5f4a3c',
    fontWeight: '400',
  },
  chipPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,247,238,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(179,152,126,0.18)',
  },
  chipText: {
    fontSize: 12,
    color: '#5f4939',
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
    color: '#2f1b11',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(96,67,44,0.14)',
  },
  weightCard: {
    backgroundColor: 'rgba(255,250,245,0.74)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#7e5f47',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
    backgroundColor: 'rgba(96,67,44,0.12)',
    overflow: 'hidden',
  },
  weightTrackFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#caa27b',
  },
  weightTrackKnob: {
    position: 'absolute',
    top: -4,
    left: 50,
    width: 10,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#c79f79',
  },
  weightCaption: {
    fontSize: 13,
    color: '#574134',
    fontWeight: '500',
  },
  inlineCard: {
    minHeight: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,249,243,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#7e5f47',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
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
    color: '#2d1a12',
    fontWeight: '500',
  },
  rowIconShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,239,0.74)',
  },
  countBubble: {
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ca9769',
  },
  countBubbleText: {
    fontSize: 24,
    lineHeight: 28,
    color: '#fffaf5',
    fontWeight: '800',
  },
  blockCard: {
    backgroundColor: 'rgba(255,249,243,0.76)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    shadowColor: '#7e5f47',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  blockDivider: {
    height: 1,
    backgroundColor: 'rgba(93,68,49,0.09)',
    marginHorizontal: 18,
  },
  routineRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  routineLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  routineTextGroup: {
    flex: 1,
    gap: 3,
  },
  routineTitle: {
    fontSize: 16,
    color: '#2c1912',
    fontWeight: '500',
  },
  routineSub: {
    fontSize: 12,
    color: '#907d70',
    fontWeight: '500',
  },
  routineValue: {
    maxWidth: 120,
    textAlign: 'right',
    fontSize: 14,
    color: '#7e6759',
    fontWeight: '500',
  },
  quickRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  quickLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  quickIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 18,
    color: '#2a1710',
    fontWeight: '500',
  },
  vaccineHintRow: {
    paddingHorizontal: 10,
    gap: 4,
  },
  vaccineHintLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#8d7666',
    fontWeight: '700',
  },
  vaccineHintValue: {
    fontSize: 13,
    lineHeight: 18,
    color: '#574235',
    fontWeight: '500',
  },
});
