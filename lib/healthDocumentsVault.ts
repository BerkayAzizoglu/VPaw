import type { WeightPoint, ByPet, MedicalEvent, VetVisit } from './healthMvpModel';

export type HealthDocumentSourceType = 'vet_visit' | 'medical_event';
export type HealthDocumentType = 'lab' | 'prescription' | 'document' | 'image' | 'other';

export type HealthDocumentItem = {
  id: string;
  petId: string;
  type: HealthDocumentType;
  title: string;
  date: string;
  sourceType: HealthDocumentSourceType;
  sourceId: string;
  /** Reserved for future file viewer. Not rendered in DocumentsScreen yet.
   *  If set, this is a local path or remote URL — local paths will not be
   *  accessible after reinstall or on a different device. */
  fileUrl?: string;
  note?: string;
};

type DocumentsAggregateState = {
  vetVisitsByPet: ByPet<VetVisit>;
  medicalEventsByPet: ByPet<MedicalEvent>;
  // reserved for compatibility with existing call sites and future document sources
  weightsByPet?: Record<string, WeightPoint[]>;
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function normalizeDate(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value.trim();
  return new Date(ms).toISOString().slice(0, 10);
}

function parseDateMs(value: string) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function inferDocumentType(rawType: unknown): HealthDocumentType {
  const value = normalizeText(rawType);
  if (value === 'test' || value === 'lab' || value === 'lab_result') return 'lab';
  if (value === 'prescription' || value === 'rx' || value === 'medication') return 'prescription';
  if (value === 'image' || value === 'photo' || value === 'scan') return 'image';
  if (value === 'attachment' || value === 'document' || value === 'file' || value === 'pdf') return 'document';
  return 'other';
}

function pickFileUrl(raw: Record<string, unknown> | undefined): string | undefined {
  if (!raw) return undefined;
  const candidates = [raw.fileUrl, raw.file_url, raw.uri, raw.url, raw.path];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
  }
  return undefined;
}

function makeDedupKey(item: HealthDocumentItem) {
  const byId = normalizeText(item.id);
  if (byId) return `id:${byId}`;
  const date = normalizeDate(item.date);
  const title = normalizeText(item.title);
  const sourceId = normalizeText(item.sourceId);
  return `sig:${date}|${title}|${sourceId}`;
}

export function getAllDocumentsForPet(
  petId: string,
  state: DocumentsAggregateState,
): HealthDocumentItem[] {
  const fromMedicalEvents: HealthDocumentItem[] = (state.medicalEventsByPet[petId] ?? [])
    .filter((event) => event.type === 'attachment' || event.type === 'test' || event.type === 'prescription')
    .map((event) => {
      const metadata = event.metadataJson && typeof event.metadataJson === 'object'
        ? (event.metadataJson as Record<string, unknown>)
        : undefined;

      const sourceType: HealthDocumentSourceType = event.vetVisitId ? 'vet_visit' : 'medical_event';
      const sourceId = event.vetVisitId ?? event.id;
      return {
        id: event.id,
        petId,
        type: inferDocumentType(event.type),
        title: event.title || 'Document',
        date: event.eventDate || event.createdAt,
        sourceType,
        sourceId,
        fileUrl: pickFileUrl(metadata),
        note: event.note,
      } satisfies HealthDocumentItem;
    });

  const fromVetVisits: HealthDocumentItem[] = [];
  (state.vetVisitsByPet[petId] ?? []).forEach((visit) => {
    const raw = (visit as unknown as { attachments?: unknown }).attachments;
    if (!Array.isArray(raw)) return;
    raw.forEach((item, index) => {
      if (typeof item === 'string') {
        const clean = item.trim();
        if (!clean) return;
        fromVetVisits.push({
          id: `${visit.id}-attachment-${index}`,
          petId,
          type: inferDocumentType(clean),
          title: clean,
          date: visit.visitDate,
          sourceType: 'vet_visit',
          sourceId: visit.id,
          fileUrl: clean,
        });
        return;
      }
      if (!item || typeof item !== 'object') return;
      const attachment = item as Record<string, unknown>;
      const title = typeof attachment.title === 'string' && attachment.title.trim().length > 0
        ? attachment.title.trim()
        : `Visit document ${index + 1}`;
      const explicitId = typeof attachment.id === 'string' && attachment.id.trim().length > 0
        ? attachment.id.trim()
        : `${visit.id}-attachment-${index}`;
      fromVetVisits.push({
        id: explicitId,
        petId,
        type: inferDocumentType(attachment.type),
        title,
        date: typeof attachment.date === 'string' ? attachment.date : visit.visitDate,
        sourceType: 'vet_visit',
        sourceId: visit.id,
        fileUrl: pickFileUrl(attachment),
        note: typeof attachment.note === 'string' ? attachment.note : undefined,
      });
    });
  });

  const all = [...fromMedicalEvents, ...fromVetVisits];
  const deduped: HealthDocumentItem[] = [];
  const seen = new Set<string>();

  all.forEach((item) => {
    const key = makeDedupKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  deduped.sort((a, b) => parseDateMs(b.date) - parseDateMs(a.date));
  return deduped;
}
