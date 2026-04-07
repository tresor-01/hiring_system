import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { companiesApi } from '../api/companies';
import { Company } from '../types';
import toast from 'react-hot-toast';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => {
    companiesApi.list()
      .then(setCompanies)
      .catch(() => toast.error('Failed to load companies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await companiesApi.create(name);
      toast.success('Company created');
      setShowCreate(false);
      setName('');
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Client Companies</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">
          + New Company
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
            placeholder="Company name..."
            required
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
            Cancel
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(company => (
            <Link
              key={company.id}
              to={`/companies/${company.id}`}
              className="card hover:border-indigo-700 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-900 rounded-lg flex items-center justify-center font-bold text-indigo-300">
                  {company.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-slate-200">{company.name}</div>
                  <div className="text-xs text-slate-500">/{company.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge-${company.plan === 'PRO' ? 'green' : company.plan === 'STARTER' ? 'blue' : 'slate'}`}>
                  {company.plan}
                </span>
                <div className="text-xs text-slate-500">{company._count?.jobs || 0} jobs</div>
              </div>
            </Link>
          ))}
          {companies.length === 0 && (
            <div className="text-center py-8 text-slate-500">No companies yet</div>
          )}
        </div>
      )}
    </div>
  );
}
