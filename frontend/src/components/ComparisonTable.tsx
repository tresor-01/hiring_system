interface ComparisonResult {
  comparison: Array<{
    criterion: string;
    candidates: Record<string, string>;
  }>;
  recommendation: string;
  rationale: string;
  rankings: Array<{
    candidateId: string;
    rank: number;
    summary: string;
  }>;
}

interface Candidate {
  id: string;
  name: string;
}

interface Props {
  result: ComparisonResult;
  candidates: Candidate[];
}

export default function ComparisonTable({ result, candidates }: Props) {
  const getCandidateName = (id: string) =>
    candidates.find(c => c.id === id)?.name || id.substring(0, 8);

  return (
    <div className="space-y-6">
      {/* Rankings */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">AI Rankings</h3>
        <div className="space-y-2">
          {result.rankings.map((r) => (
            <div
              key={r.candidateId}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                r.rank === 1 ? 'bg-indigo-900/20 border-indigo-800' : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  r.rank === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                #{r.rank}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">{getCandidateName(r.candidateId)}</div>
                <div className="text-xs text-slate-400 mt-0.5">{r.summary}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <span className="text-indigo-400 text-lg">🏆</span>
          <div>
            <div className="text-sm font-semibold text-indigo-300 mb-1">
              Recommendation: {result.recommendation}
            </div>
            <div className="text-sm text-slate-300">{result.rationale}</div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Detailed Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 font-medium py-2 pr-4 w-32">Criterion</th>
                {candidates.map(c => (
                  <th key={c.id} className="text-left text-slate-300 font-medium py-2 px-2">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.comparison.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-3 pr-4 text-slate-400 font-medium">{row.criterion}</td>
                  {candidates.map(c => (
                    <td key={c.id} className="py-3 px-2 text-slate-300">
                      {row.candidates[c.id] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
