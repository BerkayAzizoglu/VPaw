import type {
  MedicalEvent,
  MedicalEventType,
  VetVisit,
  WeightPoint,
  VetVisitReasonCategory,
  VetVisitStatus,
} from './healthMvpModel';

export type LegacyHealthEventType = 'vaccination' | 'vet_visit' | 'health_note' | 'weight' | 'other';

export type LegacyHealthEvent = {
  id: string;
  petId: string;
  type: LegacyHealthEventType;
  title: string;
  description?: string;
  date: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeDateDay(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return normalizeText(value);
  return new Date(ms).toISOString().slice(0, 10);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Number(value.toFixed(1));
}

function getMetadataString(source: Record<string, unknown> | undefined, key: string): string {
  if (!source) return '';
  return normalizeText(source[key]);
}

function getMetadataNumber(source: Record<string, unknown> | undefined, key: string): number | null {
  if (!source) return null;
  return normalizeNumber(source[key]);
}

export function toVetVisitReasonCategory(value: unknown): VetVisitReasonCategory {
  if (value === 'checkup' || value === 'vaccine' || value === 'illness' || value === 'injury' || value === 'follow_up' || value === 'other') {
    return value;
  }
  return 'other';
}

export function toVetVisitStatus(value: unknown): VetVisitStatus {
  if (value === 'planned' || value === 'canceled' || value === 'completed') return value;
  return 'completed';
}

export function mapLegacyHealthEventToMedicalType(event: LegacyHealthEvent): MedicalEventType {
  if (event.type === 'vaccination') return 'vaccine';
  const category = getMetadataString(event.metadata, 'category');
  if (category === 'diagnosis' || category === 'allergy' || category === 'diabetes') return 'diagnosis';
  if (category === 'surgery' || category === 'procedure') return 'procedure';
  if (category === 'lab_result' || category === 'test') return 'test';
  if (category === 'prescription' || category === 'treatment' || category === 'medication') return 'prescription';
  return 'note';
}

export function inferLegacyVetVisitReasonCategory(event: LegacyHealthEvent): VetVisitReasonCategory {
  return toVetVisitReasonCategory(event.metadata?.reasonCategory);
}

export function isSameMedicalEvent(legacyEvent: LegacyHealthEvent, canonicalEvent: MedicalEvent): boolean {
  if (legacyEvent.petId !== canonicalEvent.petId) return false;

  const explicitLegacyId = getMetadataString(canonicalEvent.metadataJson, 'legacyEventId');
  if (explicitLegacyId && explicitLegacyId === normalizeText(legacyEvent.id)) return true;
  if (canonicalEvent.id === `legacy-med-${legacyEvent.id}`) return true;

  const sameType = mapLegacyHealthEventToMedicalType(legacyEvent) === canonicalEvent.type;
  if (!sameType) return false;

  const sameDay = normalizeDateDay(legacyEvent.date) === normalizeDateDay(canonicalEvent.eventDate);
  if (!sameDay) return false;

  const sameTitle = normalizeText(legacyEvent.title) === normalizeText(canonicalEvent.title);
  if (!sameTitle) return false;

  const legacyCategory = getMetadataString(legacyEvent.metadata, 'category');
  const canonicalSubcategory = normalizeText(canonicalEvent.subcategory);
  if (legacyCategory && canonicalSubcategory && legacyCategory !== canonicalSubcategory) return false;

  return true;
}

export function isSameVetVisit(legacyEvent: LegacyHealthEvent, canonicalVisit: VetVisit): boolean {
  if (legacyEvent.petId !== canonicalVisit.petId) return false;
  if (canonicalVisit.id === `legacy-visit-${legacyEvent.id}`) return true;

  const sameDay = normalizeDateDay(legacyEvent.date) === normalizeDateDay(canonicalVisit.visitDate);
  if (!sameDay) return false;

  const legacyClinic = getMetadataString(legacyEvent.metadata, 'clinic');
  const canonicalClinic = normalizeText(canonicalVisit.clinicName);
  const sameClinic = legacyClinic && canonicalClinic ? legacyClinic === canonicalClinic : false;

  const legacyAmount = getMetadataNumber(legacyEvent.metadata, 'amount');
  const canonicalAmount = normalizeNumber(canonicalVisit.amount);
  const sameAmount = legacyAmount != null && canonicalAmount != null ? legacyAmount === canonicalAmount : false;

  const inferredReason = inferLegacyVetVisitReasonCategory(legacyEvent);
  const sameReason = inferredReason !== 'other' && canonicalVisit.reasonCategory === inferredReason;

  return sameClinic || sameAmount || sameReason;
}

function getLegacyWeightValue(event: LegacyHealthEvent): number | null {
  return getMetadataNumber(event.metadata, 'value');
}

export function isSameWeightEntry(legacyEvent: LegacyHealthEvent, canonicalWeight: WeightPoint): boolean {
  const legacyValue = getLegacyWeightValue(legacyEvent);
  if (legacyValue == null) return false;

  const sameDay = normalizeDateDay(legacyEvent.date) === normalizeDateDay(canonicalWeight.date);
  if (!sameDay) return false;

  const canonicalValue = normalizeNumber(canonicalWeight.value);
  return canonicalValue != null && canonicalValue === legacyValue;
}

export function toWeightPointFromLegacyEvent(event: LegacyHealthEvent): WeightPoint | null {
  if (event.type !== 'weight') return null;
  const value = getLegacyWeightValue(event);
  if (value == null) return null;

  const label = typeof event.metadata?.label === 'string' && event.metadata.label.trim().length > 0
    ? event.metadata.label
    : event.date;

  return {
    label,
    value,
    date: event.date,
    change: event.description ?? '',
  };
}
