import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRecruiter } from '../middleware/rbac';

const router = Router();

// PATCH /api/applications/:resumeId/stage
router.patch('/:resumeId/stage', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { stage } = req.body;
    const validStages = ['NEW', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED'];
    if (!validStages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

    const result = await query(
      `UPDATE resumes SET stage = $1, updated_at = NOW() WHERE id = $2
       RETURNING *, (SELECT company_id FROM jobs WHERE id = resumes.job_id) AS company_id_val`,
      [stage, req.params.resumeId]
    );
    const resume = result.rows[0];
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    // Get candidate name for activity log
    const candRes = await query('SELECT name FROM candidates WHERE id = $1', [resume.candidate_id]);

    await query(
      'INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user!.id, resume.company_id_val, 'CHANGED_STAGE', 'Resume', resume.id,
        JSON.stringify({ stage, candidateName: candRes.rows[0]?.name })]
    );

    res.json(resume);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/applications/:resumeId/notes
router.post('/:resumeId/notes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content, starRating } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content is required' });

    const result = await query(
      'INSERT INTO notes (resume_id, user_id, content, star_rating) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.resumeId, req.user!.id, content, starRating ? parseInt(starRating) : null]
    );
    const note = result.rows[0];
    const userRes = await query('SELECT id, name FROM users WHERE id = $1', [req.user!.id]);

    res.status(201).json({ ...note, user: userRes.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/applications/:resumeId/notes/:noteId
router.delete('/:resumeId/notes/:noteId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const noteRes = await query('SELECT * FROM notes WHERE id = $1', [req.params.noteId]);
    const note = noteRes.rows[0];
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.user_id !== req.user!.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Cannot delete others\' notes' });
    }
    await query('DELETE FROM notes WHERE id = $1', [req.params.noteId]);
    res.json({ message: 'Note deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/applications/:resumeId/tags
router.post('/:resumeId/tags', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { tagNames, companyId } = req.body;
    const effectiveCompanyId = companyId || req.user?.companyId;
    if (!Array.isArray(tagNames) || !effectiveCompanyId) {
      return res.status(400).json({ error: 'tagNames array and companyId required' });
    }

    // Remove existing tags
    await query('DELETE FROM resume_tags WHERE resume_id = $1', [req.params.resumeId]);

    const tagResults = [];
    for (const tagName of tagNames) {
      const name = tagName.trim();
      // Upsert tag
      const tagRes = await query(
        `INSERT INTO tags (name, company_id) VALUES ($1, $2)
         ON CONFLICT (name, company_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [name, effectiveCompanyId]
      );
      const tag = tagRes.rows[0];

      await query(
        'INSERT INTO resume_tags (resume_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.resumeId, tag.id]
      );
      tagResults.push(tag);
    }

    res.json(tagResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/applications/:resumeId/activity
router.get('/:resumeId/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT al.*, u.name as user_name FROM activity_logs al
       JOIN users u ON u.id = al.user_id
       WHERE al.entity_id = $1 ORDER BY al.created_at DESC`,
      [req.params.resumeId]
    );
    res.json(result.rows.map(r => ({ ...r, user: { name: r.user_name } })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
