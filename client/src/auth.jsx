import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

/**
 * status: 'loading' until /me answers on page load, then 'authenticated' or 'guest'.
 * expired is true when a session ended on its own (revoked, or past its refresh
 * lifetime) rather than by pressing Keluar, so the login screen can say why.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, expired: false });

  useEffect(() => {
    const off = api.onUserChange((user, reason) => setState({
      status: user ? 'authenticated' : 'guest',
      user,
      expired: reason === 'expired',
    }));
    api.restoreSession();
    return off;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
