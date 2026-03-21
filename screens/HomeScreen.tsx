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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { SvgUri } from 'react-native-svg';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Activity, ChevronRight, ClipboardList, FileText, Mars, PawPrint, Pencil, Syringe, Venus } from 'lucide-react-native';

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;
const AVATAR_IMAGE = 'https://www.figma.com/api/mcp/asset/c1377527-400c-4e5e-8c97-bd4806f77781';
const PET_LOCK_STORAGE_KEY = 'vpaw_pet_lock_enabled';

type PetId = 'luna' | 'milo';

type HomePetData = {
  id: PetId;
  name: string;
  breed: string;
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
  activePetId?: string;
  onChangeActivePet?: (petId: string) => void;
};

const PETS: HomePetData[] = [
  {
    id: 'luna',
    name: 'Luna',
    breed: 'Golden Retriever',
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

export default function HomeScreen({
  onOpenProfile,
  onOpenPetProfile,
  onOpenVaccinations,
  onOpenHealthRecords,
  onOpenVetVisits,
  onOpenPetEdit,
  activePetId,
  onChangeActivePet,
}: HomeScreenProps) {
  const [fontsLoaded] = useFonts({
    Nunito_600SemiBold,
    Montserrat_700Bold,
  });

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslateY = useRef(new Animated.Value(14)).current;
  const cardDragY = useRef(new Animated.Value(0)).current;
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [petLockEnabled, setPetLockEnabled] = useState(false);
  const [lockHydrated, setLockHydrated] = useState(false);
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
  useEffect(() => {
    let mounted = true;

    const loadPetLock = async () => {
      try {
        const raw = await AsyncStorage.getItem(PET_LOCK_STORAGE_KEY);
        if (!mounted) return;
        if (raw != null) setPetLockEnabled(raw === '1');
      } finally {
        if (mounted) setLockHydrated(true);
      }
    };

    loadPetLock();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!lockHydrated) return;
    AsyncStorage.setItem(PET_LOCK_STORAGE_KEY, petLockEnabled ? '1' : '0').catch(() => {});
  }, [lockHydrated, petLockEnabled]);

  const activeIndex = useMemo(() => {
    const idx = PETS.findIndex((p) => p.id === activePetId);
    return idx >= 0 ? idx : 0;
  }, [activePetId]);

  const activePet = PETS[activeIndex];
  const backPet = PETS[(activeIndex + 1) % PETS.length];
  const prevPet = PETS[(activeIndex - 1 + PETS.length) % PETS.length];

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

  const commitSwitchDown = () => {
    Animated.timing(cardDragY, {
      toValue: 190,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      onChangeActivePet?.(backPet.id);
      cardDragY.setValue(0);
      setIsGestureActive(false);
    });
  };

  const commitSwitchUp = () => {
    Animated.timing(cardDragY, {
      toValue: -140,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      onChangeActivePet?.(prevPet.id);
      cardDragY.setValue(0);
      setIsGestureActive(false);
    });
  };

  const cardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => !petLockEnabled && Math.abs(gesture.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_, gesture) => !petLockEnabled && Math.abs(gesture.dy) > 6,
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
    [backPet.id, cardDragY, onChangeActivePet, petLockEnabled, prevPet.id],
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
            <ImageBackground source={{ uri: backPet.heroImage }} style={[styles.heroCardBack, !frontImageLoaded && styles.heroCardBackHidden]} imageStyle={styles.heroImageBack}>
              <View style={styles.heroBottomBack}>
                <Text style={styles.heroNameBack}>{backPet.name}</Text>
              </View>
            </ImageBackground>
          </View>

          <Animated.View
            {...cardPanResponder.panHandlers}
            style={[styles.frontCardWrap, { transform: [{ translateY: cardDragY }] }]}
          >
            <ImageBackground source={{ uri: activePet.heroImage }} style={styles.heroCard} imageStyle={styles.heroImage} onLoadEnd={() => setFrontImageLoaded(true)}>
                            <Pressable style={styles.heroEditBtn} onPress={() => onOpenPetEdit?.(activePet.id)}>
                <Pencil size={15} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
              </Pressable>
<View style={styles.heroBottom}>
                <Text style={styles.heroName}>{activePet.name}</Text>
                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroBreedPill}>{activePet.breed}</Text>
                  <Text style={styles.heroMeta}>{activePet.age}</Text>
                </View>
              </View>
            </ImageBackground>
          </Animated.View>
        </View>

        <View style={styles.controlRow}>
          <View style={styles.petDots}>
{PETS.map((pet, idx) => (
              <Text key={pet.id} style={[styles.petNumber, activePet.id === pet.id && styles.petNumberActive]}>
                {idx + 1}
              </Text>
            ))}
          </View>
          <View style={styles.lockWrap}>
            <Text style={styles.lockText}>Pet lock</Text>
            <View style={styles.lockSwitchWrap}>
              {petLockEnabled ? (
                <View style={styles.lockPawMark} pointerEvents="none">
                  <PawPrint size={9} color="#5f7f59" strokeWidth={3.1} />
                </View>
              ) : null}
              <View style={styles.lockSwitchScale}>
                <Switch
                  value={petLockEnabled}
                  onValueChange={setPetLockEnabled}
                  thumbColor={petLockEnabled ? '#ffffff' : '#f4f4f4'}
                  trackColor={{ false: '#d8d8d8', true: '#6e8f66' }}
                  ios_backgroundColor="#d8d8d8"
                />
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Health Overview</Text>

        <Pressable style={styles.weightCard} onPress={() => onOpenPetProfile?.(activePet.id)}>
          <View style={styles.weightHeader}>
            <Text style={styles.weightHeaderText}>WEIGHT PROFILE</Text>
            <Text style={styles.weightPill}>{activePet.weightDelta}</Text>
          </View>

          <View style={styles.weightMainRow}>
            <View style={styles.weightLeftCol}>
              <Text style={styles.weightValue}>{activePet.weight}</Text>
              <Text style={styles.weightSub}>Ideal weight maintained</Text>
            </View>

            <View style={styles.sparkWrap}>
              <Svg width={106} height={42} viewBox="0 0 106 42">
                <Defs>
                  <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#c8ddc8" stopOpacity="0.24" />
                    <Stop offset="1" stopColor="#c8ddc8" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Path d="M2 34 C 14 29, 24 24, 34 23 C 43 22, 49 26, 58 21 C 68 16, 76 12, 84 15 C 92 18, 98 14, 104 11 L 104 40 L 2 40 Z" fill="url(#weightArea)" />
                <Path
                  d="M2 34 C 14 29, 24 24, 34 23 C 43 22, 49 26, 58 21 C 68 16, 76 12, 84 15 C 92 18, 98 14, 104 11"
                  stroke="#9cbf9c"
                  strokeWidth={2.6}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>
          <Text style={styles.weightSub2}>Last updated today</Text>
        </Pressable>

        <View style={styles.gridRow}>
          <MiniCard
            icon={<Syringe size={14} color="#777" strokeWidth={2} />}
            title="VACCINES"
            value={activePet.vaccines}
            sub={activePet.vaccinesSub}
            onPress={() => onOpenVaccinations?.(activePet.id)}
          />
          <MiniCard
            icon={<Activity size={14} color="#777" strokeWidth={2} />}
            title="VET VISITS"
            value={activePet.vetVisits}
            sub={activePet.vetVisitsSub}
            onPress={() => onOpenVetVisits?.(activePet.id)}
          />
        </View>

        <View style={styles.gridRow}>
          <MiniCard icon={<FileText size={14} color="#777" strokeWidth={2} />} title="PASSPORT" value="Export" sub="PDF Document" />
          <MiniCard
            icon={<ClipboardList size={14} color="#777" strokeWidth={2} />}
            title="RECORDS"
            value={activePet.records}
            sub={activePet.recordsSub}
            onPress={() => onOpenHealthRecords?.(activePet.id)}
          />
        </View>

        <View style={styles.upcomingHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.seeAll}>See all</Text>
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
    borderWidth: 2,
    borderColor: '#b89447',
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





































