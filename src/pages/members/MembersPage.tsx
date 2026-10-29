import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Briefcase,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { memberService } from '../../services/memberService';
import type { MemberRecord, ClubDomain, MembershipStatus } from '../../types/database';
import type { Role } from '../../types/auth';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const DOMAIN_OPTIONS: { id: ClubDomain | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Domains' },
  { id: 'ENGINEERING', label: 'Engineering' },
  { id: 'DESIGN', label: 'Design' },
  { id: 'PRODUCT', label: 'Product' },
  { id: 'OUTREACH', label: 'Outreach' },
  { id: 'OPERATIONS', label: 'Operations' },
];

const STATUS_OPTIONS: { id: MembershipStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'ALUMNI', label: 'Alumni' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'PROBATION', label: 'Probation' },
];

const ROLE_OPTIONS: { id: Role | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'ORGANIZER', label: 'Organizer' },
  { id: 'PROJECT_LEAD', label: 'Project Lead' },
  { id: 'MEMBER', label: 'Member' },
];

export const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.activeRole;

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ClubDomain | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<MembershipStatus | 'ALL'>('ALL');
  const [selectedRole, setSelectedRole] = useState<Role | 'ALL'>('ALL');

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await memberService.getMembers(
        {
          search: searchQuery,
          domain: selectedDomain,
          status: selectedStatus,
          role: selectedRole,
        },
        user?.id,
        userRole || undefined
      );
      setMembers(data);
    } catch (err: unknown) {
      console.error('Error fetching members:', err);
      setErrorMessage((err as Error).message || 'Failed to load member directory');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedDomain, selectedStatus, selectedRole, user?.id, userRole]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.membership_status === 'ACTIVE').length;
    const alumni = members.filter((m) => m.membership_status === 'ALUMNI').length;
    const engineering = members.filter((m) => m.domains.includes('ENGINEERING')).length;
    const design = members.filter((m) => m.domains.includes('DESIGN')).length;
    return { total, active, alumni, engineering, design };
  }, [members]);

  const getDomainBadgeColor = (domain: ClubDomain) => {
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

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#F5F5F5] text-[#171717] rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-[#171717] tracking-tight">Member CRM & Directory</h1>
          </div>
          <p className="text-sm text-[#737373] mt-1">
            Community roster, project assignments, domain contributions, and lifecycle records.
          </p>
        </div>

        {(userRole === 'ADMIN' || userRole === 'ORGANIZER') && (
          <Button
            variant="secondary"
            onClick={() => navigate('/recruitment')}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#171717]" />
            Recruitment Pipeline
          </Button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs">
          <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Total Members</p>
          <p className="text-2xl font-bold text-[#171717] mt-1">{metrics.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active Status</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Alumni</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.alumni}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs">
          <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Engineering</p>
          <p className="text-2xl font-bold text-[#171717] mt-1">{metrics.engineering}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-xs">
          <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Design</p>
          <p className="text-2xl font-bold text-[#171717] mt-1">{metrics.design}</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <Card className="p-4 bg-white border border-[#E5E5E5]">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, GitHub handle, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#090909]/10 focus:border-[#090909] bg-[#FAFAFA] hover:bg-white transition-colors"
            />
          </div>

          {/* Domain Dropdown */}
          <div className="w-full md:w-44">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value as ClubDomain | 'ALL')}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-sm bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#090909]/10 focus:border-[#090909]"
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as MembershipStatus | 'ALL')}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-sm bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#090909]/10 focus:border-[#090909]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Role Dropdown */}
          <div className="w-full md:w-40">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role | 'ALL')}
              className="w-full px-3 py-2 border border-[#E5E5E5] rounded-lg text-sm bg-white text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#090909]/10 focus:border-[#090909]"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Member Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white border border-[#E5E5E5] rounded-xl animate-pulse p-5">
              <div className="flex gap-3 items-center mb-4">
                <div className="w-12 h-12 bg-[#F5F5F5] rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#F5F5F5] rounded w-2/3" />
                  <div className="h-3 bg-[#F5F5F5] rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-[#F5F5F5] rounded w-full mb-2" />
              <div className="h-3 bg-[#F5F5F5] rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <Card className="p-8 text-center text-red-600 bg-red-50 border-red-200">
          <p className="font-semibold mb-2">Unable to load members</p>
          <p className="text-sm">{errorMessage}</p>
          <Button variant="secondary" onClick={fetchMembers} className="mt-4">
            Retry
          </Button>
        </Card>
      ) : members.length === 0 ? (
        <Card className="p-12 text-center bg-white border-[#E5E5E5]">
          <div className="w-12 h-12 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-3 text-[#737373]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#171717]">No members match your criteria</h3>
          <p className="text-sm text-[#737373] mt-1 max-w-sm mx-auto">
            Try adjusting your search terms, domain filters, or membership status.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchQuery('');
              setSelectedDomain('ALL');
              setSelectedStatus('ALL');
              setSelectedRole('ALL');
            }}
            className="mt-4 text-[#171717]"
          >
            Clear All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              onClick={() => navigate(`/members/${member.id}`)}
              className="bg-white border border-[#E5E5E5] hover:border-[#404040] rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Top: Avatar, Name, Role & Status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#171717] text-white border border-[#262626] flex items-center justify-center font-bold text-base overflow-hidden shrink-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-full h-full object-cover"
                        />
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
                      <h3 className="font-semibold text-[#171717] group-hover:text-black transition-colors line-clamp-1">
                        {member.full_name}
                      </h3>
                      <p className="text-xs text-[#737373] font-mono line-clamp-1">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(member.membership_status)}</div>
                </div>

                {/* Roles and Domains */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {member.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F5F5F5] text-[#171717] border border-[#E5E5E5]"
                    >
                      {role.replace('_', ' ')}
                    </span>
                  ))}
                  {member.domains.map((dom) => (
                    <span
                      key={dom}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${getDomainBadgeColor(
                        dom
                      )}`}
                    >
                      {dom}
                    </span>
                  ))}
                </div>

                {/* Bio snippet */}
                {member.bio && (
                  <p className="text-xs text-[#737373] line-clamp-2 mb-3">
                    {member.bio}
                  </p>
                )}

                {/* Skills tags */}
                {member.skills && member.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {member.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-[#FAFAFA] text-[#737373] px-2 py-0.5 rounded border border-[#E5E5E5]"
                      >
                        {skill}
                      </span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="text-[10px] text-[#A3A3A3] self-center">
                        +{member.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer: Projects & Joined */}
              <div className="pt-3 border-t border-[#F5F5F5] flex items-center justify-between text-xs text-[#737373]">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#737373]" />
                  <span>
                    {member.projects && member.projects.length > 0
                      ? `${member.projects.length} project${
                          member.projects.length === 1 ? '' : 's'
                        }`
                      : 'No active projects'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#737373] group-hover:text-[#171717] font-medium">
                  <span>View Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
