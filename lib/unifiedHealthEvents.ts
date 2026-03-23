import type { PetProfile } from '../components/AuthGate';
import type { WeightPoint } from '../screens/WeightTrackingScreen';
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

function mapMedicalTypeToUnified(type: MedicalEvent['type']): UnifiedHealthEventType {
  if (type === 'vaccine') return 'vaccine';
  if (type === 'diagnosis' || type === 'procedure' || type === 'test' || type === 'prescription' || type === 'note') return 'record';
  return 'record';
}

export function buildUnifiedHealthEventsForPet(
  petId: PetId,
  medicalEventsByPet: ByPet<MedicalEvent>,
  vetVisitsByPet: ByPet<VetVisit>,
  weightsByPet: Record<string, WeightPoint[]>,
  profile?: PetProfile,
): UnifiedHealthEvent[] {
  const medical = (medicalEventsByPet[petId] ?? []).map((event) => ({
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
    },
  } satisfies UnifiedHealthEvent));

  const vet = (vetVisitsByPet[petId] ?? []).map((visit) => ({
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
    },
  }));

  const weights = (weightsByPet[petId] ?? []).map((entry, index) => ({
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

  const legacyVaccines = (profile?.vaccinations ?? []).map((vaccine, index) => ({
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

  return sortDesc([...medical, ...vet, ...weights, ...legacyVaccines]);
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
