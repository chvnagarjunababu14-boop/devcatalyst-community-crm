import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Code,
  Palette,
  Megaphone,
  Layers,
  ShieldCheck,
  Calendar,
  Building,
  User,
  Clock,
  Briefcase,
} from 'lucide-react';
import { recruitmentService } from '../../services/recruitmentService';
import type {
  RecruitmentCycle,
  ClubDomain,
  ApplicationStage,
} from '../../types/database';
import { BrandLogo } from '../../components/common/BrandLogo';

export const PublicApplicationPage: React.FC = () => {
  const [activeCycle, setActiveCycle] = useState<RecruitmentCycle | null>(null);
  const [isLoadingCycle, setIsLoadingCycle] = useState(true);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [domain, setDomain] = useState<ClubDomain>('ENGINEERING');
  const [skillsInput, setSkillsInput] = useState('');
  const [skills, setSkills] = useState<string[]>(['TypeScript', 'React']);
  const [experience, setExperience] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [motivation, setMotivation] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    reference_code: string;
    applicant_name: string;
    domain: string;
  } | null>(null);

  // Status Lookup Tool
  const [lookupCode, setLookupCode] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    reference_code: string;
    applicant_name: string;
    domain: string;
    stage: ApplicationStage;
    submitted_at: string;
    cycle_title?: string;
  } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCycle = async () => {
      try {
        setIsLoadingCycle(true);
        const cycle = await recruitmentService.getActiveCycle();
        setActiveCycle(cycle);
      } catch (err: unknown) {
        console.error('Failed to load active recruitment cycle:', err);
      } finally {
        setIsLoadingCycle(false);
      }
    };
    fetchCycle();
  }, []);

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = skillsInput.trim().replace(/^,/, '');
      if (trimmed && !skills.includes(trimmed)) {
        setSkills([...skills, trimmed]);
        setSkillsInput('');
      }
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) {
      setFormError('No active recruitment cycle is accepting submissions at this time.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await recruitmentService.submitApplication({
        cycle_id: activeCycle.id,
        applicant_name: name.trim(),
        applicant_email: email.trim(),
        phone: phone.trim() || null,
        institution: institution.trim(),
        domain,
        skills,
        experience_summary: experience.trim(),
        portfolio_url: portfolioUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        motivation: motivation.trim(),
      });

      setSubmittedResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to submit application. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;

    try {
      setIsLookingUp(true);
      setLookupError(null);
      setLookupResult(null);

      const res = await recruitmentService.getApplicationStatusByRef(lookupCode.trim());
      if (!res) {
        setLookupError('No application found matching this reference code. Please verify and try again.');
      } else {
        setLookupResult(res);
      }
    } catch (err: unknown) {
      setLookupError((err as Error).message || 'Failed to look up application status.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const getStageDisplay = (stage: ApplicationStage) => {
    switch (stage) {
      case 'APPLIED':
        return { label: 'Application Received', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SCREENING':
        return { label: 'Under Review & Screening', color: 'bg-[#F5F5F5] text-[#171717] border-[#E5E5E5]' };
      case 'INTERVIEW_SCHEDULED':
        return { label: 'Interview Scheduled', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'INTERVIEWED':
        return { label: 'Interview Completed — Evaluation Pending', color: 'bg-[#F5F5F5] text-[#171717] border-[#E5E5E5]' };
      case 'ACCEPTED':
        return { label: 'Accepted — Welcome to DevCatalyst!', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
      case 'REJECTED':
        return { label: 'Application Process Completed', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#090909] text-white border border-[#262626] relative overflow-hidden shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10 space-y-3 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white/90 backdrop-blur-sm border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-white/80" />
            <span>DevCatalyst Club Recruitment</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {activeCycle ? activeCycle.title : 'Club Recruitment Drive'}
          </h1>

          <p className="text-xs md:text-sm text-neutral-400 max-w-2xl leading-relaxed">
            Join DevCatalyst to engineer high-impact open source tools, design multi-brand design systems,
            and organize collaborative student hackathons.
          </p>

          {activeCycle && (
            <div className="pt-2 flex items-center gap-4 text-xs text-neutral-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-300" />
                Cohort: <strong>{activeCycle.term}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-300" />
                Applications close on <strong>{new Date(activeCycle.end_date).toLocaleDateString()}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="relative z-10 shrink-0 self-start sm:self-center">
          <BrandLogo size="lg" className="shadow-lg border-white/20" />
        </div>
      </div>

      {/* Success Confirmation View */}
      {submittedResult ? (
        <div className="p-8 rounded-3xl bg-white border border-[#E5E5E5] shadow-sm text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#171717]">Application Successfully Submitted!</h2>
            <p className="text-xs text-[#737373]">
              Thank you, {submittedResult.applicant_name}. Your application for the{' '}
              <strong>{submittedResult.domain}</strong> track has been received.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F5] border border-[#E5E5E5] max-w-md mx-auto space-y-1">
            <p className="text-[11px] font-semibold text-[#737373] uppercase">Your Safe Application Reference</p>
            <p className="text-2xl font-mono font-extrabold text-[#090909] tracking-wider">
              {submittedResult.reference_code}
            </p>
            <p className="text-[11px] text-[#737373] pt-1">
              Please save this code to check your recruitment progress below.
            </p>
          </div>

          <div className="pt-3">
            <button
              onClick={() => {
                setSubmittedResult(null);
                setName('');
                setEmail('');
                setPhone('');
                setInstitution('');
                setExperience('');
                setMotivation('');
                setPortfolioUrl('');
                setGithubUrl('');
              }}
              className="px-5 py-2.5 rounded-xl bg-[#090909] hover:bg-[#171717] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E5E5E5] shadow-sm space-y-6">
            <div className="pb-4 border-b border-[#E5E5E5]">
              <h2 className="text-lg font-bold text-[#171717]">Application Form</h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Fill in your background, chosen domain track, and portfolio links.
              </p>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {!isLoadingCycle && !activeCycle && (
              <div className="p-6 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                <p className="font-bold">Applications are currently closed</p>
                <p className="mt-1 text-[#737373]">
                  There are no open recruitment cycles right now. Please check back for the next upcoming cohort.
                </p>
              </div>
            )}

            {activeCycle && (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* Section 1: Candidate Identity */}
                <div className="space-y-3.5">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#171717]" />
                    <span>1. Personal Information</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="applicant-name" className="block font-semibold text-[#171717] mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="applicant-name"
                        type="text"
                        placeholder="e.g. Maya Lin"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="applicant-email" className="block font-semibold text-[#171717] mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="applicant-email"
                        type="email"
                        placeholder="maya@example.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="applicant-phone" className="block font-semibold text-[#171717] mb-1">
                        Phone Number (Optional)
                      </label>
                      <input
                        id="applicant-phone"
                        type="tel"
                        placeholder="+1 (555) 012-3456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
                      />
                    </div>

                    <div>
                      <label htmlFor="applicant-institution" className="block font-semibold text-[#171717] mb-1">
                        Institution / College / Department <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="applicant-institution"
                        type="text"
                        placeholder="e.g. State University, Computer Science Dept"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Domain Track */}
                <div className="space-y-3.5 pt-4 border-t border-[#E5E5E5]">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[#171717]" />
                    <span>2. Preferred Domain Track</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'ENGINEERING', label: 'Engineering', icon: Code, desc: 'Web apps, backend APIs, distributed systems' },
                      { id: 'DESIGN', label: 'Design & UI/UX', icon: Palette, desc: 'Design systems, tokens, interactive prototypes' },
                      { id: 'OUTREACH', label: 'Community & Outreach', icon: Megaphone, desc: 'Hackathons, sponsorships, events, marketing' },
                      { id: 'PRODUCT', label: 'Product & Project', icon: Layers, desc: 'Roadmap planning, backlog grooming, Scrum' },
                      { id: 'OPERATIONS', label: 'Operations & Logistics', icon: Building, desc: 'Event logistics, venue, finance, ops' },
                    ].map((track) => {
                      const Icon = track.icon;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => setDomain(track.id as ClubDomain)}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            domain === track.id
                              ? 'bg-[#171717] text-white border-[#090909] shadow-sm ring-1 ring-[#090909]'
                              : 'bg-[#F5F5F5] border-[#E5E5E5] text-[#171717] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${domain === track.id ? 'text-white' : 'text-[#737373]'}`} />
                            <span className={`font-bold ${domain === track.id ? 'text-white' : 'text-[#171717]'}`}>{track.label}</span>
                          </div>
                          <p className={`text-[11px] mt-1 ${domain === track.id ? 'text-neutral-300' : 'text-[#737373]'}`}>{track.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Skills & Links */}
                <div className="space-y-3.5 pt-4 border-t border-[#E5E5E5]">
                  <h3 className="font-bold text-sm text-[#171717] flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-[#171717]" />
                    <span>3. Skills, Experience & Links</span>
                  </h3>

                  <div>
                    <label className="block font-semibold text-[#171717] mb-1">
                      Skills (Type skill and press Enter or comma)
                    </label>
                    <div className="p-2 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] flex flex-wrap gap-1.5 items-center">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-[#E5E5E5] font-mono text-[11px] text-[#171717]"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-[#737373] hover:text-red-500 font-bold ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Add skills (e.g. Next.js, Figma, Go)..."
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        onKeyDown={handleAddSkill}
                        className="flex-1 bg-transparent border-none outline-none text-xs text-[#171717] p-1 min-w-[140px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="applicant-experience" className="block font-semibold text-[#171717] mb-1">
                      Experience Summary <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="applicant-experience"
                      rows={3}
                      placeholder="Describe your previous projects, coursework, open-source work, or relevant leadership experience..."
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909] resize-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="applicant-portfolio" className="block font-semibold text-[#171717] mb-1">
                        Portfolio / Personal Website URL
                      </label>
                      <input
                        id="applicant-portfolio"
                        type="url"
                        placeholder="https://myportfolio.dev"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
                      />
                    </div>

                    <div>
                      <label htmlFor="applicant-github" className="block font-semibold text-[#171717] mb-1">
                        GitHub Profile URL
                      </label>
                      <input
                        id="applicant-github"
                        type="url"
                        placeholder="https://github.com/myusername"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="applicant-motivation" className="block font-semibold text-[#171717] mb-1">
                      Motivation Statement <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="applicant-motivation"
                      rows={3}
                      placeholder="Why do you want to join DevCatalyst Club, and what do you hope to learn or build here?"
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] text-xs text-[#171717] focus:bg-white focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909] resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Submit CTA */}
                <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[#737373] text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Your information is protected and evaluated strictly by club recruitment leads.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#090909] hover:bg-[#171717] disabled:opacity-50 text-white font-bold transition-all shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Submitting Application...' : 'Submit Application'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Public Status Tracker Section */}
        <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E5E5E5] shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#171717] flex items-center gap-2">
              <Search className="w-4 h-4 text-[#171717]" />
              <span>Already Applied? Track Application Status</span>
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Enter your safe reference code (e.g., APP-2026-8A4F1) to check your progress.
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="APP-2026-XXXXX"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] font-mono text-xs uppercase text-[#171717] focus:outline-none focus:border-[#090909] focus:ring-1 focus:ring-[#090909]"
              required
            />
            <button
              type="submit"
              disabled={isLookingUp}
              className="px-4 py-2 rounded-xl bg-[#090909] hover:bg-[#171717] disabled:opacity-50 text-white font-bold text-xs transition-colors shrink-0"
            >
            {isLookingUp ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {lookupError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {lookupResult && (
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#0F172A]">{lookupResult.applicant_name}</p>
                <p className="text-[11px] text-[#64748B] font-mono">{lookupResult.reference_code} • {lookupResult.domain} Track</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  getStageDisplay(lookupResult.stage).color
                }`}
              >
                {getStageDisplay(lookupResult.stage).label}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
              <span>Submitted on {new Date(lookupResult.submitted_at).toLocaleDateString()}</span>
              {lookupResult.cycle_title && <span>Cohort: {lookupResult.cycle_title}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
