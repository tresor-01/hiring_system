import { Router, Response } from 'express';
import nodemailer from 'nodemailer';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRecruiter } from '../middleware/rbac';
import { draftEmail } from '../services/claude';

const router = Router();

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// POST /api/email/draft
router.post('/draft', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { resumeId, stage, extraContext } = req.body;

    const result = await query(
      `SELECT r.stage, c.name as cand_name, j.title as job_title, co.name as company_name
       FROM resumes r
       JOIN candidates c ON c.id = r.candidate_id
       JOIN jobs j ON j.id = r.job_id
       JOIN companies co ON co.id = j.company_id
       WHERE r.id = $1`,
      [resumeId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Resume not found' });

    const draft = await draftEmail(stage || row.stage, row.cand_name, row.job_title, row.company_name, extraContext);
    res.json(draft);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/send
router.post('/send', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, body, resumeId } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject, and body are required' });

    if (!process.env.SMTP_USER) {
      return res.status(500).json({ error: 'Email not configured. Set SMTP_USER and SMTP_PASS in .env' });
    }

    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to, subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    });

    if (resumeId) {
      const r = await query(
        'SELECT j.company_id FROM resumes r JOIN jobs j ON j.id = r.job_id WHERE r.id = $1',
        [resumeId]
      );
      if (r.rows[0]) {
        const month = new Date().toISOString().substring(0, 7);
        await query(
          `INSERT INTO billing_usage (company_id, month, emails_sent) VALUES ($1,$2,1)
           ON CONFLICT (company_id, month) DO UPDATE SET emails_sent = billing_usage.emails_sent + 1, updated_at = NOW()`,
          [r.rows[0].company_id, month]
        );
      }
    }

    res.json({ message: 'Email sent successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/email/templates
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM email_templates WHERE company_id = $1 ORDER BY stage',
      [req.user?.companyId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/templates
router.post('/templates', authenticate, requireRecruiter, async (req: AuthRequest, res: Response) => {
  try {
    const { stage, subject, body } = req.body;
    const result = await query(
      'INSERT INTO email_templates (company_id, stage, subject, body) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user!.companyId, stage, subject, body]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
