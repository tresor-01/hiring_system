import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// GET /api/team
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'No company' });

    const result = await query(
      `SELECT tm.*, u.id as uid, u.name as uname, u.email as uemail
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.company_id = $1 ORDER BY tm.invited_at DESC`,
      [companyId]
    );

    res.json(result.rows.map(r => ({ ...r, user: { id: r.uid, name: r.uname, email: r.uemail } })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/team/invite
router.post('/invite', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role = 'RECRUITER', password } = req.body;
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'No company' });

    // Find or create user
    let userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userRes.rows[0];

    if (!user) {
      const hashedPassword = await bcrypt.hash(password || 'changeme123', 12);
      const newUserRes = await query(
        'INSERT INTO users (name, email, password, role, company_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [name || email.split('@')[0], email, hashedPassword, role, companyId]
      );
      user = newUserRes.rows[0];
    }

    // Check already member
    const existRes = await query(
      'SELECT id FROM team_members WHERE user_id = $1 AND company_id = $2',
      [user.id, companyId]
    );
    if (existRes.rows.length > 0) return res.status(409).json({ error: 'User already a member' });

    const memberRes = await query(
      'INSERT INTO team_members (user_id, company_id, role, accepted_at) VALUES ($1,$2,$3,NOW()) RETURNING *',
      [user.id, companyId, role]
    );

    await query(
      'INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user!.id, companyId, 'INVITED_MEMBER', 'User', user.id, JSON.stringify({ email, role })]
    );

    res.status(201).json({ ...memberRes.rows[0], user: { id: user.id, name: user.name, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/team/:memberId/role
router.patch('/:memberId/role', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ['ADMIN', 'RECRUITER', 'VIEWER'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const memberRes = await query(
      'UPDATE team_members SET role = $1 WHERE id = $2 RETURNING *',
      [role, req.params.memberId]
    );
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Update user role
    await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, member.user_id]);

    const userRes = await query('SELECT id, name, email FROM users WHERE id = $1', [member.user_id]);
    res.json({ ...member, user: userRes.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/team/:memberId
router.delete('/:memberId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM team_members WHERE id = $1', [req.params.memberId]);
    res.json({ message: 'Member removed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
