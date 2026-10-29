import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../common/Badge';
import { isInsForgeConfigured } from '../../lib/insforge';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Compute breadcrumb path segments
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="h-16 bg-white border-b border-[#E5E5E5] px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-[#737373]" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-[#171717] font-medium transition-colors">
            Hub
          </Link>
          {segments.map((seg, idx) => {
            const path = `/${segments.slice(0, idx + 1).join('/')}`;
            const isLast = idx === segments.length - 1;
            const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');

            return (
              <React.Fragment key={path}>
                <ChevronRight className="w-3.5 h-3.5 text-[#A3A3A3]" />
                {isLast ? (
                  <span className="font-semibold text-[#171717]" aria-current="page">
                    {formatted}
                  </span>
                ) : (
                  <Link to={path} className="hover:text-[#171717] transition-colors">
                    {formatted}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right Controls: Backend State & Profile Pill */}
      <div className="flex items-center gap-3">
        {/* Backend mode indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-[#E5E5E5] bg-[#FAFAFA] text-[#737373]">
          <span className={`w-2 h-2 rounded-full ${isInsForgeConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isInsForgeConfigured ? 'InsForge BaaS Active' : 'Local Verification Mode'}</span>
        </div>

        {user ? (
          <Link
            to="/profile"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#E5E5E5] hover:border-[#D4D4D4] bg-white hover:bg-[#F5F5F5] transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
              {user.name ? user.name[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden md:inline text-xs font-medium text-[#171717] group-hover:text-black transition-colors">
              {user.name || user.email}
            </span>
            <Badge role={user.activeRole} size="sm" />
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-lg bg-[#090909] hover:bg-[#262626] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
