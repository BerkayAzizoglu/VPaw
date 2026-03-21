import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import PremiumScreen from '../screens/PremiumScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import VaccinationsScreen from '../screens/VaccinationsScreen';
import WeightTrackingScreen, { WeightPoint } from '../screens/WeightTrackingScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import VetVisitsScreen from '../screens/VetVisitsScreen';
import PetEditScreen from '../screens/PetEditScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PetHealthPassportScreen from '../screens/PetHealthPassportScreen';
import PetProfilesScreen from '../screens/PetProfilesScreen';
import { fetchPetProfilesFromCloud, savePetProfilesToCloud } from '../lib/petProfilesRepo';

type AppRoute =
  | 'home'
  | 'profile'
  | 'premium'
  | 'profileEdit'
  | 'vaccinations'
  | 'petProfile'
  | 'healthRecords'
  | 'vetVisits'
  | 'petEdit'
  | 'settings'
  | 'passport'
  | 'petProfiles';

type PetId = 'luna' | 'milo';
export type VaccinationRecord = {
  name: string;
  date: string;
};

export type SurgeryRecord = {
  name: string;
  date: string;
  note?: string;
};

export type AllergyRecord = {
  category: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved';
};

export type DiabetesRecord = {
  type: string;
  date: string;
  status: 'active' | 'remission' | 'resolved';
};

export type RoutineCareRecord = {
  enabled: boolean;
  lastDate: string;
  intervalDays: number;
};

export type PetProfile = {
  id: PetId;
  name: string;
  petType: 'Dog' | 'Cat';
  gender: 'male' | 'female';
  breed: string;
  coatPattern: string;
  birthDate: string;
  ageYears: number;
  microchip: string;
  image: string;
  vaccines: string;
  surgeries: string;
  vaccinations: VaccinationRecord[];
  surgeriesLog: SurgeryRecord[];
  allergiesLog: AllergyRecord[];
  diabetesLog: DiabetesRecord[];
  routineCare: {
    internalParasite: RoutineCareRecord;
    externalParasite: RoutineCareRecord;
  };
  chronicConditions: {
    allergies: boolean;
    diabetes: boolean;
  };
};

const INITIAL_PET_PROFILES: Record<PetId, PetProfile> = {
  luna: {
    id: 'luna',
    name: 'Luna',
    petType: 'Dog',
    gender: 'female',
    breed: 'Golden Retriever',
    coatPattern: 'Solid',
    birthDate: '2023-03-21',
    ageYears: 3,
    microchip: '985 112 004 883',
    image: 'https://www.figma.com/api/mcp/asset/6f25c37a-f633-4891-ba3b-0fab066dac17',
    vaccines: 'DHPP, Rabies',
    surgeries: 'None',
    vaccinations: [
      { name: 'DHPP', date: '2026-01-20' },
      { name: 'Rabies', date: '2026-01-20' },
    ],
    surgeriesLog: [],
    allergiesLog: [],
    diabetesLog: [],
    routineCare: {
      internalParasite: { enabled: true, lastDate: '2026-03-01', intervalDays: 30 },
      externalParasite: { enabled: true, lastDate: '2026-03-01', intervalDays: 30 },
    },
    chronicConditions: {
      allergies: false,
      diabetes: false,
    },
  },
  milo: {
    id: 'milo',
    name: 'Milo',
    petType: 'Cat',
    gender: 'male',
    breed: 'British Shorthair',
    coatPattern: 'Tabby',
    birthDate: '2024-03-21',
    ageYears: 2,
    microchip: '985 112 004 992',
    image: 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?q=80&w=1200&auto=format&fit=crop',
    vaccines: 'DHPP, Rabies, Feline Leukemia',
    surgeries: 'None',
    vaccinations: [
      { name: 'DHPP', date: '2026-01-20' },
      { name: 'Rabies', date: '2026-01-20' },
    ],
    surgeriesLog: [],
    allergiesLog: [],
    diabetesLog: [],
    routineCare: {
      internalParasite: { enabled: true, lastDate: '2026-03-01', intervalDays: 30 },
      externalParasite: { enabled: true, lastDate: '2026-03-01', intervalDays: 30 },
    },
    chronicConditions: {
      allergies: true,
      diabetes: false,
    },
  },
};

const ACTIVE_PET_STORAGE_KEY = 'vpaw_active_pet_id';
const PET_PROFILES_STORAGE_KEY = 'vpaw_pet_profiles';

function normalizePetProfiles(raw: unknown): Record<PetId, PetProfile> {
  if (!raw || typeof raw !== 'object') return INITIAL_PET_PROFILES;
  const source = raw as Record<string, Partial<PetProfile>>;
  const ids: PetId[] = ['luna', 'milo'];
  const next = { ...INITIAL_PET_PROFILES };

  ids.forEach((id) => {
    const incoming = source[id];
    if (!incoming || typeof incoming !== 'object') return;
    next[id] = {
      ...INITIAL_PET_PROFILES[id],
      ...incoming,
      vaccinations: Array.isArray(incoming.vaccinations) ? incoming.vaccinations : INITIAL_PET_PROFILES[id].vaccinations,
      surgeriesLog: Array.isArray(incoming.surgeriesLog) ? incoming.surgeriesLog : INITIAL_PET_PROFILES[id].surgeriesLog,
      allergiesLog: Array.isArray(incoming.allergiesLog) ? incoming.allergiesLog : INITIAL_PET_PROFILES[id].allergiesLog,
      diabetesLog: Array.isArray(incoming.diabetesLog) ? incoming.diabetesLog : INITIAL_PET_PROFILES[id].diabetesLog,
      chronicConditions: {
        ...INITIAL_PET_PROFILES[id].chronicConditions,
        ...(incoming.chronicConditions ?? {}),
      },
      routineCare: {
        internalParasite: {
          ...INITIAL_PET_PROFILES[id].routineCare.internalParasite,
          ...(incoming.routineCare?.internalParasite ?? {}),
        },
        externalParasite: {
          ...INITIAL_PET_PROFILES[id].routineCare.externalParasite,
          ...(incoming.routineCare?.externalParasite ?? {}),
        },
      },
    };
  });

  return next;
}

const INITIAL_WEIGHTS: Record<PetId, WeightPoint[]> = {
  luna: [
    { label: 'Jan 30', value: 4.9, date: 'February 15, 2026', change: 'Stable' },
    { label: 'Feb 15', value: 5.0, date: 'March 1, 2026', change: '+0.1 kg' },
    { label: 'Mar 1', value: 5.0, date: 'March 15, 2026', change: '+0.1 kg' },
    { label: 'Mar 15', value: 5.1, date: 'April 1, 2026', change: '+0.1 kg' },
    { label: 'Apr 1', value: 5.2, date: 'April 15, 2026', change: '+0.1 kg' },
  ],
  milo: [
    { label: 'Jan 30', value: 4.7, date: 'February 15, 2026', change: 'Stable' },
    { label: 'Feb 15', value: 4.8, date: 'March 1, 2026', change: '+0.1 kg' },
    { label: 'Mar 1', value: 4.9, date: 'March 15, 2026', change: '+0.1 kg' },
    { label: 'Mar 15', value: 5.0, date: 'April 1, 2026', change: '+0.1 kg' },
    { label: 'Apr 1', value: 5.1, date: 'April 15, 2026', change: '+0.1 kg' },
  ],
};

function formatShortLabel(date: Date, locale: 'en' | 'tr') {
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }).replace(',', '');
}

function formatLongLabel(date: Date, locale: 'en' | 'tr') {
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return date.toLocaleDateString(localeTag, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function AuthGate() {
  const { session, loading } = useAuth();
  const { locale } = useLocale();
  const [route, setRoute] = useState<AppRoute>('home');
  const [subBackRoute, setSubBackRoute] = useState<AppRoute>('home');
  const [petProfileBackRoute, setPetProfileBackRoute] = useState<AppRoute>('home');
  const [activePetId, setActivePetId] = useState<PetId>('luna');
  const [weightsByPet, setWeightsByPet] = useState<Record<PetId, WeightPoint[]>>(INITIAL_WEIGHTS);
  const [petProfiles, setPetProfiles] = useState<Record<PetId, PetProfile>>(INITIAL_PET_PROFILES);
  const [petHydrated, setPetHydrated] = useState(false);

  const setActivePetWithPersist = (petId: PetId) => {
    setActivePetId(petId);
    AsyncStorage.setItem(ACTIVE_PET_STORAGE_KEY, petId).catch(() => {});
  };

  const setPetProfilesWithPersist = (updater: Record<PetId, PetProfile> | ((prev: Record<PetId, PetProfile>) => Record<PetId, PetProfile>)) => {
    setPetProfiles((prev) => {
      const next = typeof updater === 'function' ? (updater as (prev: Record<PetId, PetProfile>) => Record<PetId, PetProfile>)(prev) : updater;
      AsyncStorage.setItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  const [cloudHydrated, setCloudHydrated] = useState(false);

  useEffect(() => {
    setRoute('home');
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    const loadPersistedState = async () => {
      try {
        const [activeRaw, profilesRaw] = await Promise.all([
          AsyncStorage.getItem(ACTIVE_PET_STORAGE_KEY),
          AsyncStorage.getItem(PET_PROFILES_STORAGE_KEY),
        ]);

        if (!mounted) return;

        if (activeRaw === 'luna' || activeRaw === 'milo') {
          setActivePetWithPersist(activeRaw);
        }

        if (profilesRaw) {
          try {
            const parsed = JSON.parse(profilesRaw) as unknown;
            setPetProfilesWithPersist(normalizePetProfiles(parsed));
          } catch {
            setPetProfilesWithPersist(INITIAL_PET_PROFILES);
          }
        }
      } finally {
        if (mounted) setPetHydrated(true);
      }
    };

    loadPersistedState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!petHydrated) return;
    AsyncStorage.setItem(ACTIVE_PET_STORAGE_KEY, activePetId).catch(() => {});
  }, [activePetId, petHydrated]);

  useEffect(() => {
    if (!petHydrated) return;
    AsyncStorage.setItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(petProfiles)).catch(() => {});
  }, [petProfiles, petHydrated]);

  useEffect(() => {
    let mounted = true;

    async function hydrateCloudProfiles() {
      if (!session?.user?.id || !petHydrated) {
        setCloudHydrated(true);
        return;
      }

      const remote = await fetchPetProfilesFromCloud(session.user.id);

      if (!mounted) return;

      if (remote) {
        setPetProfilesWithPersist((prev) => normalizePetProfiles({ ...prev, ...remote }));
      }

      setCloudHydrated(true);
    }

    hydrateCloudProfiles();
    return () => {
      mounted = false;
    };
  }, [petHydrated, session?.user?.id]);

  useEffect(() => {
    if (!petHydrated || !cloudHydrated || !session?.user?.id) return;
    savePetProfilesToCloud(session.user.id, petProfiles).catch(() => {});
  }, [cloudHydrated, petHydrated, petProfiles, session?.user?.id]);

  const openSubRoute = (target: 'vaccinations' | 'healthRecords' | 'vetVisits', backTo: AppRoute) => {
    setSubBackRoute(backTo);
    setRoute(target);
  };

  const openPetProfile = (petId: PetId = 'luna', from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPetProfileBackRoute(from);
    setSubBackRoute(from);
    setRoute('petProfile');
  };

  const addWeightEntryForActivePet = (value: number) => {
    setWeightsByPet((prev) => {
      const current = prev[activePetId] ?? [];
      const rounded = Number(value.toFixed(1));
      const last = current[current.length - 1];
      const delta = last ? rounded - last.value : 0;
      const change = Math.abs(delta) < 0.01 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
      const now = new Date();

      const nextEntry: WeightPoint = {
        label: formatShortLabel(now, locale),
        value: rounded,
        date: formatLongLabel(now, locale),
        change,
      };

      return {
        ...prev,
        [activePetId]: [...current, nextEntry].slice(-8),
      };
    });
  };

  if (loading || !petHydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2d2d2d" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onSignedIn={() => setRoute('home')} />;
  }

  if (route === 'profileEdit') {
    return <ProfileEditScreen onBack={() => setRoute('profile')} onSaved={() => setRoute('profile')} />;
  }

  if (route === 'vaccinations') {
    return <VaccinationsScreen onBack={() => setRoute(subBackRoute)} />;
  }

  if (route === 'healthRecords') {
    return <HealthRecordsScreen onBack={() => setRoute(subBackRoute)} />;
  }

  if (route === 'vetVisits') {
    return <VetVisitsScreen onBack={() => setRoute(subBackRoute)} />;
  }

  if (route === 'petProfile') {
    const activePet = petProfiles[activePetId];
    return (
      <WeightTrackingScreen
        onBack={() => setRoute(petProfileBackRoute)}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'petProfile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'petProfile')}
        petName={activePet.name}
        petType={activePet.petType}
        petBreed={activePet.breed}
        microchip={activePet.microchip}
        entries={weightsByPet[activePetId]}
        onAddEntry={addWeightEntryForActivePet}
      />
    );
  }

  if (route === 'petEdit') {
    return (
      <PetEditScreen
        key={activePetId}
        pet={petProfiles[activePetId]}
        onBack={() => setRoute('home')}
        onSaved={(nextPet) => {
          setPetProfilesWithPersist((prev) => ({ ...prev, [nextPet.id]: nextPet }));
          setRoute('home');
        }}
      />
    );
  }

  if (route === 'settings') {
    return <SettingsScreen onBack={() => setRoute('profile')} />;
  }

  if (route === 'petProfiles') {
    return (
      <PetProfilesScreen
        locale={locale}
        activePetId={activePetId}
        petProfiles={petProfiles}
        onBack={() => setRoute('profile')}
        onSelectPet={(petId) => setActivePetWithPersist(petId)}
        onOpenPetDetail={(petId) => openPetProfile(petId, 'petProfiles')}
        onOpenPetEdit={(petId) => {
          setActivePetWithPersist(petId);
          setRoute('petEdit');
        }}
      />
    );
  }

  if (route === 'passport') {
    return (
      <PetHealthPassportScreen
        onBack={() => setRoute('profile')}
        pet={petProfiles[activePetId]}
        weightEntries={weightsByPet[activePetId] ?? []}
        onOpenVaccinations={() => openSubRoute('vaccinations', 'passport')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'passport')}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'passport')}
        onOpenWeight={() => openPetProfile(activePetId, 'passport')}
      />
    );
  }

  if (route === 'profile') {
    return (
      <ProfileScreen
        onSaveSuccess={() => setRoute('home')}
        onBackHome={() => setRoute('home')}
        onOpenPremium={() => setRoute('premium')}
        onOpenProfileEdit={() => setRoute('profileEdit')}
        onOpenVaccinations={() => openSubRoute('vaccinations', 'profile')}
        onOpenPetProfile={() => openPetProfile(activePetId, 'profile')}
        onOpenPetProfiles={() => setRoute('petProfiles')}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'profile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'profile')}
        onOpenSettings={() => setRoute('settings')}
        onOpenPetPassport={() => setRoute('passport')}
        petProfiles={petProfiles}
        weightsByPet={weightsByPet}
      />
    );
  }

  if (route === 'premium') {
    return <PremiumScreen onBack={() => setRoute('profile')} />;
  }

  return (
    <HomeScreen
      onOpenProfile={() => setRoute('profile')}
      onOpenPetProfile={(petId) => openPetProfile((petId as PetId) || 'luna', 'home')}
      onOpenVaccinations={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        openSubRoute('vaccinations', 'home');
      }}
      onOpenHealthRecords={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        openSubRoute('healthRecords', 'home');
      }}
      onOpenVetVisits={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        openSubRoute('vetVisits', 'home');
      }}
      onOpenPetEdit={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        setRoute('petEdit');
      }}
      onOpenPetPassport={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        setRoute('passport');
      }}
      petProfiles={petProfiles}
      weightsByPet={weightsByPet}
      activePetId={activePetId}
      onChangeActivePet={(petId) => setActivePetWithPersist(petId as PetId)}
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
  },
});






