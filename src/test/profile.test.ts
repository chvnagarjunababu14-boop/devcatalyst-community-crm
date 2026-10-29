import { describe, it, expect, beforeEach } from 'vitest';
import { profileService } from '../services/profileService';
import { authService } from '../services/authService';

describe('Profile Management Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retrieves an existing user profile', async () => {
    const user = await authService.signIn('admin@devcatalyst.club', 'password123');
    const profile = await profileService.getProfile(user.id);

    expect(profile).toBeDefined();
    expect(profile.id).toBe(user.id);
    expect(profile.full_name).toBe('Alex Rivera');
    expect(profile.bio).toContain('DevCatalyst');
  });

  it('updates profile fields and persists changes', async () => {
    const user = await authService.signIn('admin@devcatalyst.club', 'password123');

    const updated = await profileService.updateProfile(user.id, {
      full_name: 'Alex Rivera Senior',
      bio: 'Updated bio for testing',
      github_handle: '@alexrivera',
      phone: '+1 555 999 8888',
    });

    expect(updated.full_name).toBe('Alex Rivera Senior');
    expect(updated.bio).toBe('Updated bio for testing');
    // Ensure @ prefix is stripped for clean URL composition
    expect(updated.github_handle).toBe('alexrivera');

    // Retrieve again to verify persistence
    const refetched = await profileService.getProfile(user.id);
    expect(refetched.full_name).toBe('Alex Rivera Senior');
  });

  it('rejects profile update with empty full name', async () => {
    const user = await authService.signIn('admin@devcatalyst.club', 'password123');

    await expect(
      profileService.updateProfile(user.id, {
        full_name: '   ',
      })
    ).rejects.toThrow('Full name cannot be empty');
  });
});
