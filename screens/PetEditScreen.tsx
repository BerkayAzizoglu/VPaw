import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { ChevronRight, Pencil } from 'lucide-react-native';

type PetEditScreenProps = {
  petId?: 'luna' | 'milo';
  onBack: () => void;
  onSaved: () => void;
};

const logoUri = Image.resolveAssetSource(require('../assets/vpaw-figma-logo.svg')).uri;

const PET_PRESET = {
  luna: {
    name: 'Luna',
    petType: 'Dog',
    gender: 'Female',
    breed: 'Golden Retriever',
    age: '3 years',
    image: 'https://www.figma.com/api/mcp/asset/6f25c37a-f633-4891-ba3b-0fab066dac17',
  },
  milo: {
    name: 'Milo',
    petType: 'Cat',
    gender: 'Male',
    breed: 'British Shorthair',
    age: '2 years',
    image: 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?q=80&w=800&auto=format&fit=crop',
  },
} as const;

export default function PetEditScreen({ petId = 'milo', onBack, onSaved }: PetEditScreenProps) {
  const pet = useMemo(() => PET_PRESET[petId] ?? PET_PRESET.milo, [petId]);
  const [hasAllergies, setHasAllergies] = useState(true);
  const [hasDiabetes, setHasDiabetes] = useState(false);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.brandWrap}>
            <SvgUri uri={logoUri} width={24} height={24} />
            <View>
              <Text style={styles.brandTitle}>V-Paw</Text>
              <Text style={styles.brandSub}>BY VIRNELO</Text>
            </View>
          </View>

          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Edit {pet.name} Profile</Text>

          <View style={styles.avatarWrap}>
            <Image source={{ uri: pet.image }} style={styles.avatar} />
            <Pressable style={styles.editAvatarBtn}>
              <Pencil size={14} color="#7c7468" strokeWidth={2.3} />
              <Text style={styles.editAvatarText}>Edit</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Basic Info</Text>
          <View style={styles.sectionCard}>
            <InfoRow label="Pet Type" value={pet.petType} />
            <InfoRow label="Gender" value={pet.gender} />
            <InfoRow label="Breed" value={pet.breed} />
            <InfoRow label="Age" value={pet.age} noBorder />
          </View>

          <Text style={styles.sectionTitle}>Medical History</Text>
          <View style={styles.sectionCard}>
            <InfoRow label="Vaccines" value="DHPP, Rabies, Feline Leukemia" />
            <InfoRow label="Surgeries" value="None" />

            <View style={styles.toggleRow}>
              <Text style={styles.label}>Allergies</Text>
              <Switch
                value={hasAllergies}
                onValueChange={setHasAllergies}
                thumbColor={hasAllergies ? '#ffffff' : '#f4f4f4'}
                trackColor={{ false: '#d8d8d8', true: '#6e8f66' }}
                ios_backgroundColor="#d8d8d8"
              />
            </View>

            <View style={[styles.toggleRow, styles.noBorder]}>
              <Text style={styles.label}>Diabetes</Text>
              <Switch
                value={hasDiabetes}
                onValueChange={setHasDiabetes}
                thumbColor={hasDiabetes ? '#ffffff' : '#f4f4f4'}
                trackColor={{ false: '#d8d8d8', true: '#6e8f66' }}
                ios_backgroundColor="#d8d8d8"
              />
            </View>
          </View>

          <Pressable style={styles.saveBtn} onPress={onSaved}>
            <Text style={styles.saveText}>Save Changes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, noBorder }: { label: string; value: string; noBorder?: boolean }) {
  return (
    <View style={[styles.row, noBorder && styles.noBorder]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
        <ChevronRight size={16} color="#b4b4b4" strokeWidth={2.4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f7f4',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  brandSub: {
    fontSize: 10,
    lineHeight: 12,
    color: '#8d8d8d',
    letterSpacing: 1.7,
    fontWeight: '600',
  },
  backBtn: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  backBtnText: {
    fontSize: 13,
    color: '#545454',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  title: {
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 42,
    color: '#1f1f1f',
    fontWeight: '700',
  },
  avatarWrap: {
    marginTop: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 126,
    height: 126,
    borderRadius: 63,
  },
  editAvatarBtn: {
    marginTop: -18,
    marginLeft: 92,
    backgroundColor: '#e9e0d5',
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editAvatarText: {
    fontSize: 13,
    color: '#7c7468',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 18,
    lineHeight: 24,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 14,
    backgroundColor: '#fbfbfa',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
  },
  row: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toggleRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '500',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '72%',
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    color: '#2d2d2d',
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  saveBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 17,
    lineHeight: 22,
    color: '#fff',
    fontWeight: '600',
  },
});
