import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { authService } from '../services/authService';

describe('Phase 7: Administration & System Settings Module (/settings)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders SettingsPage with Role Management tab, System, Migrations, and Audit tabs', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Administration & Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Role Management (RBAC)')).toBeInTheDocument();
    expect(screen.getByText('System & Environment')).toBeInTheDocument();
    expect(screen.getByText(/Migrations & Schema/)).toBeInTheDocument();
    expect(screen.getByText('Operational Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Notifications & Automation')).toBeInTheDocument();
  });

  it('switches to System & Environment tab and displays connection diagnostics', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Administration & Settings')).toBeInTheDocument();
    });

    // Click on System & Environment tab
    fireEvent.click(screen.getByText('System & Environment'));

    expect(screen.getByText('Runtime Environment & Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
    expect(screen.getByText('Active Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Secret Shielding Guarantee')).toBeInTheDocument();
  });

  it('switches to Migrations tab and displays all migrations 001 through 009 with UNVERIFIED label when offline', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Administration & Settings')).toBeInTheDocument();
    });

    // Click on Migrations tab
    fireEvent.click(screen.getByText(/Migrations & Schema/));

    expect(screen.getByText(/PostgreSQL Migrations Specification/)).toBeInTheDocument();
    expect(screen.getByText('001_initial_schema.sql')).toBeInTheDocument();
    expect(screen.getByText('005_events_and_registrations.sql')).toBeInTheDocument();
    expect(screen.getByText('007_security_hardening.sql')).toBeInTheDocument();
    expect(screen.getByText('008_public_projects_and_discovery.sql')).toBeInTheDocument();
    expect(screen.getByText('009_notifications_and_automation.sql')).toBeInTheDocument();

    // Verify unverified offline badge is rendered when disconnected
    const badges = screen.getAllByText('UNVERIFIED (Offline)');
    expect(badges.length).toBe(9);
  });

  it('switches to Operational Audit Trail tab and displays audit events', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Administration & Settings')).toBeInTheDocument();
    });

    // Click on Audit tab
    fireEvent.click(screen.getByText('Operational Audit Trail'));

    expect(screen.getByText(/Operational Mutation Audit Trail/)).toBeInTheDocument();
    expect(screen.getByText('Reload Logs')).toBeInTheDocument();
  });

  it('allows an administrator to grant a new role to a user via authService', async () => {
    const updated = await authService.assignUserRole('lead-usr-002', 'ORGANIZER', 'ADMIN');
    expect(updated.roles).toContain('ORGANIZER');
  });

  it('denies a non-administrator from granting user roles', async () => {
    await expect(
      authService.assignUserRole('member-usr-003', 'ADMIN', 'MEMBER')
    ).rejects.toThrow('Unauthorized: Only administrators can assign or modify user roles');
  });

  it('enforces lockout prevention: denies removing ADMIN role from the only remaining system administrator', async () => {
    // admin-usr-001 is the sole admin in demo seed
    await expect(
      authService.removeUserRole('admin-usr-001', 'ADMIN', 'ADMIN')
    ).rejects.toThrow('Lockout Prevention: Cannot remove the administrator role from the only remaining system administrator.');
  });

  it('allows removing an admin role when another administrator exists', async () => {
    // 1. Grant admin role to second user
    await authService.assignUserRole('lead-usr-002', 'ADMIN', 'ADMIN');

    // 2. Now removing admin role from first user is safe and permitted
    const updated = await authService.removeUserRole('admin-usr-001', 'ADMIN', 'ADMIN');
    expect(updated.roles).not.toContain('ADMIN');
  });

  it('prevents removing a role if it is the user\'s only remaining role', async () => {
    // member-usr-003 has exactly one role ['MEMBER']
    await expect(
      authService.removeUserRole('member-usr-003', 'MEMBER', 'ADMIN')
    ).rejects.toThrow('User must retain at least one role. Assign another role before removing this one.');
  });
});
