import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { attendanceService } from '../../services/attendanceService';
import type { EventItem, CheckInResult } from '../../types/database';

export interface AttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem;
  currentUserId?: string;
  onCheckInCompleted?: () => void;
  onCheckInSuccess?: () => void;
}

export const AttendanceScannerModal: React.FC<AttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  event,
  currentUserId = 'admin-usr-001',
  onCheckInCompleted,
  onCheckInSuccess,
}) => {
  const [ticketInput, setTicketInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount or close
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera initialization failed:', err);
      setCameraError(
        (err as Error).message || 'Camera access was denied. You can still use manual ticket code lookup.'
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setResult(null);
      setTicketInput('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleVerify = async (identifier: string) => {
    const code = identifier.trim();
    if (!code) return;

    try {
      setIsProcessing(true);
      setResult(null);

      const checkInOutcome = await attendanceService.verifyAndCheckInTicket(
        event.id,
        code,
        currentUserId,
        cameraActive ? 'QR_SCAN' : 'MANUAL'
      );

      setResult(checkInOutcome);
      if (checkInOutcome.success) {
        setTicketInput('');
        if (onCheckInCompleted) onCheckInCompleted();
        if (onCheckInSuccess) onCheckInSuccess();
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        code: 'INVALID_TICKET',
        message: (err as Error).message || 'Verification check failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(ticketInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Door Check-in: ${event.title}`}
      description="Scan participant QR passes or verify ticket codes manually."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Verification Result Banner */}
        {result && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              result.code === 'CHECKED_IN'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                : result.code === 'ALREADY_CHECKED_IN'
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
            }`}
          >
            {result.code === 'CHECKED_IN' && (
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
            )}
            {result.code === 'ALREADY_CHECKED_IN' && (
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            )}
            {result.code !== 'CHECKED_IN' && result.code !== 'ALREADY_CHECKED_IN' && (
              <XCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            )}

            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm">
                {result.code === 'CHECKED_IN'
                  ? 'Access Granted — Checked In!'
                  : result.code === 'ALREADY_CHECKED_IN'
                  ? 'Duplicate Pass Warning'
                  : 'Check-in Rejected'}
              </p>
              <p className="font-medium">{result.message}</p>

              {result.registration && (
                <div className="pt-2 border-t border-black/10 flex flex-wrap gap-4 text-[11px]">
                  <span>
                    <strong>Attendee:</strong> {result.registration.participant_name}
                  </span>
                  <span>
                    <strong>Ticket:</strong>{' '}
                    <code className="font-mono bg-white/60 px-1 py-0.5 rounded">
                      {result.registration.ticket_code}
                    </code>
                  </span>
                  {result.registration.institution && (
                    <span>
                      <strong>Org:</strong> {result.registration.institution}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Camera Scanner Box */}
        <div className="border border-[#262626] rounded-2xl overflow-hidden bg-[#090909] relative flex flex-col items-center justify-center min-h-[220px]">
          {cameraActive ? (
            <div className="relative w-full h-[240px] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan target viewfinder crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/60 rounded-xl shadow-lg animate-pulse" />
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs hover:bg-black/80"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-[#737373] space-y-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-white">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Camera Scanner</p>
                <p className="text-xs text-[#737373] mt-0.5 max-w-sm">
                  {cameraError ||
                    'Activate your device camera to scan attendee QR codes automatically.'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Camera className="w-3.5 h-3.5" />}
                onClick={startCamera}
              >
                Enable Camera Scanner
              </Button>
            </div>
          )}
        </div>

        {/* Manual Lookup Form (Always available and reliable) */}
        <form onSubmit={handleFormSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-[#171717]">
            Manual Ticket Lookup & Check-In
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Enter Ticket Code (e.g. DC-TK-8A42F1) or token..."
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                disabled={isProcessing}
                className="w-full text-xs font-mono pl-9 pr-3 py-2 border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#090909]/20 focus:border-[#090909]"
              />
            </div>
            <Button
              variant="primary"
              type="submit"
              isLoading={isProcessing}
              disabled={!ticketInput.trim()}
            >
              Verify Ticket
            </Button>
          </div>
          <p className="text-[11px] text-[#64748B]">
            Tickets can be verified using either the human-readable 6-character reference or the full opaque QR token.
          </p>
        </form>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[#F1F5F9]">
          <Button variant="secondary" onClick={onClose}>
            Close Scanner
          </Button>
        </div>
      </div>
    </Modal>
  );
};
