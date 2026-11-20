import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/** Shown while /me is answering, so a signed-in reload never flashes the login screen. */
export function SessionPending() {
  return <div className="page"><span className="label">MEMUAT SESI…</span></div>;
}

/**
 * Route guard for signed-in screens. A guest goes to /login, remembering where they
 * were headed so login can send them back. This only decides which screen renders:
 * the server still verifies the session on every protected request.
 */
export default function RequireAuth() {
  const { status, expired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SessionPending />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname, expired }} />;
  return <Outlet />;
}

/** Route guard for the landing, login, and register screens: a signed-in user goes to the app. */
export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <SessionPending />;
  if (status === 'authenticated') return <Navigate to="/overview" replace />;
  return <Outlet />;
}
