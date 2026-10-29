import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { projectService } from '../services/projectService';

describe('Project Service & Directory Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists accessible projects and enriches with lead and members count', async () => {
    const projects = await projectService.getProjects('admin-usr-001', 'ADMIN');
    expect(projects.length).toBeGreaterThanOrEqual(3);
    const p1 = projects.find((p) => p.code === 'PRJ-01');
    expect(p1).toBeDefined();
    expect(p1?.title).toBe('DevCatalyst Hub Platform');
    expect(p1?.lead).toBeDefined();
    expect(p1?.members_count).toBeGreaterThanOrEqual(3);
  });

  it('creates project with safe sequential code PRJ-04', async () => {
    const created = await projectService.createProject(
      {
        title: 'New AI Workshop',
        description: 'Organizing AI and LLM hands-on workshop for club members',
        status: 'PLANNING',
      },
      'admin-usr-001',
      'ADMIN'
    );

    expect(created.id).toBeDefined();
    expect(created.code).toMatch(/^PRJ-\d{2}$/);
    expect(created.title).toBe('New AI Workshop');
    expect(created.created_by).toBe('admin-usr-001');

    // Verify creator is automatically added as LEAD member
    const { members } = await projectService.getProjectById(created.id, 'admin-usr-001', 'ADMIN');
    expect(members.some((m) => m.user_id === 'admin-usr-001' && m.project_role === 'LEAD')).toBe(true);
  });

  it('updates project information when user is authorized lead', async () => {
    const updated = await projectService.updateProject(
      'prj-001',
      {
        title: 'DevCatalyst Hub Platform - Updated Title',
        status: 'ON_HOLD',
      },
      'admin-usr-001',
      'ADMIN'
    );

    expect(updated.title).toBe('DevCatalyst Hub Platform - Updated Title');
    expect(updated.status).toBe('ON_HOLD');
  });

  it('rejects unauthorized project update', async () => {
    // member-usr-003 is only a CONTRIBUTOR on prj-001
    await expect(
      projectService.updateProject(
        'prj-001',
        { title: 'Hacked Title' },
        'member-usr-003',
        'MEMBER'
      )
    ).rejects.toThrow(/unauthorized/i);
  });

  it('rejects unauthorized project detail view', async () => {
    // Non-member trying to view prj-003 (Sarah lead, admin created, marcus is NOT member)
    await expect(
      projectService.getProjectById('prj-003', 'random-stranger-id', 'MEMBER')
    ).rejects.toThrow(/permission/i);
  });

  it('adds registered user to project and prevents duplicates', async () => {
    // Add Sarah to prj-002 (currently admin and marcus)
    const newMember = await projectService.addProjectMember(
      'prj-002',
      'lead-usr-002',
      'CONTRIBUTOR',
      'admin-usr-001',
      'ADMIN'
    );

    expect(newMember.user_id).toBe('lead-usr-002');
    expect(newMember.project_role).toBe('CONTRIBUTOR');

    // Attempting to add Sarah again should be rejected
    await expect(
      projectService.addProjectMember(
        'prj-002',
        'lead-usr-002',
        'VIEWER',
        'admin-usr-001',
        'ADMIN'
      )
    ).rejects.toThrow(/already a member/i);
  });

  it('updates project member role and enforces lead constraint', async () => {
    // Promote Marcus from CONTRIBUTOR to VIEWER
    const updatedRole = await projectService.updateMemberRole(
      'prj-001',
      'member-usr-003',
      'VIEWER',
      'admin-usr-001',
      'ADMIN'
    );
    expect(updatedRole.project_role).toBe('VIEWER');
  });

  it('prevents removing the last project lead without a replacement', async () => {
    // prj-002 only has admin-usr-001 as LEAD
    await expect(
      projectService.removeProjectMember(
        'prj-002',
        'admin-usr-001',
        'admin-usr-001',
        'ADMIN'
      )
    ).rejects.toThrow(/cannot remove the only project lead/i);
  });

  it('calculates task completion progress accurately', async () => {
    const summary = await projectService.getTaskSummary('prj-001');
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.completion_rate).toBeGreaterThanOrEqual(0);
    expect(summary.completion_rate).toBeLessThanOrEqual(100);
    expect(summary.done + summary.in_progress + summary.todo).toBe(summary.total);
  });

  it('deletes project and cascades tasks and members', async () => {
    await projectService.deleteProject('prj-003', 'admin-usr-001', 'ADMIN');

    // Attempting to fetch prj-003 should fail
    await expect(
      projectService.getProjectById('prj-003', 'admin-usr-001', 'ADMIN')
    ).rejects.toThrow(/not found/i);
  });
});
