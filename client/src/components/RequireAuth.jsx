import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api.js';

/**
 * Route guard. No token -> /login, remembering where the user was headed so
 * login can send them back. The server still verifies the JWT on every
 * protected request; this guard only decides which screen to render.
 */
export default function RequireAuth() {
  const location = useLocation();
  if (!api.hasToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
