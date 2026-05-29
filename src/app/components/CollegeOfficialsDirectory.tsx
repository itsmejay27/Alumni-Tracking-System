import React from 'react';
import { Mail, GraduationCap, Building, UserCheck } from 'lucide-react';

interface OfficialProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  office: string;
  isDirector?: boolean;
}

export function CollegeOfficialsDirectory() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">College Officials Directory</h2>
        <p className="text-muted-foreground mt-1">Get in touch with the OMSC Department Program Chairs & Director</p>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockOfficials.map((official) => (
          <div
            key={official.id}
            className={`bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative ${
              official.isDirector ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
            }`}
          >
            {/* Top decorative navy strip for director */}
            {official.isDirector && (
              <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-xl" />
            )}

            <div>
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${
                  official.isDirector 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {official.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-base text-foreground truncate">
                      {official.name}
                    </h3>
                    {official.isDirector && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">
                        DIRECTOR
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-primary/95 mt-0.5">{official.role}</p>
                </div>
              </div>

              {/* Department details */}
              <div className="bg-muted/40 border border-border/50 rounded-lg p-3 mb-4 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Building size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium">{official.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Office: {official.office}</span>
                </div>
              </div>
            </div>

            {/* Email link button */}
            <div className="pt-3 border-t border-border mt-auto">
              <a
                href={`mailto:${official.email}`}
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary font-bold text-xs rounded-lg transition-all border border-primary/10"
              >
                <Mail size={13} />
                Send Email Notice
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const mockOfficials: OfficialProfile[] = [
  {
    id: '1',
    name: 'Dr. Carlo Carlo',
    role: 'Director of Alumni Affairs',
    department: 'OMSC Office of Alumni Relations (Super Account)',
    email: 'director.alumni@omsc.edu.ph',
    office: 'Alumni Affairs Center, Labangan Campus',
    isDirector: true,
  },
  {
    id: '2',
    name: 'Prof. Jane Doe',
    role: 'BSIT Program Chair',
    department: 'Information Technology Department',
    email: 'admin.bsit@omsc.edu.ph',
    office: 'IT Faculty Office, Science & Tech Bldg',
  },
  {
    id: '3',
    name: 'Dr. John Smith',
    role: 'BEED Program Chair',
    department: 'Elementary Education Department',
    email: 'admin.beed@omsc.edu.ph',
    office: 'Education Faculty Office, Acad Bldg A',
  },
  {
    id: '4',
    name: 'Prof. Elena Cruz',
    role: 'BSOA Program Chair',
    department: 'Office Administration Department',
    email: 'admin.bsoa@omsc.edu.ph',
    office: 'BSOA Office, Business & Admin Bldg',
  },
  {
    id: '5',
    name: 'Prof. Kervin Ramos',
    role: 'BSBA Financial Management Chair',
    department: 'Business Administration Department',
    email: 'admin.bsba-fm@omsc.edu.ph',
    office: 'BSBA Faculty Room, Business Bldg',
  },
  {
    id: '6',
    name: 'Prof. Maria Santos',
    role: 'BSBA Operations Management Chair',
    department: 'Business Administration Department',
    email: 'admin.bsba-om@omsc.edu.ph',
    office: 'BSBA Faculty Room, Business Bldg',
  },
];
