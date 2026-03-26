import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AiInsight } from '../lib/insightsEngine';
import type { ReminderSubtype } from '../lib/healthMvpModel';

type PrimaryTabLike = 'home' | 'healthHub' | 'reminders' | 'insights';

export function useInsightActions<Route extends string>(args: {
  activePetId: string;
  route: Route;
  setReminderCreateSubtypePreset: Dispatch<SetStateAction<ReminderSubtype | null>>;
  setReminderCreateNonce: Dispatch<SetStateAction<number>>;
  setPrimaryTab: Dispatch<SetStateAction<PrimaryTabLike>>;
  setRoute: Dispatch<SetStateAction<Route>>;
  openHealthHubCreate: (type: 'vaccine' | 'diagnosis', category?: 'vaccine' | 'record') => void;
  openVetVisitWithPreset: (backTo: Route, preset: { source: 'other'; reason: 'checkup'; actions: [] }) => void;
  openWeightTracking: (petId: string, from: Route) => void;
}) {
  const {
    activePetId,
    route,
    setReminderCreateSubtypePreset,
    setReminderCreateNonce,
    setPrimaryTab,
    setRoute,
    openHealthHubCreate,
    openVetVisitWithPreset,
    openWeightTracking,
  } = args;

  const handleInsightAction = useCallback((insight: AiInsight) => {
    if (insight.actionType === 'addReminder') {
      setReminderCreateSubtypePreset(null);
      setReminderCreateNonce((prev) => prev + 1);
      setPrimaryTab('reminders');
      setRoute('reminders' as Route);
      return;
    }
    if (insight.actionType === 'addVaccine') {
      openHealthHubCreate('vaccine', 'vaccine');
      return;
    }
    if (insight.actionType === 'addVisit') {
      openVetVisitWithPreset(route, {
        source: 'other',
        reason: 'checkup',
        actions: [],
      });
      return;
    }
    if (insight.actionType === 'logWeight') {
      openWeightTracking(activePetId, route);
    }
  }, [
    activePetId,
    openHealthHubCreate,
    openVetVisitWithPreset,
    openWeightTracking,
    route,
    setPrimaryTab,
    setReminderCreateNonce,
    setReminderCreateSubtypePreset,
    setRoute,
  ]);

  return { handleInsightAction };
}
