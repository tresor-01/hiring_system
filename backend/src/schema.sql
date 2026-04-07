-- Hiring System PostgreSQL Schema
-- Run via: psql -U postgres -d hiring_system -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Companies (client workspaces)
CREATE TABLE IF NOT EXISTS companies (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  api_key       UUID        UNIQUE DEFAULT gen_random_uuid(),
  plan          VARCHAR(50) NOT NULL DEFAULT 'FREE',
  logo_url      TEXT,
  primary_color VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'RECRUITER',
  company_id    UUID        REFERENCES companies(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  VARCHAR(255) NOT NULL,
  description            TEXT        NOT NULL DEFAULT '',
  raw_text               TEXT,
  extracted_requirements JSONB,
  status                 VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  company_id             UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by             UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at              TIMESTAMPTZ,
  portal_token           UUID        UNIQUE DEFAULT gen_random_uuid()
);

-- Candidates (talent pool)
CREATE TABLE IF NOT EXISTS candidates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(100),
  location      VARCHAR(255),
  linkedin_url  TEXT,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resumes (one per candidate per job)
CREATE TABLE IF NOT EXISTS resumes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id        UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name     VARCHAR(255) NOT NULL,
  raw_text      TEXT,
  parsed_data   JSONB,
  match_score   FLOAT,
  match_report  JSONB,
  matched_at    TIMESTAMPTZ,
  stage         VARCHAR(50) NOT NULL DEFAULT 'NEW',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes on resumes
CREATE TABLE IF NOT EXISTS notes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id     UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL,
  star_rating   INTEGER     CHECK (star_rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags (per company)
CREATE TABLE IF NOT EXISTS tags (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE (name, company_id)
);

-- Resume ↔ Tag join
CREATE TABLE IF NOT EXISTS resume_tags (
  resume_id     UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resume_id, tag_id)
);

-- Activity log (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(100) NOT NULL,
  entity_id     TEXT        NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team members (user ↔ company with role)
CREATE TABLE IF NOT EXISTS team_members (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role          VARCHAR(50) NOT NULL DEFAULT 'RECRUITER',
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  UNIQUE (user_id, company_id)
);

-- Client portal feedback
CREATE TABLE IF NOT EXISTS portal_feedback (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feedback      VARCHAR(50) NOT NULL,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email templates per company/stage
CREATE TABLE IF NOT EXISTS email_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage         VARCHAR(50) NOT NULL,
  subject       VARCHAR(255) NOT NULL,
  body          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing usage tracking
CREATE TABLE IF NOT EXISTS billing_usage (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month             VARCHAR(7)  NOT NULL,
  jobs_created      INTEGER     NOT NULL DEFAULT 0,
  resumes_screened  INTEGER     NOT NULL DEFAULT 0,
  emails_sent       INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_company     ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_resumes_job      ON resumes(job_id);
CREATE INDEX IF NOT EXISTS idx_resumes_candidate ON resumes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_resumes_stage    ON resumes(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_company ON candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_activity_company ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity  ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_team_company     ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_company  ON billing_usage(company_id);
