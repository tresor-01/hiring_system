import { useEffect, useState } from 'react';
import { jobsApi } from '../api/jobs';
import { resumesApi } from '../api/resumes';
import { aiApi } from '../api/ai';
import { useAuthStore } from '../store/authStore';
import { Job, Resume } from '../types';
import ComparisonTable from '../components/ComparisonTable';
import toast from 'react-hot-toast';

export default function ComparePage() {
  const { company } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (company?.id) {
      jobsApi.list(company.id).then(setJobs).catch(console.error);
    }
  }, [company?.id]);

  useEffect(() => {
    if (selectedJobId) {
      resumesApi.listByJob(selectedJobId).then(setResumes).catch(console.error);
      setSelected([]);
      setResult(null);
    }
  }, [selectedJobId]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) {
        toast.error('Maximum 5 candidates for comparison');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selected.length < 2) {
      toast.error('Select at least 2 candidates');
      return;
    }
    setComparing(true);
    try {
      const compResult = await aiApi.compare(selected, selectedJobId);
      setResult(compResult);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  const selectedCandidates = resumes
    .filter(r => selected.includes(r.id))
    .map(r => ({ id: r.id, name: r.candidate?.name || 'Unknown' }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold text-slate-100">Candidate Comparison</h1>

      {/* Job selector */}
      <div className="card space-y-3">
        <label className="label">Select Job</label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="input max-w-sm"
        >
          <option value="">Choose a job...</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
      </div>

      {selectedJobId && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Select 2-5 candidates ({selected.length} selected)
            </h2>
            <button
              onClick={handleCompare}
              disabled={selected.length < 2 || comparing}
              className="btn-primary text-sm"
            >
              {comparing ? '🤖 Comparing...' : '🤖 Compare Selected'}
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {resumes.map(resume => (
              <label
                key={resume.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selected.includes(resume.id)
                    ? 'bg-indigo-900/30 border border-indigo-700'
                    : 'bg-slate-800 border border-transparent hover:border-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(resume.id)}
                  onChange={() => toggleSelect(resume.id)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200">{resume.candidate?.name}</div>
                  <div className="text-xs text-slate-500">{resume.candidate?.email}</div>
                </div>
                {resume.matchScore != null && (
                  <span className={`text-sm font-bold ${
                    resume.matchScore >= 75 ? 'text-green-400' :
                    resume.matchScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(resume.matchScore)}%
                  </span>
                )}
              </label>
            ))}
            {resumes.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No candidates for this job</p>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Comparison Results</h2>
          <ComparisonTable result={result} candidates={selectedCandidates} />
        </div>
      )}
    </div>
  );
}
