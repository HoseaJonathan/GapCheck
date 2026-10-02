import { NavLink, Outlet } from 'react-router-dom';
import { useApi, api } from '../api.js';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/modules', label: 'Modules' },
  { to: '/progress', label: 'Progress' },
  { to: '/puzzle', label: 'Puzzle' },
  { to: '/assessment', label: 'Assessment' },
];

export default function Shell() {
  const { data } = useApi(() => api.overview(), []);
  const streak = data?.puzzle?.streak_days ?? 0;

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
          <span className="chip">{streak}-DAY STREAK</span>
          <div className="avatar">HJ</div>
        </div>
      </header>
      <main><Outlet /></main>
    </>
  );
}
