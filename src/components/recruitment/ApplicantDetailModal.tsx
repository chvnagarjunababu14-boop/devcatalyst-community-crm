import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  ExternalLink,
  Code2,
  Award,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Shield,
  FileText,
  History,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { recruitmentService } from '../../services/recruitmentService';
import type {
  Application,
  ApplicationStage,
  RecruitmentAuditRecord,
} from '../../types/database';
import type { Role } from '../../types/auth';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { ScorecardModal } from './ScorecardModal';

export interface ApplicantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  currentUserId: string;
  userRole?: Role;
  onApplicationUpdated: () => void;
}

export const ApplicantDetailModal: React.FC<ApplicantDetailModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  currentUserId,
  userRole,
  onApplicationUpdated,
}) => {
  const [app, setApp] = useState<Application | null>(null);
  const [auditLogs, setAuditLogs] = useState<RecruitmentAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'details' | 'interviews' | 'scorecards' | 'audit'>('details');

  // Internal Notes State
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);

  // Decision Confirmation Modal State
  const [pendingStage, setPendingStage] = useState<ApplicationStage | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardSuccessMessage, setOnboardSuccessMessage] = useState<string | null>(null);

  const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER';

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await recruitmentService.getApplicationById(applicationId, userRole);
      if (!data) {
        setError('Application not found');
        return;
      }
      setApp(data);
      setNotes(data.status_notes || '');

      const logs = await recruitmentService.getAuditLogs(applicationId, userRole);
      setAuditLogs(logs);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load application details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && applicationId) {
      loadData();
    }
  }, [isOpen, applicationId]);

  // Stage change with confirmation
  const handleStageChangeRequest = (newStage: ApplicationStage) => {
    if (!app) return;
    if (newStage === app.stage) return;

    if (newStage === 'ACCEPTED' || newStage === 'REJECTED') {
      setPendingStage(newStage);
      setDecisionReason('');
    } else {
      executeStageChange(newStage);
    }
  };

  const executeStageChange = async (newStage: ApplicationStage, reason?: string) => {
    if (!app) return;
    try {
      const updated = await recruitmentService.updateApplicationStage(
        app.id,
        newStage,
        currentUserId,
        reason,
        userRole
      );
      setApp((prev) => (prev ? { ...prev, stage: updated.stage } : null));
      setPendingStage(null);
      loadData();
      onApplicationUpdated();
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleSaveNotes = async () => {
    if (!app) return;
    try {
      setIsSavingNotes(true);
      await recruitmentService.updateInternalNotes(app.id, notes, userRole);
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 2500);
      onApplicationUpdated();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleOnboardMember = async () => {
    if (!app) return;
    if (!confirm(`Are you sure you want to onboard ${app.applicant_name} as an active club member? This will provision a member profile and assign the MEMBER role.`)) {
      return;
    }

    try {
      setIsOnboarding(true);
      const res = await recruitmentService.onboardAcceptedApplicant(app.id, currentUserId, userRole);
      setOnboardSuccessMessage(res.message);
      loadData();
      onApplicationUpdated();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsOnboarding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={app ? `${app.applicant_name} (${app.reference_code})` : 'Candidate Application'}
        description="Review candidate portfolio, evaluation rubric scorecards, and scheduling."
        maxWidth="xl"
      >
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#737373]">
            <div className="w-6 h-6 border-2 border-[#090909] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading candidate records...
          </div>
        ) : error || !app ? (
          <div className="p-6 text-center text-xs text-red-600 bg-red-50 rounded-xl">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="font-semibold">{error || 'Candidate not found'}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Top Candidate Summary Card */}
            <div className="p-4 rounded-2xl bg-[#090909] border border-[#262626] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#171717] border border-[#262626] text-white">
                    {app.domain}
                  </span>
                  <span className="text-xs font-mono text-[#A3A3A3]">{app.reference_code}</span>
                  <span className="text-xs text-[#737373]">• {app.institution}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{app.applicant_name}</h3>
                <div className="flex items-center gap-3 text-xs text-[#A3A3A3]">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-white/70" />
                    {app.applicant_email}
                  </span>
                  {app.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-white/70" />
                      {app.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Stage Selector Pill */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Current Pipeline Stage</span>
                <select
                  value={app.stage}
                  onChange={(e) => handleStageChangeRequest(e.target.value as ApplicationStage)}
                  className="bg-[#1C2541] border border-white/20 text-white text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer focus:border-[#A78BFA]"
                >
                  <option value="APPLIED">Applied</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                  <option value="INTERVIEWED">Interviewed</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            {/* Onboard Success Banner */}
            {onboardSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{onboardSuccessMessage}</span>
              </div>
            )}

            {/* Onboarding Action if Accepted */}
            {app.stage === 'ACCEPTED' && isAdmin && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                  <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Candidate is accepted. Onboard to provision active club member credentials.</span>
                </div>
                <button
                  type="button"
                  onClick={handleOnboardMember}
                  disabled={isOnboarding}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs"
                >
                  {isOnboarding ? 'Onboarding...' : 'Onboard as Member'}
                </button>
              </div>
            )}

            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-[#E5E5E5] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-[#090909] text-[#090909]'
                    : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                Application Details
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('interviews')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'interviews'
                    ? 'border-[#090909] text-[#090909]'
                    : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Interviews ({app.interviews?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('scorecards')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'scorecards'
                    ? 'border-[#090909] text-[#090909]'
                    : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Scorecards ({app.scorecards?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`pb-2.5 px-3 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'border-[#090909] text-[#090909]'
                    : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Decision History ({auditLogs.length})</span>
              </button>
            </div>

            {/* TAB 1: DETAILS */}
            {activeTab === 'details' && (
              <div className="space-y-4 text-xs">
                {/* Skills */}
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
                  <p className="font-bold text-[#171717]">Core Skills & Technologies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {app.skills.length > 0 ? (
                      app.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E5] font-mono text-[11px] text-[#171717]"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#737373]">No specific skills listed</span>
                    )}
                  </div>
                </div>

                {/* Experience */}
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-1.5">
                  <p className="font-bold text-[#171717]">Experience Summary</p>
                  <p className="text-[#737373] leading-relaxed whitespace-pre-line">{app.experience_summary}</p>
                </div>

                {/* Motivation */}
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-1.5">
                  <p className="font-bold text-[#171717]">Motivation & Interests</p>
                  <p className="text-[#737373] leading-relaxed whitespace-pre-line">{app.motivation}</p>
                </div>

                {/* Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {app.portfolio_url && (
                    <a
                      href={app.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#090909] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#171717]" />
                        <span className="font-semibold text-[#171717]">Portfolio Website</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#737373] group-hover:text-[#090909]" />
                    </a>
                  )}

                  {app.github_url && (
                    <a
                      href={app.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white border border-[#E5E5E5] hover:border-[#090909] flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-[#171717]" />
                        <span className="font-semibold text-[#171717]">GitHub Profile</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[#737373] group-hover:text-[#090909]" />
                    </a>
                  )}
                </div>

                {/* Internal Reviewer Notes */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>Internal Evaluation Notes (Strictly Confidential)</span>
                    </div>
                    {noteSuccess && <span className="text-[11px] text-emerald-600 font-bold">Saved!</span>}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter confidential notes, preliminary impressions, or committee observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs bg-white border border-amber-200 rounded-lg p-2.5 text-[#0F172A] focus:outline-none focus:border-amber-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INTERVIEWS */}
            {activeTab === 'interviews' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#0F172A]">Scheduled Interview Rounds</p>
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090909] hover:bg-[#262626] text-white font-bold transition-colors shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule Interview</span>
                  </button>
                </div>

                {(!app.interviews || app.interviews.length === 0) ? (
                  <div className="p-8 text-center text-[#737373] bg-[#FAFAFA] rounded-xl border border-dashed border-[#E5E5E5]">
                    No interviews have been scheduled yet for this candidate.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {app.interviews.map((intv) => (
                      <div
                        key={intv.id}
                        className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#171717] flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#171717]" />
                              {new Date(intv.scheduled_at).toLocaleDateString()} •{' '}
                              {new Date(intv.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                              ({intv.time_zone})
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F5F5] border border-[#E5E5E5] text-[#171717]">
                              {intv.duration_minutes} min
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              {intv.format}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#737373]">
                            {intv.format === 'ONLINE' ? (
                              <a
                                href={intv.meeting_link || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#171717] hover:underline flex items-center gap-1 inline-flex font-medium"
                              >
                                <Video className="w-3 h-3" />
                                {intv.meeting_link || 'Virtual Link'}
                              </a>
                            ) : (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#64748B]" />
                                {intv.venue || 'Campus Venue'}
                              </span>
                            )}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            intv.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {intv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SCORECARDS */}
            {activeTab === 'scorecards' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#171717]">Evaluation Rubric Scorecards</p>
                  <button
                    type="button"
                    onClick={() => setIsScorecardModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090909] hover:bg-[#262626] text-white font-bold transition-colors shadow-xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Add Scorecard</span>
                  </button>
                </div>

                {(!app.scorecards || app.scorecards.length === 0) ? (
                  <div className="p-8 text-center text-[#737373] bg-[#FAFAFA] rounded-xl border border-dashed border-[#E5E5E5]">
                    No evaluation scorecards have been recorded for this candidate yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {app.scorecards.map((sc) => (
                      <div
                        key={sc.id}
                        className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#171717]">Rubric Evaluation</span>
                            <span className="text-[11px] text-[#737373]">
                              • {new Date(sc.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                sc.recommendation === 'STRONG_HIRE' || sc.recommendation === 'HIRE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sc.recommendation === 'NEUTRAL'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {sc.recommendation.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-mono font-extrabold text-[#090909] bg-[#F5F5F5] border border-[#E5E5E5] px-2 py-0.5 rounded">
                              {sc.overall_score} / 5.0
                            </span>
                          </div>
                        </div>

                        {/* 4 Scores Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                            <p className="text-[#64748B]">Technical</p>
                            <p className="font-mono font-bold text-[#0F172A] mt-0.5">{sc.technical_score}/5</p>
                          </div>
                          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                            <p className="text-[#64748B]">Collaboration</p>
                            <p className="font-mono font-bold text-[#0F172A] mt-0.5">{sc.collaboration_score}/5</p>
                          </div>
                          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                            <p className="text-[#64748B]">Communication</p>
                            <p className="font-mono font-bold text-[#0F172A] mt-0.5">{sc.communication_score}/5</p>
                          </div>
                          <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                            <p className="text-[#64748B]">Domain Skill</p>
                            <p className="font-mono font-bold text-[#0F172A] mt-0.5">{sc.domain_skill_score}/5</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="font-bold text-[#0F172A] text-[11px]">Written Evidence</p>
                          <p className="text-[#475569] leading-relaxed bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                            {sc.written_evidence}
                          </p>
                        </div>

                        {sc.internal_notes && (
                          <div className="space-y-1">
                            <p className="font-bold text-amber-800 text-[11px]">Private Committee Notes</p>
                            <p className="text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                              {sc.internal_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AUDIT HISTORY */}
            {activeTab === 'audit' && (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-[#0F172A]">Recruitment Decision Trail</p>
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-[#94A3B8]">No audit history recorded.</div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-[#171717]">
                            {log.action.replace('_', ' ')}
                            {log.from_stage && log.to_stage && (
                              <span className="text-[#090909] font-mono ml-1.5 font-bold">
                                ({log.from_stage} → {log.to_stage})
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[#737373]">{log.reason || 'No comment recorded'}</p>
                        </div>
                        <span className="text-[11px] text-[#737373] shrink-0 font-mono">
                          {new Date(log.created_at).toLocaleString([], {
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
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Decision Confirmation Modal (for ACCEPTED and REJECTED) */}
      {pendingStage && (
        <Modal
          isOpen={Boolean(pendingStage)}
          onClose={() => setPendingStage(null)}
          title={`Confirm ${pendingStage === 'ACCEPTED' ? 'Acceptance' : 'Rejection'}`}
          description={`Please provide explicit committee rationale before moving candidate to ${pendingStage}.`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                pendingStage === 'ACCEPTED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {pendingStage === 'ACCEPTED' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {pendingStage === 'ACCEPTED'
                    ? `Accept ${app?.applicant_name} into club?`
                    : `Reject application for ${app?.applicant_name}?`}
                </p>
                <p className="text-[11px] mt-0.5">
                  This decision will update the candidate status and be logged in the permanent audit trail.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Decision Rationale / Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter committee rationale for this decision..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-2.5 text-[#171717] focus:outline-none focus:border-[#090909] resize-none"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPendingStage(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={pendingStage === 'ACCEPTED' ? 'primary' : 'destructive'}
                onClick={() => {
                  if (!decisionReason.trim()) {
                    alert('Please enter a decision rationale');
                    return;
                  }
                  executeStageChange(pendingStage, decisionReason.trim());
                }}
              >
                Confirm {pendingStage === 'ACCEPTED' ? 'Accept' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sub-modals */}
      {isScheduleModalOpen && app && (
        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          application={app}
          currentUserId={currentUserId}
          userRole={userRole}
          onInterviewScheduled={() => {
            loadData();
            onApplicationUpdated();
          }}
        />
      )}

      {isScorecardModalOpen && app && (
        <ScorecardModal
          isOpen={isScorecardModalOpen}
          onClose={() => setIsScorecardModalOpen(false)}
          application={app}
          interviewId={app.interviews?.[0]?.id || null}
          currentUserId={currentUserId}
          userRole={userRole}
          onScorecardSubmitted={() => {
            loadData();
            onApplicationUpdated();
          }}
        />
      )}
    </>
  );
};
