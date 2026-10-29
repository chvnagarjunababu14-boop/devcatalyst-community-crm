import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/#about' },
    { label: 'Events', path: '/#events' },
    { label: 'Members', path: '/#members' },
    { label: 'Projects', path: '/#projects' },
  ];

  const handleAnchorClick = (path: string) => {
    setMobileMenuOpen(false);
    if (path.includes('#')) {
      const hash = path.substring(path.indexOf('#'));
      if (location.pathname === '/') {
        const elem = document.querySelector(hash);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#090909]/90 backdrop-blur-md border-b border-[#262626] transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg p-1"
          >
            <BrandLogo size="sm" className="group-hover:scale-105" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-slate-200 transition-colors">
                  DevCatalyst
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 bg-[#171717] border border-[#262626] rounded text-[#FAFAFA]">
                  Club
                </span>
              </div>
              <span className="text-[11px] text-[#737373] hidden sm:inline -mt-0.5">
                Build. Innovate. Belong.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.path}
                onClick={(e) => {
                  if (link.path.includes('#') && location.pathname === '/') {
                    e.preventDefault();
                    handleAnchorClick(link.path);
                  }
                }}
                className="px-3.5 py-2 text-sm font-medium text-[#A3A3A3] hover:text-white hover:bg-[#171717] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Actions: Join CTA & Sign In / Hub Access */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#171717] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold tracking-wide transition-all shadow-xs hover:border-[#404040] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <LayoutDashboard className="w-4 h-4 text-white" />
                <span>Go to Hub</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-[#171717] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <LogIn className="w-4 h-4 text-[#737373]" />
                <span>Sign In</span>
              </Link>
            )}

            <Link
              to="/apply"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-[#E5E5E5] text-[#090909] text-xs font-bold tracking-wide shadow-xs transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#090909]" />
              <span>Join the Club</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/apply"
              className="px-3 py-1.5 rounded-lg bg-white text-[#090909] text-xs font-bold shadow"
            >
              Join
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#A3A3A3] hover:text-white hover:bg-[#171717] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#262626] bg-[#090909] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.path}
                onClick={(e) => {
                  if (link.path.includes('#') && location.pathname === '/') {
                    e.preventDefault();
                    handleAnchorClick(link.path);
                  } else {
                    setMobileMenuOpen(false);
                  }
                }}
                className="px-3 py-2.5 text-sm font-medium text-[#A3A3A3] hover:text-white hover:bg-[#171717] rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-[#262626] flex flex-col gap-2">
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#171717] text-white text-xs font-semibold border border-[#262626]"
              >
                <LayoutDashboard className="w-4 h-4 text-white" />
                <span>Go to Hub Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#171717] text-slate-200 text-xs font-semibold hover:bg-[#262626]"
              >
                <LogIn className="w-4 h-4 text-[#737373]" />
                <span>Member Sign In</span>
              </Link>
            )}

            <Link
              to="/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-white text-[#090909] text-xs font-bold shadow"
            >
              <Sparkles className="w-4 h-4 text-[#090909]" />
              <span>Apply to Join DevCatalyst</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
