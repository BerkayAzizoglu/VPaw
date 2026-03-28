import React from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { WeightPoint } from '../lib/healthMvpModel';
import type { PetProfile } from '../lib/petProfileTypes';
import BackgroundBlobs from '../components/pets/BackgroundBlobs';
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
  weightValue: number | null;
  updatedLabel?: string | null;
  latestWeightValue: number | null;
  latestWeightDateMs: number | null;
  hasWeight: boolean;
  imageUri?: string;
  isActive: boolean;
};

function localizeType(type: PetProfile['petType'], locale: 'en' | 'tr') {
  if (locale === 'tr') return type === 'Dog' ? 'Kopek' : type === 'Cat' ? 'Kedi' : type;
  return type;
}

function parseDateMs(value: string | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatShortDate(value: string | undefined, locale: 'en' | 'tr') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const lang = locale === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(date);
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
    const latestWeightPoint = (weightsByPet?.[pet.id] ?? []).at(-1);
    const latestWeight = latestWeightPoint?.value ?? null;
    const typeLabel = localizeType(pet.petType, locale);
    const meta = [typeLabel, pet.breed?.trim()].filter(Boolean).join(' / ') || (isTr ? 'Profil hazir' : 'Profile ready');
    const latestDateMs = parseDateMs(latestWeightPoint?.date);

    return {
      id: pet.id,
      name: pet.name,
      meta,
      weightValue: latestWeight,
      updatedLabel: formatShortDate(latestWeightPoint?.date, locale),
      latestWeightValue: latestWeight,
      latestWeightDateMs: latestDateMs,
      hasWeight: latestWeight != null,
      imageUri: pet.image || undefined,
      isActive: pet.id === activePetId,
    };
  });

  const trackedPets = viewItems.filter((pet) => pet.hasWeight).length;
  const petCount = pets.length;
  const primaryPet = sortedPets[0];
  const primaryWeightPoint = primaryPet ? (weightsByPet?.[primaryPet.id] ?? []).at(-1) : undefined;
  const primaryWeightValue = primaryWeightPoint?.value ?? null;
  const primaryUpdatedLabel = formatShortDate(primaryWeightPoint?.date, locale);

  const lastWeightText =
    primaryWeightValue != null ? `${primaryWeightValue.toFixed(1)} kg` : 'No weight data';
  const lastUpdatedText = primaryUpdatedLabel ?? 'No recent updates';

  const snapshotTitle =
    petCount === 1 && primaryPet?.name
      ? `${primaryPet.name} snapshot`
      : 'Care snapshot';

  const snapshotHeadline =
    petCount === 1
      ? `${primaryPet?.name ?? 'Your pet'} is being tracked`
      : `${petCount} pets in care`;

  const snapshotSubtext =
    primaryWeightValue != null
      ? `Latest weight recorded: ${lastWeightText}`
      : 'Add the first health record to build a clearer care overview.';

  const activeCountLabel = isTr ? 'Bakim Paneli' : 'Care Overview';
  const heroTitle = snapshotTitle;
  const heroBody = `${snapshotHeadline}\n${snapshotSubtext}`;
  const heroSupporting = `Last updated ${lastUpdatedText}`;
  const ctaLabel = isTr ? 'Petleri Yonet' : 'Manage Pets';

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
        <PetsHeader label={isTr ? 'Petlerin' : 'Your Pets'} title={activeCountLabel} onBack={onBack} />

        <View style={[styles.stack, { minHeight: stackMinHeight }]}>
          <View style={styles.mainContent}>
            <View style={styles.snapshotCard}>
              <View style={styles.snapshotHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.snapshotEyebrow}>YOUR PETS</Text>
                  <Text style={styles.snapshotTitle}>{snapshotTitle}</Text>
                </View>

                <View style={styles.snapshotIconWrap}>
                  <Text style={styles.snapshotIcon}>⌁</Text>
                </View>
              </View>

              <Text style={styles.snapshotHeadline}>{snapshotHeadline}</Text>
              <Text style={styles.snapshotSubtext}>{snapshotSubtext}</Text>

              <View style={styles.snapshotStatsRow}>
                <View style={styles.snapshotStatPill}>
                  <Text style={styles.snapshotStatValue}>{petCount}</Text>
                  <Text style={styles.snapshotStatLabel}>Pets</Text>
                </View>

                <View style={styles.snapshotStatPill}>
                  <Text style={styles.snapshotStatValue}>
                    {primaryWeightValue != null ? 'Tracked' : 'No data'}
                  </Text>
                  <Text style={styles.snapshotStatLabel}>Weight</Text>
                </View>

                <View style={styles.snapshotStatPill}>
                  <Text style={styles.snapshotStatValue}>{lastUpdatedText}</Text>
                  <Text style={styles.snapshotStatLabel}>Updated</Text>
                </View>
              </View>
            </View>

            {viewItems.length > 0 ? (
              <View style={styles.cardList}>
                {viewItems.map((pet, index) => (
                  <PetListCard
                    key={pet.id}
                    name={pet.name}
                    meta={pet.meta}
                    weightValue={pet.weightValue}
                    updatedLabel={pet.updatedLabel}
                    imageUri={pet.imageUri}
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
    marginTop: 8,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  mainContent: {
    gap: 16,
  },
  cardList: {
    gap: 10,
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
  snapshotCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#16324F',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  snapshotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  snapshotEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(18,52,86,0.6)',
    marginBottom: 6,
  },
  snapshotTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: '#10243E',
  },
  snapshotIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(129, 223, 190, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotIcon: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1496A6',
  },
  snapshotHeadline: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#17314D',
    marginBottom: 8,
  },
  snapshotSubtext: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: 'rgba(23,49,77,0.72)',
    marginBottom: 18,
  },
  snapshotStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  snapshotStatPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
  },
  snapshotStatValue: {
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '800',
    color: '#157C92',
    marginBottom: 4,
  },
  snapshotStatLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: 'rgba(23,49,77,0.58)',
  },
});
