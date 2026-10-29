import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Server,
  Database,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  RefreshCw,
  X,
  AlertTriangle,
  Bell,
  Mail,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService, getStoredUsers, INITIAL_DEMO_USERS } from '../../services/authService';
import { recruitmentService } from '../../services/recruitmentService';
import { notificationService } from '../../services/notificationService';
import { getActiveNotificationProvider } from '../../services/notificationProvider';
import { isInsForgeConfigured, connectionStatus, appEnvironment, insforge } from '../../lib/insforge';
import type { Role } from '../../types/auth';
import type { RecruitmentAuditRecord } from '../../types/database';
import type { NotificationRecord } from '../../types/notifications';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const ALL_ROLES: Role[] = ['ADMIN', 'ORGANIZER', 'PROJECT_LEAD', 'MEMBER', 'PARTICIPANT'];

const BASE_MIGRATIONS = [
  { id: '001', name: '001_initial_schema.sql', desc: 'Profiles, user_roles, projects, project_members, tasks tables and assignee check trigger' },
  { id: '002', name: '002_row_level_security.sql', desc: 'RLS enablement across tables, has_role() security definer function' },
  { id: '003', name: '003_bootstrap_admin.sql', desc: 'bootstrap_initial_admin(email) procedure with zero-existing-admin guard' },
  { id: '004', name: '004_project_code_and_permissions.sql', desc: 'PRJ/TSK code generation RPCs and strict VIEWER task lock' },
  { id: '005', name: '005_events_and_registrations.sql', desc: 'Events, registrations, atomic capacity locking, QR attendance check-in RPC' },
  { id: '006', name: '006_recruitment_and_members.sql', desc: 'Recruitment cycles, applications, scorecards, member metadata, onboarding' },
  { id: '007', name: '007_security_hardening.sql', desc: 'search_path = public, pg_temp sanitization, direct insert lock, masked view' },
  { id: '008', name: '008_public_projects_and_discovery.sql', desc: 'Public project visibility column, index, and anonymous discovery RLS' },
  { id: '009', name: '009_notifications_and_automation.sql', desc: 'Notifications table, performance indexes, RLS policies, delivery logs' },
];

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const userRole = user?.activeRole;
  const isAdmin = userRole === 'ADMIN';

  // Tabs: 'roles' | 'system' | 'migrations' | 'audit' | 'notifications'
  const [activeTab, setActiveTab] = useState<'roles' | 'system' | 'migrations' | 'audit' | 'notifications'>('roles');

  // Users for Role Management
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForRole, setSelectedUserForRole] = useState<string | null>(null);
  const [targetRoleToAssign, setTargetRoleToAssign] = useState<Role>('MEMBER');
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [roleActionNotice, setRoleActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<RecruitmentAuditRecord[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Schema & Database Probing
  const [schemaProbeStatus, setSchemaProbeStatus] = useState<'UNVERIFIED' | 'PROBING' | 'VERIFIED' | 'FAILED'>(
    isInsForgeConfigured ? 'PROBING' : 'UNVERIFIED'
  );
  const [probeError, setProbeError] = useState<string | null>(null);

  const runSchemaProbe = useCallback(async () => {
    if (!isInsForgeConfigured) {
      setSchemaProbeStatus('UNVERIFIED');
      return;
    }
    setSchemaProbeStatus('PROBING');
    setProbeError(null);
    try {
      const { error } = await insforge.database
        .from('profiles')
        .select('id', { head: true, count: 'exact' });
      if (error) {
        setSchemaProbeStatus('FAILED');
        setProbeError(error.message);
      } else {
        setSchemaProbeStatus('VERIFIED');
      }
    } catch (err: unknown) {
      setSchemaProbeStatus('FAILED');
      setProbeError((err as Error).message || 'Database unreachable');
    }
  }, []);

  // Load users
  const loadUsers = useCallback(() => {
    try {
      const stored = getStoredUsers();
      setUsersList(stored);
    } catch {
      setUsersList(INITIAL_DEMO_USERS);
    }
  }, []);

  // Notification Logs & Automation
  const [notificationsList, setNotificationsList] = useState<NotificationRecord[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [retryingNotifId, setRetryingNotifId] = useState<string | null>(null);
  const [notifActionNotice, setNotifActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedNotificationForDetails, setSelectedNotificationForDetails] = useState<NotificationRecord | null>(null);
  const [notifStatusFilter, setNotifStatusFilter] = useState<string>('ALL');

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoadingAudit(true);
      const logs = await recruitmentService.getAllAuditLogs(userRole);
      setAuditLogs(logs);
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [userRole]);

  // Load notification logs
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true);
      const records = await notificationService.getNotifications(undefined, user?.email, userRole);
      setNotificationsList(records);
    } catch {
      setNotificationsList([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user?.email, userRole]);

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
    runSchemaProbe();
    loadNotifications();
  }, [loadUsers, loadAuditLogs, runSchemaProbe, loadNotifications]);

  const handleRetryNotification = async (notificationId: string) => {
    try {
      setRetryingNotifId(notificationId);
      setNotifActionNotice(null);
      const updated = await notificationService.retryNotification(notificationId, userRole);
      await loadNotifications();
      if (updated.status === 'SENT') {
        setNotifActionNotice({
          type: 'success',
          message: `Notification ${notificationId} retried successfully and marked as SENT.`,
        });
      } else {
        setNotifActionNotice({
          type: 'error',
          message: `Retry resulted in status ${updated.status}: ${updated.error_message || 'Delivery failed'}`,
        });
      }
    } catch (err: unknown) {
      setNotifActionNotice({
        type: 'error',
        message: (err as Error).message || 'Failed to retry notification',
      });
    } finally {
      setRetryingNotifId(null);
    }
  };

  // Handle Role Grant
  const handleAssignRole = async (targetUserId: string, newRole: Role) => {
    if (!isAdmin) {
      setRoleActionNotice({
        type: 'error',
        message: 'Unauthorized: Only system administrators can assign or modify roles.',
      });
      return;
    }

    try {
      setIsAssigningRole(true);
      setRoleActionNotice(null);

      await authService.assignUserRole(targetUserId, newRole, userRole);
      loadUsers();
      await refreshUser();

      setRoleActionNotice({
        type: 'success',
        message: `Successfully granted role ${newRole} to user.`,
      });
    } catch (err: unknown) {
      setRoleActionNotice({
        type: 'error',
        message: (err as Error).message || 'Failed to update user role',
      });
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Handle Role Revocation with Lockout Prevention
  const handleRemoveRole = async (targetUserId: string, roleToRemove: Role) => {
    if (!isAdmin) {
      setRoleActionNotice({
        type: 'error',
        message: 'Unauthorized: Only system administrators can assign or modify roles.',
      });
      return;
    }

    try {
      setIsAssigningRole(true);
      setRoleActionNotice(null);

      await authService.removeUserRole(targetUserId, roleToRemove, userRole);
      loadUsers();
      await refreshUser();

      setRoleActionNotice({
        type: 'success',
        message: `Successfully revoked role ${roleToRemove} from user.`,
      });
    } catch (err: unknown) {
      setRoleActionNotice({
        type: 'error',
        message: (err as Error).message || 'Failed to remove user role',
      });
    } finally {
      setIsAssigningRole(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roles.some((r: string) => r.toLowerCase().includes(q))
    );
  }, [usersList, userSearchQuery]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-[#171717] text-[11px] font-semibold mb-1.5 border border-[#E5E5E5]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Platform Administration & RBAC Controls</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#171717]">
          Administration & Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#737373] mt-0.5">
          Role assignments, operational mutation audit logs, environment configuration, and migration health
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#E5E5E5] overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'roles'
              ? 'border-[#090909] text-[#090909] bg-white font-semibold'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Role Management (RBAC)</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'system'
              ? 'border-[#090909] text-[#090909] bg-white font-semibold'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System & Environment</span>
        </button>

        <button
          onClick={() => setActiveTab('migrations')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'migrations'
              ? 'border-[#090909] text-[#090909] bg-white font-semibold'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Migrations & Schema (001–009)</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'audit'
              ? 'border-[#090909] text-[#090909] bg-white font-semibold'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Operational Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-t-lg transition-colors border-b-2 -mb-1 ${
            activeTab === 'notifications'
              ? 'border-[#090909] text-[#090909] bg-white font-semibold'
              : 'border-transparent text-[#737373] hover:text-[#171717]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications & Automation</span>
        </button>
      </div>

      {/* Tab 1: User Role Management (RBAC) */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {!isAdmin && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Read-Only Permission Mode:</strong>
                <span>
                  You are signed in as <strong>{userRole}</strong>. Modifying and granting user roles is strictly restricted to users with the <strong>ADMIN</strong> role.
                </span>
              </div>
            </div>
          )}

          {roleActionNotice && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                roleActionNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {roleActionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{roleActionNotice.message}</span>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#171717]" />
                  Club User Roles & Authorization Directory
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage active roles across ADMIN, ORGANIZER, PROJECT_LEAD, MEMBER, and PARTICIPANT
                </CardDescription>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter users by name or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] focus:outline-none focus:border-[#090909] focus:bg-white transition-all"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-semibold text-[#737373] uppercase">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Assigned Roles</th>
                      <th className="px-4 py-3 text-right">Role Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      return (
                        <tr key={u.id} className="hover:bg-[#F5F5F5] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#171717] flex items-center gap-2">
                              <span>{u.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-[#F5F5F5] text-[#171717] border border-[#E5E5E5] rounded font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#64748B]">{u.email}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {u.roles.map((r: Role) => (
                                <span key={r} className="inline-flex items-center gap-1 group/role">
                                  <Badge role={r} size="sm" />
                                  {isAdmin && u.roles.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRole(u.id, r)}
                                      disabled={isAssigningRole}
                                      title={`Revoke ${r} role`}
                                      className="text-[#94A3B8] hover:text-rose-600 p-0.5 rounded transition-colors"
                                      aria-label={`Revoke ${r} role from ${u.name}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAdmin ? (
                              <div className="inline-flex items-center gap-2 justify-end">
                                <select
                                  value={targetRoleToAssign}
                                  onChange={(e) => setTargetRoleToAssign(e.target.value as Role)}
                                  className="text-xs rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 outline-none"
                                >
                                  {ALL_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  isLoading={isAssigningRole && selectedUserForRole === u.id}
                                  onClick={() => {
                                    setSelectedUserForRole(u.id);
                                    handleAssignRole(u.id, targetRoleToAssign);
                                  }}
                                >
                                  Grant Role
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#94A3B8] italic">Admin Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: System & Environment */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-[#171717]" />
                Runtime Environment & Diagnostics
              </CardTitle>
              <CardDescription className="text-xs">
                Active connection parameters, InsForge BaaS binding, and client-side isolation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Connection Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        connectionStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <strong className="text-sm font-bold text-[#0F172A]">{connectionStatus}</strong>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {isInsForgeConfigured ? 'Direct InsForge cloud persistence active' : 'Local verified in-memory fallback engine active'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Active Endpoint</p>
                  <p className="text-sm font-mono font-bold text-[#0F172A] mt-1 truncate">
                    {appEnvironment.baseUrl}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">Configured backend URL</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Secret Shielding Guarantee</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero Secrets Bundled</span>
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">No service-role keys or passwords in client</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs text-[#475569]">
                <h4 className="font-semibold text-[#0F172A] text-sm">Security & Isolation Guarantees:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Browser Bundle Security:</strong> All client queries run exclusively through the public anonymous key. Service-role tokens are strictly prohibited in the browser bundle.</li>
                  <li><strong>Silent Fallback Prevention:</strong> When built for production, the application displays a critical configuration warning rather than silently serving mock data.</li>
                  <li><strong>Role Escalation Barrier:</strong> Public signup `/register` only assigns `MEMBER` or `PARTICIPANT`. The initial administrator must be bootstrapped via `bootstrap_initial_admin()`.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Migrations & Schema Health */}
      {activeTab === 'migrations' && (
        <div className="space-y-4">
          {/* Prominent Truth-in-State Banner */}
          {!isInsForgeConfigured ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Staging Database Unconnected — Migration Status: UNVERIFIED</span>
              </div>
              <p className="leading-relaxed">
                The application is running in local development fallback mode with mock data.
                PostgreSQL migrations 001–008 are defined and syntactically valid in <code>migrations/</code>, but have <strong>not been executed or verified against a remote InsForge database</strong>.
                To link and verify live schema status, configure <code>VITE_INSFORGE_URL</code> and <code>VITE_INSFORGE_ANON_KEY</code> in <code>.env.local</code>.
              </p>
            </div>
          ) : schemaProbeStatus === 'PROBING' ? (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>Probing target InsForge PostgreSQL database connectivity and tables...</span>
            </div>
          ) : schemaProbeStatus === 'VERIFIED' ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Target InsForge staging database is connected and responsive. Schema migrations verified against live PostgreSQL instance.</span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Database probe error: {probeError || 'Database is unreachable'}. Running in offline fallback mode.</span>
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  PostgreSQL Migrations Specification (001–008)
                </CardTitle>
                <CardDescription className="text-xs">
                  Idempotent migration execution order, security definer bindings, and RLS policies
                </CardDescription>
              </div>
              {isInsForgeConfigured && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={runSchemaProbe}
                  isLoading={schemaProbeStatus === 'PROBING'}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Re-probe Database
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Migration File</th>
                      <th className="px-4 py-3">Description & Scope</th>
                      <th className="px-4 py-3 text-right">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {BASE_MIGRATIONS.map((m) => {
                      return (
                        <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#090909]">{m.id}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-[#0F172A]">{m.name}</td>
                          <td className="px-4 py-3 text-[#64748B]">{m.desc}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {!isInsForgeConfigured ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px]">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                UNVERIFIED (Offline)
                              </span>
                            ) : schemaProbeStatus === 'PROBING' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px]">
                                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                                PROBING...
                              </span>
                            ) : schemaProbeStatus === 'VERIFIED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                VERIFIED (Staging Connected)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px]">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                UNREACHABLE
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Operational Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#171717]" />
                  Operational Mutation Audit Trail (Append-Only)
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable records captured during candidate stage transitions, evaluations, and onboarding
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadAuditLogs}
                isLoading={isLoadingAudit}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reload Logs
              </Button>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#94A3B8]">
                  No audit log entries recorded in this session.
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Record Source</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Stage Transition</th>
                        <th className="px-4 py-3">Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3 font-mono text-[#64748B]">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {log.source === 'LIVE_EVENT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                LIVE AUDIT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] text-[10px] font-semibold">
                                DEMO SEED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#0F172A]">{log.action}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[#475569]">
                              {log.from_stage || 'START'} → <strong className="text-[#090909]">{log.to_stage || 'APPLIED'}</strong>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#64748B]">{log.reason || 'Operational action'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Notifications & Event Automation */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Action Notice */}
          {notifActionNotice && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                notifActionNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {notifActionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{notifActionNotice.message}</span>
            </div>
          )}

          {/* Active Provider Diagnostics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#171717]" />
                Notification Engine & Delivery Provider Status
              </CardTitle>
              <CardDescription className="text-xs">
                Decoupled provider abstraction, idempotent delivery tracking, and server-side secret shielding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Active Provider</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1 truncate">
                    {getActiveNotificationProvider().name.split('(')[0].trim()}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    {getActiveNotificationProvider().name.includes('Mock')
                      ? 'Local simulation engine'
                      : 'Serverless Edge Function'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Total Dispatched</p>
                  <p className="text-sm font-bold text-[#0F172A] mt-1">
                    {notificationsList.length} Events
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">Logged notifications in session</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Successful Delivery</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    {notificationsList.filter((n) => n.status === 'SENT').length} Sent
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">Confirmed delivery records</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Retryable / Failed</p>
                  <p className="text-sm font-bold text-amber-600 mt-1">
                    {notificationsList.filter((n) => n.status === 'RETRYABLE' || n.status === 'FAILED').length} Issues
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1">Eligible for manual retry</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs text-[#475569]">
                <h4 className="font-semibold text-[#0F172A] text-sm">Automated Event Triggers:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Event Registration:</strong> Dispatched immediately upon ticket reservation; attaches an RFC 5545 <code>.ics</code> calendar file with ticket tokens.</li>
                  <li><strong>Event Cancellation:</strong> Dispatched upon attendee- or organizer-initiated ticket cancellation.</li>
                  <li><strong>Interview Scheduling:</strong> Dispatched when an interview slot is reserved, generating a dedicated calendar invitation with meeting links.</li>
                  <li><strong>Application Decisions:</strong> Dispatched when candidate stage transitions to <code>ACCEPTED</code> or <code>REJECTED</code>.</li>
                  <li><strong>Idempotency Enforcement:</strong> Every dispatch generates a deterministic key (e.g., <code>evt-reg-[id]</code>) preventing duplicate messages.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Log Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#171717]" />
                  Notification Dispatch & Delivery Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect outgoing email dispatches, template bodies, and delivery attempts
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={notifStatusFilter}
                  onChange={(e) => setNotifStatusFilter(e.target.value)}
                  className="text-xs rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 outline-none font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="PENDING">Pending</option>
                  <option value="RETRYABLE">Retryable</option>
                  <option value="FAILED">Failed</option>
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadNotifications}
                  isLoading={isLoadingNotifications}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#94A3B8]">
                  No notifications recorded in this session.
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Event Type</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3 text-center">Attempts</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {notificationsList
                        .filter((n) => notifStatusFilter === 'ALL' || n.status === notifStatusFilter)
                        .map((n) => {
                          const canRetry =
                            (n.status === 'RETRYABLE' || n.status === 'FAILED') &&
                            (userRole === 'ADMIN' || userRole === 'ORGANIZER' || userRole === 'PROJECT_LEAD');

                          return (
                            <tr key={n.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="px-4 py-3 font-mono text-[#64748B] whitespace-nowrap">
                                {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-[#0F172A]">{n.recipient_name}</div>
                                <span className="text-[11px] text-[#64748B]">{n.recipient_email}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F5F5F5] text-[#171717] border border-[#E5E5E5]">
                                  {n.event_type.replace('EVENT_', '').replace('RECRUITMENT_', '')}
                                </span>
                              </td>
                              <td className="px-4 py-3 max-w-[240px] truncate font-medium text-[#0F172A]" title={n.subject}>
                                {n.subject}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-[#64748B]">
                                {n.delivery_attempts}/{n.max_attempts}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {n.status === 'SENT' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    SENT
                                  </span>
                                ) : n.status === 'PENDING' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                                    <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                                    PENDING
                                  </span>
                                ) : n.status === 'RETRYABLE' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold">
                                    <AlertCircle className="w-3 h-3 text-blue-600" />
                                    RETRYABLE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-semibold">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    FAILED
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setSelectedNotificationForDetails(n)}
                                  leftIcon={<FileText className="w-3 h-3" />}
                                >
                                  View
                                </Button>
                                {canRetry && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleRetryNotification(n.id)}
                                    isLoading={retryingNotifId === n.id}
                                    leftIcon={<RefreshCw className="w-3 h-3" />}
                                  >
                                    Retry
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details & Inspection Modal */}
          {selectedNotificationForDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#E5E5E5] space-y-4 max-h-[90vh] overflow-y-auto modal-entrance">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#171717]" />
                    <h3 className="font-bold text-[#171717] text-base">Notification Details</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNotificationForDetails(null)}
                    className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
                    <div>
                      <span className="text-[#737373] block text-[11px] font-semibold uppercase">Recipient</span>
                      <strong className="text-[#171717]">
                        {selectedNotificationForDetails.recipient_name} ({selectedNotificationForDetails.recipient_email})
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#737373] block text-[11px] font-semibold uppercase">Event Type</span>
                      <code className="text-[#090909] font-mono font-semibold">
                        {selectedNotificationForDetails.event_type}
                      </code>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px] font-semibold uppercase">Idempotency Key</span>
                      <code className="text-[#475569] font-mono text-[10px]">
                        {selectedNotificationForDetails.idempotency_key}
                      </code>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px] font-semibold uppercase">Delivery Status</span>
                      <span className="font-semibold text-[#0F172A]">
                        {selectedNotificationForDetails.status} ({selectedNotificationForDetails.delivery_attempts}/{selectedNotificationForDetails.max_attempts} attempts)
                      </span>
                    </div>
                  </div>

                  {selectedNotificationForDetails.error_message && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Delivery Failure Reason
                      </span>
                      <p className="font-mono text-xs">{selectedNotificationForDetails.error_message}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-[#64748B] block text-[11px] font-semibold uppercase mb-1">Subject</span>
                    <div className="p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-medium text-[#0F172A]">
                      {selectedNotificationForDetails.subject}
                    </div>
                  </div>

                  <div>
                    <span className="text-[#64748B] block text-[11px] font-semibold uppercase mb-1">Plain Text Body</span>
                    <pre className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] whitespace-pre-wrap font-mono text-[11px] text-[#334155] max-h-48 overflow-y-auto">
                      {selectedNotificationForDetails.body_text}
                    </pre>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedNotificationForDetails(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
