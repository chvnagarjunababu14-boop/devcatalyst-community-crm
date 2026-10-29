import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthState, AuthUser, Role } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setActiveRole: (role: Role) => void;
  hasRole: (role: Role | Role[]) => boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isProjectLead: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const sessionUser = await authService.getCurrentSession();
        if (isMounted) {
          setUser(sessionUser);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authUser = await authService.signIn(email, password);
      setUser(authUser);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const authUser = await authService.signUp(email, password, name);
      setUser(authUser);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const sessionUser = await authService.getCurrentSession();
      setUser(sessionUser);
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  const setActiveRole = (role: Role) => {
    if (user && user.roles.includes(role)) {
      const updatedUser = { ...user, activeRole: role };
      setUser(updatedUser);
      localStorage.setItem('devcatalyst_hub_session', JSON.stringify(updatedUser));
    }
  };

  const hasRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const required = Array.isArray(roles) ? roles : [roles];
    // ADMIN has authority across all sub-roles
    if (user.roles.includes('ADMIN')) return true;
    return required.some((r) => user.roles.includes(r));
  };

  const isAdmin = user ? user.roles.includes('ADMIN') : false;
  const isOrganizer = user ? user.roles.includes('ADMIN') || user.roles.includes('ORGANIZER') : false;
  const isProjectLead = user ? user.roles.includes('ADMIN') || user.roles.includes('PROJECT_LEAD') : false;
  const isMember = user ? !user.roles.includes('PARTICIPANT') || user.roles.length > 1 : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        error,
        signIn,
        signUp,
        signOut,
        refreshUser,
        setActiveRole,
        hasRole,
        isAdmin,
        isOrganizer,
        isProjectLead,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
