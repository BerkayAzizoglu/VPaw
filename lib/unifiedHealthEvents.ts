import type { PetProfile } from './petProfileTypes';
import type { WeightPoint } from './healthMvpModel';
import type { LegacyHealthEvent } from './healthEventDedup';
import {
  isSameMedicalEvent,
  isSameVetVisit,
  isSameWeightEntry,
} from './healthEventDedup';
import type { ByPet, MedicalEvent, PetId, VetVisit } from './healthMvpModel';

export type UnifiedHealthEventType = 'vaccine' | 'vet' | 'record' | 'weight';

export type UnifiedHealthEvent = {
  id: string;
  type: UnifiedHealthEventType;
  date: string;
  petId: PetId;
  title?: string;
  notes?: string;
  metadata: Record<string, unknown>;
};

function parseMs(value: string) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function sortDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => parseMs(b.date) - parseMs(a.date));
}

function normalizeProfileVaccineTitle(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeProfileVaccineDate(value: string) {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value.trim().toLowerCase();
  return new Date(ms).toISOString().slice(0, 10);
}

function mapMedicalTypeToUnified(type: MedicalEvent['type']): UnifiedHealthEventType {
  if (type === 'vaccine') return 'vaccine';
  if (type === 'diagnosis' || type === 'procedure' || type === 'test' || type === 'prescription' || type === 'note') return 'record';
  return 'record';
}

function mapLegacyHealthEventToUnified(event: LegacyHealthEvent): UnifiedHealthEvent {
  if (event.type === 'vaccination') {
    return {
      id: `legacy-vaccine-${event.id}`,
      type: 'vaccine',
      date: event.date,
      petId: event.petId,
      title: event.title,
      notes: event.description,
      metadata: {
        source: 'legacy_health_event',
        legacyType: event.type,
        ...event.metadata,
      },
    };
  }

  if (event.type === 'vet_visit') {
    return {
      id: `legacy-vet-${event.id}`,
      type: 'vet',
      date: event.date,
      petId: event.petId,
      title: event.title || 'Vet Visit',
      notes: event.description,
      metadata: {
        source: 'legacy_health_event',
        legacyType: event.type,
        ...event.metadata,
      },
    };
  }

  if (event.type === 'weight') {
    return {
      id: `legacy-weight-${event.id}`,
      type: 'weight',
      date: event.date,
      petId: event.petId,
      title: event.title || 'Weight Entry',
      notes: event.description,
      metadata: {
        source: 'legacy_health_event',
        legacyType: event.type,
        ...event.metadata,
      },
    };
  }

  return {
    id: `legacy-record-${event.id}`,
    type: 'record',
    date: event.date,
    petId: event.petId,
    title: event.title,
    notes: event.description,
    metadata: {
      source: 'legacy_health_event',
      legacyType: event.type,
      ...event.metadata,
    },
  };
}

export function buildUnifiedHealthEventsForPet(
  petId: PetId,
  medicalEventsByPet: ByPet<MedicalEvent>,
  vetVisitsByPet: ByPet<VetVisit>,
  weightsByPet: Record<string, WeightPoint[]>,
  legacyHealthEventsByPet: Record<string, LegacyHealthEvent[]> = {},
  profile?: PetProfile,
): UnifiedHealthEvent[] {
  const medicalEvents = medicalEventsByPet[petId] ?? [];
  const vetVisits = vetVisitsByPet[petId] ?? [];
  const weightEntries = weightsByPet[petId] ?? [];
  const legacyEvents = legacyHealthEventsByPet[petId] ?? [];

  const medical = medicalEvents.map((event) => ({
    id: `med-${event.id}`,
    type: mapMedicalTypeToUnified(event.type),
    date: event.eventDate,
    petId,
    title: event.title,
    notes: event.note,
    metadata: {
      source: 'medical_event',
      originalType: event.type,
      status: event.status,
      subcategory: event.subcategory,
      dueDate: event.dueDate,
      vetVisitId: event.vetVisitId,
      valueNumber: event.valueNumber,
      valueUnit: event.valueUnit,
    },
  } satisfies UnifiedHealthEvent));

  const vet = vetVisits.map((visit) => ({
    id: `visit-${visit.id}`,
    type: 'vet' as const,
    date: visit.visitDate,
    petId,
    title: visit.reasonCategory === 'checkup' ? 'General Checkup' : 'Vet Visit',
    notes: visit.notes,
    metadata: {
      source: 'vet_visit',
      reasonCategory: visit.reasonCategory,
      status: visit.status,
      clinicName: visit.clinicName,
      vetName: visit.vetName,
      followUpDate: visit.followUpDate,
    },
  }));

  const weights = weightEntries.map((entry, index) => ({
    id: `weight-${petId}-${index}-${entry.date}`,
    type: 'weight' as const,
    date: entry.date,
    petId,
    title: 'Weight Entry',
    notes: entry.change,
    metadata: {
      source: 'weight_entry',
      value: entry.value,
      change: entry.change,
      label: entry.label,
    },
  }));

  const fallbackLegacyVaccines = legacyEvents
    .filter((event) => event.type === 'vaccination')
    .filter((event) => !medicalEvents.some((medicalEvent) => isSameMedicalEvent(event, medicalEvent)))
    .map((event) => mapLegacyHealthEventToUnified(event));
  const fallbackLegacyVetVisits = legacyEvents
    .filter((event) => event.type === 'vet_visit')
    .filter((event) => !vetVisits.some((visit) => isSameVetVisit(event, visit)))
    .map((event) => mapLegacyHealthEventToUnified(event));
  const fallbackLegacyRecords = legacyEvents
    .filter((event) => event.type === 'health_note')
    .filter((event) => !medicalEvents.some((medicalEvent) => isSameMedicalEvent(event, medicalEvent)))
    .map((event) => mapLegacyHealthEventToUnified(event));
  const fallbackLegacyWeights = legacyEvents
    .filter((event) => event.type === 'weight')
    .filter((event) => !weightEntries.some((entry) => isSameWeightEntry(event, entry)))
    .map((event) => mapLegacyHealthEventToUnified(event));

  const fallbackProfileVaccines = (profile?.vaccinations ?? [])
    .filter((vaccine) => {
      const vaccineDate = normalizeProfileVaccineDate(vaccine.date);
      const vaccineTitle = normalizeProfileVaccineTitle(vaccine.name);
      const duplicateInCanonical = medicalEvents.some((event) =>
        event.type === 'vaccine'
        && normalizeProfileVaccineDate(event.eventDate) === vaccineDate
        && normalizeProfileVaccineTitle(event.title) === vaccineTitle,
      );
      const duplicateInLegacyFallback = fallbackLegacyVaccines.some((event) =>
        normalizeProfileVaccineDate(event.date) === vaccineDate
        && normalizeProfileVaccineTitle(event.title) === vaccineTitle,
      );
      return !duplicateInCanonical && !duplicateInLegacyFallback;
    })
    .map((vaccine, index) => ({
    id: `legacy-vaccine-${petId}-${index}`,
    type: 'vaccine' as const,
    date: vaccine.date,
    petId,
    title: vaccine.name,
    notes: profile?.vaccines,
    metadata: {
      source: 'legacy_profile',
      legacy: true,
    },
  }));

  return sortDesc([
    ...medical,
    ...vet,
    ...weights,
    ...fallbackLegacyVaccines,
    ...fallbackLegacyVetVisits,
    ...fallbackLegacyRecords,
    ...fallbackLegacyWeights,
    ...fallbackProfileVaccines,
  ]);
}

export function summarizeUnifiedHealthEvents(events: UnifiedHealthEvent[]) {
  const latestWeight = events.find((event) => event.type === 'weight');
  const latestVaccine = events.find((event) => event.type === 'vaccine');
  const latestVet = events.find((event) => event.type === 'vet');
  return {
    latestWeight,
    latestVaccine,
    latestVet,
  };
}

export function filterUnifiedHealthEvents(events: UnifiedHealthEvent[], category: 'all' | UnifiedHealthEventType) {
  if (category === 'all') return events;
  return events.filter((event) => event.type === category);
}
