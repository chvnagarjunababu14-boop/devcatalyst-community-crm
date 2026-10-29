import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  FolderGit2,
  CheckSquare,
  Calendar,
  UserPlus,
  Users,
  Download,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  analyticsService,
  type ClubAnalyticsSummary,
} from '../../services/analyticsService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import type { AnalyticsDateFilter } from '../../services/analyticsService';

type TimeframeOption = 'ALL' | '30D' | '90D' | 'CUSTOM';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [summary, setSummary] = useState<ClubAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timeframe and date boundary controls
  const [timeframe, setTimeframe] = useState<TimeframeOption>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const calculateDateFilter = useCallback((): AnalyticsDateFilter | undefined => {
    const now = new Date();
    if (timeframe === 'ALL') return undefined;

    if (timeframe === '30D') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: past30.toISOString(),
        endDate: now.toISOString(),
      };
    }

    if (timeframe === '90D') {
      const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return {
        startDate: past90.toISOString(),
        endDate: now.toISOString(),
      };
    }

    if (timeframe === 'CUSTOM') {
      if (customStartDate && customEndDate && new Date(customStartDate) > new Date(customEndDate)) {
        return undefined; // Handled by dateValidationError
      }
      return {
        startDate: customStartDate ? new Date(customStartDate).toISOString() : undefined,
        endDate: customEndDate ? new Date(`${customEndDate}T23:59:59.999Z`).toISOString() : undefined,
      };
    }

    return undefined;
  }, [timeframe, customStartDate, customEndDate]);

  const loadAnalytics = useCallback(async (isSilent = false) => {
    try {
      setDateValidationError(null);

      // Validate date boundaries if custom
      if (timeframe === 'CUSTOM' && customStartDate && customEndDate) {
        if (new Date(customStartDate) > new Date(customEndDate)) {
          setDateValidationError('Invalid date range: Start date cannot be after end date.');
          return;
        }
      }

      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      const filter = calculateDateFilter();
      const data = await analyticsService.getClubAnalyticsSummary(user?.id, userRole, filter);
      setSummary(data);
    } catch (err: unknown) {
      console.error('Failed to load club analytics:', err);
      setErrorMessage((err as Error).message || 'Failed to aggregate club intelligence data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, userRole, timeframe, customStartDate, customEndDate, calculateDateFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportCsv = () => {
    if (!summary) return;
    const timeframeLabel =
      timeframe === 'ALL'
        ? 'All Time'
        : timeframe === '30D'
        ? 'Last 30 Days'
        : timeframe === '90D'
        ? 'Last 90 Days'
        : `Custom Range (${customStartDate || 'Start'} to ${customEndDate || 'Present'})`;
    analyticsService.exportAnalyticsReportCsv(summary, timeframeLabel);
  };

  const isDatasetEmpty =
    summary &&
    summary.projects.total === 0 &&
    summary.tasks.total === 0 &&
    summary.events.total === 0 &&
    summary.recruitment.total === 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F5F5] text-[#171717] text-[11px] font-semibold mb-1.5 border border-[#E5E5E5]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Club Intelligence & Operational Analytics</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            Analytics & Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Cross-module velocity, capacity utilization, task distribution, and recruitment funnel conversion
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadAnalytics(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            disabled={!summary || isLoading}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Boundary Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#475569] uppercase tracking-wider text-[11px]">Timeframe:</span>
          <div className="inline-flex rounded-lg border border-[#E2E8F0] p-0.5 bg-[#F8FAFC]">
            {(
              [
                { id: 'ALL', label: 'All Time' },
                { id: '30D', label: 'Last 30 Days' },
                { id: '90D', label: 'Last 90 Days' },
                { id: 'CUSTOM', label: 'Custom Range' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  timeframe === opt.id
                    ? 'bg-[#090909] text-white shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {timeframe === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748B]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] outline-none focus:border-[#090909]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748B]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 border border-[#E2E8F0] rounded-lg text-xs bg-white text-[#0F172A] outline-none focus:border-[#090909]"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => loadAnalytics(false)}
            >
              Apply Filter
            </Button>
          </div>
        )}
      </div>

      {dateValidationError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{dateValidationError}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between gap-3 text-xs text-[#B91C1C]">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadAnalytics(false)}
          >
            Retry
          </Button>
        </div>
      )}

      {isDatasetEmpty && !isLoading && !errorMessage && (
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center text-xs text-[#64748B] space-y-1">
          <p className="font-semibold text-[#0F172A]">No records found within the selected timeframe boundary.</p>
          <p>Try expanding your date range filter or switching back to "All Time" to view aggregate club operations.</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Active Projects Velocity */}
            <Card className="hover:border-[#CBD5E1] transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Initiatives</p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                    {summary.projects.active}
                    <span className="text-xs font-normal text-[#64748B] ml-1.5">/ {summary.projects.total} total</span>
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#047857] font-medium mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{summary.projects.completed} completed initiatives</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FolderGit2 className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Task Completion Rate */}
            <Card className="hover:border-[#CBD5E1] transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Task Completion Rate</p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                    {summary.tasks.completionRate}%
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#171717] font-medium mt-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{summary.tasks.done} of {summary.tasks.total} tasks resolved</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#F5F5F5] text-[#171717] flex items-center justify-center shrink-0">
                  <CheckSquare className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Event Capacity Utilization */}
            <Card className="hover:border-[#CBD5E1] transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Capacity Utilization</p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                    {summary.events.capacityUtilizationRate}%
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#047857] font-medium mt-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{summary.events.totalRegistrations} RSVPs / {summary.events.totalCapacity} seats</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Recruitment Conversion Rate */}
            <Card className="hover:border-[#CBD5E1] transition-all">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Recruitment Selectivity</p>
                  <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                    {summary.recruitment.acceptanceRate}%
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#D97706] font-medium mt-1">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{summary.recruitment.accepted} accepted of {summary.recruitment.total} candidates</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Projects & Task Management Breakdown (12-column grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Task Kanban Distribution Card (7 cols) */}
            <Card className="lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#171717]" />
                    Task Status & Priority Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kanban throughput across TODO, IN_PROGRESS, and DONE
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  {summary.tasks.total} Total Tasks
                </span>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Visual Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-2 font-medium">
                    <span>Workflow Distribution</span>
                    <span>{summary.tasks.completionRate}% Done</span>
                  </div>
                  <div className="h-3 w-full bg-[#E2E8F0] rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{
                        width: `${summary.tasks.total ? (summary.tasks.done / summary.tasks.total) * 100 : 0}%`,
                      }}
                      className="bg-emerald-500 h-full transition-all duration-500"
                      title={`Done: ${summary.tasks.done}`}
                    />
                    <div
                      style={{
                        width: `${summary.tasks.total ? (summary.tasks.inProgress / summary.tasks.total) * 100 : 0}%`,
                      }}
                      className="bg-[#262626] h-full transition-all duration-500"
                      title={`In Progress: ${summary.tasks.inProgress}`}
                    />
                    <div
                      style={{
                        width: `${summary.tasks.total ? (summary.tasks.todo / summary.tasks.total) * 100 : 0}%`,
                      }}
                      className="bg-slate-300 h-full transition-all duration-500"
                      title={`To Do: ${summary.tasks.todo}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                      <span>Done ({summary.tasks.done})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#262626] shrink-0" />
                      <span>In Progress ({summary.tasks.inProgress})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
                      <span>To Do ({summary.tasks.todo})</span>
                    </div>
                  </div>
                </div>

                {/* Priority Breakdown Table */}
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Priority</th>
                        <th className="px-4 py-2.5">Count</th>
                        <th className="px-4 py-2.5">Share</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      <tr className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>HIGH</span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[#0F172A]">{summary.tasks.highPriority}</td>
                        <td className="px-4 py-2.5 text-[#64748B]">
                          {summary.tasks.total ? Math.round((summary.tasks.highPriority / summary.tasks.total) * 100) : 0}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-rose-600">Urgent Focus</td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>MEDIUM</span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[#0F172A]">{summary.tasks.mediumPriority}</td>
                        <td className="px-4 py-2.5 text-[#64748B]">
                          {summary.tasks.total ? Math.round((summary.tasks.mediumPriority / summary.tasks.total) * 100) : 0}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-[#475569]">Scheduled</td>
                      </tr>
                      <tr className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>LOW</span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[#0F172A]">{summary.tasks.lowPriority}</td>
                        <td className="px-4 py-2.5 text-[#64748B]">
                          {summary.tasks.total ? Math.round((summary.tasks.lowPriority / summary.tasks.total) * 100) : 0}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-600">Backlog</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Project Portfolio Status (5 cols) */}
            <Card className="lg:col-span-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-blue-600" />
                  Initiatives & Status Velocity
                </CardTitle>
                <CardDescription className="text-xs">
                  Active engineering initiatives overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-[#0F172A]">Active Execution</span>
                  </div>
                  <span className="text-sm font-bold text-[#0F172A]">{summary.projects.active}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-[#0F172A]">Planning & Scoping</span>
                  </div>
                  <span className="text-sm font-bold text-[#0F172A]">{summary.projects.planning}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-[#0F172A]">Completed</span>
                  </div>
                  <span className="text-sm font-bold text-[#0F172A]">{summary.projects.completed}</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-xs font-semibold text-[#0F172A]">On Hold / Archived</span>
                  </div>
                  <span className="text-sm font-bold text-[#0F172A]">{summary.projects.onHold}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 3: Recruitment Funnel & Community Demographics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recruitment Pipeline Funnel (6 cols) */}
            <Card className="lg:col-span-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    Recruitment Pipeline Conversion Funnel
                  </CardTitle>
                  <span className="text-xs font-bold text-[#047857] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {summary.recruitment.acceptanceRate}% Acceptance
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Stage-by-stage candidate progression and interview conversion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { stage: '1. Applied (Ingestion)', count: summary.recruitment.applied, color: 'bg-neutral-500' },
                  { stage: '2. Screening (Portfolio)', count: summary.recruitment.screening, color: 'bg-blue-600' },
                  { stage: '3. Interview Scheduled', count: summary.recruitment.interviewScheduled, color: 'bg-amber-600' },
                  { stage: '4. Interviewed (Scored)', count: summary.recruitment.interviewed, color: 'bg-[#262626]' },
                  { stage: '5. Accepted (Member Offer)', count: summary.recruitment.accepted, color: 'bg-emerald-600 font-bold' },
                ].map((step, idx) => {
                  const pct = summary.recruitment.total > 0
                    ? Math.max(8, Math.round((step.count / summary.recruitment.total) * 100))
                    : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#0F172A]">{step.stage}</span>
                        <span className="font-semibold text-[#475569]">{step.count} candidates</span>
                      </div>
                      <div className="w-full bg-[#F1F5F9] rounded-lg h-5 overflow-hidden flex border border-[#E2E8F0]">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`${step.color} h-full text-white text-[10px] font-semibold flex items-center px-2 transition-all duration-500`}
                        >
                          {pct > 15 ? `${pct}%` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <span>Rejected / Archived: <strong>{summary.recruitment.rejected}</strong></span>
                  <span>Interview Conversion: <strong>{summary.recruitment.interviewConversionRate}%</strong></span>
                </div>
              </CardContent>
            </Card>

            {/* Member Directory Community Domains (6 cols) */}
            <Card className="lg:col-span-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Club Community Domain Breakdown
                </CardTitle>
                <CardDescription className="text-xs">
                  Member distribution across technical and operational domains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(summary.members.domainCounts).map(([domain, count]) => (
                    <div
                      key={domain}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all text-center"
                    >
                      <span className="text-xs font-semibold text-[#64748B] block uppercase tracking-wider">
                        {domain}
                      </span>
                      <span className="text-xl font-bold text-[#0F172A] mt-1 block">
                        {count}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">members</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[#0F172A] font-medium">Active Contributors:</span>
                    <strong className="text-[#047857]">{summary.members.active}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
                    <span className="text-[#0F172A] font-medium">Alumni:</span>
                    <strong className="text-neutral-700">{summary.members.alumni}</strong>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4: Event Capacity Utilization & Attendance */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Event Utilization & Check-in Attendance Rates
                </CardTitle>
                <CardDescription className="text-xs">
                  Capacity metrics, reservation attendance conversion, and event lifecycle states
                </CardDescription>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {summary.events.attendanceConversionRate}% Attendance Turnout
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Total Capacity</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{summary.events.totalCapacity}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Across {summary.events.total} events</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Active Registrations</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{summary.events.totalRegistrations}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{summary.events.capacityUtilizationRate}% of capacity</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Verified Attendees</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.events.totalAttended}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Scanned via QR / Code</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase">Published Events</p>
                  <p className="text-2xl font-bold text-[#0F172A] mt-1">{summary.events.published}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{summary.events.draft} in draft</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default ReportsPage;
