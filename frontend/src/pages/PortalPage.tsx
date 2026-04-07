import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { portalApi } from '../api/portal';
import { PortalData, PortalCandidate } from '../types';
import MatchScoreBar from '../components/MatchScoreBar';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      portalApi.get(token)
        .then(setData)
        .catch(() => toast.error('Portal not found or expired'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleFeedback = async (candidate: PortalCandidate, feedback: 'APPROVED' | 'REJECTED' | 'COMMENT') => {
    if (!token) return;
    setSubmitting(candidate.id);
    try {
      await portalApi.submitFeedback(token, candidate.candidateId, feedback, comments[candidate.id]);
      setFeedbacks(prev => ({ ...prev, [candidate.id]: feedback }));
      toast.success('Feedback submitted!');
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(null);
    }
  };

  const company = data?.job?.company;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading portal...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-slate-400">Portal not found or expired</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">{data.job.title}</h1>
            <p className="text-sm text-slate-400">{company?.name} · Candidate Shortlist</p>
          </div>
          <div className="badge-blue">{data.candidates.length} Candidates</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <p className="text-sm text-slate-400">
          Review the shortlisted candidates below. Click Approve or Reject to provide feedback.
        </p>

        {data.candidates.map((candidate, idx) => {
          const submitted = feedbacks[candidate.id];
          return (
            <div
              key={candidate.id}
              className={`card space-y-4 ${
                submitted === 'APPROVED' ? 'border-green-700' :
                submitted === 'REJECTED' ? 'border-red-700/50 opacity-75' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-900 rounded-full flex items-center justify-center font-bold text-indigo-300 shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-100">{candidate.name}</h2>
                    {candidate.location && (
                      <p className="text-sm text-slate-500">📍 {candidate.location}</p>
                    )}
                  </div>
                </div>
                {candidate.matchScore != null && (
                  <div className="text-right">
                    <div className={`text-xl font-bold ${
                      candidate.matchScore >= 75 ? 'text-green-400' :
                      candidate.matchScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {Math.round(candidate.matchScore)}%
                    </div>
                    <div className="text-xs text-slate-500">match</div>
                  </div>
                )}
              </div>

              {candidate.matchScore != null && (
                <MatchScoreBar score={candidate.matchScore} size="sm" showLabel={false} />
              )}

              {candidate.explanation && (
                <p className="text-sm text-slate-300">{candidate.explanation}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {candidate.strengths.length > 0 && (
                  <div>
                    <div className="text-xs text-green-400 font-medium mb-1">Strengths</div>
                    <ul className="space-y-1">
                      {candidate.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                          <span className="text-green-500 shrink-0">✓</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {candidate.gaps.length > 0 && (
                  <div>
                    <div className="text-xs text-red-400 font-medium mb-1">Gaps</div>
                    <ul className="space-y-1">
                      {candidate.gaps.slice(0, 3).map((g, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                          <span className="text-red-500 shrink-0">✗</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {candidate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {candidate.tags.map(tag => (
                    <span key={tag} className="badge-blue">{tag}</span>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {submitted ? (
                <div className={`text-sm font-medium ${submitted === 'APPROVED' ? 'text-green-400' : 'text-red-400'}`}>
                  ✓ {submitted} — Thank you for your feedback
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={comments[candidate.id] || ''}
                    onChange={(e) => setComments(prev => ({ ...prev, [candidate.id]: e.target.value }))}
                    placeholder="Optional comment..."
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFeedback(candidate, 'APPROVED')}
                      disabled={submitting === candidate.id}
                      className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleFeedback(candidate, 'REJECTED')}
                      disabled={submitting === candidate.id}
                      className="bg-red-700 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ✗ Reject
                    </button>
                    {comments[candidate.id] && (
                      <button
                        onClick={() => handleFeedback(candidate, 'COMMENT')}
                        disabled={submitting === candidate.id}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        💬 Comment
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {data.candidates.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            No candidates have been shortlisted yet
          </div>
        )}
      </main>
    </div>
  );
}
