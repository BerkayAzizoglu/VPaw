import type { UnifiedHealthEvent } from './unifiedHealthEvents';

export type TimelineLocale = 'en' | 'tr';
export type SharedHealthStatus = 'Needs attention' | 'Due soon' | 'Up to date' | 'No data';
export type HealthPreviewType = 'vaccine' | 'vet' | 'record' | 'weight';

export type HubTimelinePreviewItem = {
  id: string;
  sourceEventId: string;
  type: HealthPreviewType;
  date: string;
  title: string;
  notes?: string;
  metaLine?: string;
  statusLabel: SharedHealthStatus;
};

export type HomeTimelinePreviewItem = {
  id: string;
  sourceEventId: string;
  eventType: HealthPreviewType;
  title: string;
  subtitle?: string;
  date: string;
};

type TimelineBuildOptions = {
  events: UnifiedHealthEvent[];
  locale: TimelineLocale;
  limit?: number;
  nowMs?: number;
  formatDateLabel: (value: string, locale: TimelineLocale) => string;
};

function formatShortDate(raw: unknown, locale: TimelineLocale) {
  if (typeof raw !== 'string') return null;
  const ms = new Date(raw).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(ms));
}

function mapRecordSubtype(rawType: unknown, locale: TimelineLocale) {
  if (rawType === 'diagnosis') return locale === 'tr' ? 'Teshis' : 'Diagnosis';
  if (rawType === 'procedure') return locale === 'tr' ? 'Prosedur' : 'Procedure';
  if (rawType === 'test') return locale === 'tr' ? 'Lab sonucu' : 'Lab result';
  if (rawType === 'prescription') return locale === 'tr' ? 'Tedavi' : 'Treatment';
  if (rawType === 'note') return locale === 'tr' ? 'Klinik not' : 'Clinical note';
  return locale === 'tr' ? 'Saglik kaydi' : 'Health record';
}

function resolveStatus(item: UnifiedHealthEvent, nowMs: number): SharedHealthStatus {
  if (item.type === 'vaccine') {
    const dueMs = typeof item.metadata?.dueDate === 'string' ? new Date(item.metadata.dueDate).getTime() : Number.NaN;
    if (Number.isFinite(dueMs) && dueMs < nowMs) return 'Needs attention';
    if (Number.isFinite(dueMs) && dueMs - nowMs <= 14 * 24 * 60 * 60 * 1000) return 'Due soon';
    return 'Up to date';
  }

  if (item.type === 'vet') {
    const status = typeof item.metadata?.status === 'string' ? item.metadata.status : '';
    const visitMs = new Date(item.date).getTime();
    if (status === 'planned' && Number.isFinite(visitMs) && visitMs < nowMs) return 'Needs attention';
    if (status === 'planned') return 'Due soon';
    return 'Up to date';
  }

  if (item.type === 'record') {
    const status = typeof item.metadata?.status === 'string' ? item.metadata.status : '';
    if (status === 'abnormal' || status === 'active') return 'Needs attention';
    return 'Up to date';
  }

  if (item.type === 'weight') {
    const weightMs = new Date(item.date).getTime();
    if (Number.isFinite(weightMs) && nowMs - weightMs > 21 * 24 * 60 * 60 * 1000) return 'Due soon';
    return 'Up to date';
  }

  return 'No data';
}

function buildMetaLine(item: UnifiedHealthEvent, locale: TimelineLocale) {
  if (item.type === 'vet') {
    return [
      typeof item.metadata?.clinicName === 'string' ? item.metadata.clinicName : null,
      formatShortDate(item.metadata?.followUpDate, locale),
    ].filter(Boolean).join(' · ');
  }

  if (item.type === 'vaccine') {
    const dueDate = typeof item.metadata?.dueDate === 'string' ? item.metadata.dueDate : undefined;
    return dueDate
      ? `${locale === 'tr' ? 'Next due' : 'Next due'} · ${formatShortDate(dueDate, locale) ?? dueDate}`
      : (locale === 'tr' ? 'Asi takibi' : 'Vaccination log');
  }

  if (item.type === 'weight') {
    return [
      typeof item.metadata?.value === 'number' ? `${(item.metadata.value as number).toFixed(1)} kg` : null,
      typeof item.metadata?.change === 'string' ? item.metadata.change : null,
    ].filter(Boolean).join(' · ');
  }

  return mapRecordSubtype(item.metadata?.originalType, locale);
}

function toPreviewType(type: UnifiedHealthEvent['type']): HealthPreviewType {
  if (type === 'vaccine') return 'vaccine';
  if (type === 'vet') return 'vet';
  if (type === 'weight') return 'weight';
  return 'record';
}

export function buildHubTimelinePreview({
  events,
  locale,
  limit = 60,
  nowMs = Date.now(),
  formatDateLabel,
}: TimelineBuildOptions): HubTimelinePreviewItem[] {
  return events.slice(0, limit).map((item) => ({
    id: item.id,
    sourceEventId: item.id,
    type: toPreviewType(item.type),
    date: formatDateLabel(item.date, locale),
    title: item.title || (locale === 'tr' ? 'Saglik olayi' : 'Health event'),
    notes: item.notes,
    metaLine: buildMetaLine(item, locale),
    statusLabel: resolveStatus(item, nowMs),
  }));
}

export function buildHomeTimelinePreview({
  events,
  locale,
  limit = 12,
  formatDateLabel,
}: TimelineBuildOptions): HomeTimelinePreviewItem[] {
  return events.slice(0, limit).map((item) => ({
    id: item.id,
    sourceEventId: item.id,
    eventType: toPreviewType(item.type),
    title: item.title || (locale === 'tr' ? 'Saglik kaydi' : 'Health record'),
    subtitle: item.type === 'record' ? mapRecordSubtype(item.metadata?.originalType, locale) : undefined,
    date: formatDateLabel(item.date, locale),
  }));
}

export function dedupeJourneyEventsBySource<T extends { id: string; sourceEventId?: string }>(
  items: T[],
  limit: number,
) {
  const unique: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const dedupeKey = item.sourceEventId || item.id;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}
