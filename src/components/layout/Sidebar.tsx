import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  Calendar,
  Ticket,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  User,
  LogOut,
  X,
  Sparkles,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../common/Badge';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, signOut, setActiveRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Public Website', path: '/', icon: Globe },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderGit2 },
    { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Events', path: '/events', icon: Calendar },
    { label: 'Registrations', path: '/registrations', icon: Ticket },
    { label: 'Members', path: '/members', icon: Users },
    { label: 'Recruitment', path: '/recruitment', icon: UserPlus },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#090909] text-[#FAFAFA] select-none border-r border-[#262626]">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#262626]">
        <NavLink to="/dashboard" className="flex items-center gap-3 group focus:outline-none" onClick={onClose}>
          <BrandLogo size="sm" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              DevCatalyst
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-[#171717] border border-[#262626] rounded text-[#FAFAFA]">Hub</span>
            </span>
            <span className="text-[11px] text-[#737373]">Club Management & CRM</span>
          </div>
        </NavLink>
        {isOpen && (
          <button
            onClick={onClose}
            className="md:hidden text-[#737373] hover:text-white p-1 rounded-md"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                  isActive
                    ? 'bg-[#171717] text-white font-semibold shadow-xs'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#171717]/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#737373]'}`} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Status / Bottom Footer */}
      {user ? (
        <div className="p-3 border-t border-[#262626] bg-[#090909]">
          <div className="p-2.5 rounded-lg bg-[#171717] border border-[#262626] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#262626] border border-[#404040] flex items-center justify-center font-medium text-xs text-white shrink-0">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user.name || user.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge role={user.activeRole} size="sm" />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-[#737373] hover:text-[#DC2626] hover:bg-white/5 rounded-md transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Multi-role switcher if user has more than 1 role */}
            {user.roles.length > 1 && (
              <div className="pt-2 border-t border-[#262626] flex items-center gap-1.5 text-[11px] text-[#737373]">
                <Sparkles className="w-3 h-3 text-[#A3A3A3]" />
                <span className="shrink-0">Role:</span>
                <select
                  value={user.activeRole}
                  onChange={(e) => setActiveRole(e.target.value as any)}
                  className="bg-[#090909] text-white text-[11px] rounded px-1.5 py-0.5 border border-[#262626] outline-none cursor-pointer"
                  aria-label="Switch active role"
                >
                  {user.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-[#262626] bg-[#090909]">
          <NavLink
            to="/login"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-white hover:bg-[#E5E5E5] text-[#090909] text-xs font-semibold shadow transition-colors"
          >
            <span>Sign In to Hub</span>
          </NavLink>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Fixed 260px) */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-[280px] w-full h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
