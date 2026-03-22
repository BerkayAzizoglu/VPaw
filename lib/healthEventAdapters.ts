import type { PetProfile } from '../components/AuthGate';
import type { VisitItem } from '../screens/VetVisitsScreen';
import type { HealthRecordsData } from '../screens/HealthRecordsScreen';
import type { VaccinationsAttentionCounts, VaccinationsHistoryItem, VaccinationsNextUpData } from '../screens/VaccinationsScreen';

type PetId = 'luna' | 'milo';

type HealthEventType = 'vaccination' | 'vet_visit' | 'health_note' | 'weight' | 'other';

type HealthEvent = {
  id: string;
  petId: PetId;
  type: HealthEventType;
  title: string;
  description?: string;
  date: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateMs(value: string | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function toDateLabel(value: string | undefined) {
  if (!value) return '';
  const ms = parseDateMs(value);
  if (ms == null) return value;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusFromDate(date: string): 'overdue' | 'dueSoon' | 'upToDate' {
  const nowMs = Date.now();
  const dueMs = parseDateMs(date);
  if (dueMs == null) return 'upToDate';
  const diffDays = Math.floor((dueMs - nowMs) / DAY_MS);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'dueSoon';
  return 'upToDate';
}

function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMs = parseDateMs(a.date) ?? 0;
    const bMs = parseDateMs(b.date) ?? 0;
    return bMs - aMs;
  });
}

function ensureString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

export function getVaccinationsFromEvents(
  petId: PetId,
  healthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): {
  historyItems: VaccinationsHistoryItem[];
  attentionCounts: VaccinationsAttentionCounts;
  nextUpData?: VaccinationsNextUpData;
} | null {
  const rawEvents = sortByDateDesc((healthEventsByPet[petId] ?? []).filter((e) => e.type === 'vaccination'));

  const eventHistory = rawEvents.map((event) => {
    const status = getStatusFromDate(event.date);
    const subtitle = ensureString(event.description, legacyProfile?.vaccines ?? 'Vaccination');
    return {
      name: ensureString(event.title, 'Vaccination'),
      subtitle,
      status,
      dueDate: toDateLabel(event.date),
      tint: status === 'overdue' ? 'danger' : 'neutral',
    } satisfies VaccinationsHistoryItem;
  });

  const legacyHistory = (legacyProfile?.vaccinations ?? []).map((item) => {
    const status = getStatusFromDate(item.date);
    return {
      name: item.name,
      subtitle: legacyProfile?.vaccines || 'Vaccination',
      status,
      dueDate: toDateLabel(item.date),
      tint: status === 'overdue' ? 'danger' : 'neutral',
    } satisfies VaccinationsHistoryItem;
  });

  const historyItems = eventHistory.length > 0 ? eventHistory : legacyHistory;
  if (historyItems.length === 0) return null;

  const attentionCounts = historyItems.reduce(
    (acc, item) => {
      if (item.status === 'overdue') acc.overdueCount += 1;
      if (item.status === 'dueSoon') acc.dueSoonCount += 1;
      return acc;
    },
    { overdueCount: 0, dueSoonCount: 0 } satisfies VaccinationsAttentionCounts,
  );

  const nextUpCandidate = [...historyItems]
    .filter((item) => item.status !== 'overdue')
    .sort((a, b) => (parseDateMs(a.dueDate) ?? Number.MAX_SAFE_INTEGER) - (parseDateMs(b.dueDate) ?? Number.MAX_SAFE_INTEGER))[0]
    ?? historyItems[0];

  const nextDateMs = parseDateMs(nextUpCandidate?.dueDate);
  const diffWeeks = nextDateMs == null ? null : Math.max(0, Math.ceil((nextDateMs - Date.now()) / (7 * DAY_MS)));
  const nextUpData = nextUpCandidate
    ? {
        name: nextUpCandidate.name,
        subtitle: nextUpCandidate.subtitle,
        date: nextUpCandidate.dueDate,
        inWeeks: diffWeeks == null ? 'Soon' : diffWeeks <= 1 ? 'in 1 week' : `in ${diffWeeks} weeks`,
      }
    : undefined;

  return { historyItems, attentionCounts, nextUpData };
}

export function getVetVisitsFromEvents(
  petId: PetId,
  healthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): VisitItem[] | null {
  const events = sortByDateDesc((healthEventsByPet[petId] ?? []).filter((e) => e.type === 'vet_visit'));
  const eventVisits: VisitItem[] = events.map((event, index) => {
    const metadata = event.metadata ?? {};
    const amountValue = typeof metadata.amount === 'number' ? metadata.amount : null;
    const amountText = typeof metadata.amountText === 'string'
      ? metadata.amountText
      : amountValue != null
        ? `$${amountValue.toFixed(2)}`
        : undefined;

    return {
      id: event.id || `vet-${petId}-${index}`,
      icon: metadata.icon === 'pulse' ? 'pulse' : 'stethoscope',
      date: toDateLabel(event.date) || 'Mar 1, 2026',
      title: ensureString(event.title, 'Vet Visit'),
      clinic: ensureString(metadata.clinic, 'Downtown Vet Clinic'),
      doctor: ensureString(metadata.doctor, 'Dr. Sarah Jenkins'),
      amount: amountText,
      paymentText: typeof metadata.paymentText === 'string' ? metadata.paymentText : undefined,
      attachments: Array.isArray(metadata.attachments) ? metadata.attachments.filter((x): x is string => typeof x === 'string') : [],
      attachPlaceholder: Boolean(metadata.attachPlaceholder),
    };
  });

  if (eventVisits.length > 0) return eventVisits;

  const surgeries = legacyProfile?.surgeriesLog ?? [];
  if (surgeries.length === 0) return null;

  return surgeries.map((surgery, index) => ({
    id: `legacy-vet-${petId}-${index}`,
    icon: 'stethoscope',
    date: toDateLabel(surgery.date) || surgery.date,
    title: surgery.name,
    clinic: 'Veterinary Clinic',
    doctor: surgery.note || 'Veterinarian',
    attachments: [],
    attachPlaceholder: true,
  }));
}

export function getHealthRecordsFromEvents(
  petId: PetId,
  healthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): HealthRecordsData | null {
  const healthEvents = sortByDateDesc((healthEventsByPet[petId] ?? []).filter((e) => e.type === 'health_note'));

  const allergies = healthEvents.filter((e) => e.metadata?.category === 'allergy');
  const diagnoses = healthEvents.filter((e) => e.metadata?.category === 'diagnosis' || e.metadata?.category === 'surgery');
  const labResults = healthEvents.filter((e) => e.metadata?.category === 'lab_result');
  const activeCount = healthEvents.filter((e) => e.metadata?.status === 'active').length;

  const fromLegacy = (legacyProfile?.allergiesLog ?? []).map((item, index) => ({
    id: `legacy-allergy-${petId}-${index}`,
    petId,
    type: 'health_note' as HealthEventType,
    title: item.category,
    description: item.status,
    date: item.date,
    metadata: { category: 'allergy', severity: item.severity, status: item.status },
    createdAt: item.date,
    updatedAt: item.date,
  }));

  const allergiesSource = allergies.length > 0 ? allergies : fromLegacy;

  if (allergiesSource.length === 0 && diagnoses.length === 0 && labResults.length === 0) return null;

  const pickCard = (items: HealthEvent[], fallbackTitle: string) => {
    const primary = items[0];
    const secondary = items[1];
    const status = primary?.metadata?.status;
    const severity = ensureString(primary?.metadata?.severity, 'Medium');
    return {
      activeTitle: ensureString(primary?.title, fallbackTitle),
      activeDate: toDateLabel(primary?.date),
      activeBody: ensureString(primary?.description, 'Record details are available.'),
      activeBadge: status === 'resolved' ? 'Resolved' : status === 'active' ? 'Active' : 'Monitoring',
      activeSeverity: severity.charAt(0).toUpperCase() + severity.slice(1),
      historyTitle: ensureString(secondary?.title, ensureString(primary?.title, fallbackTitle)),
      historyDate: toDateLabel(secondary?.date || primary?.date),
      historyBody: ensureString(secondary?.description, 'Previous record details are available.'),
      resolvedBadge: 'Resolved',
      historySeverity: 'Low',
    };
  };

  return {
    recordsCountText: `${healthEvents.length || allergiesSource.length} Records`,
    activeCountText: `${Math.max(activeCount, 1)} Active`,
    upToDateText: activeCount === 0 ? 'Up to date' : 'Monitoring',
    bySegment: {
      allergies: pickCard(allergiesSource, 'Allergy Record'),
      diagnoses: pickCard(diagnoses, 'Diagnosis'),
      labResults: pickCard(labResults, 'Lab Result'),
    },
  };
}
