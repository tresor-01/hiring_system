import { useEffect, useState } from 'react';
import { teamApi } from '../api/team';
import { useAuthStore } from '../store/authStore';
import { TeamMember } from '../types';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'RECRUITER', password: '' });
  const [inviting, setInviting] = useState(false);

  const load = () => {
    teamApi.list()
      .then(setMembers)
      .catch(() => toast.error('Failed to load team'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await teamApi.invite(form.email, form.name, form.role, form.password);
      toast.success('Member added!');
      setShowInvite(false);
      setForm({ email: '', name: '', role: 'RECRUITER', password: '' });
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await teamApi.updateRole(memberId, role);
      setMembers(members.map(m => m.id === memberId ? { ...m, role: role as any } : m));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await teamApi.remove(memberId);
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'badge-red',
    RECRUITER: 'badge-blue',
    VIEWER: 'badge-slate'
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Team</h1>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowInvite(!showInvite)} className="btn-primary text-sm">
            + Add Member
          </button>
        )}
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="card space-y-4">
          <h2 className="font-medium text-slate-200">Add Team Member</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                required
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="Temporary password"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input"
              >
                <option value="RECRUITER">Recruiter</option>
                <option value="VIEWER">Viewer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={inviting} className="btn-primary">
              {inviting ? 'Adding...' : 'Add Member'}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className="card flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium text-slate-300">
                  {member.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-200">{member.user?.name}</div>
                  <div className="text-xs text-slate-500">{member.user?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={ROLE_COLORS[member.role] || 'badge-slate'}>{member.role}</span>
                {user?.role === 'ADMIN' && member.user?.id !== user.id && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded text-sm text-slate-300 px-2 py-1"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="RECRUITER">Recruiter</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-8 text-slate-500">No team members yet</div>
          )}
        </div>
      )}
    </div>
  );
}
