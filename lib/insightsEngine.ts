import type { WeightPoint, VetVisit, Reminder, VaccinationsAttentionCounts, VaccinationsNextUpData } from './healthMvpModel';

type InsightPriority = 'low' | 'medium' | 'high';
type InsightType = 'trend' | 'alert' | 'suggestion';
export type InsightActionType = 'addReminder' | 'addVaccine' | 'addVisit' | 'logWeight';

export type AiInsight = {
  id: string;
  type: InsightType;
  message: string;
  priority: InsightPriority;
  actionLabel?: string;
  actionType?: InsightActionType;
};

type BuildInsightsInput = {
  locale: 'en' | 'tr';
  petName: string;
  weights: WeightPoint[];
  vetVisits: VetVisit[];
  vaccineCounts?: VaccinationsAttentionCounts;
  vaccineNextUp?: VaccinationsNextUpData;
  reminders: Reminder[];
  nowMs?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseMs(value: string | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function priorityScore(priority: InsightPriority) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function sortInsights(items: AiInsight[]) {
  return [...items].sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));
}

function buildWeightTrendInsight(input: BuildInsightsInput, nowMs: number): AiInsight | null {
  const points = input.weights
    .map((entry) => {
      const ms = parseMs(entry.date);
      return ms == null ? null : { ms, value: entry.value };
    })
    .filter((p): p is { ms: number; value: number } => p != null)
    .filter((p) => nowMs - p.ms <= 30 * DAY_MS)
    .sort((a, b) => a.ms - b.ms);

  if (points.length < 2) return null;

  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (first <= 0) return null;

  const percent = ((last - first) / first) * 100;
  const abs = Math.abs(percent);
  if (abs < 2.5) return null;

  const increased = percent > 0;
  const priority: InsightPriority = abs >= 8 ? 'high' : abs >= 5 ? 'medium' : 'low';
  const message = input.locale === 'tr'
    ? `${input.petName} son 30 günde ${increased ? 'yaklaşık' : 'yaklaşık'} %${abs.toFixed(1)} ${increased ? 'kilo aldı' : 'kilo verdi'}.`
    : `${input.petName} ${increased ? 'gained' : 'lost'} about ${abs.toFixed(1)}% weight in the last 30 days.`;

  return { id: `weight-trend-${Math.round(abs * 10)}`, type: 'trend', priority, message };
}

function withWeightAction(insight: AiInsight, locale: 'en' | 'tr'): AiInsight {
  return {
    ...insight,
    actionType: 'logWeight',
    actionLabel: locale === 'tr' ? 'Kilo Ekle' : 'Log',
  };
}

function buildVetFrequencyInsight(input: BuildInsightsInput, nowMs: number): AiInsight | null {
  const recentCount = input.vetVisits
    .filter((visit) => {
      const ms = parseMs(visit.visitDate);
      if (ms == null) return false;
      return nowMs - ms <= 60 * DAY_MS;
    })
    .length;

  if (recentCount < 3) return null;

  const message = input.locale === 'tr'
    ? `Son 60 günde ${recentCount} veteriner ziyareti var. Takip planını gözden geçirmek faydalı olabilir.`
    : `${recentCount} vet visits in the last 60 days. Consider reviewing follow-up plan.`;

  return {
    id: `vet-frequency-${recentCount}`,
    type: 'alert',
    priority: recentCount >= 4 ? 'high' : 'medium',
    message,
  };
}

function buildVaccineInsight(input: BuildInsightsInput): AiInsight | null {
  if (!input.vaccineCounts) return null;

  if ((input.vaccineCounts.overdueCount ?? 0) > 0) {
    const message = input.locale === 'tr'
      ? `${input.vaccineCounts.overdueCount} aşı gecikmiş görünüyor. Uygun bir ziyaret planlayın.`
      : `${input.vaccineCounts.overdueCount} vaccine(s) look overdue. Consider scheduling a visit.`;
    return {
      id: `vaccine-overdue-${input.vaccineCounts.overdueCount}`,
      type: 'alert',
      priority: 'high',
      message,
      actionType: 'addVisit',
      actionLabel: input.locale === 'tr' ? 'Randevu' : 'Schedule',
    };
  }

  if ((input.vaccineCounts.dueSoonCount ?? 0) > 0 && input.vaccineNextUp) {
    const message = input.locale === 'tr'
      ? `Yaklaşan aşı: ${input.vaccineNextUp.name} (${input.vaccineNextUp.inWeeks}).`
      : `Upcoming vaccine: ${input.vaccineNextUp.name} (${input.vaccineNextUp.inWeeks}).`;
    return {
      id: `vaccine-due-soon-${input.vaccineCounts.dueSoonCount}`,
      type: 'suggestion',
      priority: 'medium',
      message,
      actionType: 'addVaccine',
      actionLabel: input.locale === 'tr' ? 'Aşı Ekle' : 'Add',
    };
  }

  return null;
}

function buildReminderGapInsight(input: BuildInsightsInput, nowMs: number): AiInsight | null {
  const active = input.reminders.filter((item) => item.isActive);
  if (active.length === 0) {
    return {
      id: 'reminder-empty',
      type: 'suggestion',
      priority: 'low',
      message: input.locale === 'tr'
        ? 'Henüz aktif hatırlatma yok. Düzenli bakım için birkaç hatırlatma ekleyin.'
        : 'No active reminders yet. Add a few for consistent care.',
      actionType: 'addReminder',
      actionLabel: input.locale === 'tr' ? 'Ekle' : 'Add',
    };
  }

  const latestCompletedMs = input.reminders
    .map((item) => parseMs(item.completedAt))
    .filter((ms): ms is number => ms != null)
    .sort((a, b) => b - a)[0];

  const upcoming7 = active.filter((item) => {
    const ms = parseMs(item.scheduledAt);
    if (ms == null) return false;
    return ms >= nowMs && ms <= nowMs + 7 * DAY_MS;
  }).length;

  if (upcoming7 > 0) return null;

  if (latestCompletedMs == null || nowMs - latestCompletedMs > 14 * DAY_MS) {
    return {
      id: 'reminder-gap',
      type: 'suggestion',
      priority: 'medium',
      message: input.locale === 'tr'
        ? 'Son dönemde hatırlatma aktivitesi düşük. Haftalık bakım hatırlatması ekleyebilirsiniz.'
        : 'Reminder activity has been low recently. You can add a weekly care reminder.',
      actionType: 'addReminder',
      actionLabel: input.locale === 'tr' ? 'Hatırlatma' : 'Add Reminder',
    };
  }

  return null;
}

export function buildAiInsights(input: BuildInsightsInput): AiInsight[] {
  const nowMs = input.nowMs ?? Date.now();

  const weightInsight = buildWeightTrendInsight(input, nowMs);
  const candidates: Array<AiInsight | null> = [
    weightInsight ? withWeightAction(weightInsight, input.locale) : null,
    buildVetFrequencyInsight(input, nowMs),
    buildVaccineInsight(input),
    buildReminderGapInsight(input, nowMs),
  ];

  return sortInsights(candidates.filter((item): item is AiInsight => item != null));
}
