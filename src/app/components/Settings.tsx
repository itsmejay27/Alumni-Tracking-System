import React, { useState, useRef } from 'react';
import { ShieldAlert, Key, Eye, EyeOff, Save, User, Mail, Phone, MapPin, Calendar, HelpCircle, Check, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { CurrentUser } from '../App';

interface SettingsProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => void;
}

export function Settings({ currentUser, onUpdateProfile }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Profile form state (initialized from currentUser prop)
  const [givenName, setGivenName] = useState(currentUser?.givenName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [middleName, setMiddleName] = useState(currentUser?.middleName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [mobileNo, setMobileNo] = useState(currentUser?.mobileNo || '');
  const [presentAddress, setPresentAddress] = useState(currentUser?.presentAddress || '');
  const [permanentAddress, setPermanentAddress] = useState(currentUser?.permanentAddress || '');
  const [sex, setSex] = useState<'Male' | 'Female'>(currentUser?.sex || 'Male');
  const [civilStatus, setCivilStatus] = useState<'Single' | 'Married' | 'Separated' | 'Widowed'>(currentUser?.civilStatus || 'Single');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser?.dateOfBirth || '');
  const [facebookName, setFacebookName] = useState(currentUser?.facebookName || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match. Please verify.');
      return;
    }

    // Success simulation
    toast.success('Your security password has been changed successfully!');
    
    // Clear fields
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) { // 25MB check (Base64 size limits in localStorage)
        toast.error('Image exceeds 25 MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        toast.info('Profile picture draft uploaded! Click "Save Changes" to apply.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!givenName.trim() || !lastName.trim()) {
      toast.error('First and Last names are strictly required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid institutional email address.');
      return;
    }

    setIsSavingProfile(true);

    // Simulate saving delay for premium feedback
    setTimeout(() => {
      if (currentUser) {
        const updated: CurrentUser = {
          ...currentUser,
          givenName: givenName.trim().toUpperCase(),
          lastName: lastName.trim().toUpperCase(),
          middleName: middleName.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          mobileNo: mobileNo.trim(),
          presentAddress: presentAddress.trim(),
          permanentAddress: permanentAddress.trim(),
          sex,
          civilStatus,
          dateOfBirth,
          facebookName: facebookName.trim(),
          avatarUrl,
        };
        onUpdateProfile(updated);
        toast.success('Your tracer profile details have been saved successfully!');
      } else {
        toast.error('No active session found.');
      }
      setIsSavingProfile(false);
    }, 800);
  };

  const selectPredefinedAvatar = (avatarHex: string) => {
    // Generate a beautiful svg or canvas initials avatar
    setAvatarUrl(avatarHex);
    toast.info('Initial avatar selected! Click "Save Changes" to save.');
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Account Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your academic credentials, profile details, and account security</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User size={16} />
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key size={16} />
          Account Security
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <User className="text-primary" size={20} />
            <h3 className="font-bold text-lg text-foreground">Edit Profile Information</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Profile Picture</label>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-muted/20 border border-border rounded-xl">
                <div className="relative w-24 h-24 bg-card border-2 border-border rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 text-primary font-black text-2xl flex items-center justify-center uppercase">
                      {(givenName[0] || '') + (lastName[0] || '') || 'OM'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                  >
                    <Camera size={18} />
                  </button>
                </div>

                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-[#001740] font-bold text-xs rounded-lg transition-colors shadow-sm"
                    >
                      Choose Photo File
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-bold text-xs rounded-lg transition-colors border border-border"
                      >
                        Reset Picture
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Supported formats: JPG, PNG, or WEBP. Max size 25MB.</p>
                </div>
              </div>
            </div>

            {/* Grid of Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Given Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">First / Given Name *</label>
                <input
                  type="text"
                  required
                  value={givenName}
                  onChange={(e) => setGivenName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium uppercase"
                  placeholder="e.g. JUAN"
                />
              </div>

              {/* Middle Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium uppercase"
                  placeholder="e.g. MENDOZA"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium uppercase"
                  placeholder="e.g. DELA CRUZ"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Institutional Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                    placeholder="name@omsc.edu.ph"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    required
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                    placeholder="e.g. 09171234567"
                  />
                </div>
              </div>

              {/* Facebook Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Facebook Username *</label>
                <input
                  type="text"
                  required
                  value={facebookName}
                  onChange={(e) => setFacebookName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Sex */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Sex *</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'Male' | 'Female')}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Civil Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Civil Status *</label>
                <select
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Separated">Separated</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Date of Birth *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4 pt-2 border-t border-border/40">
              {/* Present Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <MapPin size={14} className="text-primary" /> Present Residence Address *
                </label>
                <input
                  type="text"
                  required
                  value={presentAddress}
                  onChange={(e) => setPresentAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="Complete current street, barangay, municipality, province"
                />
              </div>

              {/* Permanent Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                  <MapPin size={14} className="text-primary" /> Permanent Address *
                </label>
                <input
                  type="text"
                  required
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="Complete permanent address"
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="pt-4 border-t border-border/50 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-[#001740] active:scale-[0.99] transition-all text-sm shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <Key className="text-primary" size={20} />
            <h3 className="font-bold text-lg text-foreground">Change Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">New Password *</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="Re-type new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-[#001740] active:scale-[0.99] transition-all text-sm shadow-sm"
              >
                <Save size={16} />
                Update Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notice Card */}
      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 flex gap-4">
        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1 text-xs text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
          <p className="font-bold">Security Best Practices</p>
          <p>
            Choose a strong, unique password that you do not use elsewhere. Do not share your OMSC tracer credentials with anyone. Authorized admins will never ask you for your account password. Keep your demographic fields accurate for official registrar reports.
          </p>
        </div>
      </div>
    </div>
  );
}
