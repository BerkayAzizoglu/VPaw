import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ByPet, Reminder, ReminderSubtype } from './healthMvpModel';

type PetNameById = Record<string, string>;

let notificationConfigured = false;

function reminderBody(subtype: ReminderSubtype, petName: string) {
  if (subtype === 'vaccine') return `Time for ${petName}'s vaccine`;
  if (subtype === 'medication') return `Medication time for ${petName}`;
  if (subtype === 'vet_visit') return `Vet visit reminder for ${petName}`;
  if (subtype === 'food') return `Feeding time for ${petName}`;
  if (subtype === 'litter') return `Litter care time for ${petName}`;
  if (subtype === 'walk') return `Walk time for ${petName}`;
  return `Reminder for ${petName}`;
}

export function configureNotifications() {
  if (notificationConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  notificationConfigured = true;
}

export async function ensureNotificationPermissions() {
  configureNotifications();

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted || existing.status === 'granted';
  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted || requested.status === 'granted';
  }

  if (granted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('vpaw-reminders', {
      name: 'VPAW Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
      sound: undefined,
    });
  }

  return granted;
}

export async function cancelReminderNotification(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // no-op
  }
}

export async function scheduleReminderNotification(reminder: Reminder, petName: string) {
  const triggerMs = new Date(reminder.scheduledAt).getTime();
  if (!Number.isFinite(triggerMs) || triggerMs <= Date.now()) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminderBody(reminder.subtype, petName),
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerMs),
        channelId: Platform.OS === 'android' ? 'vpaw-reminders' : undefined,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function reconcileReminderNotifications(
  byPet: ByPet<Reminder>,
  petNames: PetNameById,
  options?: { forceReschedule?: boolean },
) {
  const forceReschedule = !!options?.forceReschedule;
  const granted = await ensureNotificationPermissions();

  const next: ByPet<Reminder> = {};
  const petIds = Array.from(new Set([...Object.keys(byPet), ...Object.keys(petNames)]));

  for (const petId of petIds) {
    next[petId] = [];
    const petName = petNames[petId] || 'Pet';
    for (const reminder of byPet[petId] ?? []) {
      let currentNotificationId = reminder.notificationId;

      const shouldBeScheduled = granted && reminder.isActive && !reminder.completedAt;
      const shouldCancelExisting = !!currentNotificationId && (forceReschedule || !shouldBeScheduled);

      if (shouldCancelExisting) {
        await cancelReminderNotification(currentNotificationId);
        currentNotificationId = undefined;
      }

      if (shouldBeScheduled && (!currentNotificationId || forceReschedule)) {
        currentNotificationId = await scheduleReminderNotification(reminder, petName) ?? undefined;
      }

      next[petId].push({
        ...reminder,
        notificationId: currentNotificationId,
      });
    }
  }

  return next;
}

