import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WeightPoint } from '../lib/healthMvpModel';
import type { PetProfile } from '../lib/petProfileTypes';
import PetListCard from '../components/pets/PetListCard';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import AppleTopBar from '../components/AppleTopBar';

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
  completionPercent: number;
};

function localizeType(type: PetProfile['petType'], locale: 'en' | 'tr') {
  if (locale === 'tr') return type === 'Dog' ? 'Kopek' : type === 'Cat' ? 'Kedi' : type;
  return type;
}

function formatShortDate(value: string | undefined, locale: 'en' | 'tr') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' }).format(date);
}

function getProfileCompletionPercent(pet: PetProfile) {
  const checks = [
    pet.name.trim().length > 0,
    pet.petType === 'Dog' || pet.petType === 'Cat',
    pet.gender === 'male' || pet.gender === 'female',
    pet.breed.trim().length > 0,
    pet.birthDate.trim().length > 0,
    pet.microchip.trim().length > 0,
    pet.image.trim().length > 0,
  ];
  const score = checks.reduce((sum, ok) => (ok ? sum + 1 : sum), 0);
  return Math.round((score / checks.length) * 100);
}

export default function PetsScreen(props: PetsScreenProps) {
  const {
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
  } = props;
  const isTr = locale === 'tr';
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [refreshing, setRefreshing] = React.useState(false);
  const compact = screenHeight <= 820 || screenWidth <= 380;
  const swipePanResponder = useEdgeSwipeBack({
    onBack,
    fullScreenGestureEnabled: false,
    enterVariant: 'snappy',
  });

  const sortedPets = [...pets].sort((a, b) =>
    a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)
  );

  const completionPreview = [18, 42, 67, 91];
  const viewItems: PetsViewItem[] = sortedPets.map((pet, index) => {
    const latestWeightPoint = (weightsByPet?.[pet.id] ?? []).at(-1);
    const typeLabel = localizeType(pet.petType, locale);
    const completionPercent = __DEV__
      ? completionPreview[index % completionPreview.length]
      : getProfileCompletionPercent(pet);
    return {
      id: pet.id,
      name: pet.name,
      meta: [typeLabel, pet.breed?.trim()].filter(Boolean).join(' • ') || (isTr ? 'Profil hazir' : 'Profile ready'),
      weightValue: latestWeightPoint?.value ?? null,
      updatedLabel: formatShortDate(latestWeightPoint?.date, locale),
      imageUri: pet.image || undefined,
      isActive: pet.id === activePetId,
      completionPercent,
    };
  });

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

  const title = isTr ? 'Petler' : 'Your Pets';
  const introTitle = isTr ? 'Pet aileniz' : 'Your pet family';
  const introBody = isTr
    ? 'Tum profilleri ayni sakin akista gor, son kayitlari tek bakista takip et.'
    : 'Keep every profile in one calm flow and glance at the latest updates.';
  const addTitle = isTr ? 'Yeni pet ekle' : 'Add another pet';
  const addBody = isTr
    ? 'Bir sonraki profili ayni aile duzenine ekle.'
    : 'Keep every companion inside the same family view.';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#f8f4ed', '#f1e3d3', '#deccb9']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.06, y: 0.02 }}
        end={{ x: 0.96, y: 0.98 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,252,247,0.94)', 'rgba(255,255,255,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ribbonPrimary}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,248,236,0.72)', 'rgba(255,255,255,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.ribbonSecondary}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,243,224,0.68)', 'rgba(255,255,255,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.ribbonAccent}
      />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.screen} {...swipePanResponder.panHandlers}>
          <AppleTopBar title={title} onBack={onBack} blurIntensity={20} backgroundColor="rgba(248, 244, 237, 0.62)" />

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 76, paddingBottom: 48 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!swipePanResponder.isSwiping}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#8b6a53"
                colors={['#8b6a53']}
                progressViewOffset={24}
              />
            }
          >
            <View style={styles.heroCard}>
              <View pointerEvents="none" style={styles.heroCardGlow} />
              <View style={styles.heroBlock}>
                <Text style={styles.heroTitle}>{introTitle}</Text>
                <Text style={styles.heroBody}>{introBody}</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {viewItems.length} {isTr ? 'profil' : viewItems.length === 1 ? 'profile' : 'profiles'}
                    </Text>
                  </View>
                  {isPremiumPlan ? (
                    <View style={[styles.metaPill, styles.metaPillPremium]}>
                      <Text style={[styles.metaPillText, styles.metaPillPremiumText]}>VPaw Premium</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {viewItems.length > 0 ? (
              <View style={styles.listWrap}>
                {viewItems.map((pet, index) => (
                  <PetListCard
                    key={pet.id}
                    name={pet.name}
                    meta={pet.meta}
                    weightValue={pet.weightValue}
                    updatedLabel={pet.updatedLabel}
                    imageUri={pet.imageUri}
                    highlighted={pet.isActive || index === 0}
                    compact={compact || viewItems.length >= 4}
                    completionPercent={pet.completionPercent}
                    onPress={() => onOpenPet(pet.id)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{isTr ? 'Henuz pet yok' : 'No pets yet'}</Text>
                <Text style={styles.emptySub}>
                  {isTr
                    ? 'Ilk profili eklediginizde burada ayni premium kart sisteminde gorunecek.'
                    : 'The first profile will appear here in the same premium card system.'}
                </Text>
              </View>
            )}

            {canAddPet ? (
              <Pressable onPress={handleAddPet} style={({ pressed }) => [styles.addCard, pressed && styles.addCardPressed]}>
                <LinearGradient
                  colors={['rgba(245,234,219,0.38)', 'rgba(255,255,255,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.addIconShell}>
                  <Plus size={19} color="#8b6a53" strokeWidth={2.1} />
                </View>
                <View style={styles.addBody}>
                  <Text style={styles.addTitle}>{addTitle}</Text>
                  <Text style={styles.addText}>{addBody}</Text>
                </View>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ead8c8',
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  ribbonPrimary: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 240,
    height: 1040,
    opacity: 0.94,
    transform: [{ rotate: '24deg' }],
  },
  ribbonSecondary: {
    position: 'absolute',
    top: 120,
    left: 156,
    width: 160,
    height: 980,
    opacity: 0.78,
    transform: [{ rotate: '36deg' }],
  },
  ribbonAccent: {
    position: 'absolute',
    top: 280,
    right: -20,
    width: 110,
    height: 680,
    opacity: 0.52,
    transform: [{ rotate: '17deg' }],
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 34,
    backgroundColor: 'rgba(255,250,244,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    shadowColor: '#7e5f47',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroCardGlow: {
    position: 'absolute',
    top: -24,
    right: -16,
    width: 180,
    height: 110,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ rotate: '-14deg' }],
  },
  heroBlock: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 10,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#2a1710',
    letterSpacing: -1,
  },
  heroBody: {
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(73, 52, 40, 0.84)',
    fontWeight: '500',
  },
  heroMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaPill: {
    height: 31,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,249,243,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(169,143,118,0.16)',
  },
  metaPillPremium: {
    backgroundColor: 'rgba(242,226,201,0.9)',
    borderColor: 'rgba(174,138,91,0.16)',
  },
  metaPillText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#5d473b',
    fontWeight: '700',
  },
  metaPillPremiumText: {
    color: '#8a6e2f',
  },
  listWrap: {
    gap: 14,
    marginTop: 2,
  },
  addCard: {
    minHeight: 108,
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(171,143,116,0.14)',
    backgroundColor: 'rgba(255,250,244,0.76)',
    shadowColor: '#7e5f47',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  addCardPressed: {
    transform: [{ scale: 0.988 }],
    opacity: 0.94,
  },
  addIconShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,248,239,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(169,143,118,0.14)',
  },
  addBody: {
    flex: 1,
    gap: 4,
  },
  addTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#2b1810',
    letterSpacing: -0.3,
  },
  addText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7d6658',
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: 'rgba(255,250,244,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#2a1710',
    letterSpacing: -0.3,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(74, 56, 45, 0.72)',
  },
});

