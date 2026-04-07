import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { companiesApi } from '../api/companies';
import { jobsApi } from '../api/jobs';
import { Company, Job } from '../types';
import toast from 'react-hot-toast';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        companiesApi.get(id),
        jobsApi.list(id)
      ])
        .then(([c, j]) => { setCompany(c); setJobs(j); })
        .catch(() => toast.error('Failed to load company'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="p-6"><div className="h-48 bg-slate-800 rounded-xl animate-pulse" /></div>;
  if (!company) return <div className="p-6 text-slate-400">Company not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-indigo-900 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-300">
          {company.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{company.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500 text-sm">/{company.slug}</span>
            <span className={`badge-${company.plan === 'PRO' ? 'green' : company.plan === 'STARTER' ? 'blue' : 'slate'}`}>
              {company.plan}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-xs text-slate-500 mb-1">Jobs</div>
          <div className="text-2xl font-bold text-indigo-400">{jobs.length}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 mb-1">Team Members</div>
          <div className="text-2xl font-bold text-cyan-400">{(company as any).users?.length || 0}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-200">Jobs</h2>
          <Link to="/jobs/new" className="btn-primary text-sm">+ New Job</Link>
        </div>
        {jobs.map(job => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="card hover:border-indigo-700 transition-colors flex items-center justify-between"
          >
            <div>
              <div className="font-medium text-slate-200">{job.title}</div>
              <div className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge-${job.status === 'ACTIVE' ? 'green' : 'slate'}`}>{job.status}</span>
              <span className="text-xs text-slate-500">{job._count?.resumes || 0} resumes</span>
            </div>
          </Link>
        ))}
        {jobs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No jobs yet</p>}
      </div>
    </div>
  );
}
