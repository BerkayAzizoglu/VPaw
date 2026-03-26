import type { PetProfile } from './petProfileTypes';
import { supabase } from './supabase';

export type CloudPetProfiles = {
  profiles: Record<string, PetProfile>;
  updatedAt: Record<string, string>;
};

type PetProfileRow = {
  user_id: string;
  pet_id: string;
  payload: PetProfile;
  updated_at: string;
};

export async function fetchPetProfilesFromCloud(): Promise<CloudPetProfiles | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data, error } = await supabase
    .from('pet_profiles')
    .select('pet_id, payload, updated_at')
    .eq('user_id', user.id);

  if (error || !data) return null;

  const profiles: Record<string, PetProfile> = {};
  const updatedAt: Record<string, string> = {};

  for (const row of data as PetProfileRow[]) {
    if (typeof row.pet_id === 'string' && row.pet_id.length > 0) {
      profiles[row.pet_id] = row.payload;
      updatedAt[row.pet_id] = row.updated_at;
    }
  }

  return { profiles, updatedAt };
}

export async function savePetProfilesToCloud(
  profiles: Record<string, PetProfile>,
  localUpdatedAt: Record<string, string>,
  petIdsToUpload: string[],
): Promise<boolean> {
  if (petIdsToUpload.length === 0) return true;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const rows: PetProfileRow[] = petIdsToUpload
    .filter((petId) => profiles[petId] != null)
    .map((petId) => ({
      user_id: user.id,
      pet_id: petId,
      payload: profiles[petId],
      updated_at: localUpdatedAt[petId] ?? new Date().toISOString(),
    }));

  if (rows.length === 0) return true;

  const { error } = await supabase
    .from('pet_profiles')
    .upsert(rows, { onConflict: 'user_id,pet_id' });

  return !error;
}

export async function deletePetProfilesFromCloud(petIds: string[]): Promise<boolean> {
  if (petIds.length === 0) return true;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return false;

  const { error } = await supabase
    .from('pet_profiles')
    .delete()
    .eq('user_id', user.id)
    .in('pet_id', petIds);

  return !error;
}
