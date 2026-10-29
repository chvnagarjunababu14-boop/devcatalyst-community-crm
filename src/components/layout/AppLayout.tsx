import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { connectionStatus } from '../../lib/insforge';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      {/* Sidebar */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Production Misconfiguration Alert Banner */}
        {connectionStatus === 'PROD_UNCONFIGURED' && (
          <div
            className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b border-amber-600 shadow-sm select-none"
            role="alert"
          >
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
              <span>
                <strong>Production Configuration Required:</strong> InsForge credentials (
                <code className="bg-amber-600/30 px-1 py-0.5 rounded font-mono">VITE_INSFORGE_URL</code> and{' '}
                <code className="bg-amber-600/30 px-1 py-0.5 rounded font-mono">VITE_INSFORGE_ANON_KEY</code>) are not configured.
                The application is running in local unpersisted fallback mode. Cloud persistence is inactive.
              </span>
            </div>
          </div>
        )}

        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <div className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
