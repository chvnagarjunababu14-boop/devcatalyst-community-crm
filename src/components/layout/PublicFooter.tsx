import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowUp } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export const PublicFooter: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#090909] text-[#FAFAFA] border-t border-[#262626] pt-16 pb-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#262626]">
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo size="sm" />
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">DevCatalyst</span>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 bg-[#171717] border border-[#262626] rounded text-[#FAFAFA]">
                  Club
                </span>
              </div>
            </div>
            <p className="text-sm text-[#A3A3A3] leading-relaxed max-w-sm">
              An ambitious student-led technology collective. We collaborate on open-source initiatives, build real-world software, host developer workshops, and mentor future software engineers.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DevCatalyst Hub Platform Active</span>
            </div>
          </div>

          {/* Quick Discovery Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Discovery
            </h4>
            <ul className="space-y-2 text-sm text-[#A3A3A3]">
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  About the Club
                </a>
              </li>
              <li>
                <a href="#events" className="hover:text-white transition-colors">
                  Upcoming Events
                </a>
              </li>
              <li>
                <a href="#members" className="hover:text-white transition-colors">
                  Community Members
                </a>
              </li>
              <li>
                <a href="#projects" className="hover:text-white transition-colors">
                  Club Projects
                </a>
              </li>
              <li>
                <Link to="/events" className="text-white hover:underline transition-colors font-medium">
                  Full Event Directory →
                </Link>
              </li>
            </ul>
          </div>

          {/* Technical Domains */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Club Domains
            </h4>
            <ul className="space-y-2 text-sm text-[#A3A3A3]">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Software Engineering</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                <span>Product & UI/UX Design</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                <span>Technical Product</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                <span>Developer Outreach</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                <span>Club Operations</span>
              </li>
            </ul>
          </div>

          {/* Membership & Hub Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Member Portal
            </h4>
            <ul className="space-y-2 text-sm text-[#A3A3A3]">
              <li>
                <Link to="/apply" className="text-white hover:underline font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Apply for Membership</span>
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Member Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Member Account
                </Link>
              </li>
              <li>
                <Link to="/apply" className="hover:text-white transition-colors text-xs text-[#737373]">
                  Track Application Status
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-xs text-[#737373] hover:text-white transition-colors">
                  Staff Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Back to Top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#737373]">
          <p>© {new Date().getFullYear()} DevCatalyst Club. Built with React, TypeScript & InsForge.</p>
          <div className="flex items-center gap-6">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-[#A3A3A3] hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-2 py-1"
              aria-label="Back to top of page"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
