import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Construction, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

interface ModuleMetadata {
  title: string;
  phase: string;
  description: string;
  deliverables: string[];
}

const MODULE_DATA: Record<string, ModuleMetadata> = {
  projects: {
    title: 'Project Management & Portfolio',
    phase: 'Phase 3 Target',
    description: 'Create and oversee club technical initiatives, assign project leads, and track team workload.',
    deliverables: [
      'Project CRUD with custom codes (e.g. PRJ-01)',
      'Member assignment and role controls (Lead, Contributor, Viewer)',
      'Project progress and timeline tracking',
      'Row-Level Security isolating project modifications',
    ],
  },
  tasks: {
    title: 'Interactive Kanban Board',
    phase: 'Phase 3 Target',
    description: 'Visual task management across TODO, IN_PROGRESS, and DONE with priorities and assignees.',
    deliverables: [
      '3-Column Kanban board with drag-and-drop',
      'Keyboard-accessible task movement (WCAG AA compliant)',
      'Filter and search by assignee, priority, and milestone',
      'Assignee validation guaranteeing membership in parent project',
    ],
  },
  events: {
    title: 'Community Events & CRM',
    phase: 'Phase 4 Target',
    description: 'Publish workshops, hackathons, and webinars with strict capacity enforcement.',
    deliverables: [
      'Event creation, drafts, and publication workflow',
      'Atomic capacity locking stored procedure (prevents race conditions)',
      'Public & authenticated participant registration',
      'Automatic unique ticket code generation (DC-XXXXXXXX)',
    ],
  },
  registrations: {
    title: 'Attendee Management & Check-In',
    phase: 'Phase 4 Target',
    description: 'Manage registration rosters, export attendee data, and process check-ins.',
    deliverables: [
      'Live attendee roster with search and status filters',
      'One-click event check-in and attendance timestamping',
      'Attendance history linked to participant profiles',
      'Access restricted to Organizers and Admins',
    ],
  },
  members: {
    title: 'Club Member Directory',
    phase: 'Phase 5 Target',
    description: 'Roster of active club contributors, role assignments, and technical portfolios.',
    deliverables: [
      'Searchable member directory with role filter pills',
      'Member contribution statistics and project history',
      'Direct GitHub profile integration',
      'Privacy controls shielding private contact information',
    ],
  },
  recruitment: {
    title: 'Recruitment & Applicant Tracking',
    phase: 'Phase 5 Target',
    description: 'Confidential pipeline tracking candidates across 5 evaluation stages.',
    deliverables: [
      '5-Stage candidate pipeline (Applied, Screening, Interview, Selected, Rejected)',
      'Confidential recruiter notes and interview scoring',
      'Strict Row-Level Security shielding candidate data from standard members',
      'Candidate search and stage transition history',
    ],
  },
  reports: {
    title: 'Club Analytics & Intelligence',
    phase: 'Phase 6 Target',
    description: 'Cross-module data analytics, registration conversion rates, and task metrics.',
    deliverables: [
      'Active project velocity and completion trends',
      'Task status breakdown donut chart with accessible tables',
      'Event capacity utilization and attendance conversion',
      'Recruitment pipeline funnel statistics',
    ],
  },
  settings: {
    title: 'Administration & System Configuration',
    phase: 'Phase 2 / Phase 7',
    description: 'Platform RBAC permissions, audit log inspection, and club parameters.',
    deliverables: [
      'Role assignment controls (restricted to ADMIN)',
      'Audit log trail capturing operational mutations',
      'Environment integration parameters',
      'Security policy verifications',
    ],
  },
};

export const ModulePlaceholderPage: React.FC = () => {
  const location = useLocation();
  const moduleKey = location.pathname.split('/')[1] || 'projects';
  const meta = MODULE_DATA[moduleKey] || {
    title: 'Club Module',
    phase: 'Scheduled Phase',
    description: 'This module is scheduled for implementation in an upcoming phase.',
    deliverables: ['Specification prepared in Phase 1 discovery', 'Database schema defined in migrations'],
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <Card>
        <CardHeader className="text-center pb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] text-[#171717] flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#E5E5E5]">
            <Construction className="w-7 h-7" />
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#171717] text-white border border-[#262626] inline-block mb-2">
            {meta.phase}
          </span>
          <CardTitle className="text-xl md:text-2xl">{meta.title}</CardTitle>
          <CardDescription className="max-w-md mx-auto text-sm">
            {meta.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373] mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#171717]" />
              Architectural Deliverables Defined in Phase 1:
            </h4>
            <ul className="space-y-2">
              {meta.deliverables.map((d, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-[#171717]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>

        <div className="p-5 bg-[#FAFAFA] border-t border-[#E5E5E5] flex justify-center">
          <Link to="/dashboard">
            <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
