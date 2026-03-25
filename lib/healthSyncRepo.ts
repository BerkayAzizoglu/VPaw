import { supabase } from './supabase';
import {
  normalizeMedicalEventsByPet,
  normalizeMedicationCoursesByPet,
  normalizeRemindersByPet,
  normalizeVetVisitsByPet,
  type ByPet,
  type MedicalEvent,
  type MedicationCourse,
  type Reminder,
  type VetVisit,
  type WeightPoint,
} from './healthMvpModel';

export type CloudHealthPayload = {
  vetVisits: VetVisit[];
  medicalEvents: MedicalEvent[];
  reminders: Reminder[];
  medicationCourses: MedicationCourse[];
  weights: WeightPoint[];
  vetVisitsUpdatedAt: number;
  medicalEventsUpdatedAt: number;
  remindersUpdatedAt: number;
  medicationCoursesUpdatedAt: number;
  weightsUpdatedAt: number;
};

export type CloudHealthDomain = {
  byPet: Record<string, CloudHealthPayload>;
  updatedAt: Record<string, string>;
};

type HealthDomainRow = {
  user_id: string;
  pet_id: string;
  payload: {
    vetVisits?: unknown;
    medicalEvents?: unknown;
    reminders?: unknown;
    medicationCourses?: unknown;
    weights?: unknown;
    vetVisitsUpdatedAt?: unknown;
    medicalEventsUpdatedAt?: unknown;
    remindersUpdatedAt?: unknown;
    medicationCoursesUpdatedAt?: unknown;
    weightsUpdatedAt?: unknown;
  };
  updated_at: string;
};

export type CloudHealthDomainUpdatedAt = {
  vetVisitsUpdatedAt: number;
  medicalEventsUpdatedAt: number;
  remindersUpdatedAt: number;
  medicationCoursesUpdatedAt: number;
  weightsUpdatedAt: number;
};

export function emptyHealthDomainUpdatedAt(): CloudHealthDomainUpdatedAt {
  return {
    vetVisitsUpdatedAt: 0,
    medicalEventsUpdatedAt: 0,
    remindersUpdatedAt: 0,
    medicationCoursesUpdatedAt: 0,
    weightsUpdatedAt: 0,
  };
}

function normalizeTimestamp(value: unknown, fallbackMs = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim().length > 0) {
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms)) return Math.max(0, Math.floor(ms));
  }
  return fallbackMs;
}

function normalizeWeights(raw: unknown): WeightPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry) => {
      const value = typeof entry.value === 'number' ? entry.value : Number.NaN;
      if (!Number.isFinite(value)) return null;
      const date = typeof entry.date === 'string' ? entry.date : '';
      if (!date) return null;
      return {
        label: typeof entry.label === 'string' ? entry.label : date,
        value,
        date,
        change: typeof entry.change === 'string' ? entry.change : '',
      } satisfies WeightPoint;
    })
    .filter((entry): entry is WeightPoint => entry !== null);
}

function normalizePayloadForPet(petId: string, payload: HealthDomainRow['payload']): CloudHealthPayload {
  const vetVisits = normalizeVetVisitsByPet({ [petId]: payload.vetVisits ?? [] })[petId] ?? [];
  const medicalEvents = normalizeMedicalEventsByPet({ [petId]: payload.medicalEvents ?? [] })[petId] ?? [];
  const reminders = normalizeRemindersByPet({ [petId]: payload.reminders ?? [] })[petId] ?? [];
  const medicationCourses = normalizeMedicationCoursesByPet({ [petId]: payload.medicationCourses ?? [] })[petId] ?? [];
  const weights = normalizeWeights(payload.weights);
  const fallbackMs = normalizeTimestamp(payload.medicalEventsUpdatedAt);

  return {
    vetVisits,
    medicalEvents,
    reminders,
    medicationCourses,
    weights,
    vetVisitsUpdatedAt: normalizeTimestamp(payload.vetVisitsUpdatedAt, fallbackMs),
    medicalEventsUpdatedAt: normalizeTimestamp(payload.medicalEventsUpdatedAt, fallbackMs),
    remindersUpdatedAt: normalizeTimestamp(payload.remindersUpdatedAt, fallbackMs),
    medicationCoursesUpdatedAt: normalizeTimestamp(payload.medicationCoursesUpdatedAt, fallbackMs),
    weightsUpdatedAt: normalizeTimestamp(payload.weightsUpdatedAt, fallbackMs),
  };
}

export async function fetchHealthDomainFromCloud(userId: string): Promise<CloudHealthDomain | null> {
  const { data, error } = await supabase
    .from('health_domain_state')
    .select('pet_id, payload, updated_at')
    .eq('user_id', userId);

  if (error || !data) {
    if (__DEV__) {
      console.warn('[health-sync:fetch]', error?.message ?? 'unknown error');
    }
    return null;
  }

  const byPet: Record<string, CloudHealthPayload> = {};
  const updatedAt: Record<string, string> = {};

  for (const row of data as HealthDomainRow[]) {
    if (typeof row.pet_id !== 'string' || row.pet_id.length === 0) continue;
    byPet[row.pet_id] = normalizePayloadForPet(row.pet_id, row.payload ?? {});
    updatedAt[row.pet_id] = row.updated_at;
  }

  return { byPet, updatedAt };
}

export async function saveHealthDomainToCloud(
  userId: string,
  petIdsToUpload: string[],
  input: {
    vetVisitsByPet: ByPet<VetVisit>;
    medicalEventsByPet: ByPet<MedicalEvent>;
    remindersByPet: ByPet<Reminder>;
    medicationCoursesByPet: ByPet<MedicationCourse>;
    weightsByPet: Record<string, WeightPoint[]>;
    domainUpdatedAtByPet: Record<string, CloudHealthDomainUpdatedAt>;
  },
): Promise<boolean> {
  if (petIdsToUpload.length === 0) return true;

  const rows: HealthDomainRow[] = petIdsToUpload.map((petId) => ({
    // Source of truth remains local canonical state; cloud row is persistence snapshot.
    user_id: userId,
    pet_id: petId,
    payload: {
      vetVisits: input.vetVisitsByPet[petId] ?? [],
      medicalEvents: input.medicalEventsByPet[petId] ?? [],
      reminders: input.remindersByPet[petId] ?? [],
      medicationCourses: input.medicationCoursesByPet[petId] ?? [],
      weights: input.weightsByPet[petId] ?? [],
      vetVisitsUpdatedAt: input.domainUpdatedAtByPet[petId]?.vetVisitsUpdatedAt ?? 0,
      medicalEventsUpdatedAt: input.domainUpdatedAtByPet[petId]?.medicalEventsUpdatedAt ?? 0,
      remindersUpdatedAt: input.domainUpdatedAtByPet[petId]?.remindersUpdatedAt ?? 0,
      medicationCoursesUpdatedAt: input.domainUpdatedAtByPet[petId]?.medicationCoursesUpdatedAt ?? 0,
      weightsUpdatedAt: input.domainUpdatedAtByPet[petId]?.weightsUpdatedAt ?? 0,
    },
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('health_domain_state')
    .upsert(rows, { onConflict: 'user_id,pet_id' });

  if (error && __DEV__) {
    console.warn('[health-sync:save]', error.message);
  }

  return !error;
}
