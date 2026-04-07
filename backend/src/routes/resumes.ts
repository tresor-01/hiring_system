import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRecruiter } from '../middleware/rbac';
import { parseFile, extractCandidateInfo } from '../services/fileParser';
import { matchResumeToJob } from '../services/claude';

const router = Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `resume-${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`);
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

async function trackBilling(companyId: string) {
  const month = new Date().toISOString().substring(0, 7);
  await query(
    `INSERT INTO billing_usage (company_id, month, resumes_screened)
     VALUES ($1, $2, 1)
     ON CONFLICT (company_id, month)
     DO UPDATE SET resumes_screened = billing_usage.resumes_screened + 1, updated_at = NOW()`,
    [companyId, month]
  );
}

// GET /api/resumes/job/:jobId
router.get('/job/:jobId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [req.params.jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== job.company_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT r.*,
         c.id as cand_id, c.name as cand_name, c.email as cand_email,
         c.phone as cand_phone, c.location as cand_location
       FROM resumes r
       JOIN candidates c ON c.id = r.candidate_id
       WHERE r.job_id = $1
       ORDER BY r.match_score DESC NULLS LAST`,
      [req.params.jobId]
    );

    const resumes = await Promise.all(result.rows.map(async (row) => {
      const notesRes = await query(
        `SELECT n.*, u.name as user_name FROM notes n
         JOIN users u ON u.id = n.user_id
         WHERE n.resume_id = $1 ORDER BY n.created_at DESC`,
        [row.id]
      );
      const tagsRes = await query(
        `SELECT t.* FROM tags t JOIN resume_tags rt ON rt.tag_id = t.id WHERE rt.resume_id = $1`,
        [row.id]
      );
      return {
        ...row,
        candidate: { id: row.cand_id, name: row.cand_name, email: row.cand_email, phone: row.cand_phone, location: row.cand_location },
        notes: notesRes.rows,
        tags: tagsRes.rows
      };
    }));

    res.json(resumes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resumes/job/:jobId/upload — bulk upload
router.post('/job/:jobId/upload', authenticate, requireRecruiter, upload.array('resumes', 200), async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [req.params.jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    const duplicates = [];

    for (const file of req.files) {
      try {
        const rawText = await parseFile(file.path, file.mimetype);
        const info = extractCandidateInfo(rawText);

        // Check for duplicate candidate in this company (by email)
        let candidate = null;
        if (info.email) {
          const dupRes = await query(
            'SELECT id FROM candidates WHERE email = $1 AND company_id = $2 LIMIT 1',
            [info.email, job.company_id]
          );
          if (dupRes.rows.length > 0) candidate = dupRes.rows[0];
        }

        if (candidate) {
          // Check if already applied to this job
          const existRes = await query(
            'SELECT id FROM resumes WHERE candidate_id = $1 AND job_id = $2 LIMIT 1',
            [candidate.id, job.id]
          );
          if (existRes.rows.length > 0) {
            duplicates.push({ file: file.originalname, reason: 'Already applied to this job' });
            continue;
          }
        } else {
          const candRes = await query(
            'INSERT INTO candidates (name, email, phone, location, linkedin_url, company_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
            [info.name || file.originalname.replace(/\.[^.]+$/, ''), info.email || null, info.phone || null, info.location || null, info.linkedinUrl || null, job.company_id]
          );
          candidate = candRes.rows[0];
        }

        const resumeRes = await query(
          'INSERT INTO resumes (candidate_id, job_id, file_name, raw_text, parsed_data, stage) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
          [candidate.id, job.id, file.originalname, rawText, JSON.stringify(info), 'NEW']
        );

        results.push({ resume: resumeRes.rows[0], candidate });
        await trackBilling(job.company_id);
      } catch (fileError: any) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
      }
    }

    await query(
      'INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user!.id, job.company_id, 'UPLOADED_RESUMES', 'Job', job.id, JSON.stringify({ count: results.length })]
    );

    res.status(201).json({
      processed: results.length,
      duplicates: duplicates.length,
      duplicateDetails: duplicates,
      resumes: results.map(r => r.resume)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/resumes/job/:jobId/match-all
router.post('/job/:jobId/match-all', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [req.params.jobId]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.extracted_requirements) return res.status(400).json({ error: 'Job description must be uploaded first' });

    const requirements = typeof job.extracted_requirements === 'string'
      ? JSON.parse(job.extracted_requirements)
      : job.extracted_requirements;

    const unmatchedRes = await query(
      'SELECT * FROM resumes WHERE job_id = $1 AND match_score IS NULL',
      [req.params.jobId]
    );
    const resumes = unmatchedRes.rows;

    if (resumes.length === 0) return res.json({ message: 'No unmatched resumes found', processed: 0 });

    const results = [];
    for (const resume of resumes) {
      try {
        if (!resume.raw_text) continue;
        const matchResult = await matchResumeToJob(resume.raw_text, job.raw_text || job.description, requirements);

        await query(
          `UPDATE resumes SET
             match_score = $1, match_report = $2, matched_at = NOW(),
             stage = CASE WHEN stage = 'NEW' THEN 'SCREENED' ELSE stage END,
             updated_at = NOW()
           WHERE id = $3`,
          [matchResult.score, JSON.stringify(matchResult), resume.id]
        );

        results.push({ resumeId: resume.id, score: matchResult.score });
      } catch (err: any) {
        console.error(`Error matching resume ${resume.id}:`, err);
      }
    }

    await query(
      'INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user!.id, job.company_id, 'MATCHED_RESUMES', 'Job', job.id, JSON.stringify({ count: results.length })]
    );

    res.json({ processed: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resumes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT r.*,
         c.id as cand_id, c.name as cand_name, c.email as cand_email,
         c.phone as cand_phone, c.location as cand_location,
         j.id as job_id_val, j.title as job_title, j.company_id
       FROM resumes r
       JOIN candidates c ON c.id = r.candidate_id
       JOIN jobs j ON j.id = r.job_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Resume not found' });

    const notesRes = await query(
      `SELECT n.*, u.id as uid, u.name as user_name FROM notes n
       JOIN users u ON u.id = n.user_id
       WHERE n.resume_id = $1 ORDER BY n.created_at DESC`,
      [req.params.id]
    );
    const tagsRes = await query(
      `SELECT t.* FROM tags t JOIN resume_tags rt ON rt.tag_id = t.id WHERE rt.resume_id = $1`,
      [req.params.id]
    );

    res.json({
      ...row,
      candidate: { id: row.cand_id, name: row.cand_name, email: row.cand_email, phone: row.cand_phone, location: row.cand_location },
      job: { id: row.job_id_val, title: row.job_title, companyId: row.company_id },
      notes: notesRes.rows.map(n => ({ ...n, user: { id: n.uid, name: n.user_name } })),
      tags: tagsRes.rows
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
