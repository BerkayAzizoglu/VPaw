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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
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
  onBack: () => void;
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

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;

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
  onBack,
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
      (isTr ? 'Profil hazir' : 'Profile ready');

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

  const screenTitle = isTr ? 'Pet Genel Bakis' : 'Pet Overview';
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
    onAddPet();
  }, [onAddPet]);
  const handleBack = React.useCallback(() => {
    onBack();
  }, [onBack]);

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
              paddingBottom: 24 + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: 140 }}
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
            <View style={styles.headerTopRow}>
              <Pressable onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>{'\u2039'}</Text>
              </Pressable>
              <View pointerEvents="none" style={styles.headerLogoWrap}>
                <SvgUri uri={logoUri} width={24} height={24} />
              </View>
            </View>
            <Text style={styles.eyebrow}>{isTr ? 'PETLERIN' : 'YOUR PETS'}</Text>
            <Text style={styles.title}>{screenTitle}</Text>
          </View>

          <View style={[styles.stack, compact && styles.stackCompact]}>
            <View style={styles.mainContent}>
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
                      compact={compact}
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

              <View style={styles.bottomCtaWrap}>
                <Pressable
                  onPress={handleAddPet}
                  style={({ pressed }) => [
                    styles.bottomCtaPressable,
                    (!canAddPet && !isPremiumPlan) && styles.bottomCtaDisabled,
                    pressed && styles.bottomCtaPressed,
                  ]}
                  disabled={!canAddPet && !isPremiumPlan}
                >
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <Defs>
                        <SvgLinearGradient id="petsBottomCtaGrad" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
                          <Stop offset="0%" stopColor="#4FB3A5" />
                          <Stop offset="100%" stopColor="#2F9E8F" />
                        </SvgLinearGradient>
                      </Defs>
                      <Rect x="0" y="0" width="100" height="100" fill="url(#petsBottomCtaGrad)" />
                    </Svg>
                  </View>
                  <View style={styles.bottomCtaGradient}>
                    <Text style={styles.bottomCtaText}>{ctaLabel}</Text>
                    <MaterialCommunityIcons name="paw" size={16} color="rgba(255,255,255,0.9)" style={styles.bottomCtaIcon} />
                  </View>
                </Pressable>
                <Text style={styles.helperText}>
                  Add another pet to unlock full tracking experience
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#98D6D1',
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
    marginBottom: 18,
  },
  headerTopRow: {
    height: 42,
    justifyContent: 'center',
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(35,76,71,0.22)',
    backgroundColor: 'rgba(255,255,255,0.42)',
    alignSelf: 'flex-start',
  },
  headerLogoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
    opacity: 0.96,
  },
  backButtonText: {
    fontSize: 25,
    lineHeight: 25,
    color: '#24534C',
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
  cardList: {
    gap: 0,
  },
  bottomCtaWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  bottomCtaPressable: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#1E3348',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 7,
  },
  bottomCtaDisabled: {
    opacity: 0.55,
  },
  bottomCtaPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.98,
  },
  bottomCtaGradient: {
    paddingVertical: 17,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bottomCtaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.18,
  },
  bottomCtaIcon: {
    marginLeft: 8,
    marginTop: 1,
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    color: '#2F5D5A',
    opacity: 0.6,
    textAlign: 'center',
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
