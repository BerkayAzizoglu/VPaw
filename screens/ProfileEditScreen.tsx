import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

function Icon({ name, size = 22, color = '#6f6f6f' }: { name: 'back' | 'save'; size?: number; color?: string }) {
  if (name === 'back') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 6.5L9 12L14.5 17.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 12.5L10.2 17L18.5 8.7" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ProfileEditScreen({ onBack, onSaved }: ProfileEditScreenProps) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const copy = getWording(locale).profileEdit;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.id) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>();

      if (!active) return;

      setFullName(data?.full_name ?? '');
      setAvatarUrl(data?.avatar_url ?? '');
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleSave() {
    if (!user?.id || saving) return;

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
          <Pressable style={styles.iconBtn} onPress={handleSave}>
            <Icon name="save" color={saving ? '#b9b9b9' : '#6f6f6f'} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#2d2d2d" />
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.label}>{copy.nameLabel}</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={copy.namePlaceholder}
              placeholderTextColor="#a8a8a8"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={[styles.label, styles.labelGap]}>{copy.avatarLabel}</Text>
            <TextInput
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder={copy.avatarPlaceholder}
              placeholderTextColor="#a8a8a8"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? copy.saving : copy.save}</Text>
            </Pressable>
          </View>
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
    paddingBottom: 32,
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
  formCard: {
    marginTop: 22,
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
  labelGap: {
    marginTop: 18,
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
