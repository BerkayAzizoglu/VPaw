import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { markReminderCompleted, snoozeReminder, type ByPet, type Reminder } from '../lib/healthMvpModel';
import type { HealthNotification } from '../lib/notificationInbox';

export function useNotificationsViewModel(args: {
  triggeredNotifications: HealthNotification[];
  remindersByPet: ByPet<Reminder>;
  setNotificationReadById: Dispatch<SetStateAction<Record<string, boolean>>>;
  setNotificationInbox: Dispatch<SetStateAction<HealthNotification[]>>;
  setRemindersWithNotificationSync: (updater: (prev: ByPet<Reminder>) => ByPet<Reminder>) => void;
  setActivePetWithPersist: (petId: string) => void;
  onOpenVetVisitFollowup: () => void;
  onOpenHealthRecordFollowup: () => void;
  onOpenWeightTracking: (petId: string) => void;
  onOpenVetVisitCreate: () => void;
  onOpenHealthRecordCreate: () => void;
  onOpenReminderFlow: () => void;
  onSnoozeFeedback?: () => void;
}) {
  const {
    triggeredNotifications,
    remindersByPet,
    setNotificationReadById,
    setNotificationInbox,
    setRemindersWithNotificationSync,
    setActivePetWithPersist,
    onOpenVetVisitFollowup,
    onOpenHealthRecordFollowup,
    onOpenWeightTracking,
    onOpenVetVisitCreate,
    onOpenHealthRecordCreate,
    onOpenReminderFlow,
    onSnoozeFeedback,
  } = args;

  const findReminderOwnerPetId = useCallback((reminderId: string): string | null => {
    for (const petId of Object.keys(remindersByPet)) {
      if ((remindersByPet[petId] ?? []).some((item) => item.id === reminderId)) return petId;
    }
    return null;
  }, [remindersByPet]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotificationReadById((prev) => ({ ...prev, [notificationId]: true }));
    setNotificationInbox((prev) => prev.map((item) => (
      item.id === notificationId && !item.isRead ? { ...item, isRead: true } : item
    )));
  }, [setNotificationInbox, setNotificationReadById]);

  const handleNotificationDone = useCallback((notificationId: string) => {
    const item = triggeredNotifications.find((entry) => entry.id === notificationId);
    if (!item) return;
    markNotificationRead(notificationId);
    if (item.type !== 'reminder_due' && item.type !== 'overdue') return;
    const ownerPetId = findReminderOwnerPetId(item.relatedEntityId);
    if (!ownerPetId) return;
    setRemindersWithNotificationSync((prev) => markReminderCompleted(prev, ownerPetId, item.relatedEntityId).next);
  }, [findReminderOwnerPetId, markNotificationRead, setRemindersWithNotificationSync, triggeredNotifications]);

  const handleNotificationSnooze = useCallback((notificationId: string) => {
    onSnoozeFeedback?.();
    const item = triggeredNotifications.find((entry) => entry.id === notificationId);
    if (!item) return;
    markNotificationRead(notificationId);
    if (item.type !== 'reminder_due' && item.type !== 'overdue') return;
    const ownerPetId = findReminderOwnerPetId(item.relatedEntityId);
    if (!ownerPetId) return;
    setRemindersWithNotificationSync((prev) => snoozeReminder(prev, ownerPetId, item.relatedEntityId, 24 * 60).next);
  }, [findReminderOwnerPetId, markNotificationRead, onSnoozeFeedback, setRemindersWithNotificationSync, triggeredNotifications]);

  const handleNotificationOpen = useCallback((notificationId: string) => {
    const item = triggeredNotifications.find((entry) => entry.id === notificationId);
    if (!item) return;
    markNotificationRead(notificationId);
    setActivePetWithPersist(item.petId);

    if (item.type === 'followup') {
      // notif-followup-{visit.id} = vet visit followup
      // notif-record-followup-{event.id}-{dueDate} = health record followup
      if (item.id.startsWith('notif-record-followup-')) {
        onOpenHealthRecordFollowup();
      } else {
        onOpenVetVisitFollowup();
      }
      return;
    }

    if (item.type === 'missing_data') {
      // relatedEntityId = "${petId}:${domain}" — weight | medical | vet
      const domain = item.relatedEntityId.split(':')[1];
      if (domain === 'weight') {
        onOpenWeightTracking(item.petId);
      } else if (domain === 'vet') {
        onOpenVetVisitCreate();
      } else {
        onOpenHealthRecordCreate();
      }
      return;
    }

    onOpenReminderFlow();
  }, [
    markNotificationRead,
    onOpenHealthRecordCreate,
    onOpenHealthRecordFollowup,
    onOpenReminderFlow,
    onOpenVetVisitCreate,
    onOpenVetVisitFollowup,
    onOpenWeightTracking,
    setActivePetWithPersist,
    triggeredNotifications,
  ]);

  return {
    markNotificationRead,
    handleNotificationDone,
    handleNotificationSnooze,
    handleNotificationOpen,
  };
}
