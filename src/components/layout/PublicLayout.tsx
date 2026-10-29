import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-[#171717] selection:text-white ${
        isHomePage ? 'bg-[#090909] text-white' : 'bg-[#FAFAFA] text-[#171717]'
      }`}
    >
      {/* Public Sticky Navigation */}
      <PublicNavbar />

      {/* Main Page Content */}
      <main
        className={
          isHomePage
            ? 'flex-1 w-full flex flex-col'
            : 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12'
        }
      >
        <div className="page-transition flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  );
};
