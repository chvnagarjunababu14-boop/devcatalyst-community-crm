import React, { useState } from 'react';
import { Calendar, Video, MapPin, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { recruitmentService } from '../../services/recruitmentService';
import type { Application, InterviewFormat } from '../../types/database';
import type { Role } from '../../types/auth';

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  currentUserId: string;
  userRole?: Role;
  onInterviewScheduled: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  application,
  currentUserId,
  userRole,
  onInterviewScheduled,
}) => {
  const [scheduledAt, setScheduledAt] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [format, setFormat] = useState<InterviewFormat>('ONLINE');
  const [meetingLink, setMeetingLink] = useState('');
  const [venue, setVenue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledAt) {
      setErrorMessage('Please select an interview date and time');
      return;
    }

    if (format === 'ONLINE' && !meetingLink.trim()) {
      setErrorMessage('Virtual meeting link is required for online interviews');
      return;
    }

    if (format === 'IN_PERSON' && !venue.trim()) {
      setErrorMessage('Physical venue location is required for in-person interviews');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      await recruitmentService.scheduleInterview(
        {
          application_id: application.id,
          scheduled_at: new Date(scheduledAt).toISOString(),
          time_zone: timeZone,
          duration_minutes: parseInt(durationMinutes, 10) || 45,
          format,
          meeting_link: meetingLink.trim() || null,
          venue: venue.trim() || null,
          interviewer_id: currentUserId,
        },
        currentUserId,
        userRole
      );

      onInterviewScheduled();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to schedule interview');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Schedule Interview: ${application.applicant_name}`}
      description={`Set up a screening or technical interview for the ${application.domain} candidate.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Date & Time"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Time Zone</label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl px-3 py-2 text-[#171717] focus:outline-none focus:border-[#090909]"
            >
              <option value="UTC">UTC (Universal Time)</option>
              <option value="America/New_York">EST (New York)</option>
              <option value="America/Los_Angeles">PST (San Francisco)</option>
              <option value="Europe/London">GMT (London)</option>
              <option value="Asia/Kolkata">IST (India)</option>
              <option value="Asia/Singapore">SGT (Singapore)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Duration</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl px-3 py-2 text-[#171717] focus:outline-none focus:border-[#090909]"
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Interview Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('ONLINE')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                  format === 'ONLINE'
                    ? 'bg-[#090909] border-[#090909] text-white'
                    : 'bg-[#FAFAFA] border-[#E5E5E5] text-[#737373] hover:text-[#171717]'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Online</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('IN_PERSON')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                  format === 'IN_PERSON'
                    ? 'bg-[#090909] border-[#090909] text-white'
                    : 'bg-[#FAFAFA] border-[#E5E5E5] text-[#737373] hover:text-[#171717]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>In-Person</span>
              </button>
            </div>
          </div>
        </div>

        {format === 'ONLINE' ? (
          <Input
            label="Meeting Link (Google Meet / Zoom / Discord)"
            type="url"
            placeholder="https://meet.devcatalyst.club/interview-room"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            required
          />
        ) : (
          <Input
            label="Venue Location"
            placeholder="Room 302, Innovation Center, Tech Campus"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
          />
        )}

        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>Confirm Schedule</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
