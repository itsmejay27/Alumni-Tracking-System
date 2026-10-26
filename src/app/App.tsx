import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LoginPage, AuthMode } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
import { LoadingState } from './components/DataState';
import { SetNewPassword } from './components/SetNewPassword';
import { AccountsManager } from './components/AccountsManager';
import { LinkStudentId } from './components/LinkStudentId';
import { AlumniRecords } from './components/AlumniRecords';
import { Analytics } from './components/Analytics';
import { JobBoard } from './components/JobBoard';
import { AlumniProfile } from './components/AlumniProfile';
import { CollegeOfficialsDirectory } from './components/CollegeOfficialsDirectory';
import { Announcements } from './components/Announcements';
import { Home as HomeView } from './components/Home';
import { Contact as ContactView } from './components/Contact';
import { Settings as SettingsView } from './components/Settings';
import { toast } from 'sonner';
import { AppToaster } from './components/AppToaster';
import { ConfirmHost } from './components/ConfirmDialog';
import { roleLabel } from '@/lib/programs';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Briefcase, 
  BarChart3, 
  UserCircle, 
  LogOut, 
  Megaphone, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap,
  Home as HomeIcon,
  PhoneCall,
  Settings as SettingsIcon,
  UserCog
} from 'lucide-react';
import logo from '@/assets/logo.png';

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  givenName: string;
  lastName: string;
  middleName: string;
  mobileNo: string;
  presentAddress: string;
  permanentAddress: string;
  sex: 'Female' | 'Male';
  dateOfBirth: string;
  civilStatus: 'Single' | 'Married' | 'Separated' | 'Widowed';
  facebookName: string;
  avatarUrl?: string;
  title?: string;
  mustChangePassword?: boolean;
}

function profileToUser(p: any): CurrentUser {
  return {
    id: p.id,
    email: p.email,
    role: p.role,
    givenName: p.given_name,
    lastName: p.last_name,
    middleName: p.middle_name,
    mobileNo: p.mobile_no,
    presentAddress: p.present_address,
    permanentAddress: p.permanent_address,
    sex: p.sex,
    dateOfBirth: p.date_of_birth,
    civilStatus: p.civil_status,
    facebookName: p.facebook_name,
    avatarUrl: p.avatar_url,
    title: p.title,
    mustChangePassword: p.must_change_password,
  };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  // Alumni accounts must be linked to a graduate record (Student ID) before using the system
  const [needsLink, setNeedsLink] = useState<boolean | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthMode | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Track the Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true);
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the signed-in user's profile (role decides which screens they see)
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setCurrentUser(null);
      setNeedsLink(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          toast.error('Could not load your profile. Please sign in again.');
          supabase.auth.signOut();
          return;
        }
        const user = profileToUser(data);
        if (user.role === 'alumni') {
          supabase
            .from('alumni_records')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data: rec }) => !cancelled && setNeedsLink(!rec));
        } else setNeedsLink(false);
        setCurrentUser(user);
        setAuthScreen(null);
        setActiveTab(user.role.startsWith('admin') ? 'dashboard' : 'home');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleUpdateProfile = async (updated: CurrentUser) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        given_name: updated.givenName,
        last_name: updated.lastName,
        middle_name: updated.middleName,
        mobile_no: updated.mobileNo,
        present_address: updated.presentAddress,
        permanent_address: updated.permanentAddress,
        sex: updated.sex,
        date_of_birth: updated.dateOfBirth,
        civil_status: updated.civilStatus,
        facebook_name: updated.facebookName,
        avatar_url: updated.avatarUrl || '',
      })
      .eq('id', updated.id)
      .select('*')
      .single();
    if (error) throw error;
    setCurrentUser(profileToUser(data));
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
  };

  if (!authReady || (session && !currentUser) || (currentUser?.role === 'alumni' && needsLink === null)) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-50">
        <LoadingState label="Loading..." />
      </div>
    );
  }

  if (session && currentUser && needsLink && !recoveringPassword) {
    return (
      <>
        <LinkStudentId defaultLastName={currentUser.lastName} onLinked={() => setNeedsLink(false)} />
        <AppToaster />
      </>
    );
  }

  if (session && currentUser && (recoveringPassword || currentUser.mustChangePassword)) {
    const finish = async () => {
      if (currentUser.mustChangePassword) {
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', currentUser.id);
        setCurrentUser({ ...currentUser, mustChangePassword: false });
      }
      setRecoveringPassword(false);
    };
    return (
      <>
        <SetNewPassword
          onDone={finish}
          message={
            currentUser.mustChangePassword
              ? 'Welcome! You signed in with a temporary password. Please choose your own password to continue.'
              : undefined
          }
        />
        <AppToaster />
        <ConfirmHost />
      </>
    );
  }

  if (!session || !currentUser) {
    return (
      <>
        <LandingPage onSignIn={() => setAuthScreen('signin')} onSignUp={() => setAuthScreen('signup')} />
        {authScreen && <LoginPage key={authScreen} initialMode={authScreen} onClose={() => setAuthScreen(null)} onPasswordRecovery={setRecoveringPassword} />}
        <AppToaster />
        <ConfirmHost />
      </>
    );
  }

  const userRole = currentUser.role;
  const isAdmin = userRole.startsWith('admin');

  // Convert role to clean label
  const getRoleLabel = () => roleLabel(userRole);
  const getSubLabel = () => roleLabel(userRole);
  const appName = isAdmin ? 'OMSU Tracer' : 'OMSU Alumni';

  // Nav menu item details
  const adminMenuItems = [
    { id: 'dashboard', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'records', label: 'Alumni Records', icon: <Users size={18} /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
    { id: 'jobs', label: 'Job Board', icon: <Briefcase size={18} /> },
    ...(userRole === 'admin' ? [{ id: 'contact', label: 'Contact Info', icon: <PhoneCall size={18} /> }] : []),
    ...(userRole === 'admin' ? [{ id: 'accounts', label: 'Accounts', icon: <UserCog size={18} /> }] : []),
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const alumniMenuItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon size={18} /> },
    { id: 'profile', label: 'My Alumni Profile', icon: <UserCircle size={18} /> },
    { id: 'officials', label: 'Directory', icon: <Users size={18} /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
    { id: 'jobs', label: 'Job Board', icon: <Briefcase size={18} /> },
    { id: 'contact', label: 'Contact Us', icon: <PhoneCall size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const menuItems = isAdmin ? adminMenuItems : alumniMenuItems;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans">
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP */}
      <aside 
        className={`hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 relative shrink-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`p-5 flex items-center border-b border-sidebar-border ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-border shrink-0 shadow-inner overflow-hidden p-0.5">
            <img src={logo} alt="OMSU Logo" className="w-full h-full object-contain" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-tight truncate">{appName}</h1>
              <p className="text-[11px] text-white/60">Graduate Tracer</p>
            </div>
          )}
        </div>

        {/* Collapsible Trigger Button */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-6 -right-3 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 shadow-md transition-colors z-10"
        >
          {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-colors relative ${
                activeTab === item.id 
                  ? 'bg-white/12 text-white' 
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <div className="shrink-0">{item.icon}</div>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer / User Panel */}
        <div className="p-4 border-t border-sidebar-border bg-black/10">
          <div className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {currentUser?.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt="Avatar" 
                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/20"
              />
            ) : (
              <div className="w-10 h-10 bg-white/10 text-white font-extrabold rounded-lg flex items-center justify-center shrink-0 border border-white/15 uppercase text-sm">
                {currentUser ? `${currentUser.givenName[0] || ''}${currentUser.lastName[0] || ''}` : 'AL'}
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs truncate leading-tight text-white">
                  {currentUser ? `${currentUser.givenName} ${currentUser.lastName}`.trim() : getRoleLabel()}
                </p>
                <p className="text-[10px] text-white/60 truncate mt-0.5">{getSubLabel()}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3.5 px-4 py-2.5 bg-red-600/20 text-red-100 hover:bg-red-600 font-bold text-xs rounded-lg transition-all border border-red-500/20 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={14} />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main container wrapping the Mobile Header & unified viewport */}
      <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden">
        
        {/* 2. MOBILE MENU HEADER */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 bg-white border border-border rounded-full flex items-center justify-center overflow-hidden p-0.5">
              <img src={logo} alt="OMSU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-none">{appName}</h1>
              <p className="text-[11px] text-white/60 mt-0.5">Graduate Tracer</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 border border-white/20 rounded-lg hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
            <aside className="fixed inset-y-0 right-0 w-72 bg-sidebar text-sidebar-foreground border-l border-sidebar-border flex flex-col justify-between p-6 shadow-2xl animate-in slide-in-from-right duration-200">
              
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-sidebar-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border rounded-full overflow-hidden p-0.5">
                      <img src={logo} alt="OMSU Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-extrabold text-sm">{appName}</span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-white/70 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                        activeTab === item.id 
                          ? 'bg-white/12 text-white' 
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="pt-6 border-t border-sidebar-border space-y-4">
                <div className="flex items-center gap-3">
                  {currentUser?.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt="Avatar" 
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-white/10 text-white font-extrabold rounded-lg flex items-center justify-center shrink-0 border border-white/15 uppercase text-sm">
                      {currentUser ? `${currentUser.givenName[0] || ''}${currentUser.lastName[0] || ''}` : 'AL'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate leading-tight text-white">
                      {currentUser ? `${currentUser.givenName} ${currentUser.lastName}`.trim() : getRoleLabel()}
                    </p>
                    <p className="text-[10px] text-white/60 truncate mt-0.5">{getSubLabel()}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-600/20 text-red-100 border border-red-500/20 hover:bg-red-600 font-bold text-xs rounded-lg transition-all"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>

            </aside>
          </div>
        )}

        {/* 3. UNIFIED CONTENT VIEWPORT */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 min-w-0">
          {isAdmin ? (
            <>
              {activeTab === 'dashboard' && <Analytics userRole={userRole} />}
              {activeTab === 'records' && <AlumniRecords userRole={userRole} />}
              {activeTab === 'announcements' && <Announcements userRole={userRole} authorName={`${currentUser.givenName} ${currentUser.lastName}`.trim() || currentUser.email} />}
              {activeTab === 'jobs' && <JobBoard userRole={userRole} userId={currentUser.id} posterName={isAdmin ? `${`${currentUser.givenName} ${currentUser.lastName}`.trim() || currentUser.email} · ${roleLabel(userRole)}` : `${currentUser.givenName} ${currentUser.lastName}`.trim() || currentUser.email} />}
              {activeTab === 'contact' && userRole === 'admin' && <ContactView editable />}
              {activeTab === 'accounts' && userRole === 'admin' && <AccountsManager currentUserId={currentUser.id} />}
              {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
            </>
          ) : (
            <>
              {activeTab === 'home' && <HomeView onStartSurvey={() => setActiveTab('profile')} userId={currentUser.id} firstName={currentUser.givenName} />}
              {activeTab === 'profile' && <AlumniProfile currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
              {activeTab === 'officials' && <CollegeOfficialsDirectory />}
              {activeTab === 'announcements' && <Announcements userRole={userRole} authorName={`${currentUser.givenName} ${currentUser.lastName}`.trim() || currentUser.email} />}
              {activeTab === 'jobs' && <JobBoard userRole={userRole} userId={currentUser.id} posterName={isAdmin ? `${`${currentUser.givenName} ${currentUser.lastName}`.trim() || currentUser.email} · ${roleLabel(userRole)}` : `${currentUser.givenName} ${currentUser.lastName}`.trim() || currentUser.email} />}
              {activeTab === 'contact' && <ContactView />}
              {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onOpenProfile={() => setActiveTab('profile')} />}
            </>
          )}
        </main>
      </div>

      <AppToaster />
        <ConfirmHost />
    </div>
  );
}