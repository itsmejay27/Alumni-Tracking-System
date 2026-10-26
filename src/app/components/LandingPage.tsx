import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Briefcase,
  Megaphone,
  BarChart3,
  UserPlus,
  FileCheck2,
  BellRing,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Eye,
  Target,
  Heart,
  ChevronDown,
  Lock,
  GraduationCap,
  Building2,
  Flag,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { PROGRAMS } from '@/lib/programs';
import { useAboutInfo, useContactInfo } from '@/lib/settings';
import { LegalDoc, LegalModal } from './Legal';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const features = [
  {
    icon: <ClipboardList size={20} />,
    title: 'Graduate Tracer Survey',
    text: 'Answer the tracer survey online. Your employment history is kept, not overwritten, every time you update.',
  },
  {
    icon: <Briefcase size={20} />,
    title: 'Job Board',
    text: 'Openings shared by program chairs, partner employers and fellow alumni, with jobs for your program shown first.',
  },
  {
    icon: <Megaphone size={20} />,
    title: 'Announcements',
    text: 'Homecomings, seminars and notices from Alumni Affairs and your program chair in one feed.',
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Employment Analytics',
    text: 'Employment rates per batch and program, government vs. private, and job level, for planning and accreditation.',
  },
];

const steps = [
  { icon: <UserPlus size={18} />, title: 'Create your account', text: 'Sign up with the email you use every day.' },
  { icon: <FileCheck2 size={18} />, title: 'Answer the tracer survey', text: 'Tell us where your degree has taken you.' },
  { icon: <BellRing size={18} />, title: 'Keep it up to date', text: 'Your program chair may remind you to update every few years.' },
];

const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'about', label: 'About OMSU' },
  { id: 'how', label: 'How it works' },
  { id: 'programs', label: 'Programs' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
];

const reasons = [
  { icon: <GraduationCap size={18} />, title: 'Better programs', text: 'Your answers show which skills employers need, so courses can be updated.' },
  { icon: <Building2 size={18} />, title: 'Accreditation', text: 'Tracer results are required by CHED and accrediting bodies such as AACCUP.' },
  { icon: <Lock size={18} />, title: 'Kept private', text: 'Handled under the Data Privacy Act of 2012 and reported only in summary form.' },
];

const faqs = [
  {
    q: 'Who can create an account?',
    a: 'OMSU graduates whose Student ID is in the University records. Use the Student ID printed on your school ID or transcript, together with your last name.',
  },
  {
    q: 'I don\'t know my Student ID. What should I do?',
    a: 'Check your old school ID, Certificate of Registration or Transcript of Records. You can also ask your program chair or the Alumni Affairs Office.',
  },
  {
    q: 'Can other alumni see my answers?',
    a: 'No. Only Alumni Affairs and the chair of your own program can see your record. Published results are summaries only.',
  },
  {
    q: 'How often should I update my record?',
    a: 'Whenever your job changes. Your previous jobs are kept as history, so updating never erases what you entered before.',
  },
  {
    q: 'I\'m not working right now. Should I still answer?',
    a: 'Yes. Every answer counts, including unemployed, further studies or self-employed. It gives an honest picture of each batch.',
  },
];

/** Smoothly scrolls to a section and keeps the URL clean. */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: reduce ? 'auto' : 'smooth' });
}

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const contact = useContactInfo();
  const about = useAboutInfo();
  const [active, setActive] = useState('');
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Highlight the nav link of the section in view
  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((el) => io.observe(el));
    const onTop = () => {
      if (window.scrollY < 200) setActive('');
      else if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) setActive('contact');
    };
    window.addEventListener('scroll', onTop, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onTop);
    };
  }, []);

  const link = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else scrollToId(id);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white text-slate-800 font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="#top" onClick={link('top')} className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="OMSU Logo" className="w-10 h-10 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-[#002060] leading-tight truncate">OMSU Alumni Tracer</p>
              <p className="text-[11px] text-slate-500 truncate">Occidental Mindoro State University</p>
            </div>
          </a>
          <nav className="hidden lg:flex items-center gap-1 text-[15px] font-semibold">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={link(n.id)}
                className={`group relative px-3 py-2 rounded-full transition-colors duration-300 ${
                  active === n.id ? 'text-[#002060]' : 'text-slate-600 hover:text-[#002060]'
                }`}
              >
                {n.label}
                <span
                  className={`absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-[#f5c400] origin-left transition-transform duration-300 ease-out ${
                    active === n.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onSignIn} className="px-3 sm:px-4 py-2 text-sm font-semibold text-[#002060] hover:bg-slate-100 rounded-full">
              Log in
            </button>
            <button
              onClick={onSignUp}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-white bg-[#002060] hover:bg-[#001740] rounded-full"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-[#002060] text-white">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-[1.25fr_1fr] gap-12 items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
              <ShieldCheck size={14} /> Official Graduate Tracer Study
            </p>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight">
              Where has your OMSU degree taken you?
            </h1>
            <p className="text-lg sm:text-xl text-white/85 max-w-xl leading-relaxed">
              Share your career journey, find opportunities from fellow alumni, and help shape the programs that shaped you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                onClick={onSignUp}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f5c400] text-[#002060] font-bold rounded-full hover:brightness-95"
              >
                Get Started <ArrowRight size={18} />
              </button>
              <button
                onClick={onSignIn}
                className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/15"
              >
                I already have an account
              </button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <img src={logo} alt="" className="w-72 h-72 lg:w-80 lg:h-80 object-contain drop-shadow-2xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#eef2fa]"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-bold uppercase tracking-wider text-[#b38f00] mb-2">What you can do</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#002060] tracking-tight">One home for every OMSU graduate</h2>
          <p className="text-lg text-slate-700 mt-3">
            Individual answers stay confidential and are reported only in summary form for planning and accreditation.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-[#002060]/10">
              <div className="w-12 h-12 rounded-xl bg-[#002060] text-[#f5c400] flex items-center justify-center mb-5">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-[#002060]">{f.title}</h3>
              <p className="text-[15px] text-slate-700 mt-2 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div></section>

      {/* About OMSU: Vision, Mission, Core Values */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-bold uppercase tracking-wider text-[#b38f00] mb-2">About OMSU</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#002060] tracking-tight">Vision, Mission, Goals and Core Values</h2>
          <p className="text-lg text-slate-700 mt-3">
            Formerly Occidental Mindoro State College, OMSU was converted into a state university under Republic Act No. 11587 and
            serves the province through instruction, research, extension and production.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-[#002060] text-white p-7 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-[#f5c400] text-[#002060] flex items-center justify-center"><Eye size={20} /></span>
              <h3 className="text-xl font-bold">Vision</h3>
            </div>
            <p className="text-[15px] leading-relaxed text-white/90 whitespace-pre-line">{about.vision}</p>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-[#002060]/15 p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl bg-[#002060] text-[#f5c400] flex items-center justify-center"><Target size={20} /></span>
              <h3 className="text-xl font-bold text-[#002060]">Mission</h3>
            </div>
            <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">{about.mission}</p>
          </div>
        </div>
        {about.goals.length > 0 && (
          <div className="mt-5 rounded-2xl bg-white ring-1 ring-[#002060]/15 p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-[#f5c400] text-[#002060] flex items-center justify-center"><Flag size={20} /></span>
              <h3 className="text-xl font-bold text-[#002060]">Goals and Objectives</h3>
            </div>
            <ol className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {about.goals.map((g, i) => (
                <li key={i} className="flex gap-3 text-[15px] text-slate-700 leading-relaxed">
                  <span className="w-6 h-6 mt-0.5 rounded-full bg-[#eef2fa] text-[#002060] text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {g}
                </li>
              ))}
            </ol>
          </div>
        )}
        {about.coreValues.length > 0 && (
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-lg font-bold text-[#002060] mb-4">
              <Heart size={18} className="text-[#b38f00]" /> Core Values
              <span className="text-sm font-semibold text-slate-500">· {about.coreValues.map((v) => v.title.charAt(0)).join('')}</span>
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {about.coreValues.map((v) => (
                <div key={v.title} className="rounded-xl bg-[#eef2fa] p-5 transition-colors duration-300 hover:bg-[#e3e9f7]">
                  <p className="flex items-center gap-2 font-bold text-[#002060]">
                    <span className="w-7 h-7 rounded-lg bg-[#002060] text-[#f5c400] text-sm font-black flex items-center justify-center shrink-0">
                      {v.title.charAt(0)}
                    </span>
                    {v.title}
                  </p>
                  {v.text && <p className="text-sm text-slate-700 mt-2 leading-relaxed">{v.text}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how" className="bg-[#002060] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-12">How it works</h2>
          <ol className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#f5c400] text-[#002060] text-lg font-black flex items-center justify-center">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="text-[15px] text-white/80 mt-1">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-14 pt-10 border-t border-white/10">
            <h3 className="text-xl font-bold mb-6">Why your answer matters</h3>
            <div className="grid md:grid-cols-3 gap-5">
              {reasons.map((r) => (
                <div key={r.title} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5">
                  <div className="flex items-center gap-2 font-bold text-[#f5c400]">{r.icon} {r.title}</div>
                  <p className="text-[15px] text-white/80 mt-2">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#002060] tracking-tight">Programs we trace</h2>
        <p className="text-lg text-slate-700 mt-3 mb-10">Each program chair reviews the results for their own graduates.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROGRAMS.map((p) => (
            <div key={p.code} className="flex items-center gap-4 rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-200 shadow-sm">
              <span className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-black" style={{ background: p.color }}>
                {p.code.split('-')[0].slice(0, 4)}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-[#002060]">{p.code}</p>
                <p className="text-[15px] text-slate-700">{p.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#eef2fa]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#002060] tracking-tight mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="rounded-2xl bg-white ring-1 ring-[#002060]/10 shadow-sm">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-[#002060]"
                  >
                    {f.q}
                    <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-[15px] text-slate-700 leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-3xl bg-[#002060] text-white p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to be counted?</h2>
            <p className="text-white/75 mt-2">It takes about five minutes, and it helps future OMSU students.</p>
          </div>
          <button
            onClick={onSignUp}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f5c400] text-[#002060] font-bold rounded-full hover:brightness-95 shrink-0"
          >
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Contact / footer */}
      <footer id="contact" className="bg-[#002060] text-white/80 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="w-9 h-9 object-contain shrink-0" />
            <div>
              <p className="font-bold text-white leading-tight">Alumni Affairs Office</p>
              <p className="text-xs text-white/60">Occidental Mindoro State University</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-start gap-2"><MapPin size={14} className="shrink-0 mt-0.5 text-[#f5c400]" /> {contact.location}</p>
            <p className="flex items-start gap-2"><Clock size={14} className="shrink-0 mt-0.5 text-[#f5c400]" /> {contact.officeDays}, {contact.officeHours}</p>
          </div>
          <div className="space-y-1.5">
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 break-all hover:text-white transition-colors">
              <Mail size={14} className="shrink-0 text-[#f5c400]" /> {contact.email}
            </a>
            <p className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-[#f5c400]" /> {contact.phone}</p>
          </div>
          <div className="flex lg:flex-col gap-4 lg:gap-1.5 lg:items-end">
            <button onClick={() => setLegal('terms')} className="text-sm text-white/80 hover:text-white transition-colors">Terms of Use</button>
            <button onClick={() => setLegal('privacy')} className="text-sm text-white/80 hover:text-white transition-colors">Privacy Policy</button>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-white/50">
            © {new Date().getFullYear()} Occidental Mindoro State University · Alumni Graduate Tracer
          </p>
        </div>
      </footer>

      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}
