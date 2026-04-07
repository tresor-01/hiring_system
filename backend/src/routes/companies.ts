import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// GET /api/companies
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let sql: string;
    let params: any[];

    if (req.user?.role === 'ADMIN') {
      sql = `SELECT c.*,
               (SELECT COUNT(*) FROM jobs WHERE company_id = c.id) AS job_count,
               (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS user_count
             FROM companies c
             ORDER BY c.created_at DESC`;
      params = [];
    } else {
      sql = `SELECT c.*,
               (SELECT COUNT(*) FROM jobs WHERE company_id = c.id) AS job_count,
               (SELECT COUNT(*) FROM users WHERE company_id = c.id) AS user_count
             FROM companies c
             WHERE c.id = $1
             ORDER BY c.created_at DESC`;
      params = [req.user?.companyId];
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/companies/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `SELECT c.*,
         (SELECT COUNT(*) FROM jobs WHERE company_id = c.id) AS job_count,
         (SELECT COUNT(*) FROM candidates WHERE company_id = c.id) AS candidate_count
       FROM companies c WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Company not found' });

    const usersRes = await query(
      'SELECT id, name, email, role FROM users WHERE company_id = $1',
      [req.params.id]
    );

    res.json({ ...result.rows[0], users: usersRes.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/companies
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, plan } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const slugExists = await query('SELECT id FROM companies WHERE slug = $1', [slug]);
    const finalSlug = slugExists.rows.length > 0 ? `${slug}-${Date.now()}` : slug;

    const result = await query(
      'INSERT INTO companies (name, slug, plan, api_key) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, finalSlug, plan || 'FREE', uuidv4()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/companies/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, plan, logoUrl, primaryColor } = req.body;
    const result = await query(
      `UPDATE companies SET
         name = COALESCE($1, name),
         plan = COALESCE($2, plan),
         logo_url = COALESCE($3, logo_url),
         primary_color = COALESCE($4, primary_color),
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, plan, logoUrl, primaryColor, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/companies/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ message: 'Company deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/companies/:id/regenerate-api-key
router.post('/:id/regenerate-api-key', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.companyId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await query(
      'UPDATE companies SET api_key = $1, updated_at = NOW() WHERE id = $2 RETURNING api_key',
      [uuidv4(), req.params.id]
    );
    res.json({ apiKey: result.rows[0].api_key });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
