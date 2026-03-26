import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AddHealthRecordType, HealthHubCategory } from '../screens/HealthHubScreen';

type PrimaryTabLike = 'home' | 'healthHub' | 'reminders' | 'insights';

type HealthHubCreatePreset = {
  type: AddHealthRecordType;
  title?: string;
  note?: string;
  openCreate: boolean;
  nonce: number;
};

export function useHealthHubActions<Route extends string, VetVisitCreatePreset>(args: {
  setPrimaryTab: Dispatch<SetStateAction<PrimaryTabLike>>;
  setHealthHubInitialCategory: Dispatch<SetStateAction<HealthHubCategory>>;
  setHealthHubCategoryResetKey: Dispatch<SetStateAction<number>>;
  setHealthHubCreatePreset: Dispatch<SetStateAction<HealthHubCreatePreset | null>>;
  setSubBackRoute: Dispatch<SetStateAction<Route>>;
  setVetVisitCreatePreset: Dispatch<SetStateAction<VetVisitCreatePreset | null>>;
  setRoute: Dispatch<SetStateAction<Route>>;
}) {
  const {
    setPrimaryTab,
    setHealthHubInitialCategory,
    setHealthHubCategoryResetKey,
    setHealthHubCreatePreset,
    setSubBackRoute,
    setVetVisitCreatePreset,
    setRoute,
  } = args;

  const openHealthHubWithCategory = useCallback((category: HealthHubCategory = 'all') => {
    setPrimaryTab('healthHub');
    setHealthHubInitialCategory(category);
    setHealthHubCategoryResetKey((prev) => prev + 1);
    setHealthHubCreatePreset(null);
    setRoute('healthHub' as Route);
  }, [setHealthHubCategoryResetKey, setHealthHubCreatePreset, setHealthHubInitialCategory, setPrimaryTab, setRoute]);

  const openHealthHubCreate = useCallback((
    type: AddHealthRecordType,
    category: HealthHubCategory = 'record',
    options?: { title?: string; note?: string },
  ) => {
    setPrimaryTab('healthHub');
    setHealthHubInitialCategory(category);
    setHealthHubCategoryResetKey((prev) => prev + 1);
    setHealthHubCreatePreset({
      type,
      title: options?.title,
      note: options?.note,
      openCreate: true,
      nonce: Date.now(),
    });
    setRoute('healthHub' as Route);
  }, [setHealthHubCategoryResetKey, setHealthHubCreatePreset, setHealthHubInitialCategory, setPrimaryTab, setRoute]);

  const openVetVisitWithPreset = useCallback((backTo: Route, preset: VetVisitCreatePreset) => {
    setSubBackRoute(backTo);
    setVetVisitCreatePreset({
      ...preset,
      openCreate: true,
      nonce: Date.now(),
    } as VetVisitCreatePreset);
    setRoute('vetVisits' as Route);
  }, [setRoute, setSubBackRoute, setVetVisitCreatePreset]);

  return {
    openHealthHubWithCategory,
    openHealthHubCreate,
    openVetVisitWithPreset,
  };
}
