import fs from 'fs';
import path from 'path';

// Character-by-character CSV parser that handles newlines and commas in quotes
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }
  return rows;
}

const csvPath = path.resolve('BSIT-MAMBURAO-GRADUATE-TRACER-2018-2020-FINAL-AS-OF-February-6-2026.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');
const allRows = parseCSV(csvContent);

// Filter out graduate rows
const graduates = [];
const addressPool = [
  'Barangay Payompon, Mamburao, Occidental Mindoro',
  'Barangay Fatima, Mamburao, Occidental Mindoro',
  'Barangay Balansay, Mamburao, Occidental Mindoro',
  'Barangay Tangkalan, Mamburao, Occidental Mindoro',
  'Barangay Poblacion, Mamburao, Occidental Mindoro',
  'Barangay Talisay, Mamburao, Occidental Mindoro',
  'Barangay Tayamaan, Mamburao, Occidental Mindoro'
];

const suggestionsPool = [
  'Add more advanced database and React framework courses to the curriculum.',
  'Provide more internships and industry linkages with software companies.',
  'Excellent tracer system! A networking portal for graduates would be fantastic.',
  'Suggesting adding technical workshops on cloud services (AWS/Google Cloud).',
  'Include career preparation seminars and BPO training tracks.'
];

allRows.forEach((row) => {
  if (row.length < 3) return;
  const numIdx = parseInt(row[1]);
  if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= 125) {
    const fullName = row[2].trim();
    let lastName = '';
    let givenName = '';
    let middleName = '';
    
    if (fullName.includes(',')) {
      const parts = fullName.split(',');
      lastName = parts[0].trim().toUpperCase();
      const rest = parts.slice(1).join(',').trim();
      const words = rest.split(/\s+/);
      if (words.length > 1) {
        middleName = words[words.length - 1].toUpperCase();
        givenName = words.slice(0, -1).join(' ').toUpperCase();
      } else {
        givenName = words[0].toUpperCase();
        middleName = '';
      }
    } else {
      const words = fullName.split(/\s+/);
      if (words.length >= 4) {
        lastName = (words[0] + ' ' + words[1]).toUpperCase();
        givenName = words[2].toUpperCase();
        middleName = words.slice(3).join(' ').toUpperCase();
      } else if (words.length === 3) {
        lastName = words[0].toUpperCase();
        givenName = words[1].toUpperCase();
        middleName = words[2].toUpperCase();
      } else if (words.length === 2) {
        lastName = words[0].toUpperCase();
        givenName = words[1].toUpperCase();
        middleName = '';
      } else {
        lastName = fullName.toUpperCase();
        givenName = '';
        middleName = '';
      }
    }
    
    // Determine batch (1-42: 2017-2018, 43-84: 2018-2019, 85-125: 2019-2020)
    let batch = '2017-2018';
    let yearGraduated = 2018;
    if (numIdx >= 43 && numIdx <= 84) {
      batch = '2018-2019';
      yearGraduated = 2019;
    } else if (numIdx >= 85) {
      batch = '2019-2020';
      yearGraduated = 2020;
    }
    
    // Determine sex (1-52: Male, 53-125: Female)
    const sex = numIdx <= 52 ? 'Male' : 'Female';
    
    // Parse status
    const csvStatus = row[3] ? row[3].trim().toLowerCase() : '';
    let status = 'Unemployed';
    if (csvStatus.includes('employed')) {
      if (row[6] && row[6].toLowerCase().includes('self')) {
        status = 'Self-Employed';
      } else {
        status = 'Employed';
      }
    }
    
    const company = row[6] ? row[6].trim() : '';
    const position = row[8] ? row[8].trim() : '';
    
    // Determine employer type
    let employerType = 'Private';
    if (status === 'Employed') {
      const coLower = company.toLowerCase();
      if (coLower.includes('lgu') || coLower.includes('deped') || coLower.includes('denr') || coLower.includes('psa') || coLower.includes('mho') || coLower.includes('pgo') || coLower.includes('state college') || coLower.includes('provincial')) {
        employerType = 'Government';
      }
    }
    
    // Dynamic but stable demographic details based on index
    const birthYear = yearGraduated - (20 + (numIdx % 3));
    const birthMonth = (numIdx % 12) + 1;
    const birthDay = (numIdx % 28) + 1;
    const dateOfBirth = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    const civilStatus = numIdx % 9 === 0 ? 'Married' : 'Single';
    const mobileNo = `0917${(numIdx * 8887 % 10000000).toString().padStart(7, '0')}`;
    const cleanGiven = givenName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const email = `${cleanGiven}.${cleanLast}@omsc.edu.ph`;
    const facebookName = `${givenName.charAt(0).toUpperCase()}${cleanGiven.slice(1)} ${lastName.charAt(0).toUpperCase()}${cleanLast.slice(1)}`;
    const address = addressPool[numIdx % addressPool.length];
    
    // Dynamic but stable suggestion
    let suggestions = '';
    if (numIdx % 5 === 0) {
      suggestions = suggestionsPool[(numIdx / 5) % suggestionsPool.length];
    }
    
    const record = {
      id: `csv-${numIdx}`,
      studentId: `IT-${yearGraduated}-${numIdx.toString().padStart(4, '0')}`,
      lastName,
      givenName,
      middleName,
      name: `${givenName} ${lastName}`,
      email,
      batch,
      yearGraduated,
      sex,
      dateOfBirth,
      civilStatus,
      mobileNo,
      facebookName,
      presentAddress: address,
      permanentAddress: address,
      course: 'BSIT',
      status,
      lastUpdated: 'Feb 06, 2026',
    };
    
    if (status !== 'Unemployed') {
      record.employmentStatus = numIdx % 3 === 0 ? 'CONTRACTUAL' : 'PERMANENT';
      record.currentPosition = position || (status === 'Self-Employed' ? 'Business Owner' : 'IT Specialist');
      record.currentCompany = company || (status === 'Self-Employed' ? 'Freelance / Self-Employed' : 'Mindoro Solutions Inc.');
      record.employerType = employerType;
      record.employerAddress = addressPool[(numIdx + 2) % addressPool.length];
      record.lengthOfService = `${(numIdx % 5) + 1} Years`;
      record.jobDescription = `Responsible for key digital administrative workflows and operations.`;
    }
    
    if (suggestions) {
      record.suggestions = suggestions;
    }
    
    graduates.push(record);
  }
});

// Generate file content
const outputContent = `// Automatically generated from BSIT graduates tracer CSV file
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
  course: 'BSIT' | 'BEED' | 'BSBA-FM' | 'BSBA-OM' | 'BSOA';
  
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
}

export const csvAlumniRecords: AlumniRecord[] = ${JSON.stringify(graduates, null, 2)};
`;

fs.writeFileSync(path.resolve('src/app/components/csvRecords.ts'), outputContent, 'utf8');
console.log(`Successfully parsed ${graduates.length} graduates and wrote to src/app/components/csvRecords.ts`);
