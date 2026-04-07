import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/jobs/:id/export/csv
router.get('/jobs/:id/export/csv', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let sql = `SELECT r.*, c.name as cand_name, c.email as cand_email, c.phone as cand_phone, c.location as cand_location
               FROM resumes r JOIN candidates c ON c.id = r.candidate_id
               WHERE r.job_id = $1`;
    const params: any[] = [req.params.id];

    if (req.query.stage) {
      params.push(req.query.stage);
      sql += ` AND r.stage = $${params.length}`;
    }
    sql += ' ORDER BY r.match_score DESC NULLS LAST';

    const resumesRes = await query(sql, params);

    const rows = [
      ['Rank', 'Name', 'Email', 'Phone', 'Location', 'Match Score', 'Stage', 'Recommendation', 'Key Strengths', 'Key Gaps']
    ];

    resumesRes.rows.forEach((r, i) => {
      const report = r.match_report || {};
      rows.push([
        String(i + 1),
        r.cand_name,
        r.cand_email || '',
        r.cand_phone || '',
        r.cand_location || '',
        r.match_score ? `${Math.round(r.match_score)}%` : 'Not scored',
        r.stage,
        report.recommendation || '',
        (report.strengths || []).slice(0, 3).join('; '),
        (report.gaps || []).slice(0, 3).join('; ')
      ]);
    });

    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="shortlist-${job.title.replace(/[^a-z0-9]/gi, '-')}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/jobs/:id/export/pdf
router.get('/jobs/:id/export/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobRes = await query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    const job = jobRes.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let sql = `SELECT r.*, c.name as cand_name, c.email as cand_email, c.phone as cand_phone, c.location as cand_location
               FROM resumes r JOIN candidates c ON c.id = r.candidate_id
               WHERE r.job_id = $1`;
    const params: any[] = [req.params.id];

    if (req.query.stage) {
      params.push(req.query.stage);
      sql += ` AND r.stage = $${params.length}`;
    }
    sql += ' ORDER BY r.match_score DESC NULLS LAST';

    const resumesRes = await query(sql, params);
    const resumes = resumesRes.rows;

    const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
  h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
  h2 { color: #4f46e5; margin-top: 20px; }
  .candidate { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; page-break-inside: avoid; }
  .score { font-size: 24px; font-weight: bold; }
  .section { margin: 8px 0; }
  .label { font-weight: bold; color: #555; }
</style>
</head>
<body>
<h1>Candidate Shortlist Report</h1>
<p><strong>Job:</strong> ${job.title}</p>
<p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Total Candidates:</strong> ${resumes.length}</p>
${resumes.map((r, i) => {
  const report = r.match_report || {};
  const score = r.match_score ? Math.round(r.match_score) : null;
  const color = score ? (score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444') : '#6b7280';
  return `<div class="candidate">
  <h2>#${i + 1} ${r.cand_name}</h2>
  <div class="score" style="color:${color}">${score !== null ? score + '%' : 'N/A'}</div>
  <div class="section"><span class="label">Stage:</span> ${r.stage}</div>
  <div class="section"><span class="label">Email:</span> ${r.cand_email || 'N/A'}</div>
  <div class="section"><span class="label">Phone:</span> ${r.cand_phone || 'N/A'}</div>
  <div class="section"><span class="label">Location:</span> ${r.cand_location || 'N/A'}</div>
  ${report.explanation ? `<div class="section"><span class="label">Assessment:</span> ${report.explanation}</div>` : ''}
  ${report.strengths?.length ? `<div class="section"><span class="label">Strengths:</span><ul>${report.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul></div>` : ''}
  ${report.gaps?.length ? `<div class="section"><span class="label">Gaps:</span><ul>${report.gaps.map((g: string) => `<li>${g}</li>`).join('')}</ul></div>` : ''}
  ${report.recommendation ? `<div class="section"><span class="label">Recommendation:</span> ${report.recommendation}</div>` : ''}
</div>`;
}).join('')}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="shortlist-${job.title.replace(/[^a-z0-9]/gi, '-')}.html"`);
    res.send(html);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
