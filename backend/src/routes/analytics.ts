import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/analytics/dashboard
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    const effectiveCompanyId = (companyId as string) || req.user?.companyId;
    if (!effectiveCompanyId) return res.status(400).json({ error: 'Company ID required' });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalJobsRes, activeJobsRes, totalCandidatesRes, totalResumesRes,
      recentResumesRes, stageRes, avgScoreRes, activityRes
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM jobs WHERE company_id = $1', [effectiveCompanyId]),
      query("SELECT COUNT(*) FROM jobs WHERE company_id = $1 AND status = 'ACTIVE'", [effectiveCompanyId]),
      query('SELECT COUNT(*) FROM candidates WHERE company_id = $1', [effectiveCompanyId]),
      query('SELECT COUNT(*) FROM resumes r JOIN jobs j ON j.id = r.job_id WHERE j.company_id = $1', [effectiveCompanyId]),
      query(
        `SELECT COUNT(*) FROM resumes r JOIN jobs j ON j.id = r.job_id
         WHERE j.company_id = $1 AND r.created_at >= $2`,
        [effectiveCompanyId, sevenDaysAgo]
      ),
      query(
        `SELECT r.stage, COUNT(*) as cnt FROM resumes r JOIN jobs j ON j.id = r.job_id
         WHERE j.company_id = $1 GROUP BY r.stage`,
        [effectiveCompanyId]
      ),
      query(
        `SELECT AVG(r.match_score) as avg_score FROM resumes r JOIN jobs j ON j.id = r.job_id
         WHERE j.company_id = $1 AND r.match_score IS NOT NULL`,
        [effectiveCompanyId]
      ),
      query(
        `SELECT al.*, u.name as user_name FROM activity_logs al
         JOIN users u ON u.id = al.user_id
         WHERE al.company_id = $1 ORDER BY al.created_at DESC LIMIT 10`,
        [effectiveCompanyId]
      )
    ]);

    const [hiredRes, offeredRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM resumes r JOIN jobs j ON j.id = r.job_id WHERE j.company_id = $1 AND r.stage = 'HIRED'`, [effectiveCompanyId]),
      query(`SELECT COUNT(*) FROM resumes r JOIN jobs j ON j.id = r.job_id WHERE j.company_id = $1 AND r.stage = 'OFFERED'`, [effectiveCompanyId])
    ]);

    const stageCounts: Record<string, number> = {};
    for (const s of stageRes.rows) {
      stageCounts[s.stage] = parseInt(s.cnt);
    }

    const hired = parseInt(hiredRes.rows[0].count);
    const offered = parseInt(offeredRes.rows[0].count);

    res.json({
      overview: {
        totalJobs: parseInt(totalJobsRes.rows[0].count),
        activeJobs: parseInt(activeJobsRes.rows[0].count),
        totalCandidates: parseInt(totalCandidatesRes.rows[0].count),
        totalResumes: parseInt(totalResumesRes.rows[0].count),
        avgMatchScore: Math.round(parseFloat(avgScoreRes.rows[0].avg_score) || 0),
        newResumesThisWeek: parseInt(recentResumesRes.rows[0].count),
        hireRate: offered > 0 ? Math.round((hired / offered) * 100) : 0
      },
      pipeline: stageCounts,
      recentActivity: activityRes.rows.map(r => ({ ...r, user: { name: r.user_name } }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/jobs/:id
router.get('/jobs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT id FROM jobs WHERE id = $1', [req.params.id]);
    if (!jobRes.rows[0]) return res.status(404).json({ error: 'Job not found' });

    const [stageRes, scoresRes, aggRes] = await Promise.all([
      query(`SELECT stage, COUNT(*) as cnt FROM resumes WHERE job_id = $1 GROUP BY stage`, [req.params.id]),
      query(`SELECT match_score FROM resumes WHERE job_id = $1 AND match_score IS NOT NULL`, [req.params.id]),
      query(
        `SELECT AVG(match_score) as avg, MAX(match_score) as max, MIN(match_score) as min
         FROM resumes WHERE job_id = $1 AND match_score IS NOT NULL`,
        [req.params.id]
      )
    ]);

    const buckets: Record<string, number> = { '0-40': 0, '40-60': 0, '60-75': 0, '75-90': 0, '90-100': 0 };
    for (const r of scoresRes.rows) {
      const score = r.match_score || 0;
      if (score < 40) buckets['0-40']++;
      else if (score < 60) buckets['40-60']++;
      else if (score < 75) buckets['60-75']++;
      else if (score < 90) buckets['75-90']++;
      else buckets['90-100']++;
    }

    const stageCounts: Record<string, number> = {};
    for (const s of stageRes.rows) stageCounts[s.stage] = parseInt(s.cnt);

    const agg = aggRes.rows[0];
    res.json({
      stages: stageCounts,
      scores: {
        avg: Math.round(parseFloat(agg.avg) || 0),
        max: Math.round(parseFloat(agg.max) || 0),
        min: Math.round(parseFloat(agg.min) || 0),
        distribution: buckets
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
