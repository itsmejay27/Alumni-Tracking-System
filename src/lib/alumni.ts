import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Course = 'BSIT' | 'BEED' | 'BSBA-FM' | 'BSBA-OM' | 'BSOA';

export interface AlumniRecord {
  id: string;
  studentId: string;
  lastName: string;
  givenName: string;
  middleName: string;
  name: string;
  email: string;
  batch: string;
  yearGraduated: number;
  sex: 'Female' | 'Male';
  dateOfBirth: string;
  civilStatus: 'Single' | 'Married' | 'Separated' | 'Widowed';
  mobileNo: string;
  facebookName: string;
  presentAddress: string;
  permanentAddress: string;
  course: Course;

  status: 'Employed' | 'Self-Employed' | 'Unemployed';
  employmentStatus?: 'PERMANENT' | 'CONTRACTUAL' | 'DAILY WAGE';
  currentPosition?: string;
  currentCompany?: string;
  employerType?: 'Private' | 'Semi-Private' | 'Government' | 'NGO/INGO';
  employerAddress?: string;
  jobDescription?: string;
  lengthOfService?: string;
  employmentStartDate?: string;

  lastUpdated: string;
  suggestions?: string;
  isPublic?: boolean;
}

interface AlumniRow {
  id: string;
  user_id: string | null;
  email: string | null;
  course: Course;
  batch: string;
  data: Partial<AlumniRecord>;
}

export function rowToRecord(row: AlumniRow): AlumniRecord {
  const d = row.data || {};
  const givenName = d.givenName || '';
  const lastName = d.lastName || '';
  return {
    studentId: '',
    middleName: '',
    sex: 'Male',
    dateOfBirth: '',
    civilStatus: 'Single',
    mobileNo: '',
    facebookName: '',
    presentAddress: '',
    permanentAddress: '',
    status: 'Unemployed',
    lastUpdated: '',
    yearGraduated: Number((row.batch || '').split('-')[1]) || 0,
    ...d,
    givenName,
    lastName,
    name: `${givenName} ${lastName}`.trim(),
    id: row.id,
    email: row.email || d.email || '',
    course: row.course,
    batch: row.batch,
  } as AlumniRecord;
}

/** Loads every tracer record the signed-in user is allowed to see (row level security does the scoping). */
export function useAlumniRecords() {
  const [records, setRecords] = useState<AlumniRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('alumni_records')
      .select('id, user_id, email, course, batch, data')
      .order('id');
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setRecords((data as AlumniRow[]).map(rowToRecord));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { records, loading, error, reload };
}

/** The signed-in alumnus's own tracer record, if one exists. */
export async function fetchMyRecord(userId: string): Promise<AlumniRecord | null> {
  const { data, error } = await supabase
    .from('alumni_records')
    .select('id, user_id, email, course, batch, data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as AlumniRow) : null;
}

export async function saveMyRecord(userId: string, record: Omit<AlumniRecord, 'id' | 'name'> & { id?: string }) {
  const { id, ...data } = record;
  const payload = {
    user_id: userId,
    email: record.email.toLowerCase(),
    course: record.course,
    batch: record.batch,
    data,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await supabase.from('alumni_records').update(payload).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data: inserted, error } = await supabase.from('alumni_records').insert(payload).select('id').single();
  if (error) throw error;
  return inserted.id as string;
}

export function courseScopeForRole(role: string): Course | null {
  switch (role) {
    case 'admin.beed': return 'BEED';
    case 'admin.bsit': return 'BSIT';
    case 'admin.bsba-fm': return 'BSBA-FM';
    case 'admin.bsba-om': return 'BSBA-OM';
    case 'admin.bsoa': return 'BSOA';
    default: return null;
  }
}
