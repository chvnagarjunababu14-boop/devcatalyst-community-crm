import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { ReportsPage } from '../pages/reports/ReportsPage';

describe('Phase 6: Club Analytics & Intelligence Module (/reports)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('aggregates accurate cross-module intelligence metrics from services', async () => {
    const summary = await analyticsService.getClubAnalyticsSummary('admin-usr-001', 'ADMIN');

    expect(summary).toBeDefined();
    expect(summary.generatedAt).toBeDefined();

    // Projects
    expect(summary.projects.total).toBeGreaterThanOrEqual(1);
    expect(summary.projects.active).toBeGreaterThanOrEqual(1);

    // Tasks
    expect(summary.tasks.total).toBeGreaterThanOrEqual(1);
    expect(summary.tasks.completionRate).toBeGreaterThanOrEqual(0);
    expect(summary.tasks.completionRate).toBeLessThanOrEqual(100);
    expect(summary.tasks.todo + summary.tasks.inProgress + summary.tasks.done).toBe(summary.tasks.total);

    // Events
    expect(summary.events.total).toBeGreaterThanOrEqual(1);
    expect(summary.events.published).toBeGreaterThanOrEqual(1);
    expect(summary.events.totalCapacity).toBeGreaterThan(0);

    // Recruitment
    expect(summary.recruitment.total).toBeGreaterThanOrEqual(1);
    expect(summary.recruitment.acceptanceRate).toBeGreaterThanOrEqual(0);

    // Members
    expect(summary.members.total).toBeGreaterThanOrEqual(1);
    expect(summary.members.active).toBeGreaterThanOrEqual(1);
    expect(summary.members.domainCounts.ENGINEERING).toBeGreaterThanOrEqual(1);
  });

  it('generates a formatted CSV report export without throwing', async () => {
    const summary = await analyticsService.getClubAnalyticsSummary('admin-usr-001', 'ADMIN');

    // Mock document.createElement and appendChild for CSV trigger
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    analyticsService.exportAnalyticsReportCsv(summary);
    expect(clickSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('renders the ReportsPage with KPI widgets, charts, and export action', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <ReportsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Loading transition into rendered analytics
    await waitFor(() => {
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Initiatives')).toBeInTheDocument();
    expect(screen.getByText('Task Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Capacity Utilization')).toBeInTheDocument();
    expect(screen.getByText('Recruitment Selectivity')).toBeInTheDocument();

    // Sections
    expect(screen.getByText('Task Status & Priority Distribution')).toBeInTheDocument();
    expect(screen.getByText('Initiatives & Status Velocity')).toBeInTheDocument();
    expect(screen.getByText('Recruitment Pipeline Conversion Funnel')).toBeInTheDocument();
    expect(screen.getByText('Club Community Domain Breakdown')).toBeInTheDocument();

    // Export Button
    expect(screen.getByText('Export CSV')).toBeInTheDocument();

    // Timeframe filters
    expect(screen.getByText('All Time')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
    expect(screen.getByText('Custom Range')).toBeInTheDocument();
  });

  it('denies participants from querying internal club analytics', async () => {
    await expect(
      analyticsService.getClubAnalyticsSummary('part-usr-999', 'PARTICIPANT')
    ).rejects.toThrow('Unauthorized: Participants cannot access internal club analytics');
  });

  it('rejects invalid date boundaries where startDate is after endDate', async () => {
    await expect(
      analyticsService.getClubAnalyticsSummary('admin-usr-001', 'ADMIN', {
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      })
    ).rejects.toThrow('Invalid date boundary: Start date cannot be after end date');
  });

  it('filters metrics within valid date boundaries', async () => {
    // Querying a narrow future date range with no records
    const futureSummary = await analyticsService.getClubAnalyticsSummary('admin-usr-001', 'ADMIN', {
      startDate: '2028-01-01',
      endDate: '2028-12-31',
    });

    expect(futureSummary.events.total).toBe(0);
    expect(futureSummary.recruitment.total).toBe(0);
    expect(futureSummary.events.capacityUtilizationRate).toBe(0);
    expect(futureSummary.recruitment.acceptanceRate).toBe(0);
  });

  it('safely handles empty datasets without divide-by-zero or NaN errors', async () => {
    // Empty summary representation
    const emptySummary = await analyticsService.getClubAnalyticsSummary('admin-usr-001', 'ADMIN', {
      startDate: '2099-01-01',
      endDate: '2099-01-02',
    });

    expect(emptySummary.tasks.completionRate).toBe(0);
    expect(Number.isNaN(emptySummary.tasks.completionRate)).toBe(false);
    expect(emptySummary.events.capacityUtilizationRate).toBe(0);
    expect(Number.isNaN(emptySummary.events.capacityUtilizationRate)).toBe(false);
    expect(emptySummary.events.attendanceConversionRate).toBe(0);
    expect(Number.isNaN(emptySummary.events.attendanceConversionRate)).toBe(false);
    expect(emptySummary.recruitment.acceptanceRate).toBe(0);
    expect(Number.isNaN(emptySummary.recruitment.acceptanceRate)).toBe(false);
  });

  it('ensures CSV exports contain zero applicant PII or private member records', async () => {
    const summary = await analyticsService.getClubAnalyticsSummary('admin-usr-001', 'ADMIN');

    let capturedBlobContent = '';
    // Mock Blob to capture CSV string
    const originalBlob = globalThis.Blob;
    globalThis.Blob = class MockBlob extends originalBlob {
      constructor(parts: any[], options?: any) {
        super(parts, options);
        capturedBlobContent = parts.join('');
      }
    } as any;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = vi.fn();
      }
      return el;
    });

    analyticsService.exportAnalyticsReportCsv(summary, 'All Time');

    // Verify privacy invariants
    expect(capturedBlobContent).toContain('DevCatalyst Hub — Club Operations & Analytics Intelligence Report');
    expect(capturedBlobContent).toContain('Confidentiality: Internal Aggregated Metrics Only (Zero Personal Data / PII)');
    // Must NOT contain personal candidate applicant emails or phones
    expect(capturedBlobContent).not.toContain('david.kim@university.edu');
    expect(capturedBlobContent).not.toContain('+1 (555) 234-8901');
    expect(capturedBlobContent).not.toContain('priya.sharma@design.org');
    expect(capturedBlobContent).not.toContain('aisha.m@techhub.io');

    globalThis.Blob = originalBlob;
    vi.restoreAllMocks();
  });
});
