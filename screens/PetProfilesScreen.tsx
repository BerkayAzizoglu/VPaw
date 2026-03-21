import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Mars, Venus } from 'lucide-react-native';
import type { PetProfile } from '../components/AuthGate';
import type { Locale } from '../hooks/useLocale';

type PetProfilesScreenProps = {
  locale: Locale;
  activePetId: 'luna' | 'milo';
  petProfiles: Record<'luna' | 'milo', PetProfile>;
  onBack: () => void;
  onSelectPet: (petId: 'luna' | 'milo') => void;
  onOpenPetDetail: (petId: 'luna' | 'milo') => void;
  onOpenPetEdit: (petId: 'luna' | 'milo') => void;
};

function formatAgeFromBirthDate(birthDate: string, locale: Locale) {
  const now = new Date();
  const [rawY, rawM, rawD] = birthDate.split('-').map((v) => Number(v));
  const y = Number.isFinite(rawY) ? rawY : now.getFullYear();
  const m = Number.isFinite(rawM) ? rawM : 1;
  const d = Number.isFinite(rawD) ? rawD : 1;

  let years = now.getFullYear() - y;
  let months = now.getMonth() + 1 - m;

  if (now.getDate() < d) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);

  return locale === 'tr' ? `${years} yıl ${months} ay` : `${years} years ${months} months`;
}

export default function PetProfilesScreen({
  locale,
  activePetId,
  petProfiles,
  onBack,
  onSelectPet,
  onOpenPetDetail,
  onOpenPetEdit,
}: PetProfilesScreenProps) {
  const isTr = locale === 'tr';
  const pets = (Object.keys(petProfiles) as Array<'luna' | 'milo'>).map((id) => petProfiles[id]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <ChevronLeft size={20} color="#5b5b5b" strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.title}>{isTr ? 'Hayvan Profilleri' : 'Pet Profiles'}</Text>
          <View style={styles.iconGhost} />
        </View>

        <Text style={styles.subtitle}>{isTr ? 'Tüm dostlarını tek ekranda yönet.' : 'Manage all companions in one place.'}</Text>

        <View style={styles.cardsWrap}>
          {pets.map((pet) => {
            const active = pet.id === activePetId;
            const ageText = formatAgeFromBirthDate(pet.birthDate, locale);

            return (
              <Pressable key={pet.id} style={[styles.card, active && styles.cardActive]} onPress={() => onSelectPet(pet.id)}>
                <Image source={{ uri: pet.image }} style={styles.petImage} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHead}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <View style={styles.genderPill}>
                      {pet.gender === 'male' ? (
                        <Mars size={13} color="#6a6a6a" strokeWidth={2.2} />
                      ) : (
                        <Venus size={13} color="#6a6a6a" strokeWidth={2.2} />
                      )}
                      <Text style={styles.genderText}>{pet.gender === 'male' ? (isTr ? 'Erkek' : 'Male') : (isTr ? 'Dişi' : 'Female')}</Text>
                    </View>
                  </View>

                  <Text style={styles.petMeta}>{pet.breed}</Text>
                  <Text style={styles.petMeta}>{ageText}</Text>

                  <View style={styles.cardActions}>
                    <Pressable style={styles.actionBtn} onPress={() => onOpenPetDetail(pet.id)}>
                      <Text style={styles.actionText}>{isTr ? 'Detay' : 'Details'}</Text>
                      <ChevronRight size={14} color="#8d8d8d" strokeWidth={2.4} />
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => onOpenPetEdit(pet.id)}>
                      <Text style={styles.actionText}>{isTr ? 'Düzenle' : 'Edit'}</Text>
                      <ChevronRight size={14} color="#8d8d8d" strokeWidth={2.4} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf9f8' },
  content: {
    paddingHorizontal: 22,
    paddingTop: 58,
    paddingBottom: 30,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconGhost: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 2,
    marginLeft: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#767676',
    fontWeight: '500',
  },
  cardsWrap: {
    marginTop: 8,
    gap: 12,
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  cardActive: {
    borderColor: 'rgba(110,143,102,0.55)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  petImage: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#ececec',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  petName: {
    fontSize: 22,
    lineHeight: 26,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  genderPill: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f3',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genderText: {
    fontSize: 12,
    lineHeight: 15,
    color: '#666',
    fontWeight: '600',
  },
  petMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: '#757575',
    fontWeight: '500',
  },
  cardActions: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#545454',
    fontWeight: '600',
  },
});
