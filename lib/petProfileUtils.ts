import {
  type ByPet,
  type MedicalEvent as MvpMedicalEvent,
  type MedicationCourse,
  type Reminder,
  type ReminderSubtype,
  type VetVisit,
  type WeightPoint,
} from './healthMvpModel';
import {
  emptyHealthDomainUpdatedAt,
  type CloudHealthDomainUpdatedAt,
  type CloudHealthPayload,
} from './healthSyncRepo';
import {
  isSameMedicalEvent,
  isSameVetVisit,
  isSameWeightEntry,
  mapLegacyHealthEventToMedicalType,
  toVetVisitReasonCategory,
  toVetVisitStatus,
  toWeightPointFromLegacyEvent,
} from './healthEventDedup';
import type { HealthEvent, HealthEventType, PetProfile } from './petProfileTypes';

export const DEFAULT_ROUTINE_CARE: PetProfile['routineCare'] = {
  internalParasite: { enabled: false, lastDate: '', intervalDays: 30 },
  externalParasite: { enabled: false, lastDate: '', intervalDays: 30 },
};

export function normalizePetProfiles(raw: unknown): Record<string, PetProfile> {
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
      petTypeChangeCount: typeof incoming.petTypeChangeCount === 'number' ? incoming.petTypeChangeCount : 0,
      petTypeChangeHistory: Array.isArray(incoming.petTypeChangeHistory) ? incoming.petTypeChangeHistory : [],
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

export function formatShortLabel(date: Date, locale: 'en' | 'tr') {
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }).replace(',', '');
}

export function formatLongLabel(date: Date, locale: 'en' | 'tr') {
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return date.toLocaleDateString(localeTag, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatReminderDateLabel(value: string, locale: 'en' | 'tr') {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value;
  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Date(ms).toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
}

export function isReminderSubtypeAllowedForPet(
  petType: 'Dog' | 'Cat' | undefined,
  subtype: ReminderSubtype,
) {
  if (subtype === 'walk') return petType === 'Dog';
  return true;
}

export function parseUpdatedAtMs(value: string | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function daysSince(value: string | undefined) {
  const ms = parseUpdatedAtMs(value);
  if (ms == null) return null;
  const diff = Date.now() - ms;
  if (diff < 0) return 0;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

export function getLatestTimestampMs(values: Array<string | undefined>): number {
  let maxMs = Number.NaN;
  values.forEach((value) => {
    const ms = parseUpdatedAtMs(value);
    if (ms == null) return;
    if (!Number.isFinite(maxMs) || ms > maxMs) maxMs = ms;
  });
  return Number.isFinite(maxMs) ? maxMs : 0;
}

export function normalizeDomainClockValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim().length > 0) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return Math.max(0, Math.floor(asNumber));
    const parsedDate = new Date(value).getTime();
    if (Number.isFinite(parsedDate)) return Math.max(0, Math.floor(parsedDate));
  }
  return 0;
}

export function getCloudDomainClock(payload: CloudHealthPayload | undefined): CloudHealthDomainUpdatedAt {
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

export function buildDomainFingerprint(items: unknown[]): string {
  try {
    return JSON.stringify(items);
  } catch {
    return `len:${items.length}`;
  }
}

export function getLocalDomainClockForPet(args: {
  petId: string;
  vetVisitsByPet: ByPet<VetVisit>;
  medicalEventsByPet: ByPet<MvpMedicalEvent>;
  remindersByPet: ByPet<Reminder>;
  medicationCoursesByPet: ByPet<MedicationCourse>;
  weightsByPet: Record<string, WeightPoint[]>;
  weightsUpdatedAtByPet?: Record<string, string>;
}): CloudHealthDomainUpdatedAt {
  const {
    petId,
    vetVisitsByPet,
    medicalEventsByPet,
    remindersByPet,
    medicationCoursesByPet,
    weightsByPet,
    weightsUpdatedAtByPet,
  } = args;
  const weightsUpdatedAt = parseUpdatedAtMs(weightsUpdatedAtByPet?.[petId]);
  return {
    vetVisitsUpdatedAt: getLatestTimestampMs((vetVisitsByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.visitDate])),
    medicalEventsUpdatedAt: getLatestTimestampMs((medicalEventsByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.eventDate, item.dueDate])),
    remindersUpdatedAt: getLatestTimestampMs((remindersByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.scheduledAt, item.completedAt])),
    medicationCoursesUpdatedAt: getLatestTimestampMs((medicationCoursesByPet[petId] ?? []).flatMap((item) => [item.updatedAt, item.createdAt, item.startDate, item.endDate])),
    weightsUpdatedAt: weightsUpdatedAt ?? getLatestTimestampMs((weightsByPet[petId] ?? []).map((item) => item.date)),
  };
}

export function normalizeUpdatedAt(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const next: Record<string, string> = {};
  for (const [key, val] of Object.entries(source)) {
    if (typeof val === 'string') next[key] = val;
  }
  return next;
}

export function buildCleanState(): {
  petList: string[];
  profiles: Record<string, PetProfile>;
  weights: Record<string, WeightPoint[]>;
  healthEvents: Record<string, HealthEvent[]>;
  vetVisits: ByPet<VetVisit>;
  medicalEvents: ByPet<MvpMedicalEvent>;
  reminders: ByPet<Reminder>;
  medicationCourses: ByPet<MedicationCourse>;
  profilesUpdatedAt: Record<string, string>;
  weightsUpdatedAt: Record<string, string>;
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

export function normalizeHealthEvents(raw: unknown): Record<string, HealthEvent[]> {
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

export function buildHealthEventsFromLegacyData(profiles: Record<string, PetProfile>, weights: Record<string, WeightPoint[]>): Record<string, HealthEvent[]> {
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

export function migrateLegacyHealthEventsToCanonical(
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

/**
 * Merges two arrays of domain items by `id`.
 * For the same ID, the item with the newer `updatedAt` wins.
 * Items present in only one side are always kept — prevents data loss
 * when two devices add different records to the same domain concurrently.
 */
export function mergeById<T extends { id: string; updatedAt?: string }>(
  local: T[],
  cloud: T[],
): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of cloud) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const localMs = parseUpdatedAtMs(existing.updatedAt) ?? 0;
      const cloudMs = parseUpdatedAtMs(item.updatedAt) ?? 0;
      if (cloudMs >= localMs) map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Merges weight arrays by `date`.
 * WeightPoints have no `id` field — date is used as the dedup key.
 * Cloud wins for same-date conflicts (cloud is authoritative).
 */
export function mergeWeightsByDate(
  local: WeightPoint[],
  cloud: WeightPoint[],
): WeightPoint[] {
  const map = new Map<string, WeightPoint>();
  for (const item of local) if (item.date) map.set(item.date, item);
  for (const item of cloud) if (item.date) map.set(item.date, item);
  return Array.from(map.values()).sort(
    (a, b) => (parseUpdatedAtMs(b.date) ?? 0) - (parseUpdatedAtMs(a.date) ?? 0),
  );
}
