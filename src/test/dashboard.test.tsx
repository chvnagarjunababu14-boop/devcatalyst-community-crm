import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { analyticsService } from '../services/analyticsService';

describe('Phase 8B: Dashboard Module Functional Verification (/dashboard)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders DashboardPage with welcome banner, user role, and platform module cards', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/DevCatalyst Hub • Production-Ready Platform/)).toBeInTheDocument();
    });

    // Module cards check
    expect(screen.getByText('Projects & Workload')).toBeInTheDocument();
    expect(screen.getByText('Task Kanban Board')).toBeInTheDocument();
    expect(screen.getByText('Events & Registration')).toBeInTheDocument();
    expect(screen.getByText('Member Directory')).toBeInTheDocument();
    expect(screen.getByText('Recruitment Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
    expect(screen.getByText('Administration & RBAC')).toBeInTheDocument();
  });

  it('clearly distinguishes mock/demo metrics from live metrics via status badge', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Executive KPI Overview')).toBeInTheDocument();
    });

    // In local dev without InsForge remote URL, it must display the local mock engine badge
    expect(
      screen.getByText('Local Mock Engine (Verification Data)')
    ).toBeInTheDocument();
  });

  it('displays live KPI counters sourced from analyticsService', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Initiatives')).toBeInTheDocument();
    });

    expect(screen.getByText('Tasks Done')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('In Pipeline')).toBeInTheDocument();
  });

  it('provides a working Refresh Metrics button that re-queries summary data', async () => {
    const summarySpy = vi.spyOn(analyticsService, 'getClubAnalyticsSummary');

    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh Metrics')).toBeInTheDocument();
    });

    const initialCalls = summarySpy.mock.calls.length;

    // Trigger manual refresh
    fireEvent.click(screen.getByText('Refresh Metrics'));

    await waitFor(() => {
      expect(summarySpy.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    summarySpy.mockRestore();
  });

  it('displays retry banner when KPI summary fetch fails', async () => {
    vi.spyOn(analyticsService, 'getClubAnalyticsSummary').mockRejectedValueOnce(
      new Error('Simulated network failure on staging API')
    );

    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Simulated network failure on staging API')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });

  it('renders Recent Club Activity feed with operational items and dynamic schema status', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Club Activity')).toBeInTheDocument();
    });

    // Verify dynamic schema migrations reflects offline mode
    expect(screen.getByText('Migrations 001–008 Unverified (Offline)')).toBeInTheDocument();

    // Verify recent activity list or link is rendered
    expect(screen.getByText('View Full Analytics')).toBeInTheDocument();
  });
});
