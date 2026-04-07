import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRecruiter } from '../middleware/rbac';
import { aiLimiter } from '../middleware/rateLimit';
import {
  generateShortlist,
  compareCandidates,
  generateInterviewQuestions,
  checkBias
} from '../services/claude';

const router = Router();

// POST /api/ai/shortlist
router.post('/shortlist', authenticate, requireRecruiter, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, targetCount = 10 } = req.body;

    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const resumesRes = await query(
      `SELECT r.*, c.name as cand_name FROM resumes r
       JOIN candidates c ON c.id = r.candidate_id
       WHERE r.job_id = $1 AND r.match_score IS NOT NULL
       ORDER BY r.match_score DESC`,
      [jobId]
    );

    if (resumesRes.rows.length === 0) {
      return res.status(400).json({ error: 'No scored resumes found. Run match-all first.' });
    }

    const candidates = resumesRes.rows.map(r => ({
      id: r.id,
      name: r.cand_name,
      score: r.match_score || 0,
      strengths: r.match_report ? (r.match_report.strengths || []) : [],
      gaps: r.match_report ? (r.match_report.gaps || []) : []
    }));

    const result = await generateShortlist(candidates, targetCount, job.raw_text || job.description);

    // Update stages for selected candidates
    for (const selected of result.selected) {
      await query(
        "UPDATE resumes SET stage = 'SHORTLISTED', updated_at = NOW() WHERE id = $1",
        [selected.candidateId]
      );
    }

    await query(
      'INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user!.id, job.company_id, 'GENERATED_SHORTLIST', 'Job', jobId, JSON.stringify({ count: result.selected.length })]
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/compare
router.post('/compare', authenticate, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { resumeIds, jobId } = req.body;
    if (!Array.isArray(resumeIds) || resumeIds.length < 2 || resumeIds.length > 5) {
      return res.status(400).json({ error: 'Select 2–5 candidates to compare' });
    }

    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const placeholders = resumeIds.map((_, i) => `$${i + 1}`).join(',');
    const resumesRes = await query(
      `SELECT r.*, c.name as cand_name FROM resumes r
       JOIN candidates c ON c.id = r.candidate_id
       WHERE r.id IN (${placeholders})`,
      resumeIds
    );

    const candidates = resumesRes.rows.map(r => ({
      id: r.id,
      name: r.cand_name,
      resumeText: r.raw_text || '',
      score: r.match_score || 0
    }));

    const result = await compareCandidates(candidates, job.raw_text || job.description);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/interview-questions
router.post('/interview-questions', authenticate, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { resumeId, jobId } = req.body;

    const [resumeRes, jobRes] = await Promise.all([
      query(`SELECT r.*, c.name as cand_name FROM resumes r JOIN candidates c ON c.id = r.candidate_id WHERE r.id = $1`, [resumeId]),
      query('SELECT * FROM jobs WHERE id = $1', [jobId])
    ]);

    const resume = resumeRes.rows[0];
    const job = jobRes.rows[0];
    if (!resume || !job) return res.status(404).json({ error: 'Resume or job not found' });

    const gaps = resume.match_report ? (resume.match_report.gaps || []) : [];
    const result = await generateInterviewQuestions(resume.raw_text || '', job.raw_text || job.description, gaps);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/bias-check
router.post('/bias-check', authenticate, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId } = req.body;
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const resumesRes = await query(
      `SELECT match_score, stage FROM resumes WHERE job_id = $1 AND match_score IS NOT NULL ORDER BY match_score DESC LIMIT 20`,
      [jobId]
    );

    const matchResults = resumesRes.rows.map(r => ({ score: r.match_score, stage: r.stage }));
    const result = await checkBias(job.raw_text || job.description, matchResults);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
