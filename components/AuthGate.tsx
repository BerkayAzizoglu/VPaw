import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { getLocalItem, setLocalItem } from '../lib/localStore';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen, { type JourneyEventItem as HomeJourneyEventItem, type NextImportantEventItem } from '../screens/HomeScreen';
import PremiumScreen from '../screens/PremiumScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import VaccinationsScreen from '../screens/VaccinationsScreen';
import WeightTrackingScreen from '../screens/WeightTrackingScreen';
import VetVisitsScreen, { type CreateVetVisitPayload, type VetVisitCreatePreset } from '../screens/VetVisitsScreen';
import PetEditScreen from '../screens/PetEditScreen';
import PetDetailScreen from '../screens/PetDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PetHealthPassportScreen from '../screens/PetHealthPassportScreen';
import PetProfilesScreen from '../screens/PetProfilesScreen';
import RemindersScreen, { type ReminderSuggestion } from '../screens/RemindersScreen';
import InsightsScreen from '../screens/InsightsScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import NotificationCenterScreen from '../screens/NotificationCenterScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import HealthHubScreen, {
  type AddHealthRecordPayload,
  type AddHealthRecordType,
  type HealthHubCategory,
  type HealthHubDomainOverview,
} from '../screens/HealthHubScreen';
import LensMagTabBar from './LensMagTabBar';
import SuccessOverlay, { type SuccessOverlayHandle } from './SuccessOverlay';
import { fetchPetProfilesFromCloud, savePetProfilesToCloud } from '../lib/petProfilesRepo';
import {
  isSameMedicalEvent,
  isSameVetVisit,
  isSameWeightEntry,
  mapLegacyHealthEventToMedicalType,
  toVetVisitReasonCategory,
  toVetVisitStatus,
  toWeightPointFromLegacyEvent,
} from '../lib/healthEventDedup';
import { getHealthCardSummary, getHealthRecordsForUI, getVaccinesForUI, getVetVisitsForUI } from '../lib/healthEventAdapters';
import { getAllDocumentsForPet } from '../lib/healthDocumentsVault';
import {
  buildTriggeredNotifications,
  getNotificationDedupKey,
  shouldSuppressNotification,
  type HealthNotification,
  type NotificationLastTriggeredByKey,
} from '../lib/notificationInbox';
import {
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
import { buildPetHealthPassportData, generatePetPassportPDF, type PetPassportExportSelection } from '../lib/petHealthPassportPdf';
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
  | 'addPet'
  | 'settings'
  | 'passport'
  | 'petProfiles'
  | 'documents'
  | 'notifications'
  | 'weightTracking';

type PrimaryTab = 'home' | 'healthHub' | 'reminders' | 'insights';
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
const NOTIFICATION_READ_MAP_STORAGE_KEY = 'vpaw_notification_read_map';
const NOTIFICATION_LAST_TRIGGERED_STORAGE_KEY = 'vpaw_notification_last_triggered_by_key';
const NOTIFICATION_INBOX_STORAGE_KEY = 'vpaw_notification_inbox';
const DATA_RESET_TARGET_VERSION = 'milo-clean-reset-2026-03-22';

type RuntimeState = {
  activePetId: string;
  petLockEnabled: boolean;
};

type PerPetUpdatedAt = Record<string, string>;
type HealthDomainClockByPet = Record<string, CloudHealthDomainUpdatedAt>;
type HealthDomainKey = 'vetVisits' | 'medicalEvents' | 'reminders' | 'medicationCourses' | 'weights';
type HealthDomainFingerprintsByPet = Record<string, Record<HealthDomainKey, string>>;
type ReminderListItem = {
  id: string;
  title: string;
  date: string;
  dueDate: string;
  petName?: string;
  petId: string;
  subtype?: ReminderSubtype;
  status?: 'pending' | 'done' | 'snoozed';
};

export type HealthEventType = 'vaccination' | 'vet_visit' | 'health_note' | 'weight' | 'other';

export type HealthEvent = {
  id: string;
  petId: string;
  type: HealthEventType;
  title: string;
  description?: string;
  date: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_ROUTINE_CARE: PetProfile['routineCare'] = {
  internalParasite: { enabled: false, lastDate: '', intervalDays: 30 },
  externalParasite: { enabled: false, lastDate: '', intervalDays: 30 },
};

function normalizePetProfiles(raw: unknown): Record<string, PetProfile> {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, Partial<PetProfile>>;
  const result: Record<string, PetProfile> = {};
  for (const [id, incoming] of Object.entries(source)) {
    if (!incoming || typeof incoming !== 'object') continue;
    if (typeof incoming.id !== 'string' || typeof incoming.name !== 'string') continue;
    result[id] = {
      id: incoming.id ?? id,
      name: incoming.name ?? '',
      petType: incoming.petType ?? 'Dog',
      gender: incoming.gender ?? 'male',
      breed: incoming.breed ?? '',
      coatPattern: incoming.coatPattern ?? 'Solid',
      birthDate: incoming.birthDate ?? '',
      ageYears: typeof incoming.ageYears === 'number' ? incoming.ageYears : 0,
      microchip: incoming.microchip ?? '',
      image: incoming.image ?? '',
      vaccines: incoming.vaccines ?? '',
      surgeries: incoming.surgeries ?? '',
      vaccinations: Array.isArray(incoming.vaccinations) ? incoming.vaccinations : [],
      surgeriesLog: Array.isArray(incoming.surgeriesLog) ? incoming.surgeriesLog : [],
      allergiesLog: Array.isArray(incoming.allergiesLog) ? incoming.allergiesLog : [],
      diabetesLog: Array.isArray(incoming.diabetesLog) ? incoming.diabetesLog : [],
      chronicConditions: {
        allergies: incoming.chronicConditions?.allergies ?? false,
        diabetes: incoming.chronicConditions?.diabetes ?? false,
      },
      routineCare: {
        internalParasite: {
          ...DEFAULT_ROUTINE_CARE.internalParasite,
          ...(incoming.routineCare?.internalParasite ?? {}),
        },
        externalParasite: {
          ...DEFAULT_ROUTINE_CARE.externalParasite,
          ...(incoming.routineCare?.externalParasite ?? {}),
        },
      },
    };
  }
  return result;
}


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

function daysSince(value: string | undefined) {
  const ms = parseUpdatedAtMs(value);
  if (ms == null) return null;
  const diff = Date.now() - ms;
  if (diff < 0) return 0;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function getLatestTimestampMs(values: Array<string | undefined>): number {
  let maxMs = Number.NaN;
  values.forEach((value) => {
    const ms = parseUpdatedAtMs(value);
    if (ms == null) return;
    if (!Number.isFinite(maxMs) || ms > maxMs) maxMs = ms;
  });
  return Number.isFinite(maxMs) ? maxMs : 0;
}

function normalizeDomainClockValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim().length > 0) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return Math.max(0, Math.floor(asNumber));
    const parsedDate = new Date(value).getTime();
    if (Number.isFinite(parsedDate)) return Math.max(0, Math.floor(parsedDate));
  }
  return 0;
}

function getCloudDomainClock(payload: CloudHealthPayload | undefined): CloudHealthDomainUpdatedAt {
  const empty = emptyHealthDomainUpdatedAt();
  if (!payload) return empty;
  return {
    vetVisitsUpdatedAt: normalizeDomainClockValue(payload.vetVisitsUpdatedAt),
    medicalEventsUpdatedAt: normalizeDomainClockValue(payload.medicalEventsUpdatedAt),
    remindersUpdatedAt: normalizeDomainClockValue(payload.remindersUpdatedAt),
    medicationCoursesUpdatedAt: normalizeDomainClockValue(payload.medicationCoursesUpdatedAt),
    weightsUpdatedAt: normalizeDomainClockValue(payload.weightsUpdatedAt),
  };
}

function buildDomainFingerprint(items: unknown[]): string {
  try {
    return JSON.stringify(items);
  } catch {
    return `len:${items.length}`;
  }
}

function getLocalDomainClockForPet(args: {
  petId: string;
  vetVisitsByPet: ByPet<VetVisit>;
  medicalEventsByPet: ByPet<MvpMedicalEvent>;
  remindersByPet: ByPet<Reminder>;
  medicationCoursesByPet: ByPet<MedicationCourse>;
  weightsByPet: Record<string, WeightPoint[]>;
}): CloudHealthDomainUpdatedAt {
  const { petId, vetVisitsByPet, medicalEventsByPet, remindersByPet, medicationCoursesByPet, weightsByPet } = args;
  return {
    vetVisitsUpdatedAt: getLatestTimestampMs((vetVisitsByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.visitDate])),
    medicalEventsUpdatedAt: getLatestTimestampMs((medicalEventsByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.eventDate, item.dueDate])),
    remindersUpdatedAt: getLatestTimestampMs((remindersByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.scheduledAt, item.completedAt])),
    medicationCoursesUpdatedAt: getLatestTimestampMs((medicationCoursesByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.startDate, item.endDate])),
    weightsUpdatedAt: getLatestTimestampMs((weightsByPet[petId] ?? []).map((item) => item.date)),
  };
}

function normalizeUpdatedAt(raw: unknown): PerPetUpdatedAt {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const next: PerPetUpdatedAt = {};
  for (const [key, val] of Object.entries(source)) {
    if (typeof val === 'string') next[key] = val;
  }
  return next;
}

function buildCleanState(): {
  petList: string[];
  profiles: Record<string, PetProfile>;
  weights: Record<string, WeightPoint[]>;
  healthEvents: Record<string, HealthEvent[]>;
  vetVisits: ByPet<VetVisit>;
  medicalEvents: ByPet<MvpMedicalEvent>;
  reminders: ByPet<Reminder>;
  medicationCourses: ByPet<MedicationCourse>;
  profilesUpdatedAt: PerPetUpdatedAt;
  weightsUpdatedAt: PerPetUpdatedAt;
  activePetId: string;
  petLockEnabled: boolean;
} {
  return {
    petList: [],
    profiles: {},
    weights: {},
    healthEvents: {},
    vetVisits: {},
    medicalEvents: {},
    reminders: {},
    medicationCourses: {},
    profilesUpdatedAt: {},
    weightsUpdatedAt: {},
    activePetId: '',
    petLockEnabled: false,
  };
}

function normalizeHealthEvents(raw: unknown): Record<string, HealthEvent[]> {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const result: Record<string, HealthEvent[]> = {};
  for (const petId of Object.keys(source)) {
    const value = source[petId];
    if (!Array.isArray(value)) continue;
    result[petId] = value
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
  }
  return result;
}

function buildHealthEventsFromLegacyData(profiles: Record<string, PetProfile>, weights: Record<string, WeightPoint[]>): Record<string, HealthEvent[]> {
  const nowIso = new Date().toISOString();

  const toEventsForPet = (petId: string): HealthEvent[] => {
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

  const result: Record<string, HealthEvent[]> = {};
  for (const petId of Object.keys(profiles)) {
    result[petId] = toEventsForPet(petId);
  }
  return result;
}

function migrateLegacyHealthEventsToCanonical(
  legacyHealthEventsByPet: Record<string, HealthEvent[]>,
  canonicalVetVisitsByPet: ByPet<VetVisit>,
  canonicalMedicalEventsByPet: ByPet<MvpMedicalEvent>,
  canonicalWeightsByPet: Record<string, WeightPoint[]>,
): {
  vetVisitsByPet: ByPet<VetVisit>;
  medicalEventsByPet: ByPet<MvpMedicalEvent>;
  weightsByPet: Record<string, WeightPoint[]>;
  migratedCount: number;
} {
  let nextVetVisitsByPet = canonicalVetVisitsByPet;
  let nextMedicalEventsByPet = canonicalMedicalEventsByPet;
  let nextWeightsByPet = canonicalWeightsByPet;
  let migratedCount = 0;

  for (const petId of Object.keys(legacyHealthEventsByPet)) {
    const legacyEvents = legacyHealthEventsByPet[petId] ?? [];
    const existingVisits = nextVetVisitsByPet[petId] ?? [];
    const existingMedicalEvents = nextMedicalEventsByPet[petId] ?? [];
    const existingWeights = nextWeightsByPet[petId] ?? [];

    const visitsToAdd = legacyEvents
      .filter((event) => event.type === 'vet_visit')
      .filter((event) => !existingVisits.some((visit) => isSameVetVisit(event, visit)))
      .map((event) => {
        const metadata = event.metadata ?? {};
        return {
          id: `legacy-visit-${event.id}`,
          petId,
          visitDate: event.date,
          reasonCategory: toVetVisitReasonCategory(metadata.reasonCategory),
          status: toVetVisitStatus(metadata.status),
          clinicName: typeof metadata.clinic === 'string' ? metadata.clinic : undefined,
          vetName: typeof metadata.doctor === 'string' ? metadata.doctor : undefined,
          followUpDate: typeof metadata.followUpDate === 'string' ? metadata.followUpDate : undefined,
          notes: event.description,
          amount: typeof metadata.amount === 'number' && metadata.amount > 0 ? metadata.amount : undefined,
          currency: typeof metadata.currency === 'string' ? metadata.currency : undefined,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        } satisfies VetVisit;
      });

    if (visitsToAdd.length > 0) {
      migratedCount += visitsToAdd.length;
      nextVetVisitsByPet = {
        ...nextVetVisitsByPet,
        [petId]: [...visitsToAdd, ...existingVisits].sort((a, b) => (parseUpdatedAtMs(b.visitDate) ?? 0) - (parseUpdatedAtMs(a.visitDate) ?? 0)),
      };
    }

    const medicalEventsToAdd = legacyEvents
      .filter((event) => event.type === 'vaccination' || event.type === 'health_note')
      .filter((event) => !existingMedicalEvents.some((medicalEvent) => isSameMedicalEvent(event, medicalEvent)))
      .map((event) => {
        const metadata = event.metadata ?? {};
        const subcategory = typeof metadata.category === 'string' ? metadata.category : undefined;
        const dueDate = typeof metadata.dueDate === 'string' ? metadata.dueDate : undefined;
        const status = typeof metadata.status === 'string' ? metadata.status : undefined;
        return {
          id: `legacy-med-${event.id}`,
          petId,
          type: mapLegacyHealthEventToMedicalType(event),
          eventDate: event.date,
          title: event.title,
          subcategory,
          status: status as MvpMedicalEvent['status'],
          dueDate,
          metadataJson: {
            ...metadata,
            legacyEventId: event.id,
            source: 'legacy_health_events_migration',
          },
          note: event.description,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        } satisfies MvpMedicalEvent;
      });

    if (medicalEventsToAdd.length > 0) {
      migratedCount += medicalEventsToAdd.length;
      nextMedicalEventsByPet = {
        ...nextMedicalEventsByPet,
        [petId]: [...medicalEventsToAdd, ...existingMedicalEvents].sort((a, b) => (parseUpdatedAtMs(b.eventDate) ?? 0) - (parseUpdatedAtMs(a.eventDate) ?? 0)),
      };
    }

    const weightsToAdd = legacyEvents
      .filter((event) => event.type === 'weight')
      .map((event) => toWeightPointFromLegacyEvent(event))
      .filter((entry): entry is WeightPoint => entry !== null)
      .filter((entry) => !existingWeights.some((weight) => isSameWeightEntry({
        id: `${petId}-${entry.date}-${entry.value}`,
        petId,
        type: 'weight',
        title: 'Weight Entry',
        description: entry.change,
        date: entry.date,
        metadata: { value: entry.value, label: entry.label },
        createdAt: entry.date,
        updatedAt: entry.date,
      }, weight)));

    if (weightsToAdd.length > 0) {
      migratedCount += weightsToAdd.length;
      nextWeightsByPet = {
        ...nextWeightsByPet,
        [petId]: [...existingWeights, ...weightsToAdd].sort((a, b) => (parseUpdatedAtMs(b.date) ?? 0) - (parseUpdatedAtMs(a.date) ?? 0)),
      };
    }
  }

  return {
    vetVisitsByPet: nextVetVisitsByPet,
    medicalEventsByPet: nextMedicalEventsByPet,
    weightsByPet: nextWeightsByPet,
    migratedCount,
  };
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
  const [healthHubCreatePreset, setHealthHubCreatePreset] = useState<{
    type: AddHealthRecordType;
    title?: string;
    note?: string;
    openCreate: boolean;
    nonce: number;
  } | null>(null);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [subBackRoute, setSubBackRoute] = useState<AppRoute>('home');
  const [petProfileBackRoute, setPetProfileBackRoute] = useState<AppRoute>('home');
  const [petEditBackRoute, setPetEditBackRoute] = useState<AppRoute>('home');
  const [passportBackRoute, setPassportBackRoute] = useState<AppRoute>('home');
  const [documentsBackRoute, setDocumentsBackRoute] = useState<AppRoute>('healthHub');
  const [notificationsBackRoute, setNotificationsBackRoute] = useState<AppRoute>('reminders');
  const [vetVisitCreatePreset, setVetVisitCreatePreset] = useState<VetVisitCreatePreset | null>(null);
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
  const successOverlayRef = useRef<SuccessOverlayHandle>(null);
  const activePetRef = useRef<string>('');
  const petLockRef = useRef(false);
  const reminderSyncInFlightRef = useRef(false);
  const queuedReminderSyncRef = useRef<ByPet<Reminder> | null>(null);
  const reminderBootstrapSyncDoneRef = useRef(false);
  const healthDomainFingerprintsRef = useRef<HealthDomainFingerprintsByPet>({});
  const localHealthDomainUpdatedAtRef = useRef<HealthDomainClockByPet>({});

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
    queuedReminderSyncRef.current = targetState;
    if (reminderSyncInFlightRef.current) return;

    reminderSyncInFlightRef.current = true;
    try {
      while (queuedReminderSyncRef.current) {
        const currentTarget = queuedReminderSyncRef.current;
        queuedReminderSyncRef.current = null;
        const petNames: Record<string, string> = {};
        for (const petId of Object.keys(petProfiles)) {
          petNames[petId] = petProfiles[petId]?.name || petId;
        }
        const synced = await reconcileReminderNotifications(
          currentTarget,
          petNames,
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
    if (route === 'home' || route === 'healthHub' || route === 'reminders' || route === 'insights') {
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

        const shouldApplyCleanReset = dataResetVersionRaw !== DATA_RESET_TARGET_VERSION;
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
                  localWeights[petId] = source[petId] as WeightPoint[];
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

      const remote = await fetchPetProfilesFromCloud(session.user.id);
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
            const normalized = normalizePetProfiles({ [petId]: cloudProfile })[petId];
            if (normalized) {
              nextProfiles[petId] = normalized;
              nextUpdatedAt[petId] = cloudUpdatedAt ?? localUpdatedAt ?? new Date().toISOString();
            }
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
    let mounted = true;

    async function hydrateCloudHealthDomain() {
      if (!session?.user?.id || !petHydrated) {
        setHealthCloudMetadataReady(false);
        setHealthCloudHydrated(true);
        return;
      }

      const remote = await fetchHealthDomainFromCloud(session.user.id);
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
            next[petId] = cloudItems;
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
            next[petId] = cloudItems;
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
            next[petId] = cloudItems;
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
            next[petId] = cloudItems;
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
            next[petId] = cloudItems;
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
          if (!next[petId] && remote.updatedAt[petId]) next[petId] = remote.updatedAt[petId];
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

    saveHealthDomainToCloud(session.user.id, petIdsToUpload, {
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

  const openSubRoute = (target: 'vaccinations' | 'healthRecords' | 'vetVisits', backTo: AppRoute) => {
    setSubBackRoute(backTo);
    setVetVisitCreatePreset(null);
    setRoute(target);
  };

  const openHealthHubWithCategory = (category: HealthHubCategory = 'all') => {
    setPrimaryTab('healthHub');
    setHealthHubInitialCategory(category);
    setHealthHubCategoryResetKey((prev) => prev + 1);
    setHealthHubCreatePreset(null);
    setRoute('healthHub');
  };

  const openHealthHubCreate = (
    type: AddHealthRecordType,
    category: HealthHubCategory = 'record',
    options?: { title?: string; note?: string },
  ) => {
    setPrimaryTab('healthHub');
    setHealthHubInitialCategory(category);
    setHealthHubCategoryResetKey((prev) => prev + 1);
    setHealthHubCreatePreset({
      type,
      title: options?.title,
      note: options?.note,
      openCreate: true,
      nonce: Date.now(),
    });
    setRoute('healthHub');
  };

  const handleInsightAction = (insight: AiInsight) => {
    if (insight.actionType === 'addReminder') {
      setReminderCreateSubtypePreset(null);
      setReminderCreateNonce((prev) => prev + 1);
      setPrimaryTab('reminders');
      setRoute('reminders');
      return;
    }
    if (insight.actionType === 'addVaccine') {
      openHealthHubCreate('vaccine', 'vaccine');
      return;
    }
    if (insight.actionType === 'addVisit') {
      openVetVisitWithPreset(route, {
        source: 'other',
        reason: 'checkup',
        actions: [],
      });
      return;
    }
    if (insight.actionType === 'logWeight') {
      openWeightTracking(activePetId, route);
    }
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

  const openPassport = (petId: string = activePetId, from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPassportBackRoute(from);
    setRoute('passport');
  };

  const openDocuments = (from: AppRoute = 'healthHub') => {
    setDocumentsBackRoute(from);
    setRoute('documents');
  };

  const openNotifications = (from: AppRoute = 'reminders') => {
    setNotificationsBackRoute(from);
    setRoute('notifications');
  };

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
    notes?: string;
    amount?: number;
    currency?: string;
    outcomes?: VetVisitOutcomeInput[];
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

    setMedicalEventsByPet((prev) =>
      addMvpMedicalEvent(prev, {
        petId: activePetId,
        type: payload.type,
        eventDate,
        title: payload.title,
        note: payload.note,
        subcategory: payload.type,
        metadataJson: { source: 'health_hub_form' },
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

  const openPetProfile = (petId: string = activePetId, from: AppRoute = 'home') => {
    setActivePetWithPersist(petId);
    setPetProfileBackRoute(from);
    setSubBackRoute(from);
    setRoute('petProfile');
  };

  const openWeightTracking = (petId: string = activePetId, from: AppRoute = 'petProfile') => {
    setActivePetWithPersist(petId);
    setPetProfileBackRoute(from);
    setRoute('weightTracking');
  };

  const vaccinationsBridge = useMemo(
    () => getVaccinesForUI(activePetId, medicalEventsByPet, healthEventsByPet, petProfiles[activePetId]),
    [activePetId, medicalEventsByPet, healthEventsByPet, petProfiles],
  );
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
  const documentsVaultPreview = useMemo(
    () => documentsVaultForActivePet.slice(0, 2).map((item) => ({ id: item.id, title: item.title, date: item.date, type: item.type })),
    [documentsVaultForActivePet],
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
  const upcomingRemindersByPet = useMemo(() => {
    const next: Partial<Record<string, Array<{ id: string; title: string; date: string }>>> = {};
    petList.forEach((petId) => {
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
  }, [remindersByPet, locale, petList, petProfiles]);

  const completedRemindersByPet = useMemo(() => {
    const next: Partial<Record<string, Array<{ id: string; title: string; date: string }>>> = {};
    petList.forEach((petId) => {
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
  }, [remindersByPet, locale, petList, petProfiles]);

  const reminderBadgeCount = useMemo(() => {
    return Object.values(upcomingRemindersByPet).reduce((sum, arr) => sum + (arr?.length ?? 0), 0);
  }, [upcomingRemindersByPet]);
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

  const isPremium = useMemo(() => {
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    return meta?.is_premium === true;
  }, [session?.user?.user_metadata]);

  const canAddPet = isPremium ? petList.length < 10 : petList.length < 1;

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
    setNotificationInbox((prev) => prev.filter((n) => n.petId !== petId));

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

  const remindersTabGroups = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const startMs = startOfToday.getTime();
    const endMs = endOfToday.getTime();

    const today: ReminderListItem[] = [];
    const upcoming: ReminderListItem[] = [];
    const overdue: ReminderListItem[] = [];

    petList.forEach((petId) => {
      const petName = petProfiles[petId]?.name || petId;
      const petType = petProfiles[petId]?.petType;
      getRemindersByPet(remindersByPet, petId)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .filter((reminder) => reminder.isActive && !reminder.completedAt)
        .forEach((reminder) => {
          const label = reminder.title?.trim() || (locale === 'tr' ? 'Hatırlatma' : 'Reminder');
          const dateValue = reminder.dueDate ?? reminder.scheduledAt ?? reminder.dueAt;
          const dateMs = new Date(dateValue).getTime();
          const item: ReminderListItem = {
            id: reminder.id,
            title: label,
            date: formatReminderDateLabel(dateValue, locale),
            dueDate: dateValue,
            petName,
            petId,
            subtype: reminder.subtype,
            status: reminder.status === 'snoozed' ? 'snoozed' : 'pending',
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

    const sortByDate = (items: ReminderListItem[]) =>
      [...items].sort((a, b) => {
        const aMs = new Date(a.dueDate).getTime();
        const bMs = new Date(b.dueDate).getTime();
        if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
        if (!Number.isFinite(aMs)) return 1;
        if (!Number.isFinite(bMs)) return -1;
        return aMs - bMs;
      });

    const completed: ReminderListItem[] = [];
    petList.forEach((petId) => {
      const petName = petProfiles[petId]?.name || petId;
      const petType = petProfiles[petId]?.petType;
      getRemindersByPet(remindersByPet, petId)
        .filter((r) => isReminderSubtypeAllowedForPet(petType, r.subtype) && !!r.completedAt)
        .forEach((r) => {
          completed.push({
            id: r.id,
            title: r.title?.trim() || (locale === 'tr' ? 'Tamamlanan hatırlatma' : 'Completed reminder'),
            date: formatReminderDateLabel((r.completedAt as string) ?? r.scheduledAt, locale),
            dueDate: (r.completedAt as string) ?? r.dueDate ?? r.scheduledAt,
            petName,
            petId,
            subtype: r.subtype,
            status: 'done',
          });
        });
    });
    completed.sort((a, b) => {
      const aMs = new Date(a.dueDate).getTime();
      const bMs = new Date(b.dueDate).getTime();
      if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
      if (!Number.isFinite(aMs)) return 1;
      if (!Number.isFinite(bMs)) return -1;
      return bMs - aMs;
    });

    return {
      today: sortByDate(today),
      upcoming: sortByDate(upcoming),
      overdue: sortByDate(overdue),
      completed: completed.slice(0, 20),
    };
  }, [completedRemindersByPet, locale, petList, petProfiles, remindersByPet]);

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

  const findReminderOwnerPetId = (reminderId: string): string | null => {
    for (const petId of Object.keys(remindersByPet)) {
      if ((remindersByPet[petId] ?? []).some((item) => item.id === reminderId)) return petId;
    }
    return null;
  };

  const markNotificationRead = (notificationId: string) => {
    setNotificationReadById((prev) => ({ ...prev, [notificationId]: true }));
    setNotificationInbox((prev) => prev.map((item) => (
      item.id === notificationId && !item.isRead ? { ...item, isRead: true } : item
    )));
  };

  const handleNotificationDone = (notificationId: string) => {
    const item = triggeredNotifications.find((entry) => entry.id === notificationId);
    if (!item) return;
    markNotificationRead(notificationId);
    if (item.type !== 'reminder_due' && item.type !== 'overdue') return;
    const ownerPetId = findReminderOwnerPetId(item.relatedEntityId);
    if (!ownerPetId) return;
    setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, ownerPetId, item.relatedEntityId).next);
  };

  const handleNotificationSnooze = (notificationId: string) => {
    hap.light();
    const item = triggeredNotifications.find((entry) => entry.id === notificationId);
    if (!item) return;
    markNotificationRead(notificationId);
    if (item.type !== 'reminder_due' && item.type !== 'overdue') return;
    const ownerPetId = findReminderOwnerPetId(item.relatedEntityId);
    if (!ownerPetId) return;
    setRemindersWithNotificationSync((prev) => snoozeReminder(prev, ownerPetId, item.relatedEntityId, 24 * 60).next);
  };

  const handleNotificationOpen = (notificationId: string) => {
    const item = triggeredNotifications.find((entry) => entry.id === notificationId);
    if (!item) return;
    markNotificationRead(notificationId);
    setActivePetWithPersist(item.petId);
    if (item.type === 'followup') {
      openSubRoute('vetVisits', 'notifications');
      return;
    }
    if (item.type === 'missing_data') {
      openPetProfile(item.petId, 'notifications');
      return;
    }
    setPrimaryTab('reminders');
    setRoute('reminders');
  };

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

  const healthHubTimeline = useMemo(() => {
    const base = buildUnifiedHealthEventsForPet(
      activePetId,
      medicalEventsByPet,
      vetVisitsByPet,
      weightsByPet,
      healthEventsByPet,
      petProfiles[activePetId],
    );
    return base.slice(0, 60).map((item) => ({
      id: item.id,
      type: item.type,
      date: formatReminderDateLabel(item.date, locale),
      title: item.title || (locale === 'tr' ? 'Sağlık olayı' : 'Health event'),
      notes: item.notes,
    }));
  }, [activePetId, healthEventsByPet, locale, medicalEventsByPet, petProfiles, vetVisitsByPet, weightsByPet]);

  const healthHubSummary = useMemo(() => {
    const summary = summarizeUnifiedHealthEvents(
      buildUnifiedHealthEventsForPet(
        activePetId,
        medicalEventsByPet,
        vetVisitsByPet,
        weightsByPet,
        healthEventsByPet,
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

    // Expense totals from vet visits — uses VetVisit.amount (number) directly
    const activeVisits = vetVisitsByPet[activePetId] ?? [];
    const expenseByCategory: Record<string, number> = {};
    let totalExpenseNum = 0;
    let primaryCurrency = 'TL';
    for (const v of activeVisits) {
      if (v.amount == null || v.amount <= 0) continue;
      totalExpenseNum += v.amount;
      if (v.currency) primaryCurrency = v.currency;
      const cat = v.reasonCategory === 'vaccine' ? 'vaccine' : 'vet';
      expenseByCategory[cat] = (expenseByCategory[cat] ?? 0) + v.amount;
    }
    const medEvents = medicalEventsByPet[activePetId] ?? [];
    const medTotal = medEvents.filter((e) => e.type === 'prescription').length * 0; // placeholder until med costs tracked

    const totalExpenses = totalExpenseNum > 0
      ? {
          total: totalExpenseNum,
          currency: primaryCurrency,
          breakdown: [
            ...(expenseByCategory['vaccine'] ? [{ label: locale === 'tr' ? 'Aşı' : 'Vaccine', amount: expenseByCategory['vaccine'], color: '#4a8a5a' }] : []),
            ...(expenseByCategory['vet'] ? [{ label: 'Vet', amount: expenseByCategory['vet'], color: '#7a9a6a' }] : []),
            ...(medTotal > 0 ? [{ label: locale === 'tr' ? 'İlaç' : 'Med', amount: medTotal, color: '#a0b890' }] : []),
          ],
        }
      : undefined;

    return { latestWeight, vaccineStatus, lastVetVisit, totalExpenses };
  }, [activePetId, healthEventsByPet, locale, medicalEventsByPet, petProfiles, vetVisitsByPet, vetVisitsBridge, weightsByPet]);

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

    const countText = (count: number, trOne: string, trMany: string, enOne: string, enMany: string) => {
      if (locale === 'tr') return `${count} ${count === 1 ? trOne : trMany}`;
      return `${count} ${count === 1 ? enOne : enMany}`;
    };

    return {
      vet: {
        countText: countText(visits.length, 'ziyaret', 'ziyaret', 'visit', 'visits'),
        statusText: missedVisits > 0
          ? (locale === 'tr' ? `${missedVisits} kaçırıldı` : `${missedVisits} missed`)
          : upcomingVisits > 0
            ? (locale === 'tr' ? `${upcomingVisits} yaklaşan` : `${upcomingVisits} upcoming`)
            : (locale === 'tr' ? 'sakin' : 'clear'),
        infoText: locale === 'tr' ? 'Ziyaret planı ve sonuçlar' : 'Visit schedule and outcomes',
      },
      records: {
        countText: countText(records.length, 'kayıt', 'kayıt', 'record', 'records'),
        statusText: locale === 'tr' ? 'tıbbi geçmiş' : 'history',
        infoText: locale === 'tr' ? 'Tanı, prosedür, test sonuçları' : 'Diagnosis, procedures, tests',
      },
      vaccines: {
        countText: countText(vaccines.length, 'aşı', 'aşı', 'vaccine', 'vaccines'),
        statusText: overdueVaccines > 0
          ? (locale === 'tr' ? `${overdueVaccines} gecikmiş` : `${overdueVaccines} overdue`)
          : dueSoonVaccines > 0
            ? (locale === 'tr' ? `${dueSoonVaccines} yakında` : `${dueSoonVaccines} due soon`)
            : (locale === 'tr' ? 'güncel' : 'up to date'),
        infoText: locale === 'tr' ? 'Uygulanan ve planlanan aşılar' : 'Administered and due vaccines',
      },
      reminders: {
        countText: countText(reminders.length, 'hatırlatıcı', 'hatırlatıcı', 'reminder', 'reminders'),
        statusText: locale === 'tr'
          ? `${medicalReminders} tıbbi · ${careReminders} bakım`
          : `${medicalReminders} medical · ${careReminders} care`,
        infoText: locale === 'tr' ? 'Bir sonraki aksiyonlar' : 'Next-step actions',
      },
      weight: {
        countText: countText(weightEntries.length, 'kayıt', 'kayıt', 'entry', 'entries'),
        statusText: weightDays == null
          ? (locale === 'tr' ? 'kayıt yok' : 'no data')
          : weightDays > 14
            ? (locale === 'tr' ? 'gecikmiş' : 'overdue')
            : (locale === 'tr' ? 'güncel' : 'fresh'),
        infoText: weightDays == null
          ? (locale === 'tr' ? 'Henüz kilo girişi yok' : 'No weight logged yet')
          : locale === 'tr'
            ? `Son kayıt ${weightDays} gün önce`
            : `Last entry ${weightDays} days ago`,
      },
      documents: {
        countText: countText(documentsCount, 'belge', 'belge', 'document', 'documents'),
        statusText: latestDocument
          ? (locale === 'tr' ? 'son eklenen' : 'latest')
          : (locale === 'tr' ? 'arşiv' : 'archive'),
        infoText: latestDocument
          ? `${latestDocument.title}`
          : (locale === 'tr' ? 'PDF, laboratuvar, rapor kayıtları' : 'PDF, lab, report records'),
      },
    };
  }, [activePetId, documentsVaultForActivePet, locale, medicalEventsByPet, remindersByPet, vetVisitsByPet, weightsByPet]);

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
        onPress: () => openHealthHubWithCategory('vaccine'),
        priority: 2,
        dateMs: overdueVaccine.dueMs,
      });
    }

    if (overdueReminder) {
      const dateLabel = formatReminderDateLabel(overdueReminder.scheduledAt, locale);
      candidates.push({
        id: `reminder-overdue-${overdueReminder.id}`,
        kind: 'reminder',
        title: overdueReminder.title,
        subtitle: locale === 'tr' ? `${dateLabel} · gecikmiş` : `${dateLabel} · overdue`,
        date: dateLabel,
        urgent: true,
        ctaLabel: locale === 'tr' ? 'Tamamla' : 'Mark Done',
        onPress: () => markReminderDone(activePetId, overdueReminder.id),
        secondaryCtaLabel: locale === 'tr' ? '1 Gün Ertele' : 'Snooze 1 Day',
        onSecondaryPress: () => baseReminderSnooze(activePetId, overdueReminder.id, overdueReminder.scheduledAt),
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
        onPress: () => openHealthHubWithCategory('vaccine'),
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
      candidates.push({
        id: `reminder-upcoming-${upcomingReminder.id}`,
        kind: 'reminder',
        title: upcomingReminder.title,
        subtitle: dateLabel,
        date: dateLabel,
        ctaLabel: locale === 'tr' ? '1 Gün Ertele' : 'Snooze 1 Day',
        onPress: () => baseReminderSnooze(activePetId, upcomingReminder.id, upcomingReminder.scheduledAt),
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
        secondaryCtaLabel: locale === 'tr' ? 'Grafiği Aç' : 'Open Weight',
        onSecondaryPress: () => openWeightTracking(activePetId, 'home'),
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

    const mapRecordSubtype = (value?: string) => {
      if (!value) return undefined;
      if (locale === 'tr') {
        if (value === 'diagnosis') return 'Teşhis';
        if (value === 'procedure') return 'Prosedür';
        if (value === 'test') return 'Test / Görüntüleme';
        if (value === 'prescription') return 'İlaç';
      } else {
        if (value === 'diagnosis') return 'Diagnosis';
        if (value === 'procedure') return 'Procedure';
        if (value === 'test') return 'Test / Imaging';
        if (value === 'prescription') return 'Medication';
      }
      return undefined;
    };

    const unified = buildUnifiedHealthEventsForPet(
      activePetId,
      medicalEventsByPet,
      vetVisitsByPet,
      weightsByPet,
      healthEventsByPet,
      petProfiles[activePetId],
    )
      .filter((event) => event.type !== 'weight')
      .slice(0, 12)
      .map((event) => ({
        id: event.id,
        eventType: event.type === 'vaccine' ? 'vaccine' : event.type === 'vet' ? 'vet' : 'record',
        title: event.title || (locale === 'tr' ? 'Sağlık kaydı' : 'Health record'),
        subtitle:
          event.type === 'record'
            ? mapRecordSubtype(typeof event.metadata?.originalType === 'string' ? event.metadata.originalType : undefined)
            : undefined,
        date: formatReminderDateLabel(event.date, locale),
      } satisfies HomeJourneyEventItem));

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
        onAction: () => openHealthHubWithCategory('vaccine'),
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
      });
    }

    const all = [...overlays, ...unified];
    const unique: HomeJourneyEventItem[] = [];
    const seen = new Set<string>();
    for (const item of all) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      unique.push(item);
      if (unique.length >= 4) break;
    }
    return unique;
  }, [activePetId, healthEventsByPet, locale, medicalEventsByPet, openHealthHubWithCategory, openSubRoute, petProfiles, remindersByPet, vetVisitsByPet, weightsByPet]);

  const homeSummaryCard = useMemo(() => {
    if (homeNextImportantEvent?.urgent) {
      return {
        title: locale === 'tr' ? 'Öncelikli Sağlık Uyarısı' : 'Priority Health Alert',
        body: locale === 'tr'
          ? `${homeNextImportantEvent.title} için aksiyon öneriliyor.`
          : `${homeNextImportantEvent.title} needs your attention.`,
      };
    }

    const nowMs = Date.now();
    const next30Ms = nowMs + 30 * 24 * 60 * 60 * 1000;
    const petType = petProfiles[activePetId]?.petType;
    const remindersNext30 = getRemindersByPet(remindersByPet, activePetId).filter((item) =>
      item.status !== 'done'
      && item.isActive
      && isReminderSubtypeAllowedForPet(petType, item.subtype)
      && (parseUpdatedAtMs(item.scheduledAt) ?? Number.MAX_SAFE_INTEGER) >= nowMs
      && (parseUpdatedAtMs(item.scheduledAt) ?? 0) <= next30Ms,
    ).length;
    const plannedVisitsNext30 = (vetVisitsByPet[activePetId] ?? []).filter((visit) =>
      visit.status === 'planned'
      && (parseUpdatedAtMs(visit.visitDate) ?? Number.MAX_SAFE_INTEGER) >= nowMs
      && (parseUpdatedAtMs(visit.visitDate) ?? 0) <= next30Ms,
    ).length;
    const dueVaccinesNext30 = (medicalEventsByPet[activePetId] ?? []).filter((event) =>
      event.type === 'vaccine'
      && typeof event.dueDate === 'string'
      && (parseUpdatedAtMs(event.dueDate) ?? Number.MAX_SAFE_INTEGER) >= nowMs
      && (parseUpdatedAtMs(event.dueDate) ?? 0) <= next30Ms,
    ).length;
    const total = remindersNext30 + plannedVisitsNext30 + dueVaccinesNext30;

    if (total === 0) {
      return {
        title: locale === 'tr' ? 'Sağlık Ufku Temiz' : 'Health Horizon Looks Clear',
        body: locale === 'tr'
          ? 'Önümüzdeki 30 gün için kritik görev görünmüyor.'
          : 'No critical health task appears in the next 30 days.',
      };
    }

    return {
      title: locale === 'tr' ? 'Yaklaşan Plan' : 'Upcoming Plan',
      body: locale === 'tr'
        ? `Önümüzdeki 30 gün için ${total} sağlık adımı planlandı.`
        : `${total} health tasks are expected in the next 30 days.`,
    };
  }, [activePetId, homeNextImportantEvent?.title, homeNextImportantEvent?.urgent, locale, medicalEventsByPet, petProfiles, remindersByPet, vetVisitsByPet]);

  const addWeightEntryForActivePet = (value: number, options?: { date?: string; note?: string }) => {
    hap.medium();
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
        [activePetId]: [...current, nextEntry],
      };
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
          summaryCard={homeSummaryCard}
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
          onOpenPetProfiles={noop}
          onOpenSettings={noop}
          onOpenPetPassport={noop}
          petProfiles={petProfiles}
          weightsByPet={weightsByPet}
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
          locale={locale}
          onBack={noop}
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

      <LensMagTabBar
        activeTab={primaryTab}
        locale={locale}
        onTabPress={(tab) => {
          if (tab === 'healthHub') {
            setHealthHubCreatePreset((prev) => (prev ? { ...prev, openCreate: false } : null));
          }
          setPrimaryTab(tab);
          setRoute(tab);
        }}
      />

      <SuccessOverlay ref={successOverlayRef} />
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
        onAddVaccination={() => openHealthHubCreate('vaccine', 'vaccine')}
        historyItems={vaccinationsBridge?.historyItems}
        attentionCounts={vaccinationsBridge?.attentionCounts}
        nextUpData={vaccinationsBridge?.nextUpData}
      />
    );
  }

  if (route === 'vetVisits') {
    return (
      <VetVisitsScreen
        onBack={() => setRoute(subBackRoute)}
        backPreview={renderBackPreview(subBackRoute)}
        createPreset={vetVisitCreatePreset}
        visits={vetVisitsBridge ?? undefined}
        onOpenDocuments={() => openDocuments('vetVisits')}
        onCreateVisit={(payload: CreateVetVisitPayload) => {
          const reasonTitleMap: Record<VetVisitReasonCategory, string> = {
            checkup: 'General Checkup',
            vaccine: 'Vaccination Visit',
            illness: 'Illness Visit',
            injury: 'Injury Visit',
            follow_up: 'Follow-up Visit',
            other: 'Vet Visit',
          };

          const outcomes: VetVisitOutcomeInput[] = payload.actions.map((action) => {
            const eventTypeMap: Record<typeof action.type, MedicalEventType> = {
              vaccine: 'vaccine',
              diagnosis: 'diagnosis',
              procedure: 'procedure',
              test: 'test',
              prescription: 'prescription',
            };

            const outcome: VetVisitOutcomeInput = {
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

          if (outcomes.length === 0) {
            outcomes.push({
              type: 'note',
              title: reasonTitleMap[payload.reason] ?? 'Vet Visit',
              eventDate: payload.date,
              note: payload.note,
              subcategory: 'general_checkup',
              metadataJson: { source: 'vet_visit_form', kind: 'general_checkup' },
            });
          }

          recordVetVisitWithOutcomes({
            petId: activePetId,
            visitDate: payload.date,
            reasonCategory: payload.reason,
            status: 'completed',
            clinicName: payload.clinic,
            notes: payload.note,
            amount: payload.amount,
            currency: payload.currency,
            outcomes,
          });

        }}
      />
    );
  }

  if (route === 'petProfile') {
    const activePet = petProfiles[activePetId];
    if (!activePet) return null;
    return (
      <PetDetailScreen
        pet={activePet}
        weightEntries={weightsByPet[activePetId]}
        weightGoal={weightGoalsByPet[activePetId]}
        locale={locale}
        onBack={() => setRoute(petProfileBackRoute)}
        onEdit={() => {
          setPetEditBackRoute('petProfile');
          setRoute('petEdit');
        }}
        onOpenWeightTracking={() => openWeightTracking(activePetId, 'petProfile')}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'petProfile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'petProfile')}
        onOpenVaccinations={() => openSubRoute('vaccinations', 'petProfile')}
      />
    );
  }

  if (route === 'weightTracking' && petProfiles[activePetId]) {
    const activePet = petProfiles[activePetId];
    return (
      <WeightTrackingScreen
        onBack={() => setRoute(petProfileBackRoute)}
        backPreview={renderBackPreview(petProfileBackRoute)}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'petProfile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'petProfile')}
        petName={activePet.name}
        petType={activePet.petType}
        petBreed={activePet.breed}
        microchip={activePet.microchip}
        entries={weightsByPet[activePetId]}
        onAddEntry={addWeightEntryForActivePet}
        weightGoal={weightGoalsByPet[activePetId]}
        onSetWeightGoal={(goal) => {
          setWeightGoalsByPet((prev) => ({ ...prev, [activePetId]: goal }));
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          setRemindersWithNotificationSync((prev) =>
            createReminder(prev, {
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
            }).next,
          );
        }}
      />
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

          const previousVaccinationSet = new Set((previousPet?.vaccinations ?? []).map((v) => `${v.name}|${v.date}`));
          const addedVaccinations = (nextPet.vaccinations ?? []).filter((v) => !previousVaccinationSet.has(`${v.name}|${v.date}`));

          const previousSurgerySet = new Set((previousPet?.surgeriesLog ?? []).map((s) => `${s.name}|${s.date}`));
          const addedSurgeries = (nextPet.surgeriesLog ?? []).filter((s) => !previousSurgerySet.has(`${s.name}|${s.date}`));

          const previousAllergySet = new Set((previousPet?.allergiesLog ?? []).map((a) => `${a.category}|${a.date}|${a.status}`));
          const addedAllergies = (nextPet.allergiesLog ?? []).filter((a) => !previousAllergySet.has(`${a.category}|${a.date}|${a.status}`));

          const previousDiabetesSet = new Set((previousPet?.diabetesLog ?? []).map((d) => `${d.type}|${d.date}|${d.status}`));
          const addedDiabetes = (nextPet.diabetesLog ?? []).filter((d) => !previousDiabetesSet.has(`${d.type}|${d.date}|${d.status}`));

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
          setRoute(petEditBackRoute);
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
        onOpenPetDetail={(petId) => {
          setActivePetWithPersist(petId);
          openPetProfile(petId, 'petProfiles');
        }}
        onOpenPetEdit={(petId) => {
          setActivePetWithPersist(petId);
          setPetEditBackRoute('petProfiles');
          setRoute('petEdit');
        }}
        onDeletePet={deletePet}
        canAddPet={canAddPet}
        onAddPet={openAddPet}
      />
    );
  }

  if (route === 'addPet' && newPetTemplate) {
    return (
      <PetEditScreen
        key={newPetTemplate.id}
        pet={newPetTemplate}
        isNewPet
        onBack={() => setRoute('petProfiles')}
        onSaved={() => setRoute('petProfiles')}
        onCreated={(pet) => {
          hap.success();
          addPet(pet);
          setActivePetWithPersist(pet.id);
          setRoute('petProfiles');
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
        onOpenVaccinations={() => openSubRoute('vaccinations', 'passport')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'passport')}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'home')}
        onOpenWeight={() => openPetProfile(activePetId, 'passport')}
        onOpenPremium={() => setRoute('premium')}
        onExportPdf={handleExportPetPassportPdf}
      />
    );
  }

  if (route === 'documents') {
    return (
      <DocumentsScreen
        onBack={() => setRoute(documentsBackRoute)}
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
        summary={healthHubSummary}
        timeline={healthHubTimeline}
        initialCategory={healthHubInitialCategory}
        categoryResetKey={healthHubCategoryResetKey}
        createPreset={healthHubCreatePreset}
        domainOverview={healthHubDomainOverview}
        locale={locale}
        onPrimaryCta={() => openVetVisitWithPreset('healthHub', { source: 'other', reason: 'checkup', actions: [] })}
        onAddRecord={handleAddHealthRecord}
        onDeleteRecord={handleDeleteHealthRecord}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'healthHub')}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'healthHub')}
        onOpenVaccines={() => openSubRoute('vaccinations', 'healthHub')}
        onOpenWeightTracking={() => openWeightTracking(activePetId, 'healthHub')}
        onOpenDocuments={() => openDocuments('healthHub')}
        documentsPreview={documentsVaultPreview}
        medicationCourses={medicationCoursesByPet[activePetId] ?? []}
        onCompleteMedication={handleCompleteMedication}
        onDeleteMedication={handleDeleteMedication}
        weightGoal={weightGoalsByPet[activePetId]}
      />,
    );
  }

  if (route === 'healthRecords') {
    return (
      <HealthRecordsScreen
        onBack={() => setRoute(subBackRoute ?? 'healthHub')}
        backPreview={renderBackPreview(subBackRoute ?? 'healthHub')}
        recordsData={healthRecordsForUI ?? undefined}
        status={petHydrated ? 'ready' : 'loading'}
        onAddRecord={() => openHealthHubCreate('diagnosis', 'record')}
      />
    );
  }

  if (route === 'reminders') {
    return renderPrimaryChrome(
      <RemindersScreen
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
        locale={locale}
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
        onEmptyCta={() => openPetProfile(activePetId, 'insights')}
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
        onOpenPetProfiles={() => setRoute('petProfiles')}
        onOpenNotifications={() => openNotifications('profile')}
        onOpenSettings={() => setRoute('settings')}
        onOpenPetPassport={() => openPassport(activePetId, 'profile')}
        petProfiles={petProfiles}
        weightsByPet={weightsByPet}
        isPremiumPlan={isPremium}
      />
    );
  }

  if (route === 'premium') {
    return <PremiumScreen onBack={() => setRoute('profile')} />;
  }

  return renderPrimaryChrome(
    <HomeScreen
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
      onOpenPetProfile={(petId) => openPetProfile(petId || activePetId, 'home')}
      onOpenVaccinations={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openSubRoute('vaccinations', 'home');
      }}
      onOpenHealthRecords={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openSubRoute('healthRecords', 'home');
      }}
      onOpenVetVisits={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        openSubRoute('vetVisits', 'home');
      }}
      onOpenPetEdit={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        setPetEditBackRoute('home');
        setRoute('petEdit');
      }}
      onOpenPetPassport={(petId) => {
        if (petId) setActivePetWithPersist(petId);
        setRoute('passport');
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
      summaryCard={homeSummaryCard}
      expenseBreakdown={healthHubSummary.totalExpenses}
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
});














