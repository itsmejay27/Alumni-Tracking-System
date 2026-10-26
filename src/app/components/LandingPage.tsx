import React from 'react';
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
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { PROGRAMS } from '@/lib/programs';
import { useContactInfo } from '@/lib/settings';

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

export function LandingPage({ onSignIn, onSignUp }: LandingPageProps) {
  const contact = useContactInfo();

  return (
    <div className="min-h-[100dvh] w-full bg-white text-slate-800 font-sans">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="OMSU Logo" className="w-10 h-10 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-[#002060] leading-tight truncate">OMSU Alumni Tracer</p>
              <p className="text-[11px] text-slate-500 truncate">Occidental Mindoro State University</p>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#002060]">Features</a>
            <a href="#how" className="hover:text-[#002060]">How it works</a>
            <a href="#programs" className="hover:text-[#002060]">Programs</a>
            <a href="#contact" className="hover:text-[#002060]">Contact</a>
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
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-[1.25fr_1fr] gap-12 items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
              <ShieldCheck size={14} /> Official Graduate Tracer Study
            </p>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight">
              Where has your OMSU degree taken you?
            </h1>
            <p className="text-base sm:text-lg text-white/75 max-w-xl leading-relaxed">
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
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-16">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-[#002060]/70 mb-2">What you can do</p>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">One home for every OMSU graduate</h2>
          <p className="text-slate-600 mt-3">
            Individual answers stay confidential and are reported only in summary form for planning and accreditation.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-slate-50 p-6">
              <div className="w-10 h-10 rounded-xl bg-white text-[#002060] flex items-center justify-center mb-5 shadow-sm">
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-slate-50 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-12">How it works</h2>
          <ol className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#002060] text-white font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{s.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-16">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Programs we trace</h2>
        <p className="text-slate-600 mt-3 mb-10">Each program chair reviews the results for their own graduates.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROGRAMS.map((p) => (
            <div key={p.code} className="flex items-center gap-4 rounded-2xl bg-slate-50 px-5 py-4">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{p.code}</p>
                <p className="text-sm text-slate-600 truncate">{p.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
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
      <footer id="contact" className="bg-slate-50 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr] text-sm text-slate-600">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-extrabold text-[#002060]">Alumni Affairs Office</p>
                <p className="text-xs text-slate-500">Occidental Mindoro State University</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-slate-900">Visit us</p>
            <p className="flex items-start gap-2"><MapPin size={16} className="shrink-0 mt-0.5" /> {contact.location}</p>
            <p className="flex items-start gap-2">
              <Clock size={16} className="shrink-0 mt-0.5" />
              <span>{contact.officeDays}<br />{contact.officeHours}</span>
            </p>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-slate-900">Get in touch</p>
            <p className="flex items-center gap-2 break-all"><Mail size={16} className="shrink-0" /> {contact.email}</p>
            <p className="flex items-center gap-2"><Phone size={16} className="shrink-0" /> {contact.phone}</p>
          </div>
        </div>
        <div className="border-t border-slate-200/70">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-slate-400">
            © {new Date().getFullYear()} Occidental Mindoro State University · Alumni Graduate Tracer
          </p>
        </div>
      </footer>
    </div>
  );
}
