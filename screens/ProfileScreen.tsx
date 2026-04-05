import React, { useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, FileText, HelpCircle, House, LogOut, MessageSquareMore, PawPrint, Pencil, Settings, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLocale } from '../hooks/useLocale';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from './WeightTrackingScreen';
import { hap } from '../lib/haptics';

type ProfileRow = { full_name: string | null; avatar_url: string | null };

type ProfileScreenProps = {
  onSaveSuccess?: () => void;
  onBackHome?: () => void;
  onOpenPremium?: () => void;
  onOpenProfileEdit?: () => void;
  onOpenPetProfiles?: (petId?: string) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenPetPassport?: () => void;
  petProfiles?: Record<string, PetProfile>;
  weightsByPet?: Record<string, WeightPoint[]>;
  activePetId?: string;
  isPremiumPlan?: boolean;
  withBottomNav?: boolean;
};

const fallbackAvatar = 'https://www.figma.com/api/mcp/asset/7f9b54a3-43e6-4459-a7f9-0ae7b68618e2';

// --- DATA HELPERS ---
function getNavRows(isTr: boolean) {
  return {
    app: [
      { key: 'settings', label: isTr ? 'Ayarlar' : 'Settings' },
      { key: 'help', label: isTr ? 'Yardım' : 'Help' },
      { key: 'feedback', label: isTr ? 'Geri Bildirim' : 'Feedback' },
    ],
    management: [
      { key: 'pet_health_card', label: isTr ? 'Sağlık Pasaportu' : 'Health Passport', premiumFeature: true },
      { key: 'pets', label: isTr ? 'Evcil Hayvanlar' : 'Pets' },
      { key: 'family_sharing', label: isTr ? 'Aile Paylaşımı' : 'Family Sharing', premiumFeature: true },
    ],
  };
}

// --- SUB-COMPONENTS ---
function MenuIcon({ itemKey, color }: { itemKey: string; color: string }) {
  if (itemKey === 'pet_health_card') return <FileText size={18} color={color} strokeWidth={2} />;
  if (itemKey === 'pets') return <PawPrint size={18} color={color} strokeWidth={2} />;
  if (itemKey === 'family_sharing') return <Users size={18} color={color} strokeWidth={2} />;
  if (itemKey === 'help') return <HelpCircle size={18} color={color} strokeWidth={2} />;
  if (itemKey === 'feedback') return <MessageSquareMore size={18} color={color} strokeWidth={2} />;
  return <Settings size={18} color={color} strokeWidth={2} />;
}

const getIconTheme = (_key: string) => ({ bg: 'transparent', fg: '#121212' });

export default function ProfileScreen({
  onBackHome,
  onOpenPremium,
  onOpenProfileEdit,
  onOpenPetProfiles,
  onOpenSettings,
  onOpenNotifications,
  onOpenPetPassport,
  petProfiles,
  weightsByPet,
  activePetId,
  isPremiumPlan = false,
  withBottomNav = false,
}: ProfileScreenProps) {
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const isTr = locale === 'tr';
  const compact = withBottomNav;
  
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized values to prevent unnecessary recalculations
  const navRows = useMemo(() => getNavRows(isTr), [isTr]);
  const menuItems = useMemo(() => [
    navRows.management[0],
    navRows.management[2],
    navRows.management[1],
    navRows.app[0],
    ...navRows.app.slice(1),
  ], [navRows]);

  const orderedPets = useMemo(() => {
    const visiblePets = petProfiles ? Object.values(petProfiles).filter((p) => p?.name?.trim()) : [];
    return [...visiblePets].sort((a, b) => (a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)));
  }, [petProfiles, activePetId]);

  const petsCount = orderedPets.length;
  
  const recordCount = useMemo(() => {
    return orderedPets.reduce((total, pet) => {
      const petWeightCount = weightsByPet?.[pet.id]?.length ?? 0;
      return total
        + (pet.vaccinations?.length ?? 0)
        + (pet.surgeriesLog?.length ?? 0)
        + (pet.allergiesLog?.length ?? 0)
        + (pet.diabetesLog?.length ?? 0)
        + petWeightCount;
    }, 0);
  }, [orderedPets, weightsByPet]);

  const displayName = useMemo(() => {
    return profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isTr ? 'Kullanıcı' : 'User');
  }, [profile, user, isTr]);

  const accountEmail = user?.email ?? '-';

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user?.id) {
        if (active) {
          setLoading(false);
          setProfile(null);
        }
        return;
      }

      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
      if (!active) return;

      if (queryError) {
        setError(isTr ? 'Profil bilgisi alınamadı. Lütfen tekrar deneyin.' : 'Failed to load profile. Please try again.');
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
      setLoading(false);
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [isTr, user?.id]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 16) + (withBottomNav ? 88 : 10),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={false}
      >
        
        {/* TOP BAR */}
        <View
          style={[
            styles.topBar,
            {
              paddingTop: Math.max(insets.top, 14),
              paddingHorizontal: compact ? 20 : 24,
            },
          ]}
        >
          {onBackHome ? (
            <Pressable style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]} onPress={onBackHome} hitSlop={15}>
              <House size={24} color="#1C1C1E" strokeWidth={1.5} />
            </Pressable>
          ) : (
            <View style={styles.topButtonGhost} />
          )}
          <Pressable style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]} onPress={onOpenProfileEdit} hitSlop={15}>
            <Pencil size={22} color="#1C1C1E" strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* PROFILE INFO */}
        <View
          style={[
            styles.profileHeader,
            {
              paddingTop: compact ? 10 : 16,
              paddingBottom: compact ? 10 : 16,
            },
          ]}
        >
          <Pressable style={({ pressed }) => [styles.avatarContainer, pressed && styles.avatarPressed]} onPress={onOpenProfileEdit}>
            <Image
              source={{ uri: profile?.avatar_url || fallbackAvatar }}
              style={[
                styles.headerAvatar,
                compact ? { width: 88, height: 88, borderRadius: 44 } : null,
              ]}
            />
          </Pressable>
          <Text style={[styles.headerName, compact ? { fontSize: 24, lineHeight: 30 } : null]} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.headerEmail, compact ? { marginTop: 2 } : null]} numberOfLines={1}>{accountEmail}</Text>
          
          <View style={[styles.statsRow, compact ? { marginTop: 12 } : null]}>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>{petsCount} {isTr ? 'Pet' : 'Pets'}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>{recordCount} {isTr ? 'Kayıt' : 'Records'}</Text>
            </View>
          </View>
          
          <Pressable
            style={({ pressed }) => [
              styles.membershipButton,
              compact ? { marginTop: 16, paddingVertical: 12 } : null,
              pressed && styles.membershipButtonPressed,
            ]}
            onPress={onOpenPremium}>
            <Text style={styles.membershipButtonText}>
              {isPremiumPlan ? 'VPaw Premium' : 'VPaw Premium'}
            </Text>
          </Pressable>
          
          {loading ? <ActivityIndicator size="small" color="#7ea488" style={styles.headerLoader} /> : null}
        </View>

        {/* MENU LIST (iOS Inset Grouped Style) */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, idx) => {
            const { bg, fg } = getIconTheme(item.key);
            return (
              <View key={item.key}>
                <Pressable
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  onPress={() => {
                    hap.light();
                    if (item.key === 'pet_health_card') onOpenPetPassport?.();
                    if (item.key === 'pets') onOpenPetProfiles?.();
                    if (item.key === 'family_sharing') Alert.alert(isTr ? 'Aile paylasimi yakinda' : 'Family sharing coming soon');
                    if (item.key === 'settings') onOpenSettings?.();
                    if (item.key === 'help') Alert.alert(isTr ? 'Yardım yakında' : 'Help coming soon');
                    if (item.key === 'feedback') Alert.alert(isTr ? 'Geri bildirim yakında' : 'Feedback coming soon');
                  }}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: bg }]}>
                    <MenuIcon itemKey={item.key} color={fg} />
                  </View>
                  <Text style={styles.menuRowLabel}>{item.label}</Text>
                  <ChevronRight size={20} color="#999999" strokeWidth={2} />
                </Pressable>
                {idx !== menuItems.length - 1 ? <View style={styles.menuSeparator} /> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.flexSpacer} />

        {/* LOG OUT BUTTON (Grouped Card) */}
        <View style={styles.logoutContainer}>
          <Pressable style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]} onPress={signOut}>
            <View style={styles.menuIconWrap}>
              <LogOut size={18} color="#121212" strokeWidth={2} />
            </View>
            <Text style={styles.logoutText}>{isTr ? 'Çıkış Yap' : 'Log Out'}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F2F7', 
  },
  content: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24, 
    paddingBottom: 8,
  },
  topButton: {
    padding: 8,
    borderRadius: 8,
  },
  topButtonPressed: {
    backgroundColor: '#E5E5EA',
  },
  topButtonGhost: {
    width: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16, // Reduced from 24 to tighten gap with menu
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
  },
  avatarPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  headerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5EA',
  },
  headerName: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  headerEmail: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
    color: '#8E8E93',
    fontWeight: '400',
    textAlign: 'center',
  },
  statsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    backgroundColor: '#E5E5EA', 
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statPillText: {
    fontSize: 13,
    color: '#3C3C43',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  membershipButton: {
    marginTop: 24,
    backgroundColor: '#7ea488', 
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
  },
  membershipButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  membershipButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerLoader: {
    marginTop: 16,
  },
  menuContainer: {
    marginTop: 4, // Tightened gap
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: '#FFFFFF',
  },
  menuRowPressed: {
    backgroundColor: '#E5E5EA',
  },
  menuIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    fontWeight: '400',
    paddingLeft: 14,
    letterSpacing: -0.3,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 60, // Exactly aligns with text
  },
  logoutContainer: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  flexSpacer: {
    flexGrow: 1,
    minHeight: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: '#FFFFFF',
  },
  logoutButtonPressed: {
    backgroundColor: '#E5E5EA',
  },
  logoutText: {
    flex: 1,
    fontSize: 17,
    color: '#121212',
    fontWeight: '400',
    paddingLeft: 14,
    letterSpacing: -0.3,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});


