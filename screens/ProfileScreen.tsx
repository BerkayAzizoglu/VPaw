import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, HelpCircle, House, LogOut, MessageSquareMore, PawPrint, Settings2, Share2 } from 'lucide-react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLocale } from '../hooks/useLocale';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from './WeightTrackingScreen';
import { hap } from '../lib/haptics';

type ProfileRow = { full_name: string | null; avatar_url: string | null };
type IconName = 'home' | 'edit' | 'card' | 'bell' | 'settings' | 'share' | 'help' | 'feedback' | 'clock' | 'chevronRight' | 'logout';
type SectionTone = 'default' | 'management' | 'preferences' | 'support';
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

const sectionToneStyles: Record<SectionTone, { iconBg: string; iconBorder: string; iconColor: string }> = {
  default: { iconBg: '#f3f1ec', iconBorder: 'rgba(94, 86, 73, 0.08)', iconColor: '#6d675f' },
  management: { iconBg: '#edf5ef', iconBorder: 'rgba(73, 104, 95, 0.08)', iconColor: '#58776b' },
  preferences: { iconBg: '#f0f1f2', iconBorder: 'rgba(86, 104, 104, 0.08)', iconColor: '#677271' },
  support: { iconBg: '#eef3f6', iconBorder: 'rgba(88, 108, 122, 0.08)', iconColor: '#647887' },
};

function getNavRows(isTr: boolean) {
  return {
    app: [
      { key: 'help', label: isTr ? 'Yardım' : 'Help', icon: 'help' as const },
      { key: 'feedback', label: isTr ? 'Geri Bildirim' : 'Feedback', icon: 'feedback' as const },
    ],
    management: [
      { key: 'pet_health_card', label: isTr ? 'Pet Sağlık Kartı' : 'Pet Health Card', icon: 'card' as const, premiumFeature: true },
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
  if (itemKey === 'pet_health_card') return <FileText size={16} color={color} strokeWidth={2} />;
  if (itemKey === 'pets') return <PawPrint size={16} color={color} strokeWidth={2} />;
  if (itemKey === 'family_sharing') return <Share2 size={16} color={color} strokeWidth={2} />;
  if (itemKey === 'help') return <HelpCircle size={16} color={color} strokeWidth={2} />;
  if (itemKey === 'feedback') return <MessageSquareMore size={16} color={color} strokeWidth={2} />;
  return <Settings2 size={16} color={color} strokeWidth={2} />;
}

function Section({
  items,
  onItemPress,
  tone = 'default',
  isPremiumPlan = false,
  isTr = false,
}: {
  title?: string;
  items: Array<{ key: string; label: string; icon: IconName; detail?: string; premiumFeature?: boolean }>;
  onItemPress?: (key: string) => void;
  tone?: SectionTone;
  isPremiumPlan?: boolean;
  isTr?: boolean;
}) {
  const toneStyles = sectionToneStyles[tone];

  return (
    <View style={styles.section}>
      <View style={styles.listCard}>
        <View pointerEvents="none" style={styles.cardHighlight} />
        {items.map((item, idx) => (
          <View key={item.key}>
            <Pressable
              style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
              onPress={() => {
                hap.light();
                onItemPress?.(item.key);
              }}
            >
              <View style={styles.listRowLeft}>
                <View style={[styles.iconBox, { backgroundColor: toneStyles.iconBg, borderColor: toneStyles.iconBorder }]}>
                  <RowGlyph itemKey={item.key} color={toneStyles.iconColor} />
                </View>
                <Text style={styles.listRowLabel}>{item.label}</Text>
              </View>
              <View style={styles.listRowRight}>
                {item.premiumFeature ? (
                  isPremiumPlan ? (
                    <Text style={[styles.listRowMeta, styles.listRowMetaActive]}>
                      {item.key === 'pet_health_card' ? 'Share' : 'Set Up'}
                    </Text>
                  ) : (
                    <View style={styles.premiumMiniBadge}>
                      <View style={styles.premiumMiniDot} />
                    </View>
                  )
                ) : item.detail ? <Text style={styles.listRowMeta}>{item.detail}</Text> : null}
                <AppIcon name="chevronRight" size={14} color="#c4ccca" strokeWidth={1.85} />
              </View>
            </Pressable>
            {idx !== items.length - 1 ? <View style={styles.listInsetSeparator} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
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
  const managementItems = [
    navRows.management[0],
    navRows.management[2],
    navRows.management[1],
  ];

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
    <LinearGradient colors={['#CDEFE7', '#E3F6EF', '#F4ECD6']} locations={[0, 0.55, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
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

        <View style={styles.profileHeader}>
          <Image source={{ uri: profile?.avatar_url || fallbackAvatar }} style={styles.headerAvatar} />
          <Text style={styles.headerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{displayName}</Text>
          <Text style={styles.headerEmail} numberOfLines={1}>{accountEmail}</Text>
          <View style={styles.headerMetaRow}>
            <View style={[styles.planBadge, isPremiumPlan && styles.planBadgePremium]}>
              <Text style={[styles.planBadgeText, isPremiumPlan && styles.planBadgeTextPremium]}>{membershipLabel}</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.inlineAction, pressed && styles.inlineActionPressed]} onPress={onOpenProfileEdit}>
              <AppIcon name="edit" size={16} color={palette.accent} strokeWidth={2.05} />
            </Pressable>
          </View>
          {loading ? <ActivityIndicator size="small" color={palette.accent} style={styles.headerLoader} /> : null}
        </View>

        {!isPremiumPlan ? (
          <Pressable style={({ pressed }) => [styles.premiumCard, pressed && styles.premiumCardPressed]} onPress={onOpenPremium}>
            <View style={styles.premiumCopy}>
              <Text style={styles.premiumLabel}>VPaw Premium</Text>
              <Text style={styles.premiumTitle}>
                {isTr ? 'Sınırsız pet ve sağlık kartı dışa aktarma' : 'Unlimited pets and health card export'}
              </Text>
              <Text style={styles.premiumText}>
                {isTr ? 'Tüm premium avantajları açmak için planı görün.' : 'View the plan to unlock the full premium set.'}
              </Text>
            </View>
            <AppIcon name="chevronRight" size={15} color="#b6a58a" strokeWidth={1.9} />
          </Pressable>
        ) : null}

        <Section
          items={managementItems}
          tone="management"
          isPremiumPlan={isPremiumPlan}
          isTr={isTr}
          onItemPress={(key) => {
            if (key === 'pet_health_card') onOpenPetPassport?.();
            if (key === 'pets') onOpenPetProfiles?.();
            if (key === 'family_sharing') Alert.alert(isTr ? 'Aile paylaşımı yakında' : 'Family sharing coming soon');
          }}
        />

        <Section
          items={navRows.app}
          tone="support"
          isPremiumPlan={isPremiumPlan}
          isTr={isTr}
          onItemPress={(key) => {
            if (key === 'settings') onOpenSettings?.();
            if (key === 'help') Alert.alert(isTr ? 'Yardım yakında' : 'Help coming soon');
            if (key === 'feedback') Alert.alert(isTr ? 'Geri bildirim yakında' : 'Feedback coming soon');
          }}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.footer}>
          <Pressable style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]} onPress={signOut}>
            <View style={styles.signOutIconWrap}>
              <LogOut size={14} color="#ffffff" strokeWidth={2.1} />
            </View>
            <Text style={styles.signOutText}>{isTr ? 'Çıkış Yap' : 'Log Out'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 18,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 2,
  },
  headerAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.surfaceAlt,
  },
  headerName: {
    marginTop: 10,
    maxWidth: '88%',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.9,
    textAlign: 'center',
  },
  headerEmail: {
    marginTop: 1,
    maxWidth: '90%',
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(97, 112, 107, 0.78)',
    fontWeight: '500',
    textAlign: 'center',
  },
  headerMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerLoader: {
    marginTop: 8,
  },
  topBar: {
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
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  inlineAction: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: 'rgba(245,242,236,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(217, 223, 221, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionPressed: {
    backgroundColor: 'rgba(238,234,226,0.86)',
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  planBadge: {
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'center',
  },
  planBadgePremium: {
    backgroundColor: '#f2ecdf',
    borderColor: 'rgba(208, 197, 177, 0.58)',
  },
  planBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    color: palette.textMuted,
    fontWeight: '600',
    letterSpacing: 0.05,
  },
  planBadgeTextPremium: {
    color: palette.premium,
  },
  featuredModule: {
    gap: 12,
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 17,
    color: 'rgba(110, 123, 118, 0.72)',
    fontWeight: '600',
    marginLeft: 4,
  },
  premiumCard: {
    backgroundColor: palette.premiumSoft,
    borderWidth: 1,
    borderColor: 'rgba(233, 228, 218, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    overflow: 'hidden',
  },
  premiumCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  premiumCopy: {
    flex: 1,
    gap: 4,
  },
  premiumLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.premium,
    fontWeight: '600',
  },
  premiumTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#43331b',
    fontWeight: '600',
  },
  premiumText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#74654e',
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(235, 239, 236, 0.94)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  listRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  listRowPressed: {
    backgroundColor: '#f7f3ed',
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  listInsetSeparator: {
    height: 1,
    marginLeft: 64,
    marginRight: 16,
    backgroundColor: 'rgba(43, 56, 50, 0.05)',
  },
  listRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: palette.text,
    fontWeight: '600',
  },
  listRowMeta: {
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(105, 117, 113, 0.76)',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  listRowMetaActive: {
    color: '#60756f',
  },
  premiumMiniBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3ede2',
    borderWidth: 1,
    borderColor: 'rgba(205, 193, 169, 0.62)',
  },
  premiumMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#90724f',
  },
  featuredTile: {
    minHeight: 146,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(235, 239, 236, 0.94)',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    overflow: 'hidden',
    shadowColor: '#7d928f',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  featuredTilePressed: {
    backgroundColor: '#faf8f4',
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  featuredLeading: {
    paddingTop: 2,
  },
  featuredIconTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
  },
  featuredBody: {
    flex: 1,
    gap: 7,
    paddingTop: 1,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  featuredTitle: {
    fontSize: 18,
    lineHeight: 23,
    color: palette.text,
    fontWeight: '600',
    letterSpacing: -0.3,
    flex: 1,
  },
  featuredStatusChip: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3ede2',
    borderWidth: 1,
    borderColor: 'rgba(205, 193, 169, 0.62)',
  },
  featuredStatusText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#90724f',
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  featuredText: {
    fontSize: 14,
    lineHeight: 19,
    color: palette.textMuted,
    fontWeight: '500',
    maxWidth: '90%',
  },
  featuredMetaChip: {
    alignSelf: 'flex-start',
    minHeight: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 246, 245, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(208, 215, 213, 0.82)',
  },
  featuredMeta: {
    fontSize: 10,
    lineHeight: 12,
    color: '#7b8b87',
    fontWeight: '600',
    letterSpacing: 0.12,
  },
  featuredChevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(235, 244, 241, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(77, 144, 142, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  footer: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'center',
  },
  signOutButton: {
    minHeight: 40,
    paddingLeft: 7,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(217, 223, 221, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOutButtonPressed: {
    opacity: 0.84,
    backgroundColor: 'rgba(248, 248, 247, 0.9)',
    transform: [{ scale: 0.98 }],
  },
  signOutIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(176, 64, 70, 0.96)',
  },
  signOutText: {
    color: '#6f7d79',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
