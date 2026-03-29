import { useCallback, type Dispatch, type SetStateAction } from 'react';

type SubRouteTarget = 'vaccinations' | 'healthRecords' | 'vetVisits';

export function useRouteActions<Route extends string, VetVisitCreatePreset>(args: {
  activePetId: string;
  setRoute: Dispatch<SetStateAction<Route>>;
  setSubBackRoute: Dispatch<SetStateAction<Route>>;
  setPetProfileBackRoute: Dispatch<SetStateAction<Route>>;
  setWeightBackRoute: Dispatch<SetStateAction<Route>>;
  setPassportBackRoute: Dispatch<SetStateAction<Route>>;
  setDocumentsBackRoute: Dispatch<SetStateAction<Route>>;
  setNotificationsBackRoute: Dispatch<SetStateAction<Route>>;
  setVetVisitCreatePreset: Dispatch<SetStateAction<VetVisitCreatePreset | null>>;
  setActivePetWithPersist: (petId: string) => void;
}) {
  const {
    activePetId,
    setRoute,
    setSubBackRoute,
    setPetProfileBackRoute,
    setWeightBackRoute,
    setPassportBackRoute,
    setDocumentsBackRoute,
    setNotificationsBackRoute,
    setVetVisitCreatePreset,
    setActivePetWithPersist,
  } = args;

  const openSubRoute = useCallback((target: SubRouteTarget, backTo: Route) => {
    setSubBackRoute(backTo);
    setVetVisitCreatePreset(null);
    setRoute(target as Route);
  }, [setRoute, setSubBackRoute, setVetVisitCreatePreset]);

  const openPetProfile = useCallback((petId: string = activePetId, from: Route = 'home' as Route) => {
    setActivePetWithPersist(petId);
    setPetProfileBackRoute(from);
    setSubBackRoute(from);
    setRoute('petProfile' as Route);
  }, [activePetId, setActivePetWithPersist, setPetProfileBackRoute, setRoute, setSubBackRoute]);

  const openWeightTracking = useCallback((petId: string = activePetId, from: Route = 'petProfile' as Route) => {
    setActivePetWithPersist(petId);
    setWeightBackRoute(from);
    setRoute('weightTracking' as Route);
  }, [activePetId, setActivePetWithPersist, setRoute, setWeightBackRoute]);

  const openPassport = useCallback((petId: string = activePetId, from: Route = 'home' as Route) => {
    setActivePetWithPersist(petId);
    setPassportBackRoute(from);
    setRoute('passport' as Route);
  }, [activePetId, setActivePetWithPersist, setPassportBackRoute, setRoute]);

  const openDocuments = useCallback((from: Route = 'healthHub' as Route) => {
    setDocumentsBackRoute(from);
    setRoute('documents' as Route);
  }, [setDocumentsBackRoute, setRoute]);

  const openNotifications = useCallback((from: Route = 'reminders' as Route) => {
    setNotificationsBackRoute(from);
    setRoute('notifications' as Route);
  }, [setNotificationsBackRoute, setRoute]);

  return {
    openSubRoute,
    openPetProfile,
    openWeightTracking,
    openPassport,
    openDocuments,
    openNotifications,
  };
}
