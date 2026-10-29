import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Columns,
  List,
  ExternalLink,
  Calendar,
  AlertCircle,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { recruitmentService } from '../../services/recruitmentService';
import type {
  Application,
  RecruitmentCycle,
  ApplicationStage,
  ClubDomain,
} from '../../types/database';
import { ApplicantDetailModal } from '../../components/recruitment/ApplicantDetailModal';

export const RecruitmentPipelinePage: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.activeRole;

  // Data states
  const [cycles, setCycles] = useState<RecruitmentCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('cycle-001');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'kanban' or 'table'
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ClubDomain | 'ALL'>('ALL');
  const [selectedStage, setSelectedStage] = useState<ApplicationStage | 'ALL'>('ALL');

  // Selected candidate for detail drawer
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [cyclesData, appsData] = await Promise.all([
        recruitmentService.getCycles(),
        recruitmentService.getApplications(
          {
            cycleId: selectedCycleId === 'ALL' ? undefined : selectedCycleId,
          },
          userRole
        ),
      ]);

      setCycles(cyclesData);
      setApplications(appsData);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load recruitment applications');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCycleId, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (selectedDomain !== 'ALL' && app.domain !== selectedDomain) return false;
      if (selectedStage !== 'ALL' && app.stage !== selectedStage) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.applicant_name.toLowerCase().includes(q);
        const matchEmail = app.applicant_email.toLowerCase().includes(q);
        const matchRef = app.reference_code.toLowerCase().includes(q);
        const matchInst = app.institution.toLowerCase().includes(q);
        return matchName || matchEmail || matchRef || matchInst;
      }
      return true;
    });
  }, [applications, selectedDomain, selectedStage, searchQuery]);

  // Pipeline Metrics
  const metrics = useMemo(() => {
    const total = applications.length;
    const screening = applications.filter((a) => a.stage === 'SCREENING').length;
    const scheduled = applications.filter((a) => a.stage === 'INTERVIEW_SCHEDULED').length;
    const interviewed = applications.filter((a) => a.stage === 'INTERVIEWED').length;
    const accepted = applications.filter((a) => a.stage === 'ACCEPTED').length;
    const rejected = applications.filter((a) => a.stage === 'REJECTED').length;
    return { total, screening, scheduled, interviewed, accepted, rejected };
  }, [applications]);

  const stages: { stage: ApplicationStage; title: string; color: string; border: string }[] = [
    { stage: 'APPLIED', title: 'Applied', color: 'bg-blue-500', border: 'border-blue-200' },
    { stage: 'SCREENING', title: 'Screening', color: 'bg-neutral-600', border: 'border-neutral-200' },
    { stage: 'INTERVIEW_SCHEDULED', title: 'Interview Scheduled', color: 'bg-amber-500', border: 'border-amber-200' },
    { stage: 'INTERVIEWED', title: 'Interviewed', color: 'bg-neutral-800', border: 'border-neutral-300' },
    { stage: 'ACCEPTED', title: 'Accepted', color: 'bg-emerald-500', border: 'border-emerald-200' },
    { stage: 'REJECTED', title: 'Rejected', color: 'bg-slate-400', border: 'border-slate-200' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#090909]" />
            Recruitment Pipeline & Review
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Review candidate applications, schedule interview rounds, score rubrics, and onboard accepted members.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/apply"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Public Application Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <p className="text-[11px] font-medium text-[#64748B]">Total Applicants</p>
          <p className="text-xl font-bold text-[#0F172A] mt-0.5">{metrics.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <p className="text-[11px] font-medium text-[#171717]">In Screening</p>
          <p className="text-xl font-bold text-[#171717] mt-0.5">{metrics.screening}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <p className="text-[11px] font-medium text-amber-600">Scheduled</p>
          <p className="text-xl font-bold text-amber-900 mt-0.5">{metrics.scheduled}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <p className="text-[11px] font-medium text-[#171717]">Interviewed</p>
          <p className="text-xl font-bold text-[#171717] mt-0.5">{metrics.interviewed}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <p className="text-[11px] font-medium text-emerald-600">Accepted</p>
          <p className="text-xl font-bold text-emerald-900 mt-0.5">{metrics.accepted}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">Rejected</p>
          <p className="text-xl font-bold text-slate-700 mt-0.5">{metrics.rejected}</p>
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name, reference code, email, institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#090909] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Cycle Selector */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#171717]" />
              <span>Cycle:</span>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] outline-none cursor-pointer"
              >
                <option value="ALL">All Cohorts</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.term} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Domain Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
              <Briefcase className="w-3.5 h-3.5 text-[#171717]" />
              <span>Domain:</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value as any)}
                className="text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] outline-none cursor-pointer"
              >
                <option value="ALL">All Tracks</option>
                <option value="ENGINEERING">Engineering</option>
                <option value="DESIGN">Design</option>
                <option value="OUTREACH">Outreach</option>
                <option value="PRODUCT">Product</option>
                <option value="OPERATIONS">Operations</option>
              </select>
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
              <span>Stage:</span>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as ApplicationStage | 'ALL')}
                className="text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] outline-none cursor-pointer"
              >
                <option value="ALL">All Stages</option>
                <option value="APPLIED">Applied</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                <option value="INTERVIEWED">Interviewed</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* View Switcher: Kanban vs Table */}
            <div className="flex items-center border border-[#E2E8F0] rounded-lg p-0.5 bg-[#F8FAFC]">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'kanban' ? 'bg-white shadow-xs text-[#090909]' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Kanban Board View"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-[#090909]' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Table Directory View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[#64748B]">
          <div className="w-6 h-6 border-2 border-[#090909] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading recruitment pipeline candidates...
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-sm text-xs text-[#94A3B8]">
          <Users className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" />
          No candidate applications match the selected filters or search keyword.
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-4 min-w-full">
            {stages.map((col) => {
              const columnApps = filteredApps.filter((a) => a.stage === col.stage);

              return (
                <div
                  key={col.stage}
                  className="w-72 shrink-0 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 flex flex-col space-y-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.color}`} />
                      <span className="text-xs font-bold text-[#0F172A]">{col.title}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#64748B] bg-white px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                      {columnApps.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                    {columnApps.length === 0 ? (
                      <div className="p-6 text-center text-[11px] text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded-xl">
                        No candidates in this stage
                      </div>
                    ) : (
                      columnApps.map((candidate) => (
                        <div
                          key={candidate.id}
                          onClick={() => setSelectedAppId(candidate.id)}
                          className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#090909] shadow-xs hover:shadow-md cursor-pointer transition-all duration-150 space-y-2.5 group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F5F5] text-[#171717]">
                              {candidate.domain}
                            </span>
                            <span className="text-[10px] font-mono text-[#94A3B8]">
                              {candidate.reference_code}
                            </span>
                          </div>

                          <div>
                            <p className="font-bold text-xs text-[#0F172A] group-hover:text-[#090909] transition-colors">
                              {candidate.applicant_name}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate mt-0.5">{candidate.institution}</p>
                          </div>

                          {candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 3).map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
                                >
                                  {s}
                                </span>
                              ))}
                              {candidate.skills.length > 3 && (
                                <span className="text-[10px] text-[#94A3B8] self-center">
                                  +{candidate.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#94A3B8]">
                            <span>{new Date(candidate.submitted_at).toLocaleDateString()}</span>
                            {candidate.interviews && candidate.interviews.length > 0 && (
                              <span className="text-[#171717] font-semibold">
                                {candidate.interviews.length} interview{candidate.interviews.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE DIRECTORY VIEW */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4 font-mono">Reference</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredApps.map((candidate) => (
                  <tr
                    key={candidate.id}
                    onClick={() => setSelectedAppId(candidate.id)}
                    className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#0F172A]">{candidate.applicant_name}</p>
                      <p className="text-[11px] text-[#64748B]">{candidate.applicant_email}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F5F5F5] text-[#171717]">
                        {candidate.domain}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#475569]">
                      {candidate.reference_code}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#CBD5E1] text-[#0F172A]">
                        {candidate.stage.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#64748B] text-[11px]">
                      {new Date(candidate.submitted_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppId(candidate.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#090909] hover:underline"
                      >
                        <span>Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedAppId && (
        <ApplicantDetailModal
          isOpen={Boolean(selectedAppId)}
          onClose={() => setSelectedAppId(null)}
          applicationId={selectedAppId}
          currentUserId={user?.id || 'admin-usr-001'}
          userRole={userRole}
          onApplicationUpdated={loadData}
        />
      )}
    </div>
  );
};
