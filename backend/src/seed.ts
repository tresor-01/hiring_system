import bcrypt from 'bcryptjs';
import pool, { query } from './db';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Seeding database...');

  // Company
  const companyRes = await query(
    `INSERT INTO companies (name, slug, plan, primary_color)
     VALUES ('Demo Corp', 'demo-corp', 'PRO', '#4f46e5')
     ON CONFLICT (slug) DO UPDATE SET plan = 'PRO'
     RETURNING *`
  );
  const company = companyRes.rows[0];
  console.log('Created company:', company.name);

  // Admin
  const adminHash = await bcrypt.hash('admin123', 12);
  const adminRes = await query(
    `INSERT INTO users (name, email, password, role, company_id)
     VALUES ('Demo Admin', 'admin@demo.com', $1, 'ADMIN', $2)
     ON CONFLICT (email) DO UPDATE SET name = 'Demo Admin'
     RETURNING *`,
    [adminHash, company.id]
  );
  const admin = adminRes.rows[0];

  // Recruiter
  const recruiterHash = await bcrypt.hash('recruiter123', 12);
  const recruiterRes = await query(
    `INSERT INTO users (name, email, password, role, company_id)
     VALUES ('Jane Recruiter', 'recruiter@demo.com', $1, 'RECRUITER', $2)
     ON CONFLICT (email) DO UPDATE SET name = 'Jane Recruiter'
     RETURNING *`,
    [recruiterHash, company.id]
  );
  const recruiter = recruiterRes.rows[0];
  console.log('Created users:', admin.email, recruiter.email);

  // Team members
  await query(
    `INSERT INTO team_members (user_id, company_id, role, accepted_at) VALUES ($1,$2,'ADMIN',NOW())
     ON CONFLICT (user_id, company_id) DO NOTHING`,
    [admin.id, company.id]
  );
  await query(
    `INSERT INTO team_members (user_id, company_id, role, accepted_at) VALUES ($1,$2,'RECRUITER',NOW())
     ON CONFLICT (user_id, company_id) DO NOTHING`,
    [recruiter.id, company.id]
  );

  // Jobs
  const job1Res = await query(
    `INSERT INTO jobs (title, description, raw_text, extracted_requirements, status, company_id, created_by)
     VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6) RETURNING *`,
    [
      'Senior Full Stack Engineer',
      'We are looking for a Senior Full Stack Engineer with React, Node.js, and TypeScript experience.',
      'Senior Full Stack Engineer - 5+ years React Node.js TypeScript PostgreSQL AWS',
      JSON.stringify({
        skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
        experience: '5+ years', education: "Bachelor's degree preferred",
        location: 'Remote', mustHave: ['React', 'Node.js', 'TypeScript'],
        niceToHave: ['GraphQL', 'Docker', 'Kubernetes'], jobTitle: 'Senior Full Stack Engineer',
        summary: 'Senior full-stack role requiring React, Node.js and TypeScript expertise'
      }),
      company.id, admin.id
    ]
  );
  const job1 = job1Res.rows[0];

  const job2Res = await query(
    `INSERT INTO jobs (title, description, raw_text, extracted_requirements, status, company_id, created_by)
     VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6) RETURNING *`,
    [
      'Product Designer',
      'We need a talented Product Designer to create exceptional user experiences.',
      'Product Designer 3+ years Figma UX UI design systems user research',
      JSON.stringify({
        skills: ['Figma', 'UX Design', 'UI Design', 'Design Systems', 'User Research'],
        experience: '3+ years', education: 'Design degree preferred',
        location: 'San Francisco or Remote', mustHave: ['Figma', 'UX Design'],
        niceToHave: ['Motion Design', 'Framer'], jobTitle: 'Product Designer',
        summary: 'Product designer role focused on exceptional user experiences'
      }),
      company.id, recruiter.id
    ]
  );
  const job2 = job2Res.rows[0];
  console.log('Created jobs:', job1.title, job2.title);

  // Candidates + resumes
  const candidatesData = [
    {
      name: 'Alice Johnson', email: 'alice@example.com', phone: '+1-555-0101', location: 'New York, NY',
      resumeText: `Alice Johnson\nalice@example.com | New York, NY\n\nSUMMARY\nExperienced Full Stack Developer with 7 years building scalable web applications.\n\nEXPERIENCE\nSenior Software Engineer @ TechCorp (2020-Present)\n- Built React/Node.js applications serving 100K+ users\n- Led migration to TypeScript, reducing bugs by 40%\n- Architected microservices on AWS\n\nSKILLS: React, TypeScript, Node.js, PostgreSQL, AWS, Docker, GraphQL\n\nEDUCATION: BS Computer Science, MIT`
    },
    {
      name: 'Bob Smith', email: 'bob@example.com', phone: '+1-555-0102', location: 'San Francisco, CA',
      resumeText: `Bob Smith\nbob@example.com | San Francisco, CA\n\nFull Stack Developer with 4 years experience.\n\nEXPERIENCE\nSoftware Developer @ StartupXYZ (2021-Present)\n- Developed features using React and Express\n- Worked with PostgreSQL databases\n\nSKILLS: React, JavaScript, Node.js, MySQL\n\nEDUCATION: BS Information Technology`
    },
    {
      name: 'Carol Williams', email: 'carol@example.com', phone: '+1-555-0103', location: 'Austin, TX',
      resumeText: `Carol Williams\ncarol@example.com | Austin, TX\n\nSENIOR FULL STACK ENGINEER with 8 years experience\n\nEXPERIENCE\nTech Lead @ BigCo (2019-Present)\n- Led team of 5 engineers building React/TypeScript applications\n- Designed REST and GraphQL APIs\n- AWS certified solutions architect\n\nSKILLS: React, TypeScript, Node.js, GraphQL, AWS, Kubernetes, PostgreSQL\n\nEDUCATION: MS Computer Science, UT Austin`
    }
  ];

  for (const data of candidatesData) {
    const candRes = await query(
      `INSERT INTO candidates (name, email, phone, location, company_id) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING RETURNING *`,
      [data.name, data.email, data.phone, data.location, company.id]
    );
    const candidate = candRes.rows[0];
    if (!candidate) continue;

    await query(
      `INSERT INTO resumes (candidate_id, job_id, file_name, raw_text, parsed_data, stage)
       VALUES ($1,$2,$3,$4,$5,'NEW')`,
      [candidate.id, job1.id, `${data.name.replace(' ', '_')}_resume.pdf`, data.resumeText,
        JSON.stringify({ name: data.name, email: data.email })]
    );
  }
  console.log(`Created ${candidatesData.length} sample candidates`);

  // Tags
  const tagNames = ['Senior', 'React', 'TypeScript', 'Remote', 'Strong Candidate'];
  for (const name of tagNames) {
    await query(
      `INSERT INTO tags (name, company_id) VALUES ($1,$2) ON CONFLICT (name, company_id) DO NOTHING`,
      [name, company.id]
    );
  }

  // Billing
  const month = new Date().toISOString().substring(0, 7);
  await query(
    `INSERT INTO billing_usage (company_id, month, jobs_created, resumes_screened)
     VALUES ($1,$2,2,3) ON CONFLICT (company_id, month) DO NOTHING`,
    [company.id, month]
  );

  // Activity log
  await query(
    `INSERT INTO activity_logs (user_id, company_id, action, entity_type, entity_id, metadata)
     VALUES ($1,$2,'SYSTEM_SEEDED','System',$3,$4)`,
    [admin.id, company.id, company.id, JSON.stringify({ message: 'Database seeded with demo data' })]
  );

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials:');
  console.log('  Admin:     admin@demo.com / admin123');
  console.log('  Recruiter: recruiter@demo.com / recruiter123');
  console.log('Company API Key:', company.api_key);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
