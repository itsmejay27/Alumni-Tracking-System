// AI Job Assistant (Google Gemini). Signed-in users send a job link, pasted text, a screenshot
// or a PDF; Gemini explains it in plain English or Filipino, breaks down the salary, compares the
// requirements with the user's skills, and can draft a cover letter or interview practice.
// It can also search the internet (Google Search) for open jobs that fit a graduate.
//
// Secrets: GEMINI_API_KEY (required), GEMINI_MODEL (optional, default "gemini-flash-latest").
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const DAILY_LIMIT = 20;
const MAX_PAGE_CHARS = 60_000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// Tried in order; busy or unavailable models fall through to the next one
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];

// ---------- Reading a job page safely ----------

/** Refuses links that point at private or internal addresses (protects the server's network). */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error('That does not look like a valid link.');
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http and https links are supported.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.')) {
    throw new Error('That link is not allowed.');
  }
  const isPrivate = (ip: string) =>
    /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) ||
    /^(::1|fc|fd|fe80)/i.test(ip);
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (isPrivate(host)) throw new Error('That link is not allowed.');
    return url;
  }
  const addrs = [
    ...(await Deno.resolveDns(host, 'A').catch(() => [] as string[])),
    ...(await Deno.resolveDns(host, 'AAAA').catch(() => [] as string[])),
  ];
  if (!addrs.length) throw new Error('Could not find that website.');
  if (addrs.some(isPrivate)) throw new Error('That link is not allowed.');
  return url;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** Turns a job page into plain text. Uses the page's JobPosting data first when it has some. */
function pageToText(html: string): string {
  const parts: string[] = [];
  // Many job sites embed structured JobPosting data (schema.org)
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const it of items) {
        if (String(it?.['@type'] || '').toLowerCase().includes('jobposting')) {
          parts.push(`Structured job data: ${JSON.stringify(it)}`);
        }
      }
    } catch {
      /* not valid JSON, ignore */
    }
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) parts.push(`Page title: ${decodeEntities(title.trim())}`);
  const body = decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|section)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  parts.push(body);
  return parts.join('\n\n');
}

async function readJobPage(rawUrl: string): Promise<string> {
  let url = await assertPublicUrl(rawUrl);
  let res: Response | null = null;
  // Follow up to 3 redirects, checking each target
  for (let i = 0; i < 4; i++) {
    res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OMSU-Alumni-Track/1.0; +https://omsualumnitrack.site)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location')!, url).toString());
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new Error(`The website refused the request (${res?.status ?? 'no response'}). Paste the job text or upload a screenshot instead.`);
  const type = res.headers.get('content-type') || '';
  if (!/html|text/.test(type)) throw new Error('That link is not a web page. Upload the file instead.');
  const text = pageToText(await res.text());
  if (text.length < 200) {
    throw new Error("Couldn't read the job details from that page (it may need a login or load with JavaScript). Paste the job text or upload a screenshot instead.");
  }
  if (text.length > MAX_PAGE_CHARS) {
    throw new Error('That page is too long to read. Paste only the job description instead.');
  }
  return text;
}

// ---------- Gemini ----------

const S = (description: string) => ({ type: 'STRING', description });
const ARR = (items: unknown, description: string) => ({ type: 'ARRAY', items, description });

const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isJobPosting: { type: 'BOOLEAN', description: 'False if the input is not a job posting at all' },
    title: S('Job title'),
    company: S('Employer name, or "Not stated"'),
    location: S('Work location or "Remote"'),
    workSetup: S('e.g. Full-time remote, Part-time onsite, Freelance'),
    summary: S('3-4 sentence plain-language summary of the job'),
    dailyTasks: ARR(S('One task, in simple words'), 'What the person would do on a typical day'),
    requiredSkills: ARR(
      {
        type: 'OBJECT',
        properties: { skill: S('Skill or tool name'), meaning: S('What it means in simple words') },
        required: ['skill', 'meaning'],
      },
      'Skills and tools the job asks for',
    ),
    qualifications: ARR(S('Education, experience or other requirement'), 'Stated qualifications'),
    salary: {
      type: 'OBJECT',
      properties: {
        stated: S('Salary exactly as written, or "Not stated"'),
        currency: S('e.g. PHP or USD'),
        hourly: S('Estimated hourly pay, or "—"'),
        weekly: S('Estimated weekly pay, or "—"'),
        monthly: S('Estimated monthly pay, or "—"'),
        monthlyInPhp: S('Approximate monthly pay in Philippine pesos, or "—"'),
        explanation: S('How these were computed and assumptions (hours per week, exchange rate)'),
      },
      required: ['stated', 'currency', 'hourly', 'weekly', 'monthly', 'monthlyInPhp', 'explanation'],
    },
    glossary: ARR(
      {
        type: 'OBJECT',
        properties: { term: S('Unfamiliar term'), meaning: S('Plain explanation'), example: S('Practical example') },
        required: ['term', 'meaning', 'example'],
      },
      'Jargon, abbreviations or technical terms in the posting',
    ),
    fit: {
      type: 'OBJECT',
      properties: {
        verdict: { type: 'STRING', enum: ['Strong match', 'Possible match', 'Not yet a match', 'Not enough information'] },
        matchedSkills: ARR(S('Skill the user already has'), 'Requirements the user meets'),
        missingSkills: ARR(S('Skill the user lacks'), 'Requirements the user does not show yet'),
        advice: ARR(S('One practical tip'), 'How to apply or what to learn first'),
      },
      required: ['verdict', 'matchedSkills', 'missingSkills', 'advice'],
    },
    warnings: ARR(S('Possible scam sign or concern'), 'Red flags, e.g. asks for payment, vague employer'),
    posting: {
      type: 'OBJECT',
      description: 'The job in the format of the OMSU Job Board form, in the original language of the posting',
      properties: {
        jobType: { type: 'STRING', enum: ['full-time', 'part-time', 'contract', 'internship'] },
        salaryRange: S('Salary as a short range, e.g. "₱25,000 - ₱35,000/month" or "$5/hour"; empty if not stated'),
        contactEmail: S('Application email address exactly as written; empty if none'),
        relatedProgram: {
          type: 'STRING',
          enum: ['BSIT', 'BEED', 'BSBA-FM', 'BSBA-OM', 'BSOA', 'None'],
          description: 'Closest OMSU program: BSIT (IT), BEED (elementary education), BSBA-FM (financial management), BSBA-OM (operations management), BSOA (office administration); None if none fits',
        },
        description: S('Clean 2-5 sentence description of the role and responsibilities, faithful to the posting'),
        requirements: ARR(S('One requirement'), 'Requirements and qualifications, one per item'),
      },
      required: ['jobType', 'salaryRange', 'contactEmail', 'relatedProgram', 'description', 'requirements'],
    },
  },
  required: ['isJobPosting', 'title', 'company', 'location', 'workSetup', 'summary', 'dailyTasks', 'requiredSkills', 'qualifications', 'salary', 'glossary', 'fit', 'warnings', 'posting'],
};

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

type Source = { title: string; uri: string };

async function callGemini(system: string, parts: Part[], schema?: unknown): Promise<string> {
  return (await callGeminiFull(system, parts, { schema })).text;
}

/** Calls Gemini. With search: true it may look things up on Google and returns the pages it used. */
async function callGeminiFull(
  system: string,
  parts: Part[],
  opts: { schema?: unknown; search?: boolean } = {}
): Promise<{ text: string; sources: Source[] }> {
  const { schema, search } = opts;
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('The AI assistant is not set up yet (missing GEMINI_API_KEY).');
  const preferred = Deno.env.get('GEMINI_MODEL');
  const models = preferred ? [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)] : FALLBACK_MODELS;

  let lastError = '';
  let busy = false;
  // Web search is slow, so try fewer models to finish within the server's time limit
  for (const model of search ? models.slice(0, 3) : models) {
    // Two tries per model: Google's "high demand" errors usually clear within seconds
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          // Searching the web takes longer; still leave time to try another model
          signal: AbortSignal.timeout(search ? 45_000 : 90_000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts }],
            ...(search ? { tools: [{ google_search: {} }] } : {}),
            generationConfig: schema
              ? { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3 }
              : { temperature: search ? 0.2 : 0.6 },
          }),
        });
      } catch {
        lastError = 'The AI service did not answer in time.';
        console.error(`[gemini] ${model}: timed out`);
        busy = true;
        break; // try the next model
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) console.error(`[gemini] ${model} (${search ? 'search' : 'text'}): ${res.status} ${body?.error?.status || ''} ${body?.error?.message || ''}`);
      if (res.status === 404 || res.status === 400 && /model/i.test(body?.error?.message || '')) {
        lastError = body?.error?.message || `Model ${model} not found`;
        break; // model not available to this key: next model
      }
      if (res.status === 429 || res.status === 500 || res.status === 503 || res.status === 504) {
        busy = true;
        lastError = body?.error?.message || `AI service error (${res.status})`;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
          continue;
        }
        break; // still busy: next model
      }
      if (!res.ok) throw new Error(body?.error?.message || `AI service error (${res.status})`);
      if (body?.promptFeedback?.blockReason) throw new Error('The AI could not process this content.');
      const cand = body?.candidates?.[0];
      const text = (cand?.content?.parts || []).map((p: any) => p.text || '').join('');
      if (!text) throw new Error(cand?.finishReason === 'SAFETY' ? 'The AI could not process this content.' : 'The AI returned no answer. Please try again.');
      const sources: Source[] = (cand?.groundingMetadata?.groundingChunks || [])
        .map((c: any) => ({ title: String(c?.web?.title || ''), uri: String(c?.web?.uri || '') }))
        .filter((s: Source) => /^https?:\/\//.test(s.uri));
      return { text, sources };
    }
  }
  if (busy) {
    // Google's daily free limit is a different problem from a short busy spell; say which one
    if (/quota|exhausted|limit/i.test(lastError)) {
      throw new Error(
        search
          ? "Today's free AI internet-search limit has been reached. Please try again tomorrow, or use Explain a job in the meantime."
          : "Today's free AI limit has been reached. Please try again tomorrow."
      );
    }
    throw new Error('The AI service is very busy right now. Please try again in a minute.');
  }
  throw new Error(`No Gemini model is available for this API key. ${lastError}`);
}

// ---------- Request handling ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Please sign in again.' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Daily cap per person keeps API costs predictable
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', caller.user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `You've reached today's limit of ${DAILY_LIMIT} AI requests. Please try again tomorrow.` }, 429);
  }

  const language = body.language === 'fil' ? 'Filipino (Tagalog), using common English terms where Filipinos normally do' : 'simple English';
  const profile = String(body.profile || '').slice(0, 3000);

  try {
    if (body.action === 'assist') {
      const kind = body.kind === 'interview' ? 'interview' : 'cover_letter';
      const job = JSON.stringify(body.analysis || {}).slice(0, 20_000);
      const system =
        kind === 'cover_letter'
          ? `You help Occidental Mindoro State University (OMSU) graduates apply for jobs. Write a short, honest cover letter (180-250 words) in ${language === 'simple English' ? 'clear professional English' : language}. Use only facts from the applicant profile; never invent experience. Leave [brackets] where the applicant must fill something in. Plain text, no markdown headings.`
          : `You help Occidental Mindoro State University (OMSU) graduates prepare for job interviews. Write in ${language}. Give 8 likely interview questions for this job. For each: the question, why employers ask it, and a short sample answer based only on the applicant profile, with [brackets] where they should add their own details. Use simple markdown (numbered list, bold questions).`;
      const text = await callGemini(system, [{ text: `Job analysis:\n${job}\n\nApplicant profile:\n${profile || 'Not provided'}` }]);
      await admin.from('ai_usage').insert({ user_id: caller.user.id, action: kind });
      return json({ text });
    }

    if (body.action === 'search') {
      const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
      const program = clip(body.program, 120);
      const skills = clip(body.skills, 600);
      const location = clip(body.location, 120) || 'Philippines';
      const jobType = ['full-time', 'part-time', 'contract', 'internship'].includes(body.jobType) ? body.jobType : 'any';
      const keywords = clip(body.keywords, 200);
      const remote = body.remote === true;
      const today = new Date().toISOString().slice(0, 10);
      const system = `You find CURRENT job openings for a graduate of Occidental Mindoro State University (OMSU), Philippines, using Google Search. Today is ${today}.
Rules:
- Search the web now. Only list real, open job postings you actually found in the search results, ideally posted in the last 30 days. Never invent a job, company, salary or link.
- Prefer Philippine job sites (JobStreet, Indeed Philippines, LinkedIn, Kalibrr, OnlineJobs.ph, PhilJobNet, Bossjob), government vacancies (CSC, DepEd, LGUs) and company career pages.
- Match the graduate's program and skills. Include entry-level roles a fresh graduate can apply for.
- "url" must be the exact link to the posting or listing page from the search results. If you have no exact link, use "".
- Write "whyMatch" and "description" in ${language}. Keep job titles and company names as written in the posting.
- Reply with ONLY a JSON object, no markdown, in this shape:
{"jobs":[{"title":"","company":"","location":"","type":"full-time|part-time|contract|internship","salary":"Not stated or the stated pay","postedDate":"as stated, or empty","url":"","site":"website name","whyMatch":"1 sentence","description":"2-3 sentences","requirements":["..."],"contactEmail":"or empty","relatedProgram":"BSIT|BEED|BSBA-FM|BSBA-OM|BSOA|None"}],"tips":["2-3 short search tips for this graduate"]}
- Up to 8 jobs, best matches first. If you find none, return an empty jobs list and helpful tips.`;
      const ask = [
        `Program: ${program || 'Not given'}`,
        `Skills: ${skills || 'Not given'}`,
        `Preferred location: ${location}${remote ? ' (remote / work-from-home also welcome)' : ''}`,
        `Job type: ${jobType}`,
        keywords ? `Also looking for: ${keywords}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const { text, sources } = await callGeminiFull(system, [{ text: ask }], { search: true });
      // Pull the JSON object out even if the model wrapped it in text or code fences
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      let parsed: any = {};
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        throw new Error('The AI search did not return results. Please try again.');
      }
      const hostOf = (u: string) => {
        try {
          return new URL(u).hostname.replace(/^www\./, '');
        } catch {
          return '';
        }
      };
      const sourceHosts = new Set(sources.map((s) => s.title.toLowerCase().replace(/^www\./, '')));
      const jobs = (Array.isArray(parsed.jobs) ? parsed.jobs : []).slice(0, 8).map((j: any) => {
        const url = /^https?:\/\//.test(String(j?.url || '')) ? String(j.url) : '';
        const host = hostOf(url);
        return {
          title: clip(j?.title, 150),
          company: clip(j?.company, 150),
          location: clip(j?.location, 150),
          type: ['full-time', 'part-time', 'contract', 'internship'].includes(j?.type) ? j.type : 'full-time',
          salary: clip(j?.salary, 120),
          postedDate: clip(j?.postedDate, 60),
          url,
          site: clip(j?.site, 80) || host,
          // True when the link's website is one of the pages Google Search actually returned
          linkSeen: !!host && [...sourceHosts].some((h) => h && (host === h || host.endsWith(`.${h}`) || h.endsWith(`.${host}`))),
          whyMatch: clip(j?.whyMatch, 300),
          description: clip(j?.description, 900),
          requirements: (Array.isArray(j?.requirements) ? j.requirements : []).slice(0, 8).map((r: unknown) => clip(r, 200)),
          contactEmail: /@/.test(String(j?.contactEmail || '')) ? clip(j.contactEmail, 120) : '',
          relatedProgram: clip(j?.relatedProgram, 20),
        };
      }).filter((j: any) => j.title && j.company);
      const tips = (Array.isArray(parsed.tips) ? parsed.tips : []).slice(0, 4).map((t: unknown) => clip(t, 300));
      await admin.from('ai_usage').insert({ user_id: caller.user.id, action: 'search' });
      return json({ jobs, tips, sources: sources.slice(0, 12), remaining: DAILY_LIMIT - (count ?? 0) - 1 });
    }

    // action: analyze
    const parts: Part[] = [];
    let source = '';
    if (body.url) {
      const page = await readJobPage(String(body.url));
      parts.push({ text: `Job posting from ${body.url}:\n\n${page}` });
      source = 'url';
    } else if (body.file?.data && body.file?.mimeType) {
      const mime = String(body.file.mimeType);
      if (!/^image\/(png|jpe?g|webp|heic|heif)$|^application\/pdf$/.test(mime)) {
        return json({ error: 'Upload a PNG, JPG, WEBP image or a PDF.' }, 400);
      }
      if (String(body.file.data).length * 0.75 > MAX_UPLOAD_BYTES) return json({ error: 'File is too large (8 MB max).' }, 400);
      parts.push({ inline_data: { mime_type: mime, data: String(body.file.data) } });
      parts.push({ text: 'This file is a job posting (screenshot or document). Read it carefully.' });
      source = 'file';
    } else if (body.text && String(body.text).trim().length > 40) {
      const text = String(body.text);
      if (text.length > MAX_PAGE_CHARS) return json({ error: 'That text is too long. Paste only the job description.' }, 400);
      parts.push({ text: `Job posting:\n\n${text}` });
      source = 'text';
    } else {
      return json({ error: 'Add a job link, paste the job description, or upload a screenshot or PDF.' }, 400);
    }
    parts.push({ text: `Applicant profile (for the skills check):\n${profile || 'Not provided'}` });

    const system = `You are a friendly career guide for graduates of Occidental Mindoro State University (OMSU) in the Philippines, many of them first-time job seekers. Explain the job posting in ${language}, as if to someone who has never seen these terms before.
- Use only what the posting says; write "Not stated" instead of guessing facts like the employer or salary.
- Salary: convert to hourly, weekly and monthly. Assume 40 hours a week and 4.33 weeks a month unless the posting says otherwise, and say so. If the pay is not in PHP, give an approximate PHP amount and name the exchange rate you assumed.
- Skills check: compare the requirements with the applicant profile. If the profile is empty, use verdict "Not enough information" and give general advice.
- Warnings: flag scam signs (fees to apply, requests for IDs or bank details early, unrealistic pay, vague employer, chat-app-only contact). Use an empty list if none.
- If the input is not a job posting, set isJobPosting to false and explain briefly in the summary.`;
    const raw = await callGemini(system, parts, ANALYSIS_SCHEMA);
    let analysis: unknown;
    try {
      analysis = JSON.parse(raw);
    } catch {
      throw new Error('The AI answer could not be read. Please try again.');
    }
    await admin.from('ai_usage').insert({ user_id: caller.user.id, action: `analyze:${source}` });
    return json({ analysis, remaining: DAILY_LIMIT - (count ?? 0) - 1 });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
