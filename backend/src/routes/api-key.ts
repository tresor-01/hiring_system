import { Router, Request, Response } from 'express';
import { query } from '../db';
import { matchResumeToJob, extractJobRequirements } from '../services/claude';

const router = Router();

async function verifyApiKey(apiKey: string) {
  const result = await query('SELECT * FROM companies WHERE api_key = $1', [apiKey]);
  return result.rows[0] || null;
}

// POST /v1/score — white-label resume scoring
router.post('/score', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return res.status(401).json({ error: 'API key required. Pass X-API-Key header.' });

    const company = await verifyApiKey(apiKey);
    if (!company) return res.status(401).json({ error: 'Invalid API key' });

    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'resumeText and jobDescription are required' });
    }

    // Check plan limits
    const month = new Date().toISOString().substring(0, 7);
    const usageRes = await query(
      'SELECT resumes_screened FROM billing_usage WHERE company_id = $1 AND month = $2',
      [company.id, month]
    );

    const planLimits: Record<string, number> = { FREE: 50, STARTER: 500, PRO: 9999 };
    const limit = planLimits[company.plan] || 50;
    const current = usageRes.rows[0]?.resumes_screened || 0;
    if (current >= limit) return res.status(429).json({ error: 'Usage limit reached for this month' });

    const requirements = await extractJobRequirements(jobDescription);
    const result = await matchResumeToJob(resumeText, jobDescription, requirements);

    // Track usage
    await query(
      `INSERT INTO billing_usage (company_id, month, resumes_screened) VALUES ($1,$2,1)
       ON CONFLICT (company_id, month) DO UPDATE SET resumes_screened = billing_usage.resumes_screened + 1, updated_at = NOW()`,
      [company.id, month]
    );

    res.json({ score: result.score, explanation: result.explanation, strengths: result.strengths, gaps: result.gaps, recommendation: result.recommendation, requirements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/jobs — Zapier-compatible
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) return res.status(401).json({ error: 'API key required' });

    const company = await verifyApiKey(apiKey);
    if (!company) return res.status(401).json({ error: 'Invalid API key' });

    const result = await query(
      'SELECT id, title, status, created_at FROM jobs WHERE company_id = $1 ORDER BY created_at DESC',
      [company.id]
    );
    res.json({ jobs: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
