import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/auth/register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let company = null;
    if (companyName) {
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const slugExists = await query('SELECT id FROM companies WHERE slug = $1', [slug]);
      const finalSlug = slugExists.rows.length > 0 ? `${slug}-${Date.now()}` : slug;

      const companyRes = await query(
        'INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING *',
        [companyName, finalSlug]
      );
      company = companyRes.rows[0];
    }

    const userRes = await query(
      'INSERT INTO users (name, email, password, role, company_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, company_id',
      [name, email, hashedPassword, company ? 'ADMIN' : 'RECRUITER', company?.id || null]
    );
    const user = userRes.rows[0];

    if (company) {
      await query(
        'INSERT INTO team_members (user_id, company_id, role, accepted_at) VALUES ($1, $2, $3, NOW())',
        [user.id, company.id, 'ADMIN']
      );
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.company_id },
      company
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      `SELECT u.*, c.id as cid, c.name as cname, c.slug, c.plan, c.logo_url, c.primary_color, c.api_key
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [email]
    );
    const row = result.rows[0];

    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: row.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    const company = row.cid
      ? { id: row.cid, name: row.cname, slug: row.slug, plan: row.plan, logoUrl: row.logo_url, primaryColor: row.primary_color, apiKey: row.api_key }
      : null;

    res.json({
      token,
      user: { id: row.id, name: row.name, email: row.email, role: row.role, companyId: row.company_id },
      company
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.company_id,
              c.id as cid, c.name as cname, c.slug, c.plan, c.logo_url, c.primary_color, c.api_key
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [req.user!.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'User not found' });

    const company = row.cid
      ? { id: row.cid, name: row.cname, slug: row.slug, plan: row.plan, logoUrl: row.logo_url, primaryColor: row.primary_color, apiKey: row.api_key }
      : null;

    res.json({
      user: { id: row.id, name: row.name, email: row.email, role: row.role, companyId: row.company_id },
      company
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (_req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
