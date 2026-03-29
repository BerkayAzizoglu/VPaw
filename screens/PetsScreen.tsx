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

  const viewItems: PetsViewItem[] = sortedPets.map((pet) => {
    const latestWeightPoint = (weightsByPet?.[pet.id] ?? []).at(-1);
    const typeLabel = localizeType(pet.petType, locale);
    return {
      id: pet.id,
      name: pet.name,
      meta: [typeLabel, pet.breed?.trim()].filter(Boolean).join(' • ') || (isTr ? 'Profil hazir' : 'Profile ready'),
      weightValue: latestWeightPoint?.value ?? null,
      updatedLabel: formatShortDate(latestWeightPoint?.date, locale),
      imageUri: pet.image || undefined,
      isActive: pet.id === activePetId,
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
  const introTitle = isTr ? 'Evcil dostlarin tek yerde' : 'Your household, in one place';
  const introBody = isTr
    ? 'Tum profilleri ayni premium akis icinde yonet, son kayitlari hizla gor.'
    : 'Manage every profile in one calm premium flow and glance at the latest updates.';
  const addTitle = isTr ? 'Yeni pet ekle' : 'Add another pet';
  const addBody = isTr
    ? 'Bir sonraki profili ayni aile duzenine ekle.'
    : 'Keep every companion inside the same family view.';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#35AE9D', '#8ED5CA', '#F6F4F0', '#F6F4F0']}
        locations={[0, 0.22, 0.48, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.screen} {...swipePanResponder.panHandlers}>
          <AppleTopBar title={title} onBack={onBack} blurIntensity={20} backgroundColor="rgba(246, 244, 240, 0.58)" />

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 76, paddingBottom: 48 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!swipePanResponder.isSwiping}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#2d6d65"
                colors={['#2d6d65']}
                progressViewOffset={24}
              />
            }
          >
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
                  colors={['rgba(53,174,157,0.18)', 'rgba(31,127,115,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.addIconShell}>
                  <Plus size={19} color="#2a6f67" strokeWidth={2.1} />
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
    backgroundColor: '#f6f4f0',
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  heroBlock: {
    paddingTop: 6,
    paddingHorizontal: 2,
    gap: 8,
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 35,
    fontWeight: '800',
    color: '#164942',
    letterSpacing: -0.9,
  },
  heroBody: {
    maxWidth: 310,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(41, 75, 70, 0.80)',
    fontWeight: '500',
  },
  heroMetaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaPill: {
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(78,109,103,0.08)',
  },
  metaPillPremium: {
    backgroundColor: 'rgba(249,243,227,0.88)',
    borderColor: 'rgba(177,149,95,0.14)',
  },
  metaPillText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#43645f',
    fontWeight: '700',
  },
  metaPillPremiumText: {
    color: '#8a6e2f',
  },
  listWrap: {
    gap: 14,
  },
  addCard: {
    minHeight: 108,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(97,130,122,0.12)',
    backgroundColor: 'rgba(255,255,255,0.70)',
    shadowColor: '#5d8c83',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,252,251,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(105,134,126,0.10)',
  },
  addBody: {
    flex: 1,
    gap: 4,
  },
  addTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1d4741',
    letterSpacing: -0.3,
  },
  addText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#68807b',
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingVertical: 22,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.56)',
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1c2f2c',
    letterSpacing: -0.3,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(28,47,44,0.62)',
  },
});
