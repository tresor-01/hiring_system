import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// POST /api/webhook/ats
router.post('/ats', async (req: Request, res: Response) => {
  try {
    const { event, data, apiKey } = req.body;

    const companyRes = await query('SELECT * FROM companies WHERE api_key = $1', [apiKey]);
    const company = companyRes.rows[0];
    if (!company) return res.status(401).json({ error: 'Invalid API key' });

    switch (event) {
      case 'candidate.created': {
        const result = await query(
          'INSERT INTO candidates (name, email, phone, location, company_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
          [data.name, data.email || null, data.phone || null, data.location || null, company.id]
        );
        return res.json({ success: true, candidateId: result.rows[0].id });
      }
      case 'stage.updated': {
        if (!data.resumeId || !data.stage) return res.status(400).json({ error: 'resumeId and stage required' });
        await query("UPDATE resumes SET stage = $1, updated_at = NOW() WHERE id = $2", [data.stage, data.resumeId]);
        return res.json({ success: true });
      }
      default:
        return res.status(400).json({ error: `Unknown event: ${event}` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
