import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { KanbanBoardPage } from './pages/projects/KanbanBoardPage';
import { MyTasksPage } from './pages/tasks/MyTasksPage';
import { EventsPage } from './pages/events/EventsPage';
import { EventDetailPage } from './pages/events/EventDetailPage';
import { RegistrationsPage } from './pages/registrations/RegistrationsPage';
import { PublicApplicationPage } from './pages/recruitment/PublicApplicationPage';
import { RecruitmentPipelinePage } from './pages/recruitment/RecruitmentPipelinePage';
import { MembersPage } from './pages/members/MembersPage';
import { MemberDetailPage } from './pages/members/MemberDetailPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Discovery Pages (PublicLayout with PublicNavbar & PublicFooter) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/apply" element={<PublicApplicationPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/:id" element={<MemberDetailPage />} />
          </Route>

          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Authenticated Internal Workspace (AppLayout with Sidebar, Header & Workspace Navigation) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Project Management & Kanban (Phase 3) */}
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/board" element={<KanbanBoardPage />} />
            <Route path="/tasks" element={<MyTasksPage />} />

            {/* Registrations Management (Phase 4: Admin, Lead, Organizer) */}
            <Route
              path="/registrations"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'PROJECT_LEAD']}>
                  <RegistrationsPage />
                </ProtectedRoute>
              }
            />

            {/* Recruitment Pipeline (Phase 5: Admin, Lead, Organizer) */}
            <Route
              path="/recruitment"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'PROJECT_LEAD']}>
                  <RecruitmentPipelinePage />
                </ProtectedRoute>
              }
            />

            {/* Club Analytics & Intelligence (Phase 6: Admin, Organizer, Lead, Member) */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'PROJECT_LEAD', 'MEMBER']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Platform Administration & System Settings (Phase 7: Admin, Organizer) */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
