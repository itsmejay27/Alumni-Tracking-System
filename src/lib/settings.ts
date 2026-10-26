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

export interface CoreValue {
  title: string;
  text: string;
}

export interface AboutInfo {
  vision: string;
  mission: string;
  coreValues: CoreValue[];
}

// Starter text from OMSC/OMSU materials. Alumni Affairs can replace it with the official wording.
export const DEFAULT_ABOUT: AboutInfo = {
  vision:
    'A premier higher education institution that develops globally competitive, locally responsive, innovative professionals and life-long learners.',
  mission:
    'Occidental Mindoro State University produces intellectual and human capital by developing excellent graduates through outcomes-based instruction, research, advisory services, community engagement, and sustainable production.',
  coreValues: [
    { title: 'Obedience to God', text: 'Upholding ethical and moral standards in all we do.' },
    { title: 'Mindfulness', text: 'Being present, aware and considerate of others.' },
    { title: 'Service-Oriented', text: 'Serving students and communities with excellence.' },
    { title: 'Commitment', text: 'Dedication to the mission and goals of the University.' },
    { title: 'Integrity & Ingenuity', text: 'Honest work and creative solutions to real problems.' },
    { title: 'Accountability', text: 'Taking responsibility for our actions and results.' },
    { title: 'Nationalism', text: 'Pride in, and responsibility towards, the country.' },
  ],
};

/** Vision, Mission and Core Values shown on the landing page. */
export function useAboutInfo() {
  const [info, setInfo] = useState<AboutInfo>(DEFAULT_ABOUT);
  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'about')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setInfo({ ...DEFAULT_ABOUT, ...(data.value as Partial<AboutInfo>) });
      });
  }, []);
  return info;
}

export async function saveAboutInfo(info: AboutInfo) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'about', value: info, updated_at: new Date().toISOString() });
  if (error) throw error;
}
