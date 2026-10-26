import React, { useEffect } from 'react';
import { X, FileText, ShieldCheck } from 'lucide-react';

export type LegalDoc = 'terms' | 'privacy';

const UPDATED = 'October 2026';

const TERMS: { h: string; p: string[] }[] = [
  {
    h: '1. About this service',
    p: [
      'The OMSU Alumni Tracer ("the System") is run by the Alumni Affairs Office of Occidental Mindoro State University (OMSU). It is used to conduct the Graduate Tracer Study, share announcements and job openings, and produce employment statistics for planning and accreditation.',
    ],
  },
  {
    h: '2. Who can use it',
    p: [
      'Accounts are for OMSU graduates whose Student ID is in the University records, and for OMSU staff given access by Alumni Affairs. You must give true and complete information when you sign up and when you update your record.',
    ],
  },
  {
    h: '3. Your account',
    p: [
      'Keep your password private. You are responsible for activity under your account. Tell Alumni Affairs right away if you think someone else has used it.',
    ],
  },
  {
    h: '4. Acceptable use',
    p: [
      'Do not post false, offensive or misleading content, fake job openings, or anyone else\'s personal data. Do not try to access records that are not yours, or disrupt the System. Accounts that break these rules may be suspended.',
    ],
  },
  {
    h: '5. Job posts and announcements',
    p: [
      'Job openings come from program chairs, partner employers and alumni. OMSU does not guarantee any employer or job. Check every offer yourself and never pay a fee to apply.',
    ],
  },
  {
    h: '6. Changes',
    p: [
      'We may update these terms. The date at the top shows the latest version. Continuing to use the System means you accept the updated terms.',
    ],
  },
];

const PRIVACY: { h: string; p: string[] }[] = [
  {
    h: '1. Our commitment',
    p: [
      'OMSU processes your personal data in line with Republic Act No. 10173, the Data Privacy Act of 2012, its Implementing Rules and Regulations, and issuances of the National Privacy Commission.',
    ],
  },
  {
    h: '2. What we collect',
    p: [
      'Identity and contact details (name, Student ID, email, mobile number, address, sex, birth date, civil status), academic details (program, year graduated), and employment details (status, employer, position, employer type, job level, employment history), plus your feedback on your program.',
    ],
  },
  {
    h: '3. Why we collect it',
    p: [
      'To run the Graduate Tracer Study; to improve curricula and services; to meet accreditation, CHED and government reporting requirements; to send you announcements, reminders and job opportunities; and to secure your account.',
    ],
  },
  {
    h: '4. Who can see it',
    p: [
      'Only authorized OMSU personnel: Alumni Affairs and the chair of your own program. Results are published only in summary form, so no individual answer can be identified. We do not sell your data. Other alumni do not see your record.',
    ],
  },
  {
    h: '5. How we protect it',
    p: [
      'Data is stored in an encrypted database with access rules per role. Passwords are never stored in readable form. Changes to records are logged.',
    ],
  },
  {
    h: '6. How long we keep it',
    p: [
      'We keep tracer records while they are needed for the tracer study and accreditation, or as required by law, then delete or anonymize them.',
    ],
  },
  {
    h: '7. Your rights',
    p: [
      'You have the right to be informed, to access, to correct, to object, to erasure or blocking, to data portability, and to file a complaint with the National Privacy Commission. You can update most of your details yourself in My Alumni Profile. For anything else, contact the Alumni Affairs Office.',
    ],
  },
];

/** Terms of Use / Privacy Policy dialog. */
export function LegalModal({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isTerms = doc === 'terms';
  const sections = isTerms ? TERMS : PRIVACY;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 animate-in fade-in duration-200" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-[#002060] text-[#f5c400] flex items-center justify-center shrink-0">
            {isTerms ? <FileText size={18} /> : <ShieldCheck size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[#002060]">{isTerms ? 'Terms of Use' : 'Privacy Policy'}</h2>
            <p className="text-xs text-slate-500">Last updated {UPDATED}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-5 text-[15px] text-slate-700 leading-relaxed">
          {sections.map((s) => (
            <section key={s.h}>
              <h3 className="font-bold text-slate-900 mb-1">{s.h}</h3>
              {s.p.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </section>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-[#002060] text-white text-sm font-semibold hover:bg-[#001740]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
