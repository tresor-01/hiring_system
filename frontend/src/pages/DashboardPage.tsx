import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analytics';
import { useAuthStore } from '../store/authStore';
import { AnalyticsDashboard } from '../types';
import ActivityFeed from '../components/ActivityFeed';
import { SimpleBarChart, SimplePieChart } from '../components/AnalyticsChart';

export default function DashboardPage() {
  const { company } = useAuthStore();
  const [stats, setStats] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) {
      analyticsApi.dashboard(company.id)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [company?.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const o = stats?.overview;
  const pipelineData = stats ? Object.entries(stats.pipeline).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{company?.name} · Overview</p>
        </div>
        <Link to="/jobs/new" className="btn-primary flex items-center gap-2">
          <span>+</span> New Job
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Jobs" value={o?.activeJobs || 0} sub={`of ${o?.totalJobs || 0} total`} color="indigo" />
        <StatCard label="Candidates" value={o?.totalCandidates || 0} sub="in talent pool" color="cyan" />
        <StatCard label="Avg Match Score" value={`${o?.avgMatchScore || 0}%`} sub="across all jobs" color="amber" />
        <StatCard label="New This Week" value={o?.newResumesThisWeek || 0} sub="resumes received" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline chart */}
        <div className="card">
          <SimplePieChart
            data={pipelineData}
            title="Candidate Pipeline"
          />
        </div>

        {/* Score distribution */}
        <div className="card">
          <SimpleBarChart
            data={pipelineData}
            title="Candidates by Stage"
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Activity</h2>
        <ActivityFeed activities={stats?.recentActivity || []} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    green: 'text-green-400'
  };
  return (
    <div className="card">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-slate-500 text-xs mt-1">{sub}</div>
    </div>
  );
}
