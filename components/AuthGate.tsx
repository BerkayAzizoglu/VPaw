import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { getLocalItem, setLocalItem } from '../lib/localStore';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import { useReminderSelectors } from '../hooks/useReminderSelectors';
import { useNotificationsViewModel } from '../hooks/useNotificationsViewModel';
import { useRouteActions } from '../hooks/useRouteActions';
import { useHealthHubActions } from '../hooks/useHealthHubActions';
import { useInsightActions } from '../hooks/useInsightActions';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen, { type JourneyEventItem as HomeJourneyEventItem, type NextImportantEventItem } from '../screens/HomeScreen';
import PremiumScreen from '../screens/PremiumScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import WeightTrackingScreen from '../screens/WeightTrackingScreen';
import VetVisitsScreen, { type CreateVetVisitPayload } from '../screens/VetVisitsScreen';
import VaccinationsScreen from '../screens/VaccinationsScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import PetEditScreen from '../screens/PetEditScreen';
import PetDetailScreen from '../screens/PetDetailScreen';
import PetsScreen from '../screens/PetsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PetHealthPassportScreen from '../screens/PetHealthPassportScreen';
import RemindersScreen, { type ReminderSuggestion } from '../screens/RemindersScreen';
import InsightsScreen from '../screens/InsightsScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import OnboardingScreen from '../screens/onboarding';
import OnboardingPetCreateScreen from '../screens/OnboardingPetCreate';
import HealthHubScreen, {
  type AddHealthRecordPayload,
  type AddHealthRecordType,
  type HealthHubAreaCard,
  type HealthHubCategory,
  type HealthHubDomainOverview,
} from '../screens/HealthHubScreen';
import LensMagTabBar from './LensMagTabBar';
import SuccessOverlay, { type SuccessOverlayHandle } from './SuccessOverlay';
import AddRecordSheet, { type AddRecordMode } from './AddRecordSheet';
import { deletePetProfilesFromCloud, fetchPetProfilesFromCloud, savePetProfilesToCloud } from '../lib/petProfilesRepo';
import { getHealthCardSummary, getHealthRecordsForUI, getVaccinesForUI, getVetVisitsForUI } from '../lib/healthEventAdapters';
import { getAllDocumentsForPet } from '../lib/healthDocumentsVault';
import { projectHealthHubData } from '../lib/healthHubModel';
import {
  buildTriggeredNotifications,
  getNotificationDedupKey,
  shouldSuppressNotification,
  type HealthNotification,
  type NotificationLastTriggeredByKey,
} from '../lib/notificationInbox';
import {
  deleteHealthDomainFromCloud,
  emptyHealthDomainUpdatedAt,
  fetchHealthDomainFromCloud,
  saveHealthDomainToCloud,
  type CloudHealthDomainUpdatedAt,
  type CloudHealthPayload,
} from '../lib/healthSyncRepo';
import { cancelReminderNotification, reconcileReminderNotifications } from '../lib/reminderNotifications';
import { hap } from '../lib/haptics';
import { buildAiInsights, type AiInsight } from '../lib/insightsEngine';
import { buildUnifiedHealthEventsForPet, summarizeUnifiedHealthEvents } from '../lib/unifiedHealthEvents';
import {
  buildHomeTimelinePreview,
  buildHubTimelinePreview,
  dedupeJourneyEventsBySource,
} from '../lib/healthTimelineAdapter';
import { getBreedHealthEntry } from '../lib/breedHealthData';
import { generateBreedInsight } from '../lib/breedInsightsEngine';
import { buildPetHealthPassportData, generatePetPassportPDF, type PetPassportExportSelection } from '../lib/petHealthPassportPdf';
import { supabase } from '../lib/supabase';
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
  getRemindersByPet,
  markReminderCompleted,
  snoozeReminder,
  type PetId,
  type ReminderFrequency,
  type ReminderKind,
  type ReminderSubtype,
  type ReminderType,
  type Reminder,
  updateReminder,
  type VetVisit,
  type VetVisitReasonCategory,
  type VetVisitStatus,
  type WeightPoint,
} from '../lib/healthMvpModel';
import type {
  AllergyRecord,
  DiabetesRecord,
  HealthEvent,
  HealthEventType,
  PetProfile,
  RoutineCareRecord,
  SurgeryRecord,
  VaccinationRecord,
} from '../lib/petProfileTypes';
import {
  buildCleanState,
  buildDomainFingerprint,
  buildHealthEventsFromLegacyData,
  daysSince,
  DEFAULT_ROUTINE_CARE,
  formatLongLabel,
  formatReminderDateLabel,
  formatShortLabel,
  getCloudDomainClock,
  getLocalDomainClockForPet,
  isReminderSubtypeAllowedForPet,
  mergeById,
  mergeWeightsByDate,
  migrateLegacyHealthEventsToCanonical,
  normalizeDomainClockValue,
  normalizeHealthEvents,
  normalizePetProfiles,
  normalizeUpdatedAt,
  parseUpdatedAtMs,
} from '../lib/petProfileUtils';

type AppRoute =
  | 'onboarding'
  | 'onboardingPetCreate'
  | 'home'
  | 'healthHub'
  | 'reminders'
  | 'insights'
  | 'profile'
  | 'pets'
  | 'premium'
  | 'profileEdit'
  | 'petProfile'
  | 'vetVisits'
  | 'petEdit'
  | 'addPet'
  | 'settings'
  | 'passport'
  | 'documents'
  | 'notifications'
  | 'weightTracking'
  | 'vaccinations'
  | 'healthRecords';

type PrimaryTab = 'home' | 'healthHub' | 'reminders' | 'insights' | 'profile';

const PET_PROFILES_STORAGE_KEY = 'vpaw_pet_profiles';
const PET_PROFILES_UPDATED_AT_STORAGE_KEY = 'vpaw_pet_profiles_updated_at';
const PET_LIST_STORAGE_KEY = 'vpaw_pet_list';
const WEIGHTS_STORAGE_KEY = 'vpaw_weights_by_pet';
const WEIGHTS_UPDATED_AT_STORAGE_KEY = 'vpaw_weights_updated_at';
const HEALTH_EVENTS_STORAGE_KEY = 'vpaw_health_events_by_pet';
const VET_VISITS_BY_PET_STORAGE_KEY = 'vpaw_vet_visits_by_pet';
const MEDICAL_EVENTS_BY_PET_STORAGE_KEY = 'vpaw_medical_events_by_pet';
const REMINDERS_BY_PET_STORAGE_KEY = 'vpaw_reminders_by_pet';
const WEIGHT_GOALS_BY_PET_STORAGE_KEY = 'vpaw_weight_goals_by_pet';
const MEDICATION_COURSES_BY_PET_STORAGE_KEY = 'vpaw_medication_courses_by_pet';
const RUNTIME_STATE_STORAGE_KEY = 'vpaw_runtime_state';
const ACTIVE_PET_STORAGE_KEY = 'vpaw_active_pet_id';
const PET_LOCK_STORAGE_KEY = 'vpaw_pet_lock_enabled';
const DARK_MODE_STORAGE_KEY = 'vpaw_dark_mode_enabled';
const DATA_RESET_VERSION_STORAGE_KEY = 'vpaw_data_reset_version';
const WEIGHT_HISTORY_RESET_VERSION_STORAGE_KEY = 'vpaw_weight_history_reset_version';
const NOTIFICATION_READ_MAP_STORAGE_KEY = 'vpaw_notification_read_map';
const NOTIFICATION_LAST_TRIGGERED_STORAGE_KEY = 'vpaw_notification_last_triggered_by_key';
const NOTIFICATION_INBOX_STORAGE_KEY = 'vpaw_notification_inbox';
const ONBOARDING_COMPLETED_STORAGE_KEY = 'vpaw_onboarding_completed';
const DATA_RESET_TARGET_VERSION = 'milo-clean-reset-2026-03-22';
const WEIGHT_HISTORY_RESET_TARGET_VERSION = 'milo-weight-history-clear-2026-03-29-v2';

type RuntimeState = {
  activePetId: string;
  petLockEnabled: boolean;
};

type PerPetUpdatedAt = Record<string, string>;
type HealthDomainClockByPet = Record<string, CloudHealthDomainUpdatedAt>;
type HealthDomainKey = 'vetVisits' | 'medicalEvents' | 'reminders' | 'medicationCourses' | 'weights';
type HealthDomainFingerprintsByPet = Record<string, Record<HealthDomainKey, string>>;
type ProfileNameRow = { full_name: string | null };

export default function AuthGate() {
  const { session, loading } = useAuth();
  const { locale } = useLocale();
  const [route, setRoute] = useState<AppRoute>('home');
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('home');
  const [tabScrollTopSignals, setTabScrollTopSignals] = useState<Record<PrimaryTab, number>>({
    home: 0,
    healthHub: 0,
    reminders: 0,
    insights: 0,
    profile: 0,
  });
  const [reminderCreateNonce, setReminderCreateNonce] = useState(0);
  const [reminderCreateSubtypePreset, setReminderCreateSubtypePreset] = useState<ReminderSubtype | null>(null);
  const [healthHubInitialCategory, setHealthHubInitialCategory] = useState<HealthHubCategory>('all');
  const [primaryAddSheetOpen, setPrimaryAddSheetOpen] = useState(false);
  const [primaryAddSheetMode, setPrimaryAddSheetMode] = useState<AddRecordMode>('typeSelect');
  const [primaryAddSheetOrigin, setPrimaryAddSheetOrigin] = useState<AppRoute>('healthHub');
  const [healthHubCategoryResetKey, setHealthHubCategoryResetKey] = useState(0);
  const [healthHubCreatePreset, setHealthHubCreatePreset] = useState<{
    type: AddHealthRecordType;
    title?: string;
    note?: string;
    openCreate: boolean;
    nonce: number;
  } | null>(null);
  const [healthCreateFlowContext, setHealthCreateFlowContext] = useState<{
    origin: AppRoute;
    successRoute: AppRoute;
  } | null>(null);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [subBackRoute, setSubBackRoute] = useState<AppRoute>('home');
  const [petProfileBackRoute, setPetProfileBackRoute] = useState<AppRoute>('home');
  const [weightBackRoute, setWeightBackRoute] = useState<AppRoute>('home');
  const [petEditBackRoute, setPetEditBackRoute] = useState<AppRoute>('home');
  const [passportBackRoute, setPassportBackRoute] = useState<AppRoute>('home');
  const [premiumBackRoute, setPremiumBackRoute] = useState<AppRoute>('profile');
  const [documentsBackRoute, setDocumentsBackRoute] = useState<AppRoute>('healthHub');
  const [notificationsBackRoute, setNotificationsBackRoute] = useState<AppRoute>('reminders');
  const [vaccinationsBackRoute, setVaccinationsBackRoute] = useState<AppRoute>('healthHub');
  const [healthRecordsBackRoute, setHealthRecordsBackRoute] = useState<AppRoute>('healthHub');
  const [weightQuickAdd, setWeightQuickAdd] = useState(false);
  const [petList, setPetList] = useState<string[]>([]);
  const [newPetTemplate, setNewPetTemplate] = useState<PetProfile | null>(null);
  const [activePetId, setActivePetId] = useState<string>('');
  const [weightsByPet, setWeightsByPet] = useState<Record<string, WeightPoint[]>>({});
  const [weightsUpdatedAt, setWeightsUpdatedAt] = useState<PerPetUpdatedAt>({});
  // Legacy fallback-only source; new writes should target canonical domain models.
  const [healthEventsByPet, setHealthEventsByPet] = useState<Record<string, HealthEvent[]>>({});
  const [vetVisitsByPet, setVetVisitsByPet] = useState<ByPet<VetVisit>>(EMPTY_VET_VISITS_BY_PET);
  const [medicalEventsByPet, setMedicalEventsByPet] = useState<ByPet<MvpMedicalEvent>>(EMPTY_MEDICAL_EVENTS_BY_PET);
  const [remindersByPet, setRemindersByPet] = useState<ByPet<Reminder>>(EMPTY_REMINDERS_BY_PET);
  const [medicationCoursesByPet, setMedicationCoursesByPet] = useState<ByPet<MedicationCourse>>(EMPTY_MEDICATION_COURSES_BY_PET);
  const [weightGoalsByPet, setWeightGoalsByPet] = useState<Record<string, number>>({});
  const [petProfiles, setPetProfiles] = useState<Record<string, PetProfile>>({});
  const [petProfilesUpdatedAt, setPetProfilesUpdatedAt] = useState<PerPetUpdatedAt>({});
  const [cloudPetProfilesUpdatedAt, setCloudPetProfilesUpdatedAt] = useState<PerPetUpdatedAt>({});
  const [petHydrated, setPetHydrated] = useState(false);
  const [petLockEnabled, setPetLockEnabled] = useState(false);
  const [petLockHydrated, setPetLockHydrated] = useState(false);
  const [runtimeDebug, setRuntimeDebug] = useState('');
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudMetadataReady, setCloudMetadataReady] = useState(false);
  const [healthCloudHydrated, setHealthCloudHydrated] = useState(false);
  const [healthCloudMetadataReady, setHealthCloudMetadataReady] = useState(false);
  const [cloudHealthDomainUpdatedAtByPet, setCloudHealthDomainUpdatedAtByPet] = useState<HealthDomainClockByPet>({});
  const [notificationReadById, setNotificationReadById] = useState<Record<string, boolean>>({});
  const [notificationInbox, setNotificationInbox] = useState<HealthNotification[]>([]);
  const [notificationLastTriggeredByKey, setNotificationLastTriggeredByKey] = useState<NotificationLastTriggeredByKey>({});
  const [profileNameRow, setProfileNameRow] = useState<ProfileNameRow | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [onboardingHydrated, setOnboardingHydrated] = useState(false);
  const [petCreateOrigin, setPetCreateOrigin] = useState<'onboarding' | 'pets'>('onboarding');
  const [routeToastText, setRouteToastText] = useState<string | null>(null);
  const successOverlayRef = useRef<SuccessOverlayHandle>(null);
  const routeToastOpacity = useRef(new Animated.Value(0)).current;
  const routeToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePetRef = useRef<string>('');
  const petLockRef = useRef(false);
  const reminderSyncInFlightRef = useRef(false);
  const queuedReminderSyncRef = useRef<{ state: ByPet<Reminder>; force: boolean } | null>(null);
  const reminderBootstrapSyncDoneRef = useRef(false);
  const healthDomainFingerprintsRef = useRef<HealthDomainFingerprintsByPet>({});
  const localHealthDomainUpdatedAtRef = useRef<HealthDomainClockByPet>({});

  const closePrimaryAddSheet = React.useCallback(() => {
    setPrimaryAddSheetOpen(false);
    setPrimaryAddSheetMode('typeSelect');
  }, []);

  const openPrimaryAddSheet = React.useCallback((mode: AddRecordMode) => {
    setPrimaryAddSheetMode(mode);
    setPrimaryAddSheetOrigin(route);
    setPrimaryAddSheetOpen(false);
    requestAnimationFrame(() => {
      setPrimaryAddSheetOpen(true);
    });
  }, [route]);

  useEffect(() => {
    healthDomainFingerprintsRef.current = {};
    localHealthDomainUpdatedAtRef.current = {};
    if (!session?.user?.id) {
      setCloudHealthDomainUpdatedAtByPet({});
      setNotificationReadById({});
      setNotificationInbox([]);
      setNotificationLastTriggeredByKey({});
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!primaryAddSheetOpen) return;
    const routeSupportsPrimaryAddSheet =
      route === 'vetVisits' || route === 'vaccinations' || route === 'healthRecords';
    if (routeSupportsPrimaryAddSheet) return;
    closePrimaryAddSheet();
  }, [closePrimaryAddSheet, primaryAddSheetOpen, route]);

  useEffect(() => {
    let active = true;
    async function loadProfileName() {
      if (!session?.user?.id) {
        if (active) setProfileNameRow(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!active) return;
      setProfileNameRow(data ?? null);
    }
    loadProfileName();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    return () => {
      if (routeToastTimerRef.current) {
        clearTimeout(routeToastTimerRef.current);
      }
    };
  }, []);

  const showRouteToast = (message: string) => {
    if (routeToastTimerRef.current) {
      clearTimeout(routeToastTimerRef.current);
      routeToastTimerRef.current = null;
    }
    setRouteToastText(message);
    routeToastOpacity.setValue(0);
    Animated.timing(routeToastOpacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
    routeToastTimerRef.current = setTimeout(() => {
      Animated.timing(routeToastOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setRouteToastText(null));
    }, 1350);
  };

  const areReminderStatesEqual = (a: ByPet<Reminder>, b: ByPet<Reminder>) => {
    const allPetIds = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    return allPetIds.every((petId) => {
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
    const prev = queuedReminderSyncRef.current;
    // Preserve force=true if either the incoming or the already-queued call requested it
    queuedReminderSyncRef.current = { state: targetState, force: forceReschedule || (prev?.force ?? false) };
    if (reminderSyncInFlightRef.current) return;

    reminderSyncInFlightRef.current = true;
    try {
      while (queuedReminderSyncRef.current) {
        const { state: currentTarget, force: currentForce } = queuedReminderSyncRef.current;
        queuedReminderSyncRef.current = null;
        const petNames: Record<string, string> = {};
        for (const petId of Object.keys(petProfiles)) {
          petNames[petId] = petProfiles[petId]?.name || petId;
        }
        const synced = await reconcileReminderNotifications(
          currentTarget,
          petNames,
          { forceReschedule: currentForce },
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

  const isWeightGoalCheckReminder = (reminder: Reminder | null | undefined) => {
    const title = reminder?.title?.toLocaleLowerCase('en-US') ?? '';
    return title.includes('weight goal check') || title.includes('hedef kilo kontrolü');
  };

  const isRoutineCareReminder = (
    reminder: Reminder | null | undefined,
    petId: string,
    key: 'internalParasite' | 'externalParasite',
  ) => reminder?.petId === petId && reminder?.sourceId === `routine-care:${key}`;

  const buildRoutineReminderScheduledAt = (record: RoutineCareRecord) => {
    const base = record.lastDate?.trim()
      ? new Date(`${record.lastDate.trim()}T09:00:00.000Z`)
      : new Date();
    const next = Number.isFinite(base.getTime()) ? new Date(base.getTime()) : new Date();
    next.setUTCDate(next.getUTCDate() + Math.max(1, record.intervalDays || 30));
    next.setUTCHours(9, 0, 0, 0);
    return next.toISOString();
  };

  const syncRoutineCareReminderForPet = (
    byPet: ByPet<Reminder>,
    petId: string,
    key: 'internalParasite' | 'externalParasite',
    record: RoutineCareRecord,
    localeValue: 'en' | 'tr',
  ) => {
    const filtered = {
      ...byPet,
      [petId]: (byPet[petId] ?? []).filter((item) => !isRoutineCareReminder(item, petId, key)),
    };
    if (!record.enabled) return filtered;
    const title =
      key === 'internalParasite'
        ? (localeValue === 'tr' ? 'Ic parazit bakim rutini' : 'Internal parasite care')
        : (localeValue === 'tr' ? 'Dis parazit bakim rutini' : 'External parasite care');
    const note =
      key === 'internalParasite'
        ? (localeValue === 'tr' ? 'Pet profilinden etkinlestirildi' : 'Enabled from pet profile')
        : (localeValue === 'tr' ? 'Pet profilinden etkinlestirildi' : 'Enabled from pet profile');
    return createReminder(filtered, {
      petId,
      type: 'care',
      subtype: 'custom',
      title,
      frequency: 'custom',
      interval: Math.max(1, record.intervalDays || 30),
      scheduledAt: buildRoutineReminderScheduledAt(record),
      isActive: true,
      kind: 'care_routine',
      status: 'pending',
      originType: 'system',
      sourceType: 'manual',
      sourceId: `routine-care:${key}`,
      note,
    }).next;
  };

  const persistWeightStateSnapshot = (nextWeightsByPet: Record<string, WeightPoint[]>, nextWeightsUpdatedAt: PerPetUpdatedAt) => {
    void Promise.all([
      setLocalItem(WEIGHTS_STORAGE_KEY, JSON.stringify(nextWeightsByPet)),
      setLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY, JSON.stringify(nextWeightsUpdatedAt)),
    ]).catch(() => {});
  };

  const persistRuntimeState = (nextActivePetId: string, nextPetLockEnabled: boolean) => {
    Promise.all([
      setLocalItem(
        RUNTIME_STATE_STORAGE_KEY,
        JSON.stringify({ activePetId: nextActivePetId, petLockEnabled: nextPetLockEnabled } satisfies RuntimeState),
      ),
      setLocalItem(ACTIVE_PET_STORAGE_KEY, nextActivePetId),
      setLocalItem(PET_LOCK_STORAGE_KEY, nextPetLockEnabled ? '1' : '0'),
    ]).catch(() => {});
  };

  const setActivePetWithPersist = (petId: string) => {
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
    if (route === 'home' || route === 'healthHub' || route === 'reminders' || route === 'insights' || route === 'profile') {
      setPrimaryTab(route);
    }
  }, [route]);


  const setPetProfilesWithPersist = (updater: Record<string, PetProfile> | ((prev: Record<string, PetProfile>) => Record<string, PetProfile>)) => {
    setPetProfiles((prev) => {
      const next = typeof updater === 'function' ? (updater as (prev: Record<string, PetProfile>) => Record<string, PetProfile>)(prev) : updater;
      setLocalItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    setRoute('home');
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    getLocalItem(ONBOARDING_COMPLETED_STORAGE_KEY)
      .then((value) => {
        if (!mounted) return;
        setHasCompletedOnboarding(value === '1');
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setOnboardingHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !onboardingHydrated || hasCompletedOnboarding) return;
    if (route === 'onboarding' || route === 'onboardingPetCreate') return;
    setRoute('onboarding');
  }, [hasCompletedOnboarding, onboardingHydrated, route, session?.user?.id]);

  useEffect(() => {
    if (route === 'addPet') {
      console.log('WRONG FLOW TRIGGERED');
    }
  }, [route]);

  useEffect(() => {
    if (!hasCompletedOnboarding && route === 'addPet') {
      setRoute('onboardingPetCreate');
    }
  }, [hasCompletedOnboarding, route]);

  const completeOnboardingAndGoHome = () => {
    setHasCompletedOnboarding(true);
    setLocalItem(ONBOARDING_COMPLETED_STORAGE_KEY, '1').catch(() => {});
    setRoute('home');
  };

  const openLightweightPetCreate = (origin: 'onboarding' | 'pets') => {
    setPetCreateOrigin(origin);
    setRoute('onboardingPetCreate');
  };

  const hasMissingCorePetInfo = (pet: PetProfile) => {
    const hasName = pet.name.trim().length > 0;
    const hasBreed = pet.breed.trim().length > 0;
    const hasBirthDate = pet.birthDate.trim().length > 0;
    const hasMicrochip = pet.microchip.trim().length > 0;
    const hasPhoto = pet.image.trim().length > 0;
    return !(hasName && hasBreed && hasBirthDate && hasMicrochip && hasPhoto);
  };

  const promptCompletePetProfile = (pet: PetProfile, backRoute: AppRoute) => {
    if (!hasMissingCorePetInfo(pet)) return;
    Alert.alert(
      locale === 'tr' ? 'Profili tamamlayalım mı?' : 'Complete the profile now?',
      locale === 'tr'
        ? 'Bazı temel alanlar eksik görünüyor. Şimdi tamamlayarak daha doğru öneriler alabilirsin.'
        : 'Some core details are missing. Completing them now improves reminders and insights.',
      [
        {
          text: locale === 'tr' ? 'Daha sonra' : 'Later',
          style: 'cancel',
        },
        {
          text: locale === 'tr' ? 'Şimdi tamamla' : 'Complete now',
          onPress: () => {
            setActivePetWithPersist(pet.id);
            setPetEditBackRoute(backRoute);
            setRoute('petEdit');
          },
        },
      ],
    );
  };

  useEffect(() => {
    let mounted = true;

    const loadPersistedState = async () => {
      try {
        const [
          profilesRaw,
          profilesUpdatedAtRaw,
          petListRaw,
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
          dataResetVersionRaw,
          weightHistoryResetVersionRaw,
          weightGoalsRaw,
          notificationReadMapRaw,
          notificationLastTriggeredRaw,
          notificationInboxRaw,
        ] = await Promise.all([
          getLocalItem(PET_PROFILES_STORAGE_KEY),
          getLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY),
          getLocalItem(PET_LIST_STORAGE_KEY),
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
          getLocalItem(DATA_RESET_VERSION_STORAGE_KEY),
          getLocalItem(WEIGHT_HISTORY_RESET_VERSION_STORAGE_KEY),
          getLocalItem(WEIGHT_GOALS_BY_PET_STORAGE_KEY),
          getLocalItem(NOTIFICATION_READ_MAP_STORAGE_KEY),
          getLocalItem(NOTIFICATION_LAST_TRIGGERED_STORAGE_KEY),
          getLocalItem(NOTIFICATION_INBOX_STORAGE_KEY),
        ]);

        if (weightGoalsRaw) {
          try { setWeightGoalsByPet(JSON.parse(weightGoalsRaw) as Record<string, number>); } catch { /* ignore */ }
        }

        if (notificationReadMapRaw) {
          try {
            const parsed = JSON.parse(notificationReadMapRaw) as Record<string, unknown>;
            const normalized: Record<string, boolean> = {};
            Object.keys(parsed ?? {}).forEach((key) => {
              if (parsed[key] === true) normalized[key] = true;
            });
            setNotificationReadById(normalized);
          } catch {
            setNotificationReadById({});
          }
        }

        if (notificationLastTriggeredRaw) {
          try {
            const parsed = JSON.parse(notificationLastTriggeredRaw) as Record<string, unknown>;
            const normalized: NotificationLastTriggeredByKey = {};
            Object.keys(parsed ?? {}).forEach((key) => {
              const value = parsed[key];
              if (typeof value === 'number' && Number.isFinite(value)) normalized[key] = value;
            });
            setNotificationLastTriggeredByKey(normalized);
          } catch {
            setNotificationLastTriggeredByKey({});
          }
        }

        if (notificationInboxRaw) {
          try {
            const parsed = JSON.parse(notificationInboxRaw) as unknown;
            if (Array.isArray(parsed)) {
              const normalized = parsed
                .filter((item): item is HealthNotification => {
                  if (!item || typeof item !== 'object') return false;
                  const value = item as Partial<HealthNotification>;
                  return (
                    typeof value.id === 'string'
                    && typeof value.petId === 'string'
                    && typeof value.type === 'string'
                    && typeof value.title === 'string'
                    && typeof value.message === 'string'
                    && typeof value.createdAt === 'string'
                    && typeof value.relatedEntityId === 'string'
                  );
                })
                .map((item) => ({
                  ...item,
                  priority: item.priority === 'high' || item.priority === 'medium' || item.priority === 'low' ? item.priority : 'medium',
                  isRead: item.isRead === true,
                }));
              setNotificationInbox(normalized);
            }
          } catch {
            setNotificationInbox([]);
          }
        }

        // Safety guard:
        // Never wipe existing user data on version mismatch.
        // Run clean-reset only for truly fresh installs (no local pet-related payload at all).
        const hasAnyLocalPetPayload = Boolean(
          (profilesRaw && profilesRaw.trim().length > 0)
          || (petListRaw && petListRaw.trim().length > 0)
          || (weightsRaw && weightsRaw.trim().length > 0)
          || (weightsUpdatedAtRaw && weightsUpdatedAtRaw.trim().length > 0)
          || (healthEventsRaw && healthEventsRaw.trim().length > 0)
          || (vetVisitsRaw && vetVisitsRaw.trim().length > 0)
          || (medicalEventsRaw && medicalEventsRaw.trim().length > 0)
          || (remindersRaw && remindersRaw.trim().length > 0)
          || (medicationCoursesRaw && medicationCoursesRaw.trim().length > 0)
          || (weightGoalsRaw && weightGoalsRaw.trim().length > 0)
          || (runtimeRaw && runtimeRaw.trim().length > 0)
          || (activeRaw && activeRaw.trim().length > 0)
          || (petLockRaw && petLockRaw.trim().length > 0),
        );
        const shouldApplyCleanReset =
          dataResetVersionRaw !== DATA_RESET_TARGET_VERSION
          && !hasAnyLocalPetPayload;
        if (shouldApplyCleanReset) {
          const clean = buildCleanState();
          if (!mounted) return;

          activePetRef.current = clean.activePetId;
          petLockRef.current = clean.petLockEnabled;
          setActivePetId(clean.activePetId);
          setPetLockEnabled(clean.petLockEnabled);
          setPetList(clean.petList);
          setRuntimeDebug('runtime: empty (clean reset)');

          setPetProfiles(clean.profiles);
          setPetProfilesUpdatedAt(clean.profilesUpdatedAt);
          setWeightsByPet(clean.weights);
          setWeightsUpdatedAt(clean.weightsUpdatedAt);
          setHealthEventsByPet(clean.healthEvents);
          setVetVisitsByPet(clean.vetVisits);
          setMedicalEventsByPet(clean.medicalEvents);
          setRemindersByPet(clean.reminders);
          setMedicationCoursesByPet(clean.medicationCourses);
          setNotificationReadById({});
          setNotificationInbox([]);
          setNotificationLastTriggeredByKey({});

          await Promise.all([
            setLocalItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(clean.profiles)),
            setLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY, JSON.stringify(clean.profilesUpdatedAt)),
            setLocalItem(PET_LIST_STORAGE_KEY, JSON.stringify(clean.petList)),
            setLocalItem(WEIGHTS_STORAGE_KEY, JSON.stringify(clean.weights)),
            setLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY, JSON.stringify(clean.weightsUpdatedAt)),
            setLocalItem(HEALTH_EVENTS_STORAGE_KEY, JSON.stringify(clean.healthEvents)),
            setLocalItem(VET_VISITS_BY_PET_STORAGE_KEY, JSON.stringify(clean.vetVisits)),
            setLocalItem(MEDICAL_EVENTS_BY_PET_STORAGE_KEY, JSON.stringify(clean.medicalEvents)),
            setLocalItem(REMINDERS_BY_PET_STORAGE_KEY, JSON.stringify(clean.reminders)),
            setLocalItem(MEDICATION_COURSES_BY_PET_STORAGE_KEY, JSON.stringify(clean.medicationCourses)),
            setLocalItem(NOTIFICATION_READ_MAP_STORAGE_KEY, JSON.stringify({})),
            setLocalItem(NOTIFICATION_LAST_TRIGGERED_STORAGE_KEY, JSON.stringify({})),
            setLocalItem(NOTIFICATION_INBOX_STORAGE_KEY, JSON.stringify([])),
            setLocalItem(ACTIVE_PET_STORAGE_KEY, clean.activePetId),
            setLocalItem(PET_LOCK_STORAGE_KEY, clean.petLockEnabled ? '1' : '0'),
            setLocalItem(
              RUNTIME_STATE_STORAGE_KEY,
              JSON.stringify({ activePetId: clean.activePetId, petLockEnabled: clean.petLockEnabled } satisfies RuntimeState),
            ),
            setLocalItem(DATA_RESET_VERSION_STORAGE_KEY, DATA_RESET_TARGET_VERSION),
          ]);

          return;
        }

        // Load profiles first (needed for petList migration)
        let localProfiles: Record<string, PetProfile> = {};
        if (profilesRaw) {
          try {
            localProfiles = normalizePetProfiles(JSON.parse(profilesRaw) as unknown);
          } catch {}
        }
        setPetProfiles(localProfiles);
        setLocalItem(PET_PROFILES_STORAGE_KEY, JSON.stringify(localProfiles)).catch(() => {});

        // Load/migrate petList
        let localPetList: string[] = [];
        if (petListRaw) {
          try {
            const parsed = JSON.parse(petListRaw) as unknown;
            if (Array.isArray(parsed)) {
              localPetList = (parsed as unknown[])
                .filter((id): id is string => typeof id === 'string' && id.length > 0 && !!localProfiles[id]);
            }
          } catch {}
        } else {
          // Migration: derive petList from existing profiles
          localPetList = Object.keys(localProfiles).filter((id) => {
            const p = localProfiles[id];
            return p && typeof p.name === 'string' && p.name.trim().length > 0;
          });
        }
        setPetList(localPetList);
        setLocalItem(PET_LIST_STORAGE_KEY, JSON.stringify(localPetList)).catch(() => {});

        // Determine activePetId
        let safeActivePet = '';
        let safePetLock = petLockRaw === '1' || petLockRaw === 'true';

        if (runtimeRaw) {
          try {
            const parsedRuntime = JSON.parse(runtimeRaw) as Partial<RuntimeState>;
            if (typeof parsedRuntime.activePetId === 'string' && typeof parsedRuntime.petLockEnabled === 'boolean') {
              safeActivePet = parsedRuntime.activePetId;
              safePetLock = parsedRuntime.petLockEnabled;
            }
          } catch {}
        }

        if (!safeActivePet && activeRaw && typeof activeRaw === 'string') {
          safeActivePet = activeRaw;
        }

        // Validate activePet is in list; fall back to first if not
        if (!safeActivePet || !localProfiles[safeActivePet]) {
          safeActivePet = localPetList[0] ?? '';
        }

        if (!mounted) return;

        activePetRef.current = safeActivePet;
        petLockRef.current = safePetLock;
        setActivePetId(safeActivePet);
        setPetLockEnabled(safePetLock);
        setRuntimeDebug(`runtime: ${safeActivePet}/${safePetLock ? 'lock-on' : 'lock-off'}`);
        persistRuntimeState(safeActivePet, safePetLock);

        const nowIso = new Date().toISOString();
        let localProfilesUpdatedAt: PerPetUpdatedAt = {};
        if (profilesUpdatedAtRaw) {
          try {
            localProfilesUpdatedAt = normalizeUpdatedAt(JSON.parse(profilesUpdatedAtRaw) as unknown);
          } catch {}
        }
        // Ensure all loaded pets have an updatedAt
        for (const petId of localPetList) {
          if (!localProfilesUpdatedAt[petId]) localProfilesUpdatedAt[petId] = nowIso;
        }
        setPetProfilesUpdatedAt(localProfilesUpdatedAt);
        setLocalItem(PET_PROFILES_UPDATED_AT_STORAGE_KEY, JSON.stringify(localProfilesUpdatedAt)).catch(() => {});

        let localWeights: Record<string, WeightPoint[]> = {};
        if (weightsRaw) {
          try {
            const parsedWeights = JSON.parse(weightsRaw) as unknown;
            if (parsedWeights && typeof parsedWeights === 'object') {
              const source = parsedWeights as Record<string, unknown>;
              for (const petId of Object.keys(source)) {
                if (Array.isArray(source[petId])) {
                  localWeights[petId] = (source[petId] as unknown[])
                    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
                    .map((item) => {
                      const rawDate = typeof item.date === 'string' ? item.date : '';
                      const parsedDateMs = new Date(rawDate).getTime();
                      const isoDate = Number.isFinite(parsedDateMs) ? new Date(parsedDateMs).toISOString() : rawDate;
                      const value = typeof item.value === 'number' && Number.isFinite(item.value) ? item.value : 0;
                      return {
                        label: typeof item.label === 'string' && item.label.trim().length > 0 ? item.label : formatShortLabel(new Date(), locale),
                        value,
                        date: isoDate,
                        change: typeof item.change === 'string' ? item.change : '',
                      } satisfies WeightPoint;
                    });
                }
              }
            }
          } catch {}
        }
        let localWeightsUpdatedAt: PerPetUpdatedAt = {};
        if (weightsUpdatedAtRaw) {
          try {
            localWeightsUpdatedAt = normalizeUpdatedAt(JSON.parse(weightsUpdatedAtRaw) as unknown);
          } catch {}
        }

        const shouldResetWeightHistory = weightHistoryResetVersionRaw !== WEIGHT_HISTORY_RESET_TARGET_VERSION;
        const miloPetIds = Object.entries(localProfiles)
          .filter(([, pet]) => pet?.name?.trim().toLowerCase() === 'milo')
          .map(([petId]) => petId);

        if (shouldResetWeightHistory && miloPetIds.length > 0) {
          const resetIso = new Date().toISOString();
          localWeights = { ...localWeights };
          localWeightsUpdatedAt = { ...localWeightsUpdatedAt };
          miloPetIds.forEach((petId) => {
            localWeights[petId] = [];
            localWeightsUpdatedAt[petId] = resetIso;
          });
          await setLocalItem(WEIGHT_HISTORY_RESET_VERSION_STORAGE_KEY, WEIGHT_HISTORY_RESET_TARGET_VERSION);
        }

        const hasWeightsNeedingClockBackfill = Object.keys(localWeights).some((petId) => (localWeights[petId] ?? []).length > 0 && !localWeightsUpdatedAt[petId]);
        if (hasWeightsNeedingClockBackfill) {
          Object.keys(localWeights).forEach((petId) => {
            if ((localWeights[petId] ?? []).length > 0 && !localWeightsUpdatedAt[petId]) {
              localWeightsUpdatedAt[petId] = nowIso;
            }
          });
        }

        setWeightsUpdatedAt(localWeightsUpdatedAt);
        setLocalItem(WEIGHTS_UPDATED_AT_STORAGE_KEY, JSON.stringify(localWeightsUpdatedAt)).catch(() => {});

        let localHealthEvents: Record<string, HealthEvent[]> = buildHealthEventsFromLegacyData(localProfiles, localWeights);
        if (healthEventsRaw) {
          try {
            const parsedHealthEvents = JSON.parse(healthEventsRaw) as unknown;
            const normalizedHealthEvents = normalizeHealthEvents(parsedHealthEvents);
            const hasEvents = Object.values(normalizedHealthEvents).some((arr) => arr.length > 0);
            localHealthEvents = hasEvents ? normalizedHealthEvents : localHealthEvents;
          } catch {}
        }

        if (shouldResetWeightHistory && miloPetIds.length > 0) {
          localHealthEvents = { ...localHealthEvents };
          miloPetIds.forEach((petId) => {
            localHealthEvents[petId] = (localHealthEvents[petId] ?? []).filter((event) => event.type !== 'weight');
          });
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

        let localMedicalEvents = EMPTY_MEDICAL_EVENTS_BY_PET;
        if (medicalEventsRaw) {
          try {
            localMedicalEvents = normalizeMedicalEventsByPet(JSON.parse(medicalEventsRaw) as unknown);
          } catch {
            localMedicalEvents = EMPTY_MEDICAL_EVENTS_BY_PET;
          }
        }

        const migratedCanonical = migrateLegacyHealthEventsToCanonical(
          localHealthEvents,
          localVetVisits,
          localMedicalEvents,
          localWeights,
        );
        localVetVisits = migratedCanonical.vetVisitsByPet;
        localMedicalEvents = migratedCanonical.medicalEventsByPet;
        localWeights = migratedCanonical.weightsByPet;

        if (__DEV__ && migratedCanonical.migratedCount > 0) {
          console.debug('[health-migration]', JSON.stringify({ migratedCount: migratedCanonical.migratedCount }));
        }

        setWeightsByPet(localWeights);
        setLocalItem(WEIGHTS_STORAGE_KEY, JSON.stringify(localWeights)).catch(() => {});

        setVetVisitsByPet(localVetVisits);
        setLocalItem(VET_VISITS_BY_PET_STORAGE_KEY, JSON.stringify(localVetVisits)).catch(() => {});
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
    setLocalItem(PET_LIST_STORAGE_KEY, JSON.stringify(petList)).catch(() => {});
  }, [petHydrated, petList]);

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
    setLocalItem(WEIGHT_GOALS_BY_PET_STORAGE_KEY, JSON.stringify(weightGoalsByPet)).catch(() => {});
  }, [petHydrated, weightGoalsByPet]);

  useEffect(() => {
    if (!petHydrated) return;
    // Persisted only for backward compatibility and fallback reads.
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
    setLocalItem(NOTIFICATION_READ_MAP_STORAGE_KEY, JSON.stringify(notificationReadById)).catch(() => {});
  }, [notificationReadById, petHydrated]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(NOTIFICATION_LAST_TRIGGERED_STORAGE_KEY, JSON.stringify(notificationLastTriggeredByKey)).catch(() => {});
  }, [notificationLastTriggeredByKey, petHydrated]);

  useEffect(() => {
    if (!petHydrated) return;
    setLocalItem(NOTIFICATION_INBOX_STORAGE_KEY, JSON.stringify(notificationInbox)).catch(() => {});
  }, [notificationInbox, petHydrated]);

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

      const remote = await fetchPetProfilesFromCloud();
      if (!mounted) return;

      if (remote) {
        setCloudMetadataReady(true);
        const nextProfiles: Record<string, PetProfile> = { ...petProfiles };
        const nextUpdatedAt: PerPetUpdatedAt = { ...petProfilesUpdatedAt };
        const nextCloudUpdatedAt: PerPetUpdatedAt = { ...cloudPetProfilesUpdatedAt, ...remote.updatedAt };

        const allCloudPetIds = Object.keys(remote.profiles);
        allCloudPetIds.forEach((petId) => {
          const cloudProfile = remote.profiles[petId];
          if (!cloudProfile) return;

          const localUpdatedAt = petProfilesUpdatedAt[petId];
          const cloudUpdatedAt = remote.updatedAt[petId];
          const localMs = parseUpdatedAtMs(localUpdatedAt);
          const cloudMs = parseUpdatedAtMs(cloudUpdatedAt);

          let winner: 'local' | 'cloud' = 'local';
          if (localMs == null && cloudMs != null) {
            winner = 'cloud';
          } else if (localMs != null && cloudMs != null) {
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
            const normalized = normalizePetProfiles({ [petId]: cloudProfile })[petId];
            if (normalized) {
              nextProfiles[petId] = normalized;
              nextUpdatedAt[petId] = cloudUpdatedAt ?? localUpdatedAt ?? new Date().toISOString();
            }
          }
        });

        const cloudOnlyPetIds = Object.keys(nextProfiles).filter((petId) => {
          const profile = nextProfiles[petId];
          return Boolean(profile && typeof profile.name === 'string' && profile.name.trim().length > 0);
        });
        const nextPetList = [
          ...petList.filter((petId) => cloudOnlyPetIds.includes(petId)),
          ...cloudOnlyPetIds.filter((petId) => !petList.includes(petId)),
        ];

        setPetProfiles(nextProfiles);
        setPetProfilesUpdatedAt(nextUpdatedAt);
        setCloudPetProfilesUpdatedAt(nextCloudUpdatedAt);
        setPetList(nextPetList);
        if (!nextPetList.includes(activePetRef.current)) {
          setActivePetWithPersist(nextPetList[0] ?? '');
        }
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

    const petIdsToUpload = Object.keys(petProfiles).filter((petId) => {
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

    savePetProfilesToCloud(petProfiles, petProfilesUpdatedAt, petIdsToUpload)
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
    let mounted = true;

    async function hydrateCloudHealthDomain() {
      if (!session?.user?.id || !petHydrated) {
        setHealthCloudMetadataReady(false);
        setHealthCloudHydrated(true);
        return;
      }

      const remote = await fetchHealthDomainFromCloud();
      if (!mounted) return;

      if (!remote) {
        setHealthCloudMetadataReady(false);
        setHealthCloudHydrated(true);
        return;
      }

      setHealthCloudMetadataReady(true);
      const cloudPetIds = Object.keys(remote.byPet);
      const cloudDomainClockByPet: HealthDomainClockByPet = {};
      const cloudMergeByPet: Record<string, Record<HealthDomainKey, boolean>> = {};

      cloudPetIds.forEach((petId) => {
        const cloudPayload = remote.byPet[petId];
        const cloudClock = getCloudDomainClock(cloudPayload);
        const localClock = getLocalDomainClockForPet({
          petId,
          vetVisitsByPet,
          medicalEventsByPet,
          remindersByPet,
          medicationCoursesByPet,
          weightsByPet,
          weightsUpdatedAtByPet: weightsUpdatedAt,
        });

        cloudDomainClockByPet[petId] = cloudClock;
        cloudMergeByPet[petId] = {
          vetVisits: cloudClock.vetVisitsUpdatedAt > localClock.vetVisitsUpdatedAt,
          medicalEvents: cloudClock.medicalEventsUpdatedAt > localClock.medicalEventsUpdatedAt,
          reminders: cloudClock.remindersUpdatedAt > localClock.remindersUpdatedAt,
          medicationCourses: cloudClock.medicationCoursesUpdatedAt > localClock.medicationCoursesUpdatedAt,
          weights: cloudClock.weightsUpdatedAt > localClock.weightsUpdatedAt,
        };
      });

      setCloudHealthDomainUpdatedAtByPet((prev) => ({ ...prev, ...cloudDomainClockByPet }));

      setVetVisitsByPet((prev) => {
        let changed = false;
        const next = { ...prev };
        cloudPetIds.forEach((petId) => {
          const cloudItems = remote.byPet[petId]?.vetVisits ?? [];
          if (cloudMergeByPet[petId]?.vetVisits) {
            next[petId] = mergeById(prev[petId] ?? [], cloudItems);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setMedicalEventsByPet((prev) => {
        let changed = false;
        const next = { ...prev };
        cloudPetIds.forEach((petId) => {
          const cloudItems = remote.byPet[petId]?.medicalEvents ?? [];
          if (cloudMergeByPet[petId]?.medicalEvents) {
            next[petId] = mergeById(prev[petId] ?? [], cloudItems);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setRemindersWithNotificationSync((prev) => {
        let changed = false;
        const next = { ...prev };
        cloudPetIds.forEach((petId) => {
          const cloudItems = remote.byPet[petId]?.reminders ?? [];
          if (cloudMergeByPet[petId]?.reminders) {
            next[petId] = mergeById(prev[petId] ?? [], cloudItems);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setMedicationCoursesByPet((prev) => {
        let changed = false;
        const next = { ...prev };
        cloudPetIds.forEach((petId) => {
          const cloudItems = remote.byPet[petId]?.medicationCourses ?? [];
          if (cloudMergeByPet[petId]?.medicationCourses) {
            next[petId] = mergeById(prev[petId] ?? [], cloudItems);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setWeightsByPet((prev) => {
        let changed = false;
        const next = { ...prev };
        cloudPetIds.forEach((petId) => {
          const cloudItems = remote.byPet[petId]?.weights ?? [];
          if (cloudMergeByPet[petId]?.weights) {
            next[petId] = mergeWeightsByDate(prev[petId] ?? [], cloudItems);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      if (__DEV__) {
        cloudPetIds.forEach((petId) => {
          console.debug('[health-sync:merge]', {
            petId,
            decisions: cloudMergeByPet[petId],
          });
        });
      }

      setWeightsUpdatedAt((prev) => {
        const next = { ...prev };
        cloudPetIds.forEach((petId) => {
          if (cloudMergeByPet[petId]?.weights) {
            next[petId] = remote.updatedAt[petId] ?? next[petId] ?? new Date().toISOString();
          } else if (!next[petId] && remote.updatedAt[petId]) {
            next[petId] = remote.updatedAt[petId];
          }
        });
        return next;
      });

      setHealthCloudHydrated(true);
    }

    hydrateCloudHealthDomain();
    return () => {
      mounted = false;
    };
  }, [petHydrated, session?.user?.id]);

  useEffect(() => {
    if (!petHydrated || !healthCloudHydrated || !healthCloudMetadataReady || !session?.user?.id) return;

    const allPetIds = Array.from(
      new Set([
        ...petList,
        ...Object.keys(vetVisitsByPet),
        ...Object.keys(medicalEventsByPet),
        ...Object.keys(remindersByPet),
        ...Object.keys(medicationCoursesByPet),
        ...Object.keys(weightsByPet),
      ]),
    );

    const nowMs = Date.now();
    const localDomainUpdatedAtByPet: HealthDomainClockByPet = {};
    allPetIds.forEach((petId) => {
      const previousFingerprints = healthDomainFingerprintsRef.current[petId];
      const previousClock = localHealthDomainUpdatedAtRef.current[petId] ?? emptyHealthDomainUpdatedAt();
      const derivedClock = getLocalDomainClockForPet({
        petId,
        vetVisitsByPet,
        medicalEventsByPet,
        remindersByPet,
        medicationCoursesByPet,
        weightsByPet,
      });

      const currentFingerprints: Record<HealthDomainKey, string> = {
        vetVisits: buildDomainFingerprint(vetVisitsByPet[petId] ?? []),
        medicalEvents: buildDomainFingerprint(medicalEventsByPet[petId] ?? []),
        reminders: buildDomainFingerprint(remindersByPet[petId] ?? []),
        medicationCourses: buildDomainFingerprint(medicationCoursesByPet[petId] ?? []),
        weights: buildDomainFingerprint(weightsByPet[petId] ?? []),
      };

      const nextClock: CloudHealthDomainUpdatedAt = {
        vetVisitsUpdatedAt:
          previousFingerprints == null
            ? derivedClock.vetVisitsUpdatedAt
            : currentFingerprints.vetVisits !== previousFingerprints.vetVisits
              ? Math.max(previousClock.vetVisitsUpdatedAt + 1, derivedClock.vetVisitsUpdatedAt, nowMs)
              : Math.max(previousClock.vetVisitsUpdatedAt, derivedClock.vetVisitsUpdatedAt),
        medicalEventsUpdatedAt:
          previousFingerprints == null
            ? derivedClock.medicalEventsUpdatedAt
            : currentFingerprints.medicalEvents !== previousFingerprints.medicalEvents
              ? Math.max(previousClock.medicalEventsUpdatedAt + 1, derivedClock.medicalEventsUpdatedAt, nowMs)
              : Math.max(previousClock.medicalEventsUpdatedAt, derivedClock.medicalEventsUpdatedAt),
        remindersUpdatedAt:
          previousFingerprints == null
            ? derivedClock.remindersUpdatedAt
            : currentFingerprints.reminders !== previousFingerprints.reminders
              ? Math.max(previousClock.remindersUpdatedAt + 1, derivedClock.remindersUpdatedAt, nowMs)
              : Math.max(previousClock.remindersUpdatedAt, derivedClock.remindersUpdatedAt),
        medicationCoursesUpdatedAt:
          previousFingerprints == null
            ? derivedClock.medicationCoursesUpdatedAt
            : currentFingerprints.medicationCourses !== previousFingerprints.medicationCourses
              ? Math.max(previousClock.medicationCoursesUpdatedAt + 1, derivedClock.medicationCoursesUpdatedAt, nowMs)
              : Math.max(previousClock.medicationCoursesUpdatedAt, derivedClock.medicationCoursesUpdatedAt),
        weightsUpdatedAt:
          previousFingerprints == null
            ? derivedClock.weightsUpdatedAt
            : currentFingerprints.weights !== previousFingerprints.weights
              ? Math.max(previousClock.weightsUpdatedAt + 1, derivedClock.weightsUpdatedAt, nowMs)
              : Math.max(previousClock.weightsUpdatedAt, derivedClock.weightsUpdatedAt),
      };

      healthDomainFingerprintsRef.current[petId] = currentFingerprints;
      localHealthDomainUpdatedAtRef.current[petId] = nextClock;
      localDomainUpdatedAtByPet[petId] = nextClock;
    });

    const petIdsToUpload = allPetIds.filter((petId) => {
      const localClock = localDomainUpdatedAtByPet[petId] ?? emptyHealthDomainUpdatedAt();
      const cloudClock = cloudHealthDomainUpdatedAtByPet[petId] ?? emptyHealthDomainUpdatedAt();
      return (
        localClock.vetVisitsUpdatedAt > cloudClock.vetVisitsUpdatedAt
        || localClock.medicalEventsUpdatedAt > cloudClock.medicalEventsUpdatedAt
        || localClock.remindersUpdatedAt > cloudClock.remindersUpdatedAt
        || localClock.medicationCoursesUpdatedAt > cloudClock.medicationCoursesUpdatedAt
        || localClock.weightsUpdatedAt > cloudClock.weightsUpdatedAt
      );
    });

    if (petIdsToUpload.length === 0) return;

    saveHealthDomainToCloud(petIdsToUpload, {
      vetVisitsByPet,
      medicalEventsByPet,
      remindersByPet,
      medicationCoursesByPet,
      weightsByPet,
      domainUpdatedAtByPet: localDomainUpdatedAtByPet,
    })
      .then((ok) => {
        if (!ok) return;
        setCloudHealthDomainUpdatedAtByPet((prev) => {
          const next: HealthDomainClockByPet = { ...prev };
          petIdsToUpload.forEach((petId) => {
            if (localDomainUpdatedAtByPet[petId]) next[petId] = localDomainUpdatedAtByPet[petId];
          });
          return next;
        });
      })
      .catch(() => {});
  }, [
    cloudHealthDomainUpdatedAtByPet,
    healthCloudHydrated,
    healthCloudMetadataReady,
    medicalEventsByPet,
    medicationCoursesByPet,
    petHydrated,
    petList,
    remindersByPet,
    session?.user?.id,
    weightsUpdatedAt,
    vetVisitsByPet,
    weightsByPet,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        persistRuntimeState(activePetRef.current, petLockRef.current);
      }
    });

    return () => sub.remove();
  }, [activePetId, petLockEnabled]);

  const {
    openSubRoute,
    openPetProfile,
    openWeightTracking,
    openPassport,
    openPremium,
    openDocuments,
    openNotifications,
    openVaccinations,
    openHealthRecords,
  } = useRouteActions({
    activePetId,
    setRoute,
    setSubBackRoute,
    setPetProfileBackRoute,
    setWeightBackRoute,
    setPassportBackRoute,
    setPremiumBackRoute,
    setDocumentsBackRoute,
    setNotificationsBackRoute,
    setVaccinationsBackRoute,
    setHealthRecordsBackRoute,
    setActivePetWithPersist,
  });

  const {
    openHealthHubWithCategory,
    openHealthHubCreate,
  } = useHealthHubActions({
    setPrimaryTab,
    setHealthHubInitialCategory,
    setHealthHubCategoryResetKey,
    setHealthHubCreatePreset,
    setRoute,
  });

  const { handleInsightAction } = useInsightActions({
    activePetId,
    route,
    setReminderCreateSubtypePreset,
    setReminderCreateNonce,
    setPrimaryTab,
    setRoute,
    openHealthHubCreateWithContext: (origin, type, category, successRoute) => {
      setHealthCreateFlowContext({ origin, successRoute: successRoute ?? origin });
      openHealthHubCreate(type, category);
    },
    onOpenVetVisitCreate: () => { setPrimaryAddSheetMode('vetVisit'); setPrimaryAddSheetOpen(true); },
    openWeightTracking,
  });

  type VetVisitOutcomeInput = {
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

  type VetVisitCreateInput = {
    petId: string;
    visitDate: string;
    reasonCategory: VetVisitReasonCategory;
    status: VetVisitStatus;
    clinicName?: string;
    vetName?: string;
    followUpDate?: string;
    followUpContext?: string;
    notes?: string;
    amount?: number;
    currency?: string;
    outcomes?: VetVisitOutcomeInput[];
  };

  const handleEditVetVisit = (visitItemId: string, payload: CreateVetVisitPayload) => {
    const rawId = visitItemId.startsWith('mvp-vet-') ? visitItemId.slice('mvp-vet-'.length) : visitItemId;
    const nowIso = new Date().toISOString();
    let updatedPetId: string | null = null;
    let updatedVisitId: string | null = null;
    setVetVisitsByPet((prev) => {
      const next = { ...prev };
      for (const petId of Object.keys(next)) {
        const visits = next[petId];
        if (!visits) continue;
        const idx = visits.findIndex((v) => v.id === rawId);
        if (idx === -1) continue;
        const existing = visits[idx];
        const updated: VetVisit = {
          ...existing,
          visitDate: payload.date,
          clinicName: payload.clinic ?? existing.clinicName,
          reasonCategory: payload.reason as VetVisitReasonCategory,
          status: (payload.status ?? existing.status) as VetVisitStatus,
          amount: payload.amount,
          currency: payload.currency,
          notes: payload.note ?? existing.notes,
          updatedAt: nowIso,
        };
        const updatedVisits = [...visits];
        updatedVisits[idx] = updated;
        next[petId] = updatedVisits;
        updatedPetId = petId;
        updatedVisitId = existing.id;
        break;
      }
      return next;
    });

    if (updatedPetId && updatedVisitId && Array.isArray(payload.attachments)) {
      const normalizedAttachments = payload.attachments
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      setMedicalEventsByPet((prev) => {
        const petEvents = prev[updatedPetId!] ?? [];
        const eventsWithoutLinkedAttachments = petEvents.filter(
          (event) => !(event.vetVisitId === updatedVisitId && event.type === 'attachment'),
        );

        let next = { ...prev, [updatedPetId!]: eventsWithoutLinkedAttachments };
        normalizedAttachments.forEach((name) => {
          next = addMvpMedicalEvent(next, {
            petId: updatedPetId!,
            vetVisitId: updatedVisitId!,
            type: 'attachment',
            eventDate: payload.date,
            title: name,
            note: payload.note,
            metadataJson: { source: 'vet_visit_edit' },
          }).next;
        });
        return next;
      });
    }
    hap.medium();
  };

  const recordVetVisitWithOutcomes = (input: VetVisitCreateInput) => {
    hap.medium();
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
        followUpContext: input.followUpContext,
        notes: input.notes,
        amount: input.amount,
        currency: input.currency,
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
          status: 'pending',
          originType: 'system',
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

  const handleDeleteHealthRecord = (timelineItemId: string) => {
    hap.heavy();
    if (timelineItemId.startsWith('med-')) {
      const eventId = timelineItemId.slice(4);
      setMedicalEventsByPet((prev) => {
        const next: ByPet<MvpMedicalEvent> = {};
        for (const petId of Object.keys(prev)) {
          next[petId] = (prev[petId] ?? []).filter((e) => e.id !== eventId);
        }
        return next;
      });
    }
  };

  const handleAddHealthRecord = (payload: AddHealthRecordPayload) => {
    hap.medium();
    const eventDate = payload.date;
    const nowIso = new Date().toISOString();

    // Vet visit: create a proper VetVisit object instead of a bare MedicalEvent
    if (payload.visitReason) {
      const reasonTitleMap: Record<VetVisitReasonCategory, string> = {
        checkup: 'General Checkup',
        vaccine: 'Vaccination Visit',
        illness: 'Illness Visit',
        injury: 'Injury Visit',
        follow_up: 'Follow-up Visit',
        other: 'Vet Visit',
      };
      const visitStatus = (payload.visitStatus as VetVisitStatus) ?? 'completed';
      recordVetVisitWithOutcomes({
        petId: activePetId,
        visitDate: eventDate,
        reasonCategory: payload.visitReason as VetVisitReasonCategory,
        status: visitStatus,
        clinicName: payload.clinicName,
        vetName: payload.vetName,
        followUpDate: payload.dueDate,
        followUpContext: payload.followUpContext,
        notes: payload.note,
        amount: payload.fee,
        currency: payload.feeCurrency,
        outcomes: [
          {
            type: 'note',
            title: reasonTitleMap[payload.visitReason as VetVisitReasonCategory] ?? 'Vet Visit',
            eventDate,
            note: payload.note,
            subcategory: 'general_checkup',
            metadataJson: { source: 'add_record_sheet' },
          },
        ],
      });
      setPetProfilesUpdatedAt((prev) => ({ ...prev, [activePetId]: nowIso }));
      return;
    }

    // Vaccine administered at vet: create a VetVisit with vaccine outcome
    if (payload.type === 'vaccine' && payload.linkedToVetVisit) {
      recordVetVisitWithOutcomes({
        petId: activePetId,
        visitDate: eventDate,
        reasonCategory: 'vaccine',
        status: 'completed',
        clinicName: payload.clinicName,
        vetName: payload.vetName,
        outcomes: [
          {
            type: 'vaccine',
            title: payload.title,
            eventDate,
            subcategory: payload.title,
            dueDate: payload.dueDate,
            note: payload.batchNumber
              ? `${locale === 'tr' ? 'Seri No' : 'Lot'}: ${payload.batchNumber}${payload.note ? `\n${payload.note}` : ''}`
              : payload.note,
            metadataJson: {
              source: 'add_record_sheet',
              vaccineType: payload.title,
              batchNumber: payload.batchNumber,
            },
          },
        ],
      });
      // Also schedule booster reminder
      const boosterDate = new Date(eventDate);
      boosterDate.setFullYear(boosterDate.getFullYear() + 1);
      const boosterDateStr = boosterDate.toISOString().slice(0, 10);
      const boosterTitle = locale === 'tr'
        ? `${payload.title} - Hatırlatma`
        : `${payload.title} - Booster`;
      setRemindersWithNotificationSync((prev) =>
        createReminder(prev, {
          petId: activePetId,
          type: 'medical',
          subtype: 'vaccine',
          title: boosterTitle,
          frequency: 'once',
          scheduledAt: `${boosterDateStr}T09:00:00.000Z`,
          isActive: true,
          kind: 'vaccine_due',
          status: 'pending',
          originType: 'system',
          sourceType: 'medical_event',
          note: locale === 'tr' ? 'Aşı takviyesi' : 'Vaccine booster',
        }).next,
      );
      setPetProfilesUpdatedAt((prev) => ({ ...prev, [activePetId]: nowIso }));
      return;
    }

    // All other record types: create a MedicalEvent
    setMedicalEventsByPet((prev) =>
      addMvpMedicalEvent(prev, {
        petId: activePetId,
        type: payload.type,
        eventDate,
        title: payload.title,
        note: payload.note,
        subcategory: payload.status ?? payload.type,
        dueDate: payload.dueDate,
        valueNumber: payload.valueNumber,
        valueUnit: payload.valueUnit,
        metadataJson: {
          source: 'add_record_sheet',
          clinicName: payload.clinicName,
          vetName: payload.vetName,
          fee: payload.fee,
          feeCurrency: payload.feeCurrency,
          batchNumber: payload.batchNumber,
          status: payload.status,
        },
      }).next,
    );

    // Auto-create a booster reminder 1 year from vaccine date
    if (payload.type === 'vaccine') {
      const boosterDate = new Date(eventDate);
      boosterDate.setFullYear(boosterDate.getFullYear() + 1);
      const boosterDateStr = boosterDate.toISOString().slice(0, 10);
      const boosterTitle = locale === 'tr'
        ? `${payload.title} - Hatırlatma`
        : `${payload.title} - Booster`;
      setRemindersWithNotificationSync((prev) =>
        createReminder(prev, {
          petId: activePetId,
          type: 'medical',
          subtype: 'vaccine',
          title: boosterTitle,
          frequency: 'once',
          scheduledAt: `${boosterDateStr}T09:00:00.000Z`,
          isActive: true,
          kind: 'vaccine_due',
          status: 'pending',
          originType: 'system',
          sourceType: 'medical_event',
          note: locale === 'tr' ? 'Aşı takviyesi' : 'Vaccine booster',
        }).next,
      );
    }

    setPetProfilesUpdatedAt((prev) => ({ ...prev, [activePetId]: nowIso }));
  };

  const resolveHealthCreateSuccessRoute = (payload?: AddHealthRecordPayload): AppRoute => {
    if (!payload) return 'healthHub';
    if (payload.visitReason) return 'vetVisits';
    if (payload.type === 'vaccine' && payload.linkedToVetVisit) return 'vetVisits';
    return 'healthHub';
  };

  const buildHealthCreateToast = (targetRoute: AppRoute) => {
    if (locale === 'tr') {
      if (targetRoute === 'vetVisits') return 'Kayıt eklendi • Veteriner Ziyaretleri';
      return 'Kayıt eklendi';
    }
    if (targetRoute === 'vetVisits') return 'Saved • Vet Visits';
    return 'Saved';
  };

  const handleHealthHubCreateFlowClosed = (result: 'saved' | 'cancelled', payload?: AddHealthRecordPayload) => {
    if (result === 'saved') {
      const targetRoute = healthCreateFlowContext?.successRoute ?? resolveHealthCreateSuccessRoute(payload);
      showRouteToast(buildHealthCreateToast(targetRoute));
      setHealthCreateFlowContext(null);
      if (targetRoute === 'vetVisits') {
        setSubBackRoute('healthHub');
      }
      setRoute(targetRoute);
      return;
    }

    const cancelRoute = healthCreateFlowContext?.origin ?? 'healthHub';
    setHealthCreateFlowContext(null);
    setRoute(cancelRoute);
  };

  const vaccinationsBridge = useMemo(
    () => getVaccinesForUI(activePetId, medicalEventsByPet, healthEventsByPet, petProfiles[activePetId], locale),
    [activePetId, medicalEventsByPet, healthEventsByPet, petProfiles, locale],
  );

  // Latest vaccine from MVP medical events — overrides legacy pet.vaccinations for profile display
  const latestVaccineForProfile = useMemo((): { name: string; rawDate: string } | null => {
    const mvpVaccines = (medicalEventsByPet[activePetId] ?? [])
      .filter((e) => e.type === 'vaccine')
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    if (mvpVaccines.length > 0) {
      return { name: mvpVaccines[0].title, rawDate: mvpVaccines[0].eventDate };
    }
    return null;
  }, [activePetId, medicalEventsByPet]);
  const vetVisitsBridge = useMemo(
    () => getVetVisitsForUI(activePetId, vetVisitsByPet, medicalEventsByPet, healthEventsByPet, petProfiles[activePetId]),
    [activePetId, vetVisitsByPet, medicalEventsByPet, healthEventsByPet, petProfiles],
  );
  const healthRecordsForUI = useMemo(
    () => getHealthRecordsForUI(activePetId, medicalEventsByPet, healthEventsByPet, petProfiles[activePetId]),
    [activePetId, medicalEventsByPet, healthEventsByPet, petProfiles],
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
  const documentsVaultForActivePet = useMemo(
    () => getAllDocumentsForPet(activePetId, { vetVisitsByPet, medicalEventsByPet, weightsByPet }),
    [activePetId, medicalEventsByPet, vetVisitsByPet, weightsByPet],
  );
  const projectedHealthHubData = useMemo(
    () => projectHealthHubData({
      petId: activePetId,
      vetVisits: vetVisitsByPet[activePetId] ?? [],
      medicalEvents: medicalEventsByPet[activePetId] ?? [],
      weights: weightsByPet[activePetId] ?? [],
      documents: documentsVaultForActivePet,
    }),
    [activePetId, documentsVaultForActivePet, medicalEventsByPet, vetVisitsByPet, weightsByPet],
  );
  const documentsVaultPreview = useMemo(
    () => {
      const visitById = new Map(projectedHealthHubData.vet_visits.map((visit) => [visit.id, visit]));
      const vaccineById = new Map(projectedHealthHubData.vaccinations.map((item) => [item.id, item]));
      const recordById = new Map(projectedHealthHubData.health_records.map((item) => [item.id, item]));
      const formatShortDate = (raw?: string) => {
        const ms = raw ? parseUpdatedAtMs(raw) : null;
        if (ms == null) return null;
        return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
          month: 'short',
          day: 'numeric',
        }).format(new Date(ms));
      };
      const visitLabel = (visitId?: string) => {
        if (!visitId) return locale === 'tr' ? 'Veteriner ziyareti' : 'Vet Visit';
        const visit = visitById.get(visitId);
        if (!visit) return locale === 'tr' ? 'Veteriner ziyareti' : 'Vet Visit';
        return visit.clinic_name?.trim()
          ? `${locale === 'tr' ? 'Veteriner ziyareti' : 'Vet Visit'} · ${visit.clinic_name.trim()}`
          : (locale === 'tr' ? 'Veteriner ziyareti' : 'Vet Visit');
      };
      return projectedHealthHubData.documents.slice(0, 3).map((document) => {
        let relation = locale === 'tr' ? 'Saglik kaydina bagli' : 'Linked to health record';
        if (document.related_vaccine_id) {
          const vaccine = vaccineById.get(document.related_vaccine_id);
          relation = locale === 'tr'
            ? `Asi kaydina bagli${vaccine?.vaccine_name ? ` · ${vaccine.vaccine_name}` : ''}`
            : `Linked to vaccine${vaccine?.vaccine_name ? ` · ${vaccine.vaccine_name}` : ''}`;
        } else if (document.related_visit_id) {
          relation = locale === 'tr'
            ? `${visitLabel(document.related_visit_id)} ile bagli`
            : `Linked to ${visitLabel(document.related_visit_id)}`;
        } else if (document.related_record_id) {
          const record = recordById.get(document.related_record_id);
          relation = locale === 'tr'
            ? `Saglik kaydina bagli${record?.title ? ` · ${record.title}` : ''}`
            : `Linked to health record${record?.title ? ` · ${record.title}` : ''}`;
        }
        return {
          id: document.id,
          title: document.file_name,
          date: document.uploaded_at ?? document.taken_at ?? '',
          type: document.document_type,
          contextLine: [formatShortDate(document.uploaded_at ?? document.taken_at), relation].filter(Boolean).join(' · '),
        };
      });
    },
    [locale, projectedHealthHubData],
  );
  const handleExportPetPassportPdf = async (selection: PetPassportExportSelection) => {
    const data = buildPetHealthPassportData(
      activePetId,
      {
        petProfiles,
        vetVisitsByPet,
        medicalEventsByPet,
        remindersByPet,
        medicationCoursesByPet,
        weightsByPet,
        legacyHealthEventsByPet: healthEventsByPet,
      },
      locale,
    );

    if (!data) {
      Alert.alert(
        locale === 'tr' ? 'PDF olusturulamadi' : 'Could not create PDF',
        locale === 'tr' ? 'Bu evcil hayvan icin rapor verisi bulunamadi.' : 'No report data was found for this pet.',
      );
      return;
    }

    const result = await generatePetPassportPDF({
      data,
      locale,
      selection,
    });

    if (!result.ok) {
      const missingDependency = result.reason === 'missing_dependency';
      Alert.alert(
        locale === 'tr' ? 'PDF hazir degil' : 'PDF export unavailable',
        missingDependency
          ? (locale === 'tr'
            ? 'PDF export icin expo-print ve tercihen expo-sharing eklenmeli.'
            : 'Add expo-print and optionally expo-sharing to enable PDF export.')
          : result.message,
      );
      return;
    }

    if (!result.uri) {
      Alert.alert(
        locale === 'tr' ? 'PDF kaydedildi' : 'PDF saved',
        locale === 'tr' ? 'PDF olusturuldu.' : 'PDF has been generated.',
      );
    }
  };
  const {
    upcomingRemindersByPet,
    completedRemindersByPet,
    reminderBadgeCount,
    remindersTabGroups,
  } = useReminderSelectors({
    remindersByPet,
    petList,
    petProfiles,
    locale,
  });
  const aiInsights = useMemo(() => {
    const hasAnySignal =
      (weightsByPet[activePetId]?.length ?? 0) > 0
      || (vetVisitsByPet[activePetId]?.length ?? 0) > 0
      || ((remindersByPet[activePetId] ?? []).length > 0)
      || ((medicalEventsByPet[activePetId] ?? []).length > 0)
      || ((healthEventsByPet[activePetId] ?? []).length > 0);

    if (!hasAnySignal) return [];

    return buildAiInsights({
      locale,
      petName: petProfiles[activePetId]?.name ?? activePetId,
      weights: weightsByPet[activePetId] ?? [],
      vetVisits: vetVisitsByPet[activePetId] ?? [],
      vaccineCounts: vaccinationsBridge?.attentionCounts,
      vaccineNextUp: vaccinationsBridge?.nextUpData,
      reminders: remindersByPet[activePetId] ?? [],
    });
  }, [activePetId, healthEventsByPet, locale, medicalEventsByPet, petProfiles, remindersByPet, vaccinationsBridge?.attentionCounts, vaccinationsBridge?.nextUpData, vetVisitsByPet, weightsByPet]);

  const userAvatarUri = useMemo(() => {
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const raw = meta?.avatar_url;
    return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
  }, [session?.user?.user_metadata]);

  const userInitials = useMemo(() => {
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
    if (fullName.length > 0) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
      if (initials.trim().length > 0) return initials;
    }
    const email = session?.user?.email ?? '';
    const fallback = email.trim().slice(0, 2).toUpperCase();
    return fallback.length > 0 ? fallback : 'VP';
  }, [session?.user?.email, session?.user?.user_metadata]);

  const userDisplayName = useMemo(() => {
    const profileFullName = typeof profileNameRow?.full_name === 'string' ? profileNameRow.full_name.trim() : '';
    if (profileFullName.length > 0) return profileFullName;
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const fullName = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
    if (fullName.length > 0) return fullName;
    const email = (session?.user?.email ?? '').trim();
    if (email.length > 0) return email.split('@')[0];
    return undefined;
  }, [profileNameRow?.full_name, session?.user?.email, session?.user?.user_metadata]);

  const isPremium = useMemo(() => {
    if (__DEV__) return true; // TODO: remove before production
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    return meta?.is_premium === true;
  }, [session?.user?.user_metadata]);

  const PREMIUM_PET_LIMIT = 8;
  const FREE_PET_LIMIT = 1;
  const FREE_PET_TYPE_CHANGE_LIMIT = 2;
  const PREMIUM_PET_TYPE_CHANGE_LIMIT = 5;
  const canAddPet = isPremium ? petList.length < PREMIUM_PET_LIMIT : petList.length < FREE_PET_LIMIT;

  const addPet = (pet: PetProfile) => {
    const nowIso = new Date().toISOString();
    setPetProfilesWithPersist((prev) => ({ ...prev, [pet.id]: pet }));
    setPetProfilesUpdatedAt((prev) => ({ ...prev, [pet.id]: nowIso }));
    setPetList((prev) => {
      if (prev.includes(pet.id)) return prev;
      return [...prev, pet.id];
    });
  };

  const deletePet = (petId: string) => {
    hap.heavy();
    // Cancel any scheduled notifications for this pet's reminders
    const petReminders = remindersByPet[petId] ?? [];
    const reminderIdsForPet = new Set(petReminders.map((r) => r.id));
    petReminders.forEach((reminder) => {
      if (reminder.notificationId) {
        void cancelReminderNotification(reminder.notificationId);
      }
    });

    // Remove from all state collections
    setPetProfilesWithPersist((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setPetProfilesUpdatedAt((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setCloudPetProfilesUpdatedAt((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setPetList((prev) => prev.filter((id) => id !== petId));
    setWeightsByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setWeightsUpdatedAt((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setHealthEventsByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setVetVisitsByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setMedicalEventsByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setRemindersByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setMedicationCoursesByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setWeightGoalsByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    setCloudHealthDomainUpdatedAtByPet((prev) => {
      const next = { ...prev };
      delete next[petId];
      return next;
    });
    delete healthDomainFingerprintsRef.current[petId];
    setNotificationInbox((prev) => prev.filter((n) => n.petId !== petId));
    setNotificationLastTriggeredByKey((prev) => {
      const next: NotificationLastTriggeredByKey = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (key.startsWith(`missing_data:${petId}:`)) return;
        const isReminderKey = key.startsWith('reminder_due:') || key.startsWith('overdue:');
        if (isReminderKey) {
          const reminderId = key.split(':')[1] ?? '';
          if (reminderIdsForPet.has(reminderId)) return;
        }
        next[key] = value;
      });
      return next;
    });
    setNotificationReadById((prev) => {
      const next: Record<string, boolean> = {};
      Object.entries(prev).forEach(([notifId, isRead]) => {
        const isPetMissingData = notifId.startsWith(`notif-missing-`) && notifId.includes(`-${petId}-`);
        if (isPetMissingData) return;
        if (notifId.startsWith('notif-reminder-due-') || notifId.startsWith('notif-overdue-')) {
          const parts = notifId.split('-');
          const reminderId = parts.length > 3 ? parts.slice(3, -1).join('-') : '';
          if (reminderIdsForPet.has(reminderId)) return;
        }
        next[notifId] = isRead;
      });
      return next;
    });

    void Promise.all([
      deletePetProfilesFromCloud([petId]),
      deleteHealthDomainFromCloud([petId]),
    ]).catch(() => {});

    // If deleted pet was active, switch to next available
    if (activePetId === petId) {
      const remaining = petList.filter((id) => id !== petId);
      const nextPet = remaining[0] ?? '';
      setActivePetWithPersist(nextPet);
    }
  };

  const handleCompleteMedication = (id: string) => {
    setMedicationCoursesByPet((prev) => {
      const petCourses = prev[activePetId] ?? [];
      return {
        ...prev,
        [activePetId]: petCourses.map((c) =>
          c.id === id ? { ...c, status: 'completed' as const, updatedAt: new Date().toISOString() } : c,
        ),
      };
    });
  };

  const handleDeleteMedication = (id: string) => {
    setMedicationCoursesByPet((prev) => {
      const petCourses = prev[activePetId] ?? [];
      return {
        ...prev,
        [activePetId]: petCourses.filter((c) => c.id !== id),
      };
    });
  };

    const openAddPet = () => {
      if (!canAddPet) {
        Alert.alert(
          locale === 'tr' ? 'Limit doldu' : 'Limit reached',
          isPremium
            ? (locale === 'tr'
                ? `Premium planda en fazla ${PREMIUM_PET_LIMIT} pet ekleyebilirsin.`
                : `Premium plan allows up to ${PREMIUM_PET_LIMIT} pets.`)
            : (locale === 'tr'
                ? `Free planda yalnizca ${FREE_PET_LIMIT} pet ekleyebilirsin. Daha fazla pet icin Premium gerekli.`
                : `Free plan allows only ${FREE_PET_LIMIT} pet. Premium is required for more pets.`),
        );
        return;
      }
    const id = `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNewPetTemplate({
      id,
      name: '',
      petType: 'Dog',
      gender: 'male',
      breed: '',
      coatPattern: 'Solid',
      birthDate: '',
      ageYears: 0,
      microchip: '',
      image: '',
      vaccines: '',
      surgeries: '',
      vaccinations: [],
      surgeriesLog: [],
      allergiesLog: [],
      diabetesLog: [],
      routineCare: DEFAULT_ROUTINE_CARE,
      chronicConditions: { allergies: false, diabetes: false },
    });
    setRoute('addPet');
  };

  const refreshPetsFromCloud = React.useCallback(async () => {
    if (!session?.user?.id) return;

    const remote = await fetchPetProfilesFromCloud();
    if (!remote) return;

    setCloudMetadataReady(true);
    const nextProfiles: Record<string, PetProfile> = { ...petProfiles };
    const nextUpdatedAt: PerPetUpdatedAt = { ...petProfilesUpdatedAt };
    const nextCloudUpdatedAt: PerPetUpdatedAt = { ...cloudPetProfilesUpdatedAt, ...remote.updatedAt };

    const allCloudPetIds = Object.keys(remote.profiles);
    allCloudPetIds.forEach((petId) => {
      const cloudProfile = remote.profiles[petId];
      if (!cloudProfile) return;

      const localUpdatedAt = petProfilesUpdatedAt[petId];
      const cloudUpdatedAt = remote.updatedAt[petId];
      const localMs = parseUpdatedAtMs(localUpdatedAt);
      const cloudMs = parseUpdatedAtMs(cloudUpdatedAt);

      const winner =
        (localMs == null && cloudMs != null)
          || (localMs != null && cloudMs != null && cloudMs > localMs)
          ? 'cloud'
          : 'local';
      if (winner !== 'cloud') return;

      const normalized = normalizePetProfiles({ [petId]: cloudProfile })[petId];
      if (!normalized) return;
      nextProfiles[petId] = normalized;
      nextUpdatedAt[petId] = cloudUpdatedAt ?? localUpdatedAt ?? new Date().toISOString();
    });

    const cloudOnlyPetIds = Object.keys(nextProfiles).filter((petId) => {
      const profile = nextProfiles[petId];
      return Boolean(profile && typeof profile.name === 'string' && profile.name.trim().length > 0);
    });

    const nextPetList = [
      ...petList.filter((petId) => cloudOnlyPetIds.includes(petId)),
      ...cloudOnlyPetIds.filter((petId) => !petList.includes(petId)),
    ];

    setPetProfiles(nextProfiles);
    setPetProfilesUpdatedAt(nextUpdatedAt);
    setCloudPetProfilesUpdatedAt(nextCloudUpdatedAt);
    setPetList(nextPetList);
    if (!nextPetList.includes(activePetRef.current)) {
      setActivePetWithPersist(nextPetList[0] ?? '');
    }
  }, [
    cloudPetProfilesUpdatedAt,
    petList,
    petProfiles,
    petProfilesUpdatedAt,
    session?.user?.id,
  ]);

  const reminderSuggestions = useMemo<ReminderSuggestion[]>(() => {
    const result: ReminderSuggestion[] = [];

    // Active medication courses → medication reminder suggestions
    (medicationCoursesByPet[activePetId] ?? [])
      .filter((c) => c.status === 'active' || c.status === 'paused')
      .slice(0, 3)
      .forEach((c) => {
        result.push({
          id: `sug-med-${c.id}`,
          title: locale === 'tr' ? `${c.name} - Hatırlatma` : `${c.name} - Reminder`,
          subtype: 'medication',
          source: 'medication',
        });
      });

    // Last vet visit → follow-up suggestion
    const sortedVetVisits = [...(vetVisitsByPet[activePetId] ?? [])].sort(
      (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
    );
    if (sortedVetVisits.length > 0) {
      const last = sortedVetVisits[0]!;
      result.push({
        id: `sug-vet-${last.id}`,
        title: locale === 'tr'
          ? `${last.clinicName ?? 'Veteriner'} - Kontrol`
          : `${last.clinicName ?? 'Vet'} - Follow-up`,
        subtype: 'vet_visit',
        source: 'vet_visit',
      });
    }

    // Recent vaccines → booster suggestions
    (medicalEventsByPet[activePetId] ?? [])
      .filter((e) => e.type === 'vaccine')
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      .slice(0, 2)
      .forEach((e) => {
        result.push({
          id: `sug-vac-${e.id}`,
          title: locale === 'tr' ? `${e.title} - Tekrar` : `${e.title} - Booster`,
          subtype: 'vaccine',
          source: 'vaccine',
        });
      });

    return result;
  }, [activePetId, medicationCoursesByPet, vetVisitsByPet, medicalEventsByPet, locale]);

  const triggeredNotificationCandidates = useMemo<HealthNotification[]>(
    () => buildTriggeredNotifications({
      petList,
      petProfiles,
      remindersByPet,
      vetVisitsByPet,
      medicalEventsByPet,
      weightsByPet,
      locale,
    }),
    [locale, medicalEventsByPet, petList, petProfiles, remindersByPet, vetVisitsByPet, weightsByPet],
  );

  useEffect(() => {
    if (!petHydrated) return;
    if (triggeredNotificationCandidates.length === 0) return;
    const nowMs = Date.now();
    const nextTriggeredAtByKey: NotificationLastTriggeredByKey = {};

    setNotificationInbox((prev) => {
      const next = [...prev];
      const indexById = new Map<string, number>();
      next.forEach((item, idx) => indexById.set(item.id, idx));
      let changed = false;

      triggeredNotificationCandidates.forEach((candidate) => {
        const existingIndex = indexById.get(candidate.id);
        if (typeof existingIndex === 'number') {
          const existing = next[existingIndex];
          const nextIsRead = existing.isRead || notificationReadById[candidate.id] === true;
          if (
            existing.title === candidate.title
            && existing.message === candidate.message
            && existing.createdAt === candidate.createdAt
            && existing.priority === candidate.priority
            && existing.isRead === nextIsRead
          ) {
            return;
          }
          next[existingIndex] = {
            ...candidate,
            isRead: nextIsRead,
          };
          changed = true;
          return;
        }

        if (shouldSuppressNotification(candidate, next, notificationLastTriggeredByKey, nowMs)) return;

        next.unshift({
          ...candidate,
          isRead: notificationReadById[candidate.id] === true,
        });
        nextTriggeredAtByKey[getNotificationDedupKey(candidate)] = nowMs;
        changed = true;
      });

      if (!changed) return prev;
      return next.slice(0, 300);
    });

    if (Object.keys(nextTriggeredAtByKey).length > 0) {
      setNotificationLastTriggeredByKey((prev) => ({ ...prev, ...nextTriggeredAtByKey }));
    }
  }, [
    notificationLastTriggeredByKey,
    notificationReadById,
    petHydrated,
    triggeredNotificationCandidates,
  ]);

  useEffect(() => {
    if (!petHydrated) return;
    setNotificationInbox((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const nextIsRead = item.isRead || notificationReadById[item.id] === true;
        if (nextIsRead === item.isRead) return item;
        changed = true;
        return { ...item, isRead: nextIsRead };
      });
      return changed ? next : prev;
    });
  }, [notificationReadById, petHydrated]);

  const triggeredNotifications = notificationInbox;
  const {
    markNotificationRead,
    handleNotificationDone,
    handleNotificationSnooze,
    handleNotificationOpen,
  } = useNotificationsViewModel({
    triggeredNotifications,
    remindersByPet,
    setNotificationReadById,
    setNotificationInbox,
    setRemindersWithNotificationSync,
    setActivePetWithPersist,
    onOpenVetVisitFollowup: () => openSubRoute('vetVisits', 'notifications'),
    onOpenHealthRecordFollowup: () => { setSubBackRoute('notifications'); setRoute('healthHub'); },
    onOpenWeightTracking: (petId) => openWeightTracking(petId, 'notifications'),
    onOpenVetVisitCreate: () => { setPrimaryAddSheetMode('vetVisit'); setPrimaryAddSheetOpen(true); },
    onOpenHealthRecordCreate: () => { setPrimaryAddSheetMode('record'); setPrimaryAddSheetOpen(true); },
    onOpenReminderFlow: () => {
      setPrimaryTab('reminders');
      setRoute('reminders');
    },
    onSnoozeFeedback: () => hap.light(),
  });

  const handleDeleteReminder = (id: string) => {
    hap.heavy();
    setRemindersWithNotificationSync((prev) => {
      const next: ByPet<Reminder> = {};
      for (const petId of Object.keys(prev)) {
        next[petId] = (prev[petId] ?? []).filter((r) => r.id !== id);
      }
      return next;
    });
  };

  const unifiedEventsForActivePet = useMemo(
    () =>
      buildUnifiedHealthEventsForPet(
        activePetId,
        medicalEventsByPet,
        vetVisitsByPet,
        weightsByPet,
        healthEventsByPet,
        petProfiles[activePetId],
      ),
    [activePetId, healthEventsByPet, medicalEventsByPet, petProfiles, vetVisitsByPet, weightsByPet],
  );

  const healthHubTimeline = useMemo(
    () =>
      buildHubTimelinePreview({
        events: unifiedEventsForActivePet,
        locale,
        limit: 60,
        formatDateLabel: formatReminderDateLabel,
      }),
    [locale, unifiedEventsForActivePet],
  );

  const healthHubSummary = useMemo(() => {
    const summary = summarizeUnifiedHealthEvents(unifiedEventsForActivePet);
    const latestWeight =
      summary.latestWeight && typeof summary.latestWeight.metadata?.value === 'number'
        ? `${(summary.latestWeight.metadata.value as number).toFixed(1)} kg`
        : locale === 'tr'
          ? 'Kayıt yok'
          : 'No data';
    const vaccineStatus = summary.latestVaccine?.title || (locale === 'tr' ? 'Kayıt yok' : 'No data');
    const lastVetVisit = summary.latestVet?.date ? formatReminderDateLabel(summary.latestVet.date, locale) : (locale === 'tr' ? 'Kayıt yok' : 'No data');

    // Expense totals from the same merged visit source used by Vet Visits UI.
    // Home card should reflect available records even if they originated from legacy/health-event bridge.
    const activeVisits = vetVisitsBridge ?? [];
    const expenseByCategory: Record<string, number> = {};
    let totalExpenseNum = 0;
    let primaryCurrency = 'TL';
    for (const v of activeVisits) {
      const status = v.status;
      if (status === 'planned' || status === 'canceled') continue;
      if (v.amount == null || v.amount <= 0) continue;
      totalExpenseNum += v.amount;
      if (v.currency) primaryCurrency = v.currency;
      const title = v.title?.toLocaleLowerCase('tr-TR') ?? '';
      const isVaccine = title.includes('vaccine') || title.includes('vaccin') || title.includes('asi') || title.includes('aşı');
      const cat = isVaccine ? 'vaccine' : 'vet';
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + v.amount;
    }

    const totalExpenses = totalExpenseNum > 0
      ? {
          total: totalExpenseNum,
          currency: primaryCurrency,
          breakdown: [
            ...(expenseByCategory['vaccine'] ? [{ label: locale === 'tr' ? 'Aşı' : 'Vaccine', amount: expenseByCategory['vaccine'], color: '#4a8a5a' }] : []),
            ...(expenseByCategory['vet'] ? [{ label: 'Vet', amount: expenseByCategory['vet'], color: '#7a9a6a' }] : []),
          ],
        }
      : undefined;

    return { latestWeight, vaccineStatus, lastVetVisit, totalExpenses };
  }, [activePetId, locale, unifiedEventsForActivePet, vetVisitsBridge]);

  const insightsBreedCard = useMemo(() => {
    const activePet = petProfiles[activePetId];
    if (!activePet?.breed) return undefined;

    const entry = getBreedHealthEntry(activePet.breed, activePet.petType, { useFallback: true });
    if (!entry) return undefined;

    const insight = generateBreedInsight({
      entry,
      timeline: healthHubTimeline,
      summary: healthHubSummary,
      weightGoal: weightGoalsByPet[activePetId],
      locale,
    });

    return {
      title: locale === 'tr' ? 'Irk İçgörüsü' : 'Breed Insight',
      breed: entry.breed,
      text: insight.text,
      meta: `${entry.weightRangeKg[0]}-${entry.weightRangeKg[1]} kg · ${entry.lifespanYears[0]}-${entry.lifespanYears[1]} ${locale === 'tr' ? 'yıl' : 'yrs'}`,
    };
  }, [activePetId, healthHubSummary, healthHubTimeline, locale, petProfiles, weightGoalsByPet]);

  const healthHubDomainOverview = useMemo<HealthHubDomainOverview>(() => {
    const nowMs = Date.now();
    const medical = medicalEventsByPet[activePetId] ?? [];
    const visits = vetVisitsByPet[activePetId] ?? [];
    const reminders = getRemindersByPet(remindersByPet, activePetId);
    const weightEntries = weightsByPet[activePetId] ?? [];

    const records = medical.filter((event) => event.type !== 'vaccine');
    const vaccines = medical.filter((event) => event.type === 'vaccine');
    const overdueVaccines = vaccines.filter((event) => {
      const dueMs = parseUpdatedAtMs(event.dueDate);
      return dueMs != null && dueMs < nowMs;
    }).length;
    const dueSoonVaccines = vaccines.filter((event) => {
      const dueMs = parseUpdatedAtMs(event.dueDate);
      return dueMs != null && dueMs >= nowMs && dueMs - nowMs <= 14 * 24 * 60 * 60 * 1000;
    }).length;

    const upcomingVisits = visits.filter((visit) => {
      const visitMs = parseUpdatedAtMs(visit.visitDate);
      return visit.status === 'planned' && visitMs != null && visitMs >= nowMs;
    }).length;
    const missedVisits = visits.filter((visit) => {
      const visitMs = parseUpdatedAtMs(visit.visitDate);
      return visit.status === 'planned' && visitMs != null && visitMs < nowMs;
    }).length;

    const medicalReminders = reminders.filter((item) => item.type === 'medical' && item.status !== 'done' && item.isActive).length;
    const careReminders = reminders.filter((item) => item.type === 'care' && item.status !== 'done' && item.isActive).length;

    const latestWeight = weightEntries[weightEntries.length - 1];
    const weightDays = daysSince(latestWeight?.date);

    const documentsCount = documentsVaultForActivePet.length;
    const latestDocument = documentsVaultForActivePet[0];
    const latestRecord = [...records]
      .sort((a, b) => (parseUpdatedAtMs(b.eventDate) ?? 0) - (parseUpdatedAtMs(a.eventDate) ?? 0))[0];
    const nextVisit = [...visits]
      .filter((visit) => visit.status === 'planned' && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) >= nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.visitDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.visitDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const latestVisit = [...visits]
      .filter((visit) => parseUpdatedAtMs(visit.visitDate) != null)
      .sort((a, b) => (parseUpdatedAtMs(b.visitDate) ?? 0) - (parseUpdatedAtMs(a.visitDate) ?? 0))[0];
    const nextVaccine = [...vaccines]
      .filter((event) => {
        const dueMs = parseUpdatedAtMs(event.dueDate);
        return dueMs != null && dueMs >= nowMs;
      })
      .sort((a, b) => (parseUpdatedAtMs(a.dueDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.dueDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const latestVaccine = [...vaccines]
      .filter((event) => parseUpdatedAtMs(event.eventDate ?? event.dueDate) != null)
      .sort((a, b) => (parseUpdatedAtMs(b.eventDate ?? b.dueDate) ?? 0) - (parseUpdatedAtMs(a.eventDate ?? a.dueDate) ?? 0))[0];

    const countText = (count: number) => {
      if (locale === 'tr') return `${count} kayıt`;
      return `${count} ${count === 1 ? 'record' : 'records'}`;
    };
    const statusNeedsAttention = 'Needs attention';
    const statusUpToDate = 'Up to date';
    const statusDueSoon = 'Due soon';
    const statusNoData = 'No data';
    const labelLastEntry = 'Last entry';
    const labelNextDue = 'Next due';
    const formatShortDate = (raw?: string | null) => {
      const ms = raw ? parseUpdatedAtMs(raw) : null;
      if (ms == null) return null;
      try {
        return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
          month: 'short',
          day: 'numeric',
        }).format(new Date(ms));
      } catch {
        return raw ?? null;
      }
    };
    const formatWeightValue = (value?: number | null) => {
      if (value == null || Number.isNaN(value)) return null;
      return `${value.toFixed(1)} kg`;
    };
    const formatVisitLabel = (visit?: VetVisit | null) => {
      if (!visit) return locale === 'tr' ? 'Ziyaret kaydı' : 'Visit record';
      if (visit.vetName?.trim()) return visit.vetName.trim();
      const reasonLabels: Record<VetVisitReasonCategory, string> = locale === 'tr'
        ? {
            checkup: 'Genel kontrol',
            vaccine: 'Aşı kaydı',
            illness: 'Hastalık',
            injury: 'Yaralanma',
            follow_up: 'Kontrol ziyareti',
            other: 'Ziyaret kaydı',
          }
        : {
            checkup: 'General checkup',
            vaccine: 'Vaccine record',
            illness: 'Illness visit',
            injury: 'Injury visit',
            follow_up: 'Follow-up visit',
            other: 'Visit record',
      };
      return reasonLabels[visit.reasonCategory] ?? (locale === 'tr' ? 'Ziyaret kaydı' : 'Visit record');
    };
    const formatVaccineLabel = (event?: MvpMedicalEvent | null) => {
      if (!event) return locale === 'tr' ? 'Aşı kaydı' : 'Vaccine record';
      if (event.title?.trim()) return event.title.trim();
      return locale === 'tr' ? 'Aşı kaydı' : 'Vaccine record';
    };
    const formatRecordLabel = (event?: MvpMedicalEvent | null) => {
      if (!event) return locale === 'tr' ? 'Sağlık kaydı' : 'Health record';
      if (event.title?.trim()) return event.title.trim();
      const fallbackByType: Partial<Record<MedicalEventType, string>> = locale === 'tr'
        ? {
            diagnosis: 'Tanı kaydı',
            procedure: 'Prosedür kaydı',
            test: 'Test kaydı',
            prescription: 'Reçete kaydı',
            note: 'Klinik not',
            attachment: 'Ek belge',
            other: 'Sağlık kaydı',
          }
        : {
            diagnosis: 'Diagnosis record',
            procedure: 'Procedure record',
            test: 'Test record',
            prescription: 'Prescription record',
            note: 'Clinical note',
            attachment: 'Attachment record',
            other: 'Health record',
          };
      return fallbackByType[event.type] ?? (locale === 'tr' ? 'Sağlık kaydı' : 'Health record');
    };
    const formatDocumentLabel = (document?: { title?: string | null } | null) => {
      if (!document) return locale === 'tr' ? 'Belge kaydı' : 'Document record';
      if (document.title?.trim()) return document.title.trim();
      return locale === 'tr' ? 'Belge kaydı' : 'Document record';
    };

    return {
      vet: {
        countText: countText(visits.length),
        statusText: visits.length === 0
          ? statusNoData
          : missedVisits > 0
            ? statusNeedsAttention
            : upcomingVisits > 0
            ? statusDueSoon
            : statusUpToDate,
        infoText: visits.length === 0
          ? statusNoData
          : nextVisit
            ? `${labelNextDue} · ${formatShortDate(nextVisit.visitDate) ?? '--'}`
            : latestVisit
              ? `${labelLastEntry} · ${formatVisitLabel(latestVisit)}${formatShortDate(latestVisit.visitDate) ? ` • ${formatShortDate(latestVisit.visitDate)}` : ''}`
              : statusNoData,
      },
      records: {
        countText: countText(records.length),
        statusText: records.length === 0
          ? statusNoData
          : records.some((event) => event.status === 'active' || event.status === 'abnormal')
            ? statusNeedsAttention
            : statusUpToDate,
        infoText: latestRecord
          ? `${labelLastEntry} · ${formatRecordLabel(latestRecord)}${formatShortDate(latestRecord.eventDate) ? ` • ${formatShortDate(latestRecord.eventDate)}` : ''}`
          : statusNoData,
      },
      vaccines: {
        countText: countText(vaccines.length),
        statusText: vaccines.length === 0
          ? statusNoData
          : (overdueVaccines > 0 || dueSoonVaccines > 0)
            ? statusDueSoon
            : statusUpToDate,
        infoText: vaccines.length === 0
          ? statusNoData
          : nextVaccine
            ? `${labelNextDue} · ${formatVaccineLabel(nextVaccine)}${formatShortDate(nextVaccine.dueDate) ? ` • ${formatShortDate(nextVaccine.dueDate)}` : ''}`
            : latestVaccine
              ? `${labelLastEntry} · ${formatVaccineLabel(latestVaccine)}${formatShortDate(latestVaccine.eventDate ?? latestVaccine.dueDate) ? ` • ${formatShortDate(latestVaccine.eventDate ?? latestVaccine.dueDate)}` : ''}`
              : statusUpToDate,
      },
      reminders: {
        countText: locale === 'tr'
          ? `${reminders.length} hatirlatici`
          : `${reminders.length} ${reminders.length === 1 ? 'reminder' : 'reminders'}`,
        statusText: locale === 'tr'
          ? `${medicalReminders} tıbbi · ${careReminders} bakım`
          : `${medicalReminders} medical · ${careReminders} care`,
        infoText: locale === 'tr' ? 'Bir sonraki aksiyonlar' : 'Next-step actions',
      },
      weight: {
        countText: countText(weightEntries.length),
        statusText: weightDays == null
          ? statusNoData
          : weightDays > 14
            ? statusDueSoon
            : statusUpToDate,
        infoText: weightDays == null
          ? statusNoData
          : `${labelLastEntry} · ${formatWeightValue(latestWeight?.value)}${formatShortDate(latestWeight?.date) ? ` • ${formatShortDate(latestWeight?.date)}` : ''}`,
      },
      documents: {
        countText: countText(documentsCount),
        statusText: latestDocument ? statusUpToDate : statusNoData,
        infoText: latestDocument
          ? `${labelLastEntry} · ${formatDocumentLabel(latestDocument)}${formatShortDate(latestDocument.date) ? ` • ${formatShortDate(latestDocument.date)}` : ''}`
          : statusNoData,
      },
    };
  }, [activePetId, documentsVaultForActivePet, locale, medicalEventsByPet, remindersByPet, vetVisitsByPet, weightsByPet]);

  const healthHubAreaCards = useMemo<HealthHubAreaCard[]>(() => {
    const nowMs = Date.now();
    const visits = vetVisitsByPet[activePetId] ?? [];
    const medical = medicalEventsByPet[activePetId] ?? [];
    const records = medical.filter((event) => event.type !== 'vaccine');
    const vaccines = medical.filter((event) => event.type === 'vaccine');
    const weights = weightsByPet[activePetId] ?? [];
    const latestDocument = documentsVaultForActivePet[0];

    const formatMonth = (raw?: string | null) => {
      const ms = raw ? parseUpdatedAtMs(raw) : null;
      if (ms == null) return locale === 'tr' ? 'Tarih yok' : 'No date';
      return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { month: 'long' }).format(new Date(ms));
    };
    const formatDay = (raw?: string | null) => {
      const ms = raw ? parseUpdatedAtMs(raw) : null;
      if (ms == null) return '--';
      return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric' }).format(new Date(ms));
    };
    const formatShortDate = (raw?: string | null) => {
      const ms = raw ? parseUpdatedAtMs(raw) : null;
      if (ms == null) return locale === 'tr' ? 'Tarih yok' : 'No date';
      return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(ms));
    };
    const countText = (count: number) => locale === 'tr'
      ? `${count} kayıt`
      : `${count} ${count === 1 ? 'record' : 'records'}`;
    const visitReason = (visit?: VetVisit) => {
      if (!visit) return locale === 'tr' ? 'Veteriner kaydı' : 'Vet record';
      const labels: Record<VetVisitReasonCategory, string> = locale === 'tr'
        ? {
            checkup: 'Genel kontrol',
            vaccine: 'Aşı randevusu',
            illness: 'Hastalık muayenesi',
            injury: 'Yaralanma kontrolü',
            follow_up: 'Kontrol ziyareti',
            other: 'Veteriner randevusu',
          }
        : {
            checkup: 'General checkup',
            vaccine: 'Vaccine appointment',
            illness: 'Illness visit',
            injury: 'Injury follow-up',
            follow_up: 'Follow-up visit',
            other: 'Vet appointment',
          };
      return labels[visit.reasonCategory] ?? (locale === 'tr' ? 'Veteriner randevusu' : 'Vet appointment');
    };
    const visitReasonShort = (visit?: VetVisit) => {
      if (!visit) return locale === 'tr' ? 'Veteriner' : 'Vet';
      const labels: Record<VetVisitReasonCategory, string> = locale === 'tr'
        ? {
            checkup: 'Kontrol',
            vaccine: 'Aşı',
            illness: 'Hastalık',
            injury: 'Yaralanma',
            follow_up: 'Takip',
            other: 'Veteriner',
          }
        : {
            checkup: 'Checkup',
            vaccine: 'Vaccine',
            illness: 'Illness',
            injury: 'Injury',
            follow_up: 'Follow-up',
            other: 'Vet',
          };
      return labels[visit.reasonCategory] ?? (locale === 'tr' ? 'Veteriner' : 'Vet');
    };
    const recordTypeLabel = (event?: MvpMedicalEvent) => {
      if (!event) return locale === 'tr' ? 'Sağlık kaydı' : 'Health record';
      if (event.type === 'diagnosis') return locale === 'tr' ? 'Teşhis' : 'Diagnosis';
      if (event.type === 'procedure') return locale === 'tr' ? 'Prosedür' : 'Procedure';
      if (event.type === 'test') return locale === 'tr' ? 'Lab sonucu' : 'Lab result';
      if (event.type === 'prescription') return locale === 'tr' ? 'Tedavi' : 'Treatment';
      return locale === 'tr' ? 'Klinik not' : 'Clinical note';
    };

    const nextVisit = [...visits]
      .filter((visit) => visit.status === 'planned' && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) >= nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.visitDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.visitDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const overdueVisit = [...visits]
      .filter((visit) => visit.status === 'planned' && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) < nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.visitDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.visitDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const latestVisit = [...visits]
      .filter((visit) => parseUpdatedAtMs(visit.visitDate) != null)
      .sort((a, b) => (parseUpdatedAtMs(b.visitDate) ?? 0) - (parseUpdatedAtMs(a.visitDate) ?? 0))[0];
    const nextVaccine = [...vaccines]
      .filter((event) => {
        const dueMs = parseUpdatedAtMs(event.dueDate);
        return dueMs != null && dueMs >= nowMs;
      })
      .sort((a, b) => (parseUpdatedAtMs(a.dueDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.dueDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const latestVaccine = [...vaccines]
      .filter((event) => parseUpdatedAtMs(event.eventDate ?? event.dueDate) != null)
      .sort((a, b) => (parseUpdatedAtMs(b.eventDate ?? b.dueDate) ?? 0) - (parseUpdatedAtMs(a.eventDate ?? a.dueDate) ?? 0))[0];
    const overdueVaccine = [...vaccines]
      .filter((event) => {
        const dueMs = parseUpdatedAtMs(event.dueDate);
        return dueMs != null && dueMs < nowMs;
      })
      .sort((a, b) => (parseUpdatedAtMs(a.dueDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.dueDate) ?? Number.MAX_SAFE_INTEGER))[0];
    const latestWeight = weights[weights.length - 1];
    const weightDays = daysSince(latestWeight?.date);
    const latestRecord = [...records]
      .sort((a, b) => (parseUpdatedAtMs(b.eventDate) ?? 0) - (parseUpdatedAtMs(a.eventDate) ?? 0))[0];
    const activeRecord = [...records]
      .filter((event) => event.status === 'active' || event.status === 'abnormal')
      .sort((a, b) => (parseUpdatedAtMs(b.eventDate) ?? 0) - (parseUpdatedAtMs(a.eventDate) ?? 0))[0];

    return [
      {
        key: 'vet',
        title: locale === 'tr' ? 'Veteriner Ziyaretleri' : 'Vet Visits',
        subtitle: '',
        countText: countText(visits.length),
        statusText: overdueVisit ? 'Needs attention' : (nextVisit ? 'Due soon' : (visits.length > 0 ? 'Up to date' : 'No data')),
        highlight: overdueVisit
          ? {
              kind: 'date',
              primary: formatDay(overdueVisit.visitDate),
              secondary: formatMonth(overdueVisit.visitDate),
              detail: `Needs attention · ${visitReasonShort(overdueVisit)}`,
              attention: true,
            }
          : nextVisit
          ? {
              kind: 'date',
              primary: formatDay(nextVisit.visitDate),
              secondary: formatMonth(nextVisit.visitDate),
              detail: `Next due · ${visitReasonShort(nextVisit)}`,
              attention: true,
            }
          : latestVisit
            ? {
                kind: 'date',
                primary: formatDay(latestVisit.visitDate),
                secondary: formatMonth(latestVisit.visitDate),
                detail: `Last entry · ${visitReasonShort(latestVisit)}`,
              }
            : {
                kind: 'text',
                primary: 'No data',
              },
      },
      {
        key: 'vaccines',
        title: locale === 'tr' ? 'Aşılar' : 'Vaccines',
        subtitle: '',
        countText: countText(vaccines.length),
        statusText: overdueVaccine ? 'Needs attention' : (nextVaccine ? 'Due soon' : (vaccines.length > 0 ? 'Up to date' : 'No data')),
        highlight: overdueVaccine
          ? {
              kind: 'date',
              primary: formatDay(overdueVaccine.dueDate),
              secondary: formatMonth(overdueVaccine.dueDate),
              detail: `Needs attention · ${overdueVaccine.title}`,
              attention: true,
            }
          : nextVaccine
          ? {
              kind: 'date',
              primary: formatDay(nextVaccine.dueDate),
              secondary: formatMonth(nextVaccine.dueDate),
              detail: `Next due · ${nextVaccine.title}`,
              attention: true,
            }
          : latestVaccine
            ? {
                kind: 'date',
                primary: formatDay(latestVaccine.eventDate ?? latestVaccine.dueDate),
                secondary: formatMonth(latestVaccine.eventDate ?? latestVaccine.dueDate),
                detail: `Last entry · ${latestVaccine.title}`,
              }
            : {
                kind: 'text',
                primary: 'No data',
              },
      },
      {
        key: 'weight',
        title: locale === 'tr' ? 'Ağırlık Profili' : 'Weight Profile',
        subtitle: '',
        countText: countText(weights.length),
        statusText: weightDays == null
          ? 'No data'
          : weightDays > 21
            ? 'Due soon'
            : 'Up to date',
        highlight: {
          kind: 'metric',
          label: 'Last entry',
          primary: latestWeight ? `${latestWeight.value.toFixed(1)} kg` : 'No data',
          secondary: latestWeight ? formatShortDate(latestWeight.date) : undefined,
          detail: weightDays != null && weightDays > 21
            ? `Next due · ${weightDays} days since last log`
            : undefined,
          attention: weightDays != null && weightDays > 21,
        },
      },
      {
        key: 'records',
        title: locale === 'tr' ? 'Sağlık Kayıtları' : 'Health Records',
        subtitle: '',
        countText: countText(records.length),
        statusText: records.length === 0 ? 'No data' : (activeRecord ? 'Needs attention' : 'Up to date'),
        highlight: {
          kind: 'text',
          label: 'Last entry',
          primary: (activeRecord ?? latestRecord)?.title ?? 'No data',
          secondary: (activeRecord ?? latestRecord) ? formatShortDate((activeRecord ?? latestRecord)?.eventDate) : undefined,
          detail: activeRecord ? 'Needs attention' : undefined,
          attention: !!activeRecord,
        },
      },
      {
        key: 'documents',
        title: locale === 'tr' ? 'Belgeler' : 'Documents',
        subtitle: '',
        countText: countText(documentsVaultForActivePet.length),
        statusText: latestDocument ? 'Up to date' : 'No data',
        highlight: {
          kind: 'text',
          label: 'Last entry',
          primary: latestDocument?.title ?? 'No data',
          secondary: latestDocument ? formatShortDate(latestDocument.date) : undefined,
          detail: documentsVaultPreview[0]?.contextLine,
        },
      },
    ];
  }, [activePetId, documentsVaultForActivePet, documentsVaultPreview, locale, medicalEventsByPet, vetVisitsByPet, weightsByPet]);

  const homeNextImportantEvent = useMemo<NextImportantEventItem | null>(() => {
    if (!activePetId) return null;
    const nowMs = Date.now();
    const petType = petProfiles[activePetId]?.petType;
    const medicalEvents = medicalEventsByPet[activePetId] ?? [];
    const reminders = getRemindersByPet(remindersByPet, activePetId).filter((item) =>
      isReminderSubtypeAllowedForPet(petType, item.subtype),
    );
    const vetVisits = vetVisitsByPet[activePetId] ?? [];
    const activeWeights = weightsByPet[activePetId] ?? [];

    const vaccineDueEvents = medicalEvents
      .filter((event) => event.type === 'vaccine' && typeof event.dueDate === 'string')
      .map((event) => ({ event, dueMs: parseUpdatedAtMs(event.dueDate) }))
      .filter((entry): entry is { event: MvpMedicalEvent; dueMs: number } => entry.dueMs != null);

    const overdueVaccine = [...vaccineDueEvents]
      .filter((entry) => entry.dueMs < nowMs)
      .sort((a, b) => a.dueMs - b.dueMs)[0];
    const dueSoonVaccine = [...vaccineDueEvents]
      .filter((entry) => entry.dueMs >= nowMs && entry.dueMs - nowMs <= 14 * 24 * 60 * 60 * 1000)
      .sort((a, b) => a.dueMs - b.dueMs)[0];

    const overduePlannedVisit = [...vetVisits]
      .filter((visit) => visit.status === 'planned' && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) < nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.visitDate) ?? 0) - (parseUpdatedAtMs(b.visitDate) ?? 0))[0];
    const upcomingPlannedVisit = [...vetVisits]
      .filter((visit) => visit.status === 'planned' && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) >= nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.visitDate) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.visitDate) ?? Number.MAX_SAFE_INTEGER))[0];

    const overdueMedicalReminder = [...reminders]
      .filter((item) => item.type === 'medical' && item.status !== 'done' && item.isActive && (parseUpdatedAtMs(item.scheduledAt) ?? Number.MAX_SAFE_INTEGER) < nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.scheduledAt) ?? 0) - (parseUpdatedAtMs(b.scheduledAt) ?? 0))[0];
    const overdueCareReminder = [...reminders]
      .filter((item) => item.type === 'care' && item.status !== 'done' && item.isActive && (parseUpdatedAtMs(item.scheduledAt) ?? Number.MAX_SAFE_INTEGER) < nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.scheduledAt) ?? 0) - (parseUpdatedAtMs(b.scheduledAt) ?? 0))[0];
    const overdueReminder = overdueMedicalReminder ?? overdueCareReminder;

    const upcomingMedicalReminder = [...reminders]
      .filter((item) => item.type === 'medical' && item.status !== 'done' && item.isActive && (parseUpdatedAtMs(item.scheduledAt) ?? Number.MAX_SAFE_INTEGER) >= nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.scheduledAt) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.scheduledAt) ?? Number.MAX_SAFE_INTEGER))[0];
    const upcomingCareReminder = [...reminders]
      .filter((item) => item.type === 'care' && item.status !== 'done' && item.isActive && (parseUpdatedAtMs(item.scheduledAt) ?? Number.MAX_SAFE_INTEGER) >= nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.scheduledAt) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.scheduledAt) ?? Number.MAX_SAFE_INTEGER))[0];
    const upcomingReminder = upcomingMedicalReminder ?? upcomingCareReminder;

    const baseReminderSnooze = (petId: string, reminderId: string, fromIso: string) => {
      const fromMs = parseUpdatedAtMs(fromIso) ?? nowMs;
      const nextIso = new Date(fromMs + 24 * 60 * 60 * 1000).toISOString();
      setRemindersWithNotificationSync((prev) => {
        const list = prev[petId] ?? [];
        const nextList = list.map((item) => {
          if (item.id !== reminderId) return item;
          const updated: Reminder = {
            ...item,
            scheduledAt: nextIso,
            dueDate: nextIso,
            status: 'pending' as const,
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
            isActive: true,
          };
          return updated;
        });
        return {
          ...prev,
          [petId]: nextList,
        };
      });
    };

    const markReminderDone = (petId: string, reminderId: string) => {
      hap.success();
      setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, petId, reminderId).next);
      successOverlayRef.current?.show();
    };

    const completedWithoutOutcomes = [...vetVisits]
      .filter((visit) => {
        if (visit.status !== 'completed') return false;
        return !medicalEvents.some((event) => event.vetVisitId === visit.id);
      })
      .sort((a, b) => (parseUpdatedAtMs(b.visitDate) ?? 0) - (parseUpdatedAtMs(a.visitDate) ?? 0))[0];

    const latestWeight = activeWeights[activeWeights.length - 1];
    const latestWeightMs = parseUpdatedAtMs(latestWeight?.date);
    const needsWeightNudge = latestWeightMs == null || nowMs - latestWeightMs > 21 * 24 * 60 * 60 * 1000;

    type Candidate = NextImportantEventItem & { priority: number; dateMs: number };
    const candidates: Candidate[] = [];

    if (overduePlannedVisit) {
      const dateLabel = formatReminderDateLabel(overduePlannedVisit.visitDate, locale);
      candidates.push({
        id: `visit-overdue-${overduePlannedVisit.id}`,
        kind: 'visit',
        title: locale === 'tr' ? 'Bu ziyaret gerçekleşti mi?' : 'Did this vet visit happen?',
        subtitle: locale === 'tr' ? `${dateLabel} · ziyaret kaydı bekliyor` : `${dateLabel} · outcome still missing`,
        date: dateLabel,
        urgent: true,
        ctaLabel: locale === 'tr' ? 'Ziyareti Aç' : 'Open Visit',
        onPress: () => openSubRoute('vetVisits', 'home'),
        secondaryCtaLabel: locale === 'tr' ? 'Sonuç Ekle' : 'Add Outcome',
        onSecondaryPress: () => openSubRoute('vetVisits', 'home'),
        priority: 1,
        dateMs: parseUpdatedAtMs(overduePlannedVisit.visitDate) ?? nowMs,
      });
    }

    if (overdueVaccine) {
      const dueLabel = formatReminderDateLabel(overdueVaccine.event.dueDate as string, locale);
      candidates.push({
        id: `vaccine-overdue-${overdueVaccine.event.id}`,
        kind: 'vaccine',
        title: locale === 'tr' ? `${overdueVaccine.event.title} gecikmiş` : `${overdueVaccine.event.title} is overdue`,
        subtitle: dueLabel,
        date: dueLabel,
        urgent: true,
        ctaLabel: locale === 'tr' ? 'Aşıyı Yönet' : 'Manage Vaccine',
        onPress: () => openVaccinations('healthHub' as AppRoute),
        priority: 2,
        dateMs: overdueVaccine.dueMs,
      });
    }

    if (overdueReminder) {
      const dateLabel = formatReminderDateLabel(overdueReminder.scheduledAt, locale);
      const isWeightGoalCheck = isWeightGoalCheckReminder(overdueReminder);
      candidates.push({
        id: `reminder-overdue-${overdueReminder.id}`,
        kind: 'reminder',
        title: isWeightGoalCheck
          ? (locale === 'tr' ? 'Kilo hedefini gözden geçir' : 'Review weight goal')
          : overdueReminder.title,
        subtitle: isWeightGoalCheck
          ? (locale === 'tr' ? 'Yeni ölçüm ekleyip hedefi yeniden değerlendir.' : 'Add a fresh measurement and review the target.')
          : (locale === 'tr' ? `${dateLabel} · gecikmiş` : `${dateLabel} · overdue`),
        date: dateLabel,
        urgent: true,
        ctaLabel: isWeightGoalCheck ? (locale === 'tr' ? 'Kilo Profilini Aç' : 'Open Weight Profile') : (locale === 'tr' ? 'Tamamla' : 'Mark Done'),
        onPress: () => {
          if (isWeightGoalCheck) {
            setWeightBackRoute('home');
            setRoute('weightTracking');
            return;
          }
          markReminderDone(activePetId, overdueReminder.id);
        },
        secondaryCtaLabel: isWeightGoalCheck ? undefined : (locale === 'tr' ? '1 Gün Ertele' : 'Snooze 1 Day'),
        onSecondaryPress: isWeightGoalCheck ? undefined : () => baseReminderSnooze(activePetId, overdueReminder.id, overdueReminder.scheduledAt),
        priority: 3,
        dateMs: parseUpdatedAtMs(overdueReminder.scheduledAt) ?? nowMs,
      });
    }

    if (dueSoonVaccine) {
      const dueLabel = formatReminderDateLabel(dueSoonVaccine.event.dueDate as string, locale);
      candidates.push({
        id: `vaccine-soon-${dueSoonVaccine.event.id}`,
        kind: 'vaccine',
        title: locale === 'tr' ? `${dueSoonVaccine.event.title} yaklaşıyor` : `${dueSoonVaccine.event.title} is due soon`,
        subtitle: dueLabel,
        date: dueLabel,
        ctaLabel: locale === 'tr' ? 'Aşı Planla' : 'Plan Vaccine',
        onPress: () => openVaccinations('healthHub' as AppRoute),
        priority: 4,
        dateMs: dueSoonVaccine.dueMs,
      });
    }

    if (upcomingPlannedVisit) {
      const dateLabel = formatReminderDateLabel(upcomingPlannedVisit.visitDate, locale);
      candidates.push({
        id: `visit-upcoming-${upcomingPlannedVisit.id}`,
        kind: 'visit',
        title: locale === 'tr' ? 'Yaklaşan veteriner ziyareti' : 'Upcoming vet visit',
        subtitle: dateLabel,
        date: dateLabel,
        ctaLabel: locale === 'tr' ? 'Ziyareti Gör' : 'View Visit',
        onPress: () => openSubRoute('vetVisits', 'home'),
        priority: 5,
        dateMs: parseUpdatedAtMs(upcomingPlannedVisit.visitDate) ?? nowMs,
      });
    }

    if (upcomingReminder) {
      const dateLabel = formatReminderDateLabel(upcomingReminder.scheduledAt, locale);
      const isWeightGoalCheck = isWeightGoalCheckReminder(upcomingReminder);
      candidates.push({
        id: `reminder-upcoming-${upcomingReminder.id}`,
        kind: 'reminder',
        title: isWeightGoalCheck
          ? (locale === 'tr' ? 'Yaklaşan kilo hedef kontrolü' : 'Upcoming weight goal review')
          : upcomingReminder.title,
        subtitle: isWeightGoalCheck
          ? (locale === 'tr' ? `${dateLabel} · ölçüm ekleyip hedefi karşılaştır` : `${dateLabel} · add a measurement and compare with the goal`)
          : dateLabel,
        date: dateLabel,
        ctaLabel: isWeightGoalCheck ? (locale === 'tr' ? 'Kilo Profilini Aç' : 'Open Weight Profile') : (locale === 'tr' ? '1 Gün Ertele' : 'Snooze 1 Day'),
        onPress: () => {
          if (isWeightGoalCheck) {
            setWeightBackRoute('home');
            setRoute('weightTracking');
            return;
          }
          baseReminderSnooze(activePetId, upcomingReminder.id, upcomingReminder.scheduledAt);
        },
        secondaryCtaLabel: locale === 'tr' ? 'Hatırlatmaları Aç' : 'Open Reminders',
        onSecondaryPress: () => {
          setPrimaryTab('reminders');
          setRoute('reminders');
        },
        priority: 6,
        dateMs: parseUpdatedAtMs(upcomingReminder.scheduledAt) ?? nowMs,
      });
    }

    if (completedWithoutOutcomes) {
      const dateLabel = formatReminderDateLabel(completedWithoutOutcomes.visitDate, locale);
      candidates.push({
        id: `visit-outcome-${completedWithoutOutcomes.id}`,
        kind: 'record',
        title: locale === 'tr' ? 'Bu ziyaretin sonuçlarını ekle' : 'Add outcomes for this visit',
        subtitle: dateLabel,
        date: dateLabel,
        ctaLabel: locale === 'tr' ? 'Sonuç Ekle' : 'Add Outcomes',
        onPress: () => openSubRoute('vetVisits', 'home'),
        priority: 7,
        dateMs: parseUpdatedAtMs(completedWithoutOutcomes.visitDate) ?? nowMs,
      });
    }

    if (needsWeightNudge) {
      candidates.push({
        id: 'weight-nudge',
        kind: 'weight',
        title: locale === 'tr' ? 'Kilo güncellemesi zamanı' : 'Time to log weight',
        subtitle: locale === 'tr' ? 'Trend analizi için yeni ölçüm ekleyin.' : 'Add a fresh entry for better trend analysis.',
        ctaLabel: locale === 'tr' ? 'Hızlı Ekle' : 'Quick Add',
        onPress: () => undefined,
        priority: 8,
        dateMs: nowMs,
      });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (a.priority - b.priority) || (a.dateMs - b.dateMs));
    const winner = candidates[0];
    const { priority, dateMs, ...result } = winner;
    void priority;
    void dateMs;
    return result;
  }, [activePetId, locale, medicalEventsByPet, openHealthHubWithCategory, openPetProfile, openSubRoute, petProfiles, remindersByPet, vetVisitsByPet, weightsByPet]);

  const homeHealthJourneyEvents = useMemo<HomeJourneyEventItem[]>(() => {
    if (!activePetId) return [];
    const nowMs = Date.now();
    const petType = petProfiles[activePetId]?.petType;
    const reminders = getRemindersByPet(remindersByPet, activePetId).filter((item) =>
      isReminderSubtypeAllowedForPet(petType, item.subtype),
    );
    const medicalEvents = medicalEventsByPet[activePetId] ?? [];
    const vetVisits = vetVisitsByPet[activePetId] ?? [];

    const unified = buildHomeTimelinePreview({
      events: unifiedEventsForActivePet,
      locale,
      limit: 12,
      formatDateLabel: formatReminderDateLabel,
    });

    const overduePlannedVisit = [...vetVisits]
      .filter((visit) => visit.status === 'planned' && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) < nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.visitDate) ?? 0) - (parseUpdatedAtMs(b.visitDate) ?? 0))[0];
    const overdueVaccine = [...medicalEvents]
      .filter((event) => event.type === 'vaccine' && typeof event.dueDate === 'string' && (parseUpdatedAtMs(event.dueDate) ?? Number.MAX_SAFE_INTEGER) < nowMs)
      .sort((a, b) => (parseUpdatedAtMs(a.dueDate) ?? 0) - (parseUpdatedAtMs(b.dueDate) ?? 0))[0];
    const upcomingMedicalReminder = [...reminders]
      .filter((item) => item.status !== 'done' && item.isActive && item.type === 'medical')
      .sort((a, b) => (parseUpdatedAtMs(a.scheduledAt) ?? Number.MAX_SAFE_INTEGER) - (parseUpdatedAtMs(b.scheduledAt) ?? Number.MAX_SAFE_INTEGER))[0];

    const overlays: HomeJourneyEventItem[] = [];
    if (overduePlannedVisit) {
      overlays.push({
        id: `journey-overdue-visit-${overduePlannedVisit.id}`,
        eventType: 'vet',
        title: locale === 'tr' ? 'Gerçekleşen ziyareti onayla' : 'Confirm missed vet visit',
        subtitle: locale === 'tr' ? 'Sonuç eklemeyi unutma' : 'Don’t forget to add outcomes',
        date: formatReminderDateLabel(overduePlannedVisit.visitDate, locale),
        urgent: true,
        actionLabel: locale === 'tr' ? 'Ziyarete Git' : 'Open Visit',
        onAction: () => openSubRoute('vetVisits', 'home'),
        sourceEventId: `visit-${overduePlannedVisit.id}`,
      });
    }
    if (overdueVaccine) {
      overlays.push({
        id: `journey-overdue-vaccine-${overdueVaccine.id}`,
        eventType: 'vaccine',
        title: locale === 'tr' ? `${overdueVaccine.title} gecikmiş` : `${overdueVaccine.title} overdue`,
        subtitle: locale === 'tr' ? 'Aşı takvimi güncellenmeli' : 'Vaccination schedule needs attention',
        date: formatReminderDateLabel(overdueVaccine.dueDate ?? overdueVaccine.eventDate, locale),
        urgent: true,
        actionLabel: locale === 'tr' ? 'Aşıları Aç' : 'Open Vaccines',
        onAction: () => openVaccinations('healthHub' as AppRoute),
        sourceEventId: `med-${overdueVaccine.id}`,
      });
    }
    if (upcomingMedicalReminder) {
      overlays.push({
        id: `journey-reminder-${upcomingMedicalReminder.id}`,
        eventType: 'reminder',
        title: upcomingMedicalReminder.title,
        date: formatReminderDateLabel(upcomingMedicalReminder.scheduledAt, locale),
        actionLabel: locale === 'tr' ? 'Hatırlatmalar' : 'Reminders',
        onAction: () => {
          setPrimaryTab('reminders');
          setRoute('reminders');
        },
        sourceEventId: `reminder-${upcomingMedicalReminder.id}`,
      });
    }

    return dedupeJourneyEventsBySource<HomeJourneyEventItem>([...overlays, ...unified], 4);
  }, [activePetId, locale, medicalEventsByPet, openSubRoute, remindersByPet, unifiedEventsForActivePet, vetVisitsByPet, weightsByPet]);


  const addWeightEntryForActivePet = (value: number, options?: { date?: string; note?: string }) => {
    hap.medium();
    const now = new Date();
    const selectedDateMs = options?.date ? new Date(options.date).getTime() : Number.NaN;
    const entryDate = Number.isFinite(selectedDateMs) ? new Date(selectedDateMs) : now;
    const rounded = Number(value.toFixed(1));
    const label = formatShortLabel(entryDate, locale);
    const date = entryDate.toISOString();
    const normalizeWeightSeries = (items: WeightPoint[]) =>
      [...items]
        .sort((a, b) => {
          const da = new Date(a.date).getTime();
          const db = new Date(b.date).getTime();
          const sa = Number.isFinite(da) ? da : Number.MAX_SAFE_INTEGER;
          const sb = Number.isFinite(db) ? db : Number.MAX_SAFE_INTEGER;
          return sa - sb;
        })
        .map((entry, idx, arr) => {
          const prevEntry = arr[idx - 1];
          const delta = prevEntry ? entry.value - prevEntry.value : 0;
          const change = Math.abs(delta) < 0.01 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
          return { ...entry, change };
        });

    setWeightsByPet((prev) => {
      const current = prev[activePetId] ?? [];
      const nowIso = now.toISOString();
      const nextEntry: WeightPoint = {
        label,
        value: rounded,
        date,
        change: 'Stable',
        note: options?.note?.trim() || undefined,
      };
      const normalized = normalizeWeightSeries([...current, nextEntry]);
      const nextWeights = {
        ...prev,
        [activePetId]: normalized,
      };
      const nextUpdatedAt = {
        ...weightsUpdatedAt,
        [activePetId]: nowIso,
      };
      persistWeightStateSnapshot(nextWeights, nextUpdatedAt);

      return nextWeights;
    });

    setWeightsUpdatedAt((prev) => {
      const nowIso = now.toISOString();
      return {
        ...prev,
        [activePetId]: nowIso,
      };
    });
  };

  const updateWeightEntryForActivePet = (
    sortedIndex: number,
    value: number,
    options?: { date?: string; note?: string },
  ) => {
    const now = new Date();
    const rounded = Number(value.toFixed(1));

    setWeightsByPet((prev) => {
      const current = prev[activePetId] ?? [];
      if (!current.length || sortedIndex < 0) return prev;

      const normalizeWeightSeries = (items: WeightPoint[]) =>
        [...items]
          .sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            const sa = Number.isFinite(da) ? da : Number.MAX_SAFE_INTEGER;
            const sb = Number.isFinite(db) ? db : Number.MAX_SAFE_INTEGER;
            return sa - sb;
          })
          .map((entry, idx, arr) => {
            const prevEntry = arr[idx - 1];
            const delta = prevEntry ? entry.value - prevEntry.value : 0;
            const change = Math.abs(delta) < 0.01 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
            return { ...entry, change };
          });

      const sorted = [...current].sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        const sa = Number.isFinite(da) ? da : Number.MAX_SAFE_INTEGER;
        const sb = Number.isFinite(db) ? db : Number.MAX_SAFE_INTEGER;
        return sa - sb;
      });

      if (sortedIndex >= sorted.length) return prev;

      const target = sorted[sortedIndex];
      const selectedDateMs = options?.date ? new Date(options.date).getTime() : Number.NaN;
      const nextDate = Number.isFinite(selectedDateMs) ? new Date(selectedDateMs).toISOString() : target.date;
      const nextLabel = formatShortLabel(new Date(nextDate), locale);
      const nextNote = options?.note?.trim() || undefined;

      const updated = sorted.map((entry, idx) =>
        idx === sortedIndex
          ? {
              ...entry,
              value: rounded,
              date: nextDate,
              label: nextLabel,
              note: nextNote,
            }
          : entry,
      );
      const normalized = normalizeWeightSeries(updated);
      const nowIso = now.toISOString();
      const nextWeights = {
        ...prev,
        [activePetId]: normalized,
      };
      const nextUpdatedAt = {
        ...weightsUpdatedAt,
        [activePetId]: nowIso,
      };
      persistWeightStateSnapshot(nextWeights, nextUpdatedAt);

      return nextWeights;
    });

    setWeightsUpdatedAt((prev) => {
      const nowIso = now.toISOString();
      return {
        ...prev,
        [activePetId]: nowIso,
      };
    });
  };

  const deleteWeightEntryForActivePet = (sortedIndex: number) => {
    hap.medium();
    const now = new Date();

    setWeightsByPet((prev) => {
      const current = prev[activePetId] ?? [];
      if (!current.length || sortedIndex < 0) return prev;

      const normalizeWeightSeries = (items: WeightPoint[]) =>
        [...items]
          .sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            const sa = Number.isFinite(da) ? da : Number.MAX_SAFE_INTEGER;
            const sb = Number.isFinite(db) ? db : Number.MAX_SAFE_INTEGER;
            return sa - sb;
          })
          .map((entry, idx, arr) => {
            const prevEntry = arr[idx - 1];
            const delta = prevEntry ? entry.value - prevEntry.value : 0;
            const change = Math.abs(delta) < 0.01 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
            return { ...entry, change };
          });

      const sorted = [...current].sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        const sa = Number.isFinite(da) ? da : Number.MAX_SAFE_INTEGER;
        const sb = Number.isFinite(db) ? db : Number.MAX_SAFE_INTEGER;
        return sa - sb;
      });

      if (sortedIndex >= sorted.length) return prev;

      const filtered = sorted.filter((_, idx) => idx !== sortedIndex);
      const normalized = normalizeWeightSeries(filtered);
      const nowIso = now.toISOString();
      const nextWeights = {
        ...prev,
        [activePetId]: normalized,
      };
      const nextUpdatedAt = {
        ...weightsUpdatedAt,
        [activePetId]: nowIso,
      };
      persistWeightStateSnapshot(nextWeights, nextUpdatedAt);

      return nextWeights;
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
          onOpenProfile={noop}
          topInsights={aiInsights.slice(0, 2)}
          onInsightAction={noop}
          onOpenPetProfile={noop}
          onOpenVaccinations={noop}
          onOpenHealthRecords={noop}
          onOpenVetVisits={noop}
          onOpenPetEdit={noop}
          onOpenPetPassport={noop}
          userAvatarUri={userAvatarUri}
          userInitials={userInitials}
          userName={userDisplayName}
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
          nextImportantEvent={homeNextImportantEvent}
          healthJourneyEvents={homeHealthJourneyEvents}
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
          onOpenPetProfiles={() => noop()}
          onOpenSettings={noop}
          onOpenPetPassport={noop}
          petProfiles={petProfiles}
          weightsByPet={weightsByPet}
          activePetId={activePetId}
        />
      );
    }

    if (target === 'pets') {
      return (
        <PetsScreen
          pets={Object.values(petProfiles).filter((pet) => pet?.name?.trim())}
          activePetId={activePetId}
          weightsByPet={weightsByPet}
          locale={locale}
          canAddPet={canAddPet}
          isPremiumPlan={isPremium}
          onBack={noop}
          onOpenPet={noop}
          onAddPet={noop}
        />
      );
    }

    if (target === 'petProfile') {
      const activePet = petProfiles[activePetId];
      if (!activePet) return <View style={styles.previewFallback} />;
      return (
        <PetDetailScreen
          pet={activePet}
          weightEntries={weightsByPet[activePetId]}
          weightGoal={weightGoalsByPet[activePetId]}
          vaccineCountOverride={vaccinationsBridge?.historyItems?.length}
          latestVaccineOverride={latestVaccineForProfile}
          locale={locale}
          onBack={noop}
          onOpenHealthHub={noop}
        />
      );
    }

    if (target === 'healthHub') {
      return (
        <HealthHubScreen
          summary={healthHubSummary}
          timeline={healthHubTimeline}
          domainOverview={healthHubDomainOverview}
          locale={locale}
          medicationCourses={medicationCoursesByPet[activePetId] ?? []}
          onPrimaryCta={noop}
          onAddRecord={noop}
          onDeleteRecord={noop}
          onOpenVetVisits={noop}
          onOpenHealthRecords={noop}
          onOpenVaccines={noop}
          onOpenWeightTracking={noop}
          onOpenDocuments={noop}
          onCompleteMedication={noop}
          onDeleteMedication={noop}
          petBreed={petProfiles[activePetId]?.breed}
          petType={petProfiles[activePetId]?.petType}
          petName={petProfiles[activePetId]?.name}
          petAvatarUri={petProfiles[activePetId]?.image || undefined}
          isPremium={isPremium}
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

    return <View style={styles.previewFallback} />;
  };

  const renderRouteToastOverlay = () => {
    if (!routeToastText) return null;
    return (
      <Animated.View pointerEvents="none" style={[styles.routeToastWrap, { opacity: routeToastOpacity }]}>
        <View style={styles.routeToastCapsule}>
          <Text style={styles.routeToastText}>{routeToastText}</Text>
        </View>
      </Animated.View>
    );
  };

  const resolveBackPreview = (target: AppRoute): ReactNode | undefined => {
    return renderBackPreview(target);
  };

  const renderAddRecordSheet = () => (
    <AddRecordSheet
      visible={primaryAddSheetOpen}
      mode={primaryAddSheetMode}
      locale={locale}
      onClose={closePrimaryAddSheet}
      onSave={(payload) => {
        handleAddHealthRecord(payload);
        closePrimaryAddSheet();
      }}
      onSelectWeight={() => {
        setWeightQuickAdd(true);
        openWeightTracking(activePetId, primaryAddSheetOrigin);
      }}
    />
  );

  const renderPrimaryChrome = (content: ReactNode) => (
    <View style={styles.primaryShell}>
      {content}

      <LensMagTabBar
        activeTab={primaryTab}
        locale={locale}
        onTabPress={(tab) => {
          const isRetap = tab === primaryTab;
          if (tab === 'healthHub') {
            setHealthHubCreatePreset((prev) => (prev ? { ...prev, openCreate: false } : null));
          }
          if (isRetap) {
            setTabScrollTopSignals((prev) => ({ ...prev, [tab]: prev[tab] + 1 }));
          }
          setPrimaryTab(tab);
          setRoute(tab);
        }}
      />

      <SuccessOverlay ref={successOverlayRef} />
      {renderRouteToastOverlay()}
      {renderAddRecordSheet()}
    </View>
  );
  if (loading || !petHydrated || !petLockHydrated || !onboardingHydrated) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2d2d2d" />
        {__DEV__ && runtimeDebug ? <Text style={styles.runtimeDebug}>{runtimeDebug}</Text> : null}
      </View>
    );
  }

  const allowDevOnboardingWithoutSession =
    __DEV__ && (route === 'onboarding' || route === 'onboardingPetCreate');

  if (!session && !allowDevOnboardingWithoutSession) {
    return (
      <LoginScreen
        onSignedIn={() => setRoute('home')}
        onTestOnboarding={__DEV__ ? () => setRoute('onboarding') : undefined}
      />
    );
  }

  if (route === 'onboarding') {
    return (
      <OnboardingScreen
        locale={locale}
        onAddPet={() => {
          openLightweightPetCreate('onboarding');
        }}
      />
    );
  }

  if (route === 'onboardingPetCreate') {
    return (
      <OnboardingPetCreateScreen
        locale={locale}
        onBack={() => {
          setRoute(petCreateOrigin === 'onboarding' ? 'onboarding' : 'pets');
        }}
        onSkip={() => {
          if (petCreateOrigin === 'onboarding') {
            completeOnboardingAndGoHome();
            return;
          }
          setRoute('pets');
        }}
        onContinue={({ name, breed, petType, birthDate }) => {
          const id = `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const createdPet: PetProfile = {
            id,
            name: name.trim(),
            petType,
            gender: 'male',
            breed: breed.trim(),
            coatPattern: 'Solid',
            birthDate: birthDate?.trim() ?? '',
            ageYears: 0,
            microchip: '',
            image: '',
            vaccines: '',
            surgeries: '',
            vaccinations: [],
            surgeriesLog: [],
            allergiesLog: [],
            diabetesLog: [],
            routineCare: DEFAULT_ROUTINE_CARE,
            chronicConditions: { allergies: false, diabetes: false },
          };
          addPet(createdPet);
          setActivePetWithPersist(createdPet.id);
          if (petCreateOrigin === 'onboarding') {
            completeOnboardingAndGoHome();
            setTimeout(() => {
              promptCompletePetProfile(createdPet, 'home');
            }, 220);
            return;
          }
          openPetProfile(createdPet.id, 'pets');
          setTimeout(() => {
            promptCompletePetProfile(createdPet, 'petProfile');
          }, 220);
        }}
      />
    );
  }

  if (route === 'profileEdit') {
    return <ProfileEditScreen onBack={() => setRoute('profile')} onSaved={() => setRoute('profile')} />;
  }

  if (route === 'vetVisits') {
    const vetVisitsScreenStatus: 'ready' | 'loading' | 'empty' = !petHydrated
      ? 'loading'
      : (vetVisitsBridge?.length ?? 0) > 0
        ? 'ready'
        : 'empty';
    return (
      <>
        <VetVisitsScreen
          onBack={() => { closePrimaryAddSheet(); setRoute(subBackRoute); }}
          backPreview={resolveBackPreview(subBackRoute)}
          isPremiumPlan={isPremium}
          status={vetVisitsScreenStatus}
          visits={vetVisitsBridge ?? undefined}
          onRefresh={refreshPetsFromCloud}
          onOpenDocuments={() => openDocuments('vetVisits')}
          onAddVisit={() => openPrimaryAddSheet('vetVisit')}
          onEditVisit={handleEditVetVisit}
        />
        {renderRouteToastOverlay()}
        {renderAddRecordSheet()}
      </>
    );
  }

  if (route === 'vaccinations') {
    return (
      <>
        <VaccinationsScreen
          onBack={() => { closePrimaryAddSheet(); setRoute(vaccinationsBackRoute); }}
          backPreview={resolveBackPreview(vaccinationsBackRoute)}
          historyItems={vaccinationsBridge?.historyItems}
          attentionCounts={vaccinationsBridge?.attentionCounts}
          nextUpData={vaccinationsBridge?.nextUpData}
          vetVisits={vetVisitsByPet[activePetId] ?? []}
          onAddVaccination={() => openPrimaryAddSheet('vaccine')}
        />
        {renderRouteToastOverlay()}
        {renderAddRecordSheet()}
      </>
    );
  }

  if (route === 'healthRecords') {
    return (
      <>
        <HealthRecordsScreen
          onBack={() => { closePrimaryAddSheet(); setRoute(healthRecordsBackRoute); }}
          backPreview={resolveBackPreview(healthRecordsBackRoute)}
          recordsData={healthRecordsForUI ?? undefined}
          records={healthHubTimeline.filter((t) => t.type === 'record')}
          onAddRecord={() => openPrimaryAddSheet('record')}
          onOpenVetVisitSource={() => openSubRoute('vetVisits', 'healthRecords' as AppRoute)}
          onDeleteRecord={handleDeleteHealthRecord}
        />
        {renderRouteToastOverlay()}
        {renderAddRecordSheet()}
      </>
    );
  }

  if (route === 'petProfile') {
    const activePet = petProfiles[activePetId];
    if (!activePet) return null;
    return renderPrimaryChrome(
      <PetDetailScreen
        pet={activePet}
        weightEntries={weightsByPet[activePetId]}
        weightGoal={weightGoalsByPet[activePetId]}
        vaccineCountOverride={vaccinationsBridge?.historyItems?.length}
        latestVaccineOverride={latestVaccineForProfile}
        locale={locale}
        onBack={() => setRoute(petProfileBackRoute)}
        onEdit={() => {
          setPetEditBackRoute('petProfile');
          setRoute('petEdit');
        }}
        onOpenWeightTracking={() => openWeightTracking(activePetId, 'petProfile')}
        onOpenVaccinations={() => openVaccinations('petProfile')}
        onOpenHealthRecords={() => openHealthRecords('petProfile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'petProfile')}
        onOpenHealthHub={() => openHealthHubWithCategory('all')}
      />,
    );
  }

  if (route === 'weightTracking' && petProfiles[activePetId]) {
    const activePet = petProfiles[activePetId];
    return (
      <>
        <WeightTrackingScreen
          onBack={() => { setWeightQuickAdd(false); setRoute(weightBackRoute); }}
          backPreview={resolveBackPreview(weightBackRoute)}
          initialShowAdd={weightQuickAdd}
          onOpenHealthRecords={() => openHealthRecords(weightBackRoute)}
          onOpenVetVisits={() => openSubRoute('vetVisits', weightBackRoute)}
          isPremium={isPremium}
          onUpgrade={() => openPremium(weightBackRoute)}
          petName={activePet.name}
          petType={activePet.petType}
          petBreed={activePet.breed}
          microchip={activePet.microchip}
          entries={weightsByPet[activePetId]}
          onAddEntry={addWeightEntryForActivePet}
          onUpdateEntry={updateWeightEntryForActivePet}
          onDeleteEntry={deleteWeightEntryForActivePet}
          weightGoal={weightGoalsByPet[activePetId]}
          onSetWeightGoal={(goal) => {
          setWeightGoalsByPet((prev) => ({ ...prev, [activePetId]: goal }));
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          setRemindersWithNotificationSync((prev) => {
            const next = {
              ...prev,
              [activePetId]: (prev[activePetId] ?? []).filter((item) => !isWeightGoalCheckReminder(item)),
            };
            return createReminder(next, {
              petId: activePetId,
              type: 'care',
              subtype: 'custom',
              title: locale === 'tr'
                ? `${activePet.name} için ${goal} kg hedef kilo kontrolü`
                : `${activePet.name} weight goal check — ${goal} kg`,
              scheduledAt: dueDate.toISOString(),
              frequency: 'once',
              isActive: true,
              kind: 'care_routine',
              status: 'pending',
              originType: 'manual',
              sourceType: 'manual',
            }).next;
          });
          }}
        />
        {renderRouteToastOverlay()}
      </>
    );
  }

  if (route === 'petEdit' && petProfiles[activePetId]) {
    return (
      <PetEditScreen
        key={activePetId}
        pet={petProfiles[activePetId]}
        onBack={() => setRoute(petEditBackRoute)}
        onSaved={(nextPet) => {
          hap.medium();
          const previousPet = petProfiles[nextPet.id];
          const petTypeChanged = previousPet?.petType != null && previousPet.petType !== nextPet.petType;
          const petTypeChangeLimit = isPremium ? PREMIUM_PET_TYPE_CHANGE_LIMIT : FREE_PET_TYPE_CHANGE_LIMIT;
          const currentPetTypeChangeCount = previousPet?.petTypeChangeCount ?? 0;

          if (petTypeChanged && currentPetTypeChangeCount >= petTypeChangeLimit) {
            Alert.alert(
              locale === 'tr' ? 'Tur degisimi siniri doldu' : 'Pet type change limit reached',
              isPremium
                ? (locale === 'tr'
                    ? `Premium planda bir hayvanin turunu en fazla ${PREMIUM_PET_TYPE_CHANGE_LIMIT} kez degistirebilirsin.`
                    : `Premium plan allows changing a pet type up to ${PREMIUM_PET_TYPE_CHANGE_LIMIT} times.`)
                : (locale === 'tr'
                    ? `Free planda bir hayvanin turunu en fazla ${FREE_PET_TYPE_CHANGE_LIMIT} kez degistirebilirsin.`
                    : `Free plan allows changing a pet type up to ${FREE_PET_TYPE_CHANGE_LIMIT} times.`),
            );
            return;
          }

          const nextPetWithTypeGuard: PetProfile = petTypeChanged
            ? {
                ...nextPet,
                petTypeChangeCount: currentPetTypeChangeCount + 1,
                petTypeChangeHistory: [
                  ...(previousPet?.petTypeChangeHistory ?? []),
                  {
                    from: previousPet.petType,
                    to: nextPet.petType,
                    changedAt: new Date().toISOString(),
                  },
                ],
              }
            : {
                ...nextPet,
                petTypeChangeCount: previousPet?.petTypeChangeCount ?? nextPet.petTypeChangeCount ?? 0,
                petTypeChangeHistory: previousPet?.petTypeChangeHistory ?? nextPet.petTypeChangeHistory ?? [],
              };

          const previousVaccinationSet = new Set((previousPet?.vaccinations ?? []).map((v) => `${v.name}|${v.date}`));
          const addedVaccinations = (nextPetWithTypeGuard.vaccinations ?? []).filter((v) => !previousVaccinationSet.has(`${v.name}|${v.date}`));

          const previousSurgerySet = new Set((previousPet?.surgeriesLog ?? []).map((s) => `${s.name}|${s.date}`));
          const addedSurgeries = (nextPetWithTypeGuard.surgeriesLog ?? []).filter((s) => !previousSurgerySet.has(`${s.name}|${s.date}`));

          const previousAllergySet = new Set((previousPet?.allergiesLog ?? []).map((a) => `${a.category}|${a.date}|${a.status}`));
          const addedAllergies = (nextPetWithTypeGuard.allergiesLog ?? []).filter((a) => !previousAllergySet.has(`${a.category}|${a.date}|${a.status}`));

          const previousDiabetesSet = new Set((previousPet?.diabetesLog ?? []).map((d) => `${d.type}|${d.date}|${d.status}`));
          const addedDiabetes = (nextPetWithTypeGuard.diabetesLog ?? []).filter((d) => !previousDiabetesSet.has(`${d.type}|${d.date}|${d.status}`));

          const nowIso = new Date().toISOString();
          const outcomes: VetVisitOutcomeInput[] = [
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

            recordVetVisitWithOutcomes({
              petId: nextPetWithTypeGuard.id,
              visitDate: latestDate,
              reasonCategory: 'follow_up',
              status: 'completed',
              notes: 'Generated from pet profile health updates',
              outcomes,
            });
          }

          setPetProfilesWithPersist((prev) => ({ ...prev, [nextPetWithTypeGuard.id]: nextPetWithTypeGuard }));
          setPetProfilesUpdatedAt((prev) => {
            return {
              ...prev,
              [nextPetWithTypeGuard.id]: nowIso,
            };
          });
          setRemindersWithNotificationSync((prev) => {
            let next = prev;
            next = syncRoutineCareReminderForPet(
              next,
              nextPetWithTypeGuard.id,
              'internalParasite',
              nextPetWithTypeGuard.routineCare.internalParasite,
              locale,
            );
            next = syncRoutineCareReminderForPet(
              next,
              nextPetWithTypeGuard.id,
              'externalParasite',
              nextPetWithTypeGuard.routineCare.externalParasite,
              locale,
            );
            return next;
          });
          setRoute(petEditBackRoute);
        }}
      />
    );
  }

  if (route === 'settings') {
    return <SettingsScreen onBack={() => setRoute('profile')} />;
  }

  if (route === 'addPet' && newPetTemplate) {
    return (
      <PetEditScreen
        key={newPetTemplate.id}
        pet={newPetTemplate}
        isNewPet
        onBack={() => setRoute('profile')}
        onSaved={() => setRoute('profile')}
        onCreated={(pet) => {
          hap.success();
          addPet(pet);
          setActivePetWithPersist(pet.id);
          openPetProfile(pet.id, 'profile');
        }}
      />
    );
  }

  if (route === 'passport' && petProfiles[activePetId]) {
    return (
      <PetHealthPassportScreen
        onBack={() => setRoute(passportBackRoute)}
        backPreview={renderBackPreview(passportBackRoute)}
        pet={petProfiles[activePetId]}
        weightEntries={weightsByPet[activePetId] ?? []}
        isPremiumPlan={isPremium}
        healthCardSummary={healthCardSummary}
        onOpenVaccinations={() => openVaccinations('healthHub' as AppRoute)}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'passport')}
        onOpenHealthRecords={() => openHealthRecords('healthHub' as AppRoute)}
        onOpenWeight={() => openPetProfile(activePetId, 'passport')}
        onOpenPremium={() => openPremium('passport')}
        onExportPdf={handleExportPetPassportPdf}
      />
    );
  }

  if (route === 'documents') {
    return (
      <DocumentsScreen
        onBack={() => setRoute(documentsBackRoute)}
        backPreview={resolveBackPreview(documentsBackRoute)}
        petName={petProfiles[activePetId]?.name ?? ''}
        documents={documentsVaultForActivePet}
        locale={locale}
      />
    );
  }

  if (route === 'notifications') {
    return (
      <NotificationCenterScreen
        onBack={() => setRoute(notificationsBackRoute)}
        notifications={triggeredNotifications}
        locale={locale}
        onMarkRead={markNotificationRead}
        onDone={handleNotificationDone}
        onSnooze={handleNotificationSnooze}
        onOpen={handleNotificationOpen}
      />
    );
  }

  if (route === 'healthHub') {
    return renderPrimaryChrome(
      <HealthHubScreen
        scrollToTopSignal={tabScrollTopSignals.healthHub}
        summary={healthHubSummary}
        timeline={healthHubTimeline}
        createPreset={healthHubCreatePreset}
        domainOverview={healthHubDomainOverview}
        areaCards={healthHubAreaCards}
        locale={locale}
        onPrimaryCta={() => { setPrimaryAddSheetMode('typeSelect'); setPrimaryAddSheetOpen(true); }}
        onAddRecord={handleAddHealthRecord}
        onCreateFlowClosed={handleHealthHubCreateFlowClosed}
        onDeleteRecord={handleDeleteHealthRecord}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'healthHub')}
        onOpenHealthRecords={() => openHealthRecords('healthHub' as AppRoute)}
        onOpenVaccines={() => openVaccinations('healthHub' as AppRoute)}
        onOpenWeightTracking={() => openWeightTracking(activePetId, 'healthHub')}
        onAddWeightEntry={() => { setWeightQuickAdd(true); openWeightTracking(activePetId, 'healthHub'); }}
        onOpenDocuments={() => openDocuments('healthHub')}
        documentsPreview={documentsVaultPreview}
        topInsights={aiInsights.slice(0, 2)}
        onOpenInsights={() => {
          setPrimaryTab('insights');
          setRoute('insights');
        }}
        medicationCourses={medicationCoursesByPet[activePetId] ?? []}
        onCompleteMedication={handleCompleteMedication}
        onDeleteMedication={handleDeleteMedication}
        weightGoal={weightGoalsByPet[activePetId]}
        petBreed={petProfiles[activePetId]?.breed}
        petType={petProfiles[activePetId]?.petType}
        petName={petProfiles[activePetId]?.name}
        petAvatarUri={petProfiles[activePetId]?.image || undefined}
        isPremium={isPremium}
        onUpgradePremium={() => openPremium('healthHub')}
        vaccineAttentionCounts={vaccinationsBridge?.attentionCounts}
        onOpenPassport={() => {
          setPassportBackRoute('healthHub');
          setRoute('passport');
        }}
      />,
    );
  }

  if (route === 'reminders') {
    return renderPrimaryChrome(
      <RemindersScreen
        scrollToTopSignal={tabScrollTopSignals.reminders}
        today={remindersTabGroups.today}
        upcoming={remindersTabGroups.upcoming}
        overdue={remindersTabGroups.overdue}
        completed={remindersTabGroups.completed}
        locale={locale}
        activePetId={activePetId}
        onOpenNotifications={() => openNotifications('reminders')}
        activePetType={petProfiles[activePetId]?.petType}
        openCreateNonce={reminderCreateNonce}
        subtypePreset={reminderCreateSubtypePreset ?? undefined}
        suggestions={reminderSuggestions}
        onDeleteReminder={handleDeleteReminder}
        onCreate={({ petId, subtype, title, date, frequency }) => {
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
              frequency: frequency ?? 'once',
              isActive: true,
              kind: subtype === 'vaccine' ? 'vaccine_due' : subtype === 'medication' ? 'medication' : subtype === 'vet_visit' ? 'medical_followup' : 'care_routine',
              status: 'pending',
              originType: 'manual',
              sourceType: 'manual',
            }).next,
          );
        }}
        onComplete={(id) => {
          const item = [...remindersTabGroups.today, ...remindersTabGroups.upcoming, ...remindersTabGroups.overdue].find((r) => r.id === id);
          if (!item) return;
          setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, item.petId, id).next);
        }}
        onSnooze={(id) => {
          const item = [...remindersTabGroups.today, ...remindersTabGroups.upcoming, ...remindersTabGroups.overdue].find((r) => r.id === id);
          if (!item) return;
          setRemindersWithNotificationSync((prev) => snoozeReminder(prev, item.petId, id, 24 * 60).next);
        }}
        onEdit={(id, payload) => {
          const item = [...remindersTabGroups.today, ...remindersTabGroups.upcoming, ...remindersTabGroups.overdue].find((r) => r.id === id);
          if (!item) return;
          const dueIso = new Date(`${payload.date}T12:00:00.000Z`).toISOString();
          setRemindersWithNotificationSync((prev) => updateReminder(prev, item.petId, id, {
            title: payload.title,
            dueDate: dueIso,
            subtype: payload.subtype,
          }).next);
        }}
      />,
    );
  }

  if (route === 'insights') {
    return renderPrimaryChrome(
      <InsightsScreen
        scrollToTopSignal={tabScrollTopSignals.insights}
        locale={locale}
        breedCard={insightsBreedCard}
        items={[
          {
            label: locale === 'tr' ? 'Son Ziyaret' : 'Last Visit',
            value: healthCardSummary.lastVisit?.title ?? (locale === 'tr' ? 'Son ziyaret yok' : 'No recent visit'),
            sub: healthCardSummary.lastVisit?.date ?? '',
          },
          {
            label: locale === 'tr' ? 'Aşılar' : 'Vaccines',
            value: String(healthCardSummary.vaccinesSummary.total),
            sub: healthCardSummary.vaccinesSummary.latest ?? (locale === 'tr' ? 'Aşı kaydı yok' : 'No vaccine log yet'),
          },
          {
            label: locale === 'tr' ? 'Aktif İlaçlar' : 'Active Meds',
            value: String(healthCardSummary.activeMedications.length),
            sub: healthCardSummary.activeMedications[0]?.name ?? (locale === 'tr' ? 'Yok' : 'None'),
          },
          {
            label: locale === 'tr' ? 'Uyarılar' : 'Alerts',
            value: String(healthCardSummary.alerts.length),
            sub: healthCardSummary.alerts[0] ?? (locale === 'tr' ? 'Her şey yolunda' : 'All clear'),
          },
        ]}
        insights={aiInsights}
        onInsightAction={handleInsightAction}
        onEmptyCta={() => openHealthHubCreate('diagnosis', 'record')}
      />,
    );
  }

  if (route === 'profile') {
    return renderPrimaryChrome(
      <ProfileScreen
        onSaveSuccess={() => setRoute('home')}
        onBackHome={() => setRoute('home')}
        onOpenPremium={() => openPremium('profile')}
        onOpenProfileEdit={() => setRoute('profileEdit')}
        onOpenPetProfiles={() => setRoute('pets')}
        onOpenNotifications={() => openNotifications('profile')}
        onOpenSettings={() => setRoute('settings')}
        onOpenPetPassport={() => openPassport(activePetId, 'profile')}
        petProfiles={petProfiles}
        weightsByPet={weightsByPet}
        activePetId={activePetId}
        isPremiumPlan={isPremium}
        withBottomNav
      />,
    );
  }

  if (route === 'pets') {
    return renderPrimaryChrome(
      <PetsScreen
        pets={Object.values(petProfiles).filter((pet) => pet?.name?.trim())}
        activePetId={activePetId}
        weightsByPet={weightsByPet}
        locale={locale}
        canAddPet={canAddPet}
        isPremiumPlan={isPremium}
        onBack={() => setRoute('profile')}
        onOpenProfile={() => setRoute('profile')}
        userAvatarUri={userAvatarUri}
        userName={userDisplayName}
        onOpenPet={(petId) => openPetProfile(petId, 'pets')}
        onAddPet={() => openLightweightPetCreate('pets')}
        onRefresh={refreshPetsFromCloud}
      />,
    );
  }

  if (route === 'premium') {
    return (
      <PremiumScreen
        onBack={() => setRoute(premiumBackRoute)}
        onUpgrade={() => {
          // TODO: integrate payment provider (RevenueCat / App Store IAP)
          Alert.alert('Coming Soon', 'Premium upgrade will be available soon.');
        }}
      />
    );
  }

  return renderPrimaryChrome(
    <HomeScreen
      scrollToTopSignal={tabScrollTopSignals.home}
      onOpenProfile={() => setRoute('profile')}
      onOpenReminders={() => {
        setPrimaryTab('reminders');
        setRoute('reminders');
      }}
      onOpenNotifications={() => openNotifications('home')}
      onOpenAddReminder={() => {
        setReminderCreateSubtypePreset(null);
        setReminderCreateNonce((prev) => prev + 1);
        setPrimaryTab('reminders');
        setRoute('reminders');
      }}
      reminderBadgeCount={reminderBadgeCount}
      topInsights={aiInsights.slice(0, 2)}
      onInsightAction={handleInsightAction}
      userAvatarUri={userAvatarUri}
      userInitials={userInitials}
      userName={userDisplayName}
      onOpenPetProfile={(petId) => openPetProfile(petId || activePetId, 'home')}
      onOpenVaccinations={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openVaccinations('healthHub' as AppRoute);
      }}
      onOpenHealthRecords={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openHealthRecords('healthHub' as AppRoute);
      }}
      onOpenVetVisits={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openSubRoute('vetVisits', 'home');
      }}
      onOpenPetEdit={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openPetProfile(petId || activePetId, 'home');
      }}
      onOpenPetPassport={(petId) => {
        openPassport(petId || activePetId, 'home');
      }}
      petProfiles={petProfiles}
      weightsByPet={weightsByPet}
      activePetId={activePetId}
      onChangeActivePet={(petId) => setActivePetWithPersist(petId)}
      petLockEnabled={petLockEnabled}
      onChangePetLockEnabled={(next) => setPetLockWithPersist(next)}
      upcomingRemindersByPet={upcomingRemindersByPet}
      completedRemindersByPet={completedRemindersByPet}
      onCompleteReminder={(petId, reminderId) => {
        setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, petId, reminderId).next);
      }}
      onAddCareReminder={(petId, subtype) => {
        const petType = petProfiles[petId]?.petType;
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
            petId,
            type: 'care',
            subtype,
            title: titleMap[subtype],
            scheduledAt,
            frequency: 'daily',
            isActive: true,
            kind: 'care_routine',
            status: 'pending',
            originType: 'manual',
            sourceType: 'manual',
          }).next,
        );
      }}
      onOpenWeightTracking={() => openWeightTracking(activePetId, 'home')}
      onQuickAddWeight={(value) => addWeightEntryForActivePet(value)}
      weightGoal={weightGoalsByPet[activePetId]}
      nextImportantEvent={homeNextImportantEvent}
      healthJourneyEvents={homeHealthJourneyEvents}
      onTestOnboarding={__DEV__ ? () => setRoute('onboarding') : undefined}
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
    paddingTop: 4,
    color: '#5f5f5f',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  menuSectionSub: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    color: '#8b8b8b',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
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
  routeToastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 104,
    alignItems: 'center',
    zIndex: 1200,
  },
  routeToastCapsule: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(33,35,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  routeToastText: {
    color: '#f6f4f0',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
