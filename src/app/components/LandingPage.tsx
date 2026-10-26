import React from 'react';
import {
  ClipboardList,
  Briefcase,
  Megaphone,
  BarChart3,
  GraduationCap,
  UserPlus,
  FileCheck2,
  Users,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import logo from '@/assets/logo.png';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const features = [
  {
    icon: <ClipboardList size={22} />,
    title: 'Graduate Tracer Survey',
    text: 'Update your personal, education and employment details in one form. It takes about five minutes.',
  },
  {
    icon: <Briefcase size={22} />,
    title: 'Alumni Job Board',
    text: 'Browse openings shared by fellow graduates and partner employers, or post one yourself.',
  },
  {
    icon: <Megaphone size={22} />,
    title: 'Announcements & Events',
    text: 'Homecomings, seminars and notices from the university and your program, all in one feed.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Employment Analytics',
    text: 'Program chairs see real-time employability data per batch to guide curriculum and accreditation.',
  },
];

const programs = [
  { code: 'BSIT', name: 'BS Information Technology' },
  { code: 'BEED', name: 'Bachelor of Elementary Education' },
  { code: 'BSBA-FM', name: 'BSBA Major in Financial Management' },
  { code: 'BSBA-OM', name: 'BSBA Major in Operations Management' },
  { code: 'BSOA', name: 'BS Office Administration' },
];

const steps = [
  { icon: <UserPlus size={20} />, title: 'Create your account', text: 'Sign up with the email you use every day.' },
  { icon: <FileCheck2 size={20} />, title: 'Answer the tracer survey', text: 'Tell us where your degree has taken you.' },
  { icon: <Users size={20} />, title: 'Stay connected', text: 'Get job leads, event invites and updates from OMSU.' },
];

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto bg-white text-slate-800 font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shrink-0">
              <img src={logo} alt="OMSU Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-[#002060] leading-tight truncate">OMSU Alumni Tracer</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">
                Occidental Mindoro State University
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSignIn}
              className="px-3 sm:px-4 py-2 text-sm font-bold text-[#002060] hover:bg-slate-100 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-bold text-white bg-[#002060] hover:bg-[#001740] rounded-lg"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#002060] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-[1.3fr_1fr] gap-10 items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70">
              <GraduationCap size={16} /> Alumni Graduate Tracer Study
            </p>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight">
              Where has your OMSU degree taken you?
            </h1>
            <p className="text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
              The official alumni tracking platform of Occidental Mindoro State University. Share your career
              journey, find opportunities, and help shape the programs that shaped you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onSignUp}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#002060] font-bold rounded-lg hover:bg-slate-100"
              >
                Create Alumni Account <ArrowRight size={18} />
              </button>
              <button
                onClick={onSignIn}
                className="inline-flex items-center justify-center px-6 py-3 border border-white/40 text-white font-bold rounded-lg hover:bg-white/10"
              >
                I already have an account
              </button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="w-64 h-64 lg:w-72 lg:h-72 rounded-full bg-white p-3 shadow-2xl ring-8 ring-white/10">
              <img src={logo} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002060]">One place for every OMSU graduate</h2>
          <p className="text-slate-600 mt-2">
            Your answers stay confidential and are reported only in summary form for planning and accreditation.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="border border-slate-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-lg bg-[#002060]/10 text-[#002060] flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002060] mb-10">How it works</h2>
          <ol className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Programs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002060]">Programs we trace</h2>
        <p className="text-slate-600 mt-2 mb-8">Each program chair reviews the results for their own graduates.</p>
        <div className="flex flex-wrap gap-3">
          {programs.map((p) => (
            <div key={p.code} className="flex items-center gap-3 border border-slate-200 rounded-full pl-2 pr-5 py-2">
              <span className="px-2.5 py-1 rounded-full bg-[#002060] text-white text-xs font-bold">{p.code}</span>
              <span className="text-sm font-semibold text-slate-700">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="rounded-2xl bg-[#002060] text-white p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold">Ready to be counted?</h2>
            <p className="text-white/80 mt-1">Your response helps future OMSU students get better programs and better jobs.</p>
          </div>
          <button
            onClick={onSignUp}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#002060] font-bold rounded-lg hover:bg-slate-100 shrink-0"
          >
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-6 md:grid-cols-3 text-sm text-slate-600">
          <div>
            <p className="font-extrabold text-[#002060]">OMSU Alumni Affairs Office</p>
            <p className="mt-1">Occidental Mindoro State University</p>
          </div>
          <div className="space-y-2">
            <p className="flex items-start gap-2"><MapPin size={16} className="shrink-0 mt-0.5" /> Labangan, San Jose, Occidental Mindoro 5100</p>
            <p className="flex items-center gap-2"><Phone size={16} className="shrink-0" /> +63 (043) 491-1436</p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2"><Mail size={16} className="shrink-0" /> alumni.affairs@omsu.edu.ph</p>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} Occidental Mindoro State University</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
