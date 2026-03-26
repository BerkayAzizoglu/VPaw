import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, ActivityIndicator, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, SvgUri } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useLocale } from '../hooks/useLocale';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from './WeightTrackingScreen';

type ProfileRow = { full_name: string | null; avatar_url: string | null };
type IconName = 'home' | 'edit' | 'card' | 'bell' | 'settings' | 'share' | 'help' | 'feedback' | 'clock' | 'chevronRight' | 'logout' | 'sparkles';
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
const petProfilesIconUri = Image.resolveAssetSource(require('../assets/vpaw-login-illustrator.svg')).uri;

function getNavRows(isTr: boolean) {
  return {
    healthCard: [{ key: 'pet_health_card', label: isTr ? 'Pet Saglik Karti' : 'Pet Health Card', icon: 'card' as const }],
    management: [
      { key: 'pets', label: isTr ? 'Petler' : 'Pets', icon: 'share' as const },
      { key: 'family_sharing', label: isTr ? 'Aile Paylasimi' : 'Family Sharing', icon: 'share' as const },
    ],
    system: [
      { key: 'notifications', label: isTr ? 'Bildirimler' : 'Notifications', icon: 'bell' as const },
      { key: 'app_language', label: isTr ? 'Uygulama Dili' : 'App Language', icon: 'settings' as const },
      { key: 'settings', label: isTr ? 'Ayarlar' : 'Settings', icon: 'settings' as const },
    ],
    support: [
      { key: 'help', label: isTr ? 'Yardim' : 'Help', icon: 'help' as const },
      { key: 'feedback', label: isTr ? 'Geri Bildirim' : 'Feedback', icon: 'feedback' as const },
    ],
  };
}

function AppIcon({ name, size = 16, color = '#7a7a7a', strokeWidth = 1.9 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  if (name === 'home') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M22,5.724V2c0-.552-.447-1-1-1s-1,.448-1,1v2.366L14.797,.855c-1.699-1.146-3.895-1.146-5.594,0L2.203,5.579c-1.379,.931-2.203,2.48-2.203,4.145v9.276c0,2.757,2.243,5,5,5h2c.553,0,1-.448,1-1V14c0-.551,.448-1,1-1h6c.552,0,1,.449,1,1v9c0,.552,.447,1,1,1h2c2.757,0,5-2.243,5-5V9.724c0-1.581-.744-3.058-2-4Z" fill={color} /></Svg>;
  if (name === 'edit') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M1.172 19.119A4 4 0 0 0 0 21.947V24H2.053A4 4 0 0 0 4.881 22.828L18.224 9.485L14.515 5.776L1.172 19.119Z" fill={color} /><Path d="M23.145 0.855A2.622 2.622 0 0 0 19.435 0.855L15.929 4.362L19.638 8.071L23.145 4.565A2.622 2.622 0 0 0 23.145 0.855Z" fill={color} /></Svg>;
  if (name === 'chevronRight') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M9 6L15 12L9 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (name === 'card') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5.2 7.2C5.2 6.1 6.1 5.2 7.2 5.2H16.8C17.9 5.2 18.8 6.1 18.8 7.2V16.8C18.8 17.9 17.9 18.8 16.8 18.8H7.2C6.1 18.8 5.2 17.9 5.2 16.8V7.2Z" stroke={color} strokeWidth={strokeWidth} /><Line x1="8.4" y1="10.2" x2="15.6" y2="10.2" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /><Line x1="8.4" y1="13.2" x2="13.6" y2="13.2" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /></Svg>;
  if (name === 'bell') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M7.4 16.8H16.6C15.8 15.9 15.2 14.8 15.2 12.6V10.8C15.2 8.9 13.7 7.4 11.8 7.4C9.9 7.4 8.4 8.9 8.4 10.8V12.6C8.4 14.8 7.8 15.9 7.4 16.8Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /><Path d="M10.5 18.2C10.8 19 11.3 19.4 11.8 19.4C12.3 19.4 12.8 19 13.1 18.2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
  if (name === 'settings') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth={strokeWidth} /><Path d="M19 12.8V11.2L17.3 10.6C17.2 10.2 17.1 9.9 16.9 9.6L17.7 8L16 6.3L14.4 7.1C14.1 6.9 13.8 6.8 13.4 6.7L12.8 5H11.2L10.6 6.7C10.2 6.8 9.9 6.9 9.6 7.1L8 6.3L6.3 8L7.1 9.6C6.9 9.9 6.8 10.2 6.7 10.6L5 11.2V12.8L6.7 13.4C6.8 13.8 6.9 14.1 7.1 14.4L6.3 16L8 17.7L9.6 16.9C9.9 17.1 10.2 17.2 10.6 17.3L11.2 19H12.8L13.4 17.3C13.8 17.2 14.1 17.1 14.4 16.9L16 17.7L17.7 16L16.9 14.4C17.1 14.1 17.2 13.8 17.3 13.4L19 12.8Z" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinejoin="round" /></Svg>;
  if (name === 'help') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} /><Path d="M9.8 9.6C10.1 8.7 10.9 8.1 12 8.1C13.3 8.1 14.2 8.9 14.2 10.1C14.2 11.1 13.7 11.6 12.8 12.1C12.1 12.5 11.8 12.9 11.8 13.6" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /><Circle cx="11.8" cy="16.1" r="0.8" fill={color} /></Svg>;
  if (name === 'share') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="17.5" cy="6.5" r="2.3" stroke={color} strokeWidth={strokeWidth} /><Circle cx="6.5" cy="12" r="2.3" stroke={color} strokeWidth={strokeWidth} /><Circle cx="17.5" cy="17.5" r="2.3" stroke={color} strokeWidth={strokeWidth} /><Path d="M8.7 11L15.3 7.5" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /><Path d="M8.7 13L15.3 16.5" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" /></Svg>;
  if (name === 'feedback') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M6 7.2C6 6.1 6.9 5.2 8 5.2H16C17.1 5.2 18 6.1 18 7.2V13.2C18 14.3 17.1 15.2 16 15.2H11L8 18V15.2H8C6.9 15.2 6 14.3 6 13.2V7.2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" /><Circle cx="10" cy="10.2" r="0.9" fill={color} /><Circle cx="13" cy="10.2" r="0.9" fill={color} /><Circle cx="16" cy="10.2" r="0.9" fill={color} /></Svg>;
  if (name === 'clock') return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} /><Path d="M12 8V12L14.6 13.6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
  if (name === 'logout') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M10 7H7.5C6.7 7 6 7.7 6 8.5V15.5C6 16.3 6.7 17 7.5 17H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /><Path d="M13 9L16 12L13 15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" /><Line x1="9" y1="12" x2="16" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" /></Svg>;
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 4V20M6 8L10 10L12 6L14 10L18 8L16 12L20 14L16 16L18 20L14 18L12 22L10 18L6 20L8 16L4 14L8 12L6 8Z" stroke={color} strokeWidth={strokeWidth - 0.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function Section({ title, items, onItemPress }: { title: string; items: Array<{ key: string; label: string; icon: IconName }>; onItemPress?: (key: string) => void }) {
  return <View style={styles.sectionWrap}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionCard}>{items.map((item, idx) => <Pressable key={item.key} style={[styles.row, idx !== items.length - 1 && styles.rowBorder]} onPress={() => onItemPress?.(item.key)}><View style={styles.rowLeft}><View style={styles.rowIconCircle}><AppIcon name={item.icon} size={16} color="#61706c" strokeWidth={1.9} /></View><Text style={styles.rowLabel}>{item.label}</Text></View><AppIcon name="chevronRight" size={18} color="#9ba8a4" strokeWidth={2.1} /></Pressable>)}</View></View>;
}

export default function ProfileScreen({ onBackHome, onOpenPremium, onOpenProfileEdit, onOpenPetProfiles, onOpenSettings, onOpenNotifications, onOpenPetPassport, petProfiles, weightsByPet, activePetId, isPremiumPlan = false }: ProfileScreenProps) {
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const isTr = locale === 'tr';
  const navRows = getNavRows(isTr);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const orbA = useRef(new Animated.Value(0)).current;
  const orbB = useRef(new Animated.Value(0)).current;
  const visiblePets = petProfiles ? Object.values(petProfiles).filter((p) => p?.name?.trim()) : [];
  const orderedPets = [...visiblePets].sort((a, b) => (a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)));
  const petsCount = orderedPets.length;
  const managementItems = navRows.management.map((item) => (
    item.key === 'pets'
      ? { ...item, label: isTr ? `Petler (${petsCount})` : `Pets (${petsCount})` }
      : item
  ));
  const recordsCount = orderedPets.reduce((sum, pet) => sum + pet.vaccinations.length + pet.surgeriesLog.length + pet.allergiesLog.length + pet.diabetesLog.length + (weightsByPet?.[pet.id]?.length ?? 0), 0);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user?.id) { if (active) { setLoading(false); setProfile(null); } return; }
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
      if (!active) return;
      if (queryError) { setError(isTr ? 'Profil bilgisi alinamadi. Lutfen tekrar dene.' : 'Failed to load profile. Please try again.'); setProfile(null); } else setProfile(data ?? null);
      setLoading(false);
    }
    loadProfile();
    return () => { active = false; };
  }, [isTr, user?.id]);

  useEffect(() => {
    const loopA = Animated.loop(Animated.sequence([Animated.timing(orbA, { toValue: 1, duration: 7200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(orbA, { toValue: 0, duration: 7200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    const loopB = Animated.loop(Animated.sequence([Animated.timing(orbB, { toValue: 1, duration: 9200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(orbB, { toValue: 0, duration: 9200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, [orbA, orbB]);

  return (
    <View style={styles.screen}>
      <Animated.View pointerEvents="none" style={[styles.bgOrb, styles.bgOrbOne, { transform: [{ translateX: orbA.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) }, { translateY: orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }]} />
      <Animated.View pointerEvents="none" style={[styles.bgOrb, styles.bgOrbTwo, { transform: [{ translateX: orbB.interpolate({ inputRange: [0, 1], outputRange: [14, -12] }) }, { translateY: orbB.interpolate({ inputRange: [0, 1], outputRange: [-8, 18] }) }] }]} />
      <View pointerEvents="none" style={styles.bgVeil} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topActionRow}>
          {onBackHome ? <Pressable style={styles.iconBtn} onPress={onBackHome}><AppIcon name="home" size={22} color="#6f6f6f" strokeWidth={2.1} /></Pressable> : <View />}
          <Pressable style={styles.iconBtn} onPress={onOpenProfileEdit}><AppIcon name="edit" size={22} color="#6f6f6f" strokeWidth={2.1} /></Pressable>
        </View>

        <View style={styles.headerRow}>
          <View style={styles.avatarWrap}><Image source={{ uri: profile?.avatar_url || fallbackAvatar }} style={styles.avatar} /></View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile?.full_name?.trim() || (isTr ? 'Kullanici' : 'User')}</Text>
            <Text style={styles.email}>{user?.email ?? '-'}</Text>
            <View style={[styles.planPill, isPremiumPlan && styles.planPillPremium]}><Text style={[styles.planPillText, isPremiumPlan && styles.planPillTextPremium]}>{isPremiumPlan ? 'V-PAW PREMIUM' : (isTr ? 'UCRETSIZ PLAN' : 'FREE PLAN')}</Text></View>
          </View>
        </View>

        {loading ? <View style={styles.loadingCard}><ActivityIndicator size="small" color="#2d2d2d" /></View> : null}

        <View style={styles.statsRow}>
          <MiniStat label={isTr ? 'Hayvanlar' : 'Pets'} value={String(petsCount)} />
          <MiniStat label={isTr ? 'Kayitlar' : 'Records'} value={String(recordsCount)} />
          <MiniStat label={isTr ? 'Senkron' : 'Sync'} value={isTr ? 'Canli' : 'Live'} icon="clock" />
        </View>

        {!isPremiumPlan ? <Pressable style={styles.premiumCard} onPress={onOpenPremium}><View style={styles.premiumTexts}><View style={styles.premiumKickerRow}><AppIcon name="sparkles" size={12} color="#c48d42" strokeWidth={1.7} /><Text style={styles.premiumKicker}>V-PAW PREMIUM</Text></View><Text style={styles.premiumTitle}>{isTr ? 'Tum saglik gecmisinin kilidini ac' : 'Unlock full health history'}</Text><Text style={styles.premiumSub}>{isTr ? 'PDF saglik karti disa aktarma ve sinirsiz hayvan' : 'Export PDF health cards and unlimited pets'}</Text></View><AppIcon name="chevronRight" size={20} color="#c48d42" strokeWidth={2.1} /></Pressable> : null}

        <Section title={isTr ? 'PET SAGLIK KARTI' : 'PET HEALTH CARD'} items={navRows.healthCard} onItemPress={(key) => { if (key === 'pet_health_card') onOpenPetPassport?.(); }} />
        <Section title={isTr ? 'YONETIM' : 'MANAGEMENT'} items={managementItems} onItemPress={(key) => { if (key === 'pets') onOpenPetProfiles?.(); if (key === 'family_sharing') Alert.alert(isTr ? 'Aile paylasimi yakinda' : 'Family sharing coming soon'); }} />
        <Section title={isTr ? 'SISTEM' : 'SYSTEM'} items={navRows.system} onItemPress={(key) => { if (key === 'notifications') onOpenNotifications?.(); if (key === 'app_language') onOpenSettings?.(); if (key === 'settings') onOpenSettings?.(); }} />
        <Section title={isTr ? 'DESTEK' : 'SUPPORT'} items={navRows.support} onItemPress={(key) => { if (key === 'help') Alert.alert(isTr ? 'Yardim yakinda' : 'Help coming soon'); if (key === 'feedback') Alert.alert(isTr ? 'Geri bildirim yakinda' : 'Feedback coming soon'); }} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable style={styles.signOutBtn} onPress={signOut}><View style={styles.signOutRow}><AppIcon name="logout" size={18} color="#c96a6a" strokeWidth={2.1} /><Text style={styles.signOutText}>{isTr ? 'Cikis Yap' : 'Sign Out'}</Text></View></Pressable>
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  return <View style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><View style={styles.statValueRow}>{icon ? <AppIcon name={icon} size={14} color="#656565" strokeWidth={2} /> : null}<Text style={styles.statValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f1ea' },
  bgVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248,244,239,0.74)' },
  bgOrb: { position: 'absolute', borderRadius: 999 },
  bgOrbOne: { width: 300, height: 300, top: -60, right: -70, backgroundColor: 'rgba(195,231,219,0.9)' },
  bgOrbTwo: { width: 250, height: 250, top: 240, left: -120, backgroundColor: 'rgba(245,224,200,0.72)' },
  content: { paddingHorizontal: 24, paddingTop: 70, paddingBottom: 34, gap: 12 },
  topActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { width: 82, height: 82, borderRadius: 41, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', shadowColor: '#27413a', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  avatar: { width: '100%', height: '100%' },
  headerInfo: { flex: 1 },
  name: { fontSize: 36, lineHeight: 38, fontWeight: '800', color: '#2d2d2d', letterSpacing: -0.6 },
  email: { marginTop: 2, fontSize: 14, lineHeight: 21, color: '#787878', fontWeight: '500' },
  planPill: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' },
  planPillPremium: { backgroundColor: 'rgba(253,243,226,0.82)' },
  planPillText: { fontSize: 11, lineHeight: 16, letterSpacing: 0.55, fontWeight: '700', color: 'rgba(45,45,45,0.7)' },
  planPillTextPremium: { color: '#b07a22' },
  loadingCard: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  statsRow: { marginTop: 4, flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 16, paddingTop: 16 },
  statLabel: { fontSize: 12, lineHeight: 18, color: '#6f7674', fontWeight: '600' },
  statValueRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 24, lineHeight: 24, color: '#2d2d2d', fontWeight: '800' },
  premiumCard: { marginTop: 2, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', backgroundColor: 'rgba(247,241,228,0.72)', paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center' },
  premiumTexts: { flex: 1 },
  premiumKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  premiumKicker: { fontSize: 12, lineHeight: 18, color: '#c48d42', fontWeight: '800', letterSpacing: 0.6 },
  premiumTitle: { marginTop: 3, fontSize: 17, lineHeight: 21, color: 'rgba(45,45,45,0.9)', fontWeight: '700' },
  premiumSub: { marginTop: 4, fontSize: 13, lineHeight: 19, color: 'rgba(45,45,45,0.6)', fontWeight: '500' },
  petsSection: { marginTop: 6, gap: 14 },
  petsHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  petsTitleWrap: { flex: 1 },
  petsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  petsTitle: { fontSize: 30, lineHeight: 32, fontWeight: '800', color: '#26413a', letterSpacing: -0.6 },
  petsSubtitle: { marginTop: 6, maxWidth: 265, fontSize: 13, lineHeight: 19, color: 'rgba(38,65,58,0.72)', fontWeight: '500' },
  openBtn: { minWidth: 68, height: 38, borderRadius: 19, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  openBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#35554d' },
  petsRail: { paddingRight: 8, gap: 12 },
  petCard: { width: 252, minHeight: 172, borderRadius: 30, paddingHorizontal: 18, paddingVertical: 18, backgroundColor: 'rgba(255,255,255,0.34)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', overflow: 'hidden' },
  petCardActive: { backgroundColor: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.94)' },
  petGlow: { position: 'absolute', width: 112, height: 112, borderRadius: 56, right: -18, top: -18, backgroundColor: 'rgba(196,228,218,0.48)' },
  petTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  petName: { flex: 1, fontSize: 24, lineHeight: 26, fontWeight: '800', color: '#21362f', letterSpacing: -0.35 },
  activeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(50,102,88,0.12)', borderWidth: 1, borderColor: 'rgba(50,102,88,0.14)' },
  activeBadgeText: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: '#35554d', letterSpacing: 0.3 },
  petMeta: { marginTop: 10, fontSize: 13, lineHeight: 19, color: 'rgba(31,49,44,0.62)', fontWeight: '600' },
  petChip: { marginTop: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.84)' },
  petChipLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: 'rgba(53,85,77,0.62)', letterSpacing: 0.25 },
  petChipValue: { marginTop: 4, fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#27413a' },
  emptyPetsCard: { borderRadius: 28, paddingHorizontal: 20, paddingVertical: 22, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)' },
  emptyPetsTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: '#27413a', letterSpacing: -0.35 },
  emptyPetsSub: { marginTop: 8, fontSize: 13, lineHeight: 20, color: 'rgba(39,65,58,0.68)', fontWeight: '500' },
  sectionWrap: { marginTop: 4, gap: 12 },
  sectionTitle: { marginLeft: 8, fontSize: 12, lineHeight: 18, color: '#787878', letterSpacing: 0.6, fontWeight: '800' },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', borderRadius: 24, overflow: 'hidden' },
  row: { height: 65, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(71,103,95,0.08)' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, lineHeight: 22, color: 'rgba(45,45,45,0.9)', fontWeight: '600' },
  errorText: { marginTop: 4, color: '#b55858', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  signOutBtn: { marginTop: 8, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signOutText: { color: '#c96a6a', fontSize: 15, lineHeight: 22, fontWeight: '700' },
});
