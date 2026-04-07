# HireAI — AI-Powered Recruitment Platform

A full-stack SaaS platform for staffing agencies and recruiters to automate resume screening, candidate management, and hiring pipeline workflows using AI.

## Overview

HireAI replaces manual resume review and ad-hoc ChatGPT workflows with a persistent, collaborative workspace where teams can:

- Upload job descriptions and extract structured requirements automatically
- Bulk upload up to 200 resumes and parse them instantly
- Score and rank candidates against a role using Claude AI
- Manage candidates through a visual Kanban pipeline
- Share shortlists with clients via a read-only portal
- Track team activity, usage, and billing across multiple client accounts

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| AI | Anthropic Claude (via `@anthropic-ai/sdk`) |
| Auth | JWT + bcryptjs |
| File Parsing | pdf-parse, mammoth (DOCX) |
| Email | Nodemailer (SMTP) |

## Features

### Resume Screening

- Upload JDs as PDF, DOCX, or plain text — AI extracts skills, experience, location, must-haves, and nice-to-haves
- Bulk upload resumes (PDF, DOCX, DOC, TXT) with automatic candidate info extraction
- AI match scoring (0–100) with explanation, strengths, gaps, and hire/no-hire recommendation
- Export shortlists as PDF or CSV

### Pipeline Management

- Drag-and-drop Kanban board across stages: New → Screened → Shortlisted → Interviewed → Offered → Hired/Rejected
- Per-candidate notes, star ratings (1–5), and custom tags
- Full activity audit trail

### Team Collaboration

- Multi-tenant workspaces — each client company is isolated
- Role-based access control: Admin, Recruiter, Viewer
- Team member invitations

### AI Intelligence

- Smart shortlist generator: pick top N candidates with AI justification
- Side-by-side candidate comparison (2–5 candidates)
- Interview question generator tailored to resume gaps
- JD bias and quality checker (gender-coded language, credential inflation, vague requirements)

### Client Portal & Automation

- Shareable read-only portal link for clients to approve/reject/comment on candidates
- AI-drafted stage-based emails (application acknowledgment, rejection, interview invite, offer)
- Analytics dashboard: pipeline breakdown, hire rate, match score trends
- Usage-based billing (FREE / STARTER / PRO tiers)
- White-label REST API (`/v1/score`) for embedding resume scoring in external tools

## Project Structure

```text
hiring_system/
├── backend/                # Node.js/Express API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Claude AI, file parser
│   │   ├── middleware/     # Auth, RBAC, rate limiting
│   │   ├── schema.sql      # PostgreSQL schema
│   │   └── index.ts        # Entry point
│   └── .env.example
├── frontend/               # React SPA
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable UI components
│   │   ├── api/            # Axios API clients
│   │   ├── store/          # Zustand auth store
│   │   └── types/          # Shared TypeScript types
│   └── vite.config.ts
└── start.sh                # Dev startup script
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd hiring_system

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/hireai"
JWT_SECRET="change-this-to-a-secure-random-string"
ANTHROPIC_API_KEY="sk-ant-..."
PORT=3001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

### 3. Initialize the database

```bash
cd backend
npm run db:init    # Creates schema
npm run db:seed    # Optional: loads demo data
```

### 4. Start development servers

```bash
# From project root — starts both backend and frontend
bash start.sh
```

Or start them separately:

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Demo credentials** (after seeding):

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@demo.com | admin123 |
| Recruiter | recruiter@demo.com | recruiter123 |

## API Reference

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register user + company |
| POST | `/api/auth/login` | Login, returns JWT |

### Jobs

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| POST | `/api/jobs/:id/upload-jd` | Upload JD file |
| POST | `/api/jobs/:id/check-quality` | AI quality/bias check |
| GET | `/api/jobs/:id/pipeline` | Kanban pipeline view |

### Resumes

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/resumes/job/:jobId/upload` | Bulk upload resumes |
| POST | `/api/resumes/job/:jobId/match-all` | Batch AI scoring |
| PATCH | `/api/resumes/:id` | Update stage / notes |
| GET | `/api/resumes/:id/export` | Export PDF or CSV |

### AI Tools

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/ai/shortlist` | Generate top N shortlist |
| POST | `/api/ai/compare` | Compare 2–5 candidates |
| POST | `/api/ai/interview-questions` | Generate interview Qs |
| POST | `/api/ai/bias-check` | Analyze JD for bias |

### White-Label API (API key auth)

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/v1/score` | Score a resume against a JD |
| GET | `/v1/jobs` | List jobs (Zapier-compatible) |

All other endpoints require a `Bearer <JWT>` `Authorization` header. Rate limits: 100 req/15 min (general), 20 req/min (AI endpoints), 10 req/15 min (auth).

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `PORT` | No | Backend port (default: 3001) |
| `SMTP_HOST` | No | SMTP server for email |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | Sender email address |
| `SMTP_PASS` | No | SMTP password / app password |
| `FRONTEND_URL` | No | CORS allowed origin (default: http://localhost:5173) |

## Scripts

```bash
# Backend
npm run dev        # Start with hot reload
npm run build      # Compile TypeScript
npm start          # Run compiled build
npm run db:init    # Create database schema
npm run db:seed    # Seed demo data

# Frontend
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint
```

## License

MIT
