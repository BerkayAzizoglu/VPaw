import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../hooks/useLocale';
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(FALLBACK_AVATAR);

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

  const canSave = useMemo(() => fullName.trim().length >= 2 && !saving, [fullName, saving]);

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

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <Icon name="back" />
          </Pressable>
          <Text style={styles.title}>{copy.title}</Text>
          <Pressable style={styles.iconBtn} onPress={handleSave} disabled={!canSave}>
            <Icon name="save" color={canSave ? '#6f6f6f' : '#b9b9b9'} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#2d2d2d" />
          </View>
        ) : (
          <>
            <View style={styles.avatarCard}>
              <View style={styles.avatarHeroWrap}>
                <Image source={{ uri: avatarUrl || FALLBACK_AVATAR }} style={styles.avatarHero} />
                <View style={styles.avatarCameraBadge}>
                  <Icon name="camera" size={13} color="#6f6f6f" />
                </View>
              </View>
              <Text style={styles.avatarCardTitle}>{isTr ? 'Profil Fotoðrafý' : 'Profile Photo'}</Text>
              <Text style={styles.avatarCardSub}>{isTr ? 'Aþaðýdan bir avatar seç.' : 'Pick an avatar below.'}</Text>

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

            <View style={styles.formCard}>
              <Text style={styles.label}>{copy.nameLabel}</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={copy.namePlaceholder}
                placeholderTextColor="#a8a8a8"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            <Pressable style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]} onPress={handleSave} disabled={!canSave || saving}>
              <Text style={styles.saveBtnText}>{saving ? copy.saving : copy.save}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf9f8',
  },
  content: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  loadingWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  avatarCard: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatarHeroWrap: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
  },
  avatarHero: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f4f1ea',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCardTitle: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  avatarCardSub: {
    textAlign: 'center',
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#8b8b8b',
    fontWeight: '500',
  },
  avatarRail: {
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 2,
  },
  avatarOptionWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  avatarOptionWrapSelected: {
    borderColor: '#d3c2a4',
    backgroundColor: 'rgba(211,194,164,0.14)',
  },
  avatarOption: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  formCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    padding: 18,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#787878',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#faf9f8',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#2d2d2d',
    fontWeight: '500',
  },
  saveBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d2d',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#faf8f5',
    fontWeight: '700',
  },
});
