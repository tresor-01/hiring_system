import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const MODEL = 'claude-opus-4-6';

async function callClaude(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  return content.text;
}

function parseJSON<T>(text: string): T {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text.trim();
  return JSON.parse(jsonStr) as T;
}

export interface JobRequirements {
  skills: string[];
  experience: string;
  education: string;
  location: string;
  mustHave: string[];
  niceToHave: string[];
  jobTitle: string;
  summary: string;
}

export async function extractJobRequirements(jdText: string): Promise<JobRequirements> {
  const prompt = `Analyze this job description and extract structured requirements. Return ONLY valid JSON.

Job Description:
${jdText}

Return this exact JSON structure:
{
  "skills": ["skill1", "skill2"],
  "experience": "e.g. 3-5 years",
  "education": "e.g. Bachelor's in Computer Science",
  "location": "e.g. Remote, New York, NY",
  "mustHave": ["requirement1", "requirement2"],
  "niceToHave": ["requirement1", "requirement2"],
  "jobTitle": "extracted job title",
  "summary": "2-3 sentence summary of the role"
}`;

  const response = await callClaude(prompt);
  return parseJSON<JobRequirements>(response);
}

export interface MatchResult {
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

export async function matchResumeToJob(
  resumeText: string,
  jdText: string,
  requirements: JobRequirements
): Promise<MatchResult> {
  const prompt = `You are an expert recruiter. Score this resume against the job description. Return ONLY valid JSON.

Job Description:
${jdText}

Key Requirements:
- Must have: ${requirements.mustHave.join(', ')}
- Skills needed: ${requirements.skills.join(', ')}
- Experience: ${requirements.experience}

Resume:
${resumeText.substring(0, 3000)}

Return this exact JSON structure:
{
  "score": 85,
  "explanation": "Overall assessment paragraph",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"],
  "recommendation": "STRONG_YES | YES | MAYBE | NO with brief reason"
}

Score guide: 90-100=exceptional, 75-89=strong match, 60-74=good match, 40-59=partial match, below 40=poor match`;

  const response = await callClaude(prompt);
  return parseJSON<MatchResult>(response);
}

export interface JDQualityResult {
  issues: Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    text: string;
    suggestion: string;
  }>;
  overallScore: number;
  summary: string;
}

export async function checkJDQuality(jdText: string): Promise<JDQualityResult> {
  const prompt = `You are an expert HR consultant. Review this job description for quality issues. Return ONLY valid JSON.

Job Description:
${jdText}

Check for:
1. Vague or unclear requirements
2. Contradictory statements
3. Exclusionary or biased language
4. Missing important information (salary range, benefits, responsibilities)
5. Overly long laundry lists
6. Unrealistic requirements

Return this exact JSON structure:
{
  "issues": [
    {
      "type": "vague_requirement | contradiction | exclusionary_language | missing_info | unrealistic",
      "severity": "HIGH | MEDIUM | LOW",
      "text": "The problematic text",
      "suggestion": "How to fix it"
    }
  ],
  "overallScore": 75,
  "summary": "Overall assessment of JD quality"
}`;

  const response = await callClaude(prompt);
  return parseJSON<JDQualityResult>(response);
}

export interface BiasCheckResult {
  flags: Array<{
    type: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  overallRisk: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  summary: string;
}

export async function checkBias(jdText: string, matchResults?: any[]): Promise<BiasCheckResult> {
  const prompt = `You are a DEI (Diversity, Equity, Inclusion) expert. Analyze this job description and scoring results for potential bias patterns. Return ONLY valid JSON.

Job Description:
${jdText}

${matchResults ? `Scoring context: ${matchResults.length} candidates scored` : ''}

Check for:
1. Gender-coded language
2. Age-related bias
3. Cultural or nationality bias
4. Educational credential inflation
5. Socioeconomic barriers
6. Physical ability assumptions

Return this exact JSON structure:
{
  "flags": [
    {
      "type": "gender_bias | age_bias | cultural_bias | credential_inflation | socioeconomic | ability",
      "description": "Description of the issue",
      "severity": "HIGH | MEDIUM | LOW"
    }
  ],
  "overallRisk": "HIGH | MEDIUM | LOW | MINIMAL",
  "summary": "Overall bias assessment"
}`;

  const response = await callClaude(prompt);
  return parseJSON<BiasCheckResult>(response);
}

export interface InterviewQuestionsResult {
  questions: Array<{
    question: string;
    rationale: string;
    category: string;
  }>;
}

export async function generateInterviewQuestions(
  resumeText: string,
  jdText: string,
  gaps: string[]
): Promise<InterviewQuestionsResult> {
  const prompt = `You are an expert interviewer. Generate tailored interview questions for this candidate based on their resume and the job requirements. Return ONLY valid JSON.

Job Description:
${jdText.substring(0, 1500)}

Candidate Resume:
${resumeText.substring(0, 2000)}

Identified Gaps:
${gaps.join('\n')}

Generate 8-10 interview questions covering:
1. Gaps in experience
2. Technical skills validation
3. Behavioral questions for required competencies
4. Culture fit

Return this exact JSON structure:
{
  "questions": [
    {
      "question": "Tell me about...",
      "rationale": "Why this question is relevant",
      "category": "Technical | Behavioral | Gap | Culture | Experience"
    }
  ]
}`;

  const response = await callClaude(prompt);
  return parseJSON<InterviewQuestionsResult>(response);
}

export interface ShortlistResult {
  selected: Array<{
    candidateId: string;
    rank: number;
    justification: string;
  }>;
  overview: string;
}

export async function generateShortlist(
  candidates: Array<{ id: string; name: string; score: number; strengths: string[]; gaps: string[] }>,
  targetCount: number,
  jdText: string
): Promise<ShortlistResult> {
  const prompt = `You are a senior recruiter. Select the top ${targetCount} candidates from this list for this job. Return ONLY valid JSON.

Job Overview:
${jdText.substring(0, 1000)}

Candidates (with AI scores):
${JSON.stringify(candidates, null, 2)}

Select the best ${targetCount} candidates considering:
- Match score
- Strength of qualifications
- Potential for the role
- Diversity of backgrounds

Return this exact JSON structure:
{
  "selected": [
    {
      "candidateId": "id here",
      "rank": 1,
      "justification": "Why this candidate was selected"
    }
  ],
  "overview": "Summary of the shortlist selection rationale"
}`;

  const response = await callClaude(prompt);
  return parseJSON<ShortlistResult>(response);
}

export interface ComparisonResult {
  comparison: Array<{
    criterion: string;
    candidates: Record<string, string>;
  }>;
  recommendation: string;
  rationale: string;
  rankings: Array<{
    candidateId: string;
    rank: number;
    summary: string;
  }>;
}

export async function compareCandidates(
  candidates: Array<{ id: string; name: string; resumeText: string; score: number }>,
  jdText: string
): Promise<ComparisonResult> {
  const prompt = `You are a senior recruiter. Compare these ${candidates.length} candidates side-by-side for this job. Return ONLY valid JSON.

Job Description:
${jdText.substring(0, 1000)}

Candidates:
${candidates.map(c => `[${c.id}] ${c.name} (Score: ${c.score})\n${c.resumeText.substring(0, 800)}`).join('\n\n---\n\n')}

Return this exact JSON structure:
{
  "comparison": [
    {
      "criterion": "Technical Skills",
      "candidates": {
        "${candidates[0]?.id}": "Assessment",
        "${candidates[1]?.id}": "Assessment"
      }
    }
  ],
  "recommendation": "Candidate name/ID recommended",
  "rationale": "Why this candidate is the top choice",
  "rankings": [
    {
      "candidateId": "id",
      "rank": 1,
      "summary": "Brief ranking summary"
    }
  ]
}

Compare on: Technical Skills, Experience Level, Education, Culture Fit, Communication, Leadership, Unique Value`;

  const response = await callClaude(prompt);
  return parseJSON<ComparisonResult>(response);
}

export interface EmailDraftResult {
  subject: string;
  body: string;
}

export async function draftEmail(
  stage: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  extraContext?: string
): Promise<EmailDraftResult> {
  const stageDescriptions: Record<string, string> = {
    NEW: 'application acknowledgment',
    SCREENED: 'resume reviewed notification',
    SHORTLISTED: 'shortlist notification',
    INTERVIEWED: 'post-interview follow-up',
    OFFERED: 'job offer',
    HIRED: 'onboarding welcome',
    REJECTED: 'polite rejection with encouragement'
  };

  const description = stageDescriptions[stage] || stage;

  const prompt = `Draft a professional recruitment email for a ${description}. Return ONLY valid JSON.

Details:
- Candidate: ${candidateName}
- Position: ${jobTitle}
- Company: ${companyName}
- Stage: ${stage}
${extraContext ? `- Additional context: ${extraContext}` : ''}

Write a warm, professional email appropriate for this stage. Keep it concise (150-250 words).

Return this exact JSON structure:
{
  "subject": "Email subject line",
  "body": "Full email body with greeting and signature placeholder"
}`;

  const response = await callClaude(prompt);
  return parseJSON<EmailDraftResult>(response);
}
