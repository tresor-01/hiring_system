import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRecruiter } from '../middleware/rbac';
import { parseFile } from '../services/fileParser';
import { extractJobRequirements, checkJDQuality } from '../services/claude';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `jd-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, DOC, and TXT files are allowed'));
  }
});

// Helper: upsert billing usage
async function trackBilling(companyId: string, field: 'jobs_created' | 'resumes_screened' | 'emails_sent') {
  const month = new Date().toISOString().substring(0, 7);
  await query(
    `INSERT INTO billing_usage (company_id, month, ${field})
     VALUES ($1, $2, 1)
     ON CONFLICT (company_id, month)
     DO UPDATE SET ${field} = billing_usage.${field} + 1, updated_at = NOW()`,
    [companyId, month]
  );
}

// Helper: log activity
async function logActivity(userId: string, companyId: string, action: string, entityType: string, entityId: string, metadata?: object) {
  await query(
    'INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, companyId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
  );
}

// GET /api/jobs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, status } = req.query;
    const effectiveCompanyId = (companyId as string) || req.user?.companyId;

    if (!effectiveCompanyId) return res.status(400).json({ error: 'Company ID required' });
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== effectiveCompanyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let sql = `SELECT j.*,
                 (SELECT COUNT(*) FROM resumes WHERE job_id = j.id) AS resume_count
               FROM jobs j
               WHERE j.company_id = $1`;
    const params: any[] = [effectiveCompanyId];

    if (status) {
      sql += ` AND j.status = $${params.length + 1}`;
      params.push(status);
    }
    sql += ' ORDER BY j.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT j.*,
         (SELECT COUNT(*) FROM resumes WHERE job_id = j.id) AS resume_count
       FROM jobs j WHERE j.id = $1`,
      [req.params.id]
    );
    const job = result.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== job.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/jobs
router.post('/', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, companyId } = req.body;
    const effectiveCompanyId = companyId || req.user?.companyId;
    if (!title || !effectiveCompanyId) return res.status(400).json({ error: 'Title and companyId required' });

    const result = await query(
      'INSERT INTO jobs (title, description, raw_text, company_id, created_by, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title, description || '', description || '', effectiveCompanyId, req.user!.id, 'DRAFT']
    );
    const job = result.rows[0];

    await trackBilling(effectiveCompanyId, 'jobs_created');
    await logActivity(req.user!.id, effectiveCompanyId, 'CREATED_JOB', 'Job', job.id, { title });

    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/jobs/:id
router.patch('/:id', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Job not found' });
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== existing.rows[0].company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, status } = req.body;
    const result = await query(
      `UPDATE jobs SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         closed_at = CASE WHEN $3 = 'CLOSED' THEN NOW() ELSE closed_at END,
         updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [title, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT company_id FROM jobs WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Job not found' });
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== existing.rows[0].company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/jobs/:id/upload-jd
router.post('/:id/upload-jd', authenticate, requireRecruiter, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Job not found' });

    let rawText = req.body.text || '';
    if (req.file) {
      rawText = await parseFile(req.file.path, req.file.mimetype);
    }
    if (!rawText) return res.status(400).json({ error: 'No text provided' });

    const requirements = await extractJobRequirements(rawText);

    const result = await query(
      `UPDATE jobs SET
         raw_text = $1, description = $1,
         extracted_requirements = $2,
         status = 'ACTIVE', updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [rawText, JSON.stringify(requirements), req.params.id]
    );

    res.json({ job: result.rows[0], requirements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/jobs/:id/check-quality
router.post('/:id/check-quality', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT raw_text FROM jobs WHERE id = $1', [req.params.id]);
    const job = result.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.raw_text) return res.status(400).json({ error: 'No job description text available' });

    const quality = await checkJDQuality(job.raw_text);
    res.json(quality);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/jobs/:id/pipeline
router.get('/:id/pipeline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!jobRes.rows[0]) return res.status(404).json({ error: 'Job not found' });

    const stages = ['NEW', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];
    const pipeline: Record<string, any[]> = {};

    for (const stage of stages) {
      const rows = await query(
        `SELECT r.*,
           c.id as cand_id, c.name as cand_name, c.email as cand_email,
           c.phone as cand_phone, c.location as cand_location
         FROM resumes r
         JOIN candidates c ON c.id = r.candidate_id
         WHERE r.job_id = $1 AND r.stage = $2
         ORDER BY r.match_score DESC NULLS LAST`,
        [req.params.id, stage]
      );

      // Attach notes and tags for each resume
      const resumes = [];
      for (const row of rows.rows) {
        const notesRes = await query(
          `SELECT n.*, u.name as user_name FROM notes n
           JOIN users u ON u.id = n.user_id
           WHERE n.resume_id = $1 ORDER BY n.created_at DESC LIMIT 3`,
          [row.id]
        );
        const tagsRes = await query(
          `SELECT t.* FROM tags t
           JOIN resume_tags rt ON rt.tag_id = t.id
           WHERE rt.resume_id = $1`,
          [row.id]
        );

        resumes.push({
          ...row,
          candidate: { id: row.cand_id, name: row.cand_name, email: row.cand_email, phone: row.cand_phone, location: row.cand_location },
          notes: notesRes.rows,
          tags: tagsRes.rows
        });
      }

      pipeline[stage] = resumes;
    }

    res.json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
