import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import PremiumScreen from '../screens/PremiumScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import VaccinationsScreen from '../screens/VaccinationsScreen';
import WeightTrackingScreen, { WeightPoint } from '../screens/WeightTrackingScreen';
import HealthRecordsScreen from '../screens/HealthRecordsScreen';
import VetVisitsScreen from '../screens/VetVisitsScreen';
import PetEditScreen from '../screens/PetEditScreen';

type AppRoute =
  | 'home'
  | 'profile'
  | 'premium'
  | 'profileEdit'
  | 'vaccinations'
  | 'petProfile'
  | 'healthRecords'
  | 'vetVisits'
  | 'petEdit';

type PetId = 'luna' | 'milo';

type PetMeta = {
  id: PetId;
  name: string;
};

const PETS: Record<PetId, PetMeta> = {
  luna: { id: 'luna', name: 'Luna' },
  milo: { id: 'milo', name: 'Milo' },
};

const INITIAL_WEIGHTS: Record<PetId, WeightPoint[]> = {
  luna: [
    { label: 'Jan 30', value: 4.9, date: 'February 15, 2026', change: 'Stable' },
    { label: 'Feb 15', value: 5.0, date: 'March 1, 2026', change: '+0.1 kg' },
    { label: 'Mar 1', value: 5.0, date: 'March 15, 2026', change: '+0.1 kg' },
    { label: 'Mar 15', value: 5.1, date: 'April 1, 2026', change: '+0.1 kg' },
    { label: 'Apr 1', value: 5.2, date: 'April 15, 2026', change: '+0.1 kg' },
  ],
  milo: [
    { label: 'Jan 30', value: 4.7, date: 'February 15, 2026', change: 'Stable' },
    { label: 'Feb 15', value: 4.8, date: 'March 1, 2026', change: '+0.1 kg' },
    { label: 'Mar 1', value: 4.9, date: 'March 15, 2026', change: '+0.1 kg' },
    { label: 'Mar 15', value: 5.0, date: 'April 1, 2026', change: '+0.1 kg' },
    { label: 'Apr 1', value: 5.1, date: 'April 15, 2026', change: '+0.1 kg' },
  ],
};

function formatShortLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(',', '');
}

function formatLongLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function AuthGate() {
  const { session, loading } = useAuth();
  const [route, setRoute] = useState<AppRoute>('home');
  const [subBackRoute, setSubBackRoute] = useState<AppRoute>('home');
  const [activePetId, setActivePetId] = useState<PetId>('luna');
  const [weightsByPet, setWeightsByPet] = useState<Record<PetId, WeightPoint[]>>(INITIAL_WEIGHTS);

  useEffect(() => {
    setRoute('home');
  }, [session?.user?.id]);

  const openSubRoute = (target: 'vaccinations' | 'healthRecords' | 'vetVisits', backTo: AppRoute) => {
    setSubBackRoute(backTo);
    setRoute(target);
  };

  const openPetProfile = (petId: PetId = 'luna', from: AppRoute = 'home') => {
    setActivePetId(petId);
    setSubBackRoute(from);
    setRoute('petProfile');
  };

  const addWeightEntryForActivePet = (value: number) => {
    setWeightsByPet((prev) => {
      const current = prev[activePetId] ?? [];
      const rounded = Number(value.toFixed(1));
      const last = current[current.length - 1];
      const delta = last ? rounded - last.value : 0;
      const change = Math.abs(delta) < 0.01 ? 'Stable' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`;
      const now = new Date();

      const nextEntry: WeightPoint = {
        label: formatShortLabel(now),
        value: rounded,
        date: formatLongLabel(now),
        change,
      };

      return {
        ...prev,
        [activePetId]: [...current, nextEntry].slice(-8),
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2d2d2d" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onSignedIn={() => setRoute('home')} />;
  }

  if (route === 'profileEdit') {
    return <ProfileEditScreen onBack={() => setRoute('profile')} onSaved={() => setRoute('profile')} />;
  }

  if (route === 'vaccinations') {
    return <VaccinationsScreen onBack={() => setRoute(subBackRoute)} />;
  }

  if (route === 'healthRecords') {
    return <HealthRecordsScreen onBack={() => setRoute(subBackRoute)} />;
  }

  if (route === 'vetVisits') {
    return <VetVisitsScreen onBack={() => setRoute(subBackRoute)} />;
  }

  if (route === 'petProfile') {
    const activePet = PETS[activePetId];
    return (
      <WeightTrackingScreen
        onBack={() => setRoute(subBackRoute)}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'petProfile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'petProfile')}
        petName={activePet.name}
        entries={weightsByPet[activePetId]}
        onAddEntry={addWeightEntryForActivePet}
      />
    );
  }


  if (route === 'petEdit') {
    return <PetEditScreen petId={activePetId} onBack={() => setRoute('home')} onSaved={() => setRoute('home')} />;
  }
  if (route === 'profile') {
    return (
      <ProfileScreen
        onSaveSuccess={() => setRoute('home')}
        onBackHome={() => setRoute('home')}
        onOpenPremium={() => setRoute('premium')}
        onOpenProfileEdit={() => setRoute('profileEdit')}
        onOpenVaccinations={() => openSubRoute('vaccinations', 'profile')}
        onOpenPetProfile={() => openPetProfile(activePetId, 'profile')}
        onOpenHealthRecords={() => openSubRoute('healthRecords', 'profile')}
        onOpenVetVisits={() => openSubRoute('vetVisits', 'profile')}
      />
    );
  }

  if (route === 'premium') {
    return <PremiumScreen onBack={() => setRoute('profile')} />;
  }

  return (
    <HomeScreen
      onOpenProfile={() => setRoute('profile')}
      onOpenPetProfile={(petId) => openPetProfile((petId as PetId) || 'luna', 'home')}
      onOpenVaccinations={(petId) => {
        if (petId) setActivePetId(petId as PetId);
        openSubRoute('vaccinations', 'home');
      }}
      onOpenHealthRecords={(petId) => {
        if (petId) setActivePetId(petId as PetId);
        openSubRoute('healthRecords', 'home');
      }}
      onOpenVetVisits={(petId) => {
        if (petId) setActivePetId(petId as PetId);
        openSubRoute('vetVisits', 'home');
      }}
      onOpenPetEdit={(petId) => {
        if (petId) setActivePetId(petId as PetId);
        setRoute('petEdit');
      }}
      activePetId={activePetId}
      onChangeActivePet={(petId) => setActivePetId(petId as PetId)}
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: '#ececec',
    alignItems: 'center',
    justifyContent: 'center',
  },
});



