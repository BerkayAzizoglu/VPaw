import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Plus } from 'lucide-react-native';
import type { PetProfile } from '../lib/petProfileTypes';
import type { WeightPoint } from '../lib/healthMvpModel';

type PetsScreenProps = {
  pets: PetProfile[];
  activePetId?: string;
  weightsByPet?: Record<string, WeightPoint[]>;
  locale?: 'en' | 'tr';
  canAddPet: boolean;
  isPremiumPlan?: boolean;
  onBack: () => void;
  onOpenPet: (petId: string) => void;
  onAddPet: () => void;
};

export default function PetsScreen({
  pets,
  activePetId,
  weightsByPet,
  locale = 'en',
  canAddPet,
  isPremiumPlan = false,
  onBack,
  onOpenPet,
  onAddPet,
}: PetsScreenProps) {
  const isTr = locale === 'tr';
  const sortedPets = [...pets].sort((a, b) => (a.id === activePetId ? -1 : b.id === activePetId ? 1 : a.name.localeCompare(b.name)));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <ChevronLeft size={20} color="#4e5f59" strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.title}>{isTr ? 'Petler' : 'Pets'}</Text>
          <View style={styles.iconGhost} />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{isTr ? 'Tum petlerin tek yerde' : 'All your pets in one place'}</Text>
          <Text style={styles.heroSub}>
            {isTr
              ? 'Aktif pet en ustte gorunur. Buradan profile gecip detaylari yonetebilirsin.'
              : 'Your active pet stays on top. Open any card to manage details from there.'}
          </Text>
        </View>

        <Pressable
          style={[styles.addBtn, !canAddPet && styles.addBtnDisabled]}
          onPress={onAddPet}
          disabled={!canAddPet}
        >
          <Plus size={16} color={canAddPet ? '#2f5750' : '#8d9693'} strokeWidth={2.3} />
          <Text style={[styles.addBtnText, !canAddPet && styles.addBtnTextDisabled]}>
            {isTr ? 'Yeni Pet Ekle' : 'Add New Pet'}
          </Text>
        </Pressable>

        {!canAddPet ? (
          <Text style={styles.limitText}>
            {isPremiumPlan
              ? ''
              : (isTr ? 'Free planda yalnizca 1 pet eklenebilir.' : 'Free plan allows only 1 pet.')}
          </Text>
        ) : null}

        <View style={styles.listWrap}>
          {sortedPets.map((pet) => {
            const weightEntries = weightsByPet?.[pet.id] ?? [];
            const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1]?.value : null;
            const typeLabel = pet.petType === 'Dog' ? (isTr ? 'Kopek' : 'Dog') : pet.petType === 'Cat' ? (isTr ? 'Kedi' : 'Cat') : pet.petType;
            return (
              <Pressable key={pet.id} style={[styles.petRow, pet.id === activePetId && styles.petRowActive]} onPress={() => onOpenPet(pet.id)}>
                <View style={styles.petMain}>
                  <View style={styles.nameRow}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    {pet.id === activePetId ? <Text style={styles.activeBadge}>{isTr ? 'Aktif' : 'Active'}</Text> : null}
                  </View>
                  <Text style={styles.petMeta}>{[typeLabel, pet.breed?.trim()].filter(Boolean).join(' / ') || (isTr ? 'Profil hazir' : 'Profile ready')}</Text>
                  <Text style={styles.petStats}>
                    {isTr ? 'Son kilo: ' : 'Last weight: '}
                    {latestWeight != null ? `${latestWeight} kg` : (isTr ? 'yok' : 'none')}
                  </Text>
                </View>
                <Text style={styles.openText}>{isTr ? 'Ac' : 'Open'}</Text>
              </Pressable>
            );
          })}

          {sortedPets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{isTr ? 'Henuz pet yok' : 'No pets yet'}</Text>
              <Text style={styles.emptySub}>
                {isTr ? 'Ilk petini ekledikten sonra burada sirali olarak goreceksin.' : 'Your pets will appear here in a clean list after the first one is added.'}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f1ea' },
  content: { paddingHorizontal: 24, paddingTop: 66, paddingBottom: 32, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)' },
  iconGhost: { width: 38, height: 38 },
  title: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#29433c', letterSpacing: -0.4 },
  heroCard: { borderRadius: 26, padding: 20, backgroundColor: 'rgba(255,255,255,0.56)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.84)' },
  heroTitle: { fontSize: 22, lineHeight: 25, fontWeight: '800', color: '#254038', letterSpacing: -0.35 },
  heroSub: { marginTop: 8, fontSize: 13, lineHeight: 20, color: 'rgba(37,64,56,0.72)', fontWeight: '500' },
  addBtn: { height: 50, borderRadius: 18, backgroundColor: 'rgba(226, 240, 236, 0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnDisabled: { backgroundColor: 'rgba(237,237,237,0.7)' },
  addBtnText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#2f5750' },
  addBtnTextDisabled: { color: '#8d9693' },
  limitText: { marginTop: -4, fontSize: 12, lineHeight: 18, color: '#9a6c52', fontWeight: '600' },
  listWrap: { gap: 10 },
  petRow: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  petRowActive: { backgroundColor: 'rgba(229, 242, 237, 0.85)' },
  petMain: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  petName: { fontSize: 20, lineHeight: 22, fontWeight: '800', color: '#223932' },
  activeBadge: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: '#3a6a5f', backgroundColor: 'rgba(58,106,95,0.1)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  petMeta: { marginTop: 6, fontSize: 13, lineHeight: 18, color: 'rgba(34,57,50,0.66)', fontWeight: '600' },
  petStats: { marginTop: 8, fontSize: 13, lineHeight: 18, color: '#35544c', fontWeight: '600' },
  openText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#53736b' },
  emptyCard: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 20, backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)' },
  emptyTitle: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: '#27413a' },
  emptySub: { marginTop: 8, fontSize: 13, lineHeight: 19, color: 'rgba(39,65,58,0.68)', fontWeight: '500' },
});
