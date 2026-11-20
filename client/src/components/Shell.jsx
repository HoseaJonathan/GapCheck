import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApi, api } from '../api.js';
import { useAuth } from '../auth.jsx';

const NAV = [
  { to: '/overview', label: 'Overview' },
  { to: '/modules', label: 'Modules' },
  { to: '/progress', label: 'Progress' },
  { to: '/puzzle', label: 'Puzzle' },
  { to: '/assessment', label: 'Assessment' },
];

/** Dev/demo only: the admin picks which level's path the whole app shows. A full reload refetches every screen. */
function AdminLevel({ level }) {
  const change = async (e) => {
    await api.setAdminLevel(e.target.value);
    window.location.assign('/overview');
  };
  return (
    <label className="chip" title="Admin: pilih jalur belajar" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap' }}>
      ADMIN
      <select value={level ?? ''} onChange={change} className="mono" aria-label="Jalur belajar admin"
        style={{ font: 'inherit', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
        <option value="new">NEW</option>
        <option value="beginner">BEGINNER</option>
        <option value="intermediate">INTERMEDIATE</option>
      </select>
    </label>
  );
}

export default function Shell() {
  const { data } = useApi(() => api.overview(), []);
  const streak = data?.puzzle?.streak_days ?? 0;
  const navigate = useNavigate();
  const { user } = useAuth();
  const initials = user?.profile?.initials ?? '··';

  async function logout() {
    await api.logout().catch(() => {});
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="wordmark"><span className="wordmark__mark" />gapcheck</div>
          <nav className="nav">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => (isActive ? 'is-active' : '')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="search"><span>Search</span><kbd>⌘K</kbd></div>
          {user?.is_admin ? <AdminLevel level={data?.level ?? user.level} /> : <span className="chip">{streak}-DAY STREAK</span>}
          <div className="avatar" title={user?.email}>{initials}</div>
          <button type="button" className="btn--link label" onClick={logout}>KELUAR</button>
        </div>
      </header>
      <main><Outlet /></main>
    </>
  );
}
