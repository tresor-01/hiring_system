import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobsApi } from '../api/jobs';
import { aiApi } from '../api/ai';
import { Job } from '../types';
import toast from 'react-hot-toast';

type Tool = 'shortlist' | 'bias' | 'quality';

export default function JobAIToolsPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('shortlist');
  const [loading, setLoading] = useState(false);
  const [targetCount, setTargetCount] = useState(10);

  // Results
  const [shortlistResult, setShortlistResult] = useState<any>(null);
  const [biasResult, setBiasResult] = useState<any>(null);
  const [qualityResult, setQualityResult] = useState<any>(null);

  useEffect(() => {
    if (id) {
      jobsApi.get(id).then(setJob).catch(() => toast.error('Failed to load job'));
    }
  }, [id]);

  const runShortlist = async () => {
    setLoading(true);
    try {
      const result = await aiApi.generateShortlist(id!, targetCount);
      setShortlistResult(result);
      toast.success(`Shortlist of ${result.selected?.length || 0} generated!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate shortlist');
    } finally {
      setLoading(false);
    }
  };

  const runBiasCheck = async () => {
    setLoading(true);
    try {
      const result = await aiApi.biasCheck(id!);
      setBiasResult(result);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Bias check failed');
    } finally {
      setLoading(false);
    }
  };

  const runQualityCheck = async () => {
    setLoading(true);
    try {
      const result = await jobsApi.checkQuality(id!);
      setQualityResult(result);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Quality check failed');
    } finally {
      setLoading(false);
    }
  };

  const SEVERITY_COLORS: Record<string, string> = {
    HIGH: 'badge-red',
    MEDIUM: 'badge-yellow',
    LOW: 'badge-blue'
  };

  const RISK_COLORS: Record<string, string> = {
    HIGH: 'text-red-400',
    MEDIUM: 'text-yellow-400',
    LOW: 'text-blue-400',
    MINIMAL: 'text-green-400'
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to={`/jobs/${id}`} className="text-slate-400 hover:text-slate-200 text-sm">
          ← Back to job
        </Link>
        <h1 className="text-xl font-bold text-slate-100">🤖 AI Tools</h1>
        {job && <span className="text-slate-400 text-sm">— {job.title}</span>}
      </div>

      {/* Tool selector */}
      <div className="flex bg-slate-800 rounded-lg p-1 gap-1 w-fit">
        {([
          { id: 'shortlist', label: '⭐ Shortlist Generator' },
          { id: 'bias', label: '⚖️ Bias Check' },
          { id: 'quality', label: '📋 JD Quality' }
        ] as { id: Tool; label: string }[]).map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTool === tool.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Shortlist Generator */}
      {activeTool === 'shortlist' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-slate-200">Smart Shortlist Generator</h2>
            <p className="text-sm text-slate-400">AI selects the best candidates with written justifications.</p>
            <div className="flex items-center gap-4">
              <div>
                <label className="label">Target count</label>
                <input
                  type="number"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  min={1}
                  max={50}
                  className="input w-24"
                />
              </div>
              <div className="pt-5">
                <button onClick={runShortlist} disabled={loading} className="btn-primary">
                  {loading ? '🤖 Generating...' : '🤖 Generate Shortlist'}
                </button>
              </div>
            </div>
          </div>

          {shortlistResult && (
            <div className="card space-y-4">
              <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
                <p className="text-sm text-slate-300">{shortlistResult.overview}</p>
              </div>
              <h3 className="font-medium text-slate-200">Selected Candidates ({shortlistResult.selected?.length})</h3>
              <div className="space-y-3">
                {shortlistResult.selected?.map((s: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-800 rounded-lg p-3">
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {s.rank}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-200 mb-0.5">Resume ID: {s.candidateId?.substring(0, 8)}...</div>
                      <div className="text-xs text-slate-400">{s.justification}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bias Check */}
      {activeTool === 'bias' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-slate-200">Bias & Fairness Analysis</h2>
            <p className="text-sm text-slate-400">Check the job description for potential bias patterns.</p>
            <button onClick={runBiasCheck} disabled={loading} className="btn-primary">
              {loading ? '🤖 Analyzing...' : '🤖 Run Bias Check'}
            </button>
          </div>

          {biasResult && (
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Overall Risk:</span>
                <span className={`font-bold text-lg ${RISK_COLORS[biasResult.overallRisk] || 'text-slate-300'}`}>
                  {biasResult.overallRisk}
                </span>
              </div>
              <p className="text-sm text-slate-300">{biasResult.summary}</p>
              {biasResult.flags?.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Flags ({biasResult.flags.length})</h3>
                  {biasResult.flags.map((flag: any, i: number) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={SEVERITY_COLORS[flag.severity] || 'badge-slate'}>{flag.severity}</span>
                        <span className="text-sm font-medium text-slate-200">{flag.type}</span>
                      </div>
                      <p className="text-xs text-slate-400">{flag.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="badge-green w-fit">No bias flags found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* JD Quality */}
      {activeTool === 'quality' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-slate-200">JD Quality Checker</h2>
            <p className="text-sm text-slate-400">AI reviews the job description for quality issues.</p>
            <button onClick={runQualityCheck} disabled={loading} className="btn-primary">
              {loading ? '🤖 Checking...' : '🤖 Check Quality'}
            </button>
          </div>

          {qualityResult && (
            <div className="card space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Quality Score:</span>
                <span className={`font-bold text-2xl ${
                  qualityResult.overallScore >= 75 ? 'text-green-400' :
                  qualityResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {qualityResult.overallScore}/100
                </span>
              </div>
              <p className="text-sm text-slate-300">{qualityResult.summary}</p>
              {qualityResult.issues?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-300">Issues ({qualityResult.issues.length})</h3>
                  {qualityResult.issues.map((issue: any, i: number) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={SEVERITY_COLORS[issue.severity] || 'badge-slate'}>{issue.severity}</span>
                        <span className="text-sm font-medium text-slate-200">{issue.type}</span>
                      </div>
                      <p className="text-xs text-slate-400 italic">"{issue.text}"</p>
                      <p className="text-xs text-green-400">Suggestion: {issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
