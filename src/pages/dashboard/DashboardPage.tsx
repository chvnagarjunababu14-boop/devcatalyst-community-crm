import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  CheckSquare,
  Calendar,
  Users,
  UserPlus,
  BarChart3,
  Settings,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Server,
  Layers,
  Database,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { isInsForgeConfigured } from '../../lib/insforge';
import { analyticsService, type ClubAnalyticsSummary } from '../../services/analyticsService';
import { recruitmentService } from '../../services/recruitmentService';
import { registrationService } from '../../services/registrationService';

interface RecentActivityItem {
  id: string;
  timestamp: string;
  type: 'RECRUITMENT' | 'EVENT';
  title: string;
  description: string;
  badge: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ClubAnalyticsSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const isParticipant = user?.activeRole === 'PARTICIPANT';

  const fetchSummary = useCallback(
    async (isSilent = false) => {
      if (isParticipant) {
        setIsLoadingSummary(false);
        setIsRefreshingSummary(false);
        return;
      }

      try {
        if (!isSilent) setIsLoadingSummary(true);
        else setIsRefreshingSummary(true);
        setSummaryError(null);

        const [data, auditLogs, registrations] = await Promise.all([
          analyticsService.getClubAnalyticsSummary(user?.id, user?.activeRole),
          recruitmentService.getAllAuditLogs(user?.activeRole).catch(() => []),
          registrationService.getRegistrations({}, user?.id, user?.activeRole).catch(() => []),
        ]);
        setSummary(data);

        // Build recent activities feed
        const activities: RecentActivityItem[] = [];

        for (const log of auditLogs.slice(0, 5)) {
          activities.push({
            id: log.id,
            timestamp: log.created_at,
            type: 'RECRUITMENT',
            title:
              log.action === 'MEMBER_ONBOARDED'
                ? 'Club Member Onboarded'
                : log.action === 'STAGE_CHANGED'
                ? 'Candidate Stage Updated'
                : log.action === 'INTERVIEW_SCHEDULED'
                ? 'Interview Scheduled'
                : 'Candidate Applied',
            description: log.reason || `${log.from_stage || 'START'} → ${log.to_stage}`,
            badge: log.to_stage || 'RECRUITMENT',
          });
        }

        for (const reg of registrations.slice(0, 5)) {
          activities.push({
            id: reg.id,
            timestamp: reg.registered_at,
            type: 'EVENT',
            title: 'Event Registration',
            description: `${reg.participant_name} registered for ${reg.event?.title || 'club event'}`,
            badge: reg.status,
          });
        }

        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentActivities(activities.slice(0, 6));
      } catch (err: unknown) {
        console.warn('Dashboard summary load error:', err);
        setSummaryError((err as Error).message || 'Failed to aggregate live club intelligence data');
      } finally {
        setIsLoadingSummary(false);
        setIsRefreshingSummary(false);
      }
    },
    [user?.id, user?.activeRole, isParticipant]
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const moduleCards = [
    {
      title: 'Projects & Workload',
      description: 'Manage active engineering projects, track milestones, and review team workload.',
      path: '/projects',
      icon: FolderGit2,
      badge: 'Phase 3',
      color: 'from-[#171717] to-[#262626]',
    },
    {
      title: 'Task Kanban Board',
      description: 'Drag-and-drop task workflow across TODO, IN_PROGRESS, and DONE with priorities.',
      path: '/tasks',
      icon: CheckSquare,
      badge: 'Phase 3',
      color: 'from-[#171717] to-[#262626]',
    },
    {
      title: 'Events & Registration',
      description: 'Publish workshops, enforce atomic capacity limits, and manage attendee check-ins.',
      path: '/events',
      icon: Calendar,
      badge: 'Phase 4',
      color: 'from-[#171717] to-[#262626]',
    },
    {
      title: 'Member Directory',
      description: 'Browse authenticated club members, contact details, and contribution histories.',
      path: '/members',
      icon: Users,
      badge: 'Phase 5',
      color: 'from-[#171717] to-[#262626]',
    },
    {
      title: 'Recruitment Pipeline',
      description: 'Track candidate applications through 5 review stages with confidential notes.',
      path: '/recruitment',
      icon: UserPlus,
      badge: 'Phase 5',
      color: 'from-[#171717] to-[#262626]',
    },
    {
      title: 'Analytics & Reports',
      description: 'Cross-module data analytics, registration conversion rates, and task metrics.',
      path: '/reports',
      icon: BarChart3,
      badge: 'Phase 6',
      color: 'from-[#171717] to-[#262626]',
    },
    {
      title: 'Administration & RBAC',
      description: 'User role management, environment diagnostics, and migration compliance.',
      path: '/settings',
      icon: Settings,
      badge: 'Phase 7',
      color: 'from-[#171717] to-[#262626]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#090909] border border-[#262626] text-white p-6 md:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs text-white/90 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-white/80" />
            <span>DevCatalyst Hub • Production-Ready Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, {user?.name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 mt-2 leading-relaxed">
            Your unified club operations and community CRM portal is active. Inspect cross-module intelligence, track team initiatives, or oversee applicant pipelines.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-[#090909] transition-all shadow-xs hover:-translate-y-0.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>View Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-all border border-white/15"
            >
              <span>Manage Profile</span>
            </Link>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <span className="text-xs text-neutral-400">Active Role:</span>
              <Badge role={user?.activeRole} size="md" />
            </div>
          </div>
        </div>

        {/* Decorative architectural background graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Layers className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Executive KPI Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-[#0F172A]">Executive KPI Overview</h2>
          {isInsForgeConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Server className="w-3 h-3 text-emerald-600" />
              Live Staging Database Metrics
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Database className="w-3 h-3 text-amber-600" />
              Local Mock Engine (Verification Data)
            </span>
          )}
        </div>

        {!isParticipant && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSummary(true)}
            isLoading={isRefreshingSummary}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Metrics
          </Button>
        )}
      </div>

      {summaryError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{summaryError}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => fetchSummary(false)}>
            Retry
          </Button>
        </div>
      )}

      {isParticipant ? (
        <Card className="border-[#E5E5E5] bg-[#F5F5F5]">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#171717]" />
                Community Participant Dashboard
              </h3>
              <p className="text-xs text-[#737373] max-w-xl">
                As a community participant, you can register for upcoming hackathons, workshops, and apply for active core team recruitment cycles.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/events">
                <Button size="sm" variant="primary">
                  Explore Events
                </Button>
              </Link>
              <Link to="/apply">
                <Button size="sm" variant="secondary">
                  Apply to Join
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Live Operational KPI Counters */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardContent className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-semibold uppercase">Initiatives</span>
                <FolderGit2 className="w-4 h-4 text-[#171717]" />
              </div>
              <div className="mt-2">
                <h3 className="text-xl font-bold text-[#0F172A]">
                  {isLoadingSummary ? '...' : summary?.projects.active ?? 0}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {summary?.projects.completed ?? 0} completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardContent className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-semibold uppercase">Tasks Done</span>
                <CheckSquare className="w-4 h-4 text-[#171717]" />
              </div>
              <div className="mt-2">
                <h3 className="text-xl font-bold text-[#0F172A]">
                  {isLoadingSummary ? '...' : `${summary?.tasks.completionRate ?? 0}%`}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {summary?.tasks.done ?? 0} of {summary?.tasks.total ?? 0} tasks
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardContent className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-semibold uppercase">Upcoming Events</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <h3 className="text-xl font-bold text-[#0F172A]">
                  {isLoadingSummary ? '...' : summary?.events.published ?? 0}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {summary?.events.totalRegistrations ?? 0} registrations
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-[#CBD5E1] transition-all">
            <CardContent className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-semibold uppercase">Active Members</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2">
                <h3 className="text-xl font-bold text-[#0F172A]">
                  {isLoadingSummary ? '...' : summary?.members.active ?? 0}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {summary?.members.alumni ?? 0} alumni
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-[#CBD5E1] transition-all col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="text-[11px] font-semibold uppercase">In Pipeline</span>
                <UserPlus className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2">
                <h3 className="text-xl font-bold text-[#0F172A]">
                  {isLoadingSummary ? '...' : summary?.recruitment.total ?? 0}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {summary?.recruitment.accepted ?? 0} accepted
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isInsForgeConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Server className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Backend Platform</p>
              <h4 className="text-sm font-bold text-[#0F172A] truncate">
                {isInsForgeConfigured ? 'InsForge Cloud BaaS' : 'Local Verification Engine'}
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] text-[#171717] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Security Architecture</p>
              <h4 className="text-sm font-bold text-[#0F172A] truncate">
                PostgreSQL RLS + Strict RBAC
              </h4>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Schema Migrations</p>
              <h4 className="text-sm font-bold text-[#0F172A] truncate">
                {isInsForgeConfigured ? 'Migrations 001–008 Linked' : 'Migrations 001–008 Unverified (Offline)'}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Club Activity Feed (BL-03) */}
      {!isParticipant && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#171717]" />
                Recent Club Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time operational stream of candidate evaluations, member onboardings, and event registrations
              </CardDescription>
            </div>
            <Link
              to="/reports"
              className="text-xs font-semibold text-[#171717] hover:underline flex items-center gap-1"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-[#F1F5F9] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#94A3B8]">
                No operational activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {recentActivities.map((act) => (
                  <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          act.type === 'RECRUITMENT'
                            ? 'bg-[#F5F5F5] text-[#171717]'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {act.type === 'RECRUITMENT' ? (
                          <UserPlus className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#0F172A] truncate">{act.title}</p>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                            {act.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{act.description}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#94A3B8] shrink-0">
                      {new Date(act.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operational Modules Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Platform Modules</h2>
            <p className="text-xs text-[#64748B]">Integrated subsystems across project operations, community CRM, analytics, and admin</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleCards.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.path}
                to={m.path}
                className="group block"
              >
                <Card interactive className="h-full flex flex-col justify-between">
                  <CardHeader className="border-b-0 pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] text-[#171717] flex items-center justify-center group-hover:scale-105 group-hover:bg-[#090909] group-hover:text-white transition-all">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                        {m.badge}
                      </span>
                    </div>
                    <CardTitle className="group-hover:text-[#090909] transition-colors">{m.title}</CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </CardHeader>
                  <div className="p-5 pt-3 flex items-center text-xs font-semibold text-[#171717] group-hover:text-[#090909] group-hover:translate-x-0.5 transition-all gap-1">
                    <span>Inspect Module</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
