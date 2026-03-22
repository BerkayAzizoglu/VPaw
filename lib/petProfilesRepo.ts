import type { PetProfile } from '../components/AuthGate';
import { supabase } from './supabase';

type PetId = 'luna' | 'milo';

export type CloudPetProfiles = {
  profiles: Partial<Record<PetId, PetProfile>>;
  updatedAt: Partial<Record<PetId, string>>;
};

type PetProfileRow = {
  user_id: string;
  pet_id: PetId;
  payload: PetProfile;
  updated_at: string;
};

export async function fetchPetProfilesFromCloud(userId: string): Promise<CloudPetProfiles | null> {
  const { data, error } = await supabase
    .from('pet_profiles')
    .select('pet_id, payload, updated_at')
    .eq('user_id', userId);

  if (error || !data) return null;

  const profiles: Partial<Record<PetId, PetProfile>> = {};
  const updatedAt: Partial<Record<PetId, string>> = {};

  for (const row of data as Array<{ pet_id: PetId; payload: PetProfile; updated_at: string }>) {
    if (row.pet_id === 'luna' || row.pet_id === 'milo') {
      profiles[row.pet_id] = row.payload;
      updatedAt[row.pet_id] = row.updated_at;
    }
  }

  return { profiles, updatedAt };
}

export async function savePetProfilesToCloud(
  userId: string,
  profiles: Record<PetId, PetProfile>,
  localUpdatedAt: Partial<Record<PetId, string>>,
  petIdsToUpload: PetId[],
): Promise<boolean> {
  if (petIdsToUpload.length === 0) return true;

  const rows: PetProfileRow[] = petIdsToUpload.map((petId) => ({
    user_id: userId,
    pet_id: petId,
    payload: profiles[petId],
    updated_at: localUpdatedAt[petId] ?? new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('pet_profiles')
    .upsert(rows, { onConflict: 'user_id,pet_id' });

  return !error;
}
