/**
 * BSIT Program Educational Objectives (PEO) survey, from the questionnaire of the BSIT Program
 * Chair (Ma'am Faye). Alumni answer it before giving suggestions and feedback (panel request).
 * Answers are saved in the graduate's record as data.peoSurvey.
 */
import type { AlumniRecord } from './alumni';

export const SURVEY_PROGRAMS = ['BSIT'];

export const LIKERT = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] as const;
export const SATISFACTION = ['1 - Very Dissatisfied', '2 - Dissatisfied', '3 - Neutral', '4 - Satisfied', '5 - Very Satisfied'] as const;

export type Question =
  | { id: string; kind: 'text'; label: string; placeholder?: string; optional?: boolean }
  | { id: string; kind: 'months'; label: string }
  | { id: string; kind: 'yesno'; label: string }
  | { id: string; kind: 'likert'; label: string }
  | { id: string; kind: 'scale'; label: string }
  | { id: string; kind: 'single'; label: string; options: string[]; specify?: string }
  | { id: string; kind: 'multi'; label: string; options: string[] };

export const SURVEY_SECTIONS: { title: string; questions: Question[] }[] = [
  {
    title: 'B. Employment and Career Progression',
    questions: [
      { id: 'firstJobPosition', kind: 'text', label: 'First job after graduation: Position', placeholder: 'Leave empty if none yet', optional: true },
      { id: 'firstJobCompany', kind: 'text', label: 'First job after graduation: Company', optional: true },
      { id: 'monthsToFirstJob', kind: 'months', label: 'Time taken to secure first employment after graduation' },
      { id: 'promoted', kind: 'yesno', label: 'Have you been promoted?' },
      { id: 'roleChanged', kind: 'yesno', label: 'Has your role in the company changed?' },
      { id: 'leadership', kind: 'yesno', label: 'Do you have leadership responsibilities?' },
      { id: 'managerial', kind: 'yesno', label: 'Do you have managerial responsibilities?' },
      { id: 'jobRelevantToIT', kind: 'yesno', label: 'Is your current job relevant to the field of Information Technology?' },
    ],
  },
  {
    title: 'C. Assessment of Program Educational Objectives (PEOs)',
    questions: [
      { id: 'peo1', kind: 'likert', label: 'I can apply technical knowledge to troubleshoot and solve IT-related problems efficiently.' },
      { id: 'peo2', kind: 'likert', label: 'I can integrate usability principles into IT system development to enhance user experience.' },
      { id: 'peo3', kind: 'likert', label: 'My work in IT has positively contributed to my organization and society.' },
      { id: 'peo4', kind: 'likert', label: 'I prepare to design, develop, and deploy computer-based systems that meet user requirements, industry standards, and technical constraints.' },
      { id: 'peo5', kind: 'likert', label: 'I can adapt my communication style to effectively collaborate with different team members in a professional setting.' },
      { id: 'peo6', kind: 'likert', label: 'I take responsibility for ensuring the ethical and responsible use of technology in my professional work.' },
      { id: 'peo7', kind: 'likert', label: 'I understand and follow best practices for ensuring digital security in my professional work.' },
    ],
  },
  {
    title: 'D. Further Education and Certifications',
    questions: [
      {
        id: 'postgrad',
        kind: 'single',
        label: 'Have you pursued postgraduate studies after graduating from the BS Information Technology program at Occidental Mindoro State College?',
        options: [
          'Yes, I am currently enrolled in postgraduate studies.',
          'Yes, I have already completed postgraduate studies.',
          'No, but I plan to pursue postgraduate studies in the future.',
          'No, I do not have plans to pursue postgraduate studies.',
        ],
      },
      {
        id: 'certifications',
        kind: 'single',
        label: 'Have you obtained any professional certifications or licenses?',
        options: [
          'Yes, I have obtained a professional license.',
          'Yes, I have obtained other professional certifications (e.g., Project Management, Cybersecurity, Cloud Computing, Data Analytics, etc.).',
          'No, but I am currently in the process of obtaining a certification or license.',
          'No, I have not obtained any professional certifications or licenses.',
        ],
        specify: 'If yes, please specify the licenses and certifications',
      },
      {
        id: 'furtherStudies',
        kind: 'single',
        label: 'Do you have an interest in or recommendations for further studies in specific areas?',
        options: [
          'Yes, I am interested in pursuing further studies in a specific area.',
          'Yes, I recommend further studies in specific areas for future graduates.',
          'No, I am not interested in pursuing further studies.',
        ],
        specify: 'If yes, please specify the area(s) of interest or recommendation',
      },
    ],
  },
  {
    title: 'E. General Feedback and Recommendations',
    questions: [
      { id: 'satisfaction', kind: 'scale', label: 'How satisfied are you with the BS Information Technology program at Occidental Mindoro State College?' },
      {
        id: 'strengths',
        kind: 'multi',
        label: 'What do you consider as the key strengths of graduates from the BS Information Technology program at Occidental Mindoro State College? (Select all that apply)',
        options: [
          'Strong technical knowledge and problem-solving skills',
          'Proficiency in programming, networking, and database management',
          'Effective communication and teamwork abilities',
          'Adaptability and willingness to learn',
          'Professionalism and strong work ethic',
          'Leadership and project management skills',
          'Creativity and innovation in IT solutions',
          'Cybersecurity awareness and best practices',
        ],
      },
      {
        id: 'curriculum',
        kind: 'multi',
        label: 'What suggestions do you have for improving the BS Information Technology curriculum at Occidental Mindoro State College? (Select all that apply)',
        options: [
          'Incorporate more hands-on training and laboratory exercises',
          'Enhance internship and industry immersion opportunities',
          'Include advanced courses in cybersecurity, cloud computing, or artificial intelligence',
          'Improve access to modern IT tools and software (e.g., AWS, Azure, Python, Java, SQL)',
          'Integrate more project management and business-related courses',
          'Strengthen licensure exam review and preparation support (e.g., for IT certifications)',
          'Provide more research and innovation opportunities',
          'Increase collaboration with industry professionals and alumni',
        ],
      },
      {
        id: 'skills',
        kind: 'multi',
        label: 'What additional skills or competencies do you think should be included in the academic program of BS Information Technology at Occidental Mindoro State College to better prepare graduates for the workplace? (Select all that apply)',
        options: [
          'Advanced technical skills in IT (e.g., cybersecurity, software development, cloud computing)',
          'Proficiency in modern programming languages (e.g., Python, JavaScript, C#, SQL)',
          'Project management and leadership training',
          'Effective communication and technical writing skills',
          'Business and entrepreneurship in IT',
          'Data science and analytics',
          'Ethical hacking and penetration testing',
          'Hands-on training and industry exposure',
          'Innovation and problem-solving skills',
        ],
      },
      {
        id: 'mentor',
        kind: 'single',
        label: 'Are you willing to mentor current students or participate in alumni engagement activities?',
        options: [
          'Yes, I am willing to mentor current students.',
          'Yes, I am willing to participate in alumni engagement activities (e.g., career talks, networking events, workshops).',
          'Yes, I am willing to do both mentoring and alumni engagement activities.',
          'No, I am not available for these activities at the moment.',
        ],
      },
    ],
  },
];

export const ALL_QUESTIONS = SURVEY_SECTIONS.flatMap((s) => s.questions);

/** Answers keyed by question id. Multi-choice answers are arrays; "Other" text is `${id}Other`. */
export type SurveyAnswers = Record<string, string | string[] | undefined>;
export interface PeoSurvey {
  answers: SurveyAnswers;
  completedAt?: string;
  updatedAt?: string;
}

export const surveyApplies = (course: string | undefined) => !!course && SURVEY_PROGRAMS.includes(course);

/** Questions still unanswered (optional text questions and "please specify" boxes are never required). */
export function unansweredQuestions(answers: SurveyAnswers): Question[] {
  return ALL_QUESTIONS.filter((q) => {
    if (q.kind === 'text') return false;
    const v = answers[q.id];
    if (q.kind === 'multi') return !Array.isArray(v) || (!v.length && !String(answers[`${q.id}Other`] || '').trim());
    if (q.kind === 'months') return v === undefined || v === '' || Number.isNaN(Number(v));
    return !v;
  });
}

export const surveyComplete = (r: Pick<AlumniRecord, 'course'> & { peoSurvey?: PeoSurvey }) =>
  !surveyApplies(r.course) || !!r.peoSurvey?.completedAt;
