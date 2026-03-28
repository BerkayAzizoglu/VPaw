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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { hap } from '../lib/haptics';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from './WeightTrackingScreen';
import { useLocale } from '../hooks/useLocale';
import { useAppSettings } from '../hooks/useAppSettings';
import type { AiInsight } from '../lib/insightsEngine';

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;

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
  onOpenNotifications?: () => void;
  onOpenAddReminder?: () => void;
  reminderBadgeCount?: number;
  userAvatarUri?: string;
  userInitials?: string;
  onOpenPetProfile?: (petId?: string) => void;
  onOpenWeightTracking?: () => void;
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
  weightGoal?: number;
  nextImportantEvent?: NextImportantEventItem | null;
  healthJourneyEvents?: JourneyEventItem[];
  summaryCard?: {
    title: string;
    body: string;
  };
  expenseBreakdown?: {
    total: number;
    currency: string;
    breakdown: Array<{ label: string; amount: number; color: string }>;
  };
};

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
  if (years <= 0) {
    return locale === 'tr' ? `${months} ay` : `${months} mo`;
  }
  const decimalYears = years + months / 12;
  const rounded = months === 0 ? `${years}` : decimalYears.toFixed(1).replace('.', locale === 'tr' ? ',' : '.');
  return locale === 'tr' ? `${rounded} yas` : `${rounded} yrs`;
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
const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_SHORT_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
function fmtWeightDate(raw: string | undefined, isTr: boolean): string {
  if (!raw) return '';
  const parts = raw.split('T')[0].split('-');
  if (parts.length < 3) return raw;
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (month < 0 || month > 11) return raw;
  const months = isTr ? MONTHS_SHORT_TR : MONTHS_SHORT_EN;
  return `${months[month]} ${day}`;
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
  onOpenNotifications,
  onOpenAddReminder,
  reminderBadgeCount = 0,
  userAvatarUri,
  userInitials = 'VP',
  onOpenPetProfile,
  onOpenWeightTracking,
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
  weightGoal,
  nextImportantEvent,
  healthJourneyEvents,
  summaryCard,
  expenseBreakdown,
}: HomeScreenProps) {
  const { locale } = useLocale();
  const { settings } = useAppSettings();
  const isTr = locale === 'tr';

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
  const todayPulse = useMemo(() => {
    const todayItems = activeUpcoming.slice(0, 2).map((item) => ({
      id: `today-${item.id}`,
      label: isTr ? 'Bugün' : 'Today',
      title: item.title,
      sub: item.date,
      urgent: false,
    }));
    const needsAttentionItems = journeyEvents
      .filter((event) => !!event.urgent)
      .slice(0, 2)
      .map((event) => ({
        id: `attention-${event.id}`,
        label: isTr ? 'Dikkat' : 'Needs attention',
        title: event.title,
        sub: event.subtitle ?? event.date ?? '',
        urgent: true,
      }));
    const upcomingItems = journeyEvents
      .filter((event) => !event.urgent)
      .slice(0, 2)
      .map((event) => ({
        id: `upcoming-${event.id}`,
        label: isTr ? 'Yaklaşan' : 'Upcoming',
        title: event.title,
        sub: event.subtitle ?? event.date ?? '',
        urgent: false,
      }));
    const merged = [...needsAttentionItems, ...todayItems, ...upcomingItems];
    return merged.slice(0, 4);
  }, [activeUpcoming, isTr, journeyEvents]);
  const weightSpark = useMemo(() => {
    const chartW = 106;
    const chartH = 42;
    const inset = 2;
    const values = (activeWeightHistory.length > 0 ? activeWeightHistory : [{ value: Number(activePet?.weight?.split(' ')[0] ?? 0) || 0 }]).map((p) => p.value);
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
  }, [activePet?.weight, activeWeightHistory]);

  const weightUpdatedText = hasWeightData
    ? (fmtWeightDate(weightSpark.latestDate, isTr) || (isTr ? 'Son güncelleme bugün' : 'Last updated today'))
    : (isTr ? 'Henüz giriş yok' : 'No entries yet');

  const weightStatusInfo = useMemo(() => {
    if (!hasWeightData || activePet.weightDelta === '—') {
      return { status: isTr ? 'Henüz giriş yok' : 'No entries yet', badgeBg: '#eeeee8', badgeFg: '#6a6a6a' };
    }
    const d = activePet.weightDelta;
    const isNeg = d.startsWith('-');
    const isZero = /^[+]?0\.0/.test(d);
    if (isZero) return { status: isTr ? 'İdeal kilo korunuyor' : 'Ideal weight maintained', badgeBg: '#e6f3e8', badgeFg: '#4a8b56' };
    if (isNeg) return { status: isTr ? 'Düşüş görülüyor' : 'Weight declining', badgeBg: '#fde8e3', badgeFg: '#a73b21' };
    return { status: isTr ? 'Artış görülüyor' : 'Weight gaining', badgeBg: '#fff3e0', badgeFg: '#9a6520' };
  }, [activePet, hasWeightData, isTr]);

  const goalProgress = useMemo(() => {
    if (!weightGoal || weightGoal <= 0 || !hasWeightData) return null;
    const currentKg = parseFloat(activeWeightHistory[activeWeightHistory.length - 1]?.value?.toString() ?? '0');
    if (!Number.isFinite(currentKg) || currentKg <= 0) return null;
    const ratio = Math.min(1, Math.max(0, currentKg / weightGoal));
    const onTarget = currentKg <= weightGoal;
    return { ratio, currentKg, onTarget };
  }, [weightGoal, hasWeightData, activeWeightHistory]);

  useEffect(() => {
    setFrontImageLoaded(false);
  }, [activePet?.id]);

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
              <Text style={styles.brandTitle}>V-Paw</Text>
              <Text style={styles.brandSub}>BY VIRNELO</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <Pressable onPress={onOpenNotifications ?? onOpenReminders} style={styles.notifyBtn}>
              <LottieView
                source={require('../assets/animations/empty-notifications.json')}
                autoPlay
                loop
                style={styles.notifyLottie}
              />
              {reminderBadgeCount > 0 ? (
                <View style={styles.notifyBadge}>
                  <Text style={styles.notifyBadgeText}>{Math.min(reminderBadgeCount, 9)}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable onPress={onOpenProfile} style={styles.avatarBtn}>
              {userAvatarUri ? (
                <Image source={{ uri: userAvatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{userInitials}</Text>
              )}
            </Pressable>
          </View>
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
            <Pressable
              style={({ pressed }) => [styles.heroCard, pressed && styles.heroCardPressed]}
              onPress={() => {
                hap.light();
                onOpenPetProfile?.(activePet.id);
              }}
            >
              <ImageBackground
                key={`front-${activePet.id}-${activePet.heroImage}`}
                source={{ uri: activePet.heroImage }}
                style={styles.heroCardImageWrap}
                imageStyle={styles.heroImage}
                onLoadEnd={() => setFrontImageLoaded(true)}
              >
                <View style={styles.heroBottom}>
                  <Text style={styles.heroName}>{activePet.name}</Text>
                  <View style={styles.heroMetaRow}>
                    <Text style={styles.heroBreedPill}>{activePet.breed === 'Other' ? (activePet.coatPattern === 'Other' ? 'Other' : activePet.coatPattern) : activePet.breed}</Text>
                    <Text style={styles.heroMeta}>{activePet.age}</Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── PRIMARY HEALTH CARD (breathing animation) ── */}
        <Animated.View style={breathAnimStyle}>
          <Pressable
            style={({ pressed }) => [styles.weightCard, pressed && styles.weightCardPressed]}
            onPress={() => {
              hap.light();
              onOpenWeightTracking?.();
            }}
          >
            <View style={styles.weightHeader}>
              <Text style={styles.weightLabel}>{isTr ? 'AĞIRLIK PROFİLİ' : 'WEIGHT PROFILE'}</Text>
              <View style={[styles.weightDeltaBadge, { backgroundColor: weightStatusInfo.badgeBg }]}>
                <Text style={[styles.weightDeltaBadgeText, { color: weightStatusInfo.badgeFg }]}>{hasWeightData ? activePet.weightDelta : '—'}</Text>
              </View>
            </View>
            <View style={styles.weightMainRow}>
              <View style={styles.weightLeftCol}>
                <Text style={styles.weightValue}>{activePet.weight}</Text>
                <Text style={styles.weightStatusText}>{weightStatusInfo.status}</Text>
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
            {goalProgress && (
              <View style={styles.goalProgressWrap}>
                <View style={styles.goalProgressTrack}>
                  <View style={[styles.goalProgressFill, { width: `${Math.round(goalProgress.ratio * 100)}%`, backgroundColor: goalProgress.onTarget ? '#6b9e6b' : '#c96a6a' }]} />
                </View>
                <Text style={styles.goalProgressText}>
                  {isTr
                    ? `${goalProgress.currentKg.toFixed(1)} / ${weightGoal!.toFixed(1)} kg hedef`
                    : `${goalProgress.currentKg.toFixed(1)} / ${weightGoal!.toFixed(1)} kg goal`}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        <View style={styles.todayPulseCard}>
          <View style={styles.todayPulseHeader}>
            <Text style={styles.todayPulseTitle}>{isTr ? 'Bugün' : 'Today'}</Text>
            <Pressable style={styles.todayPulseCta} onPress={onOpenNotifications ?? onOpenReminders}>
              <Text style={styles.todayPulseCtaText}>{isTr ? 'Tüm alarmları gör' : 'See all alerts'}</Text>
            </Pressable>
          </View>
          {todayPulse.length > 0 ? (
            <View style={styles.todayPulseList}>
              {todayPulse.map((item, index) => (
                <View key={item.id} style={[styles.todayPulseRow, index !== todayPulse.length - 1 && styles.todayPulseRowBorder]}>
                  <View style={[styles.todayPulseDot, item.urgent && styles.todayPulseDotUrgent]} />
                  <View style={styles.todayPulseTextWrap}>
                    <View style={styles.todayPulseLabelPill}>
                      <Text style={styles.todayPulseLabelText}>{item.label}</Text>
                    </View>
                    <Text style={styles.todayPulseRowTitle} numberOfLines={1}>{item.title}</Text>
                    {item.sub ? <Text style={styles.todayPulseRowSub} numberOfLines={1}>{item.sub}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.todayPulseEmpty}>{isTr ? 'Bugün için dikkat gerektiren bir kayıt yok.' : 'No urgent or upcoming tasks for today.'}</Text>
          )}
        </View>

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

        <View style={styles.expenseCard}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseTitle}>{isTr ? 'Harcama Analizi' : 'Expense Breakdown'}</Text>
            <View style={styles.expenseYearPill}>
              <Text style={styles.expenseYearText}>{new Date().getFullYear()}</Text>
            </View>
          </View>

          {expenseBreakdown && expenseBreakdown.breakdown.length > 0 ? (
            <>
              <View style={styles.expenseStackBar}>
                {expenseBreakdown.breakdown.map((item, index) => (
                  <View
                    key={item.label}
                    style={[
                      styles.expenseStackSegment,
                      { flex: item.amount / expenseBreakdown.total, backgroundColor: item.color },
                      index === 0 && styles.expenseStackFirst,
                      index === expenseBreakdown.breakdown.length - 1 && styles.expenseStackLast,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.expenseRows}>
                {expenseBreakdown.breakdown.map((item) => {
                  const ratio = item.amount / expenseBreakdown.total;
                  const pct = Math.round(ratio * 100);
                  return (
                    <View key={item.label} style={styles.expenseRow}>
                      <View style={[styles.expenseDot, { backgroundColor: item.color }]} />
                      <Text style={styles.expenseRowLabel}>{item.label}</Text>
                      <View style={styles.expenseBarTrack}>
                        <View style={[styles.expenseBarFill, { width: `${Math.max(10, ratio * 100)}%`, backgroundColor: `${item.color}33` }]} />
                      </View>
                      <Text style={styles.expensePct}>{pct}%</Text>
                      <Text style={styles.expenseAmt}>
                        {item.amount.toLocaleString(isTr ? 'tr-TR' : 'en-US')} {expenseBreakdown.currency}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.expenseFooter}>
                <Text style={styles.expenseFooterLabel}>{isTr ? 'Toplam' : 'Total'}</Text>
                <Text style={styles.expenseFooterValue}>
                  {expenseBreakdown.total.toLocaleString(isTr ? 'tr-TR' : 'en-US')} {expenseBreakdown.currency}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.expenseEmpty}>
              <Text style={styles.expenseEmptyText}>
                {isTr
                  ? 'Veteriner ziyareti eklendikçe harcama dağılımı burada görünür.'
                  : 'Expense distribution will appear here as you add vet visits.'}
              </Text>
            </View>
          )}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 132,
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
  brandSub: {
    fontSize: 10,
    lineHeight: 12,
    color: '#8d8d8d',
    letterSpacing: 1.7,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyLottie: {
    width: 35,
    height: 35,
  },
  notifyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#47664a',
    borderWidth: 1.5,
    borderColor: '#f6f4f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBadgeText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '700',
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#173a38',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  heroCardPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.97,
  },
  heroCardImageWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderRadius: 20,
  },
  heroBottom: {
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
  },
  heroName: {
    fontSize: 50,
    lineHeight: 50,
    fontWeight: '500',
    color: '#fff',
  },
  heroMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBreedPill: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(240,245,244,0.42)',
    backgroundColor: 'rgba(56,84,86,0.26)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '600',
  },
  heroMeta: {
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  todayPulseCard: {
    borderRadius: 18,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  todayPulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayPulseTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.2,
  },
  todayPulseCta: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#eef1f4',
  },
  todayPulseCtaText: {
    fontSize: 11,
    lineHeight: 14,
    color: '#5f6770',
    fontWeight: '700',
  },
  todayPulseList: {
    gap: 0,
  },
  todayPulseRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  todayPulseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  todayPulseDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#5f8a6a',
  },
  todayPulseDotUrgent: {
    backgroundColor: '#b65b4a',
  },
  todayPulseTextWrap: {
    flex: 1,
    gap: 3,
  },
  todayPulseLabelPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eceff3',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  todayPulseLabelText: {
    fontSize: 9,
    lineHeight: 12,
    color: '#6f7680',
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  todayPulseRowTitle: {
    fontSize: 14,
    lineHeight: 18,
    color: '#30332e',
    fontWeight: '600',
  },
  todayPulseRowSub: {
    fontSize: 12,
    lineHeight: 16,
    color: '#7b828b',
    fontWeight: '500',
  },
  todayPulseEmpty: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7b828b',
    fontWeight: '500',
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
    borderColor: 'rgba(255,255,255,0.78)',
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#8bcfc2',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  weightCardPressed: {
    borderColor: 'rgba(255,255,255,0.9)',
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  weightValue: {
    fontSize: 48,
    lineHeight: 50,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.8,
  },
  sparkWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    width: 110,
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
  expenseCard: {
    marginTop: 2,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(71,102,74,0.08)',
    shadowColor: '#2d3a2d',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    gap: 14,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#30332e',
    letterSpacing: -0.3,
  },
  expenseYearPill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f1eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseYearText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    color: '#5d605a',
    letterSpacing: 0.6,
  },
  expenseStackBar: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#f1f1eb',
  },
  expenseStackSegment: {
    height: '100%',
  },
  expenseStackFirst: {
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  expenseStackLast: {
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  expenseRows: {
    gap: 10,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  expenseRowLabel: {
    width: 62,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: '#4b4d48',
  },
  expenseBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f1f1eb',
    overflow: 'hidden',
  },
  expenseBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  expensePct: {
    width: 36,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: '#6a6d67',
  },
  expenseAmt: {
    minWidth: 78,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: '#30332e',
  },
  expenseFooter: {
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ecece4',
  },
  expenseFooterLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: '#6a6d67',
  },
  expenseFooterValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#30332e',
    letterSpacing: -0.2,
  },
  expenseEmpty: {
    paddingVertical: 8,
  },
  expenseEmptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6a6d67',
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
  goalProgressWrap: {
    marginTop: 10,
    gap: 5,
  },
  goalProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  goalProgressText: {
    fontSize: 11,
    color: '#8f8f8f',
    fontWeight: '500',
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



























































