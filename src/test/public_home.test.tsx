import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { PublicLayout } from '../components/layout/PublicLayout';
import { HomePage } from '../pages/home/HomePage';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { PublicApplicationPage } from '../pages/recruitment/PublicApplicationPage';
import { eventService } from '../services/eventService';
import { memberService } from '../services/memberService';
import { projectService } from '../services/projectService';
import { recruitmentService } from '../services/recruitmentService';

describe('Public Homepage & Club Discovery Experience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the public homepage at / without authentication', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify Hero headline
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Build.\s*Innovate.\s*Belong./i);
    });

    // Verify key action links exist
    expect(screen.getByRole('link', { name: /Explore Upcoming Events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Meet Our Community/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Join/i }).length).toBeGreaterThan(0);
  });

  it('provides public navbar with working anchors and sign-in action', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/DevCatalyst/i).length).toBeGreaterThan(0);
    });

    // Public navbar links
    expect(screen.getByRole('link', { name: /^Home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^About$/i })).toHaveAttribute('href', '/#about');
    expect(screen.getByRole('link', { name: /^Events$/i })).toHaveAttribute('href', '/#events');
    expect(screen.getByRole('link', { name: /^Members$/i })).toHaveAttribute('href', '/#members');
    expect(screen.getByRole('link', { name: /^Projects$/i })).toHaveAttribute('href', '/#projects');

    // Sign in link leads to /login
    const signInLinks = screen.getAllByRole('link', { name: /Sign In/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');
  });

  it('fetches only published public events and hides draft/internal events', async () => {
    const publicEvents = await eventService.getEvents({ status: 'PUBLISHED' }, undefined, undefined);
    expect(publicEvents.length).toBeGreaterThan(0);
    expect(publicEvents.every((e) => e.status === 'PUBLISHED' && e.is_public)).toBe(true);

    // Omit DRAFT events for anonymous visitors
    const draftEvents = await eventService.getEvents({ status: 'DRAFT' }, undefined, undefined);
    expect(draftEvents.length).toBe(0);
  });

  it('fetches privacy-safe public member showcase omitting phone and private email', async () => {
    const members = await memberService.getPublicFeaturedMembers(6);
    expect(members.length).toBeGreaterThan(0);

    for (const m of members) {
      expect(m.full_name).toBeDefined();
      expect(m.primary_role).toBeDefined();
      expect(m.skills).toBeInstanceOf(Array);
      // Privacy invariant: phone and raw email are strictly omitted from public showcase
      expect((m as any).phone).toBeUndefined();
      expect((m as any).email).toBeUndefined();
      expect((m as any).internal_notes).toBeUndefined();
    }
  });

  it('exposes approved public projects without leaking internal tasks or contact info', async () => {
    const publicProjects = await projectService.getPublicProjects();
    expect(publicProjects.length).toBeGreaterThan(0);

    for (const p of publicProjects) {
      expect(p.id).toBeDefined();
      expect(p.code).toMatch(/^PRJ-\d{2}$/);
      expect(p.title).toBeDefined();
      expect(p.members_count).toBeGreaterThanOrEqual(0);
      // Privacy invariant: no internal task arrays or personal contact info
      expect((p as any).tasks).toBeUndefined();
      expect((p as any).lead_phone).toBeUndefined();
      expect((p as any).lead_email).toBeUndefined();
    }
  });

  it('displays accurate recruitment status and application action in Join CTA', async () => {
    const activeCycle = await recruitmentService.getActiveCycle();

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ready to Build With Us\?/i)).toBeInTheDocument();
    });

    if (activeCycle) {
      expect(screen.getAllByText(new RegExp(activeCycle.title, 'i')).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: /Apply to DevCatalyst Club/i })).toHaveAttribute('href', '/apply');
  });

  it('guarantees that protected workspace routes remain guarded', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Member Login Screen</div>} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Unauthenticated access to /dashboard must redirect to /login
    await waitFor(() => {
      expect(screen.getByText('Member Login Screen')).toBeInTheDocument();
    });
  });

  it('renders /apply strictly inside PublicLayout without internal workspace sidebar, header, or config banner', async () => {
    render(
      <MemoryRouter initialEntries={['/apply']}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/apply" element={<PublicApplicationPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // 1. Verify Public Navigation and Footer are mounted
    await waitFor(() => {
      expect(screen.getAllByText(/DevCatalyst/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('link', { name: /^Home$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^About$/i })).toHaveAttribute('href', '/#about');
    expect(screen.getByRole('link', { name: /^Events$/i })).toHaveAttribute('href', '/#events');
    expect(screen.getAllByRole('link', { name: /Sign In/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Back to top of page/i })).toBeInTheDocument();

    // 2. Verify Application Form content is mounted
    expect(screen.getByText(/Application Form/i)).toBeInTheDocument();
    expect(screen.getByText(/DevCatalyst Club Recruitment/i)).toBeInTheDocument();

    // 3. Invariant: Internal Workspace Sidebar items MUST NOT be present
    expect(screen.queryByText('Public Website')).not.toBeInTheDocument();
    expect(screen.queryByText('My Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Recruitment Pipeline')).not.toBeInTheDocument();

    // 4. Invariant: Internal Header search / notifications MUST NOT be present
    expect(screen.queryByPlaceholderText(/Search projects, tasks, events/i)).not.toBeInTheDocument();

    // 5. Invariant: Production Misconfiguration alert banner MUST NOT be present on public apply
    expect(screen.queryByText(/Production Configuration Required/i)).not.toBeInTheDocument();
  });

  it('allows anonymous visitor to submit an application on /apply and receive a reference code', async () => {
    render(
      <MemoryRouter initialEntries={['/apply']}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/apply" element={<PublicApplicationPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });

    // Fill application form
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Jane Anonymous Applicant' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'jane.anonymous@example.edu' },
    });
    fireEvent.change(screen.getByLabelText(/Institution/i), {
      target: { value: 'University of Technology' },
    });
    fireEvent.change(screen.getByLabelText(/Experience Summary/i), {
      target: { value: '3 years of web development in TypeScript and React.' },
    });
    fireEvent.change(screen.getByLabelText(/Motivation Statement/i), {
      target: { value: 'I want to build open source technology with DevCatalyst Club.' },
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Submit Application/i });
    fireEvent.click(submitBtn);

    // Verify submission confirmation view
    await waitFor(() => {
      expect(screen.getByText(/Application Successfully Submitted!/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Your Safe Application Reference/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Anonymous Applicant/i)).toBeInTheDocument();
  });

  it('renders official DevCatalyst logo with valid asset paths and accessible alt text', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      const logos = screen.getAllByAltText('DevCatalyst Club logo');
      expect(logos.length).toBeGreaterThanOrEqual(2); // Navbar, Footer, and Hero
      for (const logo of logos) {
        expect(logo).toHaveAttribute('src', '/brand/devcatalyst-logo.jpg');
      }
    });
  });
});
