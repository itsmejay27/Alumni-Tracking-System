import React, { useEffect, useState } from 'react';
import { useT } from '@/lib/preferences';
import logo from '@/assets/logo.png';
import { FileText, ShieldCheck, GraduationCap, CheckCircle2, ArrowRight, ClipboardCheck, AlertCircle } from 'lucide-react';
import { AlumniRecord, currentJob, fetchMyRecord } from '@/lib/alumni';
import { programName } from '@/lib/programs';

interface HomeProps {
  onStartSurvey: () => void;
  userId?: string;
  firstName?: string;
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function Home({ onStartSurvey, userId, firstName }: HomeProps) {
  const t = useT();
  const [record, setRecord] = useState<AlumniRecord | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchMyRecord(userId).then(setRecord).catch(() => {});
  }, [userId]);

  const job = record ? currentJob(record) : null;
  const needsUpdate = !record || record.status === 'Not Tracked' || !record.lastUpdated;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#002060] text-white">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
        />
        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 sm:p-10">
          <img src={logo} alt="OMSU seal" className="w-24 h-24 sm:w-32 sm:h-32 object-contain shrink-0 drop-shadow-xl" />
          <div className="flex-1 text-center md:text-left space-y-2">
            <p className="text-sm font-semibold text-[#f5c400]">Occidental Mindoro State University</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              {t('Welcome')}{firstName ? `, ${titleCase(firstName)}` : ''}!
            </h2>
            <p className="text-white/80 max-w-2xl">
              {t('Thank you for taking part in the Alumni Graduate Tracer Study. Keep your profile and employment history up to date.')}
            </p>
          </div>
          <button
            onClick={onStartSurvey}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f5c400] text-[#002060] font-bold hover:brightness-95 shrink-0"
          >
            {needsUpdate ? t('Complete my profile') : t('Update my profile')} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Introduction */}
        <section className="xl:col-span-2 bg-card rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-bold">{t('Tracer Study Introduction')}</h3>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground">
            {t('This institution is establishing a system of tracing its graduates and getting feedback regarding the type of work, further study, or other activity you are/were involved in since you completed your study at OMSU. The information provided will assist the institution in planning future educational needs and improving the course offerings.')}
          </p>
          <p className="text-[15px] leading-relaxed text-foreground">
            {t('Results of this tracer study will only be presented in summary form and individual responses will be kept strictly confidential. We would highly appreciate it if you could complete this questionnaire at your earliest convenience.')}
          </p>
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-4">
            <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-amber-900">
              {t('Your feedback directly supports accreditation and improvements to your program. Thank you for your continued support!')}
            </p>
          </div>
        </section>

        {/* My record */}
        <section className="bg-card rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <h3 className="text-lg font-bold">{t('My tracer record')}</h3>
          </div>
          {record ? (
            <dl className="space-y-3 text-sm">
              <Row label={t('Program')} value={programName(record.course)} />
              <Row label={t('Year graduated')} value={record.yearGraduated ? String(record.yearGraduated) : '—'} />
              <Row
                label={t('Status')}
                value={record.status === 'Not Tracked' ? t('Not answered yet') : t(record.status)}
              />
              {job && <Row label={t('Current job')} value={[job.position, job.company].filter(Boolean).join(' at ') || '—'} />}
              <Row label={t('Last updated')} value={record.lastUpdated || '—'} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t('Loading your record...')}</p>
          )}
          {needsUpdate && (
            <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 p-4">
              <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-foreground">{t('Some of your details are missing. Please complete your profile.')}</p>
            </div>
          )}
          <button
            onClick={onStartSurvey}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            {t('Open My Alumni Profile')} <ArrowRight size={16} />
          </button>
        </section>
      </div>

      {/* Why it matters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <GraduationCap size={18} />, title: t('Curriculum Review'), text: t('Align courses with actual workplace expectations and industry trends.') },
          { icon: <CheckCircle2 size={18} />, title: t('Institutional Quality'), text: t('Validate program outcomes for professional accreditation reviews.') },
          { icon: <ShieldCheck size={18} />, title: t('Confidentiality'), text: t('Your individual response is protected under the university privacy policy.') },
        ].map((c) => (
          <div key={c.title} className="bg-card rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">{c.icon}</div>
            <h4 className="font-bold text-foreground">{c.title}</h4>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2.5 last:border-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
