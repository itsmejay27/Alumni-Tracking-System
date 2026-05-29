import React, { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { AlumniRecords } from './components/AlumniRecords';
import { Analytics } from './components/Analytics';
import { JobBoard } from './components/JobBoard';
import { AlumniProfile } from './components/AlumniProfile';
import { CollegeOfficialsDirectory } from './components/CollegeOfficialsDirectory';
import { Announcements } from './components/Announcements';
import { Home as HomeView } from './components/Home';
import { Contact as ContactView } from './components/Contact';
import { Settings as SettingsView } from './components/Settings';
import { Toaster } from 'sonner';
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
  Settings as SettingsIcon
} from 'lucide-react';
import logo from '@/assets/logo.png';

type UserRole = string | null;

export interface CurrentUser {
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
}

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleLogin = (role: string, email: string) => {
    setUserRole(role);
    
    // Initialize default profile details
    const initialUser: CurrentUser = {
      email,
      role,
      givenName: '',
      lastName: '',
      middleName: '',
      mobileNo: '09171234567',
      presentAddress: 'Barangay Fatima, Mamburao, Occidental Mindoro',
      permanentAddress: 'Barangay Fatima, Mamburao, Occidental Mindoro',
      sex: 'Male',
      dateOfBirth: '1998-05-15',
      civilStatus: 'Single',
      facebookName: '',
      avatarUrl: ''
    };

    if (role === 'admin') {
      initialUser.givenName = 'JOSUE';
      initialUser.lastName = 'DELFIN';
      initialUser.middleName = 'C.';
      initialUser.title = 'Campus Director';
      initialUser.facebookName = 'Josue Delfin';
    } else if (role === 'admin.bsit') {
      initialUser.givenName = 'KARESA FAYE';
      initialUser.lastName = 'ZABALA';
      initialUser.middleName = 'D.';
      initialUser.title = 'IT Program Chair';
      initialUser.facebookName = 'Karesa Faye Zabala';
    } else if (role === 'admin.beed') {
      initialUser.givenName = 'DR. JOHN';
      initialUser.lastName = 'SMITH';
      initialUser.middleName = '';
      initialUser.title = 'BEED Program Chair';
    } else if (role === 'admin.bsba-fm') {
      initialUser.givenName = 'PROF. KERVIN';
      initialUser.lastName = 'RAMOS';
      initialUser.middleName = '';
      initialUser.title = 'BSBA-FM Program Chair';
    } else if (role === 'admin.bsba-om') {
      initialUser.givenName = 'PROF. MARIA';
      initialUser.lastName = 'SANTOS';
      initialUser.middleName = '';
      initialUser.title = 'BSBA-OM Program Chair';
    } else if (role === 'admin.bsoa') {
      initialUser.givenName = 'PROF. ELENA';
      initialUser.lastName = 'CRUZ';
      initialUser.middleName = '';
      initialUser.title = 'BSOA Program Chair';
    } else {
      // Alumni login
      const prefix = email.split('@')[0];
      if (prefix.includes('.')) {
        const parts = prefix.split('.');
        initialUser.givenName = parts[0].toUpperCase();
        initialUser.lastName = parts[1].toUpperCase();
      } else {
        initialUser.givenName = prefix.toUpperCase();
        initialUser.lastName = 'ALUMNI';
      }
      initialUser.middleName = 'MENDOZA';
      initialUser.facebookName = `${initialUser.givenName.charAt(0) + initialUser.givenName.slice(1).toLowerCase()} ${initialUser.lastName.charAt(0) + initialUser.lastName.slice(1).toLowerCase()}`;
    }

    const saved = localStorage.getItem(`profile_${email}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.email) parsed.email = email;
      setCurrentUser(parsed);
    } else {
      setCurrentUser(initialUser);
      localStorage.setItem(`profile_${email}`, JSON.stringify(initialUser));
    }

    // Alumni defaults to home tab, admin defaults to analytics dashboard
    setActiveTab(role.startsWith('admin') ? 'dashboard' : 'home');
  };

  const handleUpdateProfile = (updated: CurrentUser) => {
    setCurrentUser(updated);
    if (currentUser) {
      localStorage.setItem(`profile_${currentUser.email}`, JSON.stringify(updated));
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    setMobileMenuOpen(false);
  };

  if (!userRole) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster position="top-right" closeButton richColors />
      </>
    );
  }

  const isAdmin = userRole.startsWith('admin');

  // Convert role to clean label
  const getRoleLabel = () => {
    if (userRole === 'admin') return 'Super Admin';
    if (userRole === 'admin.beed') return 'BEED Chair';
    if (userRole === 'admin.bsit') return 'BSIT Chair';
    if (userRole === 'admin.bsba-fm') return 'BSBA-FM Chair';
    if (userRole === 'admin.bsba-om') return 'BSBA-OM Chair';
    if (userRole === 'admin.bsoa') return 'BSOA Chair';
    return 'Alumni Member';
  };

  const getSubLabel = () => {
    if (userRole === 'admin') return 'Director';
    if (userRole.startsWith('admin.')) return 'Program Chair';
    return 'OMSC Graduate';
  };

  // Nav menu item details
  const adminMenuItems = [
    { id: 'dashboard', label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'records', label: 'Alumni Records', icon: <Users size={18} /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone size={18} /> },
    { id: 'jobs', label: 'Job Board', icon: <Briefcase size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const alumniMenuItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon size={18} /> },
    { id: 'profile', label: 'Tracer Survey Form', icon: <UserCircle size={18} /> },
    { id: 'officials', label: 'College Officials', icon: <Users size={18} /> },
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
            <img src={logo} alt="OMSC Logo" className="w-full h-full object-contain" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-tight truncate">OMSC Tracer</h1>
              <p className="text-[10px] text-white/65 font-bold tracking-widest uppercase">Tracer Platform</p>
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-sm transition-all relative ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white border-l-4 border-white' 
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
                <p className="text-[10px] text-white/60 truncate mt-0.5">{currentUser?.title || getSubLabel()}</p>
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

      {/* 2. MOBILE MENU HEADER & DRAWER */}
      <div className="md:hidden flex flex-col w-full h-full min-h-0">
        <header className="flex items-center justify-between px-6 py-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 bg-white border border-border rounded-full flex items-center justify-center overflow-hidden p-0.5">
              <img src={logo} alt="OMSC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-none">OMSC Alumni</h1>
              <p className="text-[9px] text-white/75 tracking-wider font-bold uppercase mt-0.5">Tracer Platform</p>
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
                      <img src={logo} alt="OMSC Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-extrabold text-sm">OMSC Navigation</span>
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
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                        activeTab === item.id 
                          ? 'bg-white/15 text-white border-l-4 border-white' 
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
                    <p className="text-[10px] text-white/60 truncate mt-0.5">{currentUser?.title || getSubLabel()}</p>
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

        {/* Mobile Page Content Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {isAdmin ? (
            <>
              {activeTab === 'dashboard' && <Analytics userRole={userRole} />}
              {activeTab === 'records' && <AlumniRecords userRole={userRole} />}
              {activeTab === 'announcements' && <Announcements userRole={userRole} />}
              {activeTab === 'jobs' && <JobBoard userRole={userRole} />}
              {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
            </>
          ) : (
            <>
              {activeTab === 'home' && <HomeView onStartSurvey={() => setActiveTab('profile')} />}
              {activeTab === 'profile' && <AlumniProfile currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
              {activeTab === 'officials' && <CollegeOfficialsDirectory />}
              {activeTab === 'announcements' && <Announcements userRole={userRole} />}
              {activeTab === 'jobs' && <JobBoard userRole={userRole} />}
              {activeTab === 'contact' && <ContactView />}
              {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
            </>
          )}
        </main>
      </div>

      {/* 3. DESKTOP MAIN VIEWPORT */}
      <main className="hidden md:block flex-1 overflow-y-auto px-8 py-8">
        {isAdmin ? (
          <>
            {activeTab === 'dashboard' && <Analytics userRole={userRole} />}
            {activeTab === 'records' && <AlumniRecords userRole={userRole} />}
            {activeTab === 'announcements' && <Announcements userRole={userRole} />}
            {activeTab === 'jobs' && <JobBoard userRole={userRole} />}
            {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
          </>
        ) : (
          <>
            {activeTab === 'home' && <HomeView onStartSurvey={() => setActiveTab('profile')} />}
            {activeTab === 'profile' && <AlumniProfile currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
            {activeTab === 'officials' && <CollegeOfficialsDirectory />}
            {activeTab === 'announcements' && <Announcements userRole={userRole} />}
            {activeTab === 'jobs' && <JobBoard userRole={userRole} />}
            {activeTab === 'contact' && <ContactView />}
            {activeTab === 'settings' && <SettingsView currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />}
          </>
        )}
      </main>

      <Toaster position="top-right" closeButton richColors />
    </div>
  );
}