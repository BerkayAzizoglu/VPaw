import { useMemo } from 'react';
import {
  getRemindersByPet,
  getUpcomingReminders,
  type ByPet,
  type Reminder,
  type ReminderSubtype,
} from '../lib/healthMvpModel';
import { formatReminderDateLabel, isReminderSubtypeAllowedForPet } from '../lib/petProfileUtils';
import type { PetProfile } from '../lib/petProfileTypes';

type Locale = 'en' | 'tr';

type UpcomingReminderItem = {
  id: string;
  title: string;
  date: string;
};

export type ReminderListItem = {
  id: string;
  title: string;
  date: string;
  dueDate: string;
  petName?: string;
  petId: string;
  subtype?: ReminderSubtype;
  status?: 'pending' | 'done' | 'snoozed';
};

type ReminderTabGroups = {
  today: ReminderListItem[];
  upcoming: ReminderListItem[];
  overdue: ReminderListItem[];
  completed: ReminderListItem[];
};

export function useReminderSelectors(args: {
  remindersByPet: ByPet<Reminder>;
  petList: string[];
  petProfiles: Record<string, PetProfile>;
  locale: Locale;
}) {
  const { remindersByPet, petList, petProfiles, locale } = args;

  const upcomingRemindersByPet = useMemo(() => {
    const next: Partial<Record<string, UpcomingReminderItem[]>> = {};
    petList.forEach((petId) => {
      const petType = petProfiles[petId]?.petType;
      const upcoming = getUpcomingReminders(remindersByPet, petId, 12)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .slice(0, 2);
      next[petId] = upcoming.map((reminder) => {
        const title = reminder.title?.trim()
          || (reminder.subtype === 'vaccine'
            ? (locale === 'tr' ? 'Aşı hatırlatması' : 'Vaccine follow-up')
            : reminder.subtype === 'medication'
              ? (locale === 'tr' ? 'İlaç programı' : 'Medication schedule')
              : reminder.subtype === 'food'
                ? (locale === 'tr' ? 'Beslenme zamanı' : 'Food reminder')
                : reminder.subtype === 'litter'
                  ? (locale === 'tr' ? 'Kum temizliği' : 'Litter reminder')
                  : reminder.subtype === 'walk'
                    ? (locale === 'tr' ? 'Yürüyüş zamanı' : 'Walk reminder')
                    : reminder.note?.trim() || (locale === 'tr' ? 'Sağlık hatırlatması' : 'Health reminder'));
        return {
          id: reminder.id,
          title,
          date: formatReminderDateLabel(reminder.scheduledAt ?? reminder.dueAt, locale),
        };
      });
    });
    return next;
  }, [locale, petList, petProfiles, remindersByPet]);

  const completedRemindersByPet = useMemo(() => {
    const next: Partial<Record<string, UpcomingReminderItem[]>> = {};
    petList.forEach((petId) => {
      const petType = petProfiles[petId]?.petType;
      const completed = getRemindersByPet(remindersByPet, petId)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .filter((reminder) => !!reminder.completedAt)
        .sort((a, b) => {
          const aMs = new Date(a.completedAt as string).getTime();
          const bMs = new Date(b.completedAt as string).getTime();
          if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
          if (!Number.isFinite(aMs)) return 1;
          if (!Number.isFinite(bMs)) return -1;
          return bMs - aMs;
        })
        .slice(0, 3);

      next[petId] = completed.map((reminder) => ({
        id: reminder.id,
        title: reminder.title?.trim() || (locale === 'tr' ? 'Tamamlanan hatırlatma' : 'Completed reminder'),
        date: formatReminderDateLabel((reminder.completedAt as string) ?? reminder.scheduledAt, locale),
      }));
    });
    return next;
  }, [locale, petList, petProfiles, remindersByPet]);

  const reminderBadgeCount = useMemo(
    () => Object.values(upcomingRemindersByPet).reduce((sum, arr) => sum + (arr?.length ?? 0), 0),
    [upcomingRemindersByPet],
  );

  const remindersTabGroups = useMemo<ReminderTabGroups>(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const startMs = startOfToday.getTime();
    const endMs = endOfToday.getTime();

    const today: ReminderListItem[] = [];
    const upcoming: ReminderListItem[] = [];
    const overdue: ReminderListItem[] = [];

    petList.forEach((petId) => {
      const petName = petProfiles[petId]?.name || petId;
      const petType = petProfiles[petId]?.petType;
      getRemindersByPet(remindersByPet, petId)
        .filter((reminder) => isReminderSubtypeAllowedForPet(petType, reminder.subtype))
        .filter((reminder) => reminder.isActive && !reminder.completedAt)
        .forEach((reminder) => {
          const label = reminder.title?.trim() || (locale === 'tr' ? 'Hatırlatma' : 'Reminder');
          const dateValue = reminder.dueDate ?? reminder.scheduledAt ?? reminder.dueAt;
          const dateMs = new Date(dateValue).getTime();
          const item: ReminderListItem = {
            id: reminder.id,
            title: label,
            date: formatReminderDateLabel(dateValue, locale),
            dueDate: dateValue,
            petName,
            petId,
            subtype: reminder.subtype,
            status: reminder.status === 'snoozed' ? 'snoozed' : 'pending',
          };
          if (Number.isFinite(dateMs)) {
            if (dateMs >= startMs && dateMs < endMs) {
              today.push(item);
              return;
            }
            if (dateMs < now) {
              overdue.push(item);
              return;
            }
          }
          upcoming.push(item);
        });
    });

    const sortByDate = (items: ReminderListItem[]) =>
      [...items].sort((a, b) => {
        const aMs = new Date(a.dueDate).getTime();
        const bMs = new Date(b.dueDate).getTime();
        if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
        if (!Number.isFinite(aMs)) return 1;
        if (!Number.isFinite(bMs)) return -1;
        return aMs - bMs;
      });

    const completed: ReminderListItem[] = [];
    petList.forEach((petId) => {
      const petName = petProfiles[petId]?.name || petId;
      const petType = petProfiles[petId]?.petType;
      getRemindersByPet(remindersByPet, petId)
        .filter((r) => isReminderSubtypeAllowedForPet(petType, r.subtype) && !!r.completedAt)
        .forEach((r) => {
          completed.push({
            id: r.id,
            title: r.title?.trim() || (locale === 'tr' ? 'Tamamlanan hatırlatma' : 'Completed reminder'),
            date: formatReminderDateLabel((r.completedAt as string) ?? r.scheduledAt, locale),
            dueDate: (r.completedAt as string) ?? r.dueDate ?? r.scheduledAt,
            petName,
            petId,
            subtype: r.subtype,
            status: 'done',
          });
        });
    });
    completed.sort((a, b) => {
      const aMs = new Date(a.dueDate).getTime();
      const bMs = new Date(b.dueDate).getTime();
      if (!Number.isFinite(aMs) && !Number.isFinite(bMs)) return 0;
      if (!Number.isFinite(aMs)) return 1;
      if (!Number.isFinite(bMs)) return -1;
      return bMs - aMs;
    });

    return {
      today: sortByDate(today),
      upcoming: sortByDate(upcoming),
      overdue: sortByDate(overdue),
      completed: completed.slice(0, 20),
    };
  }, [locale, petList, petProfiles, remindersByPet]);

  return {
    upcomingRemindersByPet,
    completedRemindersByPet,
    reminderBadgeCount,
    remindersTabGroups,
  };
}
