import React, { useState, useEffect } from 'react';
import { MapPin, Video, Users, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { eventService } from '../../services/eventService';
import { projectService } from '../../services/projectService';
import type { EventItem, EventType, EventFormat, EventStatus, Project } from '../../types/database';
import type { Role } from '../../types/auth';

export interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  onEventUpdated?: () => void;
  onSuccess?: () => void;
  currentUserId?: string;
  userRole?: Role;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onEventUpdated,
  onSuccess,
  currentUserId = 'admin-usr-001',
  userRole,
}) => {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [bannerUrl, setBannerUrl] = useState(event.banner_url || '');
  const [eventType, setEventType] = useState<EventType>(event.event_type);
  const [format, setFormat] = useState<EventFormat>(event.format);
  const [venue, setVenue] = useState(event.venue || '');
  const [meetingLink, setMeetingLink] = useState(event.meeting_link || '');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [capacity, setCapacity] = useState(event.capacity.toString());
  const [isPublic, setIsPublic] = useState(event.is_public);
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [projectId, setProjectId] = useState<string>(event.project_id || '');
  const [projects, setProjects] = useState<Project[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatIsoForInput = (iso: string) => {
    try {
      return new Date(iso).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTitle(event.title);
      setDescription(event.description || '');
      setBannerUrl(event.banner_url || '');
      setEventType(event.event_type);
      setFormat(event.format);
      setVenue(event.venue || '');
      setMeetingLink(event.meeting_link || '');
      setStartTime(formatIsoForInput(event.start_time));
      setEndTime(formatIsoForInput(event.end_time));
      setDeadline(formatIsoForInput(event.registration_deadline));
      setCapacity(event.capacity.toString());
      setIsPublic(event.is_public);
      setStatus(event.status);
      setProjectId(event.project_id || '');

      projectService.getProjects(currentUserId, userRole).then(setProjects).catch(console.error);
    }
  }, [isOpen, event, currentUserId, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Event title is required');
      return;
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const dead = new Date(deadline).getTime();

    if (end <= start) {
      setErrorMessage('End time must be after the start time');
      return;
    }
    if (dead > start) {
      setErrorMessage('Registration deadline cannot be after the event start time');
      return;
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap <= 0) {
      setErrorMessage('Capacity must be a positive integer');
      return;
    }

    if ((format === 'IN_PERSON' || format === 'HYBRID') && !venue.trim()) {
      setErrorMessage('Venue location is required for in-person and hybrid events');
      return;
    }
    if ((format === 'ONLINE' || format === 'HYBRID') && !meetingLink.trim()) {
      setErrorMessage('Meeting link is required for online and hybrid events');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      await eventService.updateEvent(
        event.id,
        {
          title: title.trim(),
          description: description.trim() || null,
          banner_url: bannerUrl.trim() || null,
          event_type: eventType,
          format,
          venue: venue.trim() || null,
          meeting_link: meetingLink.trim() || null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          registration_deadline: new Date(deadline).toISOString(),
          capacity: cap,
          is_public: isPublic,
          status,
          project_id: projectId || null,
        },
        currentUserId,
        userRole
      );

      if (onEventUpdated) onEventUpdated();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update event:', err);
      setErrorMessage((err as Error).message || 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  // Valid status transitions from current
  const allowedStatusOptions: { status: EventStatus; label: string }[] = [
    { status: event.status, label: `${event.status} (Current)` },
    ...(event.status === 'DRAFT'
      ? [
          { status: 'PUBLISHED' as const, label: 'Publish (Open to registrations)' },
          { status: 'CANCELLED' as const, label: 'Cancel' },
        ]
      : []),
    ...(event.status === 'PUBLISHED'
      ? [
          { status: 'COMPLETED' as const, label: 'Mark Completed' },
          { status: 'CANCELLED' as const, label: 'Cancel Event' },
        ]
      : []),
    ...(event.status === 'CANCELLED'
      ? [{ status: 'DRAFT' as const, label: 'Revert to Draft' }]
      : []),
    ...(event.status === 'COMPLETED'
      ? [{ status: 'ARCHIVED' as const, label: 'Archive Event' }]
      : []),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Event Details"
      description="Update event schedule, capacity, and lifecycle status."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Input
          label="Event Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs p-3 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            >
              <option value="WORKSHOP">Workshop</option>
              <option value="HACKATHON">Hackathon</option>
              <option value="TECH_TALK">Tech Talk</option>
              <option value="INFO_SESSION">Info Session</option>
              <option value="MEETUP">Meetup</option>
              <option value="BOOTCAMP">Bootcamp</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as EventFormat)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            >
              <option value="IN_PERSON">In Person</option>
              <option value="ONLINE">Online Virtual</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Lifecycle Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            >
              {allowedStatusOptions.map((opt) => (
                <option key={opt.status} value={opt.status}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conditional Venue / Meeting link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(format === 'IN_PERSON' || format === 'HYBRID') && (
            <Input
              label="Venue Location"
              required
              placeholder="e.g. Auditorium Hall B"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              leftIcon={<MapPin className="w-4 h-4 text-[#94A3B8]" />}
            />
          )}

          {(format === 'ONLINE' || format === 'HYBRID') && (
            <Input
              label="Meeting Link"
              required
              placeholder="https://meet.devcatalyst.club/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              leftIcon={<Video className="w-4 h-4 text-[#94A3B8]" />}
            />
          )}
        </div>

        {/* Schedule & Deadlines */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Start Time</label>
            <input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">End Time</label>
            <input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Registration Cutoff</label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            />
          </div>
        </div>

        {/* Capacity, Banner, Project Link */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Maximum Capacity"
            type="number"
            min="1"
            required
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            leftIcon={<Users className="w-4 h-4 text-[#737373]" />}
          />

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Associated Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs p-2 border border-[#E5E5E5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
            >
              <option value="">No Associated Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#171717]">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-[#090909] rounded border-[#E5E5E5] focus:ring-[#090909] accent-[#090909]"
              />
              <span>Public Event</span>
            </label>
          </div>
        </div>

        <Input
          label="Banner Image URL (Optional)"
          placeholder="https://images.unsplash.com/..."
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
