import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
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
import VetVisitsScreen, { type CreateVetVisitPayload, type VetVisitCreatePreset } from '../screens/VetVisitsScreen';
import PetEditScreen from '../screens/PetEditScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PetHealthPassportScreen from '../screens/PetHealthPassportScreen';
import PetProfilesScreen from '../screens/PetProfilesScreen';
import RemindersScreen from '../screens/RemindersScreen';
import InsightsScreen from '../screens/InsightsScreen';
import HealthHubScreen, { type HealthHubCategory } from '../screens/HealthHubScreen';
import { Bell, ChartSpline, HeartPulse, Home, Plus } from 'lucide-react-native';
import { fetchPetProfilesFromCloud, savePetProfilesToCloud } from '../lib/petProfilesRepo';
import { getHealthCardSummary, getVaccinesForUI, getVetVisitsForUI } from '../lib/healthEventAdapters';
import { reconcileReminderNotifications } from '../lib/reminderNotifications';
import { buildUnifiedHealthEventsForPet, summarizeUnifiedHealthEvents } from '../lib/unifiedHealthEvents';
import {
  EMPTY_MEDICAL_EVENTS_BY_PET,
  EMPTY_MEDICATION_COURSES_BY_PET,
  EMPTY_REMINDERS_BY_PET,
  EMPTY_VET_VISITS_BY_PET,
  addMedicalEvent as addMvpMedicalEvent,
  type ByPet,
  createMedicationCourse,
  createReminder,
  createVetVisit,
  type MedicalEvent as MvpMedicalEvent,
  type MedicationCourse,
  type MedicalEventType,
  normalizeMedicalEventsByPet,
  normalizeMedicationCoursesByPet,
  normalizeRemindersByPet,
  normalizeVetVisitsByPet,
  getUpcomingReminders,
  getRemindersByPet,
  markReminderCompleted,
  type ReminderFrequency,
  type ReminderKind,
  type ReminderSubtype,
  type ReminderType,
  type Reminder,
  type VetVisit,
  type VetVisitReasonCategory,
  type VetVisitStatus,
} from '../lib/healthMvpModel';

type AppRoute =
  | 'home'
  | 'healthHub'
  | 'reminders'
  | 'insights'
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

type PrimaryTab = 'home' | 'healthHub' | 'reminders' | 'insights';

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
const VET_VISITS_BY_PET_STORAGE_KEY = 'vpaw_vet_visits_by_pet';
const MEDICAL_EVENTS_BY_PET_STORAGE_KEY = 'vpaw_medical_events_by_pet';
const REMINDERS_BY_PET_STORAGE_KEY = 'vpaw_reminders_by_pet';
const MEDICATION_COURSES_BY_PET_STORAGE_KEY = 'vpaw_medication_courses_by_pet';
const RUNTIME_STATE_STORAGE_KEY = 'vpaw_runtime_state';
const ACTIVE_PET_STORAGE_KEY = 'vpaw_active_pet_id';
const PET_LOCK_STORAGE_KEY = 'vpaw_pet_lock_enabled';
const DARK_MODE_STORAGE_KEY = 'vpaw_dark_mode_enabled';

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

function formatReminderDateLabel(value: string, locale: 'en' | 'tr') {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value;
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Date(ms).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
}

function isReminderSubtypeAllowedForPet(
  petType: 'Dog' | 'Cat' | undefined,
  subtype: ReminderSubtype,
) {
  if (subtype === 'walk') return petType === 'Dog';
  return true;
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
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('home');
  const [reminderCreateNonce, setReminderCreateNonce] = useState(0);
  const [reminderCreateSubtypePreset, setReminderCreateSubtypePreset] = useState<ReminderSubtype | null>(null);
  const [healthHubInitialCategory, setHealthHubInitialCategory] = useState<HealthHubCategory>('all');
  const [healthHubCategoryResetKey, setHealthHubCategoryResetKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;
  const [subBackRoute, setSubBackRoute] = useState<AppRoute>('home');
  const [petProfileBackRoute, setPetProfileBackRoute] = useState<AppRoute>('home');
  const [passportBackRoute, setPassportBackRoute] = useState<AppRoute>('home');
  const [vetVisitCreatePreset, setVetVisitCreatePreset] = useState<VetVisitCreatePreset | null>(null);
  const [activePetId, setActivePetId] = useState<PetId>('luna');
  const [weightsByPet, setWeightsByPet] = useState<Record<PetId, WeightPoint[]>>(INITIAL_WEIGHTS);
  const [weightsUpdatedAt, setWeightsUpdatedAt] = useState<PerPetUpdatedAt>({});
  const [healthEventsByPet, setHealthEventsByPet] = useState<Record<PetId, HealthEvent[]>>({ luna: [], milo: [] });
  const [vetVisitsByPet, setVetVisitsByPet] = useState<ByPet<VetVisit>>(EMPTY_VET_VISITS_BY_PET);
  const [medicalEventsByPet, setMedicalEventsByPet] = useState<ByPet<MvpMedicalEvent>>(EMPTY_MEDICAL_EVENTS_BY_PET);
  const [remindersByPet, setRemindersByPet] = useState<ByPet<Reminder>>(EMPTY_REMINDERS_BY_PET);
  const [medicationCoursesByPet, setMedicationCoursesByPet] = useState<ByPet<MedicationCourse>>(EMPTY_MEDICATION_COURSES_BY_PET);
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
  const reminderSyncInFlightRef = useRef(false);
  const queuedReminderSyncRef = useRef<ByPet<Reminder> | null>(null);
  const reminderBootstrapSyncDoneRef = useRef(false);

  const areReminderStatesEqual = (a: ByPet<Reminder>, b: ByPet<Reminder>) => {
    const pets: PetId[] = ['luna', 'milo'];
    return pets.every((petId) => {
      const left = a[petId] ?? [];
      const right = b[petId] ?? [];
      if (left.length !== right.length) return false;
      for (let i = 0; i < left.length; i += 1) {
        const l = left[i];
        const r = right[i];
        if (
          l.id !== r.id ||
          l.notificationId !== r.notificationId ||
          l.scheduledAt !== r.scheduledAt ||
          l.completedAt !== r.completedAt ||
          l.isActive !== r.isActive
        ) {
          return false;
        }
      }
      return true;
    });
  };

  const syncReminderNotificationsState = async (targetState: ByPet<Reminder>, forceReschedule = false) => {
    queuedReminderSyncRef.current = targetState;
    if (reminderSyncInFlightRef.current) return;

    reminderSyncInFlightRef.current = true;
    try {
      while (queuedReminderSyncRef.current) {
        const currentTarget = queuedReminderSyncRef.current;
        queuedReminderSyncRef.current = null;
        const synced = await reconcileReminderNotifications(
          currentTarget,
          {
            luna: petProfiles.luna?.name || 'Luna',
            milo: petProfiles.milo?.name || 'Milo',
          },
          { forceReschedule },
        );
        setRemindersByPet((prev) => (areReminderStatesEqual(prev, synced) ? prev : synced));
      }
    } finally {
      reminderSyncInFlightRef.current = false;
    }
  };

  const setRemindersWithNotificationSync = (
    updater: ByPet<Reminder> | ((prev: ByPet<Reminder>) => ByPet<Reminder>),
    forceReschedule = true,
  ) => {
    setRemindersByPet((prev) => {
      const next = typeof updater === 'function' ? (updater as (current: ByPet<Reminder>) => ByPet<Reminder>)(prev) : updater;
      void syncReminderNotificationsState(next, forceReschedule);
      return next;
    });
  };

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

  useEffect(() => {
    getLocalItem(DARK_MODE_STORAGE_KEY)
      .then((value) => {
        setDarkModeEnabled(value === '1');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLocalItem(DARK_MODE_STORAGE_KEY, darkModeEnabled ? '1' : '0').catch(() => {});
  }, [darkModeEnabled]);

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [menuAnim, menuOpen]);

  useEffect(() => {
    if (route === 'home' || route === 'healthHub' || route === 'reminders' || route === 'insights') {
      setPrimaryTab(route);
    }
  }, [route]);

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
        const [
          profilesRaw,
          profilesUpdatedAtRaw,
          weightsRaw,
          weightsUpdatedAtRaw,
          healthEventsRaw,
          vetVisitsRaw,
          medicalEventsRaw,
          remindersRaw,
          medicationCoursesRaw,
          runtimeRaw,
          activeRaw,
          petLockRaw,
        ] = await Promise.all([
          getLocalItem(PET_PROFILES_STORAGE_KEY),
          getLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY),
          getLocalItem(WEIGHTS_STORAGE_KEY),
          getLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY),
          getLocalItem(HEALTH_EVENTS_STORAGE_KEY),
          getLocalItem(VET_VISITS_BY_PET_STORAGE_KEY),
          getLocalItem(MEDICAL_EVENTS_BY_PET_STORAGE_KEY),
          getLocalItem(REMINDERS_BY_PET_STORAGE_KEY),
          getLocalItem(MEDICATION_COURSES_BY_PET_STORAGE_KEY),
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

        let localVetVisits = EMPTY_VET_VISITS_BY_PET;
        if (vetVisitsRaw) {
          try {
            localVetVisits = normalizeVetVisitsByPet(JSON.parse(vetVisitsRaw) as unknown);
          } catch {
            localVetVisits = EMPTY_VET_VISITS_BY_PET;
          }
        }
        setVetVisitsByPet(localVetVisits);
        setLocalItem(VET_VISITS_BY_PET_STORAGE_KEY, JSON.stringify(localVetVisits)).catch(() => {});

        let localMedicalEvents = EMPTY_MEDICAL_EVENTS_BY_PET;
        if (medicalEventsRaw) {
          try {
            localMedicalEvents = normalizeMedicalEventsByPet(JSON.parse(medicalEventsRaw) as unknown);
          } catch {
            localMedicalEvents = EMPTY_MEDICAL_EVENTS_BY_PET;
          }
        }
        setMedicalEventsByPet(localMedicalEvents);
        setLocalItem(MEDICAL_EVENTS_BY_PET_STORAGE_KEY, JSON.stringify(localMedicalEvents)).catch(() => {});

        let localReminders = EMPTY_REMINDERS_BY_PET;
        if (remindersRaw) {
          try {
            localReminders = normalizeRemindersByPet(JSON.parse(remindersRaw) as unknown);
          } catch {
            localReminders = EMPTY_REMINDERS_BY_PET;
          }
        }
        setRemindersByPet(localReminders);
        setLocalItem(REMINDERS_BY_PET_STORAGE_KEY, JSON.stringify(localReminders)).catch(() => {});

        let localMedicationCourses = EMPTY_MEDICATION_COURSES_BY_PET;
        if (medicationCoursesRaw) {
          try {
            localMedicationCourses = normalizeMedicationCoursesByPet(JSON.parse(medicationCoursesRaw) as unknown);
          } catch {
            localMedicationCourses = EMPTY_MEDICATION_COURSES_BY_PET;
          }
        }
        setMedicationCoursesByPet(localMedicationCourses);
        setLocalItem(MEDICATION_COURSES_BY_PET_STORAGE_KEY, JSON.stringify(localMedicationCourses)).catch(() => {});
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
    if (!petHydrated) return;
    setLocalItem(VET_VISITS_BY_PET_STORAGE_KEY, JSON.stringify(vetVisitsByPet)).catch(() => {});
  }, [petHydrated, vetVisitsByPet]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(MEDICAL_EVENTS_BY_PET_STORAGE_KEY, JSON.stringify(medicalEventsByPet)).catch(() => {});
  }, [medicalEventsByPet, petHydrated]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(REMINDERS_BY_PET_STORAGE_KEY, JSON.stringify(remindersByPet)).catch(() => {});
  }, [petHydrated, remindersByPet]);

  useEffect(() => {
    if (!petHydrated) return;
    if (reminderBootstrapSyncDoneRef.current) return;
    reminderBootstrapSyncDoneRef.current = true;
    void syncReminderNotificationsState(remindersByPet, true);
  }, [petHydrated]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(MEDICATION_COURSES_BY_PET_STORAGE_KEY, JSON.stringify(medicationCoursesByPet)).catch(() => {});
  }, [medicationCoursesByPet, petHydrated]);

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
    if (target === 'healthRecords') {
      setPrimaryTab('healthHub');
      setHealthHubInitialCategory('record');
      setHealthHubCategoryResetKey((prev) => prev + 1);
      setRoute('healthHub');
      return;
    }
    setSubBackRoute(backTo);
    setVetVisitCreatePreset(null);
    setRoute(target);
  };

  const openHealthHubWithCategory = (category: HealthHubCategory = 'all') => {
    setPrimaryTab('healthHub');
    setHealthHubInitialCategory(category);
    setHealthHubCategoryResetKey((prev) => prev + 1);
    setRoute('healthHub');
  };

  const openVetVisitWithPreset = (backTo: AppRoute, preset: VetVisitCreatePreset) => {
    setSubBackRoute(backTo);
    setVetVisitCreatePreset({
      ...preset,
      openCreate: true,
      nonce: Date.now(),
    });
    setRoute('vetVisits');
  };

  const openPassport = (petId: PetId = activePetId, from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPassportBackRoute(from);
    setRoute('passport');
  };

  type DualWriteOutcome = {
    type: MedicalEventType;
    title: string;
    eventDate: string;
    note?: string;
    subcategory?: string;
    dueDate?: string;
    metadataJson?: Record<string, unknown>;
    reminder?: {
      type: ReminderType;
      subtype: ReminderSubtype;
      title: string;
      scheduledAt: string;
      frequency: ReminderFrequency;
      interval?: number;
      note?: string;
      // transitional legacy mapping
      kind?: ReminderKind;
      dueAt?: string;
    };
    medication?: {
      name: string;
      startDate: string;
      isOngoing: boolean;
      status: 'active' | 'paused' | 'completed';
      dose?: number;
      doseUnit?: string;
      frequency?: 'daily' | 'twice_daily' | 'every_x_hours' | 'weekly' | 'custom';
      endDate?: string;
      instructions?: string;
    };
  };

  type DualWriteInput = {
    petId: PetId;
    visitDate: string;
    reasonCategory: VetVisitReasonCategory;
    status: VetVisitStatus;
    clinicName?: string;
    vetName?: string;
    followUpDate?: string;
    notes?: string;
    outcomes?: DualWriteOutcome[];
  };

  const recordVetVisitDualWrite = (input: DualWriteInput) => {
    let createdVisit: VetVisit | null = null;
    setVetVisitsByPet((prev) => {
      const created = createVetVisit(prev, {
        petId: input.petId,
        visitDate: input.visitDate,
        reasonCategory: input.reasonCategory,
        status: input.status,
        clinicName: input.clinicName,
        vetName: input.vetName,
        followUpDate: input.followUpDate,
        notes: input.notes,
      });
      createdVisit = created.item;
      return created.next;
    });

    if (!createdVisit) return;
    const outcomes = input.outcomes ?? [];
    if (outcomes.length === 0) return;

    setMedicalEventsByPet((prev) => {
      let next = prev;
      outcomes.forEach((outcome) => {
        next = addMvpMedicalEvent(next, {
          petId: input.petId,
          vetVisitId: createdVisit!.id,
          type: outcome.type,
          eventDate: outcome.eventDate,
          title: outcome.title,
          subcategory: outcome.subcategory,
          dueDate: outcome.dueDate,
          note: outcome.note,
          metadataJson: outcome.metadataJson,
        }).next;
      });
      return next;
    });

    setRemindersWithNotificationSync((prev) => {
      let next = prev;
      outcomes.forEach((outcome) => {
        if (!outcome.reminder) return;
        next = createReminder(next, {
          petId: input.petId,
          type: outcome.reminder.type,
          subtype: outcome.reminder.subtype,
          title: outcome.reminder.title,
          frequency: outcome.reminder.frequency,
          interval: outcome.reminder.interval,
          scheduledAt: outcome.reminder.scheduledAt,
          isActive: true,
          kind: outcome.reminder.kind,
          dueAt: outcome.reminder.dueAt ?? outcome.reminder.scheduledAt,
          status: 'pending',
          sourceType: 'vet_visit',
          sourceId: createdVisit!.id,
          note: outcome.reminder.note,
        }).next;
      });
      return next;
    });

    setMedicationCoursesByPet((prev) => {
      let next = prev;
      outcomes.forEach((outcome) => {
        if (!outcome.medication) return;
        next = createMedicationCourse(next, {
          petId: input.petId,
          name: outcome.medication.name,
          startDate: outcome.medication.startDate,
          isOngoing: outcome.medication.isOngoing,
          status: outcome.medication.status,
          dose: outcome.medication.dose,
          doseUnit: outcome.medication.doseUnit,
          frequency: outcome.medication.frequency,
          endDate: outcome.medication.endDate,
          instructions: outcome.medication.instructions,
        }).next;
      });
      return next;
    });
  };

  const openPetProfile = (petId: PetId = 'luna', from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPetProfileBackRoute(from);
    setSubBackRoute(from);
    setRoute('petProfile');
  };

  const vaccinationsBridge = useMemo(
    () => getVaccinesForUI(activePetId, medicalEventsByPet, healthEventsByPet, petProfiles[activePetId]),
    [activePetId, medicalEventsByPet, healthEventsByPet, petProfiles],
  );
  const vetVisitsBridge = useMemo(
    () => getVetVisitsForUI(activePetId, vetVisitsByPet, medicalEventsByPet, healthEventsByPet, petProfiles[activePetId]),
    [activePetId, vetVisitsByPet, medicalEventsByPet, healthEventsByPet, petProfiles],
  );
  const healthCardSummary = useMemo(
    () => getHealthCardSummary(
      activePetId,
      vetVisitsByPet,
      medicalEventsByPet,
      remindersByPet,
      medicationCoursesByPet,
      weightsByPet[activePetId] ?? [],
      healthEventsByPet,
      petProfiles[activePetId],
    ),
    [activePetId, vetVisitsByPet, medicalEventsByPet, remindersByPet, medicationCoursesByPet, weightsByPet, healthEventsByPet, petProfiles],
  );
  const upcomingRemindersByPet = useMemo(() => {
    const pets: PetId[] = ['luna', 'milo'];
    const next: Partial<Record<PetId, Array<{ id: string; title: string; date: string }>>> = {};
    pets.forEach((petId) => {
      const petType = petProfiles[petId]?.petType;
      const upcoming = getUpcomingReminders(remindersByPet, petId, 12)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .slice(0, 2);
      next[petId] = upcoming.map((reminder) => {
        const title = reminder.title?.trim()
          || (reminder.subtype === 'vaccine'
            ? (locale === 'tr' ? 'Aşı hatırlatması' : 'Vaccine follow-up')
            : reminder.subtype === 'medication'
              ? (locale === 'tr' ? 'İlaç programı' : 'Medication schedule')
              : reminder.subtype === 'food'
                ? (locale === 'tr' ? 'Beslenme zamanı' : 'Food reminder')
                : reminder.subtype === 'litter'
                  ? (locale === 'tr' ? 'Kum temizliği' : 'Litter reminder')
                  : reminder.subtype === 'walk'
                    ? (locale === 'tr' ? 'Yürüyüş zamanı' : 'Walk reminder')
                    : reminder.note?.trim() || (locale === 'tr' ? 'Sağlık hatırlatması' : 'Health reminder'));
        return {
          id: reminder.id,
          title,
          date: formatReminderDateLabel(reminder.scheduledAt ?? reminder.dueAt, locale),
        };
      });
    });
    return next;
  }, [remindersByPet, locale, petProfiles]);

  const completedRemindersByPet = useMemo(() => {
    const pets: PetId[] = ['luna', 'milo'];
    const next: Partial<Record<PetId, Array<{ id: string; title: string; date: string }>>> = {};
    pets.forEach((petId) => {
      const petType = petProfiles[petId]?.petType;
      const completed = getRemindersByPet(remindersByPet, petId)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .filter((reminder) => !!reminder.completedAt)
        .sort((a, b) => {
          const aMs = new Date(a.completedAt as string).getTime();
          const bMs = new Date(b.completedAt as string).getTime();
          if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
          if (!Number.isFinite(aMs)) return 1;
          if (!Number.isFinite(bMs)) return -1;
          return bMs - aMs;
        })
        .slice(0, 3);

      next[petId] = completed.map((reminder) => ({
        id: reminder.id,
        title: reminder.title?.trim() || (locale === 'tr' ? 'Tamamlanan hatırlatma' : 'Completed reminder'),
        date: formatReminderDateLabel((reminder.completedAt as string) ?? reminder.scheduledAt, locale),
      }));
    });
    return next;
  }, [remindersByPet, locale, petProfiles]);

  const reminderBadgeCount = useMemo(() => {
    return (upcomingRemindersByPet.luna?.length ?? 0) + (upcomingRemindersByPet.milo?.length ?? 0);
  }, [upcomingRemindersByPet]);

  const remindersTabGroups = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const startMs = startOfToday.getTime();
    const endMs = endOfToday.getTime();

    const today: Array<{ id: string; title: string; date: string; petName?: string; petId: PetId }> = [];
    const upcoming: Array<{ id: string; title: string; date: string; petName?: string; petId: PetId }> = [];
    const overdue: Array<{ id: string; title: string; date: string; petName?: string; petId: PetId }> = [];

    (['luna', 'milo'] as PetId[]).forEach((petId) => {
      const petName = petProfiles[petId]?.name || petId;
      const petType = petProfiles[petId]?.petType;
      getRemindersByPet(remindersByPet, petId)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .filter((reminder) => reminder.isActive && !reminder.completedAt)
        .forEach((reminder) => {
          const label = reminder.title?.trim() || (locale === 'tr' ? 'Hatırlatma' : 'Reminder');
          const dateValue = reminder.scheduledAt ?? reminder.dueAt;
          const dateMs = new Date(dateValue).getTime();
          const item = {
            id: reminder.id,
            title: label,
            date: formatReminderDateLabel(dateValue, locale),
            petName,
            petId,
          };
          if (Number.isFinite(dateMs)) {
            if (dateMs >= startMs && dateMs < endMs) {
              today.push(item);
              return;
            }
            if (dateMs < now) {
              overdue.push(item);
              return;
            }
          }
          upcoming.push(item);
        });
    });

    const sortByDate = (items: Array<{ id: string; title: string; date: string; petName?: string; petId: PetId }>) =>
      [...items].sort((a, b) => {
        const aMs = new Date(a.date).getTime();
        const bMs = new Date(b.date).getTime();
        if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
        if (!Number.isFinite(aMs)) return 1;
        if (!Number.isFinite(bMs)) return -1;
        return aMs - bMs;
      });
    return {
      today: sortByDate(today),
      upcoming: sortByDate(upcoming),
      overdue: sortByDate(overdue),
    };
  }, [completedRemindersByPet, locale, petProfiles, remindersByPet]);

  const healthHubTimeline = useMemo(() => {
    const base = buildUnifiedHealthEventsForPet(
      activePetId,
      medicalEventsByPet,
      vetVisitsByPet,
      weightsByPet,
      petProfiles[activePetId],
    );
    return base.slice(0, 60).map((item) => ({
      id: item.id,
      type: item.type,
      date: formatReminderDateLabel(item.date, locale),
      title: item.title || (locale === 'tr' ? 'Sağlık olayı' : 'Health event'),
      notes: item.notes,
    }));
  }, [activePetId, locale, medicalEventsByPet, petProfiles, vetVisitsByPet, weightsByPet]);

  const healthHubSummary = useMemo(() => {
    const summary = summarizeUnifiedHealthEvents(
      buildUnifiedHealthEventsForPet(
        activePetId,
        medicalEventsByPet,
        vetVisitsByPet,
        weightsByPet,
        petProfiles[activePetId],
      ),
    );
    const latestWeight =
      summary.latestWeight && typeof summary.latestWeight.metadata?.value === 'number'
        ? `${(summary.latestWeight.metadata.value as number).toFixed(1)} kg`
        : locale === 'tr'
          ? 'Kayıt yok'
          : 'No data';
    const vaccineStatus = summary.latestVaccine?.title || (locale === 'tr' ? 'Kayıt yok' : 'No data');
    const lastVetVisit = summary.latestVet?.date ? formatReminderDateLabel(summary.latestVet.date, locale) : (locale === 'tr' ? 'Kayıt yok' : 'No data');

    return { latestWeight, vaccineStatus, lastVetVisit };
  }, [activePetId, locale, medicalEventsByPet, petProfiles, vetVisitsByPet, weightsByPet]);
  const addWeightEntryForActivePet = (value: number, options?: { date?: string; note?: string }) => {
    const now = new Date();
    const selectedDateMs = options?.date ? new Date(options.date).getTime() : Number.NaN;
    const entryDate = Number.isFinite(selectedDateMs) ? new Date(selectedDateMs) : now;
    const rounded = Number(value.toFixed(1));
    const label = formatShortLabel(entryDate, locale);
    const date = formatLongLabel(entryDate, locale);

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

    const note = options?.note?.trim();
    addHealthEvent(activePetId, {
      type: 'weight',
      title: 'Weight Entry',
      description: note || nextChange,
      date,
      metadata: { value: rounded, unit: 'kg', label, note },
    });

    setWeightsUpdatedAt((prev) => {
      const nowIso = now.toISOString();
      return {
        ...prev,
        [activePetId]: nowIso,
      };
    });
  };

  const renderBackPreview = (target: AppRoute): ReactNode => {
    const noop = () => undefined;

    if (target === 'home') {
      return (
        <HomeScreen
          onOpenPetProfile={noop}
          onOpenVaccinations={noop}
          onOpenHealthRecords={noop}
          onOpenVetVisits={noop}
          onOpenPetEdit={noop}
          onOpenPetPassport={noop}
          petProfiles={petProfiles}
          weightsByPet={weightsByPet}
          activePetId={activePetId}
          onChangeActivePet={noop}
          petLockEnabled={petLockEnabled}
          onChangePetLockEnabled={noop}
          upcomingRemindersByPet={upcomingRemindersByPet}
          completedRemindersByPet={completedRemindersByPet}
          onCompleteReminder={noop}
          onAddCareReminder={noop}
        />
      );
    }

    if (target === 'profile') {
      return (
        <ProfileScreen
          onSaveSuccess={noop}
          onBackHome={noop}
          onOpenPremium={noop}
          onOpenProfileEdit={noop}
          onOpenVaccinations={noop}
          onOpenPetProfile={noop}
          onOpenPetProfiles={noop}
          onOpenHealthRecords={noop}
          onOpenVetVisits={noop}
          onOpenSettings={noop}
          onOpenPetPassport={noop}
          petProfiles={petProfiles}
          weightsByPet={weightsByPet}
        />
      );
    }

    if (target === 'petProfile') {
      const activePet = petProfiles[activePetId];
      return (
        <WeightTrackingScreen
          onBack={noop}
          previewMode
          onOpenHealthRecords={noop}
          onOpenVetVisits={noop}
          petName={activePet.name}
          petType={activePet.petType}
          petBreed={activePet.breed}
          microchip={activePet.microchip}
          entries={weightsByPet[activePetId]}
          onAddEntry={noop}
        />
      );
    }

    if (target === 'passport') {
      return (
        <PetHealthPassportScreen
          onBack={noop}
          pet={petProfiles[activePetId]}
          weightEntries={weightsByPet[activePetId] ?? []}
          healthCardSummary={healthCardSummary}
          onOpenVaccinations={noop}
          onOpenVetVisits={noop}
          onOpenHealthRecords={noop}
          onOpenWeight={noop}
        />
      );
    }

    if (target === 'petProfiles') {
      return (
        <PetProfilesScreen
          locale={locale}
          activePetId={activePetId}
          petProfiles={petProfiles}
          onBack={noop}
          onSelectPet={noop}
          onOpenPetDetail={noop}
          onOpenPetEdit={noop}
        />
      );
    }

    return <View style={styles.previewFallback} />;
  };

  const renderPrimaryChrome = (content: ReactNode) => (
    <View style={styles.primaryShell}>
      {content}

      <View pointerEvents="box-none" style={styles.fabLayer}>
        <Pressable style={styles.menuFab} onPress={() => setMenuOpen(true)}>
          <Plus size={20} color="#faf8f5" strokeWidth={2.6} />
        </Pressable>
      </View>

      {menuOpen ? (
        <Animated.View style={[styles.menuOverlay, { opacity: menuAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <Animated.View
            style={[
              styles.menuPanel,
              {
                opacity: menuAnim,
                transform: [
                  {
                    scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.menuSectionTitle}>{locale === 'tr' ? 'Hızlı İşlemler' : 'Quick Actions'}</Text>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); setPetProfileBackRoute(route); setRoute('petProfile'); }}>
              <Plus size={15} color="#2d2d2d" />
              <Text style={styles.menuItemText}>{locale === 'tr' ? 'Kilo Ekle' : 'Add Weight'}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                openVetVisitWithPreset(route, {
                  source: 'healthRecords',
                  reason: 'illness',
                  actions: ['diagnosis'],
                });
              }}
            >
              <HeartPulse size={15} color="#2d2d2d" />
              <Text style={styles.menuItemText}>{locale === 'tr' ? 'Sağlık Kaydı Ekle' : 'Add Health Record'}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                openVetVisitWithPreset(route, {
                  source: 'vaccinations',
                  reason: 'vaccine',
                  actions: ['vaccine'],
                });
              }}
            >
              <HeartPulse size={15} color="#2d2d2d" />
              <Text style={styles.menuItemText}>{locale === 'tr' ? 'Aşı Ekle' : 'Add Vaccine'}</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); openVetVisitWithPreset(route, { source: 'other', reason: 'checkup', actions: [] }); }}>
              <HeartPulse size={15} color="#2d2d2d" />
              <Text style={styles.menuItemText}>{locale === 'tr' ? 'Vet Ziyareti Ekle' : 'Add Vet Visit'}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setReminderCreateSubtypePreset(null);
                setReminderCreateNonce((prev) => prev + 1);
                setPrimaryTab('reminders');
                setRoute('reminders');
                setMenuOpen(false);
              }}
            >
              <Bell size={15} color="#2d2d2d" />
              <Text style={styles.menuItemText}>{locale === 'tr' ? 'Hatırlatma Ekle' : 'Add Reminder'}</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const petType = petProfiles[activePetId]?.petType;
                setReminderCreateSubtypePreset(petType === 'Dog' ? 'walk' : 'food');
                setReminderCreateNonce((prev) => prev + 1);
                setPrimaryTab('reminders');
                setRoute('reminders');
                setMenuOpen(false);
              }}
            >
              <Bell size={15} color="#2d2d2d" />
              <Text style={styles.menuItemText}>{locale === 'tr' ? 'Aktivite Kaydı (Mama / Yürüyüş / Kum)' : 'Log Activity (Food / Walk / Litter)'}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : null}

      <View style={styles.tabBar}>
        <Pressable style={styles.tabItem} onPress={() => { setPrimaryTab('home'); setRoute('home'); }}>
          <Home size={16} color={primaryTab === 'home' ? '#2d2d2d' : '#9a9a9a'} strokeWidth={2.3} />
          <Text style={[styles.tabText, primaryTab === 'home' && styles.tabTextActive]}>Home</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => { setPrimaryTab('healthHub'); setRoute('healthHub'); }}>
          <HeartPulse size={16} color={primaryTab === 'healthHub' ? '#2d2d2d' : '#9a9a9a'} strokeWidth={2.3} />
          <Text style={[styles.tabText, primaryTab === 'healthHub' && styles.tabTextActive]}>Health</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => { setPrimaryTab('reminders'); setRoute('reminders'); }}>
          <Bell size={16} color={primaryTab === 'reminders' ? '#2d2d2d' : '#9a9a9a'} strokeWidth={2.3} />
          <Text style={[styles.tabText, primaryTab === 'reminders' && styles.tabTextActive]}>Reminders</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => { setPrimaryTab('insights'); setRoute('insights'); }}>
          <ChartSpline size={16} color={primaryTab === 'insights' ? '#2d2d2d' : '#9a9a9a'} strokeWidth={2.3} />
          <Text style={[styles.tabText, primaryTab === 'insights' && styles.tabTextActive]}>Insights</Text>
        </Pressable>
      </View>
    </View>
  );
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
        backPreview={renderBackPreview(subBackRoute)}
        onAddVaccination={() =>
          openVetVisitWithPreset('vaccinations', {
            reason: 'vaccine',
            actions: ['vaccine'],
            source: 'vaccinations',
          })
        }
        historyItems={vaccinationsBridge?.historyItems}
        attentionCounts={vaccinationsBridge?.attentionCounts}
        nextUpData={vaccinationsBridge?.nextUpData}
      />
    );
  }

  if (route === 'healthRecords') {
    return renderPrimaryChrome(
      <HealthHubScreen
        summary={healthHubSummary}
        timeline={healthHubTimeline}
        initialCategory="record"
        categoryResetKey={`legacy-health-records-${healthHubCategoryResetKey}`}
      />,
    );
  }

  if (route === 'vetVisits') {
    return (
      <VetVisitsScreen
        onBack={() => setRoute(subBackRoute)}
        backPreview={renderBackPreview(subBackRoute)}
        createPreset={vetVisitCreatePreset}
        visits={vetVisitsBridge ?? undefined}
        onCreateVisit={(payload: CreateVetVisitPayload) => {
          const reasonTitleMap: Record<VetVisitReasonCategory, string> = {
            checkup: 'General Checkup',
            vaccine: 'Vaccination Visit',
            illness: 'Illness Visit',
            injury: 'Injury Visit',
            follow_up: 'Follow-up Visit',
            other: 'Vet Visit',
          };

          const outcomes: DualWriteOutcome[] = payload.actions.map((action) => {
            const eventTypeMap: Record<typeof action.type, MedicalEventType> = {
              vaccine: 'vaccine',
              diagnosis: 'diagnosis',
              procedure: 'procedure',
              test: 'test',
              prescription: 'prescription',
            };

            const outcome: DualWriteOutcome = {
              type: eventTypeMap[action.type],
              title: action.title,
              eventDate: payload.date,
              note: action.note,
              subcategory: action.type,
              metadataJson: { source: 'vet_visit_form' },
            };

            if (payload.reminderEnabled && payload.reminderDate) {
              outcome.reminder = {
                type: 'medical',
                subtype: action.type === 'vaccine' ? 'vaccine' : action.type === 'prescription' ? 'medication' : 'vet_visit',
                title: action.title,
                frequency: 'once',
                scheduledAt: payload.reminderDate,
                kind: action.type === 'vaccine' ? 'vaccine_due' : action.type === 'prescription' ? 'medication' : 'medical_followup',
                dueAt: payload.reminderDate,
                note: action.note,
              };
            }

            if (action.type === 'prescription') {
              outcome.medication = {
                name: action.title,
                startDate: payload.date,
                isOngoing: true,
                status: 'active',
                instructions: action.note,
              };
            }

            return outcome;
          });

          recordVetVisitDualWrite({
            petId: activePetId,
            visitDate: payload.date,
            reasonCategory: payload.reason,
            status: 'completed',
            notes: payload.note,
            outcomes,
          });

          addHealthEvent(activePetId, {
            type: 'vet_visit',
            title: reasonTitleMap[payload.reason] ?? 'Vet Visit',
            description: payload.note,
            date: payload.date,
            metadata: {
              clinic: 'Veterinary Clinic',
              doctor: 'Veterinarian',
              attachments: [],
            },
          });

          payload.actions.forEach((action) => {
            if (action.type === 'vaccine') {
              addHealthEvent(activePetId, {
                type: 'vaccination',
                title: action.title,
                description: action.note,
                date: payload.date,
                metadata: { vaccineType: action.title, source: 'vet_visit_form' },
              });
              return;
            }

            const category =
              action.type === 'diagnosis'
                ? 'diagnosis'
                : action.type === 'procedure'
                  ? 'surgery'
                  : action.type === 'test'
                    ? 'lab_result'
                    : 'prescription';

            addHealthEvent(activePetId, {
              type: 'health_note',
              title: action.title,
              description: action.note,
              date: payload.date,
              metadata: { category, source: 'vet_visit_form' },
            });
          });
        }}
      />
    );
  }

  if (route === 'petProfile') {
    const activePet = petProfiles[activePetId];
    return (
      <WeightTrackingScreen
        onBack={() => setRoute(petProfileBackRoute)}
        backPreview={renderBackPreview(petProfileBackRoute)}
        onOpenHealthRecords={() => openHealthHubWithCategory('record')}
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
          const previousPet = petProfiles[nextPet.id];

          const previousVaccinationSet = new Set((previousPet?.vaccinations ?? []).map((v) => `${v.name}|${v.date}`));
          const addedVaccinations = (nextPet.vaccinations ?? []).filter((v) => !previousVaccinationSet.has(`${v.name}|${v.date}`));

          const previousSurgerySet = new Set((previousPet?.surgeriesLog ?? []).map((s) => `${s.name}|${s.date}`));
          const addedSurgeries = (nextPet.surgeriesLog ?? []).filter((s) => !previousSurgerySet.has(`${s.name}|${s.date}`));

          const previousAllergySet = new Set((previousPet?.allergiesLog ?? []).map((a) => `${a.category}|${a.date}|${a.status}`));
          const addedAllergies = (nextPet.allergiesLog ?? []).filter((a) => !previousAllergySet.has(`${a.category}|${a.date}|${a.status}`));

          const previousDiabetesSet = new Set((previousPet?.diabetesLog ?? []).map((d) => `${d.type}|${d.date}|${d.status}`));
          const addedDiabetes = (nextPet.diabetesLog ?? []).filter((d) => !previousDiabetesSet.has(`${d.type}|${d.date}|${d.status}`));

          const nowIso = new Date().toISOString();
          const outcomes: DualWriteOutcome[] = [
            ...addedVaccinations.map((v) => ({
              type: 'vaccine' as const,
              title: v.name,
              eventDate: v.date || nowIso,
              subcategory: 'vaccine',
              metadataJson: { source: 'pet_edit' },
            })),
            ...addedSurgeries.map((s) => ({
              type: 'procedure' as const,
              title: s.name,
              eventDate: s.date || nowIso,
              note: s.note,
              subcategory: 'surgery',
              metadataJson: { source: 'pet_edit' },
            })),
            ...addedAllergies.map((a) => ({
              type: 'diagnosis' as const,
              title: a.category,
              eventDate: a.date || nowIso,
              note: a.status,
              subcategory: 'allergy',
              metadataJson: { severity: a.severity, status: a.status, source: 'pet_edit' },
            })),
            ...addedDiabetes.map((d) => ({
              type: 'diagnosis' as const,
              title: d.type,
              eventDate: d.date || nowIso,
              note: d.status,
              subcategory: 'diabetes',
              metadataJson: { status: d.status, source: 'pet_edit' },
            })),
          ];

          if (outcomes.length > 0) {
            const latestDate = outcomes.reduce((latest, item) => {
              const latestMs = new Date(latest).getTime();
              const itemMs = new Date(item.eventDate).getTime();
              if (!Number.isFinite(itemMs)) return latest;
              if (!Number.isFinite(latestMs)) return item.eventDate;
              return itemMs > latestMs ? item.eventDate : latest;
            }, outcomes[0].eventDate);

            recordVetVisitDualWrite({
              petId: nextPet.id,
              visitDate: latestDate,
              reasonCategory: 'follow_up',
              status: 'completed',
              notes: 'Generated from pet profile health updates',
              outcomes,
            });
          }

          setPetProfilesWithPersist((prev) => ({ ...prev, [nextPet.id]: nextPet }));
          setPetProfilesUpdatedAt((prev) => {
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
        onBack={() => setRoute(passportBackRoute)}
        backPreview={renderBackPreview(passportBackRoute)}
        pet={petProfiles[activePetId]}
        weightEntries={weightsByPet[activePetId] ?? []}
        healthCardSummary={healthCardSummary}
        onOpenVaccinations={() => openSubRoute('vaccinations', 'passport')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'passport')}
        onOpenHealthRecords={() => openHealthHubWithCategory('record')}
        onOpenWeight={() => openPetProfile(activePetId, 'passport')}
      />
    );
  }

  if (route === 'healthHub') {
    return renderPrimaryChrome(
      <HealthHubScreen
        summary={healthHubSummary}
        timeline={healthHubTimeline}
        initialCategory={healthHubInitialCategory}
        categoryResetKey={healthHubCategoryResetKey}
      />,
    );
  }

  if (route === 'reminders') {
    return renderPrimaryChrome(
      <RemindersScreen
        today={remindersTabGroups.today}
        upcoming={remindersTabGroups.upcoming}
        overdue={remindersTabGroups.overdue}
        activePetId={activePetId}
        activePetType={petProfiles[activePetId]?.petType}
        openCreateNonce={reminderCreateNonce}
        subtypePreset={reminderCreateSubtypePreset ?? undefined}
        onCreate={({ petId, subtype, title, date }) => {
          const petType = petProfiles[petId]?.petType;
          if (!isReminderSubtypeAllowedForPet(petType, subtype)) {
            return;
          }
          const parsedDate = new Date(`${date}T12:00:00.000Z`).toISOString();
          setRemindersWithNotificationSync((prev) =>
            createReminder(prev, {
              petId,
              type: subtype === 'food' || subtype === 'litter' || subtype === 'walk' || subtype === 'custom' ? 'care' : 'medical',
              subtype,
              title,
              scheduledAt: parsedDate,
              frequency: 'once',
              isActive: true,
              kind: subtype === 'vaccine' ? 'vaccine_due' : subtype === 'medication' ? 'medication' : subtype === 'vet_visit' ? 'medical_followup' : 'care_routine',
              dueAt: parsedDate,
              status: 'pending',
              sourceType: 'manual',
            }).next,
          );
        }}
        onComplete={(id) => {
          const item = [...remindersTabGroups.today, ...remindersTabGroups.upcoming, ...remindersTabGroups.overdue].find((r) => r.id === id);
          if (!item) return;
          setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, item.petId, id).next);
        }}
      />,
    );
  }

  if (route === 'insights') {
    return renderPrimaryChrome(
      <InsightsScreen
        items={[
          { label: 'Last Visit', value: healthCardSummary.lastVisit?.title ?? 'No recent visit', sub: healthCardSummary.lastVisit?.date ?? '' },
          { label: 'Vaccines', value: String(healthCardSummary.vaccinesSummary.total), sub: healthCardSummary.vaccinesSummary.latest ?? 'No vaccine log yet' },
          { label: 'Active Meds', value: String(healthCardSummary.activeMedications.length), sub: healthCardSummary.activeMedications[0]?.name ?? 'None' },
          { label: 'Alerts', value: String(healthCardSummary.alerts.length), sub: healthCardSummary.alerts[0] ?? 'All clear' },
        ]}
      />,
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
        onOpenHealthRecords={() => openHealthHubWithCategory('record')}
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

  return renderPrimaryChrome(
    <HomeScreen
      onOpenReminders={() => {
        setPrimaryTab('reminders');
        setRoute('reminders');
      }}
      onOpenSettings={() => setRoute('settings')}
      reminderBadgeCount={reminderBadgeCount}
      onOpenPetProfile={(petId) => openPetProfile((petId as PetId) || 'luna', 'home')}
      onOpenVaccinations={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        openSubRoute('vaccinations', 'home');
      }}
      onOpenHealthRecords={(petId) => {
        if (petId) setActivePetWithPersist(petId as PetId);
        openHealthHubWithCategory('record');
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
      upcomingRemindersByPet={upcomingRemindersByPet}
      completedRemindersByPet={completedRemindersByPet}
      onCompleteReminder={(petId, reminderId) => {
        setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, petId as PetId, reminderId).next);
      }}
      onAddCareReminder={(petId, subtype) => {
        const typedPetId = petId as PetId;
        const petType = petProfiles[typedPetId]?.petType;
        if (!isReminderSubtypeAllowedForPet(petType, subtype)) {
          return;
        }
        const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const titleMap: Record<'food' | 'litter' | 'walk' | 'custom', string> = {
          food: locale === 'tr' ? 'Beslenme zamanı' : 'Food reminder',
          litter: locale === 'tr' ? 'Kum temizliği' : 'Litter reminder',
          walk: locale === 'tr' ? 'Yürüyüş zamanı' : 'Walk reminder',
          custom: locale === 'tr' ? 'Bakım hatırlatması' : 'Care reminder',
        };
        setRemindersWithNotificationSync((prev) =>
          createReminder(prev, {
            petId: typedPetId,
            type: 'care',
            subtype,
            title: titleMap[subtype],
            scheduledAt,
            frequency: 'daily',
            isActive: true,
            kind: 'care_routine',
            dueAt: scheduledAt,
            status: 'pending',
            sourceType: 'manual',
          }).next,
        );
      }}
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
  previewFallback: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  primaryShell: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  fabLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 24,
  },
  menuFab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.14)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 92,
  },
  menuPanel: {
    width: 236,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuSectionTitle: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    color: '#888',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  menuSectionTitleSecondary: {
    marginTop: 6,
  },
  menuItem: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    color: '#2d2d2d',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
  },
  menuToggleRow: {
    justifyContent: 'space-between',
  },
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 88,
    bottom: 16,
    height: 62,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabItem: {
    minWidth: 72,
    alignItems: 'center',
    gap: 2,
  },
  tabText: {
    color: '#9a9a9a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#2d2d2d',
  },
});


















