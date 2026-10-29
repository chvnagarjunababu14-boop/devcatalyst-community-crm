import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  Code2,
  Calendar,
  Briefcase,
  GraduationCap,
  Shield,
  Tag,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Award,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { memberService } from '../../services/memberService';
import type {
  MemberRecord,
  ClubDomain,
  MembershipStatus,
} from '../../types/database';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

const ALL_DOMAINS: ClubDomain[] = ['ENGINEERING', 'DESIGN', 'PRODUCT', 'OUTREACH', 'OPERATIONS'];
const ALL_STATUSES: MembershipStatus[] = ['ACTIVE', 'ALUMNI', 'INACTIVE', 'PROBATION'];

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [member, setMember] = useState<MemberRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status edit modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus>('ACTIVE');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Domains edit modal
  const [isDomainsModalOpen, setIsDomainsModalOpen] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState<ClubDomain[]>([]);
  const [isSavingDomains, setIsSavingDomains] = useState(false);

  const isAdmin = userRole === 'ADMIN' || userRole === 'ORGANIZER';

  const loadMember = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await memberService.getMemberById(id, user?.id, userRole || undefined);
      if (!data) {
        setErrorMessage('Member not found');
      } else {
        setMember(data);
        setSelectedStatus(data.membership_status);
        setSelectedDomains(data.domains);
      }
    } catch (err: unknown) {
      console.error('Failed to load member details:', err);
      setErrorMessage((err as Error).message || 'Failed to fetch member');
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.id, userRole]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleUpdateStatus = async () => {
    if (!member || !user) return;
    try {
      setIsSavingStatus(true);
      await memberService.updateMemberStatus(member.id, selectedStatus, user.id, userRole || undefined);
      setMember((prev) => (prev ? { ...prev, membership_status: selectedStatus } : null));
      setIsStatusModalOpen(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update status');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleUpdateDomains = async () => {
    if (!member || !user) return;
    try {
      setIsSavingDomains(true);
      await memberService.updateMemberDomains(member.id, selectedDomains, user.id, userRole || undefined);
      setMember((prev) => (prev ? { ...prev, domains: selectedDomains } : null));
      setIsDomainsModalOpen(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update domains');
    } finally {
      setIsSavingDomains(false);
    }
  };

  const toggleDomain = (domain: ClubDomain) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const getDomainColor = (domain: ClubDomain) => {
    switch (domain) {
      case 'ENGINEERING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DESIGN':
        return 'bg-[#F5F5F5] text-[#171717] border-[#E5E5E5]';
      case 'PRODUCT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OUTREACH':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'OPERATIONS':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadge = (status: MembershipStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'ALUMNI':
        return <Badge variant="neutral">Alumni</Badge>;
      case 'PROBATION':
        return <Badge variant="warning">Probation</Badge>;
      case 'INACTIVE':
        return <Badge variant="urgent">Inactive</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-32" />
        <div className="h-56 bg-white border border-slate-200 rounded-2xl p-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
          <div className="md:col-span-2 h-64 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (errorMessage || !member) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Member Record Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">{errorMessage || 'The requested member could not be located.'}</p>
        <Button variant="secondary" onClick={() => navigate('/members')}>
          Return to Member Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/members')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Member Directory
        </button>
      </div>

      {/* Member Hero Header */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-[#171717] text-white border-2 border-[#262626] flex items-center justify-center font-bold text-2xl overflow-hidden shadow-xs shrink-0">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
              ) : (
                member.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{member.full_name}</h1>
                {getStatusBadge(member.membership_status)}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {member.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F5F5F5] text-[#171717] border border-[#E5E5E5]"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {role.replace('_', ' ')}
                  </span>
                ))}

                {member.department && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 ml-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {member.department} {member.year_of_study ? `• ${member.year_of_study}` : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{member.email}</span>
                </div>

                {member.phone ? (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400" title="Contact number protected">
                    <Lock className="w-3.5 h-3.5 text-slate-300" />
                    <span className="italic">Phone Protected</span>
                  </div>
                )}

                {member.github_handle && (
                  <a
                    href={`https://github.com/${member.github_handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>@{member.github_handle}</span>
                  </a>
                )}

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Management Actions */}
          {isAdmin && (
            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsStatusModalOpen(true)}
                className="flex items-center gap-1.5 text-xs justify-center"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Change Status
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDomainsModalOpen(true)}
                className="flex items-center gap-1.5 text-xs justify-center"
              >
                <Tag className="w-3.5 h-3.5" />
                Edit Domains
              </Button>
            </div>
          )}
        </div>

        {member.bio && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-sm text-slate-700 leading-relaxed">
            {member.bio}
          </div>
        )}
      </Card>

      {/* Grid: Details, Projects, and Participation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Domains, Skills & Interests */}
        <div className="space-y-6">
          <Card className="p-5 bg-white border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#171717]" />
              Club Domains
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {member.domains.map((dom) => (
                <span
                  key={dom}
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getDomainColor(
                    dom
                  )}`}
                >
                  {dom}
                </span>
              ))}
            </div>

            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mt-6 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#171717]" />
              Technical Skills
            </h3>
            {member.skills && member.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No skills listed</p>
            )}

            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mt-6 mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#171717]" />
              Interests & Focus
            </h3>
            {member.interests && member.interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#F5F5F5] text-[#171717] px-2.5 py-1 rounded-md border border-[#E5E5E5] font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No interests listed</p>
            )}
          </Card>

          {/* Activity summary */}
          <Card className="p-5 bg-white border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Participation Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Active Projects:</span>
                <span className="font-semibold text-slate-800">{member.projects?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Event Check-ins:</span>
                <span className="font-semibold text-emerald-700">
                  {member.event_attendance_count ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Club Lifecycle:</span>
                <span className="font-semibold text-slate-800">{member.membership_status}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Project Memberships & Work History */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Project Assignments</h2>
                <p className="text-xs text-slate-500">Active and past project team involvement</p>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                {member.projects?.length || 0} Projects
              </span>
            </div>

            {member.projects && member.projects.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {member.projects.map((proj) => (
                  <div key={proj.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#F5F5F5] text-[#171717] rounded-lg">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <Link
                          to={`/projects/${proj.id}`}
                          className="font-semibold text-slate-800 hover:text-[#090909] text-sm transition-colors"
                        >
                          {proj.title}
                        </Link>
                        <p className="text-xs text-slate-400 font-mono">{proj.code}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        proj.project_role === 'LEAD'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {proj.project_role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No project memberships recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assign this member to projects from the Projects workspace.
                </p>
              </div>
            )}
          </Card>

          {/* Event Participation Card */}
          <Card className="p-6 bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Event Attendance History</h2>
                <p className="text-xs text-slate-500">Verified club session and workshop attendance</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                {member.event_attendance_count ?? 0} Attended
              </span>
            </div>

            {(member.event_attendance_count ?? 0) > 0 ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Verified Attendee</p>
                  <p>
                    This member has verified participation across {member.event_attendance_count} club events
                    or workshops.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">No event check-ins recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  Attendance is logged via QR code scanner at club events.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Admin Modal: Edit Status */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Update Status: ${member.full_name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Modify the member's lifecycle status in DevCatalyst Club:
          </p>
          <div className="space-y-2">
            {ALL_STATUSES.map((status) => (
              <label
                key={status}
                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${
                  selectedStatus === status
                    ? 'border-[#090909] bg-[#F5F5F5] ring-1 ring-[#090909]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={selectedStatus === status}
                    onChange={() => setSelectedStatus(status)}
                    className="text-[#090909] focus:ring-[#090909]"
                  />
                  <span className="font-medium text-slate-800 text-sm">{status}</span>
                </div>
                {getStatusBadge(status)}
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateStatus} disabled={isSavingStatus}>
              {isSavingStatus ? 'Updating...' : 'Save Status'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin Modal: Edit Domains */}
      <Modal
        isOpen={isDomainsModalOpen}
        onClose={() => setIsDomainsModalOpen(false)}
        title={`Edit Domains: ${member.full_name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select the club functional domains this member is affiliated with:
          </p>
          <div className="space-y-2">
            {ALL_DOMAINS.map((dom) => (
              <label
                key={dom}
                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${
                  selectedDomains.includes(dom)
                    ? 'border-[#090909] bg-[#F5F5F5] ring-1 ring-[#090909]'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDomains.includes(dom)}
                    onChange={() => toggleDomain(dom)}
                    className="text-[#090909] rounded focus:ring-[#090909]"
                  />
                  <span className="font-medium text-slate-800 text-sm">{dom}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${getDomainColor(dom)}`}>
                  {dom}
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDomainsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateDomains}
              disabled={isSavingDomains || selectedDomains.length === 0}
            >
              {isSavingDomains ? 'Saving...' : 'Save Domains'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
