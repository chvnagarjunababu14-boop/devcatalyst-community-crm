import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Users,
  MapPin,
  Clock,
  Video,
  Code2,
  Palette,
  Terminal,
  ChevronRight,
  HeartHandshake,
} from 'lucide-react';
import { eventService } from '../../services/eventService';
import { memberService } from '../../services/memberService';
import { projectService } from '../../services/projectService';
import { recruitmentService } from '../../services/recruitmentService';
import type {
  EventItem,
  RecruitmentCycle,
  PublicProjectItem,
} from '../../types/database';
import { Badge } from '../../components/common/Badge';
import { BrandLogo } from '../../components/common/BrandLogo';

export const HomePage: React.FC = () => {
  // State for dynamic discovery content
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [featuredMembers, setFeaturedMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  const [publicProjects, setPublicProjects] = useState<PublicProjectItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [activeCycle, setActiveCycle] = useState<RecruitmentCycle | null>(null);

  // Load public data on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch upcoming published events
    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const allEvents = await eventService.getEvents(
          { status: 'PUBLISHED' },
          undefined,
          undefined
        );
        if (isMounted) {
          // Filter strictly for upcoming/active events and sort
          const now = Date.now();
          const upcoming = allEvents.filter(
            (e) => new Date(e.end_time || e.start_time).getTime() >= now - 3600000
          );
          setUpcomingEvents(upcoming.slice(0, 3));
        }
      } catch (err) {
        console.warn('Error loading public homepage events:', err);
      } finally {
        if (isMounted) setIsLoadingEvents(false);
      }
    };

    // 2. Fetch featured active club members (privacy-safe projection)
    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true);
        const members = await memberService.getPublicFeaturedMembers(6);
        if (isMounted) {
          setFeaturedMembers(members);
        }
      } catch (err) {
        console.warn('Error loading public featured members:', err);
      } finally {
        if (isMounted) setIsLoadingMembers(false);
      }
    };

    // 3. Fetch approved club projects
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const projects = await projectService.getPublicProjects();
        if (isMounted) {
          setPublicProjects(projects.slice(0, 3));
        }
      } catch (err) {
        console.warn('Error loading public projects:', err);
      } finally {
        if (isMounted) setIsLoadingProjects(false);
      }
    };

    // 4. Fetch active recruitment cycle
    const loadCycle = async () => {
      try {
        const cycle = await recruitmentService.getActiveCycle();
        if (isMounted) {
          setActiveCycle(cycle);
        }
      } catch (err) {
        console.warn('Error loading recruitment cycle for hero CTA:', err);
      }
    };

    loadEvents();
    loadMembers();
    loadProjects();
    loadCycle();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col w-full text-slate-100 overflow-x-hidden">
      {/* =====================================================================
          SECTION B: HERO SECTION
          ===================================================================== */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-8 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-[#090909] via-[#121212] to-[#090909]">
        {/* Subtle background ambient light */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Mission Copy & Primary CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6 text-left">
            {/* Recruitment status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#171717] border border-[#262626] backdrop-blur-sm text-xs font-medium text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {activeCycle
                  ? `Recruitment Open: ${activeCycle.title}`
                  : 'DevCatalyst Club • Student Developer Community'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Build.{' '}
              <span className="text-white">
                Innovate.
              </span>{' '}
              Belong.
            </h1>

            {/* Supporting Statement */}
            <p className="text-base sm:text-lg text-[#A3A3A3] leading-relaxed max-w-2xl font-normal">
              DevCatalyst Club is a collaborative student technology community where developers, designers, and innovators come together to turn ideas into software, master modern stacks, and build lasting projects.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto">
              <a
                href="#events"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#090909] text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Calendar className="w-4 h-4 text-[#090909]" />
                <span>Explore Upcoming Events</span>
                <ArrowRight className="w-4 h-4 text-[#090909]" />
              </a>

              <a
                href="#members"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#171717] hover:bg-[#262626] border border-[#262626] text-white text-sm font-semibold transition-all hover:border-[#404040] focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Users className="w-4 h-4 text-slate-300" />
                <span>Meet Our Community</span>
              </a>

              <Link
                to="/apply"
                className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl text-white hover:text-slate-200 hover:bg-white/5 text-sm font-bold transition-colors"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Apply to Join</span>
              </Link>
            </div>

            {/* Real Club Pillars Tags */}
            <div className="pt-6 border-t border-[#262626] w-full flex flex-wrap items-center gap-4 text-xs text-[#737373]">
              <span className="font-semibold text-slate-300">Club Tracks:</span>
              <span className="px-2.5 py-1 rounded-md bg-[#171717] border border-[#262626] text-slate-300">Engineering</span>
              <span className="px-2.5 py-1 rounded-md bg-[#171717] border border-[#262626] text-slate-300">Product Design</span>
              <span className="px-2.5 py-1 rounded-md bg-[#171717] border border-[#262626] text-slate-300">Technical Operations</span>
              <span className="px-2.5 py-1 rounded-md bg-[#171717] border border-[#262626] text-slate-300">Open Source</span>
            </div>
          </div>

          {/* Right Column: Editorial Abstract Technology Composition */}
          <div className="lg:col-span-5 relative w-full flex items-center justify-center">
            {/* Visual Glassmorphic Composition */}
            <div className="relative w-full max-w-md lg:max-w-none space-y-4">
              {/* Official Brand Emblem Showcase Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#171717] border border-[#262626] shadow-xl flex items-center gap-4 hover:border-[#404040] transition-colors">
                <BrandLogo size="lg" className="shadow-lg border-white/20 shrink-0" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Official Club Identity
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Catalysing Innovation</h3>
                  <p className="text-xs text-slate-400 leading-snug">Student-led technology collective building real-world software.</p>
                </div>
              </div>

              {/* Card 1: Active Hub Initiative */}
              <div className="p-5 rounded-2xl bg-[#171717] border border-[#262626] shadow-xl relative overflow-hidden group hover:border-[#404040] transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#262626] border border-[#404040] flex items-center justify-center text-white">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Active Initiative
                      </h2>
                      <p className="text-[11px] text-slate-400 font-mono">PRJ-01 • Core Platform</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Production
                  </span>
                </div>
                <div className="pt-3 space-y-2">
                  <p className="text-sm font-semibold text-white">DevCatalyst Hub Platform</p>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    Unified open-source club workspace integrating project Kanban, event registrations, QR ticket verification, and applicant CRM.
                  </p>
                  <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Code2 className="w-3.5 h-3.5 text-white" /> React 19 + TypeScript
                    </span>
                    <span className="text-slate-400">100% Verified Tests</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Next Event Banner Card */}
              <div className="p-4 rounded-xl bg-[#171717] border border-[#262626] shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#090909] shrink-0 shadow-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Community Events
                    </span>
                    <p className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-[240px]">
                      {upcomingEvents[0]?.title || 'Interactive Workshops & Hackathons'}
                    </p>
                  </div>
                </div>
                <a
                  href="#events"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium shrink-0 transition-colors"
                >
                  View
                </a>
              </div>

              {/* Card 3: Real Community Member Pulse */}
              <div className="p-4 rounded-xl bg-[#171717] border border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090909] bg-[#262626] flex items-center justify-center text-xs font-bold text-white border border-[#404040]">
                      AR
                    </div>
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090909] bg-[#333333] flex items-center justify-center text-xs font-bold text-white border border-[#404040]">
                      SC
                    </div>
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#090909] bg-[#404040] flex items-center justify-center text-xs font-bold text-white border border-[#555555]">
                      MV
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Cross-Functional Team</p>
                    <p className="text-[11px] text-slate-400">Collaborating across 5 technical domains</p>
                  </div>
                </div>
                <a
                  href="#members"
                  className="text-xs font-medium text-white hover:underline flex items-center gap-1"
                >
                  Meet <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION C: CLUB INTRODUCTION
          ===================================================================== */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#090909] border-t border-[#262626] scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#171717] px-3 py-1 rounded-full border border-[#262626]">
              Who We Are
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              An Ambitious Technology Collective
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              DevCatalyst Club is a student-driven organization that bridges academic learning and real-world engineering. We provide a supportive sandbox where emerging developers, designers, and managers work as agile squads to ship high-quality products.
            </p>
          </div>

          {/* Core Collaborative Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#404040] flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Real-World Engineering</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We design and build production-ready software using modern frameworks, TypeScript, PostgreSQL, and cloud APIs. No throwaway homework.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#404040] flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Design & Product Craft</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Designers and engineers collaborate from day one on design tokens, accessibility standards, user testing, and component libraries.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#404040] flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Peer Mentorship</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Experienced members guide newcomers through architecture reviews, Git workflows, debugging sessions, and technical interview preparation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#404040] flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Open Events & Sprints</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We host interactive tech talks, campus hackathons, open-source sprints, and hands-on coding bootcamps open to all students.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION E: UPCOMING EVENTS
          ===================================================================== */}
      <section id="events" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#090909] border-t border-[#262626] scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#171717] px-3 py-1 rounded-full border border-[#262626]">
                Community Calendar
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mt-2">
                Upcoming Club Events
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Explore interactive developer workshops, guest lectures, and hackathons.
              </p>
            </div>

            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline transition-colors group self-start md:self-auto"
            >
              <span>View All Events</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Events Grid */}
          {isLoadingEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-[#171717] animate-pulse border border-[#262626]" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((evt) => {
                const startDate = new Date(evt.start_time);
                const isOnline = evt.format === 'ONLINE';
                const spotsLeft = evt.capacity - (evt.registered_count || 0);

                return (
                  <article
                    key={evt.id}
                    className="flex flex-col justify-between p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 shadow-lg group"
                  >
                    <div className="space-y-4">
                      {/* Event Header Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#262626] text-white border border-[#404040]">
                          {evt.event_type.replace('_', ' ')}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          {isOnline ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-blue-400" /> Online
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-amber-400" /> In-Person
                            </>
                          )}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h3 className="text-lg font-bold text-white group-hover:text-slate-200 transition-colors line-clamp-2">
                        {evt.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {evt.description || 'Join DevCatalyst Club for an intensive hands-on technical workshop.'}
                      </p>

                      {/* Date & Location Details */}
                      <div className="space-y-1.5 pt-2 border-t border-[#262626] text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>
                            {startDate.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>
                            {startDate.toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                              timeZoneName: 'short',
                            })}
                          </span>
                        </div>
                        {evt.venue && (
                          <div className="flex items-center gap-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                            <span className="truncate">{evt.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action & Capacity Footer */}
                    <div className="pt-6 mt-4 border-t border-[#262626] flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        {spotsLeft > 0 ? `${spotsLeft} seats remaining` : 'Capacity Reached'}
                      </span>
                      <Link
                        to={`/events/${evt.id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E5] text-[#090909] text-xs font-bold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
                      >
                        Register
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#171717] border border-[#262626] space-y-3">
              <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Upcoming Events Scheduled</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                We are currently preparing our next round of technical workshops and hackathons. Check back soon or browse our full calendar.
              </p>
              <Link
                to="/events"
                className="inline-block mt-2 px-4 py-2 rounded-lg bg-[#262626] hover:bg-[#333333] text-white text-xs font-semibold"
              >
                Browse Past Activities
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION D: COMMUNITY / MEMBER SHOWCASE
          ===================================================================== */}
      <section id="members" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#090909] border-t border-[#262626] scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#171717] px-3 py-1 rounded-full border border-[#262626]">
                Our People
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mt-2">
                Meet the Community
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Passionate contributors and student leaders shaping projects across domains.
              </p>
            </div>

            <Link
              to="/members"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline transition-colors group self-start md:self-auto"
            >
              <span>Meet All Members</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Members Showcase Grid */}
          {isLoadingMembers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-[#171717] animate-pulse border border-[#262626]" />
              ))}
            </div>
          ) : featuredMembers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredMembers.map((m) => {
                const initials = m.full_name
                  ? m.full_name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'DC';

                return (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Member Header */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-[#262626] border border-[#404040] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/members/${m.id}`}
                            className="font-bold text-white hover:underline transition-colors text-sm truncate block"
                          >
                            {m.full_name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge role={m.primary_role} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                        {m.bio || 'Active DevCatalyst Club member and technical project contributor.'}
                      </p>

                      {/* Skills Chips */}
                      {m.skills && m.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {m.skills.map((skill: string) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#262626] text-slate-300 border border-[#333333]"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Member Footer Link */}
                    <div className="pt-4 mt-4 border-t border-[#262626] flex items-center justify-between text-xs">
                      {m.github_handle ? (
                        <a
                          href={`https://github.com/${m.github_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>@{m.github_handle}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">DevCatalyst Member</span>
                      )}

                      <Link
                        to={`/members/${m.id}`}
                        className="text-white hover:underline font-medium flex items-center gap-1 transition-colors"
                      >
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 rounded-2xl bg-[#171717] border border-[#262626]">
              Member directory profile showcase is loading.
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          SECTION F: PROJECTS & ACTIVITIES SHOWCASE
          ===================================================================== */}
      <section id="projects" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#090909] border-t border-[#262626] scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#171717] px-3 py-1 rounded-full border border-[#262626]">
              Technical Work
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Featured Club Projects
            </h2>
            <p className="text-sm text-slate-300">
              Real software built by club members collaborating across engineering and design.
            </p>
          </div>

          {/* Projects Grid */}
          {isLoadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-[#171717] animate-pulse border border-[#262626]" />
              ))}
            </div>
          ) : publicProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {publicProjects.map((p) => (
                <div
                  key={p.id}
                  className="p-6 rounded-2xl bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all hover:-translate-y-1 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#262626] text-white border border-[#404040]">
                        {p.code}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {p.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {p.description || 'Club collaborative technical project.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#262626] flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-white" />
                      {p.members_count} Contributors
                    </span>
                    <span className="text-[11px] font-mono">DevCatalyst OSS</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* =====================================================================
          SECTION G: JOIN THE CLUB CTA
          ===================================================================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#090909] border-t border-[#262626] relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171717] border border-[#262626] text-white text-xs font-bold">
            <Sparkles className="w-4 h-4 text-white" />
            <span>
              {activeCycle
                ? `Applications Active: ${activeCycle.title}`
                : 'Recruitment Opens Seasonally'}
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Ready to Build With Us?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            {activeCycle
              ? `We are currently accepting student applications for our ${activeCycle.title}. Join a squad of developers, sharpen your technical abilities, and work on real software.`
              : 'Our recruitment cycles open at the start of each semester. In the meantime, join our public events and hackathons to connect with our members!'}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/apply"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#090909] text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Apply to DevCatalyst Club
            </Link>

            <Link
              to="/events"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-[#171717] hover:bg-[#262626] border border-[#262626] text-white text-sm font-semibold transition-colors"
            >
              Explore Public Events
            </Link>
          </div>

          {activeCycle && (
            <p className="text-[11px] text-slate-400">
              Deadline:{' '}
              {new Date(activeCycle.end_date).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};
