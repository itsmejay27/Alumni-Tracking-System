import React, { useState } from 'react';
import { User, Briefcase, GraduationCap, Building2, Save, FileImage, ClipboardList, Info, HelpCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { CurrentUser } from '../App';

interface AlumniProfileProps {
  currentUser: CurrentUser | null;
  onUpdateProfile: (updated: CurrentUser) => void;
}

export function AlumniProfile({ currentUser, onUpdateProfile }: AlumniProfileProps) {
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Entire set of detailed fields requested by user
  const [formData, setFormData] = useState({
    // Account details
    email: currentUser?.email || 'juan.delacruz@omsc.edu.ph',
    
    // Personal Info
    avatarUrl: currentUser?.avatarUrl || '',
    lastName: currentUser?.lastName || 'DELA CRUZ',
    givenName: currentUser?.givenName || 'JUAN',
    middleName: currentUser?.middleName || 'MENDOZA',
    presentAddress: currentUser?.presentAddress || '123 Rizal St., Barangay San Roque, San Jose, Occidental Mindoro',
    permanentAddress: currentUser?.permanentAddress || '123 Rizal St., Barangay San Roque, San Jose, Occidental Mindoro',
    sex: currentUser?.sex || 'Male', // Female / Male
    dateOfBirth: currentUser?.dateOfBirth || '1998-05-15',
    civilStatus: currentUser?.civilStatus || 'Single', // Single, Married, Separated, Widowed
    mobileNo: currentUser?.mobileNo || '09171234567',
    facebookName: currentUser?.facebookName || 'Juan Dela Cruz Official',

    // Educational Background
    course: 'Bachelor of Science in Information Technology (BSIT)',
    academicYear: '2018-2019',

    // Employment History
    status: 'Employed', // Employed, Self-Employed, Unemployed
    employmentStatus: 'PERMANENT', // PERMANENT, CONTRACTUAL, DAILY WAGE
    employerName: 'GlobalCorp Inc. Philippines',
    companyType: 'Private', // Private, Semi-Private, Government, NGO/INGO
    employerAddress: 'Fort Bonifacio, Taguig City, Metro Manila',
    jobTitle: 'Senior Full Stack Software Engineer',
    jobDescription: 'Maintains enterprise APIs, builds modern UI dashboards, and conducts code reviews.',
    lengthOfService: '4 Years and 6 Months',

    // Suggestions / Feedback
    suggestions: 'Great system! Suggesting adding more networking mixers for technical alumni to meet and share job referrals.',
    isPublic: true, // directory networking preference
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 1024) { // 1GB check
        alert('File size exceeds the 1 GB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sync back to global user state
    if (currentUser) {
      onUpdateProfile({
        ...currentUser,
        lastName: formData.lastName.trim().toUpperCase(),
        givenName: formData.givenName.trim().toUpperCase(),
        middleName: formData.middleName.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        mobileNo: formData.mobileNo.trim(),
        presentAddress: formData.presentAddress.trim(),
        permanentAddress: formData.permanentAddress.trim(),
        sex: formData.sex as 'Male' | 'Female',
        civilStatus: formData.civilStatus as any,
        dateOfBirth: formData.dateOfBirth,
        facebookName: formData.facebookName.trim(),
        avatarUrl: formData.avatarUrl,
      });
    }

    setSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Sonner toast notifications
    toast.success('Profile and Employment Information updated successfully!');
    
    setTimeout(() => {
      setSuccess(false);
    }, 5000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">My Alumni Profile</h2>
          <p className="text-muted-foreground mt-1">Keep your demographic and employment details updated for OMSC accreditation</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
          <div>
            <p className="font-bold">Record Saved Successfully!</p>
            <p className="text-xs text-emerald-700/90 mt-0.5">Your profile updates have been transmitted to the OMSC Department Administrator.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PERSONAL INFORMATION SECTION */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <User size={20} />
            </div>
            <h3 className="text-lg font-bold">Personal Information</h3>
          </div>

          <div className="space-y-5">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Upload Supported File: Image (Proof or Avatar) *</label>
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-muted/30 border border-dashed border-border rounded-xl">
                <div className="w-24 h-24 bg-card border border-border rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {imagePreview || formData.avatarUrl ? (
                    <img src={imagePreview || formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FileImage className="text-muted-foreground/60" size={32} />
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-block px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg cursor-pointer transition-all"
                  >
                    Choose Image File
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">Supports PNG, JPG, or JPEG. Max size 1 GB.</p>
                </div>
              </div>
            </div>

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Given Name *</label>
                <input
                  type="text"
                  required
                  value={formData.givenName}
                  onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Middle Name *</label>
                <input
                  type="text"
                  required
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>
            </div>

            {/* Email and Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={formData.mobileNo}
                  onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Facebook Name *</label>
                <input
                  type="text"
                  required
                  value={formData.facebookName}
                  onChange={(e) => setFormData({ ...formData, facebookName: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="e.g. facebook.com/profile"
                />
              </div>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sex *</label>
                <div className="flex gap-4 pt-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="Female"
                      checked={formData.sex === 'Female'}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      className="w-4 h-4 text-primary focus:ring-primary border-border"
                    />
                    Female
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value="Male"
                      checked={formData.sex === 'Male'}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      className="w-4 h-4 text-primary focus:ring-primary border-border"
                    />
                    Male
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Civil Status *</label>
                <select
                  value={formData.civilStatus}
                  onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Separated">Separated</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Present Address *</label>
                <input
                  type="text"
                  required
                  value={formData.presentAddress}
                  onChange={(e) => setFormData({ ...formData, presentAddress: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Permanent Address *</label>
                <input
                  type="text"
                  required
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* EDUCATIONAL BACKGROUND SECTION */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <GraduationCap size={20} />
            </div>
            <h3 className="text-lg font-bold">Educational Background</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Degree finished from OMSC - Courses *</label>
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
              >
                <option value="Bachelor of Elementary Education (BEED)">Bachelor of Elementary Education (BEED)</option>
                <option value="Bachelor of Science in Information Technology (BSIT)">Bachelor of Science in Information Technology (BSIT)</option>
                <option value="Bachelor of Science in Business Administration (BSBA) Major in Financial Management">Bachelor of Science in Business Administration (BSBA) Major in Financial Management</option>
                <option value="Bachelor of Science in Business Administration (BSBA) Major in Operation Management">Bachelor of Science in Business Administration (BSBA) Major in Operation Management</option>
                <option value="Bachelor of Science in Office Administration (BSOA)">Bachelor of Science in Office Administration (BSOA)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Year Graduated - Academic Year *</label>
              <select
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
              >
                <option value="2009-2010">2009-2010</option>
                <option value="2010-2011">2010-2011</option>
                <option value="2011-2012">2011-2012</option>
                <option value="2012-2013">2012-2013</option>
                <option value="2013-2014">2013-2014</option>
                <option value="2014-2015">2014-2015</option>
                <option value="2015-2016">2015-2016</option>
                <option value="2016-2017">2016-2017</option>
                <option value="2017-2018">2017-2018</option>
                <option value="2018-2019">2018-2019</option>
                <option value="2019-2020">2019-2020</option>
              </select>
            </div>
          </div>
        </div>

        {/* EMPLOYMENT HISTORY SECTION */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <Briefcase size={20} />
            </div>
            <h3 className="text-lg font-bold">Employment History</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
              >
                <option value="Employed">Employed</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Unemployed">Unemployed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employment Status *</label>
              <select
                disabled={formData.status === 'Unemployed'}
                value={formData.employmentStatus}
                onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium disabled:opacity-50 disabled:bg-muted"
              >
                <option value="PERMANENT">PERMANENT</option>
                <option value="CONTRACTUAL">CONTRACTUAL</option>
                <option value="DAILY WAGE">DAILY WAGE</option>
              </select>
            </div>
          </div>

          {formData.status !== 'Unemployed' && (
            <div className="space-y-5 pt-4 border-t border-border/50">
              <h4 className="font-bold text-sm text-foreground">Employer's Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Complete Name of Organization *</label>
                  <input
                    type="text"
                    required
                    value={formData.employerName}
                    onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                    className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type of Company *</label>
                  <select
                    value={formData.companyType}
                    onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
                    className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  >
                    <option value="Private">Private</option>
                    <option value="Semi-Private">Semi-Private</option>
                    <option value="Government">Government</option>
                    <option value="NGO/INGO">NGO/INGO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.employerAddress}
                  onChange={(e) => setFormData({ ...formData, employerAddress: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  placeholder="Complete address of employer/company"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Length of Service *</label>
                  <input
                    type="text"
                    required
                    value={formData.lengthOfService}
                    onChange={(e) => setFormData({ ...formData, lengthOfService: e.target.value })}
                    className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm font-medium"
                    placeholder="e.g. 2 Years, or 6 Months"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.jobDescription}
                  onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
                  placeholder="Summary of core duties..."
                />
              </div>
            </div>
          )}
        </div>

        {/* NETWORKING PREFERENCE */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <ClipboardList size={20} />
            </div>
            <h3 className="text-lg font-bold">Privacy & Networking Preferences</h3>
          </div>
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="mt-1 w-5 h-5 text-primary border-border focus:ring-primary rounded"
            />
            <label htmlFor="isPublic" className="text-sm cursor-pointer space-y-1">
              <span className="font-bold text-foreground block">Opt-in to the public OMSC Alumni Directory</span>
              <span className="text-xs text-muted-foreground block leading-relaxed">
                Checking this box allows other verified OMSC alumni to find your profile (Name, Course, Batch, Status, and Current Position) in the Networking Directory to support career mixers and peer referrals. Your personal physical addresses, date of birth, and civil status are **never** shown to other alumni.
              </span>
            </label>
          </div>
        </div>

        {/* SUGGESTIONS / FEEDBACK */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <HelpCircle size={20} />
            </div>
            <h3 className="text-lg font-bold">Suggestions & Feedback</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Suggestions/Feedback for OMSC *</label>
            <textarea
              required
              rows={3}
              value={formData.suggestions}
              onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
              className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              placeholder="How can OMSC improve this curriculum or tracing process?"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 active:scale-[0.99] transition-all font-bold shadow-sm"
          >
            <Save size={20} />
            Save Profile Records
          </button>
        </div>
      </form>

      {/* Info notice */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 flex gap-4">
        <Info className="text-primary shrink-0 mt-0.5" size={20} />
        <div className="space-y-2 text-sm text-blue-900/90 dark:text-blue-200/80">
          <p className="font-bold">Important Accrediting Notice</p>
          <p className="text-xs leading-relaxed">
            Data submitted through this tracer form is utilized in OMSC accreditation programs to measure teaching efficiency, student outcomes, and post-graduation success. Your detail privacy remains protected under standard OMSC Institutional Guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}

