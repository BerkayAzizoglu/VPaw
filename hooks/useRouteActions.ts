import { useCallback, type Dispatch, type SetStateAction } from 'react';

type SubRouteTarget = 'vetVisits';

export function useRouteActions<Route extends string>(args: {
  activePetId: string;
  setRoute: Dispatch<SetStateAction<Route>>;
  setSubBackRoute: Dispatch<SetStateAction<Route>>;
  setPetProfileBackRoute: Dispatch<SetStateAction<Route>>;
  setWeightBackRoute: Dispatch<SetStateAction<Route>>;
  setPassportBackRoute: Dispatch<SetStateAction<Route>>;
  setPremiumBackRoute: Dispatch<SetStateAction<Route>>;
  setDocumentsBackRoute: Dispatch<SetStateAction<Route>>;
  setNotificationsBackRoute: Dispatch<SetStateAction<Route>>;
  setActivePetWithPersist: (petId: string) => void;
}) {
  const {
    activePetId,
    setRoute,
    setSubBackRoute,
    setPetProfileBackRoute,
    setWeightBackRoute,
    setPassportBackRoute,
    setPremiumBackRoute,
    setDocumentsBackRoute,
    setNotificationsBackRoute,
    setActivePetWithPersist,
  } = args;

  const openSubRoute = useCallback((target: SubRouteTarget, backTo: Route) => {
    setSubBackRoute(backTo);
    setRoute(target as Route);
  }, [setRoute, setSubBackRoute]);

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

  const openPremium = useCallback((from: Route = 'profile' as Route) => {
    setPremiumBackRoute(from);
    setRoute('premium' as Route);
  }, [setPremiumBackRoute, setRoute]);

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
    openPremium,
    openDocuments,
    openNotifications,
  };
}
