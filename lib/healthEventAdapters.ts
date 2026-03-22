import type { PetProfile } from '../components/AuthGate';
import type { VisitItem } from '../screens/VetVisitsScreen';
import type { HealthRecordsData } from '../screens/HealthRecordsScreen';
import type { VaccinationsAttentionCounts, VaccinationsHistoryItem, VaccinationsNextUpData } from '../screens/VaccinationsScreen';
import type {
  ByPet,
  MedicalEvent as MvpMedicalEvent,
  MedicationCourse,
  Reminder,
  VetVisit as MvpVetVisit,
} from './healthMvpModel';

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

export function getVaccinesForUI(
  petId: PetId,
  medicalEventsByPet: ByPet<MvpMedicalEvent>,
  legacyHealthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): {
  historyItems: VaccinationsHistoryItem[];
  attentionCounts: VaccinationsAttentionCounts;
  nextUpData?: VaccinationsNextUpData;
} | null {
  const vaccineEvents = (medicalEventsByPet[petId] ?? []).filter((event) => event.type === 'vaccine');
  if (vaccineEvents.length === 0) {
    return getVaccinationsFromEvents(petId, legacyHealthEventsByPet, legacyProfile);
  }

  const syntheticHealthEvents: HealthEvent[] = vaccineEvents.map((event) => ({
    id: `mvp-vaccine-${event.id}`,
    petId,
    type: 'vaccination',
    title: event.title,
    description: event.note,
    date: event.eventDate,
    metadata: {
      vaccineType: event.subcategory ?? event.title,
      source: 'mvp-medical-event',
    },
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }));

  return getVaccinationsFromEvents(
    petId,
    {
      ...legacyHealthEventsByPet,
      [petId]: syntheticHealthEvents,
    },
    legacyProfile,
  );
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

function getVisitFallbackTitle(reason: MvpVetVisit['reasonCategory']) {
  if (reason === 'checkup') return 'General Checkup';
  if (reason === 'vaccine') return 'Vaccination Visit';
  if (reason === 'illness') return 'Illness Visit';
  if (reason === 'injury') return 'Injury Visit';
  if (reason === 'follow_up') return 'Follow-up Visit';
  return 'Vet Visit';
}

function getPrimaryEventForVisit(events: MvpMedicalEvent[]) {
  const sorted = [...events].sort((a, b) => (parseDateMs(b.eventDate) ?? 0) - (parseDateMs(a.eventDate) ?? 0));
  return sorted[0];
}

export function getVetVisitsForUI(
  petId: PetId,
  vetVisitsByPet: ByPet<MvpVetVisit>,
  medicalEventsByPet: ByPet<MvpMedicalEvent>,
  legacyHealthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): VisitItem[] | null {
  const visits = [...(vetVisitsByPet[petId] ?? [])].sort((a, b) => (parseDateMs(b.visitDate) ?? 0) - (parseDateMs(a.visitDate) ?? 0));
  if (visits.length === 0) {
    return getVetVisitsFromEvents(petId, legacyHealthEventsByPet, legacyProfile);
  }

  const visitAsHealthEvents: HealthEvent[] = visits.map((visit) => {
    const relatedEvents = (medicalEventsByPet[petId] ?? []).filter((event) => event.vetVisitId === visit.id);
    const primary = getPrimaryEventForVisit(relatedEvents);
    const attachments = relatedEvents
      .filter((event) => event.type === 'attachment' || event.type === 'test' || event.type === 'prescription')
      .map((event) => event.title)
      .filter((title) => title && title.trim().length > 0);

    return {
      id: `mvp-vet-${visit.id}`,
      petId,
      type: 'vet_visit',
      title: primary?.title || getVisitFallbackTitle(visit.reasonCategory),
      description: visit.notes,
      date: visit.visitDate,
      metadata: {
        icon: primary?.type === 'test' ? 'pulse' : 'stethoscope',
        clinic: visit.clinicName || 'Veterinary Clinic',
        doctor: visit.vetName || 'Veterinarian',
        paymentText: visit.status === 'planned' ? 'Planned' : 'Recorded',
        attachments,
        attachPlaceholder: attachments.length === 0,
      },
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
    };
  });

  return getVetVisitsFromEvents(
    petId,
    {
      ...legacyHealthEventsByPet,
      [petId]: visitAsHealthEvents,
    },
    legacyProfile,
  );
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

function mapMedicalEventTypeToLegacyCategory(type: MvpMedicalEvent['type']): string {
  if (type === 'diagnosis') return 'diagnosis';
  if (type === 'procedure') return 'surgery';
  if (type === 'test') return 'lab_result';
  if (type === 'prescription') return 'treatment';
  if (type === 'note') return 'general';
  return 'general';
}

export function getHealthRecordsForUI(
  petId: PetId,
  medicalEventsByPet: ByPet<MvpMedicalEvent>,
  legacyHealthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): HealthRecordsData | null {
  const supportedTypes: MvpMedicalEvent['type'][] = ['diagnosis', 'procedure', 'test', 'prescription', 'note'];
  const records = (medicalEventsByPet[petId] ?? []).filter((event) => supportedTypes.includes(event.type));
  if (records.length === 0) {
    return getHealthRecordsFromEvents(petId, legacyHealthEventsByPet, legacyProfile);
  }

  const syntheticHealthEvents: HealthEvent[] = records.map((event) => ({
    id: `mvp-record-${event.id}`,
    petId,
    type: 'health_note',
    title: event.title,
    description: event.note,
    date: event.eventDate,
    metadata: {
      category: mapMedicalEventTypeToLegacyCategory(event.type),
      status: event.status ?? 'active',
      source: 'mvp-medical-event',
    },
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }));

  return getHealthRecordsFromEvents(
    petId,
    {
      ...legacyHealthEventsByPet,
      [petId]: syntheticHealthEvents,
    },
    legacyProfile,
  );
}

export type HealthCardExportRowKey = 'vaccines' | 'visits' | 'health' | 'weight' | 'allergy' | 'surgery' | 'meds';

export type HealthCardSummary = {
  lastVisit: {
    title: string;
    date: string;
    clinic?: string;
    doctor?: string;
  } | null;
  vaccinesSummary: {
    latest: string | null;
    next: string | null;
    total: number;
  };
  activeMedications: Array<{
    name: string;
    startDate: string;
    status: string;
  }>;
  recentEvents: Array<{
    id: string;
    title: string;
    category: string;
    date: string;
    note?: string;
  }>;
  alerts: string[];
  exportRows: Record<HealthCardExportRowKey, string[]>;
};

function categoryLabelFromMedicalEventType(type: MvpMedicalEvent['type']) {
  if (type === 'diagnosis') return 'Diagnosis';
  if (type === 'procedure') return 'Procedure';
  if (type === 'test') return 'Test / Imaging';
  if (type === 'prescription') return 'Medication / Treatment';
  if (type === 'vaccine') return 'Vaccine';
  return 'General';
}

export function getHealthCardSummary(
  petId: PetId,
  vetVisitsByPet: ByPet<MvpVetVisit>,
  medicalEventsByPet: ByPet<MvpMedicalEvent>,
  remindersByPet: ByPet<Reminder>,
  medicationCoursesByPet: ByPet<MedicationCourse>,
  weightEntries: Array<{ value: number; date: string }>,
  legacyHealthEventsByPet: Record<PetId, HealthEvent[]>,
  legacyProfile?: PetProfile,
): HealthCardSummary {
  const visits = [...(vetVisitsByPet[petId] ?? [])].sort((a, b) => (parseDateMs(b.visitDate) ?? 0) - (parseDateMs(a.visitDate) ?? 0));
  const medicalEvents = [...(medicalEventsByPet[petId] ?? [])].sort((a, b) => (parseDateMs(b.eventDate) ?? 0) - (parseDateMs(a.eventDate) ?? 0));
  const reminders = remindersByPet[petId] ?? [];
  const medications = (medicationCoursesByPet[petId] ?? []).filter((course) => course.status === 'active');

  const hasNewModelData = visits.length > 0 || medicalEvents.length > 0 || reminders.length > 0 || medications.length > 0;

  if (!hasNewModelData) {
    const legacyVisits = getVetVisitsFromEvents(petId, legacyHealthEventsByPet, legacyProfile) ?? [];
    const legacyVaccines = getVaccinationsFromEvents(petId, legacyHealthEventsByPet, legacyProfile);
    const legacyHealth = getHealthRecordsFromEvents(petId, legacyHealthEventsByPet, legacyProfile);
    const legacyWeight = weightEntries.map((entry) => `${entry.value.toFixed(1)} kg • ${entry.date}`);
    const legacyAllergies = (legacyProfile?.allergiesLog ?? []).map((item) => `${item.category} • ${item.status}`);
    const legacySurgeries = (legacyProfile?.surgeriesLog ?? []).map((item) => `${item.name} • ${item.date}`);
    const legacyMeds = (legacyProfile?.diabetesLog ?? []).map((item) => `${item.type} • ${item.status}`);

    return {
      lastVisit: legacyVisits.length > 0 ? {
        title: legacyVisits[0].title,
        date: legacyVisits[0].date,
        clinic: legacyVisits[0].clinic,
        doctor: legacyVisits[0].doctor,
      } : null,
      vaccinesSummary: {
        latest: legacyVaccines?.historyItems?.[0]?.name ?? null,
        next: legacyVaccines?.nextUpData?.name ?? null,
        total: legacyVaccines?.historyItems?.length ?? 0,
      },
      activeMedications: [],
      recentEvents: [],
      alerts: [],
      exportRows: {
        vaccines: legacyVaccines?.historyItems?.slice(0, 5).map((item) => `${item.name} • ${item.dueDate}`) ?? ['Rabies • Apr 12, 2026'],
        visits: legacyVisits.slice(0, 5).map((item) => `${item.title} • ${item.date}`),
        health: [
          legacyHealth?.bySegment?.allergies?.activeTitle,
          legacyHealth?.bySegment?.diagnoses?.activeTitle,
          legacyHealth?.bySegment?.labResults?.activeTitle,
        ].filter((item): item is string => Boolean(item)).slice(0, 5),
        weight: legacyWeight.length ? legacyWeight.slice(-5).reverse() : ['5.2 kg • Apr 15, 2026'],
        allergy: legacyAllergies.length ? legacyAllergies.slice(0, 5) : ['No allergy records'],
        surgery: legacySurgeries.length ? legacySurgeries.slice(0, 5) : ['No surgery records'],
        meds: legacyMeds.length ? legacyMeds.slice(0, 5) : ['No active medication'],
      },
    };
  }

  const vaccineEvents = medicalEvents.filter((event) => event.type === 'vaccine');
  const latestVaccine = vaccineEvents[0];
  const nextVaccine = [...vaccineEvents]
    .filter((event) => {
      const dueDate = typeof event.dueDate === 'string' ? event.dueDate : undefined;
      const dueMs = parseDateMs(dueDate);
      return dueMs != null && dueMs > Date.now();
    })
    .sort((a, b) => (parseDateMs(a.dueDate) ?? Number.MAX_SAFE_INTEGER) - (parseDateMs(b.dueDate) ?? Number.MAX_SAFE_INTEGER))[0];

  const recentSupportedTypes: MvpMedicalEvent['type'][] = ['diagnosis', 'procedure', 'test', 'prescription', 'note'];
  const recentEvents = medicalEvents
    .filter((event) => recentSupportedTypes.includes(event.type))
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: event.title,
      category: categoryLabelFromMedicalEventType(event.type),
      date: toDateLabel(event.eventDate),
      note: event.note,
    }));

  const alerts: string[] = [];
  const pendingReminderCount = reminders.filter((item) => item.status === 'pending').length;
  if (pendingReminderCount > 0) alerts.push(`${pendingReminderCount} pending reminder${pendingReminderCount > 1 ? 's' : ''}`);
  if (medications.length > 0) alerts.push(`${medications.length} active medication${medications.length > 1 ? 's' : ''}`);
  const overdueVaccineCount = vaccineEvents.filter((event) => {
    const dueDate = typeof event.dueDate === 'string' ? event.dueDate : undefined;
    const dueMs = parseDateMs(dueDate);
    return dueMs != null && dueMs < Date.now();
  }).length;
  if (overdueVaccineCount > 0) alerts.push(`${overdueVaccineCount} overdue vaccine${overdueVaccineCount > 1 ? 's' : ''}`);

  const diagnosisRows = medicalEvents.filter((event) => event.type === 'diagnosis').slice(0, 5).map((event) => `${event.title} • ${toDateLabel(event.eventDate)}`);
  const procedureRows = medicalEvents.filter((event) => event.type === 'procedure').slice(0, 5).map((event) => `${event.title} • ${toDateLabel(event.eventDate)}`);
  const medicationRows = medications.slice(0, 5).map((course) => `${course.name} • ${toDateLabel(course.startDate)}`);

  return {
    lastVisit: visits.length > 0 ? {
      title: getVisitFallbackTitle(visits[0].reasonCategory),
      date: toDateLabel(visits[0].visitDate),
      clinic: visits[0].clinicName,
      doctor: visits[0].vetName,
    } : null,
    vaccinesSummary: {
      latest: latestVaccine ? `${latestVaccine.title} • ${toDateLabel(latestVaccine.eventDate)}` : null,
      next: nextVaccine ? `${nextVaccine.title} • ${toDateLabel(nextVaccine.dueDate ?? nextVaccine.eventDate)}` : null,
      total: vaccineEvents.length,
    },
    activeMedications: medications.slice(0, 5).map((course) => ({
      name: course.name,
      startDate: course.startDate,
      status: course.status,
    })),
    recentEvents,
    alerts,
    exportRows: {
      vaccines: vaccineEvents.slice(0, 5).map((event) => `${event.title} • ${toDateLabel(event.eventDate)}`),
      visits: visits.slice(0, 5).map((visit) => `${getVisitFallbackTitle(visit.reasonCategory)} • ${toDateLabel(visit.visitDate)}`),
      health: recentEvents.map((event) => `${event.title} • ${event.category}`).slice(0, 5),
      weight: weightEntries.length ? weightEntries.slice(-5).reverse().map((entry) => `${entry.value.toFixed(1)} kg • ${entry.date}`) : ['No weight records'],
      allergy: diagnosisRows.length ? diagnosisRows : ['No allergy records'],
      surgery: procedureRows.length ? procedureRows : ['No surgery records'],
      meds: medicationRows.length ? medicationRows : ['No active medication'],
    },
  };
}

