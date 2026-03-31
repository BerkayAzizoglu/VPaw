import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AiInsight } from '../lib/insightsEngine';
import type { ReminderSubtype } from '../lib/healthMvpModel';

type PrimaryTabLike = 'home' | 'healthHub' | 'reminders' | 'insights' | 'profile';

export function useInsightActions<Route extends string>(args: {
  activePetId: string;
  route: Route;
  setReminderCreateSubtypePreset: Dispatch<SetStateAction<ReminderSubtype | null>>;
  setReminderCreateNonce: Dispatch<SetStateAction<number>>;
  setPrimaryTab: Dispatch<SetStateAction<PrimaryTabLike>>;
  setRoute: Dispatch<SetStateAction<Route>>;
  openHealthHubCreateWithContext: (
    origin: Route,
    type: 'vaccine' | 'diagnosis',
    category?: 'vaccine' | 'record',
    successRoute?: Route,
  ) => void;
  onOpenVetVisitCreate: () => void;
  openWeightTracking: (petId: string, from: Route) => void;
}) {
  const {
    activePetId,
    route,
    setReminderCreateSubtypePreset,
    setReminderCreateNonce,
    setPrimaryTab,
    setRoute,
    openHealthHubCreateWithContext,
    onOpenVetVisitCreate,
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
      openHealthHubCreateWithContext(route, 'vaccine', 'vaccine');
      return;
    }
    if (insight.actionType === 'addVisit') {
      onOpenVetVisitCreate();
      return;
    }
    if (insight.actionType === 'logWeight') {
      openWeightTracking(activePetId, route);
    }
  }, [
    activePetId,
    openHealthHubCreateWithContext,
    onOpenVetVisitCreate,
    openWeightTracking,
    route,
    setPrimaryTab,
    setReminderCreateNonce,
    setReminderCreateSubtypePreset,
    setRoute,
  ]);

  return { handleInsightAction };
}
