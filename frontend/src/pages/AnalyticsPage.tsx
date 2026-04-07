import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/analytics';
import { useAuthStore } from '../store/authStore';
import { AnalyticsDashboard } from '../types';
import { SimpleBarChart, SimplePieChart } from '../components/AnalyticsChart';
import ActivityFeed from '../components/ActivityFeed';

export default function AnalyticsPage() {
  const { company } = useAuthStore();
  const [stats, setStats] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) {
      analyticsApi.dashboard(company.id)
        .then(setStats)
        .finally(() => setLoading(false));
    }
  }, [company?.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const o = stats?.overview;
  const pipelineData = stats ? Object.entries(stats.pipeline).map(([name, value]) => ({ name, value })) : [];
  const scoreData = [
    { name: '90-100', value: 0 },
    { name: '75-90', value: 0 },
    { name: '60-75', value: 0 },
    { name: '40-60', value: 0 },
    { name: '0-40', value: 0 }
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-slate-100">Analytics</h1>

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={o?.totalJobs || 0} />
        <StatCard label="Active Jobs" value={o?.activeJobs || 0} color="green" />
        <StatCard label="Total Candidates" value={o?.totalCandidates || 0} color="cyan" />
        <StatCard label="Total Resumes" value={o?.totalResumes || 0} color="purple" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Match Score" value={`${o?.avgMatchScore || 0}%`} color="amber" />
        <StatCard label="New This Week" value={o?.newResumesThisWeek || 0} />
        <StatCard label="Hire Rate" value={`${o?.hireRate || 0}%`} color="green" />
        <StatCard label="Jobs This Month" value={stats?.jobsOverTime || 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SimplePieChart
            data={pipelineData.filter(d => d.value > 0)}
            title="Candidates by Pipeline Stage"
          />
        </div>
        <div className="card">
          <SimpleBarChart
            data={pipelineData}
            title="Pipeline Stage Distribution"
            color="#6366f1"
          />
        </div>
      </div>

      {/* Activity feed */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Recent Activity</h2>
        <ActivityFeed activities={stats?.recentActivity || []} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'indigo'
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400',
    green: 'text-green-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    red: 'text-red-400'
  };
  return (
    <div className="card">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color] || 'text-indigo-400'}`}>{value}</div>
    </div>
  );
}
