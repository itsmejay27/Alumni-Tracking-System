import React, { useEffect, useState } from 'react';
import { useT } from '@/lib/preferences';
import { Mail, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { roleLabel } from '@/lib/programs';
import { LoadingState, ErrorState } from './DataState';
import { Pagination, usePaged } from './Pagination';

interface Staff {
  id: string;
  given_name: string;
  last_name: string;
  middle_name: string;
  role: string;
  title: string;
  email: string;
  avatar_url: string;
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Directory of Alumni Affairs and program chairs (real staff accounts). */
export function CollegeOfficialsDirectory() {
  const t = useT();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('staff_directory').then(({ data, error }) => {
      if (error) setError(error.message);
      else setStaff((data as Staff[]) || []);
      setLoading(false);
    });
  }, []);

  const paged = usePaged(staff, 9);

  if (loading) return <LoadingState label={t('Loading directory...')} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('Directory')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('OMSU Alumni Affairs and program chairs')}</p>
      </div>

      {staff.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center shadow-sm">
          <Users className="mx-auto mb-3 text-muted-foreground/60" size={40} />
          <p className="font-semibold">{t('No staff listed yet')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('Program chairs will appear here once their accounts are set up.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paged.pageItems.map((s) => {
            const name = titleCase(`${s.given_name} ${s.middle_name ? s.middle_name[0] + '. ' : ''}${s.last_name}`.trim());
            const initials = `${s.given_name[0] || ''}${s.last_name[0] || ''}`.toUpperCase();
            return (
              <div key={s.id} className="bg-card rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{name || s.email}</p>
                    <p className="text-sm text-muted-foreground truncate">{roleLabel(s.role)}</p>
                    {s.title && s.title !== roleLabel(s.role) && (
                      <p className="text-xs text-muted-foreground truncate">{s.title}</p>
                    )}
                  </div>
                </div>
                <a
                  href={`mailto:${s.email}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"
                >
                  <Mail size={15} className="shrink-0" /> {s.email}
                </a>
              </div>
            );
          })}
        </div>
        <div className="bg-card rounded-2xl shadow-sm">
          <Pagination {...paged} label={t('people')} />
        </div>
        </div>
      )}
    </div>
  );
}
