import React, { useState, useEffect } from 'react';
import { Ticket, AlertCircle, User, Mail, Building, Phone } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { registrationService } from '../../services/registrationService';
import type { EventItem, Registration } from '../../types/database';
import type { AuthUser } from '../../types/auth';

export interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  currentUser?: AuthUser | null;
  onRegistrationSuccess?: (registration: Registration) => void;
  onSuccess?: (registration: Registration) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  event,
  currentUser,
  onRegistrationSuccess,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prefill authenticated user profile if available
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (currentUser) {
        setName(currentUser.profile?.full_name || currentUser.name || '');
        setEmail(currentUser.email || '');
        setPhone(currentUser.profile?.phone || '');
        setInstitution('');
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setInstitution('');
      }
    }
  }, [isOpen, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await registrationService.registerParticipant({
        event_id: event.id,
        participant_name: name.trim(),
        participant_email: email.trim(),
        participant_phone: phone.trim() || null,
        institution: institution.trim() || null,
        user_id: currentUser?.id || null,
      });

      if (onRegistrationSuccess) onRegistrationSuccess(result);
      if (onSuccess) onSuccess(result);
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      setErrorMessage((err as Error).message || 'Registration could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFull = (event.registered_count || 0) >= event.capacity;
  const deadlinePassed = new Date().getTime() > new Date(event.registration_deadline).getTime();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Register for ${event.title}`}
      description="Reserve your seat. You will receive an opaque ticket token and QR pass."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error banner */}
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Capacity / Deadline warnings if present */}
        {isFull && (
          <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#B45309] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This event has reached full capacity ({event.capacity} seats).</span>
          </div>
        )}

        {deadlinePassed && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Registration closed on {new Date(event.registration_deadline).toLocaleDateString()}.</span>
          </div>
        )}

        {/* Event Quick Meta Card */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#475569] flex items-center justify-between">
          <div>
            <span className="font-semibold text-[#0F172A] block">{event.event_type} • {event.format}</span>
            <span>
              {new Date(event.start_time).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <span className="text-right">
            <strong className="text-[#090909]">
              {Math.max(0, event.capacity - (event.registered_count || 0))}
            </strong>{' '}
            seats remaining
          </span>
        </div>

        {/* Form Inputs */}
        <Input
          label="Full Name"
          required
          placeholder="e.g. Alex Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading || isFull || deadlinePassed}
          leftIcon={<User className="w-4 h-4 text-[#94A3B8]" />}
        />

        <Input
          label="Email Address"
          type="email"
          required
          placeholder="e.g. alex@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading || isFull || deadlinePassed}
          leftIcon={<Mail className="w-4 h-4 text-[#94A3B8]" />}
          helperText="Your QR pass ticket will be tied to this email address."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number (Optional)"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading || isFull || deadlinePassed}
            leftIcon={<Phone className="w-4 h-4 text-[#94A3B8]" />}
          />

          <Input
            label="College / Organization (Optional)"
            placeholder="e.g. State University"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            disabled={isLoading || isFull || deadlinePassed}
            leftIcon={<Building className="w-4 h-4 text-[#94A3B8]" />}
          />
        </div>

        <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[11px] text-[#1E40AF]">
          <strong>Privacy note:</strong> Participant emails and contact information are strictly protected by club policies and are never displayed publicly.
        </div>

        {/* Modal Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isLoading}
            disabled={isFull || deadlinePassed}
            leftIcon={<Ticket className="w-4 h-4" />}
          >
            Confirm Registration
          </Button>
        </div>
      </form>
    </Modal>
  );
};
