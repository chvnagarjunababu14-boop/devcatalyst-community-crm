import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Globe,
  Video,
  Users,
  Ticket,
  QrCode,
  Edit,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  Search,
  Check,
  Ban,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/eventService';
import { registrationService } from '../../services/registrationService';
import { attendanceService } from '../../services/attendanceService';
import type {
  EventItem,
  Registration,
  EventStatus,
  EventFormat,
} from '../../types/database';
import { RegisterModal } from '../../components/events/RegisterModal';
import { TicketModal } from '../../components/events/TicketModal';
import { EditEventModal } from '../../components/events/EditEventModal';
import { AttendanceScannerModal } from '../../components/attendance/AttendanceScannerModal';

export const EventDetailPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userRole = user?.activeRole;
  const isOrganizer = userRole === 'ADMIN' || userRole === 'PROJECT_LEAD' || userRole === 'ORGANIZER';

  // Data states
  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'roster'>('overview');

  // Roster search & filter
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'ATTENDED' | 'CANCELLED'>('ALL');

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [viewTicketData, setViewTicketData] = useState<{ registration: Registration; event: EventItem } | null>(null);

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load Event and Registrations
  const loadEventData = useCallback(async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      setError(null);

      const evt = await eventService.getEventById(eventId, user?.id, userRole);
      if (!evt) {
        setError('Event not found or has been removed.');
        return;
      }
      setEvent(evt);

      // Fetch registrations if user is an organizer, or check if current user is registered
      if (isOrganizer) {
        const regs = await registrationService.getRegistrations({ eventId }, user?.id, userRole);
        setRegistrations(regs);
      }

      // Check current user's registration
      if (user?.email) {
        const userEmail = user.email.toLowerCase();
        const allUserRegs = await registrationService.getRegistrations(
          { eventId },
          user?.id,
          userRole
        );
        const match = allUserRegs.find(
          (r) => r.participant_email.toLowerCase() === userEmail && r.status !== 'CANCELLED'
        );
        setUserRegistration(match || null);
      }
    } catch (err: unknown) {
      console.error('Failed to load event details:', err);
      setError((err as Error).message || 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, user, userRole, isOrganizer]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Countdown calculations
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!event) return;

    const calculateTime = () => {
      const diff = new Date(event.start_time).getTime() - new Date().getTime();
      if (diff <= 0) {
        setCountdown(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [event]);

  // Manual Check-in Handler
  const handleManualCheckIn = async (regId: string) => {
    if (!event) return;
    try {
      const res = await attendanceService.manualCheckIn(event.id, regId, user?.id, 'Manual roster check-in');
      if (res.success) {
        setActionSuccess(`Successfully checked in ${res.registration?.participant_name}`);
        loadEventData();
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        alert(res.message);
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Cancel Registration Handler
  const handleCancelRegistration = async (regId: string) => {
    if (!confirm('Are you sure you want to cancel this registration?')) return;
    try {
      await registrationService.cancelRegistration(regId, userRole);
      setActionSuccess('Registration cancelled successfully.');
      loadEventData();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Reactivate Registration Handler
  const handleReactivateRegistration = async (regId: string) => {
    try {
      await registrationService.reactivateRegistration(regId, userRole);
      setActionSuccess('Registration reactivated successfully with a refreshed ticket token.');
      loadEventData();
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return registrations.filter((r) => {
      if (rosterStatusFilter !== 'ALL' && r.status !== rosterStatusFilter) return false;
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const matchName = r.participant_name.toLowerCase().includes(q);
        const matchEmail = r.participant_email.toLowerCase().includes(q);
        const matchCode = r.ticket_code.toLowerCase().includes(q);
        const matchInst = r.institution?.toLowerCase().includes(q);
        return matchName || matchEmail || matchCode || matchInst;
      }
      return true;
    });
  }, [registrations, rosterStatusFilter, rosterSearch]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#171717] border-t-transparent animate-spin" />
        <p className="text-xs text-[#737373]">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-white rounded-2xl border border-[#E5E5E5] shadow-xs">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#171717]">Event Not Found</h2>
        <p className="text-sm text-[#737373] mt-1">{error || 'This event does not exist or has been removed.'}</p>
        <button
          onClick={() => navigate('/events')}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events Directory
        </button>
      </div>
    );
  }

  const registeredCount = event.registered_count || registrations.filter((r) => r.status !== 'CANCELLED').length;
  const remainingSeats = Math.max(0, event.capacity - registeredCount);
  const isFull = remainingSeats <= 0;
  const isPastDeadline =
    event.registration_deadline && new Date(event.registration_deadline) < new Date();
  const canRegister = event.status === 'PUBLISHED' && !isFull && !isPastDeadline && !userRegistration;

  const attendedCount = registrations.filter((r) => r.status === 'ATTENDED').length;

  const getFormatBadge = (format: EventFormat) => {
    switch (format) {
      case 'IN_PERSON':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MapPin className="w-3.5 h-3.5" /> In Person
          </span>
        );
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Video className="w-3.5 h-3.5" /> Online Virtual
          </span>
        );
      case 'HYBRID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F5F5F5] text-[#171717] border border-[#E5E5E5]">
            <Globe className="w-3.5 h-3.5" /> Hybrid In-Person & Online
          </span>
        );
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Draft Mode
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            Event Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            Cancelled
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Back Breadcrumb navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#737373] hover:text-[#171717] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </Link>

        {isOrganizer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-[#262626] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-white" />
              <span>Door Check-in Scanner</span>
            </button>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#171717] text-xs font-semibold transition-colors shadow-xs"
            >
              <Edit className="w-3.5 h-3.5 text-[#171717]" />
              <span>Edit Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold">{actionSuccess}</p>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Card */}
      <div className="rounded-3xl border border-[#E5E5E5] bg-white overflow-hidden shadow-xs">
        {/* Banner with dark cinematic overlay */}
        <div className="relative h-64 md:h-80 w-full bg-[#090909]">
          {event.banner_url ? (
            <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-[#090909] via-[#171717] to-[#262626] flex items-center justify-center">
              <Sparkles className="w-16 h-16 text-white/20" />
            </div>
          )}

          {/* Deep gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-[#090909]/60 to-transparent" />

          {/* Top floating badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getFormatBadge(event.format)}
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-[#0F172A] shadow-xs">
                {event.event_type}
              </span>
            </div>
            <div>{getStatusBadge(event.status)}</div>
          </div>

          {/* Bottom Hero Info */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm max-w-3xl">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-[#E2E8F0]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#A78BFA]" />
                <span>
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  • {new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} -{' '}
                  {new Date(event.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>

              {(event.venue || event.meeting_link) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#A78BFA]" />
                  <span>{event.venue || 'Virtual Meeting Room'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Control Bar & Urgency Countdown */}
        <div className="p-6 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Countdown & Deadline Status */}
          <div className="flex items-center gap-4 flex-wrap">
            {countdown ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Starts in:</span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0F172A]">
                  <span className="px-2 py-1 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">{countdown.days}d</span>
                  <span>:</span>
                  <span className="px-2 py-1 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">{countdown.hours}h</span>
                  <span>:</span>
                  <span className="px-2 py-1 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">{countdown.minutes}m</span>
                  <span>:</span>
                  <span className="px-2 py-1 bg-white border border-[#E2E8F0] rounded-lg shadow-xs">{countdown.seconds}s</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-[#737373]">
                <Clock className="w-4 h-4 text-[#171717]" />
                <span>Registration Deadline: {new Date(event.registration_deadline).toLocaleDateString()}</span>
              </div>
            )}

            <div className="h-4 w-px bg-[#CBD5E1] hidden sm:block" />

            {/* Capacity Meter */}
            <div className="flex items-center gap-2 text-xs font-medium text-[#737373]">
              <Users className="w-4 h-4 text-[#171717]" />
              <span>
                <strong>{registeredCount}</strong> / {event.capacity} registered
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {isFull ? 'Sold Out' : `${remainingSeats} seats available`}
              </span>
            </div>
          </div>

          {/* Registration CTA or Registered Confirmation */}
          <div className="flex items-center gap-3">
            {userRegistration ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-[#171717] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#171717]" />
                  <span>You're Registered! ({userRegistration.ticket_code})</span>
                </div>
                <button
                  onClick={() => setViewTicketData({ registration: userRegistration, event })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>View Ticket Pass</span>
                </button>
              </div>
            ) : canRegister ? (
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-sm font-bold shadow-xs transition-transform active:scale-95"
              >
                <Ticket className="w-4 h-4" />
                <span>Register for Event</span>
              </button>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-[#E5E5E5] text-[#737373] text-xs font-bold">
                {event.status !== 'PUBLISHED'
                  ? `Status: ${event.status}`
                  : isFull
                  ? 'Capacity Reached (Sold Out)'
                  : isPastDeadline
                  ? 'Registration Closed'
                  : 'Registrations Unavailable'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Switcher (Visible to Organizers: Overview & Attendee Roster) */}
      {isOrganizer && (
        <div className="flex items-center gap-2 border-b border-[#E5E5E5]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#171717] text-[#171717]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
          >
            Event Overview & Details
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'border-[#171717] text-[#171717]'
                : 'border-transparent text-[#737373] hover:text-[#171717]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Attendee Roster</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#171717] text-white">
              {registrations.length}
            </span>
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Description & Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#171717]">About This Event</h2>
              <div className="text-sm text-[#404040] leading-relaxed whitespace-pre-line">
                {event.description || 'No detailed description has been published for this event.'}
              </div>

              {/* Event format notes */}
              <div className="pt-4 border-t border-[#F5F5F5] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                  <p className="text-xs font-semibold text-[#737373] uppercase">Event Format</p>
                  <p className="text-sm font-bold text-[#171717] mt-1">{event.format.replace('_', ' ')}</p>
                  <p className="text-xs text-[#737373] mt-0.5">
                    {event.format === 'IN_PERSON'
                      ? 'Requires physical check-in at the venue desk'
                      : event.format === 'ONLINE'
                      ? 'Conducted virtually via live stream / meeting room'
                      : 'Hybrid attendance available in-person or remotely'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                  <p className="text-xs font-semibold text-[#737373] uppercase">Admission Policy</p>
                  <p className="text-sm font-bold text-[#171717] mt-1">
                    {event.is_public ? 'Public Registration' : 'Club Members Only'}
                  </p>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Admission verified using secure QR code and ticket code at the entrance.
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Joining Instructions */}
            <div className="p-6 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-3.5">
              <h2 className="text-base font-bold text-[#171717]">Location & Access</h2>

              {event.venue && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                  <MapPin className="w-5 h-5 text-[#171717] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#171717]">Physical Venue</p>
                    <p className="text-xs text-[#737373] mt-0.5">{event.venue}</p>
                    <p className="text-[11px] text-[#737373] mt-1">
                      Please arrive 15 minutes before scheduled start time with your QR ticket ready on mobile or printed pass.
                    </p>
                  </div>
                </div>
              )}

              {event.meeting_link && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <Video className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900">Virtual Meeting Access</p>
                    <p className="text-xs text-blue-800 mt-0.5">
                      {event.meeting_link}
                    </p>
                    <a
                      href={event.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                    >
                      <span>Join Meeting Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Metadata & Quick Info */}
          <div className="space-y-6">
            {/* Quick Registration Status Card */}
            <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Registration Summary</h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Capacity:</span>
                  <span className="font-mono font-bold text-[#0F172A]">{event.capacity} seats</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Registered:</span>
                  <span className="font-mono font-bold text-[#0F172A]">{registeredCount}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Remaining Seats:</span>
                  <span className="font-mono font-bold text-emerald-600">{remainingSeats}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Deadline:</span>
                  <span className="font-medium text-[#0F172A]">
                    {new Date(event.registration_deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {canRegister && (
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Register Now</span>
                </button>
              )}
            </div>

            {/* Associated Project */}
            {event.project && (
              <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#737373] uppercase">
                  <FolderGit2 className="w-4 h-4 text-[#171717]" />
                  <span>Associated Project</span>
                </div>

                <p className="font-bold text-sm text-[#171717]">{event.project.title}</p>
                <p className="text-xs font-mono text-[#171717]">{event.project.code}</p>

                <Link
                  to={`/projects/${event.project.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#171717] hover:underline pt-1"
                >
                  <span>Open Project Workspace</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-4 rounded-2xl bg-[#171717] text-white space-y-2 border border-[#262626]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="text-xs font-bold">Secure Attendance Verification</span>
              </div>
              <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                Tickets contain cryptographic verification tokens. Only authorized club staff can validate QR passes
                and record check-in timestamps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDEE ROSTER (Organizers Only) */}
      {isOrganizer && activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Roster Controls & Metrics */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or ticket code..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-xs text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#171717]"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {(['ALL', 'CONFIRMED', 'ATTENDED', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRosterStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    rosterStatusFilter === st
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Quick Check-in Scanner Button */}
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Door Scanner</span>
            </button>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between text-xs text-[#737373] font-medium">
              <span>Showing {filteredRoster.length} attendee records</span>
              <div className="flex items-center gap-3">
                <span>
                  Attended:{' '}
                  <strong className="text-emerald-700 font-bold">{attendedCount}</strong>
                </span>
                <span>•</span>
                <span>
                  Remaining:{' '}
                  <strong className="text-[#171717] font-bold">
                    {Math.max(0, registeredCount - attendedCount)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-[#737373] border-b border-[#E5E5E5] uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Institution / Contact</th>
                    <th className="py-3 px-4 font-mono">Ticket Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registration Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#A3A3A3]">
                        No attendee registrations match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((r) => {
                      const isAttended = r.status === 'ATTENDED';
                      const isCancelled = r.status === 'CANCELLED';

                      return (
                        <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-[#171717]">{r.participant_name}</p>
                            <p className="text-[11px] text-[#737373]">{r.participant_email}</p>
                          </td>
                          <td className="py-3.5 px-4 text-[#737373]">
                            <p>{r.institution || '—'}</p>
                            <p className="text-[11px] text-[#A3A3A3]">{r.participant_phone || ''}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#171717]">
                            {r.ticket_code}
                          </td>
                          <td className="py-3.5 px-4">
                            {isAttended ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3" /> Attended
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                <Ban className="w-3 h-3" /> Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Confirmed
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[#737373] text-[11px]">
                            {new Date(r.registered_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Ticket pass */}
                              <button
                                onClick={() => setViewTicketData({ registration: r, event })}
                                className="p-1.5 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5]/50 transition-colors"
                                title="View Ticket"
                              >
                                <Ticket className="w-4 h-4 text-[#171717]" />
                              </button>

                              {/* Manual Check-in */}
                              {!isAttended && !isCancelled && (
                                <button
                                  onClick={() => handleManualCheckIn(r.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors"
                                  title="Check in attendee"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Check In</span>
                                </button>
                              )}

                              {/* Cancel / Reactivate */}
                              {!isCancelled && !isAttended && (
                                <button
                                  onClick={() => handleCancelRegistration(r.id)}
                                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Cancel Registration"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isCancelled && (
                                <button
                                  onClick={() => handleReactivateRegistration(r.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition-colors"
                                  title="Reactivate registration"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reactivate</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isRegisterModalOpen && (
        <RegisterModal
          isOpen={isRegisterModalOpen}
          event={event}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={(reg) => {
            setIsRegisterModalOpen(false);
            setUserRegistration(reg);
            setViewTicketData({ registration: reg, event });
            loadEventData();
          }}
        />
      )}

      {viewTicketData && (
        <TicketModal
          isOpen={Boolean(viewTicketData)}
          registration={viewTicketData.registration}
          event={viewTicketData.event}
          onClose={() => setViewTicketData(null)}
        />
      )}

      {isEditModalOpen && (
        <EditEventModal
          isOpen={isEditModalOpen}
          event={event}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            loadEventData();
          }}
        />
      )}

      {isScannerModalOpen && (
        <AttendanceScannerModal
          isOpen={isScannerModalOpen}
          event={event}
          onClose={() => setIsScannerModalOpen(false)}
          onCheckInSuccess={() => {
            loadEventData();
          }}
        />
      )}
    </div>
  );
};
