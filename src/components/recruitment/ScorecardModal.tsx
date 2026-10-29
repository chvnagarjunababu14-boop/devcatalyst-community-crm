import React, { useState } from 'react';
import { Award, AlertCircle, Sparkles } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { recruitmentService } from '../../services/recruitmentService';
import type { Application, ScoreRecommendation } from '../../types/database';
import type { Role } from '../../types/auth';

export interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  interviewId?: string | null;
  currentUserId: string;
  userRole?: Role;
  onScorecardSubmitted: () => void;
}

export const ScorecardModal: React.FC<ScorecardModalProps> = ({
  isOpen,
  onClose,
  application,
  interviewId,
  currentUserId,
  userRole,
  onScorecardSubmitted,
}) => {
  const [technicalScore, setTechnicalScore] = useState(4);
  const [collaborationScore, setCollaborationScore] = useState(4);
  const [communicationScore, setCommunicationScore] = useState(4);
  const [domainSkillScore, setDomainSkillScore] = useState(4);
  const [writtenEvidence, setWrittenEvidence] = useState('');
  const [recommendation, setRecommendation] = useState<ScoreRecommendation>('HIRE');
  const [internalNotes, setInternalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const overallScore = parseFloat(
    ((technicalScore + collaborationScore + communicationScore + domainSkillScore) / 4).toFixed(1)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!writtenEvidence.trim() || writtenEvidence.trim().length < 10) {
      setErrorMessage('Please provide written evidence of candidate performance (minimum 10 characters)');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      await recruitmentService.submitScorecard(
        {
          application_id: application.id,
          interview_id: interviewId || null,
          interviewer_id: currentUserId,
          technical_score: technicalScore,
          collaboration_score: collaborationScore,
          communication_score: communicationScore,
          domain_skill_score: domainSkillScore,
          written_evidence: writtenEvidence.trim(),
          recommendation,
          internal_notes: internalNotes.trim() || null,
        },
        currentUserId,
        userRole
      );

      onScorecardSubmitted();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to submit scorecard');
    } finally {
      setIsLoading(false);
    }
  };

  const renderRatingButtons = (
    label: string,
    description: string,
    value: number,
    setter: (val: number) => void
  ) => {
    return (
      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#171717]">{label}</p>
            <p className="text-[11px] text-[#737373]">{description}</p>
          </div>
          <span className="text-sm font-mono font-bold text-[#090909] bg-white px-2 py-0.5 rounded border border-[#E5E5E5]">
            {value} / 5
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setter(num)}
              className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                value === num
                  ? 'bg-[#090909] border-[#090909] text-white shadow-xs'
                  : 'bg-white border-[#E5E5E5] text-[#171717] hover:bg-[#F5F5F5]'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Candidate Scorecard: ${application.applicant_name}`}
      description="Record structured evaluation rubric scores and written hiring justification."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#B91C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Overall Score Header */}
        <div className="p-4 rounded-xl bg-[#090909] border border-[#262626] text-white flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-[#737373] font-medium">Domain Track: {application.domain}</p>
            <p className="text-sm font-bold text-white mt-0.5">{application.applicant_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/80" />
            <span className="text-xs text-white/70">Overall Rating:</span>
            <span className="text-xl font-mono font-extrabold text-[#090909] bg-white px-2.5 py-0.5 rounded-lg">
              {overallScore} / 5.0
            </span>
          </div>
        </div>

        {/* 4 Rubric Criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderRatingButtons(
            'Technical Proficiency',
            'Code quality, architecture sense, stack knowledge',
            technicalScore,
            setTechnicalScore
          )}
          {renderRatingButtons(
            'Collaboration & Culture',
            'Team engagement, peer feedback receptivity',
            collaborationScore,
            setCollaborationScore
          )}
          {renderRatingButtons(
            'Communication & Clarity',
            'Articulation of technical choices, clarity',
            communicationScore,
            setCommunicationScore
          )}
          {renderRatingButtons(
            'Domain Problem Solving',
            'Role-specific challenges, domain intuition',
            domainSkillScore,
            setDomainSkillScore
          )}
        </div>

        {/* Hiring Recommendation */}
        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1.5">
            Hiring Recommendation
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'STRONG_HIRE', label: 'Strong Hire', color: 'emerald' },
                { id: 'HIRE', label: 'Hire', color: 'blue' },
                { id: 'NEUTRAL', label: 'Neutral', color: 'amber' },
                { id: 'DO_NOT_HIRE', label: 'Do Not Hire', color: 'red' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRecommendation(opt.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  recommendation === opt.id
                    ? opt.color === 'emerald'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : opt.color === 'blue'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : opt.color === 'amber'
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-red-600 border-red-600 text-white'
                    : 'bg-[#FAFAFA] border-[#E5E5E5] text-[#737373] hover:bg-[#F5F5F5]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Written Evidence */}
        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Written Evidence & Evaluation Details <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Document observed strengths, code examples reviewed, or weaknesses identified..."
            value={writtenEvidence}
            onChange={(e) => setWrittenEvidence(e.target.value)}
            className="w-full text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-3 text-[#171717] focus:outline-none focus:border-[#090909] resize-none"
            required
          />
        </div>

        {/* Internal Reviewer Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Private Notes for Committee (Optional)
          </label>
          <input
            type="text"
            placeholder="Confidential notes for decision calibration..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            className="w-full text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl px-3 py-2 text-[#171717] focus:outline-none focus:border-[#090909]"
          />
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Award className="w-4 h-4 mr-1.5" />
            <span>Submit Scorecard</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
