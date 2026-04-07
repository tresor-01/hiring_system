import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api/jobs';
import { useAuthStore } from '../store/authStore';
import FileUpload from '../components/FileUpload';
import toast from 'react-hot-toast';

export default function NewJobPage() {
  const { company } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'jd'>('details');
  const [title, setTitle] = useState('');
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const handleCreateJob = async () => {
    if (!title.trim() || !company?.id) return;
    setLoading(true);
    try {
      const job = await jobsApi.create({ title, companyId: company.id });
      setCreatedJobId(job.id);
      setStep('jd');
      toast.success('Job created! Now upload the job description.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadJD = async () => {
    if (!createdJobId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      if (jdFile) {
        formData.append('file', jdFile);
      } else if (jdText.trim()) {
        formData.append('text', jdText);
      } else {
        toast.error('Please provide a job description');
        setLoading(false);
        return;
      }

      const result = await jobsApi.uploadJD(createdJobId, formData);
      toast.success('Job description processed by AI!');
      navigate(`/jobs/${createdJobId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process JD');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-100 mb-6">Create New Job</h1>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        <StepBadge number={1} label="Job Details" active={step === 'details'} done={step === 'jd'} />
        <div className="flex-1 h-px bg-slate-700" />
        <StepBadge number={2} label="Job Description" active={step === 'jd'} done={false} />
      </div>

      {step === 'details' && (
        <div className="card space-y-4">
          <div>
            <label className="label">Job Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="e.g. Senior Full Stack Engineer"
            />
          </div>
          <button
            onClick={handleCreateJob}
            disabled={loading || !title.trim()}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Continue →'}
          </button>
        </div>
      )}

      {step === 'jd' && (
        <div className="card space-y-4">
          <p className="text-sm text-slate-400">
            Upload the job description file OR paste the text below. AI will extract requirements automatically.
          </p>

          <FileUpload
            onFiles={files => {
              setJdFile(files[0]);
              setJdText('');
            }}
            multiple={false}
            label="Upload JD (PDF, DOCX, TXT)"
            subLabel={jdFile ? `Selected: ${jdFile.name}` : 'PDF, DOCX, DOC, TXT up to 10MB'}
          />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">OR</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <div>
            <label className="label">Paste Job Description</label>
            <textarea
              value={jdText}
              onChange={(e) => {
                setJdText(e.target.value);
                setJdFile(null);
              }}
              className="input"
              rows={10}
              placeholder="Paste the full job description here..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="btn-secondary"
            >
              ← Back
            </button>
            <button
              onClick={handleUploadJD}
              disabled={loading || (!jdFile && !jdText.trim())}
              className="btn-primary flex-1"
            >
              {loading ? '🤖 AI Processing...' : '🤖 Process with AI'}
            </button>
            <button
              onClick={() => navigate(`/jobs/${createdJobId}`)}
              className="btn-secondary text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBadge({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
        done ? 'bg-green-600 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
      }`}>
        {done ? '✓' : number}
      </div>
      <span className={`text-sm ${active ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
    </div>
  );
}
