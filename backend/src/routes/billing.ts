import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const planLimits: Record<string, { jobs: number; resumes: number; emails: number }> = {
  FREE:    { jobs: 3,   resumes: 50,   emails: 10 },
  STARTER: { jobs: 20,  resumes: 500,  emails: 100 },
  PRO:     { jobs: 999, resumes: 9999, emails: 9999 }
};

const planPricing: Record<string, { base: number; perJob: number; perResume: number }> = {
  FREE:    { base: 0,   perJob: 0,    perResume: 0 },
  STARTER: { base: 49,  perJob: 2,    perResume: 0.10 },
  PRO:     { base: 199, perJob: 0,    perResume: 0.05 }
};

// GET /api/billing/usage
router.get('/usage', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, months = '6' } = req.query;
    const effectiveCompanyId = (companyId as string) || req.user?.companyId;
    if (!effectiveCompanyId) return res.status(400).json({ error: 'Company ID required' });
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== effectiveCompanyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [usageRes, companyRes] = await Promise.all([
      query(
        'SELECT * FROM billing_usage WHERE company_id = $1 ORDER BY month DESC LIMIT $2',
        [effectiveCompanyId, parseInt(months as string)]
      ),
      query('SELECT plan FROM companies WHERE id = $1', [effectiveCompanyId])
    ]);

    const company = companyRes.rows[0];
    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentUsage = usageRes.rows.find(u => u.month === currentMonth) ||
      { jobs_created: 0, resumes_screened: 0, emails_sent: 0 };
    const limits = planLimits[company?.plan || 'FREE'];

    res.json({
      plan: company?.plan,
      currentMonth: { ...currentUsage, limits },
      history: usageRes.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/billing/invoice/:month
router.get('/invoice/:month', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const effectiveCompanyId = req.user?.companyId;
    if (!effectiveCompanyId) return res.status(400).json({ error: 'No company' });

    const [usageRes, companyRes] = await Promise.all([
      query(
        'SELECT * FROM billing_usage WHERE company_id = $1 AND month = $2',
        [effectiveCompanyId, req.params.month]
      ),
      query('SELECT name, plan FROM companies WHERE id = $1', [effectiveCompanyId])
    ]);

    const usage = usageRes.rows[0];
    const company = companyRes.rows[0];
    const pricing = planPricing[company?.plan || 'FREE'];

    const totalJobsCost = (usage?.jobs_created || 0) * pricing.perJob;
    const totalResumesCost = (usage?.resumes_screened || 0) * pricing.perResume;
    const total = pricing.base + totalJobsCost + totalResumesCost;

    res.json({
      month: req.params.month,
      company: { name: company?.name, plan: company?.plan },
      usage: usage || { jobs_created: 0, resumes_screened: 0, emails_sent: 0 },
      pricing,
      breakdown: { base: pricing.base, jobs: totalJobsCost, resumes: totalResumesCost, total }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
