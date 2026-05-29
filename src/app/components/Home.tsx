import React from 'react';
import logo from '@/assets/logo.png';
import { FileText, ShieldAlert, GraduationCap, CheckCircle2 } from 'lucide-react';

interface HomeProps {
  onStartSurvey: () => void;
}

export function Home({ onStartSurvey }: HomeProps) {
  return (
    <div className="max-w-3xl mx-auto py-4 space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Welcome Card */}
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-6 shadow-sm">
        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto border border-border p-1 shadow-sm overflow-hidden">
          <img src={logo} alt="OMSC Logo" className="w-full h-full object-contain" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Occidental Mindoro State College</h2>
          <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold">Alumni Graduate Tracer Study</p>
        </div>
      </div>

      {/* Main Statement */}
      <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-sm leading-relaxed text-foreground">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <FileText className="text-primary" size={22} />
          <h3 className="text-lg font-bold text-foreground">Tracer Study Introduction</h3>
        </div>
        
        <p className="text-base text-justify">
          This institution is establishing a system of tracing its graduates and getting feedback regarding the type of work, further study, or other activity you are/were involved in since you completed your study at OMSC. The information provided will assist the institution in planning future educational needs and improving the course offerings.
        </p>
        
        <p className="text-base text-justify">
          Results of this tracer study will only be presented in summary form and individual responses will be kept <strong className="text-primary font-bold">“strictly confidential”</strong>. We would highly appreciate it if you could complete this questionnaire and return it to us, at your earliest convenience.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-start gap-2.5 max-w-md">
            <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-muted-foreground">
              Your feedback directly impacts academic accreditation and course enhancements. Thank you for your continued support!
            </p>
          </div>
          <button
            onClick={onStartSurvey}
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 transition-all text-sm text-center shrink-0"
          >
            Go to Profile Form
          </button>
        </div>
      </div>

      {/* Key Objectives Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <GraduationCap size={16} />
          </div>
          <h4 className="font-bold text-sm text-foreground">Curriculum Review</h4>
          <p className="text-xs text-muted-foreground leading-normal">
            Align academic courses with actual workplace expectations and industry trends.
          </p>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <CheckCircle2 size={16} />
          </div>
          <h4 className="font-bold text-sm text-foreground">Institutional Quality</h4>
          <p className="text-xs text-muted-foreground leading-normal">
            Validate curriculum outcomes for professional accreditation reviews.
          </p>
        </div>

        <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <FileText size={16} />
          </div>
          <h4 className="font-bold text-sm text-foreground">Confidentiality</h4>
          <p className="text-xs text-muted-foreground leading-normal">
            Your individual response is safe under our strict institution privacy policy.
          </p>
        </div>
      </div>

    </div>
  );
}
