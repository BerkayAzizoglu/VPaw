import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { getLocalItem, setLocalItem } from '../lib/localStore';
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
import { getHealthRecordsFromEvents, getVaccinationsFromEvents, getVetVisitsFromEvents } from '../lib/healthEventAdapters';

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

const PET_PROFILES_STORAGE_KEY = 'vpaw_pet_profiles';
const PET_PROFILES_UPDATED_AT_STORAGE_KEY = 'vpaw_pet_profiles_updated_at';
const WEIGHTS_STORAGE_KEY = 'vpaw_weights_by_pet';
const WEIGHTS_UPDATED_AT_STORAGE_KEY = 'vpaw_weights_updated_at';
const HEALTH_EVENTS_STORAGE_KEY = 'vpaw_health_events_by_pet';
const RUNTIME_STATE_STORAGE_KEY = 'vpaw_runtime_state';
const ACTIVE_PET_STORAGE_KEY = 'vpaw_active_pet_id';
const PET_LOCK_STORAGE_KEY = 'vpaw_pet_lock_enabled';

type RuntimeState = {
  activePetId: PetId;
  petLockEnabled: boolean;
};

type PerPetUpdatedAt = Partial<Record<PetId, string>>;

export type HealthEventType = 'vaccination' | 'vet_visit' | 'health_note' | 'weight' | 'other';

export type HealthEvent = {
  id: string;
  petId: PetId;
  type: HealthEventType;
  title: string;
  description?: string;
  date: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

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

function parseUpdatedAtMs(value: string | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function normalizeUpdatedAt(raw: unknown): PerPetUpdatedAt {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const next: PerPetUpdatedAt = {};
  if (typeof source.luna === 'string') next.luna = source.luna;
  if (typeof source.milo === 'string') next.milo = source.milo;
  return next;
}

function normalizeHealthEvents(raw: unknown): Record<PetId, HealthEvent[]> {
  const empty: Record<PetId, HealthEvent[]> = { luna: [], milo: [] };
  if (!raw || typeof raw !== 'object') return empty;

  const source = raw as Partial<Record<PetId, unknown>>;
  const parseArray = (value: unknown, petId: PetId): HealthEvent[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((event) => event && typeof event === 'object')
      .map((event) => {
        const e = event as Partial<HealthEvent>;
        const id = typeof e.id === 'string' ? e.id : `event-${petId}-${Math.random().toString(36).slice(2, 10)}`;
        const type: HealthEventType =
          e.type === 'vaccination' || e.type === 'vet_visit' || e.type === 'health_note' || e.type === 'weight' || e.type === 'other'
            ? e.type
            : 'other';
        const title = typeof e.title === 'string' ? e.title : 'Untitled';
        const date = typeof e.date === 'string' ? e.date : new Date().toISOString();
        const createdAt = typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString();
        const updatedAt = typeof e.updatedAt === 'string' ? e.updatedAt : createdAt;
        const description = typeof e.description === 'string' ? e.description : undefined;
        const metadata = e.metadata && typeof e.metadata === 'object' ? (e.metadata as Record<string, unknown>) : {};

        return { id, petId, type, title, description, date, metadata, createdAt, updatedAt } satisfies HealthEvent;
      });
  };

  return {
    luna: parseArray(source.luna, 'luna'),
    milo: parseArray(source.milo, 'milo'),
  };
}

function buildHealthEventsFromLegacyData(profiles: Record<PetId, PetProfile>, weights: Record<PetId, WeightPoint[]>): Record<PetId, HealthEvent[]> {
  const nowIso = new Date().toISOString();

  const toEventsForPet = (petId: PetId): HealthEvent[] => {
    const profile = profiles[petId];
    const weightEntries = weights[petId] ?? [];

    const vaccinationEvents = (profile.vaccinations ?? []).map((v) => ({
      id: `vaccination-${petId}-${v.name}-${v.date}`,
      petId,
      type: 'vaccination' as HealthEventType,
      title: v.name,
      description: profile.vaccines,
      date: v.date,
      metadata: { vaccineType: v.name },
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const surgeryEvents = (profile.surgeriesLog ?? []).map((s) => ({
      id: `surgery-${petId}-${s.name}-${s.date}`,
      petId,
      type: 'health_note' as HealthEventType,
      title: s.name,
      description: s.note,
      date: s.date,
      metadata: { category: 'surgery' },
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const allergyEvents = (profile.allergiesLog ?? []).map((a) => ({
      id: `allergy-${petId}-${a.category}-${a.date}`,
      petId,
      type: 'health_note' as HealthEventType,
      title: a.category,
      description: a.status,
      date: a.date,
      metadata: { category: 'allergy', severity: a.severity, status: a.status },
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const diabetesEvents = (profile.diabetesLog ?? []).map((d) => ({
      id: `diabetes-${petId}-${d.type}-${d.date}`,
      petId,
      type: 'health_note' as HealthEventType,
      title: d.type,
      description: d.status,
      date: d.date,
      metadata: { category: 'diabetes', status: d.status },
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const weightEvents = weightEntries.map((w, index) => ({
      id: `weight-${petId}-${w.date}-${index}`,
      petId,
      type: 'weight' as HealthEventType,
      title: 'Weight Entry',
      description: w.change,
      date: w.date,
      metadata: { value: w.value, unit: 'kg', label: w.label },
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    return [...vaccinationEvents, ...surgeryEvents, ...allergyEvents, ...diabetesEvents, ...weightEvents].sort((a, b) => {
      const aMs = new Date(a.date).getTime();
      const bMs = new Date(b.date).getTime();
      if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
      return bMs - aMs;
    });
  };

  return { luna: toEventsForPet('luna'), milo: toEventsForPet('milo') };
}

export default function AuthGate() {
  const { session, loading } = useAuth();
  const { locale } = useLocale();
  const [route, setRoute] = useState<AppRoute>('home');
  const [subBackRoute, setSubBackRoute] = useState<AppRoute>('home');
  const [petProfileBackRoute, setPetProfileBackRoute] = useState<AppRoute>('home');
  const [passportBackRoute, setPassportBackRoute] = useState<AppRoute>('home');
  const [activePetId, setActivePetId] = useState<PetId>('luna');
  const [weightsByPet, setWeightsByPet] = useState<Record<PetId, WeightPoint[]>>(INITIAL_WEIGHTS);
  const [weightsUpdatedAt, setWeightsUpdatedAt] = useState<PerPetUpdatedAt>({});
  const [healthEventsByPet, setHealthEventsByPet] = useState<Record<PetId, HealthEvent[]>>({ luna: [], milo: [] });
  const [petProfiles, setPetProfiles] = useState<Record<PetId, PetProfile>>(INITIAL_PET_PROFILES);
  const [petProfilesUpdatedAt, setPetProfilesUpdatedAt] = useState<PerPetUpdatedAt>({});
  const [cloudPetProfilesUpdatedAt, setCloudPetProfilesUpdatedAt] = useState<PerPetUpdatedAt>({});
  const [petHydrated, setPetHydrated] = useState(false);
  const [petLockEnabled, setPetLockEnabled] = useState(false);
  const [petLockHydrated, setPetLockHydrated] = useState(false);
  const [runtimeDebug, setRuntimeDebug] = useState('');
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudMetadataReady, setCloudMetadataReady] = useState(false);
  const activePetRef = useRef<PetId>('luna');
  const petLockRef = useRef(false);

  const persistRuntimeState = (nextActivePetId: PetId, nextPetLockEnabled: boolean) => {
    Promise.all([
      setLocalItem(
        RUNTIME_STATE_STORAGE_KEY,
        JSON.stringify({ activePetId: nextActivePetId, petLockEnabled: nextPetLockEnabled } satisfies RuntimeState),
      ),
      setLocalItem(ACTIVE_PET_STORAGE_KEY, nextActivePetId),
      setLocalItem(PET_LOCK_STORAGE_KEY, nextPetLockEnabled ? '1' : '0'),
    ]).catch(() => {});
  };

  const setActivePetWithPersist = (petId: PetId) => {
    activePetRef.current = petId;
    setActivePetId(petId);
    persistRuntimeState(petId, petLockRef.current);
  };

  const setPetLockWithPersist = (enabled: boolean) => {
    petLockRef.current = enabled;
    setPetLockEnabled(enabled);
    persistRuntimeState(activePetRef.current, enabled);
  };

  const setPetProfilesWithPersist = (updater: Record<PetId, PetProfile> | ((prev: Record<PetId, PetProfile>) => Record<PetId, PetProfile>)) => {
    setPetProfiles((prev) => {
      const next = typeof updater === 'function' ? (updater as (prev: Record<PetId, PetProfile>) => Record<PetId, PetProfile>)(prev) : updater;
      setLocalItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const addHealthEvent = (petId: PetId, eventInput: Omit<HealthEvent, 'id' | 'petId' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();
    const event: HealthEvent = {
      ...eventInput,
      id: `event-${petId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      petId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setHealthEventsByPet((prev) => {
      const nextPetEvents = [event, ...(prev[petId] ?? [])];
      return {
        ...prev,
        [petId]: nextPetEvents,
      };
    });
  };

  const updateHealthEvent = (petId: PetId, eventId: string, patch: Partial<Omit<HealthEvent, 'id' | 'petId' | 'createdAt'>>) => {
    setHealthEventsByPet((prev) => {
      const nextPetEvents = (prev[petId] ?? []).map((event) => {
        if (event.id !== eventId) return event;
        return {
          ...event,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      });
      return {
        ...prev,
        [petId]: nextPetEvents,
      };
    });
  };

  const getHealthEventsByPet = (petId: PetId): HealthEvent[] => {
    return healthEventsByPet[petId] ?? [];
  };

  useEffect(() => {
    setRoute('home');
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    const loadPersistedState = async () => {
      try {
        const [profilesRaw, profilesUpdatedAtRaw, weightsRaw, weightsUpdatedAtRaw, healthEventsRaw, runtimeRaw, activeRaw, petLockRaw] = await Promise.all([
          getLocalItem(PET_PROFILES_STORAGE_KEY),
          getLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY),
          getLocalItem(WEIGHTS_STORAGE_KEY),
          getLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY),
          getLocalItem(HEALTH_EVENTS_STORAGE_KEY),
          getLocalItem(RUNTIME_STATE_STORAGE_KEY),
          getLocalItem(ACTIVE_PET_STORAGE_KEY),
          getLocalItem(PET_LOCK_STORAGE_KEY),
        ]);

        let safeActivePet: PetId = activeRaw === 'milo' ? 'milo' : 'luna';
        let safePetLock = petLockRaw === '1' || petLockRaw === 'true';

        if (runtimeRaw) {
          try {
            const parsedRuntime = JSON.parse(runtimeRaw) as Partial<RuntimeState>;
            if ((parsedRuntime.activePetId === 'luna' || parsedRuntime.activePetId === 'milo') && typeof parsedRuntime.petLockEnabled === 'boolean') {
              safeActivePet = parsedRuntime.activePetId;
              safePetLock = parsedRuntime.petLockEnabled;
            }
          } catch {
            // keep fallback keys
          }
        }

        if (!mounted) return;

        activePetRef.current = safeActivePet;
        petLockRef.current = safePetLock;
        setActivePetId(safeActivePet);
        setPetLockEnabled(safePetLock);
        setRuntimeDebug(`runtime: ${safeActivePet}/${safePetLock ? 'lock-on' : 'lock-off'}`);
        persistRuntimeState(safeActivePet, safePetLock);

        let localProfiles = INITIAL_PET_PROFILES;
        if (profilesRaw) {
          try {
            const parsed = JSON.parse(profilesRaw) as unknown;
            localProfiles = normalizePetProfiles(parsed);
          } catch {
            localProfiles = INITIAL_PET_PROFILES;
          }
        }
        setPetProfiles(localProfiles);
        setLocalItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(localProfiles)).catch(() => {});

        const nowIso = new Date().toISOString();
        let localProfilesUpdatedAt: PerPetUpdatedAt = { luna: nowIso, milo: nowIso };
        if (profilesUpdatedAtRaw) {
          try {
            const parsedUpdatedAt = normalizeUpdatedAt(JSON.parse(profilesUpdatedAtRaw) as unknown);
            localProfilesUpdatedAt = {
              luna: parsedUpdatedAt.luna ?? nowIso,
              milo: parsedUpdatedAt.milo ?? nowIso,
            };
          } catch {
            localProfilesUpdatedAt = { luna: nowIso, milo: nowIso };
          }
        }
        setPetProfilesUpdatedAt(localProfilesUpdatedAt);
        setLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY, JSON.stringify(localProfilesUpdatedAt)).catch(() => {});

        let localWeights = INITIAL_WEIGHTS;
        if (weightsRaw) {
          try {
            const parsedWeights = JSON.parse(weightsRaw) as unknown;
            if (parsedWeights && typeof parsedWeights === 'object') {
              const source = parsedWeights as Partial<Record<PetId, WeightPoint[]>>;
              localWeights = {
                luna: Array.isArray(source.luna) ? source.luna : INITIAL_WEIGHTS.luna,
                milo: Array.isArray(source.milo) ? source.milo : INITIAL_WEIGHTS.milo,
              };
            }
          } catch {
            localWeights = INITIAL_WEIGHTS;
          }
        }
        setWeightsByPet(localWeights);
        setLocalItem(WEIGHTS_STORAGE_KEY, JSON.stringify(localWeights)).catch(() => {});

        let localWeightsUpdatedAt: PerPetUpdatedAt = { luna: nowIso, milo: nowIso };
        if (weightsUpdatedAtRaw) {
          try {
            const parsedWeightsUpdatedAt = normalizeUpdatedAt(JSON.parse(weightsUpdatedAtRaw) as unknown);
            localWeightsUpdatedAt = {
              luna: parsedWeightsUpdatedAt.luna ?? nowIso,
              milo: parsedWeightsUpdatedAt.milo ?? nowIso,
            };
          } catch {
            localWeightsUpdatedAt = { luna: nowIso, milo: nowIso };
          }
        }
        setWeightsUpdatedAt(localWeightsUpdatedAt);
        setLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY, JSON.stringify(localWeightsUpdatedAt)).catch(() => {});

        let localHealthEvents = buildHealthEventsFromLegacyData(localProfiles, localWeights);
        if (healthEventsRaw) {
          try {
            const parsedHealthEvents = JSON.parse(healthEventsRaw) as unknown;
            const normalizedHealthEvents = normalizeHealthEvents(parsedHealthEvents);
            const hasEvents = normalizedHealthEvents.luna.length > 0 || normalizedHealthEvents.milo.length > 0;
            localHealthEvents = hasEvents ? normalizedHealthEvents : localHealthEvents;
          } catch {
            localHealthEvents = buildHealthEventsFromLegacyData(localProfiles, localWeights);
          }
        }
        setHealthEventsByPet(localHealthEvents);
        setLocalItem(HEALTH_EVENTS_STORAGE_KEY, JSON.stringify(localHealthEvents)).catch(() => {});
      } finally {
        if (mounted) {
          setPetHydrated(true);
          setPetLockHydrated(true);
        }
      }
    };

    loadPersistedState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(petProfiles)).catch(() => {});
  }, [petProfiles, petHydrated]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY, JSON.stringify(petProfilesUpdatedAt)).catch(() => {});
  }, [petHydrated, petProfilesUpdatedAt]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weightsByPet)).catch(() => {});
  }, [petHydrated, weightsByPet]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY, JSON.stringify(weightsUpdatedAt)).catch(() => {});
  }, [petHydrated, weightsUpdatedAt]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(HEALTH_EVENTS_STORAGE_KEY, JSON.stringify(healthEventsByPet)).catch(() => {});
  }, [healthEventsByPet, petHydrated]);

  useEffect(() => {
    let mounted = true;

    async function hydrateCloudProfiles() {
      if (!session?.user?.id || !petHydrated) {
        setCloudMetadataReady(false);
        setCloudHydrated(true);
        return;
      }

      const remote = await fetchPetProfilesFromCloud(session.user.id);
      if (!mounted) return;

      if (remote) {
        setCloudMetadataReady(true);
        const nextProfiles: Record<PetId, PetProfile> = { ...petProfiles };
        const nextUpdatedAt: PerPetUpdatedAt = { ...petProfilesUpdatedAt };
        const nextCloudUpdatedAt: PerPetUpdatedAt = { ...cloudPetProfilesUpdatedAt, ...remote.updatedAt };

        (['luna', 'milo'] as PetId[]).forEach((petId) => {
          const cloudProfile = remote.profiles[petId];
          if (!cloudProfile) return;

          const localUpdatedAt = petProfilesUpdatedAt[petId];
          const cloudUpdatedAt = remote.updatedAt[petId];
          const localMs = parseUpdatedAtMs(localUpdatedAt);
          const cloudMs = parseUpdatedAtMs(cloudUpdatedAt);

          let winner: 'local' | 'cloud' = 'local';
          if (localMs != null && cloudMs != null) {
            winner = cloudMs > localMs ? 'cloud' : 'local';
          }

          console.log(
            '[pet-sync:merge]',
            JSON.stringify({
              petId,
              localUpdatedAt: localUpdatedAt ?? null,
              cloudUpdatedAt: cloudUpdatedAt ?? null,
              winner,
            }),
          );

          if (winner === 'cloud') {
            nextProfiles[petId] = normalizePetProfiles({ [petId]: cloudProfile })[petId];
            nextUpdatedAt[petId] = cloudUpdatedAt ?? localUpdatedAt ?? new Date().toISOString();
          }
        });

        setPetProfiles(nextProfiles);
        setPetProfilesUpdatedAt(nextUpdatedAt);
        setCloudPetProfilesUpdatedAt(nextCloudUpdatedAt);
      } else {
        setCloudMetadataReady(false);
        console.log('[pet-sync:merge]', JSON.stringify({ reason: 'cloud-fetch-null-skip-upload' }));
      }

      setCloudHydrated(true);
    }

    hydrateCloudProfiles();
    return () => {
      mounted = false;
    };
  }, [petHydrated, session?.user?.id]);

  useEffect(() => {
    if (!petHydrated || !cloudHydrated || !cloudMetadataReady || !session?.user?.id) return;

    const petIdsToUpload = (['luna', 'milo'] as PetId[]).filter((petId) => {
      const localUpdatedAt = petProfilesUpdatedAt[petId];
      const cloudUpdatedAt = cloudPetProfilesUpdatedAt[petId];
      const localMs = parseUpdatedAtMs(localUpdatedAt);
      const cloudMs = parseUpdatedAtMs(cloudUpdatedAt);

      if (localMs == null && cloudMs == null) {
        console.log(
          '[pet-sync:upload-skip]',
          JSON.stringify({
            petId,
            localUpdatedAt: localUpdatedAt ?? null,
            cloudUpdatedAt: cloudUpdatedAt ?? null,
            reason: 'both-missing-timestamp',
          }),
        );
        return false;
      }

      if (localMs != null && cloudMs == null) {
        console.log(
          '[pet-sync:upload-check]',
          JSON.stringify({
            petId,
            localUpdatedAt,
            cloudUpdatedAt: null,
            shouldUpload: true,
            reason: 'cloud-missing-timestamp-local-preferred',
          }),
        );
        return true;
      }

      if (localMs == null && cloudMs != null) {
        console.log(
          '[pet-sync:upload-skip]',
          JSON.stringify({
            petId,
            localUpdatedAt: null,
            cloudUpdatedAt,
            reason: 'local-missing-timestamp',
          }),
        );
        return false;
      }

      const shouldUpload = (localMs as number) > (cloudMs as number);
      console.log(
        '[pet-sync:upload-check]',
        JSON.stringify({
          petId,
          localUpdatedAt,
          cloudUpdatedAt,
          shouldUpload,
        }),
      );
      return shouldUpload;
    });

    if (petIdsToUpload.length === 0) return;

    savePetProfilesToCloud(session.user.id, petProfiles, petProfilesUpdatedAt, petIdsToUpload)
      .then((ok) => {
        if (!ok) return;
        setCloudPetProfilesUpdatedAt((prev) => {
          const next: PerPetUpdatedAt = { ...prev };
          petIdsToUpload.forEach((petId) => {
            if (petProfilesUpdatedAt[petId]) next[petId] = petProfilesUpdatedAt[petId];
          });
          return next;
        });
      })
      .catch(() => {});
  }, [cloudHydrated, cloudMetadataReady, cloudPetProfilesUpdatedAt, petHydrated, petProfiles, petProfilesUpdatedAt, session?.user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        persistRuntimeState(activePetRef.current, petLockRef.current);
      }
    });

    return () => sub.remove();
  }, [activePetId, petLockEnabled]);

  const openSubRoute = (target: 'vaccinations' | 'healthRecords' | 'vetVisits', backTo: AppRoute) => {
    setSubBackRoute(backTo);
    setRoute(target);
  };

  const openPassport = (petId: PetId = activePetId, from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPassportBackRoute(from);
    setRoute('passport');
  };

  const openPetProfile = (petId: PetId = 'luna', from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPetProfileBackRoute(from);
    setSubBackRoute(from);
    setRoute('petProfile');
  };

  const vaccinationsBridge = useMemo(() => getVaccinationsFromEvents(activePetId, healthEventsByPet, petProfiles[activePetId]), [activePetId, healthEventsByPet, petProfiles]);
  const vetVisitsBridge = useMemo(() => getVetVisitsFromEvents(activePetId, healthEventsByPet, petProfiles[activePetId]), [activePetId, healthEventsByPet, petProfiles]);
  const healthRecordsBridge = useMemo(() => getHealthRecordsFromEvents(activePetId, healthEventsByPet, petProfiles[activePetId]), [activePetId, healthEventsByPet, petProfiles]);

  const addWeightEntryForActivePet = (value: number) => {
    const now = new Date();
    const rounded = Number(value.toFixed(1));
    const label = formatShortLabel(now, locale);
    const date = formatLongLabel(now, locale);

    let nextChange = 'Stable';

    setWeightsByPet((prev) => {
      const current = prev[activePetId] ?? [];
      const last = current[current.length - 1];
      const delta = last ? rounded - last.value : 0;
      nextChange = Math.abs(delta) < 0.01 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;

      const nextEntry: WeightPoint = {
        label,
        value: rounded,
        date,
        change: nextChange,
      };

      return {
        ...prev,
        [activePetId]: [...current, nextEntry].slice(-8),
      };
    });

    addHealthEvent(activePetId, {
      type: 'weight',
      title: 'Weight Entry',
      description: nextChange,
      date,
      metadata: { value: rounded, unit: 'kg', label },
    });

    setWeightsUpdatedAt((prev) => {
      const nowIso = now.toISOString();
      return {
        ...prev,
        [activePetId]: nowIso,
      };
    });
  };

  if (loading || !petHydrated || !petLockHydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2d2d2d" />
        {__DEV__ && runtimeDebug ? <Text style={styles.runtimeDebug}>{runtimeDebug}</Text> : null}
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
    return (
      <VaccinationsScreen
        onBack={() => setRoute(subBackRoute)}
        historyItems={vaccinationsBridge?.historyItems}
        attentionCounts={vaccinationsBridge?.attentionCounts}
        nextUpData={vaccinationsBridge?.nextUpData}
      />
    );
  }

  if (route === 'healthRecords') {
    return <HealthRecordsScreen onBack={() => setRoute(subBackRoute)} recordsData={healthRecordsBridge ?? undefined} />;
  }

  if (route === 'vetVisits') {
    return <VetVisitsScreen onBack={() => setRoute(subBackRoute)} visits={vetVisitsBridge ?? undefined} />;
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
          setPetProfilesUpdatedAt((prev) => {
            const nowIso = new Date().toISOString();
            return {
              ...prev,
              [nextPet.id]: nowIso,
            };
          });
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
        onBack={() => setRoute(passportBackRoute)}
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
        onOpenPetPassport={() => openPassport(activePetId, 'profile')}
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
      petLockEnabled={petLockEnabled}
      onChangePetLockEnabled={(next) => setPetLockWithPersist(next)}
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
  runtimeDebug: {
    marginTop: 8,
    color: '#8b8b8b',
    fontSize: 12,
  },
});










