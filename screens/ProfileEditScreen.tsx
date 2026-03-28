import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
import { useEdgeSwipeBack } from '../hooks/useEdgeSwipeBack';
import { getWording } from '../lib/wording';
import { supabase } from '../lib/supabase';

type ProfileEditScreenProps = {
  onBack: () => void;
  onSaved: () => void;
};

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

function Icon({ name, size = 22, color = '#6f6f6f' }: { name: 'back' | 'save' | 'camera'; size?: number; color?: string }) {
  if (name === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (name === 'camera') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4.8 8.4H8L9.4 6.8H14.6L16 8.4H19.2C20 8.4 20.6 9 20.6 9.8V17.4C20.6 18.2 20 18.8 19.2 18.8H4.8C4 18.8 3.4 18.2 3.4 17.4V9.8C3.4 9 4 8.4 4.8 8.4Z" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
        <Circle cx="12" cy="13.4" r="3" stroke={color} strokeWidth={1.9} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 12.5L10.2 17L18.5 8.7" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const FALLBACK_AVATAR = 'https://www.figma.com/api/mcp/asset/7f9b54a3-43e6-4459-a7f9-0ae7b68618e2';
const AVATAR_PRESETS = [
  FALLBACK_AVATAR,
  'https://www.figma.com/api/mcp/asset/c1377527-400c-4e5e-8c97-bd4806f77781',
  'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=500&auto=format&fit=crop',
] as const;

export default function ProfileEditScreen({ onBack, onSaved }: ProfileEditScreenProps) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getWording(locale).profileEdit;
  const isTr = locale === 'tr';
  const { height: screenH } = useWindowDimensions();

  const basicInfoTitle = isTr ? 'Temel bilgiler' : 'Basic info';
  const photoTitle = isTr ? 'Profil fotoğrafı' : 'Profile photo';
  const photoHelper = isTr ? 'Fotoğrafa dokunarak yeni bir görsel seç.' : 'Tap the photo to choose a new image.';
  const photoPermissionTitle = isTr ? 'Fotoğraf erişimi gerekli' : 'Photo access required';
  const photoPermissionBody = isTr ? 'Profil fotoğrafı seçmek için fotoğraf erişimini aç.' : 'Enable photo access to choose a profile image.';
  const photoPickFailedTitle = isTr ? 'Fotoğraf seçilemedi' : 'Photo could not be selected';
  const photoPickFailedBody = isTr ? 'Lütfen tekrar dene.' : 'Please try again.';
  const accountNameLabel = isTr ? 'Hesap adı' : 'Account name';
  const emailLabel = isTr ? 'E-posta' : 'Email';
  const nameHelper = isTr ? 'Profil, paylaşım ve sağlık kartında görünür.' : 'Shown in profile, sharing, and health card surfaces.';
  const emailHelper = isTr ? 'Giriş ve güvenlik için kullanılır.' : 'Used for sign-in and account security.';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(FALLBACK_AVATAR);
  const [isFormFocused, setIsFormFocused] = useState(false);

  const swipePanResponder = useEdgeSwipeBack({ onBack, enabled: !isFormFocused });
  const translateY = useRef(new Animated.Value(screenH)).current;
  const tintOpacity = useRef(new Animated.Value(0)).current;
  const sheetHeightRef = useRef(screenH);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.id) {
        if (active) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>();

      if (!active) return;

      setFullName(data?.full_name ?? '');
      setAvatarUrl(data?.avatar_url?.trim() || FALLBACK_AVATAR);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    sheetHeightRef.current = screenH;
    translateY.setValue(screenH);
    tintOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 240,
        mass: 0.88,
        useNativeDriver: true,
      }),
      Animated.timing(tintOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenH, tintOpacity, translateY]);

  const canSave = useMemo(() => fullName.trim().length >= 2 && !saving, [fullName, saving]);
  const previewName = fullName.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || copy.namePlaceholder;

  function closeSheet() {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: sheetHeightRef.current,
        damping: 28,
        stiffness: 380,
        useNativeDriver: true,
      }),
      Animated.timing(tintOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onBack());
  }

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderMove: (_, gs) => {
        if (gs.dy >= 0) {
          translateY.setValue(gs.dy);
          tintOpacity.setValue(Math.max(0, 1 - gs.dy / Math.max(sheetHeightRef.current, 1)));
        } else {
          translateY.setValue(gs.dy * 0.12);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 110 || gs.vy > 0.75) {
          closeSheet();
          return;
        }

        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            damping: 24,
            stiffness: 300,
            mass: 0.88,
            useNativeDriver: true,
          }),
          Animated.timing(tintOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      },
    }),
  ).current;

  async function handleSave() {
    if (!user?.id || !canSave) return;

    setSaving(true);
    const now = new Date().toISOString();

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      updated_at: now,
    });

    setSaving(false);

    if (error) {
      Alert.alert(copy.saveFailedTitle, copy.saveFailedBody);
      return;
    }

    onSaved();
  }

  async function handlePickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(photoPermissionTitle, photoPermissionBody);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const pickedUri = result.assets[0].uri;
      const ext = pickedUri.split('.').pop()?.split('?')[0] || 'jpg';
      const dir = `${FileSystem.documentDirectory ?? ''}profile-photos`;
      const target = `${dir}/avatar-${user?.id ?? 'local'}.${ext}`;

      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      const targetInfo = await FileSystem.getInfoAsync(target);
      if (targetInfo.exists) {
        await FileSystem.deleteAsync(target, { idempotent: true });
      }

      await FileSystem.copyAsync({ from: pickedUri, to: target });
      setAvatarUrl(target);
    } catch {
      Alert.alert(photoPickFailedTitle, photoPickFailedBody);
    }
  }

  return (
    <View style={styles.screen} {...swipePanResponder.panHandlers}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.topTint, { opacity: tintOpacity }]} />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        onLayout={(event) => {
          sheetHeightRef.current = event.nativeEvent.layout.height;
        }}
      >
        <View style={styles.handleArea} {...dragPan.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={closeSheet}>
            <Icon name="back" />
          </Pressable>
          <Text style={styles.title}>{copy.title}</Text>
          <Pressable style={[styles.iconBtn, styles.saveIconBtn]} onPress={handleSave} disabled={!canSave}>
            <Icon name="save" color={canSave ? '#49685f' : '#b8c0be'} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#49685f" />
            </View>
          ) : (
            <>
              <View style={styles.heroBlock}>
                <Pressable style={({ pressed }) => [styles.avatarHeroWrap, pressed && styles.avatarHeroWrapPressed]} onPress={handlePickPhoto}>
                  <Image source={{ uri: avatarUrl || FALLBACK_AVATAR }} style={styles.avatarHero} />
                  <View style={styles.avatarCameraBadge}>
                    <Icon name="camera" size={13} color="#5d6f69" />
                  </View>
                </Pressable>
                <Text style={styles.heroName} numberOfLines={1}>
                  {previewName}
                </Text>
                <Text style={styles.heroEmail} numberOfLines={1}>
                  {user?.email ?? '-'}
                </Text>
              </View>

              <View style={styles.groupWrap}>
                <Text style={styles.groupTitle}>{basicInfoTitle}</Text>
                <View style={styles.groupCard}>
                  <View pointerEvents="none" style={styles.cardHighlight} />
                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>{accountNameLabel}</Text>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder={copy.namePlaceholder}
                      placeholderTextColor="#a2aca8"
                      style={styles.input}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onFocus={() => setIsFormFocused(true)}
                      onBlur={() => setIsFormFocused(false)}
                    />
                    <Text style={styles.helperText}>{nameHelper}</Text>
                  </View>
                  <View style={styles.insetDivider} />
                  <View style={styles.readOnlyRow}>
                    <View style={styles.readOnlyCopy}>
                      <Text style={styles.readOnlyLabel}>{emailLabel}</Text>
                      <Text style={styles.readOnlyHelper}>{emailHelper}</Text>
                    </View>
                    <Text style={styles.readOnlyValue} numberOfLines={1}>
                      {user?.email ?? '-'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.groupWrap}>
                <Text style={styles.groupTitle}>{photoTitle}</Text>
                <View style={styles.groupCard}>
                  <View pointerEvents="none" style={styles.cardHighlight} />
                  <Text style={styles.photoHelper}>{photoHelper}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRail}>
                    {AVATAR_PRESETS.map((preset) => {
                      const selected = preset === avatarUrl;
                      return (
                        <Pressable
                          key={preset}
                          onPress={() => setAvatarUrl(preset)}
                          style={[styles.avatarOptionWrap, selected && styles.avatarOptionWrapSelected]}
                        >
                          <Image source={{ uri: preset }} style={styles.avatarOption} />
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#edf4f3',
  },
  topTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#cfe9eb',
  },
  sheet: {
    flex: 1,
    marginTop: 72,
    backgroundColor: '#fbfaf7',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233, 238, 235, 0.92)',
  },
  handleArea: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 135, 130, 0.28)',
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(232, 237, 235, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIconBtn: {
    backgroundColor: '#eef4f0',
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: '#22342f',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  loadingWrap: {
    marginTop: 56,
    alignItems: 'center',
  },
  heroBlock: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 8,
  },
  avatarHeroWrap: {
    alignSelf: 'center',
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 10,
  },
  avatarHeroWrapPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  avatarHero: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f4f1ea',
    borderWidth: 1,
    borderColor: 'rgba(97, 112, 107, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    maxWidth: '88%',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 32,
    color: '#22342f',
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  heroEmail: {
    textAlign: 'center',
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(97, 112, 107, 0.78)',
    fontWeight: '500',
  },
  groupWrap: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(110, 123, 118, 0.76)',
    fontWeight: '600',
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(233, 238, 235, 0.96)',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#708782',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#6e7b76',
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(223, 229, 226, 0.98)',
    backgroundColor: '#faf9f6',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#22342f',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#87938f',
    fontWeight: '500',
  },
  insetDivider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: 'rgba(43, 56, 50, 0.06)',
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  readOnlyCopy: {
    flex: 1,
    gap: 2,
  },
  readOnlyLabel: {
    fontSize: 15,
    lineHeight: 20,
    color: '#6e7b76',
    fontWeight: '500',
  },
  readOnlyHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: '#87938f',
    fontWeight: '500',
  },
  readOnlyValue: {
    maxWidth: '48%',
    textAlign: 'right',
    fontSize: 15,
    lineHeight: 20,
    color: '#22342f',
    fontWeight: '600',
  },
  photoHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: '#87938f',
    fontWeight: '500',
  },
  avatarRail: {
    marginTop: 10,
    gap: 10,
    paddingHorizontal: 2,
  },
  avatarOptionWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(231, 236, 234, 0.96)',
    padding: 3,
    backgroundColor: '#faf9f6',
  },
  avatarOptionWrapSelected: {
    borderColor: '#c8ba97',
    backgroundColor: 'rgba(200,186,151,0.12)',
  },
  avatarOption: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
});
