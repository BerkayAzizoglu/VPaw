import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WeightPoint } from '../lib/healthMvpModel';
import type { PetProfile } from '../lib/petProfileTypes';
import BackgroundBlobs from '../components/pets/BackgroundBlobs';
import PetListCard from '../components/pets/PetListCard';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';

type PetsScreenProps = {
  pets: PetProfile[];
  activePetId?: string;
  weightsByPet?: Record<string, WeightPoint[]>;
  locale?: 'en' | 'tr';
  canAddPet: boolean;
  isPremiumPlan?: boolean;
  userAvatarUri?: string;
  userName?: string;
  onBack: () => void;
  onOpenProfile?: () => void;
  onOpenPet: (petId: string) => void;
  onAddPet: () => void;
  onRefresh?: () => Promise<void> | void;
};

type PetsViewItem = {
  id: string;
  name: string;
  meta: string;
  weightValue: number | null;
  updatedLabel?: string | null;
  imageUri?: string;
  isActive: boolean;
};

function localizeType(type: PetProfile['petType'], locale: 'en' | 'tr') {
  if (locale === 'tr') return type === 'Dog' ? 'Kopek' : type === 'Cat' ? 'Kedi' : type;
  return type;
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
  userAvatarUri,
  userName,
  onBack,
  onOpenProfile,
  onOpenPet,
  onAddPet,
  onRefresh,
}: PetsScreenProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);
  const compact = screenHeight <= 820 || screenWidth <= 380;
  const sortedPets = [...pets].sort((a, b) =>
    a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)
  );

  const viewItems: PetsViewItem[] = sortedPets.map((pet) => {
    const latestWeightPoint = (weightsByPet?.[pet.id] ?? []).at(-1);
    const latestWeight = latestWeightPoint?.value ?? null;
    const typeLabel = localizeType(pet.petType, locale);
    const meta =
      [typeLabel, pet.breed?.trim()].filter(Boolean).join(' / ') ||
      (isTr ? 'Profil hazır' : 'Profile ready');

    return {
      id: pet.id,
      name: pet.name,
      meta,
      weightValue: latestWeight,
      updatedLabel: formatShortDate(latestWeightPoint?.date, locale),
      imageUri: pet.image || undefined,
      isActive: pet.id === activePetId,
    };
  });
  const mediumDenseList = viewItems.length >= 4;
  const maxDenseList = viewItems.length >= 7;

  const screenTitle = isTr ? 'Pet Genel Bakış' : 'Pet Overview';
  const ctaLabel = isTr ? 'Yeni Pet Ekle' : 'Add Pet';
  const refreshOffset = Platform.OS === 'ios' ? 36 : 0;

  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) {
        await Promise.resolve(onRefresh());
      } else {
        await new Promise((resolve) => setTimeout(resolve, 650));
      }
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);
  const handleAddPet = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddPet();
  }, [onAddPet]);
  const handleBack = React.useCallback(() => {
    onBack();
  }, [onBack]);
  const handleOpenProfile = React.useCallback(() => {
    onOpenProfile?.();
  }, [onOpenProfile]);

  const swipePanResponder = useEdgeSwipeBack({
    onBack,
    fullScreenGestureEnabled: false,
    enterVariant: 'snappy',
  });

  return (
    <View style={styles.root}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.screen} {...swipePanResponder.panHandlers}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 0,
              paddingBottom: 214 + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: 214 }}
          bounces
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2A6A88"
              colors={['#2D6D8A']}
              progressViewOffset={refreshOffset}
            />
          }
        >
          <View style={styles.headerBlock}>
            <View style={styles.topRow}>
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>{'\u2039'}</Text>
              </Pressable>
              <Pressable onPress={handleOpenProfile} style={styles.profileButton}>
                {userAvatarUri ? (
                  <Image
                    source={{ uri: userAvatarUri }}
                    style={styles.profileAvatar}
                  />
                ) : (
                  <View style={styles.profileAvatarFallback}>
                    <Text style={styles.profileAvatarFallbackText}>
                      {userName?.[0]?.toUpperCase?.() ?? 'B'}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
            <Text style={styles.eyebrow}>{isTr ? 'PETLERIN' : 'YOUR PETS'}</Text>
            <Text style={styles.title}>{screenTitle}</Text>
          </View>

          <View style={[styles.stack, compact && styles.stackCompact]}>
            <View style={styles.mainContent}>
              {viewItems.length > 0 ? (
                <View
                  style={[
                    styles.petsList,
                    mediumDenseList && styles.petsListDense,
                    maxDenseList && styles.petsListMaxDense,
                  ]}
                >
                  {viewItems.map((pet, index) => (
                    <PetListCard
                      key={pet.id}
                      name={pet.name}
                      meta={pet.meta}
                      weightValue={pet.weightValue}
                      updatedLabel={pet.updatedLabel}
                      imageUri={pet.imageUri}
                      highlighted={pet.isActive || index === 0}
                      compact={compact || mediumDenseList}
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
            </View>
          </ScrollView>
        <View
          style={[
            styles.bottomCtaWrap,
            { bottom: insets.bottom + 118 },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.ctaContainer}>
            <Pressable
              onPress={handleAddPet}
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
              ]}
            >
              <LinearGradient
                colors={['#35AE9D', '#1F7F73']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButtonInner}
              >
                <Text style={styles.ctaText}>{ctaLabel}</Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.ctaSubtext}>
              Add another pet to manage all profiles in one place
            </Text>
          </View>
        </View>
      </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#cdefe7',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 0,
  },
  headerBlock: {
    paddingTop: 8,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74,108,103,0.14)',
    backgroundColor: 'rgba(255,255,255,0.52)',
    shadowColor: '#6f8f89',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    alignSelf: 'flex-start',
  },
  profileButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(28, 56, 53, 0.10)',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profileAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8DDE3',
  },
  profileAvatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#214B46',
  },
  backButtonText: {
    fontSize: 25,
    lineHeight: 25,
    color: '#2B5D56',
    marginTop: -1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(39,83,77,0.86)',
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#1C4741',
    marginBottom: 10,
  },
  stack: {
    marginTop: 0,
  },
  stackCompact: {
    marginTop: 0,
  },
  mainContent: {
    gap: 8,
  },
  petsList: {
    marginTop: 18,
    gap: 16,
  },
  petsListDense: {
    gap: 12,
  },
  petsListMaxDense: {
    gap: 10,
  },
  bottomCtaWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 30,
  },
  ctaContainer: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  ctaButton: {
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#238B80',
    shadowColor: '#238B80',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 0,
  },
  ctaButtonInner: {
    flex: 1,
    width: '100%',
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ctaSubtext: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: '#7A8B88',
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
