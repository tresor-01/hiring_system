import { Resume, MatchReport, Stage } from '../types';
import MatchScoreBar from './MatchScoreBar';
import { useNavigate } from 'react-router-dom';

interface Props {
  resume: Resume;
  onStageChange?: (resumeId: string, stage: Stage) => void;
  compact?: boolean;
  dragging?: boolean;
}

const STAGE_COLORS: Record<Stage, string> = {
  NEW: 'badge-slate',
  SCREENED: 'badge-blue',
  SHORTLISTED: 'badge-yellow',
  INTERVIEWED: 'badge-blue',
  OFFERED: 'badge-green',
  HIRED: 'badge-green',
  REJECTED: 'badge-red'
};

export default function ResumeCard({ resume, onStageChange, compact = false, dragging = false }: Props) {
  const navigate = useNavigate();
  const report: MatchReport | null = resume.matchReport ? JSON.parse(resume.matchReport) : null;
  const tags = resume.resumeTags?.map(rt => rt.tag) || [];
  const topNote = resume.notes?.[0];

  return (
    <div
      className={`card cursor-pointer hover:border-indigo-700 transition-all ${dragging ? 'opacity-75 rotate-1 shadow-2xl' : ''}`}
      onClick={() => navigate(`/candidates/${resume.candidateId}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-100 text-sm truncate">
            {resume.candidate?.name || 'Unknown'}
          </div>
          {!compact && (
            <div className="text-xs text-slate-500 truncate">
              {resume.candidate?.email || resume.candidate?.location || resume.fileName}
            </div>
          )}
        </div>
        <span className={STAGE_COLORS[resume.stage]}>{resume.stage}</span>
      </div>

      {resume.matchScore != null && (
        <div className="mb-2">
          <MatchScoreBar score={resume.matchScore} size="sm" />
          <div className="text-right text-xs font-bold mt-0.5" style={{
            color: resume.matchScore >= 75 ? '#4ade80' : resume.matchScore >= 50 ? '#facc15' : '#f87171'
          }}>
            {Math.round(resume.matchScore)}%
          </div>
        </div>
      )}

      {!compact && report && (
        <div className="space-y-1 mb-2">
          {report.strengths?.slice(0, 2).map((s, i) => (
            <div key={i} className="flex items-start gap-1 text-xs text-slate-400">
              <span className="text-green-500 shrink-0 mt-0.5">✓</span>
              <span className="line-clamp-1">{s}</span>
            </div>
          ))}
          {report.gaps?.slice(0, 1).map((g, i) => (
            <div key={i} className="flex items-start gap-1 text-xs text-slate-500">
              <span className="text-red-500 shrink-0 mt-0.5">✗</span>
              <span className="line-clamp-1">{g}</span>
            </div>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 3).map(tag => (
            <span key={tag.id} className="badge-blue text-xs">{tag.name}</span>
          ))}
          {tags.length > 3 && <span className="badge-slate">+{tags.length - 3}</span>}
        </div>
      )}

      {topNote && topNote.starRating && (
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          {'★'.repeat(topNote.starRating)}{'☆'.repeat(5 - topNote.starRating)}
        </div>
      )}
    </div>
  );
}
