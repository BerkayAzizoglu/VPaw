import type { PetProfile } from '../components/AuthGate';
import { supabase } from './supabase';

type PetId = 'luna' | 'milo';

type PetProfileRow = {
  user_id: string;
  pet_id: PetId;
  payload: PetProfile;
  updated_at: string;
};

export async function fetchPetProfilesFromCloud(userId: string): Promise<Partial<Record<PetId, PetProfile>> | null> {
  const { data, error } = await supabase
    .from('pet_profiles')
    .select('pet_id, payload')
    .eq('user_id', userId);

  if (error || !data) return null;

  const next: Partial<Record<PetId, PetProfile>> = {};

  for (const row of data as Array<{ pet_id: PetId; payload: PetProfile }>) {
    if (row.pet_id === 'luna' || row.pet_id === 'milo') {
      next[row.pet_id] = row.payload;
    }
  }

  return next;
}

export async function savePetProfilesToCloud(userId: string, profiles: Record<PetId, PetProfile>): Promise<boolean> {
  const now = new Date().toISOString();
  const rows: PetProfileRow[] = (Object.keys(profiles) as PetId[]).map((petId) => ({
    user_id: userId,
    pet_id: petId,
    payload: profiles[petId],
    updated_at: now,
  }));

  const { error } = await supabase
    .from('pet_profiles')
    .upsert(rows, { onConflict: 'user_id,pet_id' });

  return !error;
}
