import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Plus,
  Search,
  Globe,
  Ticket,
  Filter,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Video,
  Edit,
  FolderGit2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { eventService } from '../../services/eventService';
import type {
  EventItem,
  EventType,
  EventFormat,
  EventStatus,
  EventSummaryMetrics,
  Registration,
} from '../../types/database';
import { CreateEventModal } from '../../components/events/CreateEventModal';
import { EditEventModal } from '../../components/events/EditEventModal';
import { RegisterModal } from '../../components/events/RegisterModal';
import { TicketModal } from '../../components/events/TicketModal';

export const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [metrics, setMetrics] = useState<EventSummaryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<EventStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<EventType | 'ALL'>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<EventFormat | 'ALL'>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [registeringEvent, setRegisteringEvent] = useState<EventItem | null>(null);
  const [activeTicket, setActiveTicket] = useState<{ registration: Registration; event: EventItem } | null>(null);

  const userRole = user?.activeRole;
  const isOrganizer = userRole === 'ADMIN' || userRole === 'PROJECT_LEAD' || userRole === 'ORGANIZER';

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [eventsData, metricsData] = await Promise.all([
        eventService.getEvents(undefined, user?.id, userRole),
        eventService.getEventMetrics(),
      ]);

      setEvents(eventsData);
      setMetrics(metricsData);
    } catch (err: unknown) {
      console.error('Failed to load events:', err);
      setError((err as Error).message || 'Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Role visibility: public users & members only see PUBLISHED and COMPLETED events unless they are organizers
      if (!isOrganizer && evt.status !== 'PUBLISHED' && evt.status !== 'COMPLETED') {
        return false;
      }

      if (selectedStatus !== 'ALL' && evt.status !== selectedStatus) {
        return false;
      }
      if (selectedType !== 'ALL' && evt.event_type !== selectedType) {
        return false;
      }
      if (selectedFormat !== 'ALL' && evt.format !== selectedFormat) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(query);
        const matchDesc = evt.description?.toLowerCase().includes(query);
        const matchVenue = evt.venue?.toLowerCase().includes(query);
        return matchTitle || matchDesc || matchVenue;
      }

      return true;
    });
  }, [events, isOrganizer, selectedStatus, selectedType, selectedFormat, searchQuery]);

  const handleRegistrationSuccess = (reg: Registration, evt: EventItem) => {
    setActiveTicket({ registration: reg, event: evt });
    loadData();
  };

  const getFormatBadge = (format: EventFormat) => {
    switch (format) {
      case 'IN_PERSON':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MapPin className="w-3 h-3" /> In Person
          </span>
        );
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Video className="w-3 h-3" /> Online
          </span>
        );
      case 'HYBRID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F5F5F5] text-[#171717] border border-[#E5E5E5]">
            <Globe className="w-3 h-3" /> Hybrid
          </span>
        );
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Draft
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-300">
            Cancelled
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-300">
            Archived
          </span>
        );
    }
  };

  const formatDateDisplay = (isoStart: string, isoEnd: string) => {
    try {
      const start = new Date(isoStart);
      const end = new Date(isoEnd);
      const datePart = start.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const startHour = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const endHour = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${datePart} • ${startHour} - ${endHour}`;
    } catch {
      return `${isoStart.slice(0, 10)} - ${isoEnd.slice(0, 10)}`;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Metrics Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-[#171717]" />
            Events Directory
          </h1>
          <p className="text-sm text-[#737373] mt-0.5">
            Discover upcoming hackathons, workshops, and tech talks hosted by DevCatalyst.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isOrganizer && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-sm font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] text-[#171717] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">Published Events</p>
              <p className="text-xl font-bold text-[#171717]">{metrics.published_events}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">Total In Directory</p>
              <p className="text-xl font-bold text-[#171717]">{metrics.total_events}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">Active Registrations</p>
              <p className="text-xl font-bold text-[#171717]">{metrics.total_registrations}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-[#737373] font-medium">Total Check-ins</p>
              <p className="text-xl font-bold text-[#171717]">{metrics.total_attended}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search events by title, description, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-sm text-[#171717] placeholder-[#A3A3A3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/10 focus:border-[#090909] transition-colors"
            />
          </div>

          {/* Format & Type Dropdowns */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-[#737373] font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Format:</span>
            </div>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as any)}
              className="text-xs font-medium bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-[#171717] outline-none focus:border-[#171717] cursor-pointer"
            >
              <option value="ALL">All Formats</option>
              <option value="IN_PERSON">In Person</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-[#737373] font-medium ml-1">
              <span>Type:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="text-xs font-medium bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 text-[#171717] outline-none focus:border-[#171717] cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="HACKATHON">Hackathon</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="TECH_TALK">Tech Talk</option>
              <option value="BOOTCAMP">Bootcamp</option>
              <option value="MEETUP">Meetup</option>
              <option value="COMPETITION">Competition</option>
              <option value="GENERAL">General</option>
            </select>
          </div>
        </div>

        {/* Status Pill Tabs (Available to organizers or showing All/Published to public) */}
        {isOrganizer && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-[#F1F5F9] overflow-x-auto text-xs">
            <span className="text-[#64748B] font-medium mr-1 shrink-0">Status:</span>
            {(['ALL', 'PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-md font-medium transition-colors shrink-0 ${
                  selectedStatus === status
                    ? 'bg-[#0B132B] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Failed to load events</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden animate-pulse">
              <div className="h-44 bg-[#E2E8F0]" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-[#E2E8F0] rounded w-1/3" />
                <div className="h-6 bg-[#E2E8F0] rounded w-4/5" />
                <div className="h-3 bg-[#E2E8F0] rounded w-full" />
                <div className="h-3 bg-[#E2E8F0] rounded w-2/3" />
                <div className="pt-4 border-t border-[#F1F5F9] flex justify-between">
                  <div className="h-8 bg-[#E2E8F0] rounded w-20" />
                  <div className="h-8 bg-[#E2E8F0] rounded w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E5E5E5] max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] text-[#171717] flex items-center justify-center mx-auto mb-4 border border-[#E5E5E5]">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#171717]">No events found</h3>
          <p className="text-sm text-[#737373] mt-1.5 max-w-sm mx-auto">
            {searchQuery || selectedStatus !== 'ALL' || selectedType !== 'ALL' || selectedFormat !== 'ALL'
              ? 'No events match your current filter parameters. Try clearing your filters or search keywords.'
              : 'There are currently no events scheduled. Check back soon or create the first event!'}
          </p>
          {(searchQuery || selectedStatus !== 'ALL' || selectedType !== 'ALL' || selectedFormat !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setSelectedType('ALL');
                setSelectedFormat('ALL');
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E5E5] text-xs font-semibold text-[#171717] transition-colors"
            >
              Reset Filters
            </button>
          )}
          {isOrganizer && (
            <div className="mt-5">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#090909] hover:bg-[#262626] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Event
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const registeredCount = event.registered_count || 0;
            const remainingSeats = Math.max(0, event.capacity - registeredCount);
            const isFull = remainingSeats <= 0;
            const isPastDeadline =
              event.registration_deadline && new Date(event.registration_deadline) < new Date();
            const canRegister = event.status === 'PUBLISHED' && !isFull && !isPastDeadline;

            const percentageFilled = Math.min(100, Math.round((registeredCount / event.capacity) * 100));

            return (
              <div
                key={event.id}
                className="group flex flex-col bg-white rounded-2xl border border-[#E5E5E5] hover:border-[#D4D4D4] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Event Banner */}
                <div className="relative h-44 w-full bg-[#090909] overflow-hidden">
                  {event.banner_url ? (
                    <img
                      src={event.banner_url}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-[#090909] via-[#171717] to-[#262626] flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white/20" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getFormatBadge(event.format)}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/90 text-[#171717] backdrop-blur-xs">
                        {event.event_type}
                      </span>
                    </div>

                    <div className="shrink-0">{getStatusBadge(event.status)}</div>
                  </div>

                  {/* Bottom Image Overlay: Remaining seats pill */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                    <span className="font-mono text-[11px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-white border border-white/10">
                      {isFull ? (
                        <span className="text-red-300 font-semibold">Sold Out</span>
                      ) : (
                        <span>{remainingSeats} seats left</span>
                      )}
                    </span>
                    {event.project && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                        <FolderGit2 className="w-3 h-3 text-white" />
                        {event.project.code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <Link
                      to={`/events/${event.id}`}
                      className="block font-bold text-base text-[#171717] group-hover:text-black transition-colors line-clamp-1"
                    >
                      {event.title}
                    </Link>

                    <p className="text-xs text-[#737373] line-clamp-2 leading-relaxed">
                      {event.description || 'No detailed description provided for this session.'}
                    </p>

                    {/* Metadata Items */}
                    <div className="space-y-1.5 pt-1 text-xs text-[#737373]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#171717] shrink-0" />
                        <span className="truncate">{formatDateDisplay(event.start_time, event.end_time)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                        <span className="truncate">
                          {event.venue || event.meeting_link || 'Location details provided upon registration'}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] text-[#737373] mb-1 font-mono">
                        <span>Capacity</span>
                        <span>
                          {registeredCount} / {event.capacity} ({percentageFilled}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#E5E5E5] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            percentageFilled >= 100
                              ? 'bg-red-500'
                              : percentageFilled > 80
                              ? 'bg-amber-500'
                              : 'bg-[#171717]'
                          }`}
                          style={{ width: `${percentageFilled}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/events/${event.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#171717] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {isOrganizer && (
                        <button
                          onClick={() => setEditingEvent(event)}
                          className="p-1.5 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] transition-colors"
                          title="Edit event"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {canRegister ? (
                      <button
                        onClick={() => setRegisteringEvent(event)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090909] hover:bg-[#262626] text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Register</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-[#737373] px-2 py-1 bg-[#F5F5F5] rounded border border-[#E5E5E5]">
                        {event.status !== 'PUBLISHED'
                          ? event.status
                          : isFull
                          ? 'Event Full'
                          : isPastDeadline
                          ? 'Registration Closed'
                          : 'Unavailable'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateEventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newEvent) => {
            loadData();
            navigate(`/events/${newEvent.id}`);
          }}
        />
      )}

      {editingEvent && (
        <EditEventModal
          isOpen={Boolean(editingEvent)}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSuccess={() => {
            setEditingEvent(null);
            loadData();
          }}
        />
      )}

      {registeringEvent && (
        <RegisterModal
          isOpen={Boolean(registeringEvent)}
          event={registeringEvent}
          onClose={() => setRegisteringEvent(null)}
          onSuccess={(reg) => {
            const evt = registeringEvent;
            setRegisteringEvent(null);
            handleRegistrationSuccess(reg, evt);
          }}
        />
      )}

      {activeTicket && (
        <TicketModal
          isOpen={Boolean(activeTicket)}
          registration={activeTicket.registration}
          event={activeTicket.event}
          onClose={() => setActiveTicket(null)}
        />
      )}
    </div>
  );
};
