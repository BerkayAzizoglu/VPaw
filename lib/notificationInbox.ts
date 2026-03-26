import type { WeightPoint, ByPet, MedicalEvent, Reminder, VetVisit } from './healthMvpModel';

export type HealthNotificationType = 'reminder_due' | 'overdue' | 'followup' | 'missing_data';
export type HealthNotificationPriority = 'high' | 'medium' | 'low';
export type NotificationLastTriggeredByKey = Record<string, number>;

export type HealthNotification = {
  id: string;
  petId: string;
  type: HealthNotificationType;
  priority: HealthNotificationPriority;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedEntityId: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toMs(value: string | undefined) {
  if (!value) return Number.NaN;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function startOfDayMs(valueMs: number) {
  const d = new Date(valueMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDayMs(valueMs: number) {
  const d = new Date(valueMs);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function dateDiffDays(fromMs: number, toMsValue: number) {
  return Math.floor((toMsValue - fromMs) / DAY_MS);
}

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase();
}

export function getNotificationDedupKey(notification: Pick<HealthNotification, 'type' | 'relatedEntityId'>) {
  return `${notification.type}:${normalizeKeyPart(notification.relatedEntityId)}`;
}

function hasRecentMatchByKey(
  key: string,
  existingNotifications: readonly Pick<HealthNotification, 'type' | 'relatedEntityId' | 'createdAt'>[],
  nowMs: number,
) {
  return existingNotifications.some((item) => {
    const itemKey = getNotificationDedupKey(item);
    if (itemKey !== key) return false;
    const createdMs = toMs(item.createdAt);
    return Number.isFinite(createdMs) && (nowMs - createdMs) < DAY_MS;
  });
}

function hasCooldown(type: HealthNotificationType) {
  return type === 'missing_data' || type === 'overdue';
}

export function shouldSuppressNotification(
  notification: Pick<HealthNotification, 'type' | 'relatedEntityId' | 'createdAt'>,
  existingNotifications: readonly Pick<HealthNotification, 'type' | 'relatedEntityId' | 'createdAt'>[],
  lastTriggeredByKey: NotificationLastTriggeredByKey = {},
  nowMs = Date.now(),
) {
  const key = getNotificationDedupKey(notification);
  if (hasRecentMatchByKey(key, existingNotifications, nowMs)) return true;
  if (!hasCooldown(notification.type)) return false;
  const lastTriggeredMs = lastTriggeredByKey[key];
  return Number.isFinite(lastTriggeredMs) && (nowMs - lastTriggeredMs) < DAY_MS;
}

export function buildTriggeredNotifications(args: {
  petList: string[];
  petProfiles: Record<string, { name?: string }>;
  remindersByPet: ByPet<Reminder>;
  vetVisitsByPet: ByPet<VetVisit>;
  medicalEventsByPet: ByPet<MedicalEvent>;
  weightsByPet: Record<string, WeightPoint[]>;
  locale: 'en' | 'tr';
  nowMs?: number;
}): HealthNotification[] {
  const {
    petList,
    petProfiles,
    remindersByPet,
    vetVisitsByPet,
    medicalEventsByPet,
    weightsByPet,
    locale,
    nowMs = Date.now(),
  } = args;

  const notifications: HealthNotification[] = [];
  const seen = new Set<string>();
  const todayStart = startOfDayMs(nowMs);
  const todayEnd = endOfDayMs(nowMs);
  const dayBucket = String(todayStart);

  const pushUnique = (item: HealthNotification) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    notifications.push(item);
  };

  petList.forEach((petId) => {
    const petName = petProfiles[petId]?.name || petId;

    (remindersByPet[petId] ?? [])
      .filter((r) => r.isActive && !r.completedAt && (r.status === 'pending' || r.status === 'snoozed'))
      .forEach((r) => {
        const due = r.dueDate || r.scheduledAt || r.dueAt || new Date(nowMs).toISOString();
        const dueMs = toMs(due);
        if (!Number.isFinite(dueMs)) return;

        if (dueMs >= todayStart && dueMs <= todayEnd) {
          pushUnique({
            id: `notif-reminder-due-${r.id}-${dueMs}`,
            petId,
            type: 'reminder_due',
            priority: 'medium',
            title: locale === 'tr' ? 'Bugun hatirlatma' : 'Reminder due today',
            message: `${r.title} - ${petName}`,
            createdAt: due,
            isRead: false,
            relatedEntityId: r.id,
          });
        } else if (dueMs < nowMs) {
          pushUnique({
            id: `notif-overdue-${r.id}-${dueMs}`,
            petId,
            type: 'overdue',
            priority: 'high',
            title: locale === 'tr' ? 'Gecikmis hatirlatma' : 'Overdue reminder',
            message: `${r.title} - ${petName}`,
            createdAt: due,
            isRead: false,
            relatedEntityId: r.id,
          });
        }
      });

    (vetVisitsByPet[petId] ?? [])
      .filter((visit) => visit.status === 'completed' && typeof visit.followUpDate === 'string' && visit.followUpDate.length > 0)
      .forEach((visit) => {
        const followUpDate = visit.followUpDate ?? '';
        const followUpMs = toMs(followUpDate);
        if (!Number.isFinite(followUpMs)) return;
        const daysDiff = dateDiffDays(todayStart, followUpMs);
        if (daysDiff > 14) return;
        if (daysDiff < -60) return;
        const isOverdueFollowup = followUpMs < nowMs;
        pushUnique({
          id: `notif-followup-${visit.id}`,
          petId,
          type: 'followup',
          priority: 'high',
          title: isOverdueFollowup
            ? (locale === 'tr' ? 'Takip gecikmis' : 'Follow-up overdue')
            : (locale === 'tr' ? 'Takip ziyareti gerekli' : 'Follow-up needed'),
          message: `${petName} - ${locale === 'tr' ? 'Takip tarihi' : 'Follow-up date'}: ${followUpDate}`,
          createdAt: followUpDate,
          isRead: false,
          relatedEntityId: visit.id,
        });
      });

    const latestWeightMs = Math.max(0, ...(weightsByPet[petId] ?? []).map((w) => toMs(w.date)).filter((ms) => Number.isFinite(ms)));
    const latestMedicalMs = Math.max(0, ...(medicalEventsByPet[petId] ?? []).map((e) => toMs(e.eventDate)).filter((ms) => Number.isFinite(ms)));
    const latestVetMs = Math.max(0, ...(vetVisitsByPet[petId] ?? []).map((v) => toMs(v.visitDate)).filter((ms) => Number.isFinite(ms)));

    const maybePushMissingData = (domain: 'weight' | 'medical' | 'vet', latestMs: number, thresholdDays: number) => {
      if (latestMs <= 0) return;
      const inactivityDays = dateDiffDays(latestMs, nowMs);
      if (inactivityDays < thresholdDays) return;
      const domainLabel = domain === 'weight'
        ? (locale === 'tr' ? 'kilo' : 'weight')
        : domain === 'medical'
          ? (locale === 'tr' ? 'saglik kaydi' : 'health record')
          : (locale === 'tr' ? 'veteriner ziyareti' : 'vet visit');
      pushUnique({
        id: `notif-missing-${domain}-${petId}-${dayBucket}`,
        petId,
        type: 'missing_data',
        priority: 'low',
        title: locale === 'tr' ? 'Veri guncellemesi gerekli' : 'Data update needed',
        message: locale === 'tr'
          ? `${petName} icin ${inactivityDays} gundur yeni ${domainLabel} verisi yok`
          : `No ${domainLabel} data for ${petName} in ${inactivityDays} days`,
        createdAt: new Date(nowMs).toISOString(),
        isRead: false,
        relatedEntityId: `${petId}:${domain}`,
      });
    };

    maybePushMissingData('weight', latestWeightMs, 7);
    maybePushMissingData('medical', latestMedicalMs, 30);
    maybePushMissingData('vet', latestVetMs, 60);
  });

  notifications.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return notifications;
}
