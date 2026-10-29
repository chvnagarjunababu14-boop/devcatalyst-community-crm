import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  MapPin,
  Clock,
  Printer,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import type { Registration, EventItem } from '../../types/database';
import { generateIcsContent, downloadIcsFile } from '../../utils/calendar';

export interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration;
  event?: EventItem;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  registration,
  event: passedEvent,
}) => {
  const event = passedEvent || registration.event;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (registration.ticket_token) {
      setIsGeneratingQr(true);
      // Generate QR encoding strictly the opaque non-sensitive ticket token
      QRCode.toDataURL(registration.ticket_token, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0B132B',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          if (isMounted) {
            setQrDataUrl(url);
            setIsGeneratingQr(false);
          }
        })
        .catch((err) => {
          console.error('Failed to generate ticket QR code:', err);
          if (isMounted) setIsGeneratingQr(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [registration.ticket_token]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCalendar = () => {
    if (!event) return;
    const ics = generateIcsContent({
      uid: `ticket-${registration.id}`,
      title: event.title,
      description: `${event.description}\n\nTicket Code: ${registration.ticket_code}`,
      location: event.venue || event.meeting_link || undefined,
      startTime: event.start_time,
      endTime: event.end_time,
      organizerEmail: 'events@devcatalyst.club',
      organizerName: 'DevCatalyst Hub Events',
    });
    downloadIcsFile(`${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_Ticket.ics`, ics);
  };

  const statusVariant = {
    CONFIRMED: 'success' as const,
    ATTENDED: 'primary' as const,
    CANCELLED: 'urgent' as const,
    WAITLISTED: 'warning' as const,
  }[registration.status];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Ticket & Confirmation"
      description="Present this QR code or ticket identifier at event check-in."
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Printable Ticket Card */}
        <div
          id="printable-ticket"
          className="bg-white border-2 border-dashed border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs relative print:border-black print:shadow-none"
        >
          {/* Ticket Header */}
          <div className="bg-[#090909] border-b border-[#262626] text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#171717] border border-[#262626] flex items-center justify-center font-mono font-bold text-sm text-white">
                DC
              </div>
              <div>
                <span className="text-[10px] tracking-widest uppercase font-mono text-[#A3A3A3] block">
                  Official Event Pass
                </span>
                <h4 className="text-sm font-bold truncate max-w-[240px]">
                  {event?.title || 'DevCatalyst Event'}
                </h4>
              </div>
            </div>
            <Badge variant={statusVariant}>{registration.status}</Badge>
          </div>

          {/* Ticket Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left 2 Cols: Details */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-[#737373] uppercase tracking-wider block">
                  Attendee Name
                </span>
                <p className="text-base font-bold text-[#171717]">
                  {registration.participant_name}
                </p>
                <p className="text-xs text-[#737373] truncate">{registration.participant_email}</p>
                {registration.institution && (
                  <p className="text-[11px] text-[#737373] mt-0.5 font-medium">
                    {registration.institution}
                  </p>
                )}
              </div>

              {event && (
                <div className="space-y-2 pt-2 border-t border-[#E5E5E5] text-xs text-[#171717]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#171717] shrink-0" />
                    <span>
                      {new Date(event.start_time).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#171717] shrink-0" />
                    <span>
                      {new Date(event.start_time).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      –{' '}
                      {new Date(event.end_time).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#171717] shrink-0 mt-0.5" />
                    <span>
                      {event.format === 'ONLINE'
                        ? 'Online Event'
                        : event.venue || 'Campus Venue'}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#E5E5E5]">
                <span className="text-[10px] uppercase font-mono text-[#737373] block">
                  Ticket Reference Code
                </span>
                <span className="font-mono text-sm font-bold text-[#090909] tracking-wider">
                  {registration.ticket_code}
                </span>
              </div>
            </div>

            {/* Right Col: QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Pass for ${registration.ticket_code}`}
                  className="w-36 h-36 object-contain rounded"
                />
              ) : isGeneratingQr ? (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-[#94A3B8]">
                  Generating QR...
                </div>
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-[#DC2626]">
                  QR Unavailable
                </div>
              )}
              <span className="text-[10px] text-[#94A3B8] font-mono mt-2">
                Opaque Token Check-in
              </span>
            </div>
          </div>

          {/* Ticket Security Note */}
          <div className="px-6 py-2.5 bg-[#F8FAFC] border-t border-[#F1F5F9] text-[11px] text-[#64748B] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
            <span>Valid for single admission. Verification occurs server-side at the door.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<Calendar className="w-4 h-4 text-[#171717]" />}
              onClick={handleDownloadCalendar}
            >
              Add to Calendar (.ics)
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print Ticket
            </Button>
            {event?.meeting_link && event.format !== 'IN_PERSON' && (
              <a
                href={event.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#090909] hover:bg-[#262626] text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <span>Join Meeting</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
