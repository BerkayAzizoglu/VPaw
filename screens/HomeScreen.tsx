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
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Path, Stop, SvgUri } from 'react-native-svg';
import { Bell } from 'lucide-react-native';
import { hap } from '../lib/haptics';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from './WeightTrackingScreen';
import { useLocale } from '../hooks/useLocale';
import { useAppSettings } from '../hooks/useAppSettings';
import type { AiInsight } from '../lib/insightsEngine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { monoType as mt } from '../lib/typography';

const homeBrandLogoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;
const fallbackPetHeroUri = Image.resolveAssetSource(require('../assets/icon.png')).uri;

export type JourneyEventItem = {
  id: string;
  sourceEventId?: string;
  eventType: 'reminder' | 'vaccine' | 'vet' | 'record' | 'weight' | 'insight';
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
  scrollToTopSignal?: number;
  onOpenProfile?: () => void;
  onOpenReminders?: () => void;
  onOpenNotifications?: () => void;
  onOpenAddReminder?: () => void;
  reminderBadgeCount?: number;
  userAvatarUri?: string;
  userInitials?: string;
  userName?: string;
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
  onTestOnboarding?: () => void;
};
type DayPhase = 'morning' | 'afternoon' | 'evening' | 'night';

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
    return locale === 'tr' ? `${months} ay` : `${months} mos`;
  }
  if (months <= 0) {
    return locale === 'tr' ? `${years} yıl` : `${years} yrs`;
  }
  return locale === 'tr' ? `${years} yıl ${months} ay` : `${years} yrs ${months} mos`;
}

function formatBreedLabel(
  breed: string,
  coatPattern: string,
  petType: 'Dog' | 'Cat',
  locale: 'en' | 'tr',
) {
  const b = breed.trim();
  if (b && b.toLowerCase() !== 'other') return b;

  const c = coatPattern.trim();
  if (c && c.toLowerCase() !== 'other') return c;

  if (locale === 'tr') return petType === 'Cat' ? 'Melez Kedi' : 'Melez Köpek';
  return petType === 'Cat' ? 'Mixed Cat' : 'Mixed Dog';
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

function toDisplayName(value: string | undefined, locale: 'en' | 'tr') {
  const raw = value?.trim() ?? '';
  if (!raw) return locale === 'tr' ? 'İsim Soyisim' : 'User Name';
  const cleaned = raw
    .replace(/@.*$/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return locale === 'tr' ? 'İsim Soyisim' : 'User Name';
  return cleaned.replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US'));
}

function toFirstName(value: string | undefined, locale: 'en' | 'tr') {
  const display = toDisplayName(value, locale);
  return display.split(/\s+/).filter(Boolean)[0] ?? display;
}

function formatHeaderDate(locale: 'en' | 'tr') {
  const localeCode = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.DateTimeFormat(localeCode, {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(new Date());
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
  scrollToTopSignal = 0,
  onOpenProfile,
  onOpenReminders,
  onOpenNotifications,
  onOpenAddReminder,
  reminderBadgeCount = 0,
  userAvatarUri,
  userInitials = 'VP',
  userName,
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
  onTestOnboarding,
}: HomeScreenProps) {
  const { locale } = useLocale();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const isTr = locale === 'tr';
  const dayPhase = useMemo<DayPhase>(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }, []);
  const homeDayPartGreeting = useMemo(() => {
    if (isTr) {
      if (dayPhase === 'morning') return 'Günaydın';
      if (dayPhase === 'afternoon') return 'İyi günler';
      if (dayPhase === 'evening') return 'İyi akşamlar';
      return 'İyi geceler';
    }
    if (dayPhase === 'morning') return 'Good morning';
    if (dayPhase === 'afternoon') return 'Good afternoon';
    if (dayPhase === 'evening') return 'Good evening';
    return 'Good night';
  }, [dayPhase, isTr]);
  const homeDisplayName = useMemo(() => {
    return toFirstName(userName, isTr ? 'tr' : 'en');
  }, [isTr, userName]);
  const headerSmallLine = useMemo(() => formatHeaderDate(isTr ? 'tr' : 'en'), [isTr]);
  const headerTitle = `${homeDayPartGreeting} ${homeDisplayName} !`;

  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView | null>(null);
  const topInset = Math.max(insets.top, 14);
  const topBarHeight = topInset + 56;
  const topChromeHeight = topInset + 58;
  const topChromeOpacity = scrollY.interpolate({
    inputRange: [0, 8, 82],
    outputRange: [0, 0.55, 1],
    extrapolate: 'clamp',
  });

  const cardDragY = useRef(new Animated.Value(0)).current;
  const switchFade = useRef(new Animated.Value(1)).current;
  const switchScale = useRef(new Animated.Value(1)).current;
  const heroWiggleX = useRef(new Animated.Value(0)).current;
  const suppressHeroPressRef = useRef(false);
  const [frontImageLoaded, setFrontImageLoaded] = useState(false);
  const [quickWeightVisible, setQuickWeightVisible] = useState(false);
  const [quickWeightValue, setQuickWeightValue] = useState('');
  const [quickWeightSaved, setQuickWeightSaved] = useState(false);
  const quickWeightSheetTranslateY = useRef(new Animated.Value(360)).current;
  const quickWeightBackdropOpacity = useRef(new Animated.Value(0)).current;
  const quickWeightSheetHeightRef = useRef(360);

  useEffect(() => {
    mainScrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [scrollToTopSignal]);

  const closeQuickWeightSheet = React.useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.spring(quickWeightSheetTranslateY, {
        toValue: quickWeightSheetHeightRef.current,
        damping: 28,
        stiffness: 380,
        useNativeDriver: true,
      }),
      Animated.timing(quickWeightBackdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setQuickWeightVisible(false);
      cb?.();
    });
  }, [quickWeightBackdropOpacity, quickWeightSheetTranslateY]);

  useEffect(() => {
    if (!quickWeightVisible) return;
    quickWeightSheetTranslateY.setValue(quickWeightSheetHeightRef.current);
    quickWeightBackdropOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(quickWeightSheetTranslateY, {
        toValue: 0,
        damping: 24,
        stiffness: 300,
        mass: 0.86,
        useNativeDriver: true,
      }),
      Animated.timing(quickWeightBackdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [quickWeightBackdropOpacity, quickWeightSheetTranslateY, quickWeightVisible]);

  const quickWeightSheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          quickWeightSheetTranslateY.setValue(g.dy);
          quickWeightBackdropOpacity.setValue(Math.max(0, 1 - g.dy / Math.max(quickWeightSheetHeightRef.current, 1)));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 72 || g.vy > 0.6) {
          closeQuickWeightSheet();
          return;
        }
        Animated.parallel([
          Animated.spring(quickWeightSheetTranslateY, {
            toValue: 0,
            damping: 24,
            stiffness: 300,
            useNativeDriver: true,
          }),
          Animated.timing(quickWeightBackdropOpacity, {
            toValue: 1,
            duration: 130,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  // ── Native Animated: weight card breathing + urgent pulse + press ──
  const breathAnim = useRef(new Animated.Value(0)).current;
  const weightCardPressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1, duration: 3400, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 0, duration: 3400, useNativeDriver: true }),
      ]),
    );
    breathLoop.start();
    return () => { breathLoop.stop(); };
  }, [breathAnim]);

  const breathAnimStyle = {
    transform: [
      { scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.004] }) },
      { scale: weightCardPressScale },
    ],
  };
  const headerLogoAnimStyle = {
    transform: [
      { translateY: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) },
      { scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
    ],
  };

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
          heroImage: profile.image?.trim() ? profile.image : fallbackPetHeroUri,
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
    : '';

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
    hap.medium();
    const parsed = Number(activePet.weight.replace(',', '.').split(' ')[0]);
    setQuickWeightValue(Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(1) : '');
    setQuickWeightVisible(true);
  };

  const submitQuickWeight = () => {
    const parsed = Number(quickWeightValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onQuickAddWeight?.(Number(parsed.toFixed(1)));
    closeQuickWeightSheet();
    setQuickWeightSaved(true);
  };

  const resetCard = () => {
    Animated.spring(cardDragY, {
      toValue: 0,
      tension: 80,
      friction: 11,
      useNativeDriver: true,
    }).start();
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
    ]).start();
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

  const runHeroWiggle = () => {
    heroWiggleX.stopAnimation();
    heroWiggleX.setValue(0);
    Animated.sequence([
      Animated.timing(heroWiggleX, { toValue: -4, duration: 45, useNativeDriver: true }),
      Animated.timing(heroWiggleX, { toValue: 4, duration: 75, useNativeDriver: true }),
      Animated.timing(heroWiggleX, { toValue: -3, duration: 70, useNativeDriver: true }),
      Animated.timing(heroWiggleX, { toValue: 2, duration: 55, useNativeDriver: true }),
      Animated.timing(heroWiggleX, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const handleHeroLongPress = () => {
    if (pets.length <= 1) return;
    suppressHeroPressRef.current = true;
    hap.medium();
    runHeroWiggle();
    setTimeout(() => {
      commitSwitchDown();
      suppressHeroPressRef.current = false;
    }, 170);
  };

  if (!activePet) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <View style={styles.noPetWrap}>
          <Text style={styles.noPetTitle}>{isTr ? 'Hoş geldin!' : 'Welcome!'}</Text>
          <Text style={styles.noPetSub}>{isTr ? 'Başlamak için profilinden ilk petini ekle.' : 'Add your first pet from Profile to get started.'}</Text>
          <Pressable style={styles.noPetBtn} onPress={onOpenProfile}>
            <Text style={styles.noPetBtnText}>{isTr ? 'Profil' : 'Profile'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Animated.ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[styles.content, { paddingTop: topBarHeight + 14 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={styles.heroStackWrap}>
          <View style={styles.backCardWrap}>
            {backPet ? (
              <ImageBackground key={`back-${backPet.id}-${backPet.heroImage}`} source={{ uri: backPet.heroImage || fallbackPetHeroUri }} style={[styles.heroCardBack, !frontImageLoaded && styles.heroCardBackHidden]} imageStyle={styles.heroImageBack}>
                <View style={styles.heroBottomBack}>
                  <Text style={styles.heroNameBack}>{backPet.name}</Text>
                </View>
              </ImageBackground>
            ) : null}
          </View>

          <Animated.View
            style={[styles.frontCardWrap, { opacity: switchFade, transform: [{ translateY: cardDragY }, { scale: switchScale }, { translateX: heroWiggleX }] }]}
          >
            <Pressable
              style={({ pressed }) => [styles.heroCard, pressed && styles.heroCardPressed]}
              delayLongPress={240}
              onLongPress={handleHeroLongPress}
              onPress={() => {
                if (suppressHeroPressRef.current) {
                  suppressHeroPressRef.current = false;
                  return;
                }
                hap.light();
                onOpenPetProfile?.(activePet.id);
              }}
            >
              <ImageBackground
                key={`front-${activePet.id}-${activePet.heroImage}`}
                source={{ uri: activePet.heroImage || fallbackPetHeroUri }}
                style={styles.heroCardImageWrap}
                imageStyle={styles.heroImage}
                onLoadEnd={() => setFrontImageLoaded(true)}
              >
                <View style={styles.heroBottom}>
                  <Text style={styles.heroName} numberOfLines={1} ellipsizeMode="tail">{activePet.name}</Text>
                  <View style={styles.heroMetaRow}>
                    <Text style={styles.heroBreedPill}>
                      {formatBreedLabel(activePet.breed, activePet.coatPattern, activePet.petType, locale)}
                    </Text>
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
            style={styles.weightCard}
            onPressIn={() => {
              hap.medium();
              Animated.spring(weightCardPressScale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
            }}
            onPressOut={() => {
              Animated.spring(weightCardPressScale, { toValue: 1, useNativeDriver: true, speed: 36, bounciness: 6 }).start();
            }}
            onPress={() => onOpenWeightTracking?.()}
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
            {weightUpdatedText ? <Text style={styles.weightDateText}>{weightUpdatedText}</Text> : null}
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

        {/* ── TODAY + NEXT EVENT (unified) ── */}
        <View style={styles.todayPulseCard}>
          <View style={styles.todayPulseHeader}>
            <View style={styles.todayPulseTitleRow}>
              <Text style={styles.todayPulseTitle}>{isTr ? 'Bugün' : 'Today'}</Text>
              {reminderBadgeCount > 0 ? (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>{Math.min(reminderBadgeCount, 9)}</Text>
                </View>
              ) : null}
            </View>
            <Pressable style={styles.todayPulseCta} onPress={onOpenNotifications ?? onOpenReminders}>
              <Text style={styles.todayPulseCtaText}>{isTr ? 'Tümünü gör →' : 'See all →'}</Text>
            </Pressable>
          </View>

          {/* Main event row with inline CTA */}
          {resolvedNextImportantEvent ? (
            <View style={[styles.todayMainRow, resolvedNextImportantEvent.urgent && styles.todayMainRowUrgent]}>
              <View style={styles.todayMainTextWrap}>
                <View style={styles.todayPulseLabelPill}>
                  <Text style={styles.todayPulseLabelText}>
                    {resolvedNextImportantEvent.urgent
                      ? (isTr ? 'ACİL' : 'URGENT')
                      : (isTr ? 'SONRAKI' : 'NEXT')}
                  </Text>
                </View>
                <Text style={styles.todayMainTitle} numberOfLines={2}>{resolvedNextImportantEvent.title}</Text>
                {(resolvedNextImportantEvent.subtitle ?? resolvedNextImportantEvent.date) ? (
                  <Text style={styles.todayPulseRowSub}>
                    {resolvedNextImportantEvent.subtitle ?? resolvedNextImportantEvent.date}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.todayMainCta, resolvedNextImportantEvent.urgent && styles.todayMainCtaUrgent]}
                onPress={() => {
                  if (resolvedNextImportantEvent.kind === 'weight') { openQuickWeight(); return; }
                  resolvedNextImportantEvent.onPress?.();
                }}
              >
                <Text style={[styles.todayMainCtaText, resolvedNextImportantEvent.urgent && styles.todayMainCtaTextUrgent]}>
                  {resolvedNextImportantEvent.ctaLabel ?? (isTr ? 'Aç' : 'Open')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Secondary items */}
          {(() => {
            const mainId = resolvedNextImportantEvent?.id ?? null;
            const remaining = todayPulse.filter((item) => {
              if (!mainId) return true;
              const strippedId = item.id.replace(/^(today-|attention-|upcoming-)/, '');
              return strippedId !== mainId;
            });
            if (remaining.length === 0 && !resolvedNextImportantEvent) {
              return (
                <>
                  <Text style={styles.todayPulseEmpty}>
                    {isTr ? 'Bugün için görev yok.' : 'No tasks for today.'}
                  </Text>
                  <Pressable style={styles.todayEmptyCta} onPress={onOpenAddReminder}>
                    <Text style={styles.todayEmptyCtaText}>{isTr ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>
                  </Pressable>
                </>
              );
            }
            if (remaining.length === 0) return null;
            return (
              <View style={[styles.todayPulseList, resolvedNextImportantEvent && styles.todayPulseListSep]}>
                {remaining.map((item, index) => (
                  <View key={item.id} style={[styles.todayPulseRow, index !== remaining.length - 1 && styles.todayPulseRowBorder]}>
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
            );
          })()}

          {resolvedNextImportantEvent?.secondaryCtaLabel && resolvedNextImportantEvent?.onSecondaryPress ? (
            <Pressable style={styles.todaySecondaryCta} onPress={resolvedNextImportantEvent.onSecondaryPress}>
              <Text style={styles.todaySecondaryCtaText}>{resolvedNextImportantEvent.secondaryCtaLabel}</Text>
            </Pressable>
          ) : null}

          {quickWeightSaved ? (
            <View style={styles.quickSuccessWrap}>
              <Text style={styles.quickSuccessText}>{isTr ? 'Kilo kaydı eklendi' : 'Weight entry saved'}</Text>
            </View>
          ) : null}
        </View>

        {/* ── QUICK ACCESS ── */}
        <View style={styles.quickAccessRow}>
          <Pressable
            style={({ pressed }) => [styles.quickAccessChip, pressed && styles.quickAccessChipPressed]}
            onPress={() => onOpenVetVisits?.(activePet.id)}
          >
            <Text style={styles.quickAccessIcon}>🏥</Text>
            <Text style={styles.quickAccessLabel}>{isTr ? 'Ziyaretler' : 'Visits'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickAccessChip, pressed && styles.quickAccessChipPressed]}
            onPress={() => onOpenVaccinations?.(activePet.id)}
          >
            <Text style={styles.quickAccessIcon}>💉</Text>
            <Text style={styles.quickAccessLabel}>{isTr ? 'Aşılar' : 'Vaccines'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickAccessChip, pressed && styles.quickAccessChipPressed]}
            onPress={() => onOpenHealthRecords?.(activePet.id)}
          >
            <Text style={styles.quickAccessIcon}>📋</Text>
            <Text style={styles.quickAccessLabel}>{isTr ? 'Kayıtlar' : 'Records'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickAccessChip, pressed && styles.quickAccessChipPressed]}
            onPress={() => onOpenWeightTracking?.()}
          >
            <Text style={styles.quickAccessIcon}>⚖️</Text>
            <Text style={styles.quickAccessLabel}>{isTr ? 'Kilo' : 'Weight'}</Text>
          </Pressable>
        </View>

      </Animated.ScrollView>

      <View pointerEvents="box-none" style={styles.topChrome}>
        <Animated.View pointerEvents="none" style={[styles.topChromeSurface, { height: topChromeHeight, opacity: topChromeOpacity }]}>
          <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.topChromeTint} />
        </Animated.View>

        <View style={[styles.topRow, styles.topRowFixed, { height: topBarHeight + 2, paddingTop: topInset + 2 }]}>
          <View style={styles.brandWrap}>
            <Animated.View style={[styles.brandLogoWrap, headerLogoAnimStyle]}>
              <SvgUri uri={homeBrandLogoUri} width={44} height={44} />
            </Animated.View>
            <View style={styles.greetingWrap}>
              {__DEV__ && onTestOnboarding ? (
                <Pressable style={styles.devOnboardingBadge} onPress={onTestOnboarding}>
                  <Text style={styles.devOnboardingBadgeText}>OB</Text>
                </Pressable>
              ) : null}
              <Text style={styles.greetingSmall} numberOfLines={1}>{headerSmallLine}</Text>
              <Text style={styles.greetingName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                {headerTitle}
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <Pressable onPress={onOpenNotifications ?? onOpenReminders} style={styles.notifyBtn}>
              <Bell size={18} color="#40443d" strokeWidth={2.1} />
              {reminderBadgeCount > 0 ? (
                <View style={styles.notifyBadge}>
                  <Text style={styles.notifyBadgeText}>{Math.min(reminderBadgeCount, 9)}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={quickWeightVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeQuickWeightSheet()}
      >
        <View style={styles.quickWeightOverlay}>
          <Animated.View pointerEvents="none" style={[styles.quickWeightBackdrop, { opacity: quickWeightBackdropOpacity }]} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => closeQuickWeightSheet()} />
          <Animated.View
            style={[styles.quickWeightCard, { transform: [{ translateY: quickWeightSheetTranslateY }] }]}
            onLayout={(event) => { quickWeightSheetHeightRef.current = event.nativeEvent.layout.height; }}
          >
            <View style={styles.quickWeightHandleZone} {...quickWeightSheetPan.panHandlers}>
              <View style={styles.quickWeightHandle} />
            </View>
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
              <Pressable style={styles.quickWeightCancel} onPress={() => closeQuickWeightSheet()}>
                <Text style={styles.quickWeightCancelText}>{isTr ? 'İptal' : 'Cancel'}</Text>
              </Pressable>
              <Pressable style={styles.quickWeightSave} onPress={submitQuickWeight}>
                <Text style={styles.quickWeightSaveText}>{isTr ? 'Kaydet' : 'Save'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6f4f0',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 132,
    gap: 14,
  },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  topChromeSurface: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(130,130,120,0.16)',
  },
  topChromeTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(246,244,240,0.62)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRowFixed: {
    paddingLeft: 22,
    paddingRight: 20,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  brandLogoWrap: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 2,
    marginLeft: 0,
  },
  brandLogoImage: {
    width: 44,
    height: 44,
  },
  greetingWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    paddingRight: 2,
    marginLeft: 2,
    position: 'relative',
  },
  greetingSmall: {
    ...mt.metricSm,
    fontSize: 12,
    lineHeight: 15,
    color: '#5a5a5a',
    letterSpacing: -0.1,
  },
  greetingName: {
    ...mt.metricLg,
    fontSize: 21,
    lineHeight: 24,
    color: '#1f2f2a',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  notifyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  notifyBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
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
  devOnboardingBadge: {
    position: 'absolute',
    left: 6,
    top: 14,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 52, 70, 0.88)',
    zIndex: 10,
  },
  devOnboardingBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
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
    maxWidth: '94%',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  todayPulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayPulseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBadge: {
    height: 18,
    minWidth: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#47664a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
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
  todayEmptyCta: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  todayEmptyCtaText: {
    color: '#4f6b43',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  todayMainRow: {
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#47664a',
    backgroundColor: '#f3f8f3',
  },
  todayMainRowUrgent: {
    borderLeftColor: '#a73b21',
    backgroundColor: '#fdf6f5',
  },
  todayMainTextWrap: {
    flex: 1,
    gap: 3,
  },
  todayMainTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    color: '#1f2f2a',
    letterSpacing: -0.1,
  },
  todayMainCta: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#edf5ea',
    borderWidth: 1,
    borderColor: '#c4dcc0',
    flexShrink: 0,
  },
  todayMainCtaUrgent: {
    backgroundColor: '#f9e5e1',
    borderColor: '#e8b4aa',
  },
  todayMainCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#47664a',
    letterSpacing: -0.1,
  },
  todayMainCtaTextUrgent: {
    color: '#a73b21',
  },
  todayPulseListSep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.07)',
    marginTop: 2,
    paddingTop: 2,
  },
  todaySecondaryCta: {
    alignSelf: 'flex-end',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.09)',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  todaySecondaryCtaText: {
    color: '#6a6a6a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  quickSuccessWrap: {
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
    ...mt.metricLg,
    fontSize: 48,
    lineHeight: 50,
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
  quickWeightOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  quickWeightBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  quickWeightCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 22,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  quickWeightHandleZone: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 6,
  },
  quickWeightHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d0d3cb',
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
    ...mt.metric,
    fontSize: 13,
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
    ...mt.metricSm,
    fontSize: 11,
    color: '#8f8f8f',
  },

  // ── Health Journey ──
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAccessChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#1d252d',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickAccessChipPressed: {
    backgroundColor: '#f3f3ed',
  },
  quickAccessIcon: {
    fontSize: 22,
    lineHeight: 26,
  },
  quickAccessLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#454845',
    letterSpacing: -0.1,
  },
});



























































