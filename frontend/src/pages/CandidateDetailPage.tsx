import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { candidatesApi } from '../api/candidates';
import { aiApi } from '../api/ai';
import { emailApi } from '../api/email';
import { Candidate, Resume, MatchReport } from '../types';
import MatchScoreBar from '../components/MatchScoreBar';
import NotesList from '../components/NotesList';
import TagInput from '../components/TagInput';
import { applicationsApi } from '../api/applications';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useAuthStore();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    if (id) {
      candidatesApi.get(id)
        .then(c => {
          setCandidate(c);
          if (c.resumes && c.resumes.length > 0) {
            setSelectedResume(c.resumes[0]);
          }
        })
        .catch(() => toast.error('Failed to load candidate'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const generateInterviewQs = async () => {
    if (!selectedResume) return;
    setAiLoading(true);
    try {
      const result = await aiApi.interviewQuestions(selectedResume.id, selectedResume.jobId);
      setInterviewQuestions(result);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate questions');
    } finally {
      setAiLoading(false);
    }
  };

  const draftEmailHandler = async () => {
    if (!selectedResume) return;
    setAiLoading(true);
    try {
      const draft = await emailApi.draft(selectedResume.id);
      setEmailDraft(draft);
      setShowEmail(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to draft email');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTagsChange = async (tags: string[]) => {
    if (!selectedResume || !company?.id) return;
    try {
      await applicationsApi.setTags(selectedResume.id, tags, company.id);
      // Refresh
      const updated = await candidatesApi.get(id!);
      setCandidate(updated);
      const updatedResume = updated.resumes?.find(r => r.id === selectedResume.id);
      if (updatedResume) setSelectedResume(updatedResume);
    } catch {
      toast.error('Failed to update tags');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="h-48 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!candidate) return <div className="p-6 text-slate-400">Candidate not found</div>;

  const report: MatchReport | null = selectedResume?.matchReport
    ? JSON.parse(selectedResume.matchReport)
    : null;

  const tags = selectedResume?.resumeTags?.map(rt => rt.tag.name) || [];

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-indigo-900 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-300 shrink-0">
          {candidate.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100">{candidate.name}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
            {candidate.email && <span>✉ {candidate.email}</span>}
            {candidate.phone && <span>📞 {candidate.phone}</span>}
            {candidate.location && <span>📍 {candidate.location}</span>}
            {candidate.linkedinUrl && (
              <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                LinkedIn →
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Applications */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Applications ({candidate.resumes?.length || 0})</h2>
          {candidate.resumes?.map(resume => (
            <button
              key={resume.id}
              onClick={() => setSelectedResume(resume)}
              className={`w-full text-left card transition-colors ${
                selectedResume?.id === resume.id ? 'border-indigo-600' : 'hover:border-slate-600'
              }`}
            >
              <div className="text-sm font-medium text-slate-200 truncate">{resume.job?.title || 'Unknown Job'}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="badge-slate text-xs">{resume.stage}</span>
                {resume.matchScore != null && (
                  <span className={`text-sm font-bold ${
                    resume.matchScore >= 75 ? 'text-green-400' :
                    resume.matchScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(resume.matchScore)}%
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Right: Detail */}
        {selectedResume && (
          <div className="lg:col-span-2 space-y-4">
            {/* Match score */}
            {selectedResume.matchScore != null && (
              <div className="card">
                <MatchScoreBar score={selectedResume.matchScore} size="lg" />
              </div>
            )}

            {/* AI Report */}
            {report && (
              <div className="card space-y-3">
                <h3 className="text-sm font-semibold text-slate-300">AI Assessment</h3>
                <p className="text-sm text-slate-300">{report.explanation}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-green-400 font-medium mb-1">Strengths</div>
                    <ul className="space-y-1">
                      {report.strengths?.map((s, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                          <span className="text-green-500 shrink-0">✓</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-red-400 font-medium mb-1">Gaps</div>
                    <ul className="space-y-1">
                      {report.gaps?.map((g, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1">
                          <span className="text-red-500 shrink-0">✗</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {report.recommendation && (
                  <div className="text-xs text-slate-400 border-t border-slate-700 pt-2">
                    <span className="font-medium">Recommendation:</span> {report.recommendation}
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Tags</h3>
              <TagInput tags={tags} onChange={handleTagsChange} />
            </div>

            {/* AI Actions */}
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">AI Tools</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={generateInterviewQs}
                  disabled={aiLoading}
                  className="btn-secondary text-sm"
                >
                  {aiLoading ? '...' : '❓'} Interview Questions
                </button>
                <button
                  onClick={draftEmailHandler}
                  disabled={aiLoading}
                  className="btn-secondary text-sm"
                >
                  {aiLoading ? '...' : '✉'} Draft Email
                </button>
              </div>

              {/* Interview questions */}
              {interviewQuestions && (
                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-medium text-slate-400">Interview Questions</h4>
                  {interviewQuestions.questions?.map((q: any, i: number) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge-blue text-xs">{q.category}</span>
                      </div>
                      <p className="text-sm text-slate-200">{q.question}</p>
                      <p className="text-xs text-slate-500 mt-1">{q.rationale}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Email draft */}
              {showEmail && emailDraft && (
                <div className="space-y-2 mt-3">
                  <h4 className="text-xs font-medium text-slate-400">Email Draft</h4>
                  <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="text-xs text-slate-500">Subject:</div>
                    <input
                      type="text"
                      value={emailDraft.subject}
                      onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                      className="input text-sm"
                    />
                    <div className="text-xs text-slate-500">Body:</div>
                    <textarea
                      value={emailDraft.body}
                      onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                      rows={6}
                      className="input text-sm resize-none"
                    />
                    <button
                      onClick={() => {
                        toast.success('In a real system, this would send the email!');
                        setShowEmail(false);
                      }}
                      className="btn-primary text-sm"
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Notes</h3>
              <NotesList
                resumeId={selectedResume.id}
                notes={selectedResume.notes || []}
                onNotesChange={(notes) => setSelectedResume({ ...selectedResume, notes })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
