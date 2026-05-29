import fs from 'fs';
import path from 'path';

const alumniRecordsPath = path.resolve('src/app/components/AlumniRecords.tsx');
const csvRecordsPath = path.resolve('src/app/components/csvRecords.ts');

const alumniRecordsContent = fs.readFileSync(alumniRecordsPath, 'utf8');

// The non-BSIT records can be extracted from AlumniRecords.tsx.
// Let's parse AlumniRecords.tsx content to find const mockRecords: AlumniRecord[] = [ ... ];
// We can use a regex to capture individual objects within the array.
const startIdx = alumniRecordsContent.indexOf('const mockRecords: AlumniRecord[] = [');
if (startIdx === -1) {
  console.error('Could not find mockRecords array inside AlumniRecords.tsx');
  process.exit(1);
}

// Find all objects inside mockRecords
const mockRecordsStr = alumniRecordsContent.slice(startIdx);
// Let's extract the array elements. Since the file is TS/JS syntax, we can write a quick evaluator or parse objects manually.
// To be extremely safe, let's extract only those records where course is NOT 'BSIT'.
// Let's write a regex that matches objects in the array:
const objRegex = /\{[\s\S]*?\}/g;
const matches = mockRecordsStr.match(objRegex) || [];

const nonBsitRecords = [];

matches.forEach((matchStr) => {
  // Check if this matches a record
  if (matchStr.includes('studentId:') && !matchStr.includes("course: 'BSIT'") && !matchStr.includes('course: "BSIT"')) {
    try {
      // Evaluate the object string safely by wrapping it in parentheses
      // We will replace single quotes with double quotes and format keys to parse as JSON, or use a simple eval
      const evalObj = new Function(`return ${matchStr}`)();
      if (evalObj && evalObj.course !== 'BSIT') {
        nonBsitRecords.push(evalObj);
      }
    } catch (e) {
      console.warn('Failed to parse object:', e.message);
    }
  }
});

console.log(`Found ${nonBsitRecords.length} non-BSIT mock records in AlumniRecords.tsx`);

// Let's read the already parsed 125 BSIT records from csvRecords.ts
const csvRecordsContent = fs.readFileSync(csvRecordsPath, 'utf8');
const searchStr = 'export const csvAlumniRecords: AlumniRecord[] = ';
const csvArrayStart = csvRecordsContent.indexOf(searchStr);

if (csvArrayStart === -1) {
  console.error('Could not find csvAlumniRecords in csvRecords.ts');
  process.exit(1);
}

const csvRecordsJSON = csvRecordsContent.slice(csvArrayStart + searchStr.length, csvRecordsContent.lastIndexOf(';'));
const parsedCsvRecords = JSON.parse(csvRecordsJSON);

console.log(`Read ${parsedCsvRecords.length} BSIT records from csvRecords.ts`);

// Combine them!
const combinedRecords = [...parsedCsvRecords, ...nonBsitRecords];
// Sort by ID or index if desired, but retaining order is fine.
console.log(`Total combined records: ${combinedRecords.length}`);

// Write the combined records back to csvRecords.ts
const newCsvRecordsContent = `// Automatically generated from BSIT graduates tracer CSV file and original department mock records
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

export const mockRecords: AlumniRecord[] = ${JSON.stringify(combinedRecords, null, 2)};
`;

fs.writeFileSync(csvRecordsPath, newCsvRecordsContent, 'utf8');
console.log('Successfully wrote combined mockRecords to src/app/components/csvRecords.ts');

// Now, refactor AlumniRecords.tsx. We will replace everything from 'const mockRecords: AlumniRecord[] = [' to the end of the file
// with a simple import statement at the top, and remove the array declaration.
// Let's remove the mockRecords array declaration.
const cleanAlumniRecordsContent = alumniRecordsContent.slice(0, startIdx).trim() + '\n\n';

// Add the import statement to the top of AlumniRecords.tsx
// Let's see if there is already an import of mockRecords
let refactoredContent = cleanAlumniRecordsContent;
if (!refactoredContent.includes("import { mockRecords } from './csvRecords'")) {
  refactoredContent = "import { mockRecords } from './csvRecords';\n" + refactoredContent;
}

fs.writeFileSync(alumniRecordsPath, refactoredContent, 'utf8');
console.log('Successfully cleaned and refactored src/app/components/AlumniRecords.tsx');
