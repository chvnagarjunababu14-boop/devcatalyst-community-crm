export type Role = 'ADMIN' | 'ORGANIZER' | 'PROJECT_LEAD' | 'MEMBER' | 'PARTICIPANT';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  github_handle?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  profile?: UserProfile | null;
  roles: Role[];
  activeRole: Role;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
