export type PetId = string;

export type WeightPoint = {
  label: string;
  value: number;
  date: string;
  change: string;
};

export type VetVisitReasonCategory =
  | 'checkup'
  | 'vaccine'
  | 'illness'
  | 'injury'
  | 'follow_up'
  | 'other';

export type VetVisitStatus = 'completed' | 'planned' | 'canceled';

export type MedicalEventType =
  | 'vaccine'
  | 'diagnosis'
  | 'procedure'
  | 'test'
  | 'prescription'
  | 'attachment'
  | 'note'
  | 'other';

export type MedicalEventStatus =
  | 'active'
  | 'resolved'
  | 'normal'
  | 'abnormal'
  | 'completed'
  | 'discontinued';

export type ReminderKind =
  | 'medical_followup'
  | 'vaccine_due'
  | 'test_followup'
  | 'medication'
  | 'care_routine';

export type ReminderStatus = 'pending' | 'done' | 'snoozed' | 'skipped';
export type ReminderSourceType = 'vet_visit' | 'medical_event' | 'manual';
export type ReminderType = 'medical' | 'care';
export type ReminderOriginType = 'manual' | 'system';
export type ReminderSubtype =
  | 'vet_visit'
  | 'vaccine'
  | 'medication'
  | 'food'
  | 'litter'
  | 'walk'
  | 'custom';
export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'custom';

export type MedicationCourseStatus = 'active' | 'paused' | 'completed';
export type MedicationFrequency =
  | 'daily'
  | 'twice_daily'
  | 'every_x_hours'
  | 'weekly'
  | 'custom';

export type VetVisit = {
  id: string;
  petId: PetId;
  visitDate: string;
  reasonCategory: VetVisitReasonCategory;
  status: VetVisitStatus;
  clinicName?: string;
  vetName?: string;
  followUpDate?: string;
  notes?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
};

export type MedicalEvent = {
  id: string;
  petId: PetId;
  vetVisitId?: string;
  type: MedicalEventType;
  eventDate: string;
  title: string;
  subcategory?: string;
  status?: MedicalEventStatus;
  valueNumber?: number;
  valueUnit?: string;
  dueDate?: string;
  metadataJson?: Record<string, unknown>;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  petId: PetId;
  // Reminder domain group (medical/care). Kept for backward compatibility.
  type: ReminderType;
  // Reminder ownership source: manual user-created vs system-generated.
  originType: ReminderOriginType;
  subtype: ReminderSubtype;
  title: string;
  dueDate: string;
  scheduledAt: string;
  frequency: ReminderFrequency;
  interval?: number;
  completedAt?: string;
  isActive: boolean;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;

  // Backward compatibility fields (legacy storage + transitional flows)
  kind?: ReminderKind;
  /** @deprecated Use dueDate instead. Kept for legacy storage round-trip only. */
  dueAt?: string;
  status?: ReminderStatus;
  sourceType?: ReminderSourceType;
  sourceId?: string;
  recurrenceRule?: string;
  note?: string;
};

export type MedicationCourse = {
  id: string;
  petId: PetId;
  name: string;
  startDate: string;
  isOngoing: boolean;
  status: MedicationCourseStatus;
  sourceEventId?: string;
  dose?: number;
  doseUnit?: string;
  frequency?: MedicationFrequency;
  endDate?: string;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
};

export type ByPet<T> = Record<PetId, T[]>;

export const EMPTY_VET_VISITS_BY_PET: ByPet<VetVisit> = {};
export const EMPTY_MEDICAL_EVENTS_BY_PET: ByPet<MedicalEvent> = {};
export const EMPTY_REMINDERS_BY_PET: ByPet<Reminder> = {};
export const EMPTY_MEDICATION_COURSES_BY_PET: ByPet<MedicationCourse> = {};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asIso(value: string | undefined, fallbackIso: string) {
  if (!value) return fallbackIso;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallbackIso;
}

function normalizeReminderKind(kind: string | undefined): ReminderKind {
  if (kind === 'vaccine_due' || kind === 'test_followup' || kind === 'medication' || kind === 'care_routine') return kind;
  return 'medical_followup';
}

function reminderTypeFromKind(kind: ReminderKind): ReminderType {
  return kind === 'care_routine' ? 'care' : 'medical';
}

function reminderSubtypeFromKind(kind: ReminderKind): ReminderSubtype {
  if (kind === 'vaccine_due') return 'vaccine';
  if (kind === 'medication') return 'medication';
  if (kind === 'care_routine') return 'custom';
  return 'vet_visit';
}

function reminderTitleFromSubtype(subtype: ReminderSubtype): string {
  if (subtype === 'vaccine') return 'Vaccine follow-up';
  if (subtype === 'medication') return 'Medication schedule';
  if (subtype === 'vet_visit') return 'Vet visit reminder';
  if (subtype === 'food') return 'Food reminder';
  if (subtype === 'litter') return 'Litter reminder';
  if (subtype === 'walk') return 'Walk reminder';
  return 'Reminder';
}

function normalizeByPet<T>(raw: unknown, parseItem: (item: unknown, petId: PetId) => T | null, empty: ByPet<T>): ByPet<T> {
  if (!raw || typeof raw !== 'object') return empty;
  const source = raw as Record<string, unknown>;
  const result: ByPet<T> = {};
  for (const petId of Object.keys(source)) {
    const value = source[petId];
    if (!Array.isArray(value)) continue;
    result[petId] = value.map((item) => parseItem(item, petId)).filter((v): v is T => v !== null);
  }
  return result;
}

export function normalizeVetVisitsByPet(raw: unknown): ByPet<VetVisit> {
  const nowIso = new Date().toISOString();
  return normalizeByPet(
    raw,
    (item, petId) => {
      if (!item || typeof item !== 'object') return null;
      const i = item as Partial<VetVisit>;
      if (typeof i.visitDate !== 'string' || typeof i.reasonCategory !== 'string' || typeof i.status !== 'string') return null;
      return {
        id: typeof i.id === 'string' ? i.id : makeId(`visit-${petId}`),
        petId,
        visitDate: i.visitDate,
        reasonCategory: i.reasonCategory as VetVisitReasonCategory,
        status: i.status as VetVisitStatus,
        clinicName: typeof i.clinicName === 'string' ? i.clinicName : undefined,
        vetName: typeof i.vetName === 'string' ? i.vetName : undefined,
        followUpDate: typeof i.followUpDate === 'string' ? i.followUpDate : undefined,
        notes: typeof i.notes === 'string' ? i.notes : undefined,
        amount: typeof i.amount === 'number' && i.amount > 0 ? i.amount : undefined,
        currency: typeof i.currency === 'string' && i.currency.trim().length > 0 ? i.currency.trim() : undefined,
        createdAt: asIso(i.createdAt, nowIso),
        updatedAt: asIso(i.updatedAt, nowIso),
      };
    },
    EMPTY_VET_VISITS_BY_PET,
  );
}

export function normalizeMedicalEventsByPet(raw: unknown): ByPet<MedicalEvent> {
  const nowIso = new Date().toISOString();
  return normalizeByPet(
    raw,
    (item, petId) => {
      if (!item || typeof item !== 'object') return null;
      const i = item as Partial<MedicalEvent>;
      if (
        typeof i.type !== 'string' ||
        typeof i.eventDate !== 'string' ||
        typeof i.title !== 'string'
      ) {
        return null;
      }
      return {
        id: typeof i.id === 'string' ? i.id : makeId(`event-${petId}`),
        petId,
        vetVisitId: typeof i.vetVisitId === 'string' ? i.vetVisitId : undefined,
        type: i.type as MedicalEventType,
        eventDate: i.eventDate,
        title: i.title,
        subcategory: typeof i.subcategory === 'string' ? i.subcategory : undefined,
        status: typeof i.status === 'string' ? (i.status as MedicalEventStatus) : undefined,
        valueNumber: typeof i.valueNumber === 'number' ? i.valueNumber : undefined,
        valueUnit: typeof i.valueUnit === 'string' ? i.valueUnit : undefined,
        dueDate: typeof i.dueDate === 'string' ? i.dueDate : undefined,
        metadataJson: i.metadataJson && typeof i.metadataJson === 'object' ? i.metadataJson : undefined,
        note: typeof i.note === 'string' ? i.note : undefined,
        createdAt: asIso(i.createdAt, nowIso),
        updatedAt: asIso(i.updatedAt, nowIso),
      };
    },
    EMPTY_MEDICAL_EVENTS_BY_PET,
  );
}

export function normalizeRemindersByPet(raw: unknown): ByPet<Reminder> {
  const nowIso = new Date().toISOString();
  return normalizeByPet(
    raw,
    (item, petId) => {
      if (!item || typeof item !== 'object') return null;
      const i = item as Partial<Reminder>;
      const kind = normalizeReminderKind(typeof i.kind === 'string' ? i.kind : undefined);
      const scheduledAt = typeof i.scheduledAt === 'string'
        ? i.scheduledAt
        : (typeof i.dueAt === 'string' ? i.dueAt : nowIso);
      const type = typeof i.type === 'string' && (i.type === 'medical' || i.type === 'care')
        ? i.type
        : reminderTypeFromKind(kind);
      const subtype = typeof i.subtype === 'string' && (
        i.subtype === 'vet_visit' ||
        i.subtype === 'vaccine' ||
        i.subtype === 'medication' ||
        i.subtype === 'food' ||
        i.subtype === 'litter' ||
        i.subtype === 'walk' ||
        i.subtype === 'custom'
      )
        ? i.subtype as ReminderSubtype
        : reminderSubtypeFromKind(kind);
      const frequency = typeof i.frequency === 'string' && (i.frequency === 'once' || i.frequency === 'daily' || i.frequency === 'weekly' || i.frequency === 'custom')
        ? i.frequency
        : 'once';
      const legacyDone = i.status === 'done';
      const completedAt = typeof i.completedAt === 'string'
        ? i.completedAt
        : legacyDone
          ? asIso(i.updatedAt, nowIso)
          : undefined;
      const isActive = typeof i.isActive === 'boolean'
        ? i.isActive
        : i.status === 'skipped'
          ? false
          : true;
      const createdAt = asIso(i.createdAt, nowIso);
      const updatedAt = asIso(i.updatedAt, nowIso);
      const dueDate = typeof (i as Partial<{ dueDate: string }>).dueDate === 'string'
        ? (i as Partial<{ dueDate: string }>).dueDate as string
        : (typeof i.dueAt === 'string' ? i.dueAt : scheduledAt);
      return {
        id: typeof i.id === 'string' ? i.id : makeId(`reminder-${petId}`),
        petId,
        type,
        originType:
          (i as Partial<{ originType: ReminderOriginType }>).originType === 'manual'
          || (i as Partial<{ originType: ReminderOriginType }>).originType === 'system'
            ? (i as Partial<{ originType: ReminderOriginType }>).originType as ReminderOriginType
            : (typeof i.sourceType === 'string' && i.sourceType === 'manual' ? 'manual' : 'system'),
        subtype,
        title: typeof i.title === 'string' && i.title.trim() ? i.title : reminderTitleFromSubtype(subtype),
        dueDate,
        scheduledAt,
        frequency,
        interval: typeof i.interval === 'number' && Number.isFinite(i.interval) ? i.interval : undefined,
        completedAt,
        isActive,
        notificationId: typeof i.notificationId === 'string' ? i.notificationId : undefined,
        createdAt,
        updatedAt,
        kind,
        dueAt: typeof i.dueAt === 'string' ? i.dueAt : scheduledAt,
        status: typeof i.status === 'string' ? i.status : (completedAt ? 'done' : 'pending'),
        sourceType: typeof i.sourceType === 'string' ? (i.sourceType as ReminderSourceType) : undefined,
        sourceId: typeof i.sourceId === 'string' ? i.sourceId : undefined,
        recurrenceRule: typeof i.recurrenceRule === 'string' ? i.recurrenceRule : undefined,
        note: typeof i.note === 'string' ? i.note : undefined,
      };
    },
    EMPTY_REMINDERS_BY_PET,
  );
}

export function normalizeMedicationCoursesByPet(raw: unknown): ByPet<MedicationCourse> {
  const nowIso = new Date().toISOString();
  return normalizeByPet(
    raw,
    (item, petId) => {
      if (!item || typeof item !== 'object') return null;
      const i = item as Partial<MedicationCourse>;
      if (
        typeof i.name !== 'string' ||
        typeof i.startDate !== 'string' ||
        typeof i.isOngoing !== 'boolean' ||
        typeof i.status !== 'string'
      ) {
        return null;
      }
      return {
        id: typeof i.id === 'string' ? i.id : makeId(`med-${petId}`),
        petId,
        name: i.name,
        startDate: i.startDate,
        isOngoing: i.isOngoing,
        status: i.status as MedicationCourseStatus,
        sourceEventId: typeof i.sourceEventId === 'string' ? i.sourceEventId : undefined,
        dose: typeof i.dose === 'number' ? i.dose : undefined,
        doseUnit: typeof i.doseUnit === 'string' ? i.doseUnit : undefined,
        frequency: typeof i.frequency === 'string' ? (i.frequency as MedicationFrequency) : undefined,
        endDate: typeof i.endDate === 'string' ? i.endDate : undefined,
        instructions: typeof i.instructions === 'string' ? i.instructions : undefined,
        createdAt: asIso(i.createdAt, nowIso),
        updatedAt: asIso(i.updatedAt, nowIso),
      };
    },
    EMPTY_MEDICATION_COURSES_BY_PET,
  );
}

export function createVetVisit(
  byPet: ByPet<VetVisit>,
  input: Omit<VetVisit, 'id' | 'createdAt' | 'updatedAt'>,
): { next: ByPet<VetVisit>; item: VetVisit } {
  const nowIso = new Date().toISOString();
  const item: VetVisit = { ...input, id: makeId(`visit-${input.petId}`), createdAt: nowIso, updatedAt: nowIso };
  return {
    item,
    next: {
      ...byPet,
      [input.petId]: [item, ...(byPet[input.petId] ?? [])],
    },
  };
}

export function addMedicalEvent(
  byPet: ByPet<MedicalEvent>,
  input: Omit<MedicalEvent, 'id' | 'createdAt' | 'updatedAt'>,
): { next: ByPet<MedicalEvent>; item: MedicalEvent } {
  const nowIso = new Date().toISOString();
  const item: MedicalEvent = { ...input, id: makeId(`event-${input.petId}`), createdAt: nowIso, updatedAt: nowIso };
  return {
    item,
    next: {
      ...byPet,
      [input.petId]: [item, ...(byPet[input.petId] ?? [])],
    },
  };
}

export function getMedicalEventsByPet(byPet: ByPet<MedicalEvent>, petId: PetId): MedicalEvent[] {
  return byPet[petId] ?? [];
}

export function getMedicalEventsByVisit(byPet: ByPet<MedicalEvent>, petId: PetId, vetVisitId: string): MedicalEvent[] {
  return (byPet[petId] ?? []).filter((event) => event.vetVisitId === vetVisitId);
}

export function createReminder(
  byPet: ByPet<Reminder>,
  input: {
    petId: PetId;
    type: ReminderType;
    subtype: ReminderSubtype;
    title: string;
    scheduledAt: string;
    frequency: ReminderFrequency;
    interval?: number;
    completedAt?: string;
    isActive?: boolean;
    originType?: ReminderOriginType;
    sourceType?: ReminderSourceType;
    sourceId?: string;
    recurrenceRule?: string;
    note?: string;
    // transitional legacy inputs
    kind?: ReminderKind;
    dueAt?: string;
    status?: ReminderStatus;
  },
): { next: ByPet<Reminder>; item: Reminder } {
  const nowIso = new Date().toISOString();
  const kind = normalizeReminderKind(input.kind);
  const scheduledAt = input.scheduledAt ?? input.dueAt ?? nowIso;
  const resolvedType = input.type ?? reminderTypeFromKind(kind);
  const resolvedSubtype = input.subtype ?? reminderSubtypeFromKind(kind);
  const completedAt = input.completedAt ?? (input.status === 'done' ? nowIso : undefined);
  const isActive = typeof input.isActive === 'boolean' ? input.isActive : input.status !== 'skipped';
  const dueDate = input.dueAt ?? input.scheduledAt ?? nowIso;
  const item: Reminder = {
    ...input,
    kind,
    dueDate,
    scheduledAt,
    type: resolvedType,
    originType: input.originType ?? (input.sourceType === 'manual' ? 'manual' : 'system'),
    subtype: resolvedSubtype,
    title: input.title?.trim() ? input.title : reminderTitleFromSubtype(resolvedSubtype),
    frequency: input.frequency ?? 'once',
    interval: typeof input.interval === 'number' && Number.isFinite(input.interval) ? input.interval : undefined,
    completedAt,
    isActive,
    status: input.status ?? (completedAt ? 'done' : 'pending'),
    id: makeId(`reminder-${input.petId}`),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return {
    item,
    next: {
      ...byPet,
      [input.petId]: [item, ...(byPet[input.petId] ?? [])],
    },
  };
}

export function getRemindersByPet(byPet: ByPet<Reminder>, petId: PetId): Reminder[] {
  return [...(byPet[petId] ?? [])].sort((a, b) => {
    const aMs = new Date(a.scheduledAt).getTime();
    const bMs = new Date(b.scheduledAt).getTime();
    if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
    if (!Number.isFinite(aMs)) return 1;
    if (!Number.isFinite(bMs)) return -1;
    return aMs - bMs;
  });
}

export function markReminderCompleted(
  byPet: ByPet<Reminder>,
  petId: PetId,
  reminderId: string,
  completedAtIso = new Date().toISOString(),
): { next: ByPet<Reminder>; item: Reminder | null } {
  const toMs = (value: string | undefined): number | null => {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  };

  const addDaysIso = (baseIso: string, days: number, fallbackIso: string): string => {
    const baseMs = toMs(baseIso);
    const fallbackMs = toMs(fallbackIso) ?? Date.now();
    const anchorMs = baseMs ?? fallbackMs;
    return new Date(anchorMs + days * 24 * 60 * 60 * 1000).toISOString();
  };

  const nowMs = toMs(completedAtIso) ?? Date.now();
  let updated: Reminder | null = null;
  const nextPet = (byPet[petId] ?? []).map((reminder) => {
    if (reminder.id !== reminderId) return reminder;

    // Inactive reminders must not be modified by completion actions.
    if (!reminder.isActive) return reminder;

    // Ignore duplicate completion taps for one-time reminders.
    if (reminder.frequency === 'once' && reminder.completedAt) return reminder;

    // Recurring reminders are advanced to the next schedule slot.
    if (reminder.frequency === 'daily' || reminder.frequency === 'weekly' || reminder.frequency === 'custom') {
      const updatedMs = toMs(reminder.updatedAt);
      const scheduledMs = toMs(reminder.scheduledAt);

      // Double-tap guard: if the reminder was just advanced to a future slot, skip.
      if (
        updatedMs !== null &&
        updatedMs > nowMs - 1200 &&
        scheduledMs !== null &&
        scheduledMs > nowMs
      ) {
        return reminder;
      }

      const daysToAdd =
        reminder.frequency === 'daily'
          ? 1
          : reminder.frequency === 'weekly'
            ? 7
            : Number.isFinite(reminder.interval as number) && (reminder.interval as number) > 0
              ? Math.floor(reminder.interval as number)
              : 1;

      const nextScheduledAt = addDaysIso(reminder.scheduledAt, daysToAdd, completedAtIso);
      updated = {
        ...reminder,
        scheduledAt: nextScheduledAt,
        dueDate: nextScheduledAt,
        completedAt: undefined,
        status: 'pending',
        isActive: true,
        updatedAt: completedAtIso,
      };
      return updated;
    }

    // One-time reminder completion.
    updated = {
      ...reminder,
      status: 'done',
      completedAt: completedAtIso,
      isActive: false,
      updatedAt: completedAtIso,
    };
    return updated;
  });
  return {
    item: updated,
    next: {
      ...byPet,
      [petId]: nextPet,
    },
  };
}

export function toggleReminderActive(
  byPet: ByPet<Reminder>,
  petId: PetId,
  reminderId: string,
  isActive: boolean,
): { next: ByPet<Reminder>; item: Reminder | null } {
  const nowIso = new Date().toISOString();
  let updated: Reminder | null = null;
  const nextPet = (byPet[petId] ?? []).map((reminder) => {
    if (reminder.id !== reminderId) return reminder;
    updated = {
      ...reminder,
      isActive,
      status: !isActive ? 'skipped' : reminder.completedAt ? 'done' : 'pending',
      updatedAt: nowIso,
    };
    return updated;
  });
  return {
    item: updated,
    next: {
      ...byPet,
      [petId]: nextPet,
    },
  };
}

export function snoozeReminder(
  byPet: ByPet<Reminder>,
  petId: PetId,
  reminderId: string,
  minutes = 60,
): { next: ByPet<Reminder>; item: Reminder | null } {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let updated: Reminder | null = null;
  const nextPet = (byPet[petId] ?? []).map((reminder) => {
    if (reminder.id !== reminderId) return reminder;
    if (!reminder.isActive || reminder.completedAt) return reminder;
    const currentMs = new Date(reminder.dueDate || reminder.scheduledAt).getTime();
    const anchorMs = Number.isFinite(currentMs) ? Math.max(currentMs, now) : now;
    const nextMs = anchorMs + Math.max(1, minutes) * 60 * 1000;
    const nextIso = new Date(nextMs).toISOString();
    updated = {
      ...reminder,
      status: 'snoozed',
      dueDate: nextIso,
      scheduledAt: nextIso,
      updatedAt: nowIso,
    };
    return updated;
  });
  return {
    item: updated,
    next: {
      ...byPet,
      [petId]: nextPet,
    },
  };
}

export function updateReminder(
  byPet: ByPet<Reminder>,
  petId: PetId,
  reminderId: string,
  patch: {
    title?: string;
    dueDate?: string;
    subtype?: ReminderSubtype;
    note?: string;
  },
): { next: ByPet<Reminder>; item: Reminder | null } {
  const nowIso = new Date().toISOString();
  let updated: Reminder | null = null;
  const nextPet = (byPet[petId] ?? []).map((reminder) => {
    if (reminder.id !== reminderId) return reminder;
    const dueDate = typeof patch.dueDate === 'string' && patch.dueDate.trim().length > 0
      ? patch.dueDate
      : reminder.dueDate;
    updated = {
      ...reminder,
      title: typeof patch.title === 'string' && patch.title.trim().length > 0 ? patch.title.trim() : reminder.title,
      dueDate,
      scheduledAt: dueDate,
      subtype: patch.subtype ?? reminder.subtype,
      note: typeof patch.note === 'string' ? patch.note : reminder.note,
      status: reminder.completedAt ? 'done' : reminder.status === 'snoozed' ? 'snoozed' : 'pending',
      updatedAt: nowIso,
    };
    return updated;
  });
  return {
    item: updated,
    next: {
      ...byPet,
      [petId]: nextPet,
    },
  };
}

export function getUpcomingReminders(
  byPet: ByPet<Reminder>,
  petId: PetId,
  limit = 5,
  nowMs = Date.now(),
): Reminder[] {
  const all = getRemindersByPet(byPet, petId).filter((reminder) => reminder.isActive && !reminder.completedAt);
  const upcoming = all.filter((reminder) => {
    const scheduledMs = new Date(reminder.scheduledAt).getTime();
    if (!Number.isFinite(scheduledMs)) return true;
    return scheduledMs >= nowMs;
  });
  const source = upcoming.length > 0 ? upcoming : all;
  return source.slice(0, Math.max(1, limit));
}

export function createMedicationCourse(
  byPet: ByPet<MedicationCourse>,
  input: Omit<MedicationCourse, 'id' | 'createdAt' | 'updatedAt'>,
): { next: ByPet<MedicationCourse>; item: MedicationCourse } {
  const nowIso = new Date().toISOString();
  const item: MedicationCourse = { ...input, id: makeId(`med-${input.petId}`), createdAt: nowIso, updatedAt: nowIso };
  return {
    item,
    next: {
      ...byPet,
      [input.petId]: [item, ...(byPet[input.petId] ?? [])],
    },
  };
}
