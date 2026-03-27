import React from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { WeightPoint } from '../lib/healthMvpModel';
import type { PetProfile } from '../lib/petProfileTypes';
import BackgroundBlobs from '../components/pets/BackgroundBlobs';
import HeroInfoCard from '../components/pets/HeroInfoCard';
import PetListCard from '../components/pets/PetListCard';
import PetsHeader from '../components/pets/PetsHeader';
import PrimaryGradientButton from '../components/pets/PrimaryGradientButton';

type PetsScreenProps = {
  pets: PetProfile[];
  activePetId?: string;
  weightsByPet?: Record<string, WeightPoint[]>;
  locale?: 'en' | 'tr';
  canAddPet: boolean;
  isPremiumPlan?: boolean;
  onBack: () => void;
  onOpenPet: (petId: string) => void;
  onAddPet: () => void;
};

type PetsViewItem = {
  id: string;
  name: string;
  meta: string;
  weightText: string;
  imageUri?: string;
  isActive: boolean;
};

function formatWeight(value: number | null, locale: 'en' | 'tr') {
  if (value == null) return locale === 'tr' ? 'Son kilo: -' : 'Last weight: -';
  return `${locale === 'tr' ? 'Son kilo' : 'Last weight'}: ${value.toFixed(1)} kg`;
}

function localizeType(type: PetProfile['petType'], locale: 'en' | 'tr') {
  if (locale === 'tr') return type === 'Dog' ? 'Kopek' : type === 'Cat' ? 'Kedi' : type;
  return type;
}

export default function PetsScreen({
  pets,
  activePetId,
  weightsByPet,
  locale = 'en',
  canAddPet,
  isPremiumPlan = false,
  onBack,
  onOpenPet,
  onAddPet,
}: PetsScreenProps) {
  const { height: screenHeight } = useWindowDimensions();
  const isTr = locale === 'tr';
  const sortedPets = [...pets].sort((a, b) => (a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)));

  const viewItems: PetsViewItem[] = sortedPets.map((pet) => {
    const latestWeight = (weightsByPet?.[pet.id] ?? []).at(-1)?.value ?? null;
    const typeLabel = localizeType(pet.petType, locale);
    const meta = [typeLabel, pet.breed?.trim()].filter(Boolean).join(' / ') || (isTr ? 'Profil hazir' : 'Profile ready');
    return {
      id: pet.id,
      name: pet.name,
      meta,
      weightText: formatWeight(latestWeight, locale),
      imageUri: pet.image || undefined,
      isActive: pet.id === activePetId,
    };
  });

  const activeCountLabel = `${viewItems.length} ${isTr ? 'Aktif' : 'Active'}`;
  const heroTitle = isTr ? 'Tum petlerin tek yerde' : 'All your pets in one place';
  const heroBody = isTr
    ? 'Aktif pet en ustte kalir. Herhangi bir karti acip detaylari oradan yonetebilirsin.'
    : 'Your active pet stays on top. Open any card to manage details from there.';
  const ctaLabel = isTr ? 'Pet Ekle / Yonet' : 'Add / Manage Pets';
  const stackMinHeight = Math.max(560, screenHeight - 210);
  const swipeBackGuard = React.useRef(false);
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6,
        onPanResponderMove: (_, gestureState) => {
          if (
            !swipeBackGuard.current &&
            gestureState.dx > 64 &&
            Math.abs(gestureState.dy) < 36 &&
            gestureState.vx > 0.2
          ) {
            swipeBackGuard.current = true;
            onBack();
          }
        },
        onPanResponderRelease: () => {
          swipeBackGuard.current = false;
        },
        onPanResponderTerminate: () => {
          swipeBackGuard.current = false;
        },
      }),
    [onBack]
  );

  return (
    <View style={styles.screen} {...panResponder.panHandlers}>
      <BackgroundBlobs />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PetsHeader
          label={isTr ? 'Petlerin' : 'Your Pets'}
          title={activeCountLabel}
          onBack={onBack}
        />

        <View style={[styles.stack, { minHeight: stackMinHeight }]}>
          <View style={styles.mainContent}>
            <HeroInfoCard title={heroTitle} body={heroBody} />

            {viewItems.length > 0 ? (
              <View style={styles.cardList}>
                {viewItems.map((pet, index) => (
                  <PetListCard
                    key={pet.id}
                    name={pet.name}
                    meta={pet.meta}
                    weightText={pet.weightText}
                    imageUri={pet.imageUri}
                    badge={pet.isActive ? (isTr ? 'Aktif' : 'Active') : undefined}
                    actionLabel={isTr ? 'Ac' : 'Open'}
                    highlighted={pet.isActive || index === 0}
                    onPress={() => onOpenPet(pet.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{isTr ? 'Henuz pet yok' : 'No pets yet'}</Text>
                <Text style={styles.emptySub}>
                  {isTr
                    ? 'Ilk pet eklendiginde burada ayni premium duzende gorunecek.'
                    : 'Your pets will appear here in the same premium layout after the first one is added.'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonWrap}>
            <PrimaryGradientButton label={ctaLabel} disabled={!canAddPet && !isPremiumPlan} onPress={onAddPet} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EDE8F2',
  },
  content: {
    paddingBottom: 72,
  },
  stack: {
    marginTop: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  mainContent: {
    gap: 14,
  },
  cardList: {
    gap: 12,
  },
  buttonWrap: {
    marginTop: 46,
    paddingBottom: 34,
  },
  emptyCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1A1E2E',
    letterSpacing: -0.3,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    color: 'rgba(26,30,46,0.55)',
  },
});
