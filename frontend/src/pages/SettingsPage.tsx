import { useEffect, useState } from 'react';
import { billingApi } from '../api/billing';
import { companiesApi } from '../api/companies';
import { useAuthStore } from '../store/authStore';
import { BillingUsage } from '../types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { company, user, updateCompany } = useAuthStore();
  const [billing, setBilling] = useState<BillingUsage | null>(null);
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'general' | 'billing' | 'api'>('general');

  useEffect(() => {
    if (company?.id) {
      billingApi.usage().then(setBilling).catch(console.error);
    }
  }, [company?.id]);

  const handleSaveCompany = async () => {
    if (!company?.id) return;
    setSaving(true);
    try {
      const updated = await companiesApi.update(company.id, { name: companyName });
      updateCompany(updated);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!company?.id || !confirm('Regenerate API key? Existing integrations will break.')) return;
    try {
      const { apiKey } = await companiesApi.regenerateApiKey(company.id);
      updateCompany({ ...company, apiKey });
      toast.success('API key regenerated');
    } catch {
      toast.error('Failed to regenerate key');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-slate-100">Settings</h1>

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-lg p-1 gap-1 w-fit">
        {[
          { id: 'general', label: '⚙️ General' },
          { id: 'billing', label: '💳 Billing' },
          { id: 'api', label: '🔑 API' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="card space-y-4">
          <h2 className="font-medium text-slate-200">Company Settings</h2>
          <div>
            <label className="label">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Plan</label>
            <div className="badge-green w-fit">{company?.plan || 'FREE'}</div>
          </div>
          <button onClick={handleSaveCompany} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'billing' && billing && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h2 className="font-medium text-slate-200">Current Month Usage</h2>
            <div className="grid grid-cols-3 gap-4">
              <UsageStat
                label="Jobs Created"
                value={billing.currentMonth.jobsCreated}
                limit={billing.currentMonth.limits.jobs}
              />
              <UsageStat
                label="Resumes Screened"
                value={billing.currentMonth.resumesScreened}
                limit={billing.currentMonth.limits.resumes}
              />
              <UsageStat
                label="Emails Sent"
                value={billing.currentMonth.emailsSent}
                limit={billing.currentMonth.limits.emails}
              />
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-medium text-slate-200">Usage History</h2>
            <div className="space-y-2">
              {billing.history.map(h => (
                <div key={h.month} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{h.month}</span>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>{h.jobsCreated} jobs</span>
                    <span>{h.resumesScreened} resumes</span>
                    <span>{h.emailsSent} emails</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'api' && (
        <div className="card space-y-4">
          <h2 className="font-medium text-slate-200">API Access</h2>
          <p className="text-sm text-slate-400">
            Use your API key to integrate HireAI with your existing tools.
          </p>
          <div>
            <label className="label">API Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={company?.apiKey || ''}
                readOnly
                className="input font-mono text-xs"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(company?.apiKey || '');
                  toast.success('Copied!');
                }}
                className="btn-secondary text-sm shrink-0"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-medium text-slate-300">Usage Example</h3>
            <pre className="text-xs text-slate-400 overflow-x-auto">
{`POST /v1/score
X-API-Key: ${company?.apiKey || 'your-api-key'}
Content-Type: application/json

{
  "resumeText": "...",
  "jobDescription": "..."
}`}
            </pre>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Webhook (ATS Integration)</h3>
            <p className="text-xs text-slate-500 mb-2">POST to <code className="bg-slate-800 px-1 rounded">/api/webhook/ats</code></p>
            <pre className="text-xs text-slate-400 bg-slate-800 p-3 rounded overflow-x-auto">
{`{
  "event": "stage.updated",
  "apiKey": "${company?.apiKey || 'your-key'}",
  "data": {
    "resumeId": "...",
    "stage": "HIRED"
  }
}`}
            </pre>
          </div>

          {user?.role === 'ADMIN' && (
            <button onClick={handleRegenerateKey} className="btn-danger text-sm">
              🔄 Regenerate API Key
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UsageStat({ label, value, limit }: { label: string; value: number; limit: number }) {
  const pct = limit > 0 ? Math.min((value / limit) * 100, 100) : 0;
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-slate-200">{value}<span className="text-xs text-slate-500">/{limit}</span></div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
        <div
          className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
