import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/authService';

describe('Authentication & Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('signs in an existing user with valid credentials', async () => {
    const user = await authService.signIn('admin@devcatalyst.club', 'password123');
    expect(user).toBeDefined();
    expect(user.email).toBe('admin@devcatalyst.club');
    expect(user.roles).toContain('ADMIN');
    expect(user.roles).toContain('ORGANIZER');
  });

  it('rejects sign in with incorrect password', async () => {
    await expect(
      authService.signIn('admin@devcatalyst.club', 'wrongpassword')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects sign in for non-existent account', async () => {
    await expect(
      authService.signIn('nobody@devcatalyst.club', 'password123')
    ).rejects.toThrow('Invalid email or password');
  });

  it('registers a new user with strictly MEMBER role (no self-promotion)', async () => {
    const email = `new.dev.${Date.now()}@example.com`;
    const user = await authService.signUp(email, 'securepass123', 'Taylor Doe');

    expect(user).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.name).toBe('Taylor Doe');
    // Security check: Must not possess ADMIN or ORGANIZER
    expect(user.roles).not.toContain('ADMIN');
    expect(user.roles).not.toContain('ORGANIZER');
    expect(user.roles).toContain('MEMBER');
  });

  it('prevents duplicate registration with the same email', async () => {
    const email = 'duplicate.test@example.com';
    await authService.signUp(email, 'password123', 'First User');

    await expect(
      authService.signUp(email, 'password123', 'Second User')
    ).rejects.toThrow('An account with this email address already exists');
  });

  it('restores authenticated session from local cache on page reload', async () => {
    const signedInUser = await authService.signIn('sarah.lead@devcatalyst.club', 'password123');
    expect(signedInUser.roles).toContain('PROJECT_LEAD');

    // Simulate page reload
    const restoredUser = await authService.getCurrentSession();
    expect(restoredUser).not.toBeNull();
    expect(restoredUser?.email).toBe('sarah.lead@devcatalyst.club');
    expect(restoredUser?.activeRole).toBe('PROJECT_LEAD');
  });

  it('clears session on signOut', async () => {
    await authService.signIn('marcus.member@devcatalyst.club', 'password123');
    await authService.signOut();

    const currentSession = await authService.getCurrentSession();
    expect(currentSession).toBeNull();
  });
});
