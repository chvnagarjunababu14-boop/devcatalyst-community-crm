import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { UserProfile } from '../types/auth';

const LOCAL_STORAGE_USERS_KEY = 'devcatalyst_hub_users';
const LOCAL_STORAGE_SESSION_KEY = 'devcatalyst_hub_session';

export interface UpdateProfileInput {
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  github_handle?: string | null;
  phone?: string | null;
}

export const profileService = {
  /**
   * Get user profile by User ID
   */
  async getProfile(userId: string): Promise<UserProfile> {
    if (isInsForgeConfigured) {
      const { data, error } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as UserProfile;
      }
    }

    // Local fallback
    try {
      const rawUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const match = users.find((u: { id: string }) => u.id === userId);
        if (match && match.profile) {
          return match.profile;
        }
      }
    } catch {
      // ignore
    }

    throw new Error('Profile not found');
  },

  /**
   * Update Profile (guaranteed self-update)
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    if (!input.full_name || input.full_name.trim().length === 0) {
      throw new Error('Full name cannot be empty');
    }

    const updatedData: Partial<UserProfile> = {
      full_name: input.full_name.trim(),
      avatar_url: input.avatar_url?.trim() || null,
      bio: input.bio?.trim() || null,
      github_handle: input.github_handle?.trim().replace(/^@/, '') || null,
      phone: input.phone?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.database
          .from('profiles')
          .update(updatedData)
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          this.updateLocalSessionProfile(data as UserProfile);
          return data as UserProfile;
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('InsForge remote profile update failed, syncing locally:', error.message);
      }
    }

    // Local storage persistence
    try {
      const rawUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      const userIndex = users.findIndex((u: { id: string }) => u.id === userId);

      let finalProfile: UserProfile;

      if (userIndex >= 0) {
        finalProfile = {
          ...users[userIndex].profile,
          ...updatedData,
        };
        users[userIndex].profile = finalProfile;
        users[userIndex].name = finalProfile.full_name;
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
      } else {
        finalProfile = {
          id: userId,
          email: '',
          full_name: input.full_name,
          ...updatedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      this.updateLocalSessionProfile(finalProfile);
      return finalProfile;
    } catch {
      throw new Error('Failed to persist profile update');
    }
  },

  updateLocalSessionProfile(profile: UserProfile) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        if (session.id === profile.id) {
          session.name = profile.full_name;
          session.profile = profile;
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
        }
      }
    } catch {
      // ignore
    }
  },
};
