import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { candidatesApi } from '../api/candidates';
import { useAuthStore } from '../store/authStore';
import { Candidate } from '../types';
import toast from 'react-hot-toast';

export default function CandidatesPage() {
  const { company } = useAuthStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const result = await candidatesApi.list({
        search: search || undefined,
        companyId: company.id,
        page
      });
      setCandidates(result.candidates);
      setTotal(result.total);
      setPages(result.pages);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [company?.id, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Talent Pool</h1>
          <p className="text-slate-400 text-sm">{total} candidates</p>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, location..."
        className="input max-w-sm"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-slate-400">No candidates found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {candidates.map(candidate => {
              const bestScore: number = candidate.resumes?.reduce((max, r) => Math.max(max, r.matchScore || 0), 0) ?? 0;
              return (
                <Link
                  key={candidate.id}
                  to={`/candidates/${candidate.id}`}
                  className="card hover:border-indigo-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium text-slate-300 shrink-0">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{candidate.name}</div>
                      <div className="text-xs text-slate-500">
                        {candidate.email} {candidate.location && `· ${candidate.location}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-400">{candidate.resumes?.length || 0} job(s)</div>
                    {bestScore > 0 && (
                      <div className={`text-sm font-bold ${bestScore >= 75 ? 'text-green-400' : bestScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {Math.round(bestScore)}%
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm"
              >
                ← Prev
              </button>
              <span className="text-slate-400 text-sm">Page {page} of {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="btn-secondary text-sm"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
