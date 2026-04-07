import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRecruiter } from '../middleware/rbac';
import { matchResumeToJob } from '../services/claude';

const router = Router();

// GET /api/candidates — search candidates
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, location, companyId, page = '1', limit = '20' } = req.query;
    const effectiveCompanyId = (companyId as string) || req.user?.companyId;
    if (!effectiveCompanyId) return res.status(400).json({ error: 'Company ID required' });

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const conditions: string[] = ['c.company_id = $1'];
    const params: any[] = [effectiveCompanyId];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.location ILIKE $${params.length})`);
    }
    if (location) {
      params.push(`%${location}%`);
      conditions.push(`c.location ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const [totalRes, candidatesRes] = await Promise.all([
      query(`SELECT COUNT(*) FROM candidates c WHERE ${where}`, params),
      query(
        `SELECT c.* FROM candidates c WHERE ${where} ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, take, offset]
      )
    ]);

    const candidates = await Promise.all(candidatesRes.rows.map(async (c) => {
      const resumesRes = await query(
        `SELECT r.id, r.match_score, r.stage, j.id as job_id, j.title as job_title
         FROM resumes r JOIN jobs j ON j.id = r.job_id
         WHERE r.candidate_id = $1 ORDER BY r.match_score DESC NULLS LAST LIMIT 3`,
        [c.id]
      );
      return { ...c, resumes: resumesRes.rows.map(r => ({ ...r, job: { id: r.job_id, title: r.job_title } })) };
    }));

    res.json({ candidates, total: parseInt(totalRes.rows[0].count), page: parseInt(page as string), pages: Math.ceil(parseInt(totalRes.rows[0].count) / take) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/candidates/talent-pool
router.get('/talent-pool', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, minScore } = req.query;
    const effectiveCompanyId = (companyId as string) || req.user?.companyId;

    const candidatesRes = await query(
      'SELECT * FROM candidates WHERE company_id = $1 ORDER BY created_at DESC',
      [effectiveCompanyId]
    );

    const candidates = await Promise.all(candidatesRes.rows.map(async (c) => {
      let sql = `SELECT r.*, j.id as job_id_v, j.title as job_title, j.status as job_status
                 FROM resumes r JOIN jobs j ON j.id = r.job_id
                 WHERE r.candidate_id = $1`;
      const params: any[] = [c.id];
      if (minScore) { params.push(parseFloat(minScore as string)); sql += ` AND r.match_score >= $${params.length}`; }
      sql += ' ORDER BY r.match_score DESC NULLS LAST';

      const resumesRes = await query(sql, params);
      return {
        ...c,
        resumes: resumesRes.rows.map(r => ({
          ...r,
          job: { id: r.job_id_v, title: r.job_title, status: r.job_status }
        }))
      };
    }));

    res.json(candidates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/candidates/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const candRes = await query('SELECT * FROM candidates WHERE id = $1', [req.params.id]);
    if (!candRes.rows[0]) return res.status(404).json({ error: 'Candidate not found' });

    const resumesRes = await query(
      `SELECT r.*, j.id as job_id_v, j.title as job_title, j.status as job_status, j.description as job_desc
       FROM resumes r JOIN jobs j ON j.id = r.job_id
       WHERE r.candidate_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    const resumes = await Promise.all(resumesRes.rows.map(async (r) => {
      const notesRes = await query(
        `SELECT n.*, u.name as user_name FROM notes n JOIN users u ON u.id = n.user_id WHERE n.resume_id = $1 ORDER BY n.created_at DESC`,
        [r.id]
      );
      const tagsRes = await query(
        `SELECT t.* FROM tags t JOIN resume_tags rt ON rt.tag_id = t.id WHERE rt.resume_id = $1`,
        [r.id]
      );
      return {
        ...r,
        job: { id: r.job_id_v, title: r.job_title, status: r.job_status },
        notes: notesRes.rows.map(n => ({ ...n, user: { name: n.user_name } })),
        tags: tagsRes.rows
      };
    }));

    res.json({ ...candRes.rows[0], resumes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/candidates/rematch
router.post('/rematch', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { candidateIds, jobId } = req.body;
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const job = jobRes.rows[0];
    if (!job || !job.extracted_requirements) return res.status(400).json({ error: 'Job not found or missing requirements' });

    const requirements = typeof job.extracted_requirements === 'string'
      ? JSON.parse(job.extracted_requirements)
      : job.extracted_requirements;

    const results = [];
    for (const candidateId of candidateIds) {
      const latestRes = await query(
        'SELECT * FROM resumes WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1',
        [candidateId]
      );
      const latestResume = latestRes.rows[0];
      if (!latestResume?.raw_text) continue;

      const matchResult = await matchResumeToJob(latestResume.raw_text, job.raw_text || job.description, requirements);

      const newResumeRes = await query(
        `INSERT INTO resumes (candidate_id, job_id, file_name, raw_text, parsed_data, match_score, match_report, matched_at, stage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8) RETURNING *`,
        [candidateId, jobId, `rematch-${latestResume.file_name}`, latestResume.raw_text, latestResume.parsed_data, matchResult.score, JSON.stringify(matchResult), 'SCREENED']
      );

      results.push({ resume: newResumeRes.rows[0], score: matchResult.score });
    }

    res.json({ processed: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/candidates/check-duplicates
router.post('/check-duplicates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const effectiveCompanyId = req.body.companyId || req.user?.companyId;

    const dupEmails = await query(
      `SELECT email FROM candidates
       WHERE company_id = $1 AND email IS NOT NULL
       GROUP BY email HAVING COUNT(*) > 1`,
      [effectiveCompanyId]
    );

    const duplicates = [];
    for (const row of dupEmails.rows) {
      const dupes = await query(
        'SELECT * FROM candidates WHERE email = $1 AND company_id = $2',
        [row.email, effectiveCompanyId]
      );
      duplicates.push({ type: 'email', value: row.email, candidates: dupes.rows });
    }

    res.json({ duplicates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
