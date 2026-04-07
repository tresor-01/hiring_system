import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../api/jobs';
import { useAuthStore } from '../store/authStore';
import { Job } from '../types';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-green',
  DRAFT: 'badge-slate',
  CLOSED: 'badge-red'
};

export default function JobsPage() {
  const { company } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (company?.id) {
      jobsApi.list(company.id)
        .then(setJobs)
        .catch(() => toast.error('Failed to load jobs'))
        .finally(() => setLoading(false));
    }
  }, [company?.id]);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Jobs</h1>
        <Link to="/jobs/new" className="btn-primary flex items-center gap-2">
          <span>+</span> New Job
        </Link>
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search jobs..."
        className="input max-w-xs"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">💼</div>
          <p className="text-slate-400">No jobs yet</p>
          <Link to="/jobs/new" className="btn-primary mt-4 inline-flex">Create your first job</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="card hover:border-indigo-700 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-slate-100">{job.title}</h3>
                  <span className={STATUS_COLORS[job.status]}>{job.status}</span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-1">{job.description?.substring(0, 120)}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-bold text-indigo-400">{job._count?.resumes || 0}</div>
                <div className="text-xs text-slate-500">resumes</div>
                <div className="text-xs text-slate-600 mt-1">
                  {new Date(job.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
