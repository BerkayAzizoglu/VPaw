import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Polyline, SvgUri } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLocale } from '../hooks/useLocale';
import type { PetProfile } from '../components/AuthGate';
import type { WeightPoint } from './WeightTrackingScreen';

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type ProfileScreenProps = {
  onSaveSuccess?: () => void;
  onBackHome?: () => void;
  onOpenPremium?: () => void;
  onOpenProfileEdit?: () => void;
  onOpenVaccinations?: () => void;
  onOpenPetProfile?: () => void;
  onOpenPetProfiles?: () => void;
  onOpenHealthRecords?: () => void;
  onOpenVetVisits?: () => void;
  onOpenSettings?: () => void;
  onOpenPetPassport?: () => void;
  petProfiles?: Record<'luna' | 'milo', PetProfile>;
  weightsByPet?: Record<'luna' | 'milo', WeightPoint[]>;
};

type IconName =
  | 'home'
  | 'edit'
  | 'user'
  | 'passport'
  | 'health'
  | 'pulse'
  | 'syringe'
  | 'bell'
  | 'settings'
  | 'help'
  | 'clock'
  | 'chevronRight'
  | 'chevronLeft'
  | 'logout'
  | 'sparkles';

const fallbackAvatar = 'https://www.figma.com/api/mcp/asset/7f9b54a3-43e6-4459-a7f9-0ae7b68618e2';
const petProfilesIconUri = Image.resolveAssetSource(require('../assets/vpaw-login-illustrator.svg')).uri;
const catDogHomeButtonUri = Image.resolveAssetSource(require('../assets/cat-dog-home-button.svg')).uri;

const navRows: Record<'pets' | 'health' | 'preferences', Array<{ key: string; label: string; icon: IconName }>> = {
  pets: [
    { key: 'pet_profiles', label: 'Pet Profiles', icon: 'user' },
    { key: 'pet_passport', label: 'Pet Health Passport', icon: 'passport' },
  ],
  health: [
    { key: 'health_records', label: 'Health Records', icon: 'health' },
    { key: 'vet_visits', label: 'Vet Visits', icon: 'pulse' },
    { key: 'vaccinations', label: 'Vaccinations', icon: 'syringe' },
  ],
  preferences: [
    { key: 'notifications', label: 'Notifications', icon: 'bell' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
    { key: 'support', label: 'Help & Support', icon: 'help' },
  ],
};

function AppIcon({ name, size = 16, color = '#7a7a7a', strokeWidth = 1.9 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  if (name === 'home') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4.8 10.6L12 5L19.2 10.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7.2 9.8V18.6H16.8V9.8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10.3 18.6V14.2H13.7V18.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === 'edit') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4.4 19.6H8.1L18 9.7C18.6 9.1 18.6 8.2 18 7.6L16.4 6C15.8 5.4 14.9 5.4 14.3 6L4.4 15.9V19.6Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Path d="M12.9 7.4L16.6 11.1" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'chevronRight') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6L15 12L9 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'chevronLeft') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M15 6L9 12L15 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'user') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M5.8 18.2C7 15.4 9.3 14 12 14C14.7 14 17 15.4 18.2 18.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'passport') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 4.8H15.5L19 8.2V19.2H7V4.8Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Path d="M15.4 4.8V8.3H19" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Line x1="9.4" y1="12" x2="16.4" y2="12" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
        <Line x1="9.4" y1="15.2" x2="16.4" y2="15.2" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'health') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 20.3C8.7 17.8 5 14.9 5 11.1C5 8.9 6.8 7.2 9 7.2C10.4 7.2 11.6 7.9 12.2 9C12.8 7.9 14 7.2 15.4 7.2C17.6 7.2 19.4 8.9 19.4 11.1C19.4 14.9 15.7 17.8 12.4 20.3L12.2 20.5L12 20.3Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Path d="M8.4 12H10.7L12 10.2L13.3 13.8L14.5 12.6H16.8" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'pulse') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3.5 12H8L10 8L13 16L15.2 11.5H20.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'syringe') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 5.5L18.5 9.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Path d="M6 18L14.7 9.3L17.7 12.3L9 21H6V18Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Line x1="12" y1="12" x2="14" y2="14" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
        <Line x1="9.8" y1="14.2" x2="11.8" y2="16.2" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'bell') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7.4 16.8H16.6C15.8 15.9 15.2 14.8 15.2 12.6V10.8C15.2 8.9 13.7 7.4 11.8 7.4C9.9 7.4 8.4 8.9 8.4 10.8V12.6C8.4 14.8 7.8 15.9 7.4 16.8Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        <Path d="M10.5 18.2C10.8 19 11.3 19.4 11.8 19.4C12.3 19.4 12.8 19 13.1 18.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'settings') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M19 12.8V11.2L17.3 10.6C17.2 10.2 17.1 9.9 16.9 9.6L17.7 8L16 6.3L14.4 7.1C14.1 6.9 13.8 6.8 13.4 6.7L12.8 5H11.2L10.6 6.7C10.2 6.8 9.9 6.9 9.6 7.1L8 6.3L6.3 8L7.1 9.6C6.9 9.9 6.8 10.2 6.7 10.6L5 11.2V12.8L6.7 13.4C6.8 13.8 6.9 14.1 7.1 14.4L6.3 16L8 17.7L9.6 16.9C9.9 17.1 10.2 17.2 10.6 17.3L11.2 19H12.8L13.4 17.3C13.8 17.2 14.1 17.1 14.4 16.9L16 17.7L17.7 16L16.9 14.4C17.1 14.1 17.2 13.8 17.3 13.4L19 12.8Z" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'help') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M9.8 9.6C10.1 8.7 10.9 8.1 12 8.1C13.3 8.1 14.2 8.9 14.2 10.1C14.2 11.1 13.7 11.6 12.8 12.1C12.1 12.5 11.8 12.9 11.8 13.6" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" />
        <Circle cx="11.8" cy="16.1" r="0.8" fill={color} />
      </Svg>
    );
  }

  if (name === 'clock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
        <Path d="M12 8V12L14.6 13.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'logout') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M10 7H7.5C6.7 7 6 7.7 6 8.5V15.5C6 16.3 6.7 17 7.5 17H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Path d="M13 9L16 12L13 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="9" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4V20M6 8L10 10L12 6L14 10L18 8L16 12L20 14L16 16L18 20L14 18L12 22L10 18L6 20L8 16L4 14L8 12L6 8Z" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ProfileScreen({ onBackHome, onOpenPremium, onOpenProfileEdit, onOpenVaccinations, onOpenPetProfile, onOpenPetProfiles, onOpenHealthRecords, onOpenVetVisits, onOpenSettings, onOpenPetPassport, petProfiles, weightsByPet }: ProfileScreenProps) {
  const { locale } = useLocale();
  const isTr = locale === 'tr';
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (queryError) {
        setError(isTr ? 'Profil bilgisi alınamadı. Lütfen tekrar dene.' : 'Failed to load profile. Please try again.');
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

  const displayName = profile?.full_name?.trim() || 'Alex Morrison';
  const sectionPets = isTr ? 'HAYVANLARIM' : 'MY PETS';
  const sectionHealth = 'PET HEALTH';
  const sectionPreferences = isTr ? 'TERCİHLER' : 'PREFERENCES';
  const displayEmail = user?.email ?? 'alex.morrison@example.com';
  const petsCount = petProfiles ? Object.keys(petProfiles).length : 1;
  const recordsCount = petProfiles
    ? Object.values(petProfiles).reduce((sum, p) => {
        const weightCount = weightsByPet?.[p.id]?.length ?? 0;
        return sum + p.vaccinations.length + p.surgeriesLog.length + p.allergiesLog.length + p.diabetesLog.length + weightCount;
      }, 0)
    : 13;
  const syncValue = isTr ? 'Canlı' : 'Live';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.editIconFloating} onPress={onOpenProfileEdit}>
          <AppIcon name="edit" size={22} color="#6f6f6f" strokeWidth={2.1} />
        </Pressable>
        <View style={styles.topActionRow}>
          {onBackHome ? (
            <Pressable style={styles.homeIconBtn} onPress={onBackHome}>
              <SvgUri uri={catDogHomeButtonUri} width={36} height={36} style={styles.homeIconAsset} />
            </Pressable>
          ) : <View />}

        </View>
        <View style={styles.headerRow}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: profile?.avatar_url || fallbackAvatar }} style={styles.avatar} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{displayEmail}</Text>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{isTr ? 'ÜCRETSİZ PLAN' : 'FREE PLAN'}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#2d2d2d" />
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard label={isTr ? 'Hayvanlar' : 'Pets'} value={String(petsCount)} />
          <StatCard label={isTr ? 'Kayıtlar' : 'Records'} value={String(recordsCount)} />
          <StatCard label="Sync" value={syncValue} subIcon="clock" />
        </View>

        <Pressable style={styles.premiumCard} onPress={onOpenPremium}>
          <View style={styles.premiumTexts}>
            <View style={styles.premiumKickerRow}>
              <AppIcon name="sparkles" size={12} color="#c48d42" strokeWidth={1.7} />
              <Text style={styles.premiumKicker}>V-PAW PREMIUM</Text>
            </View>
            <Text style={styles.premiumTitle}>{isTr ? 'Tüm sağlık geçmişinin kilidini aç' : 'Unlock full health history'}</Text>
            <Text style={styles.premiumSub}>{isTr ? 'PDF pasaport dışa aktarma ve sınırsız hayvan' : 'Export PDF passports & unlimited pets'}</Text>
          </View>
          <View style={styles.premiumArrowWrap}>
            <AppIcon name="chevronRight" size={20} color="#c48d42" strokeWidth={2.1} />
          </View>
        </Pressable>

        <Section
          title={sectionPets}
          items={navRows.pets}
          onItemPress={(key) => {
            if (key === 'pet_profiles') onOpenPetProfiles?.();
            if (key === 'pet_passport') onOpenPetPassport?.();
          }}
        />
        <Section
          title={sectionHealth}
          items={navRows.health}
          onItemPress={(key) => {
            if (key === 'vaccinations') onOpenVaccinations?.();
            if (key === 'health_records') onOpenHealthRecords?.();
            if (key === 'vet_visits') onOpenVetVisits?.();
          }}
        />
        <Section
          title={sectionPreferences}
          items={navRows.preferences}
          onItemPress={(key) => {
            if (key === 'settings') onOpenSettings?.();
          }}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <View style={styles.signOutRow}>
            <AppIcon name="logout" size={18} color="#c96a6a" strokeWidth={2.1} />
            <Text style={styles.signOutText}>{isTr ? 'Çıkış Yap' : 'Sign Out'}</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, subIcon }: { label: string; value: string; subIcon?: IconName }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        {subIcon ? <AppIcon name={subIcon} size={14} color="#656565" strokeWidth={2} /> : null}
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function Section({
  title,
  items,
  onItemPress,
}: {
  title: string;
  items: Array<{ key: string; label: string; icon: IconName }>;
  onItemPress?: (key: string) => void;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items.map((item, idx) => (
          <Pressable
            key={item.key}
            style={[styles.row, idx !== items.length - 1 && styles.rowBorder]}
            onPress={() => onItemPress?.(item.key)}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowIconCircle}>
                {item.key === 'pet_profiles' ? (
                  <SvgUri uri={petProfilesIconUri} width={20} height={20} style={styles.petProfilesIcon} />
                ) : (
                  <AppIcon name={item.icon} size={16} color="#777" strokeWidth={1.9} />
                )}
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
            </View>
            <View style={styles.rowChevronWrap}>
              <AppIcon name="chevronRight" size={18} color="#bcbcbc" strokeWidth={2.1} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf9f8' },
  content: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 34,
    gap: 12,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  homeIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  homeIconAsset: {
    opacity: 1,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -2,
  },
  editIconFloating: {
    position: 'absolute',
    top: 70,
    right: 22,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
    color: '#2d2d2d',
    letterSpacing: -0.6,
  },
  email: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 21,
    color: '#787878',
    fontWeight: '500',
  },
  planPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  planPillText: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.55,
    fontWeight: '700',
    color: 'rgba(45,45,45,0.7)',
  },
  loadingCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  statsRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#787878',
    fontWeight: '600',
  },
  statValueRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '800',
  },
  premiumCard: {
    marginTop: 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e8ddc5',
    backgroundColor: '#f7f1e4',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumTexts: {
    flex: 1,
  },
  premiumKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumKicker: {
    fontSize: 12,
    lineHeight: 18,
    color: '#c48d42',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  premiumTitle: {
    marginTop: 3,
    fontSize: 17,
    lineHeight: 21,
    color: 'rgba(45,45,45,0.9)',
    fontWeight: '700',
  },
  premiumSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(45,45,45,0.6)',
    fontWeight: '500',
  },
  premiumArrowWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionWrap: {
    marginTop: 4,
    gap: 12,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#787878',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  row: {
    height: 65,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  rowChevronWrap: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rowIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petProfilesIcon: {
    opacity: 1,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(45,45,45,0.9)',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 4,
    color: '#b55858',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  signOutBtn: {
    marginTop: 8,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signOutText: {
    color: '#c96a6a',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
});




















