export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'RECRUITER' | 'VIEWER';
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  plan: 'FREE' | 'STARTER' | 'PRO';
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
  _count?: { jobs: number; users: number; candidates?: number };
}

export interface Job {
  id: string;
  title: string;
  description: string;
  rawText?: string;
  extractedRequirements?: string;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT';
  companyId: string;
  createdBy: string;
  createdAt: string;
  closedAt?: string;
  portalToken?: string;
  _count?: { resumes: number };
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  companyId: string;
  createdAt: string;
  resumes?: Resume[];
}

export interface Resume {
  id: string;
  candidateId: string;
  jobId: string;
  fileName: string;
  rawText?: string;
  parsedData?: string;
  matchScore?: number;
  matchReport?: string;
  matchedAt?: string;
  stage: Stage;
  createdAt: string;
  candidate?: Candidate;
  job?: Job;
  notes?: Note[];
  resumeTags?: ResumeTag[];
}

export type Stage = 'NEW' | 'SCREENED' | 'SHORTLISTED' | 'INTERVIEWED' | 'OFFERED' | 'HIRED' | 'REJECTED';

export interface Note {
  id: string;
  resumeId: string;
  userId: string;
  content: string;
  starRating?: number;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface Tag {
  id: string;
  name: string;
  companyId: string;
}

export interface ResumeTag {
  resumeId: string;
  tagId: string;
  tag: Tag;
}

export interface ActivityLog {
  id: string;
  userId: string;
  companyId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string;
  createdAt: string;
  user?: { name: string };
}

export interface TeamMember {
  id: string;
  userId: string;
  companyId: string;
  role: 'ADMIN' | 'RECRUITER' | 'VIEWER';
  invitedAt: string;
  acceptedAt?: string;
  user?: { id: string; name: string; email: string };
}

export interface MatchReport {
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

export interface JobRequirements {
  skills: string[];
  experience: string;
  education: string;
  location: string;
  mustHave: string[];
  niceToHave: string[];
  jobTitle: string;
  summary: string;
}

export interface AnalyticsDashboard {
  overview: {
    totalJobs: number;
    activeJobs: number;
    totalCandidates: number;
    totalResumes: number;
    avgMatchScore: number;
    newResumesThisWeek: number;
    hireRate: number;
  };
  pipeline: Record<string, number>;
  recentActivity: ActivityLog[];
  jobsOverTime: number;
}

export interface BillingUsage {
  plan: string;
  currentMonth: {
    jobsCreated: number;
    resumesScreened: number;
    emailsSent: number;
    limits: { jobs: number; resumes: number; emails: number };
  };
  history: Array<{
    month: string;
    jobsCreated: number;
    resumesScreened: number;
    emailsSent: number;
  }>;
}

export interface PortalCandidate {
  id: string;
  candidateId: string;
  name: string;
  location?: string;
  matchScore?: number;
  stage: Stage;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  explanation: string;
  tags: string[];
}

export interface PortalData {
  job: {
    id: string;
    title: string;
    description: string;
    status: string;
    company: { name: string; logoUrl?: string; primaryColor?: string };
  };
  candidates: PortalCandidate[];
}
