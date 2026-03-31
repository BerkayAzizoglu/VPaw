import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { FileText, HelpCircle, House, LogOut, MessageSquareMore, PawPrint, Settings2, Users } from 'lucide-react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLocale } from '../hooks/useLocale';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from './WeightTrackingScreen';
import { hap } from '../lib/haptics';

type ProfileRow = { full_name: string | null; avatar_url: string | null };
type IconName = 'home' | 'edit' | 'card' | 'bell' | 'settings' | 'share' | 'help' | 'feedback' | 'clock' | 'chevronRight' | 'logout';
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
};

const fallbackAvatar = 'https://www.figma.com/api/mcp/asset/7f9b54a3-43e6-4459-a7f9-0ae7b68618e2';

const palette = {
  bg: '#f6f4f0',
  surface: '#ffffff',
  surfaceAlt: '#f1ede7',
  border: 'rgba(236, 239, 236, 0.92)',
  text: '#22342f',
  textMuted: '#61706b',
  textSoft: '#7b8782',
  accent: '#49685f',
  accentSoft: '#e6efea',
  premium: '#8a6a32',
  premiumSoft: '#f1ece2',
  danger: '#9f6f6f',
};

function getNavRows(isTr: boolean) {
  return {
    app: [
      { key: 'help', label: isTr ? 'Yardım' : 'Help', icon: 'help' as const },
      { key: 'feedback', label: isTr ? 'Geri Bildirim' : 'Feedback', icon: 'feedback' as const },
    ],
    management: [
      { key: 'pet_health_card', label: isTr ? 'Sağlık Pasaportu' : 'Health Passport', icon: 'card' as const, premiumFeature: true },
      { key: 'pets', label: isTr ? 'Evcil Hayvanlar' : 'Pets', icon: 'share' as const },
      { key: 'family_sharing', label: isTr ? 'Aile Paylaşımı' : 'Family Sharing', icon: 'share' as const, premiumFeature: true },
    ],
  };
}

function AppIcon({ name, size = 16, color = palette.textMuted, strokeWidth = 1.9 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  if (name === 'home') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3.5 10.2L12 3.5L20.5 10.2V19C20.5 19.8 19.8 20.5 19 20.5H14V14.2H10V20.5H5C4.2 20.5 3.5 19.8 3.5 19V10.2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /><Path d="M8.3 20.5V14.2H15.7V20.5" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /></Svg>;
  if (name === 'edit') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M4 20H7.2L18.4 8.8C19.2 8 19.2 6.8 18.4 6L18 5.6C17.2 4.8 16 4.8 15.2 5.6L4 16.8V20Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /><Path d="M13.8 7L17 10.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
  if (name === 'chevronRight') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 6L15 12L9 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (name === 'card') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5.2 7.2C5.2 6.1 6.1 5.2 7.2 5.2H16.8C17.9 5.2 18.8 6.1 18.8 7.2V16.8C18.8 17.9 17.9 18.8 16.8 18.8H7.2C6.1 18.8 5.2 17.9 5.2 16.8V7.2Z" stroke={color} strokeWidth={strokeWidth} /><Line x1="8.4" y1="10.2" x2="15.6" y2="10.2" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /><Line x1="8.4" y1="13.2" x2="13.6" y2="13.2" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /></Svg>;
  if (name === 'bell') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7.4 16.8H16.6C15.8 15.9 15.2 14.8 15.2 12.6V10.8C15.2 8.9 13.7 7.4 11.8 7.4C9.9 7.4 8.4 8.9 8.4 10.8V12.6C8.4 14.8 7.8 15.9 7.4 16.8Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /><Path d="M10.5 18.2C10.8 19 11.3 19.4 11.8 19.4C12.3 19.4 12.8 19 13.1 18.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
  if (name === 'settings') return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth={strokeWidth} /><Path d="M19 12.8V11.2L17.3 10.6C17.2 10.2 17.1 9.9 16.9 9.6L17.7 8L16 6.3L14.4 7.1C14.1 6.9 13.8 6.8 13.4 6.7L12.8 5H11.2L10.6 6.7C10.2 6.8 9.9 6.9 9.6 7.1L8 6.3L6.3 8L7.1 9.6C6.9 9.9 6.8 10.2 6.7 10.6L5 11.2V12.8L6.7 13.4C6.8 13.8 6.9 14.1 7.1 14.4L6.3 16L8 17.7L9.6 16.9C9.9 17.1 10.2 17.2 10.6 17.3L11.2 19H12.8L13.4 17.3C13.8 17.2 14.1 17.1 14.4 16.9L16 17.7L17.7 16L16.9 14.4C17.1 14.1 17.2 13.8 17.3 13.4L19 12.8Z" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinejoin="round" /></Svg>;
  if (name === 'help') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} /><Path d="M9.8 9.6C10.1 8.7 10.9 8.1 12 8.1C13.3 8.1 14.2 8.9 14.2 10.1C14.2 11.1 13.7 11.6 12.8 12.1C12.1 12.5 11.8 12.9 11.8 13.6" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /><Circle cx="11.8" cy="16.1" r="0.8" fill={color} /></Svg>;
  if (name === 'share') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="17.5" cy="6.5" r="2.3" stroke={color} strokeWidth={strokeWidth} /><Circle cx="6.5" cy="12" r="2.3" stroke={color} strokeWidth={strokeWidth} /><Circle cx="17.5" cy="17.5" r="2.3" stroke={color} strokeWidth={strokeWidth} /><Path d="M8.7 11L15.3 7.5" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /><Path d="M8.7 13L15.3 16.5" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /></Svg>;
  if (name === 'feedback') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 7.2C6 6.1 6.9 5.2 8 5.2H16C17.1 5.2 18 6.1 18 7.2V13.2C18 14.3 17.1 15.2 16 15.2H11L8 18V15.2H8C6.9 15.2 6 14.3 6 13.2V7.2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /><Circle cx="10" cy="10.2" r="0.9" fill={color} /><Circle cx="13" cy="10.2" r="0.9" fill={color} /><Circle cx="16" cy="10.2" r="0.9" fill={color} /></Svg>;
  if (name === 'clock') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} /><Path d="M12 8V12L14.6 13.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M10 7H7.5C6.7 7 6 7.7 6 8.5V15.5C6 16.3 6.7 17 7.5 17H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /><Path d="M13 9L16 12L13 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /><Line x1="9" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
}

function RowGlyph({ itemKey, color }: { itemKey: string; color: string }) {
  if (itemKey === 'pet_health_card') return <FileText size={18} color={color} strokeWidth={2.05} />;
  if (itemKey === 'pets') return <PawPrint size={18} color={color} strokeWidth={2.05} />;
  if (itemKey === 'family_sharing') return <Users size={18} color={color} strokeWidth={2.05} />;
  if (itemKey === 'help') return <HelpCircle size={18} color={color} strokeWidth={2.05} />;
  if (itemKey === 'feedback') return <MessageSquareMore size={18} color={color} strokeWidth={2.05} />;
  return <Settings2 size={16} color={color} strokeWidth={2} />;
}

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
}: ProfileScreenProps) {
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const isTr = locale === 'tr';
  const navRows = getNavRows(isTr);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const visiblePets = petProfiles ? Object.values(petProfiles).filter((p) => p?.name?.trim()) : [];
  const orderedPets = [...visiblePets].sort((a, b) => (a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)));
  const petsCount = orderedPets.length;
  const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isTr ? 'Kullanıcı' : 'User');
  const accountEmail = user?.email ?? '-';
  const membershipLabel = isPremiumPlan ? 'VPaw Premium' : (isTr ? 'Ücretsiz Plan' : 'Free Plan');
  const menuItems = [
    navRows.management[0],
    navRows.management[2],
    navRows.management[1],
    ...navRows.app,
  ];
  const recordCount = orderedPets.reduce((total, pet) => {
    const petWeightCount = weightsByPet?.[pet.id]?.length ?? 0;
    return total
      + (pet.vaccinations?.length ?? 0)
      + (pet.surgeriesLog?.length ?? 0)
      + (pet.allergiesLog?.length ?? 0)
      + (pet.diabetesLog?.length ?? 0)
      + petWeightCount;
  }, 0);

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
      <View pointerEvents="none" style={styles.bgPattern}>
        <Svg width="100%" height="100%" viewBox="0 0 100 180" preserveAspectRatio="none">
          <Path d="M-10 18C15 8 28 28 48 20C67 12 82 1 110 12" stroke="rgba(255,255,255,0.34)" strokeWidth="0.6" fill="none" />
          <Path d="M-8 58C14 48 30 67 50 60C70 53 88 42 108 55" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" fill="none" />
          <Path d="M-4 104C18 90 33 112 52 101C71 90 86 86 106 95" stroke="rgba(255,255,255,0.24)" strokeWidth="0.6" fill="none" />
          <Path d="M-6 148C16 138 30 158 49 150C70 142 86 131 108 142" stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" fill="none" />
          <Path d="M18 -8C28 15 10 38 21 61C31 84 50 97 43 122C36 145 12 156 18 186" stroke="rgba(164,140,98,0.12)" strokeWidth="0.7" fill="none" />
          <Path d="M76 -10C69 14 86 28 78 50C70 73 56 88 63 112C70 137 92 149 84 184" stroke="rgba(164,140,98,0.1)" strokeWidth="0.7" fill="none" />
        </Svg>
      </View>
      <BlurView pointerEvents="none" intensity={18} tint="light" style={styles.glassVeil} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={false} bounces={false}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top - 2, 10) }]}>
          {onBackHome ? (
            <Pressable style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]} onPress={onBackHome}>
              <House size={17} color="#48605a" strokeWidth={1.9} />
            </Pressable>
          ) : (
            <View style={styles.topButtonGhost} />
          )}
          <Pressable style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]} onPress={onOpenSettings}>
            <Settings2 size={16.5} color="#48605a" strokeWidth={1.85} />
          </Pressable>
        </View>

        <View style={styles.profileShell}>
          <View style={styles.profileHeader}>
            <Pressable style={({ pressed }) => [styles.avatarRing, pressed && styles.avatarRingPressed]} onPress={onOpenProfileEdit}>
              <Image source={{ uri: profile?.avatar_url || fallbackAvatar }} style={styles.headerAvatar} />
            </Pressable>
            <Text style={styles.headerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{displayName}</Text>
            <Text style={styles.headerEmail} numberOfLines={1}>{accountEmail}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>{petsCount} {isTr ? 'Pet' : 'Pets'}</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>{recordCount} {isTr ? 'Kayit' : 'Records'}</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.membershipButton, pressed && styles.membershipButtonPressed]} onPress={onOpenPremium}>
              <Text style={styles.membershipButtonText}>
                {isPremiumPlan ? 'VPaw Premium' : 'VPaw Premium'}
              </Text>
            </Pressable>
            {loading ? <ActivityIndicator size="small" color={palette.premium} style={styles.headerLoader} /> : null}
          </View>

          <View style={styles.menuCard}>
            <BlurView pointerEvents="none" intensity={14} tint="light" style={styles.menuCardBlur} />
            {menuItems.map((item, idx) => (
              <View key={item.key}>
                <Pressable
                  style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                  onPress={() => {
                    hap.light();
                    if (item.key === 'pet_health_card') onOpenPetPassport?.();
                    if (item.key === 'pets') onOpenPetProfiles?.();
                    if (item.key === 'family_sharing') Alert.alert(isTr ? 'Aile paylaşımı yakında' : 'Family sharing coming soon');
                    if (item.key === 'help') Alert.alert(isTr ? 'Yardım yakında' : 'Help coming soon');
                    if (item.key === 'feedback') Alert.alert(isTr ? 'Geri bildirim yakında' : 'Feedback coming soon');
                  }}
                >
                  <View style={styles.menuRowLeft}>
                    <View style={[styles.menuIconWrap, item.key === 'pet_health_card' && styles.menuIconWrapFeatured]}>
                      <RowGlyph itemKey={item.key} color={item.key === 'pet_health_card' ? '#7b5b21' : '#56493c'} />
                    </View>
                    <Text style={styles.menuRowLabel}>{item.label}</Text>
                  </View>
                  <AppIcon name="chevronRight" size={14} color="#ccbda9" strokeWidth={1.85} />
                </Pressable>
                {idx !== menuItems.length - 1 ? <View style={styles.menuSeparator} /> : null}
              </View>
            ))}

            <Pressable style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]} onPress={signOut}>
              <View style={styles.signOutIconWrap}>
                <LogOut size={14} color="#8c6a31" strokeWidth={2.1} />
              </View>
              <Text style={styles.signOutText}>{isTr ? 'Çıkış Yap' : 'Log Out'}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'rgb(220, 217, 212)',
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  glassVeil: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.34,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 24,
    alignItems: 'center',
  },
  profileShell: {
    width: '100%',
    maxWidth: 364,
    paddingHorizontal: 6,
    paddingTop: 12,
    paddingBottom: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 14,
  },
  headerAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.surfaceAlt,
  },
  avatarRing: {
    width: 122,
    height: 122,
    borderRadius: 61,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#8b7658',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  avatarRingPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  headerName: {
    marginTop: 10,
    maxWidth: '88%',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    color: '#2f2a24',
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  headerEmail: {
    marginTop: 3,
    maxWidth: '90%',
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(104, 95, 84, 0.72)',
    fontWeight: '500',
    textAlign: 'center',
  },
  statsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statPill: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(230, 223, 214, 0.92)',
    shadowColor: '#b8ab99',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    justifyContent: 'center',
  },
  statPillText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#746b5f',
    fontWeight: '700',
  },
  membershipButton: {
    marginTop: 10,
    minHeight: 38,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: '#c79e58',
    justifyContent: 'center',
    shadowColor: '#af8542',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  membershipButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  membershipButtonText: {
    fontSize: 15,
    lineHeight: 19,
    color: '#5d3d0d',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerLoader: {
    marginTop: 8,
  },
  topBar: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(228, 233, 231, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6f8782',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  topButtonPressed: {
    opacity: 0.88,
    backgroundColor: 'rgba(246,246,244,0.9)',
    transform: [{ scale: 0.98 }],
  },
  topButtonGhost: {
    width: 46,
    height: 46,
  },
  menuCard: {
    marginTop: 56,
    backgroundColor: 'rgba(247, 241, 232, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 28,
    overflow: 'hidden',
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 2,
    shadowColor: '#b49a74',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  menuCardBlur: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  menuRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  menuRowPressed: {
    backgroundColor: 'rgba(250, 243, 232, 0.82)',
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  menuSeparator: {
    height: 1,
    marginLeft: 62,
    marginRight: 12,
    backgroundColor: 'rgba(104, 90, 72, 0.08)',
  },
  menuRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(219, 209, 194, 0.9)',
    backgroundColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapFeatured: {
    backgroundColor: 'rgba(223, 194, 123, 0.34)',
    borderColor: 'rgba(220, 184, 98, 0.46)',
    shadowColor: '#c79e58',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    color: '#3f352b',
    fontWeight: '600',
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  signOutButton: {
    marginTop: 8,
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(222, 212, 198, 0.95)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutButtonPressed: {
    opacity: 0.84,
    backgroundColor: 'rgba(248, 243, 237, 0.92)',
    transform: [{ scale: 0.98 }],
  },
  signOutIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  signOutText: {
    color: '#5c5145',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
