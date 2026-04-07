interface Props {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function MatchScoreBar({ score, showLabel = true, size = 'md' }: Props) {
  const getColor = (s: number) => {
    if (s >= 75) return 'bg-green-500';
    if (s >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (s: number) => {
    if (s >= 75) return 'text-green-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const textClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="w-full">
      {showLabel && (
        <div className={`flex justify-between mb-1 ${textClass}`}>
          <span className="text-slate-400">Match Score</span>
          <span className={`font-semibold ${getTextColor(score)}`}>{Math.round(score)}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
