import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { SvgUri } from 'react-native-svg';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { ChevronRight, Mars, PawPrint, Pencil, Venus } from 'lucide-react-native';
import type { PetProfile } from '../components/AuthGate';
import type { WeightPoint } from './WeightTrackingScreen';
import { useLocale } from '../hooks/useLocale';
import { useAppSettings } from '../hooks/useAppSettings';
import type { AiInsight } from '../lib/insightsEngine';

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;
const vaccinesCardIconUri = Image.resolveAssetSource(require('../assets/home-icons/vaccines.svg')).uri;
const vetVisitCardIconUri = Image.resolveAssetSource(require('../assets/home-icons/vet-visit.svg')).uri;
const healthCardIconUri = Image.resolveAssetSource(require('../assets/home-icons/health-card.svg')).uri;
const healthRecordsCardIconUri = Image.resolveAssetSource(require('../assets/home-icons/health-records.svg')).uri;
const HOME_CARD_ICON_SIZE = 26;
const HOME_CARD_ICON_SIZE_LARGE = 30;

export type JourneyEventItem = {
  id: string;
  eventType: 'reminder' | 'vaccine' | 'vet' | 'record' | 'insight';
  title: string;
  subtitle?: string;
  date?: string;
  urgent?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export type NextImportantEventItem = {
  id: string;
  kind?: 'weight' | 'reminder' | 'visit' | 'vaccine' | 'record' | 'other';
  title: string;
  subtitle?: string;
  date?: string;
  urgent?: boolean;
  ctaLabel?: string;
  onPress?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryPress?: () => void;
};

type HomePetData = {
  id: string;
  name: string;
  petType: 'Dog' | 'Cat';
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
  onOpenProfile?: () => void;
  onOpenReminders?: () => void;
  onOpenAddReminder?: () => void;
  reminderBadgeCount?: number;
  userAvatarUri?: string;
  userInitials?: string;
  onOpenPetProfile?: (petId?: string) => void;
  onOpenVaccinations?: (petId?: string) => void;
  onOpenHealthRecords?: (petId?: string) => void;
  onOpenVetVisits?: (petId?: string) => void;
  onOpenPetEdit?: (petId?: string) => void;
  onOpenPetPassport?: (petId?: string) => void;
  petProfiles?: Record<string, PetProfile>;
  weightsByPet?: Record<string, WeightPoint[]>;
  activePetId?: string;
  onChangeActivePet?: (petId: string) => void;
  petLockEnabled?: boolean;
  onChangePetLockEnabled?: (enabled: boolean) => void;
  upcomingRemindersByPet?: Partial<Record<string, Array<{ id: string; title: string; date: string }>>>;
  completedRemindersByPet?: Partial<Record<string, Array<{ id: string; title: string; date: string }>>>;
  onCompleteReminder?: (petId: string, reminderId: string) => void;
  onAddCareReminder?: (petId: string, subtype: 'food' | 'litter' | 'walk' | 'custom') => void;
  topInsights?: AiInsight[];
  onInsightAction?: (insight: AiInsight) => void;
  onQuickAddWeight?: (value: number) => void;
  nextImportantEvent?: NextImportantEventItem | null;
  healthJourneyEvents?: JourneyEventItem[];
  summaryCard?: {
    title: string;
    body: string;
  };
};

const BASE_PETS: HomePetData[] = [
  {
    id: 'luna',
    name: 'Luna',
    petType: 'Dog',
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
      { title: 'Annual checkup', date: 'March 28, 2026 ï¿½ 10:30 AM' },
      { title: 'Flea & tick prevention', date: 'April 1, 2026' },
      { title: 'Grooming appointment', date: 'April 15, 2026 ï¿½ 2:00 PM' },
    ],
  },
  {
    id: 'milo',
    name: 'Milo',
    petType: 'Cat',
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
      { title: 'Weight review', date: 'March 30, 2026 ï¿½ 09:30 AM' },
      { title: 'Dental check', date: 'April 5, 2026 ï¿½ 2:00 PM' },
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
  if (locale === 'tr') return `${years} yıl ${months} ay`;
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
  onOpenReminders,
  onOpenAddReminder,
  reminderBadgeCount = 0,
  userAvatarUri,
  userInitials = 'VP',
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
  upcomingRemindersByPet,
  completedRemindersByPet,
  onCompleteReminder,
  onAddCareReminder,
  topInsights = [],
  onInsightAction,
  onQuickAddWeight,
  nextImportantEvent,
  healthJourneyEvents,
  summaryCard,
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
  const [quickWeightVisible, setQuickWeightVisible] = useState(false);
  const [quickWeightValue, setQuickWeightValue] = useState('');
  const [quickWeightSaved, setQuickWeightSaved] = useState(false);

  // ── Native Animated: weight card breathing + urgent pulse ──
  const breathAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1, duration: 3400, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 0, duration: 3400, useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 680, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 820, useNativeDriver: true }),
      ]),
    );
    breathLoop.start();
    pulseLoop.start();
    return () => {
      breathLoop.stop();
      pulseLoop.stop();
    };
  }, [breathAnim, pulseAnim]);

  const breathAnimStyle = {
    transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.004] }) }],
  };

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
    if (!petProfiles) return [];
    return Object.values(petProfiles)
      .filter((profile) => profile && typeof profile.name === 'string' && profile.name.trim().length > 0)
      .map((profile) => {
        const history = weightsByPet?.[profile.id] ?? [];
        const latest = history[history.length - 1];
        const prev = history[history.length - 2];
        let computedWeight = isTr ? 'Veri yok' : 'No data';
        let computedDelta = '—';
        if (latest) {
          computedWeight = formatWeightByUnit(latest.value, settings.weightUnit);
          const delta = prev ? latest.value - prev.value : 0;
          computedDelta = formatDeltaByUnit(Math.abs(delta) < 0.01 ? 0 : delta, settings.weightUnit);
        }
        return {
          id: profile.id,
          name: profile.name,
          petType: profile.petType,
          breed: profile.breed,
          coatPattern: profile.coatPattern,
          age: formatPetAge(profile.birthDate, locale),
          gender: profile.gender,
          heroImage: profile.image,
          weight: computedWeight,
          weightDelta: computedDelta,
          vaccines: isTr ? 'Kayıt yok' : 'No data',
          vaccinesSub: '',
          vetVisits: '—',
          vetVisitsSub: '',
          records: '—',
          recordsSub: '',
          upcoming: [],
        } satisfies HomePetData;
      });
  }, [isTr, locale, petProfiles, settings.weightUnit, weightsByPet]);

  const activeIndex = useMemo(() => {
    const idx = pets.findIndex((p) => p.id === activePetId);
    return idx >= 0 ? idx : 0;
  }, [activePetId, pets]);

  const activePet = pets[activeIndex] ?? null;
  const activeUpcoming = (activePet ? (upcomingRemindersByPet?.[activePet.id] ?? []) : []).slice(0, 2);
  const backPet = pets.length > 1 ? pets[(activeIndex + 1) % pets.length] : null;
  const prevPet = pets.length > 1 ? pets[(activeIndex - 1 + pets.length) % pets.length] : null;
  const activeWeightHistory = (activePet ? (weightsByPet?.[activePet.id] ?? []) : []).slice(-6);
  const hasWeightData = activeWeightHistory.length > 0;

  const fallbackNextImportantEvent: NextImportantEventItem | null = activeUpcoming.length > 0
    ? {
        id: activeUpcoming[0].id,
        kind: 'reminder',
        title: activeUpcoming[0].title,
        subtitle: undefined,
        date: activeUpcoming[0].date,
        urgent: false,
        ctaLabel: isTr ? 'Tamamla' : 'Done',
        onPress: () => onCompleteReminder?.(activePet.id, activeUpcoming[0].id),
      }
    : null;
  const resolvedNextImportantEvent = nextImportantEvent ?? fallbackNextImportantEvent;

  const fallbackJourneyEvents = useMemo<JourneyEventItem[]>(() => {
    const events: JourneyEventItem[] = [];
    for (const r of activeUpcoming) {
      events.push({ id: r.id, eventType: 'reminder', title: r.title, date: r.date });
    }
    for (const insight of topInsights.slice(0, 2)) {
      events.push({
        id: `insight-${insight.type}-${insight.priority}`,
        eventType: insight.actionType === 'addVaccine' ? 'vaccine' : insight.actionType === 'addVisit' ? 'vet' : 'insight',
        title: insight.message,
        urgent: insight.priority === 'high',
        actionLabel: insight.actionLabel ?? undefined,
        onAction: insight.actionType ? () => onInsightAction?.(insight) : undefined,
      });
    }
    return events;
  }, [activeUpcoming, onInsightAction, topInsights]);
  const journeyEvents = (healthJourneyEvents?.length ?? 0) > 0 ? healthJourneyEvents! : fallbackJourneyEvents;
  const urgentCount = journeyEvents.filter((evt) => !!evt.urgent).length;
  const summaryTitle = summaryCard?.title ?? (isTr ? 'Sağlık Özeti' : 'Health Outlook');
  const summaryBody = summaryCard?.body ?? (resolvedNextImportantEvent
    ? (isTr
      ? `Sonraki adım net: ${resolvedNextImportantEvent.title}.`
      : `Next step is clear: ${resolvedNextImportantEvent.title}.`)
    : (isTr
      ? 'Ufuk sakin görünüyor. Planlanan acil adım yok.'
      : 'Your horizon looks clear. No urgent action is pending.'));
  const weightSpark = useMemo(() => {
    const chartW = 106;
    const chartH = 42;
    const inset = 2;
    const values = (activeWeightHistory.length > 0 ? activeWeightHistory : [{ value: Number(activePet?.weight.split(' ')[0] ?? 0) || 0 }]).map((p) => p.value);
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
  }, [activePet.weight, activeWeightHistory]);
  const weightUpdatedText = hasWeightData
    ? (weightSpark.latestDate ?? (isTr ? 'Son güncelleme bugün' : 'Last updated today'))
    : (isTr ? 'Henüz giriş yok' : 'No entries yet');

  useEffect(() => {
    setFrontImageLoaded(false);
  }, [activePet.id]);

  useEffect(() => {
    if (!quickWeightSaved) return;
    const timer = setTimeout(() => setQuickWeightSaved(false), 1600);
    return () => clearTimeout(timer);
  }, [quickWeightSaved]);

  const openQuickWeight = () => {
    const parsed = Number(activePet.weight.replace(',', '.').split(' ')[0]);
    setQuickWeightValue(Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(1) : '');
    setQuickWeightVisible(true);
  };

  const submitQuickWeight = () => {
    const parsed = Number(quickWeightValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onQuickAddWeight?.(Number(parsed.toFixed(1)));
    setQuickWeightVisible(false);
    setQuickWeightSaved(true);
  };

  const resetCard = () => {
    Animated.spring(cardDragY, {
      toValue: 0,
      tension: 80,
      friction: 11,
      useNativeDriver: true,
    }).start(() => setIsGestureActive(false));
  };

  const finishSwitch = (nextPetId: string, settleFrom: number) => {
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
    if (!backPet) { resetCard(); return; }
    Animated.timing(cardDragY, {
      toValue: 190,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      finishSwitch(backPet.id, -42);
    });
  };

  const commitSwitchUp = () => {
    if (!prevPet) { resetCard(); return; }
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
        onMoveShouldSetPanResponder: (_, gesture) => !isPetLockEnabled && pets.length > 1 && Math.abs(gesture.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_, gesture) => !isPetLockEnabled && pets.length > 1 && Math.abs(gesture.dy) > 6,
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
    [backPet, cardDragY, isPetLockEnabled, onChangeActivePet, pets.length, prevPet],
  );

  if (!activePet) {
    return (
      <Animated.View style={[styles.screen, { opacity: enterOpacity, transform: [{ translateY: enterTranslateY }] }]}>
        <StatusBar style="dark" />
        <View style={styles.noPetWrap}>
          <Text style={styles.noPetTitle}>{isTr ? 'Hoş geldin!' : 'Welcome!'}</Text>
          <Text style={styles.noPetSub}>{isTr ? 'İlk evcil hayvanını eklemek için profil sayfasına git.' : 'Go to your profile to add your first pet.'}</Text>
          <Pressable style={styles.noPetBtn} onPress={onOpenProfile}>
            <Text style={styles.noPetBtnText}>{isTr ? 'Profil' : 'Profile'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

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
            {userAvatarUri ? (
              <Image source={{ uri: userAvatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{userInitials}</Text>
            )}
            {reminderBadgeCount > 0 ? (
              <View style={styles.avatarBadge} />
            ) : null}
          </Pressable>
        </View>

        <View style={styles.heroStackWrap}>
          <View style={styles.backCardWrap}>
            {backPet ? (
              <ImageBackground key={`back-${backPet.id}-${backPet.heroImage}`} source={{ uri: backPet.heroImage }} style={[styles.heroCardBack, !frontImageLoaded && styles.heroCardBackHidden]} imageStyle={styles.heroImageBack}>
                <View style={styles.heroBottomBack}>
                  <Text style={styles.heroNameBack}>{backPet.name}</Text>
                </View>
              </ImageBackground>
            ) : null}
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
        {/* ── PRIMARY HEALTH CARD (breathing animation) ── */}
        <Animated.View style={breathAnimStyle}>
          <Pressable style={styles.weightCard} onPress={() => onOpenPetProfile?.(activePet.id)}>
            <View style={styles.weightHeader}>
              <Text style={styles.weightLabel}>{isTr ? 'AĞIRLIK PROFİLİ' : 'WEIGHT PROFILE'}</Text>
              <View style={styles.weightDeltaBadge}>
                <Text style={styles.weightDeltaBadgeText}>{hasWeightData ? activePet.weightDelta : '—'}</Text>
              </View>
            </View>
            <View style={styles.weightMainRow}>
              <View style={styles.weightLeftCol}>
                <Text style={styles.weightValue}>{activePet.weight}</Text>
                <Text style={styles.weightStatusText}>{isTr ? 'İdeal kilo korunuyor' : 'Ideal weight maintained'}</Text>
              </View>
              <View style={styles.sparkWrap}>
                <Svg width={120} height={50} viewBox="0 0 106 42">
                  <Defs>
                    <LinearGradient id="wAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#6b9e6b" stopOpacity="0.20" />
                      <Stop offset="1" stopColor="#6b9e6b" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Path d={weightSpark.areaPath} fill="url(#wAreaGrad)" />
                  <Path d={weightSpark.linePath} stroke="#6b9e6b" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </View>
            <Text style={styles.weightDateText}>{weightUpdatedText}</Text>
          </Pressable>
        </Animated.View>

        {/* ── NEXT IMPORTANT EVENT ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.nextSectionTitle}>{isTr ? 'Sonraki Önemli Olay' : 'Next Important Event'}</Text>
          {reminderBadgeCount > 0 ? (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{reminderBadgeCount}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.nextCard, resolvedNextImportantEvent?.urgent && styles.nextCardUrgent]}>
          {resolvedNextImportantEvent?.urgent ? <View style={styles.nextCardAccentBar} /> : <View style={styles.nextCardAccentBarGreen} />}
          {resolvedNextImportantEvent ? (
            <View style={styles.nextCardRow}>
              <View style={styles.nextTextWrap}>
                <Text style={styles.nextCardTitle} numberOfLines={2}>{resolvedNextImportantEvent.title}</Text>
                {(resolvedNextImportantEvent.subtitle ?? resolvedNextImportantEvent.date) ? (
                  <Text style={styles.nextCardSub}>{resolvedNextImportantEvent.subtitle ?? resolvedNextImportantEvent.date}</Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.nextCardCta, resolvedNextImportantEvent.urgent && styles.nextCardCtaUrgent]}
                onPress={() => {
                  if (resolvedNextImportantEvent.kind === 'weight') {
                    openQuickWeight();
                    return;
                  }
                  resolvedNextImportantEvent.onPress?.();
                }}
              >
                <Text style={[styles.nextCardCtaText, resolvedNextImportantEvent.urgent && styles.nextCardCtaTextUrgent]}>
                  {resolvedNextImportantEvent.ctaLabel ?? (isTr ? 'Aç' : 'Open')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.nextEmptyWrap}>
              <Text style={styles.nextEmptyTitle}>{isTr ? 'Henüz planlı olay yok' : 'No upcoming event yet'}</Text>
              <Text style={styles.nextEmptySub}>
                {isTr ? 'Aşı, ziyaret veya hatırlatma ekleyerek planını başlat.' : 'Start by adding a vaccine, visit, or reminder.'}
              </Text>
              <Pressable style={styles.nextEmptyCta} onPress={onOpenAddReminder}>
                <Text style={styles.nextEmptyCtaText}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>
              </Pressable>
            </View>
          )}
        </View>
        {resolvedNextImportantEvent?.secondaryCtaLabel && resolvedNextImportantEvent?.onSecondaryPress ? (
          <View style={styles.nextSecondaryRow}>
            <Pressable style={styles.nextSecondaryCta} onPress={resolvedNextImportantEvent.onSecondaryPress}>
              <Text style={styles.nextSecondaryCtaText}>{resolvedNextImportantEvent.secondaryCtaLabel}</Text>
            </Pressable>
          </View>
        ) : null}
        {quickWeightSaved ? (
          <View style={styles.quickSuccessWrap}>
            <Text style={styles.quickSuccessText}>{isTr ? 'Kilo kaydı eklendi' : 'Weight entry saved'}</Text>
          </View>
        ) : null}

        {/* ── HEALTH JOURNEY ── */}
        <View style={styles.journeyHeader}>
          <Text style={styles.journeyTitle}>{isTr ? 'Sağlık Yolculuğu' : 'Health Journey'}</Text>
          {journeyEvents.length > 0 ? (
            <View style={styles.journeyCountPill}>
              <Text style={styles.journeyCountPillText}>{journeyEvents.length} {isTr ? 'Olay' : 'Events'}</Text>
            </View>
          ) : null}
        </View>

        {journeyEvents.length > 0 ? (
          <View style={styles.journeyList}>
            <View style={styles.journeyConnector} />
            {journeyEvents.map((evt, i) => (
              <JourneyCard
                key={evt.id}
                eventType={evt.eventType}
                title={evt.title}
                subtitle={evt.subtitle}
                date={evt.date}
                urgent={evt.urgent}
                delay={i * 110}
                pulseAnim={pulseAnim}
                actionLabel={evt.actionLabel}
                onAction={evt.onAction}
                isTr={isTr}
              />
            ))}
          </View>
        ) : (
          <View style={styles.journeyEmpty}>
            <Text style={styles.journeyEmptyTitle}>
              {isTr ? 'Henüz sağlık kaydı yok' : 'No health events yet'}
            </Text>
            <Text style={styles.journeyEmptySub}>
              {isTr
                ? 'Veteriner ziyareti, aşı veya hatırlatma ekleyerek başla.'
                : 'Add a vet visit, vaccine, or reminder to get started.'}
            </Text>
            <Pressable style={styles.journeyEmptyCta} onPress={onOpenAddReminder}>
              <Text style={styles.journeyEmptyCtaText}>{isTr ? '+ Ekle' : '+ Add'}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconCircle}>
            <View style={[styles.summaryIconDot, urgentCount > 0 && styles.summaryIconDotUrgent]} />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>{summaryTitle}</Text>
            <Text style={styles.summaryBody}>{summaryBody}</Text>
          </View>
        </View>

      </ScrollView>

      <Modal
        visible={quickWeightVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickWeightVisible(false)}
      >
        <Pressable style={styles.quickWeightOverlay} onPress={() => setQuickWeightVisible(false)}>
          <Pressable style={styles.quickWeightCard} onPress={() => {}}>
            <Text style={styles.quickWeightTitle}>{isTr ? 'Hızlı Kilo Kaydı' : 'Quick Weight Entry'}</Text>
            <Text style={styles.quickWeightSub}>{isTr ? 'Kilo değerini girin ve kaydedin.' : 'Enter weight value and save.'}</Text>
            <TextInput
              style={styles.quickWeightInput}
              value={quickWeightValue}
              onChangeText={setQuickWeightValue}
              keyboardType="decimal-pad"
              placeholder={isTr ? 'Örn: 5.2' : 'e.g. 5.2'}
              placeholderTextColor="#9d9d9d"
            />
            <View style={styles.quickWeightActions}>
              <Pressable style={styles.quickWeightCancel} onPress={() => setQuickWeightVisible(false)}>
                <Text style={styles.quickWeightCancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Pressable style={styles.quickWeightSave} onPress={submitQuickWeight}>
                <Text style={styles.quickWeightSaveText}>{isTr ? 'Kaydet' : 'Save'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

function QuickReminderChip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.quickReminderChip} onPress={onPress}>
      <Text style={styles.quickReminderChipText}>{label}</Text>
    </Pressable>
  );
}

function JourneyCard({
  eventType,
  title,
  subtitle,
  date,
  urgent,
  delay,
  pulseAnim,
  actionLabel,
  onAction,
  isTr,
}: Omit<JourneyEventItem, 'id'> & {
  delay: number;
  pulseAnim: Animated.Value;
  isTr: boolean;
}) {
  const config = (() => {
    if (eventType === 'vaccine') return { iconBg: '#cbebc8', iconFg: '#3a6a3a', label: isTr ? 'AŞI' : 'VACCINE' };
    if (eventType === 'vet') return { iconBg: '#edffe3', iconFg: '#3a6e45', label: isTr ? 'VET ZİYARETİ' : 'VET VISIT' };
    if (eventType === 'record') return { iconBg: '#ede8f5', iconFg: '#5a4a7a', label: isTr ? 'SAĞLIK KAYDI' : 'HEALTH RECORD' };
    if (eventType === 'reminder') return { iconBg: '#e3eef8', iconFg: '#3a4e7a', label: isTr ? 'HATIRLATMA' : 'REMINDER' };
    return { iconBg: '#eeeee8', iconFg: '#5d605a', label: isTr ? 'SAĞLIK NOTU' : 'HEALTH NOTE' };
  })();

  const pulseStyle = {
    transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.3] }) }],
    opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.0] }),
  };

  return (
    <View style={styles.journeyRow}>
      <View style={[styles.journeyIconBox, { backgroundColor: config.iconBg }]}>
        {urgent ? (
          <Animated.View style={[styles.journeyIconPulse, { borderColor: config.iconFg }, pulseStyle]} />
        ) : null}
        <View style={[styles.journeyIconDot, { backgroundColor: config.iconFg }]} />
      </View>
      <View style={[styles.journeyCard, urgent && styles.journeyCardUrgent]}>
        <Text style={[styles.journeyCardMeta, { color: config.iconFg }]}>
          {config.label}{date ? ` · ${date}` : ''}
        </Text>
        <Text style={styles.journeyCardTitle} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.journeyCardSub}>{subtitle}</Text> : null}
        {urgent ? (
          <View style={styles.urgentTag}>
            <Text style={styles.urgentTagText}>{isTr ? 'ACİL' : 'URGENT'}</Text>
          </View>
        ) : null}
        {onAction && actionLabel ? (
          <Pressable style={styles.journeyCardAction} onPress={onAction}>
            <Text style={styles.journeyCardActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EventRow({ title, date, onPress }: { title: string; date: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.eventRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.eventDotWrap}>
        <View style={styles.eventDotLine} />
        <View style={styles.eventDot} />
      </View>
      <View style={styles.eventTextWrap}>
        <Text style={styles.eventTitle}>{title}</Text>
        <Text style={styles.eventDate}>{date}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 56,
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  avatarBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#47664a',
    borderWidth: 1.5,
    borderColor: '#f6f4f0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  avatarInitials: {
    color: '#5a5a5a',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    alignItems: 'center',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionBadge: {
    height: 22,
    minWidth: 22,
    borderRadius: 11,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  sectionBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#fff',
    fontWeight: '700',
  },
  nextSectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.3,
  },
  nextCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nextCardUrgent: {
    borderColor: 'rgba(180,80,60,0.15)',
    backgroundColor: '#fff',
  },
  nextCardAccentBar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: '#c96a6a',
    marginRight: 12,
    alignSelf: 'stretch',
  },
  nextCardAccentBarGreen: {
    width: 3,
    borderRadius: 999,
    backgroundColor: '#47664a',
    marginRight: 12,
    alignSelf: 'stretch',
  },
  nextCardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nextTextWrap: {
    flex: 1,
    gap: 3,
  },
  nextCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#30332e',
    fontWeight: '700',
  },
  nextCardSub: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7a7a72',
    fontWeight: '500',
  },
  nextCardCta: {
    borderRadius: 12,
    backgroundColor: '#eef6ef',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 0,
  },
  nextCardCtaUrgent: {
    backgroundColor: '#fde8e3',
  },
  nextCardCtaText: {
    color: '#47664a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  nextCardCtaTextUrgent: {
    color: '#a73b21',
  },
  nextEmptyWrap: {
    gap: 6,
  },
  nextEmptyTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  nextEmptySub: {
    color: '#868686',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  nextEmptyCta: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  nextEmptyCtaText: {
    color: '#4f6b43',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  nextSecondaryRow: {
    marginTop: -2,
    alignItems: 'flex-end',
  },
  nextSecondaryCta: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.09)',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nextSecondaryCtaText: {
    color: '#6a6a6a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  quickSuccessWrap: {
    marginTop: -2,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eef5ea',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickSuccessText: {
    color: '#4f6b43',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSvgIcon: {
    opacity: 1,
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
  emptyInfoCard: {
    marginTop: -6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  emptyInfoTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyInfoBody: {
    color: '#868686',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  emptyInfoCta: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyInfoCtaText: {
    color: '#4f6b43',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  quickReminderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  quickReminderChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#faf9f7',
  },
  quickReminderChipText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5f5f5f',
    fontWeight: '600',
  },
  reminderGroupTitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    color: '#8d8d8d',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyInlineWrap: {
    paddingTop: 6,
    gap: 6,
  },
  emptyInlineTitle: {
    color: '#2d2d2d',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyInlineBody: {
    color: '#888',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  emptyInlineCta: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emptyInlineCtaText: {
    color: '#4f6b43',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  reminderDivider: {
    height: 1,
    backgroundColor: '#efefef',
    marginVertical: 4,
  },
  insightPreviewRow: {
    gap: 4,
    paddingVertical: 4,
  },
  insightPreviewMeta: {
    fontSize: 11,
    lineHeight: 14,
    color: '#8a8a8a',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  insightPreviewText: {
    fontSize: 13,
    lineHeight: 17,
    color: '#4f4f4f',
    fontWeight: '600',
  },
  insightPreviewCta: {
    marginTop: 6,
    alignSelf: 'flex-start',
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightPreviewCtaText: {
    color: '#5a5a5a',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
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
  noPetWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  noPetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d2d2d',
    textAlign: 'center',
  },
  noPetSub: {
    fontSize: 15,
    color: '#7a7a7a',
    textAlign: 'center',
    lineHeight: 22,
  },
  noPetBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#2d2d2d',
  },
  noPetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 18,
    backgroundColor: '#eef6ef',
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  summaryIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  summaryIconDotUrgent: {
    backgroundColor: '#f4a896',
  },
  summaryTextWrap: {
    flex: 1,
    gap: 3,
  },
  summaryTitle: {
    fontSize: 14,
    lineHeight: 19,
    color: '#2e4230',
    fontWeight: '700',
  },
  summaryBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#3d5a40',
    fontWeight: '400',
  },
  quickWeightOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.16)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  quickWeightCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  quickWeightTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: '#30332e',
    fontWeight: '700',
  },
  quickWeightSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '400',
  },
  quickWeightInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#faf9f7',
    paddingHorizontal: 12,
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  quickWeightActions: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  quickWeightCancel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  quickWeightCancelText: {
    color: '#6f6f6f',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  quickWeightSave: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickWeightSaveText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },

  // ── Weight card (updated) ──
  weightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8d8d8d',
    letterSpacing: 0.8,
  },
  weightDeltaBadge: {
    backgroundColor: '#e6f3e8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weightDeltaBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a8b56',
  },
  weightStatusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4e4e4e',
    marginTop: 2,
  },
  weightDateText: {
    fontSize: 12,
    color: '#8f8f8f',
    marginTop: 6,
  },

  // ── Secondary health strip ──
  stripContent: {
    gap: 10,
    paddingRight: 4,
  },
  stripChip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 122,
    gap: 1,
  },
  stripChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stripChipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  stripChipSub: {
    fontSize: 11,
    color: '#9a9a9a',
    marginTop: 1,
  },

  // ── Health Journey ──
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  journeyTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.3,
  },
  journeyCountPill: {
    borderRadius: 999,
    backgroundColor: '#eeeee8',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  journeyCountPillText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#5d605a',
    fontWeight: '700',
  },
  journeyList: {
    gap: 10,
  },
  journeyConnector: {
    display: 'none',
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  journeyNodeWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    position: 'relative',
  },
  journeyNodePulseRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  journeyNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#f6f4f0',
  },
  journeyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
    position: 'relative',
  },
  journeyIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  journeyIconPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 2,
  },
  journeyCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  journeyCardUrgent: {
    borderColor: 'rgba(180,77,52,0.2)',
    backgroundColor: '#fff9f8',
  },
  journeyCardMeta: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  journeyCardTitle: {
    fontSize: 14,
    lineHeight: 19,
    color: '#30332e',
    fontWeight: '600',
  },
  journeyCardSub: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7a7a72',
    fontWeight: '400',
  },
  urgentTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#fde8e3',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentTagText: {
    fontSize: 9,
    lineHeight: 12,
    color: '#a73b21',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  journeyCardAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#eef6ef',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  journeyCardActionText: {
    color: '#47664a',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },

  // ── Journey empty state ──
  journeyEmpty: {
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  journeyEmptyTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#30332e',
    fontWeight: '700',
    textAlign: 'center',
  },
  journeyEmptySub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5d605a',
    fontWeight: '400',
    textAlign: 'center',
  },
  journeyEmptyCta: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#47664a',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  journeyEmptyCtaText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
});































































