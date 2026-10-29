import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Download,
  Ban,
  RotateCcw,
  Check,
  ExternalLink,
  Users,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { registrationService } from '../../services/registrationService';
import { eventService } from '../../services/eventService';
import { attendanceService } from '../../services/attendanceService';
import type {
  Registration,
  EventItem,
  RegistrationStatus,
} from '../../types/database';
import { TicketModal } from '../../components/events/TicketModal';
import { AttendanceScannerModal } from '../../components/attendance/AttendanceScannerModal';

export const RegistrationsPage: React.FC = () => {
  const { user } = useAuth();
  const userRole = user?.activeRole;

  // Data states
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<RegistrationStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [viewTicketData, setViewTicketData] = useState<{ registration: Registration; event: EventItem } | null>(null);
  const [scannerEvent, setScannerEvent] = useState<EventItem | null>(null);

  // Status message
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [regsData, eventsData] = await Promise.all([
        registrationService.getRegistrations(
          {
            eventId: selectedEventId === 'ALL' ? undefined : selectedEventId,
            status: selectedStatus,
            search: searchQuery,
          },
          user?.id,
          userRole
        ),
        eventService.getEvents(undefined, user?.id, userRole),
      ]);

      setRegistrations(regsData);
      setEvents(eventsData);
    } catch (err: unknown) {
      console.error('Failed to load registrations:', err);
      setError((err as Error).message || 'Failed to load registration records');
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId, selectedStatus, searchQuery, user?.id, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      if (selectedEventId !== 'ALL' && reg.event_id !== selectedEventId) return false;
      if (selectedStatus !== 'ALL' && reg.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = reg.participant_name.toLowerCase().includes(q);
        const matchEmail = reg.participant_email.toLowerCase().includes(q);
        const matchCode = reg.ticket_code.toLowerCase().includes(q);
        const matchEvent = reg.event?.title.toLowerCase().includes(q);
        const matchInst = reg.institution?.toLowerCase().includes(q);
        return matchName || matchEmail || matchCode || matchEvent || matchInst;
      }
      return true;
    });
  }, [registrations, selectedEventId, selectedStatus, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = registrations.length;
    const confirmed = registrations.filter((r) => r.status === 'CONFIRMED').length;
    const attended = registrations.filter((r) => r.status === 'ATTENDED').length;
    const cancelled = registrations.filter((r) => r.status === 'CANCELLED').length;
    return { total, confirmed, attended, cancelled };
  }, [registrations]);

  // Handlers
  const handleManualCheckIn = async (reg: Registration) => {
    try {
      const res = await attendanceService.manualCheckIn(reg.event_id, reg.id, user?.id, 'Manual check-in from directory');
      if (res.success) {
        setActionNotice(`Successfully checked in ${reg.participant_name}`);
        loadData();
        setTimeout(() => setActionNotice(null), 3500);
      } else {
        alert(res.message);
      }
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleCancelRegistration = async (regId: string) => {
    if (!confirm('Are you sure you want to cancel this registration?')) return;
    try {
      await registrationService.cancelRegistration(regId, userRole);
      setActionNotice('Registration cancelled successfully.');
      loadData();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleReactivateRegistration = async (regId: string) => {
    try {
      await registrationService.reactivateRegistration(regId, userRole);
      setActionNotice('Registration reactivated with refreshed ticket token.');
      loadData();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) return;

    const headers = ['Registration ID', 'Event Title', 'Participant Name', 'Email', 'Phone', 'Institution', 'Ticket Code', 'Status', 'Registered At'];
    const rows = filteredRegistrations.map((r) => [
      r.id,
      `"${(r.event?.title || 'Unknown').replace(/"/g, '""')}"`,
      `"${r.participant_name.replace(/"/g, '""')}"`,
      r.participant_email,
      r.participant_phone || '',
      `"${(r.institution || '').replace(/"/g, '""')}"`,
      r.ticket_code,
      r.status,
      r.registered_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `devcatalyst_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-[#090909]" />
            Registrations & Attendees
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage participant enrollments, ticket passes, and check-in rosters across all club events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={filteredRegistrations.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] disabled:opacity-50 text-[#0F172A] text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Notice Message */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] text-[#171717] flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Total Registrations</p>
            <p className="text-xl font-bold text-[#0F172A]">{metrics.total}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Confirmed</p>
            <p className="text-xl font-bold text-[#0F172A]">{metrics.confirmed}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Checked-in Attended</p>
            <p className="text-xl font-bold text-[#0F172A]">{metrics.attended}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#64748B] font-medium">Cancelled</p>
            <p className="text-xl font-bold text-[#0F172A]">{metrics.cancelled}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by participant name, email, ticket code, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909] transition-colors"
            />
          </div>

          {/* Event Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>Event:</span>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] outline-none focus:border-[#090909] max-w-xs cursor-pointer truncate"
            >
              <option value="ALL">All Events ({events.length})</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-[#F1F5F9] overflow-x-auto text-xs">
          <span className="text-[#64748B] font-medium mr-1 shrink-0">Status:</span>
          {(['ALL', 'CONFIRMED', 'ATTENDED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-md font-medium transition-colors shrink-0 ${
                selectedStatus === st
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              {st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
          <button onClick={loadData} className="text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Registrations Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>Showing {filteredRegistrations.length} registrations</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            <div className="w-6 h-6 border-2 border-[#090909] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading registrations...
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">
            <Ticket className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" />
            No registration records match your current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Institution / Phone</th>
                  <th className="py-3 px-4 font-mono">Ticket Code</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredRegistrations.map((reg) => {
                  const evt = reg.event || events.find((e) => e.id === reg.event_id);
                  const isAttended = reg.status === 'ATTENDED';
                  const isCancelled = reg.status === 'CANCELLED';

                  return (
                    <tr key={reg.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Participant */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#0F172A]">{reg.participant_name}</p>
                        <p className="text-[11px] text-[#64748B]">{reg.participant_email}</p>
                      </td>

                      {/* Event */}
                      <td className="py-3.5 px-4">
                        {evt ? (
                          <Link
                            to={`/events/${evt.id}`}
                            className="font-medium text-[#0F172A] hover:text-[#090909] transition-colors line-clamp-1 flex items-center gap-1"
                          >
                            <span>{evt.title}</span>
                            <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                          </Link>
                        ) : (
                          <span className="text-[#94A3B8]">Event {reg.event_id}</span>
                        )}
                      </td>

                      {/* Institution / Phone */}
                      <td className="py-3.5 px-4 text-[#475569]">
                        <p>{reg.institution || '—'}</p>
                        <p className="text-[11px] text-[#94A3B8]">{reg.participant_phone || ''}</p>
                      </td>

                      {/* Ticket Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#090909]">
                        {reg.ticket_code}
                      </td>

                      {/* Status */}
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

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#64748B] text-[11px]">
                        {new Date(reg.registered_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Ticket pass */}
                          {evt && (
                            <button
                              onClick={() => setViewTicketData({ registration: reg, event: evt })}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/50 transition-colors"
                              title="View Ticket Pass"
                            >
                              <Ticket className="w-4 h-4 text-[#171717]" />
                            </button>
                          )}

                          {/* Quick Door Scanner for this event */}
                          {evt && !isAttended && !isCancelled && (
                            <button
                              onClick={() => setScannerEvent(evt)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/50 transition-colors"
                              title="Open Door Scanner for Event"
                            >
                              <QrCode className="w-4 h-4 text-[#090909]" />
                            </button>
                          )}

                          {/* Manual Check-in */}
                          {!isAttended && !isCancelled && (
                            <button
                              onClick={() => handleManualCheckIn(reg)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors"
                              title="Mark as Attended"
                            >
                              <Check className="w-3 h-3" />
                              <span>Check In</span>
                            </button>
                          )}

                          {/* Cancel registration */}
                          {!isCancelled && !isAttended && (
                            <button
                              onClick={() => handleCancelRegistration(reg.id)}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Cancel registration"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reactivate registration */}
                          {isCancelled && (
                            <button
                              onClick={() => handleReactivateRegistration(reg.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] transition-colors"
                              title="Reactivate cancelled registration"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reactivate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewTicketData && (
        <TicketModal
          isOpen={Boolean(viewTicketData)}
          registration={viewTicketData.registration}
          event={viewTicketData.event}
          onClose={() => setViewTicketData(null)}
        />
      )}

      {scannerEvent && (
        <AttendanceScannerModal
          isOpen={Boolean(scannerEvent)}
          event={scannerEvent}
          onClose={() => setScannerEvent(null)}
          onCheckInSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
