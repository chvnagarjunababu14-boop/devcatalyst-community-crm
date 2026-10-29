import { insforge, isInsForgeConfigured } from '../lib/insforge';
import type { AuthUser, Role, UserProfile } from '../types/auth';

const LOCAL_STORAGE_SESSION_KEY = 'devcatalyst_hub_session';
const LOCAL_STORAGE_USERS_KEY = 'devcatalyst_hub_users';

interface LocalUserRecord {
  id: string;
  email: string;
  password?: string;
  name: string;
  roles: Role[];
  profile: UserProfile;
}

// Default initial demo users for development and verification when live backend is offline
export const INITIAL_DEMO_USERS: LocalUserRecord[] = [
  {
    id: 'admin-usr-001',
    email: 'admin@devcatalyst.club',
    password: 'password123',
    name: 'Alex Rivera',
    roles: ['ADMIN', 'ORGANIZER'],
    profile: {
      id: 'admin-usr-001',
      email: 'admin@devcatalyst.club',
      full_name: 'Alex Rivera',
      avatar_url: null,
      bio: 'DevCatalyst Lead Architect & Club Administrator.',
      github_handle: 'alex-rivera-dev',
      phone: '+1 (555) 019-2834',
      created_at: new Date('2026-01-15').toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'lead-usr-002',
    email: 'sarah.lead@devcatalyst.club',
    password: 'password123',
    name: 'Sarah Chen',
    roles: ['PROJECT_LEAD', 'MEMBER'],
    profile: {
      id: 'lead-usr-002',
      email: 'sarah.lead@devcatalyst.club',
      full_name: 'Sarah Chen',
      avatar_url: null,
      bio: 'Open-Source Lead & Full-Stack Engineer.',
      github_handle: 'sarahchen-oss',
      phone: '+1 (555) 014-9812',
      created_at: new Date('2026-02-01').toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'member-usr-003',
    email: 'marcus.member@devcatalyst.club',
    password: 'password123',
    name: 'Marcus Vance',
    roles: ['MEMBER'],
    profile: {
      id: 'member-usr-003',
      email: 'marcus.member@devcatalyst.club',
      full_name: 'Marcus Vance',
      avatar_url: null,
      bio: 'Junior Developer & Club Contributor.',
      github_handle: 'marcus-vance',
      phone: null,
      created_at: new Date('2026-03-10').toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
];

export function getStoredUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(INITIAL_DEMO_USERS));
      return INITIAL_DEMO_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_USERS;
  }
}

export function saveStoredUsers(users: LocalUserRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users to localStorage', err);
  }
}

export const authService = {
  /**
   * Sign In with Email and Password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message || 'Authentication failed');
        }

        if (!data || !data.user) {
          throw new Error('No user data returned from authentication service');
        }

        // Fetch user roles and profile from InsForge PostgreSQL database
        const { data: profileData } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const { data: roleRecords } = await insforge.database
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);

        const roles: Role[] = roleRecords && roleRecords.length > 0 
          ? (roleRecords.map((r: { role: Role }) => r.role)) 
          : ['PARTICIPANT'];

        const userName = data.user.profile?.name || profileData?.full_name || email.split('@')[0];
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: userName,
          profile: profileData || {
            id: data.user.id,
            email: data.user.email,
            full_name: userName,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          roles,
          activeRole: roles[0] || 'PARTICIPANT',
        };

        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(authUser));
        return authUser;
      } catch (err: unknown) {
        // If network or endpoint fails in development, fallback to local store if user exists
        const error = err as Error;
        const users = getStoredUsers();
        const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (found && (!found.password || found.password === password)) {
          const authUser: AuthUser = {
            id: found.id,
            email: found.email,
            name: found.name,
            profile: found.profile,
            roles: found.roles,
            activeRole: found.roles[0],
          };
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(authUser));
          return authUser;
        }
        throw new Error(error.message || 'Invalid email or password');
      }
    }

    // Local / development verification flow
    const users = getStoredUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!found || (found.password && found.password !== password)) {
      throw new Error('Invalid email or password');
    }

    const authUser: AuthUser = {
      id: found.id,
      email: found.email,
      name: found.name,
      profile: found.profile,
      roles: found.roles,
      activeRole: found.roles[0],
    };

    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(authUser));
    return authUser;
  },

  /**
   * Register a new account
   * Requirement 5: Users CANNOT assign themselves privileged roles (ADMIN / ORGANIZER)
   */
  async signUp(email: string, password: string, name: string): Promise<AuthUser> {
    if (!email || !password || !name) {
      throw new Error('Name, email, and password are required');
    }

    // All public registrations strictly default to MEMBER or PARTICIPANT
    const defaultRole: Role = 'MEMBER';

    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.auth.signUp({
          email,
          password,
          name,
        });

        if (error) {
          throw new Error(error.message || 'Registration failed');
        }

        const userId = data?.user?.id || `usr-${Date.now()}`;

        // Insert initial profile and role record
        await insforge.database.from('profiles').insert([
          {
            id: userId,
            email,
            full_name: name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        await insforge.database.from('user_roles').insert([
          {
            user_id: userId,
            role: defaultRole,
          },
        ]);

        const authUser: AuthUser = {
          id: userId,
          email,
          name,
          profile: {
            id: userId,
            email,
            full_name: name,
            avatar_url: null,
            bio: null,
            github_handle: null,
            phone: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          roles: [defaultRole],
          activeRole: defaultRole,
        };

        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(authUser));
        return authUser;
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('InsForge cloud sign-up failed or offline, recording locally:', error.message);
      }
    }

    // Local / development verification fallback
    const users = getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email address already exists');
    }

    const newId = `usr-${Date.now()}`;
    const newProfile: UserProfile = {
      id: newId,
      email,
      full_name: name,
      avatar_url: null,
      bio: null,
      github_handle: null,
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newRecord: LocalUserRecord = {
      id: newId,
      email,
      password,
      name,
      roles: [defaultRole],
      profile: newProfile,
    };

    users.push(newRecord);
    saveStoredUsers(users);

    const authUser: AuthUser = {
      id: newId,
      email,
      name,
      profile: newProfile,
      roles: [defaultRole],
      activeRole: defaultRole,
    };

    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(authUser));
    return authUser;
  },

  /**
   * Restore current session on reload
   */
  async getCurrentSession(): Promise<AuthUser | null> {
    // 1. Check local session cache for instant, zero-flicker reload
    let cachedUser: AuthUser | null = null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (raw) {
        cachedUser = JSON.parse(raw);
      }
    } catch {
      cachedUser = null;
    }

    // 2. If InsForge is configured, verify and sync with backend
    if (isInsForgeConfigured) {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (error || !data.user) {
          // If token expired, clear session
          localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
          return null;
        }

        // Token valid: fetch latest profile & roles
        const { data: profileData } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const { data: roleRecords } = await insforge.database
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);

        const roles: Role[] = roleRecords && roleRecords.length > 0 
          ? (roleRecords.map((r: { role: Role }) => r.role)) 
          : ['PARTICIPANT'];

        const verifiedName = data.user.profile?.name || profileData?.full_name || data.user.email.split('@')[0];
        const verifiedUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          name: verifiedName,
          profile: profileData || cachedUser?.profile,
          roles,
          activeRole: cachedUser?.activeRole && roles.includes(cachedUser.activeRole)
            ? cachedUser.activeRole
            : roles[0] || 'PARTICIPANT',
        };

        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(verifiedUser));
        return verifiedUser;
      } catch (err) {
        console.warn('InsForge session verification failed, falling back to cached session:', err);
      }
    }

    return cachedUser;
  },

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    if (isInsForgeConfigured) {
      try {
        await insforge.auth.signOut();
      } catch (err) {
        console.warn('InsForge remote sign-out error:', err);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  },

  /**
   * Send Password Reset Email
   */
  async sendPasswordReset(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email is required');
    }

    if (isInsForgeConfigured) {
      try {
        await insforge.auth.sendResetPasswordEmail({
          email,
          redirectTo: `${window.location.origin}/login`,
        });
        return;
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('InsForge password reset error:', error.message);
      }
    }

    // Always succeed generically to prevent user enumeration
  },

  /**
   * Assign or update user roles (Strictly ADMIN only)
   */
  async assignUserRole(
    userId: string,
    newRole: Role,
    callerRole?: Role
  ): Promise<LocalUserRecord> {
    if (callerRole !== 'ADMIN') {
      throw new Error('Unauthorized: Only administrators can assign or modify user roles');
    }

    if (isInsForgeConfigured) {
      const { error } = await insforge.database
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole });
      if (error) {
        throw new Error(`Database error assigning role: ${error.message}`);
      }
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = users[userIndex];
    if (!user.roles.includes(newRole)) {
      user.roles.push(newRole);
    }

    users[userIndex] = user;
    saveStoredUsers(users);

    // Update active session if target is current session user
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (raw) {
        const session: AuthUser = JSON.parse(raw);
        if (session.id === userId) {
          if (!session.roles.includes(newRole)) {
            session.roles.push(newRole);
            localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
          }
        }
      }
    } catch {
      // Ignore session sync failure
    }

    return user;
  },

  /**
   * Remove a role from a user (Strictly ADMIN only, with lockout prevention)
   */
  async removeUserRole(
    userId: string,
    roleToRemove: Role,
    callerRole?: Role
  ): Promise<LocalUserRecord> {
    if (callerRole !== 'ADMIN') {
      throw new Error('Unauthorized: Only administrators can assign or modify user roles');
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = users[userIndex];
    if (!user.roles.includes(roleToRemove)) {
      return user;
    }

    // Safety Invariant: Prevent locking out all administrators
    if (roleToRemove === 'ADMIN') {
      const remainingAdmins = users.filter((u) => u.id !== userId && u.roles.includes('ADMIN'));
      if (remainingAdmins.length === 0) {
        throw new Error('Lockout Prevention: Cannot remove the administrator role from the only remaining system administrator.');
      }

      if (isInsForgeConfigured) {
        const { data: dbAdminRoles, error: countErr } = await insforge.database
          .from('user_roles')
          .select('user_id')
          .eq('role', 'ADMIN');
        if (!countErr && dbAdminRoles) {
          const remainingDbAdmins = dbAdminRoles.filter((r) => r.user_id !== userId);
          if (remainingDbAdmins.length === 0) {
            throw new Error('Lockout Prevention: Cannot remove the administrator role from the only remaining system administrator.');
          }
        }
      }
    }

    // Invariant: User must have at least one role
    if (user.roles.length <= 1) {
      throw new Error('User must retain at least one role. Assign another role before removing this one.');
    }

    if (isInsForgeConfigured) {
      const { error } = await insforge.database
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', roleToRemove);
      if (error) {
        throw new Error(`Database error removing role: ${error.message}`);
      }
    }

    user.roles = user.roles.filter((r) => r !== roleToRemove);
    users[userIndex] = user;
    saveStoredUsers(users);

    // Update active session if target is current session user
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (raw) {
        const session: AuthUser = JSON.parse(raw);
        if (session.id === userId) {
          session.roles = session.roles.filter((r) => r !== roleToRemove);
          if (session.activeRole === roleToRemove) {
            session.activeRole = session.roles[0] || 'PARTICIPANT';
          }
          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
        }
      }
    } catch {
      // Ignore session sync failure
    }

    return user;
  },
};
