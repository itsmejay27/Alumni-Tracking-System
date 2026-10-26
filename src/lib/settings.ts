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
  goals: string[];
  coreValues: CoreValue[];
}

// Official OMSU VMGO (omsu.edu.ph, last updated May 11, 2026). Alumni Affairs can edit it in Contact Info.
export const DEFAULT_ABOUT: AboutInfo = {
  vision: 'A locally and globally recognized leading institution of higher learning.',
  mission:
    'To provide quality instruction, research, extension, and production services that transform lives and empower communities in the Southern Tagalog.',
  goals: [
    'To continually increase access to quality education;',
    'To ensure a high completion rate of students admitted in respective programs;',
    'To improve the adequacy of facilities and infrastructure that is in line with specified regulations and requirements;',
    'To progressively increase internal research funding and dissemination of research findings that positively impact communities;',
    'To improve recruitment of qualified staff and continuously enhance their skills, expertise, and competency;',
    'To attain student satisfaction; and',
    'To achieve set of performance targets.',
  ],
  coreValues: [
    {
      title: 'Obedience to God',
      text: "The OMSCIANs, though with different religious orientations, believe in God and adhere to His teachings and commandments. They carry out their responsibilities with enthusiasm for they see God's presence in every person they serve and meet.",
    },
    {
      title: 'Mindfulness',
      text: 'The OMSCIANs are gender sensitive, fully aware and responsible of their actions, attentive to the needs of their clientele and thoughtful towards others.',
    },
    {
      title: 'Service-Orientedness',
      text: 'The OMSCIANs provide services that meet and satisfy the expectations and need of their clientele even before those needs are articulated. They make themselves available to others and endure that the services they offer are continuously improved in order to achieve quality and customer satisfaction.',
    },
    {
      title: 'Commitment',
      text: "The OMSCIANs are committed to the attainment of the Institution's vision and mission. They have established a resilient bond with the institution and they work not because of monetary compensation or any extrinsic reward but rather spurred intrinsically with love and sensitivity to one's responsibility.",
    },
    {
      title: 'Integrity and Ingenuity',
      text: 'The OMSCIANs embrace the value of integrity and ingenuity. They adhere to moral an ethical principle. They are trustworthy, reliable and with unquestionable moral integrity who set aside their personal interests and prioritize the welfare of the people they serve. They think and act as one in dealing with decision and collectively take advantage of opportunities and thereby overcome problems.',
    },
    {
      title: 'Accountability',
      text: 'The OMSCIANs acknowledge and assume responsibility for their actions and decisions in the implementation within the scope of their role or position encompassing all sectors of the institutions and be answerable for resulting consequences.',
    },
    {
      title: 'Nationalism',
      text: 'The OMSCIANs are devoted not only for the interest of the Filipino people but for the interest of the academic community to achieve greater height of progress and development in promoting national consciousness and interest.',
    },
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
