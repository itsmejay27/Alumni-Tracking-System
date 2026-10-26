import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface ContactInfo {
  email: string;
  emailNote: string;
  phone: string;
  website: string;
  location: string;
  officeDays: string;
  officeHours: string;
}

export const DEFAULT_CONTACT: ContactInfo = {
  email: 'alumni.affairs@omsu.edu.ph',
  emailNote: 'General inquiries & tracer updates',
  phone: '+63 (043) 491-1436',
  website: 'https://www.omsu.edu.ph',
  location: 'OMSU Main Campus, Labangan, San Jose, Occidental Mindoro, Philippines, 5100',
  officeDays: 'Monday to Friday',
  officeHours: '8:00 AM - 12:00 PM | 1:00 PM - 5:00 PM',
};

/** Contact details edited by Alumni Affairs; falls back to defaults while loading. */
export function useContactInfo() {
  const [info, setInfo] = useState<ContactInfo>(DEFAULT_CONTACT);
  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'contact')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setInfo({ ...DEFAULT_CONTACT, ...(data.value as Partial<ContactInfo>) });
      });
  }, []);
  return info;
}

export async function saveContactInfo(info: ContactInfo) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'contact', value: info, updated_at: new Date().toISOString() });
  if (error) throw error;
}
