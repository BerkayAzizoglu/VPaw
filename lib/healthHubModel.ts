import type { HealthDocumentItem, HealthDocumentType } from './healthDocumentsVault';
import type { MedicalEvent, VetVisit, WeightPoint } from './healthMvpModel';

export type HealthRecordCanonicalType =
  | 'diagnosis'
  | 'allergy'
  | 'condition'
  | 'treatment'
  | 'lab_result'
  | 'procedure'
  | 'note';

export type HealthHubVetVisitEntity = {
  id: string;
  pet_id: string;
  visit_date: string;
  clinic_name?: string;
  vet_name?: string;
  reason: string;
  notes?: string;
  follow_up_date?: string;
};

export type HealthHubVaccinationEntity = {
  id: string;
  pet_id: string;
  related_visit_id?: string;
  vaccine_name: string;
  application_date: string;
  next_due_date?: string;
  clinic_name?: string;
  vet_name?: string;
  status?: string;
};

export type HealthHubRecordEntity = {
  id: string;
  pet_id: string;
  related_visit_id?: string;
  record_type: HealthRecordCanonicalType;
  title: string;
  description?: string;
  record_date: string;
  status?: string;
};

export type HealthHubWeightLogEntity = {
  id: string;
  pet_id: string;
  weight: number;
  logged_at: string;
  note?: string;
};

export type HealthHubDocumentEntity = {
  id: string;
  pet_id: string;
  related_visit_id?: string;
  related_record_id?: string;
  related_vaccine_id?: string;
  document_type: HealthDocumentType;
  file_url?: string;
  file_name: string;
  uploaded_at?: string;
  taken_at?: string;
};

export type ProjectedHealthHubData = {
  vet_visits: HealthHubVetVisitEntity[];
  vaccinations: HealthHubVaccinationEntity[];
  health_records: HealthHubRecordEntity[];
  weight_logs: HealthHubWeightLogEntity[];
  documents: HealthHubDocumentEntity[];
};

function normalizeRecordSubtype(value: unknown): HealthRecordCanonicalType | null {
  if (typeof value !== 'string') return null;
  if (value === 'diagnosis') return 'diagnosis';
  if (value === 'allergy') return 'allergy';
  if (value === 'condition') return 'condition';
  if (value === 'treatment') return 'treatment';
  if (value === 'lab_result') return 'lab_result';
  if (value === 'procedure') return 'procedure';
  if (value === 'note') return 'note';
  return null;
}

function pickExplicitRecordType(event: MedicalEvent): HealthRecordCanonicalType | null {
  const metadata = event.metadataJson;
  if (!metadata || typeof metadata !== 'object') return null;
  const explicit =
    normalizeRecordSubtype((metadata as Record<string, unknown>).record_type)
    ?? normalizeRecordSubtype((metadata as Record<string, unknown>).recordType)
    ?? normalizeRecordSubtype((metadata as Record<string, unknown>).subtype)
    ?? normalizeRecordSubtype((metadata as Record<string, unknown>).category);
  return explicit;
}

function mapMedicalEventToRecordType(event: MedicalEvent): HealthRecordCanonicalType {
  const explicit = pickExplicitRecordType(event) ?? normalizeRecordSubtype(event.subcategory);
  if (explicit) return explicit;
  if (event.type === 'diagnosis') return 'diagnosis';
  if (event.type === 'procedure') return 'procedure';
  if (event.type === 'test') return 'lab_result';
  if (event.type === 'prescription') return 'treatment';
  return 'note';
}

function reasonLabelFromVisit(visit: VetVisit) {
  if (visit.reasonCategory === 'checkup') return 'checkup';
  if (visit.reasonCategory === 'vaccine') return 'vaccination';
  if (visit.reasonCategory === 'illness') return 'illness';
  if (visit.reasonCategory === 'injury') return 'injury';
  if (visit.reasonCategory === 'follow_up') return 'follow_up';
  return 'other';
}

export function projectHealthHubData(params: {
  petId: string;
  vetVisits: VetVisit[];
  medicalEvents: MedicalEvent[];
  weights: WeightPoint[];
  documents: HealthDocumentItem[];
}): ProjectedHealthHubData {
  const { petId, vetVisits, medicalEvents, weights, documents } = params;
  const eventById = new Map(medicalEvents.map((event) => [event.id, event]));

  const vet_visits = vetVisits.map((visit) => ({
    id: visit.id,
    pet_id: petId,
    visit_date: visit.visitDate,
    clinic_name: visit.clinicName,
    vet_name: visit.vetName,
    reason: reasonLabelFromVisit(visit),
    notes: visit.notes,
    follow_up_date: visit.followUpDate,
  }));

  const vaccinations = medicalEvents
    .filter((event) => event.type === 'vaccine')
    .map((event) => {
      const relatedVisit = event.vetVisitId ? vetVisits.find((visit) => visit.id === event.vetVisitId) : undefined;
      return {
        id: event.id,
        pet_id: petId,
        related_visit_id: event.vetVisitId,
        vaccine_name: event.title,
        application_date: event.eventDate,
        next_due_date: event.dueDate,
        clinic_name: relatedVisit?.clinicName,
        vet_name: relatedVisit?.vetName,
        status: event.status,
      } satisfies HealthHubVaccinationEntity;
    });

  const health_records = medicalEvents
    .filter((event) => event.type !== 'vaccine' && event.type !== 'attachment')
    .map((event) => ({
      id: event.id,
      pet_id: petId,
      related_visit_id: event.vetVisitId,
      record_type: mapMedicalEventToRecordType(event),
      title: event.title,
      description: event.note,
      record_date: event.eventDate,
      status: event.status,
    }));

  const weight_logs = weights.map((entry, index) => ({
    id: `weight-${petId}-${index}-${entry.date}`,
    pet_id: petId,
    weight: entry.value,
    logged_at: entry.date,
    note: entry.note ?? entry.change,
  }));

  const projectedDocuments = documents.map((document) => {
    const relatedEvent = document.sourceType === 'medical_event' ? eventById.get(document.sourceId) : undefined;
    return {
      id: document.id,
      pet_id: petId,
      related_visit_id: document.sourceType === 'vet_visit'
        ? document.sourceId
        : relatedEvent?.vetVisitId,
      related_record_id: relatedEvent && relatedEvent.type !== 'vaccine'
        ? relatedEvent.id
        : undefined,
      related_vaccine_id: relatedEvent?.type === 'vaccine'
        ? relatedEvent.id
        : undefined,
      document_type: document.type,
      file_url: document.fileUrl,
      file_name: document.title,
      uploaded_at: document.date,
      taken_at: document.date,
    } satisfies HealthHubDocumentEntity;
  });

  return {
    vet_visits,
    vaccinations,
    health_records,
    weight_logs,
    documents: projectedDocuments,
  };
}
