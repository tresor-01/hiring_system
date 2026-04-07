import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/portal/:token
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const jobRes = await query(
      `SELECT j.*, c.name as company_name, c.logo_url, c.primary_color
       FROM jobs j JOIN companies c ON c.id = j.company_id
       WHERE j.portal_token = $1`,
      [req.params.token]
    );
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Portal not found' });

    const resumesRes = await query(
      `SELECT r.*, cand.id as cand_id, cand.name as cand_name, cand.location as cand_location
       FROM resumes r JOIN candidates cand ON cand.id = r.candidate_id
       WHERE r.job_id = $1 AND r.stage IN ('SHORTLISTED','INTERVIEWED','OFFERED')
       ORDER BY r.match_score DESC NULLS LAST`,
      [job.id]
    );

    const candidates = await Promise.all(resumesRes.rows.map(async (r) => {
      const tagsRes = await query(
        `SELECT t.name FROM tags t JOIN resume_tags rt ON rt.tag_id = t.id WHERE rt.resume_id = $1`,
        [r.id]
      );
      const report = r.match_report || {};
      return {
        id: r.id,
        candidateId: r.cand_id,
        name: r.cand_name,
        location: r.cand_location,
        matchScore: r.match_score,
        stage: r.stage,
        strengths: report.strengths || [],
        gaps: report.gaps || [],
        recommendation: report.recommendation || '',
        explanation: report.explanation || '',
        tags: tagsRes.rows.map((t: any) => t.name)
      };
    }));

    res.json({
      job: { id: job.id, title: job.title, description: job.description, status: job.status, company: { name: job.company_name, logoUrl: job.logo_url, primaryColor: job.primary_color } },
      candidates
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portal/:token/feedback
router.post('/:token/feedback', async (req: Request, res: Response) => {
  try {
    const { candidateId, feedback, comment } = req.body;
    const jobRes = await query('SELECT id, company_id FROM jobs WHERE portal_token = $1', [req.params.token]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Portal not found' });

    const validFeedback = ['APPROVED', 'REJECTED', 'COMMENT'];
    if (!validFeedback.includes(feedback)) return res.status(400).json({ error: 'Invalid feedback value' });

    const result = await query(
      'INSERT INTO portal_feedback (job_id, candidate_id, company_id, feedback, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [job.id, candidateId, job.company_id, feedback, comment || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portal/:token/feedback
router.get('/:token/feedback', async (req: Request, res: Response) => {
  try {
    const jobRes = await query('SELECT id FROM jobs WHERE portal_token = $1', [req.params.token]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Portal not found' });

    const result = await query(
      `SELECT pf.*, c.name as cand_name FROM portal_feedback pf
       JOIN candidates c ON c.id = pf.candidate_id
       WHERE pf.job_id = $1 ORDER BY pf.created_at DESC`,
      [job.id]
    );
    res.json(result.rows.map(r => ({ ...r, candidate: { name: r.cand_name } })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
