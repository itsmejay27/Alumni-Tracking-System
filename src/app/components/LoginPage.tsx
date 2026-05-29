import React, { useState } from 'react';
import { Shield, User, Lock, BookOpen } from 'lucide-react';
import logo from '@/assets/logo.png';

interface LoginPageProps {
  onLogin: (role: string, email: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const formattedEmail = email.toLowerCase().trim();

    // Admin accounts mappings
    if (formattedEmail === 'admin@omsc.edu.ph' && password === 'admin123') {
      onLogin('admin', formattedEmail);
    } else if (formattedEmail === 'admin.beed@omsc.edu.ph' && password === 'beed123') {
      onLogin('admin.beed', formattedEmail);
    } else if (formattedEmail === 'admin.bsit@omsc.edu.ph' && password === 'bsit123') {
      onLogin('admin.bsit', formattedEmail);
    } else if (formattedEmail === 'admin.bsba-fm@omsc.edu.ph' && password === 'bsbafm123') {
      onLogin('admin.bsba-fm', formattedEmail);
    } else if (formattedEmail === 'admin.bsba-om@omsc.edu.ph' && password === 'bsbaom123') {
      onLogin('admin.bsba-om', formattedEmail);
    } else if (formattedEmail === 'admin.bsoa@omsc.edu.ph' && password === 'bsoa123') {
      onLogin('admin.bsoa', formattedEmail);
    } else if (formattedEmail.endsWith('@omsc.edu.ph') && password.length > 0) {
      onLogin('alumni', formattedEmail);
    } else {
      setError('Invalid credentials. Check the credentials guide below.');
    }
  };

  return (
    <div className="size-full min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow border border-slate-200 overflow-hidden p-1">
              <img src={logo} alt="OMSC Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-[#002060]">
              OMSC Alumni Graduate Tracker
            </h1>
            <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-1.5">
              Occidental Mindoro State College
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#002060] focus:ring-1 focus:ring-[#002060] text-sm font-medium"
                  placeholder="your.email@omsc.edu.ph"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#002060] focus:ring-1 focus:ring-[#002060] text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3.5">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#002060] hover:bg-[#001740] text-white rounded-lg font-bold transition-colors text-sm shadow-sm"
            >
              Sign In to Account
            </button>
          </form>


          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-border/80">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credentials Quick Guide</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 hover:bg-blue-500/10 transition-colors">
                <p className="font-bold text-primary mb-1">Super Admin Account</p>
                <p className="text-muted-foreground">Email: <span className="font-mono select-all">admin@omsc.edu.ph</span></p>
                <p className="text-muted-foreground">Password: <span className="font-mono">admin123</span></p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 hover:bg-emerald-500/10 transition-colors">
                <p className="font-bold text-emerald-600 mb-1">Alumni Account</p>
                <p className="text-muted-foreground">Email: <span className="font-mono">name@omsc.edu.ph</span></p>
                <p className="text-muted-foreground">Password: <span className="font-mono">any password</span></p>
              </div>
              <div className="col-span-1 sm:col-span-2 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                <p className="font-bold text-amber-600 mb-1.5 flex items-center gap-1">
                  <BookOpen size={12} /> Course Admins (Course Specific access)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
                  <div>BSIT: <span className="text-foreground">admin.bsit / bsit123</span></div>
                  <div>BEED: <span className="text-foreground">admin.beed / beed123</span></div>
                  <div>BSOA: <span className="text-foreground">admin.bsoa / bsoa123</span></div>
                  <div>BSBA-FM: <span className="text-foreground text-[9px]">admin.bsba-fm / bsbafm123</span></div>
                  <div>BSBA-OM: <span className="text-foreground text-[9px]">admin.bsba-om / bsbaom123</span></div>
                </div>
                <p className="text-[10px] text-amber-500/70 mt-1.5">Suffix all emails with @omsc.edu.ph</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

