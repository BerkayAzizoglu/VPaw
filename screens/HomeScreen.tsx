import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { SvgUri } from 'react-native-svg';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { ChevronRight, FileText, HeartPulse, Mars, PawPrint, Pencil, Stethoscope, Syringe, Venus } from 'lucide-react-native';
import type { PetProfile } from '../components/AuthGate';
import type { WeightPoint } from './WeightTrackingScreen';
import { useLocale } from '../hooks/useLocale';
import { useAppSettings } from '../hooks/useAppSettings';

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;
const AVATAR_IMAGE = 'https://www.figma.com/api/mcp/asset/c1377527-400c-4e5e-8c97-bd4806f77781';

type PetId = 'luna' | 'milo';

type HomePetData = {
  id: PetId;
  name: string;
  breed: string;
  coatPattern: string;
  age: string;
  gender: 'male' | 'female';
  heroImage: string;
  weight: string;
  weightDelta: string;
  vaccines: string;
  vaccinesSub: string;
  vetVisits: string;
  vetVisitsSub: string;
  records: string;
  recordsSub: string;
  upcoming: Array<{ title: string; date: string }>;
};

type HomeScreenProps = {
  onOpenProfile: () => void;
  onOpenPetProfile?: (petId?: string) => void;
  onOpenVaccinations?: (petId?: string) => void;
  onOpenHealthRecords?: (petId?: string) => void;
  onOpenVetVisits?: (petId?: string) => void;
  onOpenPetEdit?: (petId?: string) => void;
  onOpenPetPassport?: (petId?: string) => void;
  petProfiles?: Record<'luna' | 'milo', PetProfile>;
  weightsByPet?: Record<'luna' | 'milo', WeightPoint[]>;
  activePetId?: string;
  onChangeActivePet?: (petId: string) => void;
  petLockEnabled?: boolean;
  onChangePetLockEnabled?: (enabled: boolean) => void;
};

const BASE_PETS: HomePetData[] = [
  {
    id: 'luna',
    name: 'Luna',
    breed: 'Golden Retriever',
    coatPattern: 'Solid',
    age: '3 years old',
    gender: 'female',
    heroImage: 'https://www.figma.com/api/mcp/asset/6f25c37a-f633-4891-ba3b-0fab066dac17',
    weight: '28.5 kg',
    weightDelta: '+0.3 kg',
    vaccines: 'Up to date',
    vaccinesSub: 'Next: Rabies',
    vetVisits: '2 visits',
    vetVisitsSub: 'March 5',
    records: '4 types',
    recordsSub: 'Log health',
    upcoming: [
      { title: 'Annual checkup', date: 'March 28, 2026 · 10:30 AM' },
      { title: 'Flea & tick prevention', date: 'April 1, 2026' },
      { title: 'Grooming appointment', date: 'April 15, 2026 · 2:00 PM' },
    ],
  },
  {
    id: 'milo',
    name: 'Milo',
    breed: 'British Shorthair',
    coatPattern: 'Tabby',
    age: '2 years old',
    gender: 'male',
    heroImage: 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?q=80&w=1200&auto=format&fit=crop',
    weight: '5.2 kg',
    weightDelta: '+0.1 kg',
    vaccines: 'Due soon',
    vaccinesSub: 'Next: DHPP',
    vetVisits: '1 visit',
    vetVisitsSub: 'Feb 21',
    records: '3 types',
    recordsSub: 'Track notes',
    upcoming: [
      { title: 'Weight review', date: 'March 30, 2026 · 09:30 AM' },
      { title: 'Dental check', date: 'April 5, 2026 · 2:00 PM' },
      { title: 'Vaccine reminder', date: 'April 12, 2026' },
    ],
  },
];
function formatPetAge(birthDate: string, locale: 'en' | 'tr') {
  const now = new Date();
  const [y, m, d] = birthDate.split('-').map((n) => Number(n));
  const year = Number.isFinite(y) ? y : now.getFullYear();
  const month = Number.isFinite(m) ? m : 1;
  const day = Number.isFinite(d) ? d : 1;
  let years = now.getFullYear() - year;
  let months = now.getMonth() + 1 - month;
  if (now.getDate() < day) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  years = Math.max(0, years);
  months = Math.max(0, months);
  if (locale === 'tr') return `${years} yýl ${months} ay`;
  return `${years} years ${months} months`;
}
function parseWeightKg(value: string) {
  const parsed = Number(value.replace(',', '.').split(' ')[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWeightByUnit(weightKg: number, unit: 'kg' | 'lb') {
  if (unit === 'lb') return `${(weightKg * 2.20462).toFixed(1)} lb`;
  return `${weightKg.toFixed(1)} kg`;
}

function formatDeltaByUnit(deltaKg: number, unit: 'kg' | 'lb') {
  const converted = unit === 'lb' ? deltaKg * 2.20462 : deltaKg;
  const label = unit === 'lb' ? 'lb' : 'kg';
  return `${converted >= 0 ? '+' : ''}${converted.toFixed(1)} ${label}`;
}
function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`;
  }
  return path;
}

export default function HomeScreen({
  onOpenProfile,
  onOpenPetProfile,
  onOpenVaccinations,
  onOpenHealthRecords,
  onOpenVetVisits,
  onOpenPetEdit,
  onOpenPetPassport,
  petProfiles,
  weightsByPet,
  activePetId,
  onChangeActivePet,
  petLockEnabled,
  onChangePetLockEnabled,
}: HomeScreenProps) {
  const { locale } = useLocale();
  const { settings } = useAppSettings();
  const isTr = locale === 'tr';
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Montserrat_700Bold,
  });

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslateY = useRef(new Animated.Value(14)).current;
  const cardDragY = useRef(new Animated.Value(0)).current;
  const switchFade = useRef(new Animated.Value(1)).current;
  const switchScale = useRef(new Animated.Value(1)).current;
  const [isGestureActive, setIsGestureActive] = useState(false);
  const isPetLockEnabled = petLockEnabled ?? false;
  const [frontImageLoaded, setFrontImageLoaded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(enterTranslateY, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enterOpacity, enterTranslateY]);

  const pets = useMemo<HomePetData[]>(() => {
    return BASE_PETS.map((p) => {
      const profile = petProfiles?.[p.id];
      const history = weightsByPet?.[p.id] ?? [];
      const latest = history[history.length - 1];
      const prev = history[history.length - 2];

            let computedWeight = formatWeightByUnit(parseWeightKg(p.weight), settings.weightUnit);
      let computedDelta = formatDeltaByUnit(parseWeightKg(p.weightDelta), settings.weightUnit);

      if (latest) {
        computedWeight = formatWeightByUnit(latest.value, settings.weightUnit);
        if (prev) {
          const delta = latest.value - prev.value;
          computedDelta = formatDeltaByUnit(Math.abs(delta) < 0.01 ? 0 : delta, settings.weightUnit);
        } else {
          computedDelta = formatDeltaByUnit(0, settings.weightUnit);
        }
      }

      if (!profile) {
        return {
          ...p,
          weight: computedWeight,
          weightDelta: computedDelta,
        };
      }

      return {
        ...p,
        name: profile.name,
        breed: profile.breed,
        coatPattern: profile.coatPattern,
        age: formatPetAge(profile.birthDate, locale),
        gender: profile.gender,
        heroImage: profile.image,
        weight: computedWeight,
        weightDelta: computedDelta,
      };
    });
  }, [locale, petProfiles, settings.weightUnit, weightsByPet]);

  const activeIndex = useMemo(() => {
    const idx = pets.findIndex((p) => p.id === activePetId);
    return idx >= 0 ? idx : 0;
  }, [activePetId, pets]);

  const activePet = pets[activeIndex];
  const backPet = pets[(activeIndex + 1) % pets.length];
  const prevPet = pets[(activeIndex - 1 + pets.length) % pets.length];

  const activeWeightHistory = (weightsByPet?.[activePet.id] ?? []).slice(-6);

  const weightSpark = useMemo(() => {
    const chartW = 106;
    const chartH = 42;
    const inset = 2;
    const values = (activeWeightHistory.length > 0 ? activeWeightHistory : [{ value: Number(activePet.weight.split(' ')[0]) || 0 }]).map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(0.1, max - min);
    const usableW = chartW - inset * 2;
    const usableH = chartH - inset * 2;

    const points = values.map((v, i) => {
      const x = inset + (values.length > 1 ? (usableW * i) / (values.length - 1) : usableW / 2);
      const y = inset + (1 - (v - min) / span) * usableH;
      return { x, y };
    });

    const linePath = buildSmoothPath(points);
    const areaPath = `${linePath} L ${chartW - inset} ${chartH - inset} L ${inset} ${chartH - inset} Z`;

    return {
      linePath,
      areaPath,
      latestDate: activeWeightHistory[activeWeightHistory.length - 1]?.date,
    };
  }, [activePet.id, activePet.weight, activeWeightHistory]);

  const weightUpdatedText = weightSpark.latestDate ?? (isTr ? 'Son güncelleme bugün' : 'Last updated today');

  useEffect(() => {
    setFrontImageLoaded(false);
  }, [activePet.id]);

  const resetCard = () => {
    Animated.spring(cardDragY, {
      toValue: 0,
      tension: 80,
      friction: 11,
      useNativeDriver: true,
    }).start(() => setIsGestureActive(false));
  };

  const finishSwitch = (nextPetId: PetId, settleFrom: number) => {
    onChangeActivePet?.(nextPetId);
    cardDragY.setValue(settleFrom);
    switchFade.setValue(0.86);
    switchScale.setValue(0.985);
    Animated.parallel([
      Animated.spring(cardDragY, {
        toValue: 0,
        tension: 72,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(switchFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(switchScale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setIsGestureActive(false));
  };

  const commitSwitchDown = () => {
    Animated.timing(cardDragY, {
      toValue: 190,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      finishSwitch(backPet.id, -42);
    });
  };

  const commitSwitchUp = () => {
    Animated.timing(cardDragY, {
      toValue: -140,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      finishSwitch(prevPet.id, 42);
    });
  };

  const cardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => !isPetLockEnabled && Math.abs(gesture.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_, gesture) => !isPetLockEnabled && Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => setIsGestureActive(true),
        onPanResponderMove: (_, gesture) => {
          const nextY = Math.max(-130, Math.min(160, gesture.dy));
          cardDragY.setValue(nextY);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 72) {
            commitSwitchDown();
            return;
          }
          if (gesture.dy < -58) {
            commitSwitchUp();
            return;
          }
          resetCard();
        },
        onPanResponderTerminate: resetCard,
        onPanResponderTerminationRequest: () => false,
      }),
    [backPet.id, cardDragY, isPetLockEnabled, onChangeActivePet, prevPet.id],
  );

  return (
    <Animated.View style={[styles.screen, { opacity: enterOpacity, transform: [{ translateY: enterTranslateY }] }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isGestureActive}
      >
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <SvgUri uri={logoUri} width={24} height={24} />
            <View>
              <Text style={[styles.brandTitle, fontsLoaded && styles.brandTitleNunito]}>V-Paw</Text>
              <Text style={[styles.brandSub, fontsLoaded && styles.brandSubNunito]}>BY VIRNELO</Text>
            </View>
          </View>

          <Pressable onPress={onOpenProfile} style={styles.avatarBtn}>
            <Image source={{ uri: AVATAR_IMAGE }} style={styles.avatar} />
          </Pressable>
        </View>

        <View style={styles.heroStackWrap}>
          <View style={styles.backCardWrap}>
            <ImageBackground key={`back-${backPet.id}-${backPet.heroImage}`} source={{ uri: backPet.heroImage }} style={[styles.heroCardBack, !frontImageLoaded && styles.heroCardBackHidden]} imageStyle={styles.heroImageBack}>
              <View style={styles.heroBottomBack}>
                <Text style={styles.heroNameBack}>{backPet.name}</Text>
              </View>
            </ImageBackground>
          </View>

          <Animated.View
            {...cardPanResponder.panHandlers}
            style={[styles.frontCardWrap, { opacity: switchFade, transform: [{ translateY: cardDragY }, { scale: switchScale }] }]}
          >
            <ImageBackground key={`front-${activePet.id}-${activePet.heroImage}`} source={{ uri: activePet.heroImage }} style={styles.heroCard} imageStyle={styles.heroImage} onLoadEnd={() => setFrontImageLoaded(true)}>
                            <Pressable style={styles.heroEditBtn} onPress={() => onOpenPetEdit?.(activePet.id)}>
                <Pencil size={15} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
              </Pressable>
<View style={styles.heroBottom}>
                <Text style={styles.heroName}>{activePet.name}</Text>
                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroBreedPill}>{activePet.breed === 'Other' ? (activePet.coatPattern === 'Other' ? 'Other' : activePet.coatPattern) : activePet.breed}</Text>
                  <Text style={styles.heroMeta}>{activePet.age}</Text>
                </View>
              </View>
            </ImageBackground>
          </Animated.View>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.petDots}>
{pets.map((pet, idx) => (
              <Text key={pet.id} style={[styles.petNumber, activePet.id === pet.id && styles.petNumberActive]}>
                {idx + 1}
              </Text>
            ))}
          </View>
          <View style={styles.lockWrap}>
            <Text style={styles.lockText}>{isTr ? 'Hayvan kilidi' : 'Pet lock'}</Text>
            <View style={styles.lockSwitchWrap}>
              {isPetLockEnabled ? (
                <View style={styles.lockPawMark} pointerEvents="none">
                  <PawPrint size={9} color="#5f7f59" strokeWidth={3.1} />
                </View>
              ) : null}
              <View style={styles.lockSwitchScale}>
                <Switch
                  value={isPetLockEnabled}
                  onValueChange={(next) => onChangePetLockEnabled?.(next)}
                  thumbColor={isPetLockEnabled ? '#ffffff' : '#f4f4f4'}
                  trackColor={{ false: '#d8d8d8', true: '#6e8f66' }}
                  ios_backgroundColor="#d8d8d8"
                />
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{isTr ? 'Saðlýk Özeti' : 'Health Overview'}</Text>

        <Pressable style={styles.weightCard} onPress={() => onOpenPetProfile?.(activePet.id)}>
          <View style={styles.weightHeader}>
            <Text style={styles.weightHeaderText}>{isTr ? 'KILO PROFILI' : 'WEIGHT PROFILE'}</Text>
            <Text style={styles.weightPill}>{activePet.weightDelta}</Text>
          </View>

          <View style={styles.weightMainRow}>
            <View style={styles.weightLeftCol}>
              <Text style={styles.weightValue}>{activePet.weight}</Text>
              <Text style={styles.weightSub}>{isTr ? 'Ýdeal kilo korunuyor' : 'Ideal weight maintained'}</Text>
            </View>

            <View style={styles.sparkWrap}>
              <Svg width={106} height={42} viewBox="0 0 106 42">
                <Defs>
                  <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#c8ddc8" stopOpacity="0.24" />
                    <Stop offset="1" stopColor="#c8ddc8" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path d={weightSpark.areaPath} fill="url(#weightArea)" />
                <Path
                  d={weightSpark.linePath}
                  stroke="#9cbf9c"
                  strokeWidth={2.6}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>
          <Text style={styles.weightSub2}>{weightUpdatedText}</Text>
        </Pressable>

        <View style={styles.gridRow}>
          <MiniCard
            icon={<Syringe size={14} color="#777" strokeWidth={2} />}
            title={isTr ? 'ASILAR' : 'VACCINES'}
            value={activePet.vaccines}
            sub={activePet.vaccinesSub}
            onPress={() => onOpenVaccinations?.(activePet.id)}
          />
          <MiniCard
            icon={<Stethoscope size={14} color="#6f7b63" strokeWidth={2.2} />}
            title={isTr ? 'VETERINER' : 'VET'}
            value={activePet.vetVisits}
            sub={activePet.vetVisitsSub}
            onPress={() => onOpenVetVisits?.(activePet.id)}
          />
        </View>

        <View style={styles.gridRow}>
          <MiniCard
            icon={<FileText size={14} color="#777" strokeWidth={2} />}
            title={isTr ? 'SAÐLIK PASAPORTU' : 'HEALTH PASSPORT'}
            value={isTr ? 'Dýþa Aktar' : 'Export'}
            sub={isTr ? 'PDF Belgesi' : 'PDF Document'}
            onPress={() => onOpenPetPassport?.(activePet.id)}
          />
          <MiniCard
            icon={<HeartPulse size={14} color="#c96a6a" strokeWidth={2.2} />}
            title={isTr ? 'SAGLIK KAYITLARI' : 'HEALTH RECORDS'}
            value={activePet.records}
            sub={activePet.recordsSub}
            onPress={() => onOpenHealthRecords?.(activePet.id)}
          />
        </View>

        <View style={styles.upcomingHeader}>
          <Text style={styles.sectionTitle}>{isTr ? 'Yaklaþan' : 'Upcoming'}</Text>
          <Text style={styles.seeAll}>{isTr ? 'Tümünü gör' : 'See all'}</Text>
        </View>

        <View style={styles.upcomingCard}>
          {activePet.upcoming.map((event) => (
            <EventRow key={event.title} title={event.title} date={event.date} />
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

function MiniCard({
  icon,
  title,
  value,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.miniCard} onPress={onPress}>
      <View style={styles.miniTopRow}>
        <View style={styles.miniIconWrap}>{icon}</View>
        <ChevronRight size={14} color="#cecece" strokeWidth={2.4} />
      </View>
      <Text style={styles.miniTitle}>{title}</Text>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniSub}>{sub}</Text>
    </Pressable>
  );
}

function EventRow({ title, date }: { title: string; date: string }) {
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventDotWrap}>
        <View style={styles.eventDotLine} />
        <View style={styles.eventDot} />
      </View>
      <View style={styles.eventTextWrap}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventDate}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f7f4',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 24,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  brandTitleNunito: {
    fontFamily: 'Montserrat_700Bold',
  },
  brandSub: {
    fontSize: 10,
    lineHeight: 12,
    color: '#8d8d8d',
    letterSpacing: 1.7,
    fontWeight: '600',
  },
  brandSubNunito: {
    fontFamily: 'Nunito_600SemiBold',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  heroStackWrap: {
    height: 288,
    justifyContent: 'flex-end',
  },
  backCardWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    zIndex: 1,
  },
  frontCardWrap: {
    zIndex: 2,
  },
  heroCardBack: {
    height: 278,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    opacity: 0.52,
  },
  heroCardBackHidden: {
    opacity: 0,
  },
  heroImageBack: {
    borderRadius: 20,
  },
  heroBottomBack: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  heroNameBack: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  heroCard: {
    height: 288,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderRadius: 20,
  },
  heroEditBtn: {
    position: 'absolute',
    zIndex: 5,
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(28,28,28,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  heroName: {
    fontSize: 50,
    lineHeight: 50,
    fontWeight: '500',
    color: '#fff',
  },
  heroMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBreedPill: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(220,220,220,0.55)',
    backgroundColor: 'rgba(80,80,80,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.86)',
  },
  heroMetaDot: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.72)',
  },
  heroGenderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlRow: {
    marginTop: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lockWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lockText: {
    fontSize: 10,
    color: '#747474',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  lockSwitchScale: {
    width: 42,
    alignItems: 'flex-end',
    transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
  },
  lockSwitchWrap: {
    position: 'relative',
    width: 42,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockPawMark: {
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
  petDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petNumber: {
    fontSize: 12,
    lineHeight: 15,
    color: 'rgba(45,45,45,0.46)',
    fontWeight: '600',
  },
  petNumberActive: {
    color: '#2d2d2d',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '700',
    color: '#2d2d2d',
    marginTop: 4,
  },
  weightCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f3ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  weightHeaderText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#8d8d8d',
    letterSpacing: 0.7,
  },
  weightMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  weightLeftCol: {
    flex: 1,
    paddingRight: 4,
  },
  weightValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightValue: {
    fontSize: 48,
    lineHeight: 50,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.8,
  },
  weightPill: {
    fontSize: 13,
    lineHeight: 16,
    color: '#4a8b56',
    fontWeight: '700',
    backgroundColor: '#e6f3e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  weightSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: '#4e4e4e',
  },
  sparkWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    width: 110,
  },
  weightSub2: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#8f8f8f',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  miniTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  miniIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f2f3f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTitle: {
    fontSize: 11,
    lineHeight: 14,
    color: '#9c9c9c',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  miniValue: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 21,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  miniSub: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: '#8d8d8d',
  },
  upcomingHeader: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    fontSize: 15,
    lineHeight: 20,
    color: '#6f6f6f',
    fontWeight: '500',
  },
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  eventDotWrap: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 50,
  },
  eventDotLine: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ececec',
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#656565',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  eventTextWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '600',
  },
  eventDate: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: '#8c8c8c',
  },
});






























































