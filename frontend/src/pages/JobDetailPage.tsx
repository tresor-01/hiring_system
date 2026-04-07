import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobsApi } from '../api/jobs';
import { resumesApi } from '../api/resumes';
import { Job, Resume, Stage } from '../types';
import KanbanBoard from '../components/KanbanBoard';
import FileUpload from '../components/FileUpload';
import ExportButton from '../components/ExportButton';
import MatchScoreBar from '../components/MatchScoreBar';
import toast from 'react-hot-toast';

type View = 'kanban' | 'list';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [pipeline, setPipeline] = useState<Record<Stage, Resume[]>>({} as any);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [view, setView] = useState<View>('kanban');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [matching, setMatching] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobData, pipelineData, resumeData] = await Promise.all([
        jobsApi.get(id!),
        jobsApi.getPipeline(id!),
        resumesApi.listByJob(id!)
      ]);
      setJob(jobData);
      setPipeline(pipelineData as any);
      setResumes(resumeData);
    } catch {
      toast.error('Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await resumesApi.upload(id!, files, setUploadProgress);
      toast.success(`Uploaded ${result.processed} resume(s)${result.duplicates > 0 ? `, ${result.duplicates} duplicate(s) skipped` : ''}`);
      setShowUpload(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMatchAll = async () => {
    if (!job?.extractedRequirements) {
      toast.error('Upload a job description first');
      return;
    }
    setMatching(true);
    try {
      const result = await resumesApi.matchAll(id!);
      toast.success(`AI scored ${result.processed} resume(s)`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Matching failed');
    } finally {
      setMatching(false);
    }
  };

  const requirements = job?.extractedRequirements ? JSON.parse(job.extractedRequirements) : null;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-slate-800 rounded w-64 animate-pulse" />
        <div className="h-48 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!job) return <div className="p-6 text-slate-400">Job not found</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-100">{job.title}</h1>
            <span className={`badge-${job.status === 'ACTIVE' ? 'green' : job.status === 'DRAFT' ? 'slate' : 'red'}`}>
              {job.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {resumes.length} candidate(s) · Created {new Date(job.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton jobId={id!} />
          <Link to={`/jobs/${id}/ai-tools`} className="btn-secondary text-sm flex items-center gap-2">
            🤖 AI Tools
          </Link>
        </div>
      </div>

      {/* Requirements */}
      {requirements && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-slate-300">Extracted Requirements</h2>
          <div className="flex flex-wrap gap-1.5">
            {requirements.skills?.map((s: string) => (
              <span key={s} className="badge-blue">{s}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-400 mt-2">
            {requirements.experience && <div><span className="text-slate-500">Experience:</span> {requirements.experience}</div>}
            {requirements.location && <div><span className="text-slate-500">Location:</span> {requirements.location}</div>}
            {requirements.education && <div><span className="text-slate-500">Education:</span> {requirements.education}</div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          📁 Upload Resumes
        </button>
        <button
          onClick={handleMatchAll}
          disabled={matching}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {matching ? '🤖 Matching...' : '🤖 Run AI Match'}
        </button>
        {job.portalToken && (
          <button
            onClick={() => {
              const url = `${window.location.origin}/portal/${job.portalToken}`;
              navigator.clipboard.writeText(url);
              toast.success('Portal link copied!');
            }}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            🔗 Copy Portal Link
          </button>
        )}
        <div className="ml-auto flex bg-slate-800 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-1 rounded text-sm transition-colors ${view === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Board
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1 rounded text-sm transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            List
          </button>
        </div>
      </div>

      {showUpload && (
        <FileUpload
          onFiles={handleUpload}
          accept=".pdf,.doc,.docx,.txt"
          multiple={true}
          label="Drop up to 200 resumes here"
          subLabel="PDF, DOCX, DOC, TXT"
          uploading={uploading}
          progress={uploadProgress}
        />
      )}

      {/* Kanban or List */}
      {view === 'kanban' ? (
        <KanbanBoard pipeline={pipeline} onPipelineChange={setPipeline} />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-3 text-xs text-slate-500 uppercase tracking-wider px-4 pb-2 border-b border-slate-800">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-3">Match Score</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-2">Date</div>
          </div>
          {resumes.map(resume => (
            <Link
              key={resume.id}
              to={`/candidates/${resume.candidateId}`}
              className="grid grid-cols-12 gap-3 items-center card hover:border-indigo-700 transition-colors"
            >
              <div className="col-span-3 font-medium text-slate-200 text-sm">{resume.candidate?.name}</div>
              <div className="col-span-2 text-xs text-slate-400 truncate">{resume.candidate?.email}</div>
              <div className="col-span-3">
                {resume.matchScore != null ? (
                  <MatchScoreBar score={resume.matchScore} size="sm" showLabel={false} />
                ) : (
                  <span className="text-xs text-slate-600">Not scored</span>
                )}
              </div>
              <div className="col-span-2">
                <span className="badge-slate text-xs">{resume.stage}</span>
              </div>
              <div className="col-span-2 text-xs text-slate-500">
                {new Date(resume.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
          {resumes.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No resumes uploaded yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
