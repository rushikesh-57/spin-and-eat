import { supabase } from '../lib/supabaseClient';
import type { UserProfilePreferences, UserProfileSetupStatus } from '../types';
import {
  DEFAULT_USER_PROFILE,
  loadUserProfile as loadLocalUserProfile,
  loadUserProfileStatus as loadLocalUserProfileStatus,
  saveUserProfile as saveLocalUserProfile,
  saveUserProfileStatus as saveLocalUserProfileStatus,
} from './storage';

type UserProfileRow = {
  user_id: string;
  preferred_name: string | null;
  city: string | null;
  diet_preference: UserProfilePreferences['dietPreference'] | null;
  spice_preference: UserProfilePreferences['spicePreference'] | null;
  family_members: number | null;
  whatsapp_number: string | null;
  setup_status: UserProfileSetupStatus | null;
};

const mapRowToProfile = (row: UserProfileRow): UserProfilePreferences => ({
  preferredName: row.preferred_name ?? DEFAULT_USER_PROFILE.preferredName,
  city: row.city ?? DEFAULT_USER_PROFILE.city,
  dietPreference: row.diet_preference ?? DEFAULT_USER_PROFILE.dietPreference,
  spicePreference: row.spice_preference ?? DEFAULT_USER_PROFILE.spicePreference,
  familyMembers:
    typeof row.family_members === 'number' && Number.isFinite(row.family_members)
      ? Math.max(1, Math.round(row.family_members))
      : DEFAULT_USER_PROFILE.familyMembers,
  whatsappNumber: row.whatsapp_number ?? DEFAULT_USER_PROFILE.whatsappNumber,
});

export async function loadUserProfileFromSupabase(userId: string): Promise<{
  profile: UserProfilePreferences;
  profileStatus: UserProfileSetupStatus | null;
}> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      'user_id, preferred_name, city, diet_preference, spice_preference, family_members, whatsapp_number, setup_status'
    )
    .eq('user_id', userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const localProfile = loadLocalUserProfile(userId);
    const localStatus = loadLocalUserProfileStatus(userId);

    if (localStatus) {
      await saveUserProfileToSupabase(userId, localProfile, localStatus);
      return {
        profile: localProfile,
        profileStatus: localStatus,
      };
    }

    return {
      profile: DEFAULT_USER_PROFILE,
      profileStatus: null,
    };
  }

  const profile = mapRowToProfile(data);
  const profileStatus = data.setup_status ?? null;
  saveLocalUserProfile(userId, profile);
  if (profileStatus) {
    saveLocalUserProfileStatus(userId, profileStatus);
  }

  return {
    profile,
    profileStatus,
  };
}

export async function saveUserProfileToSupabase(
  userId: string,
  profile: UserProfilePreferences,
  profileStatus: UserProfileSetupStatus
): Promise<void> {
  const payload = {
    user_id: userId,
    preferred_name: profile.preferredName.trim(),
    city: profile.city.trim(),
    diet_preference: profile.dietPreference,
    spice_preference: profile.spicePreference,
    family_members: Math.max(1, Math.round(profile.familyMembers || 1)),
    whatsapp_number: profile.whatsappNumber.trim(),
    setup_status: profileStatus,
  };

  const { error } = await supabase.from('user_profiles').upsert(payload, {
    onConflict: 'user_id',
  });

  if (error) {
    throw new Error(error.message);
  }

  saveLocalUserProfile(userId, profile);
  saveLocalUserProfileStatus(userId, profileStatus);
}

export async function saveUserProfileStatusToSupabase(
  userId: string,
  profileStatus: UserProfileSetupStatus
): Promise<void> {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      setup_status: profileStatus,
    },
    {
      onConflict: 'user_id',
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  saveLocalUserProfileStatus(userId, profileStatus);
}
