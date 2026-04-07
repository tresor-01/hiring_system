import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬜' },
  { to: '/jobs', label: 'Jobs', icon: '💼' },
  { to: '/candidates', label: 'Candidates', icon: '👥' },
  { to: '/compare', label: 'Compare', icon: '⚖️' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/team', label: 'Team', icon: '🤝' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { user, company, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              H
            </div>
            <div>
              <div className="font-semibold text-slate-100 text-sm">HireAI</div>
              {company && <div className="text-xs text-slate-500 truncate max-w-[150px]">{company.name}</div>}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {user?.role === 'ADMIN' && (
            <NavLink
              to="/companies"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <span>🏢</span>
              <span>Companies</span>
            </NavLink>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-medium text-slate-300">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 truncate">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
              title="Logout"
            >
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
