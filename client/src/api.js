import { useEffect, useState } from 'react';

const BASE = '/api';

/*
 * Tokens live only in httpOnly cookies the server sets; this file never sees them,
 * so nothing an injected script reads from the page can be replayed as a login.
 * The signed-in user's public profile is kept in memory and re-read from /me on load.
 */
let currentUser = null;
const listeners = new Set();

// Earlier builds kept the JWT in localStorage; drop any copy left behind.
try {
  localStorage.removeItem('gc_token');
  localStorage.removeItem('gc_user');
} catch { /* storage blocked: nothing to clean */ }

/** reason says why the user changed: 'login', 'logout', 'restore', 'expired' or 'update'. */
function setUser(user, reason) {
  currentUser = user;
  listeners.forEach((fn) => fn(user, reason));
}

async function send(path, options) {
  return fetch(BASE + path, {
    ...options,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...options.headers },
  });
}

// One refresh at a time: screens that fire several requests together share it,
// so a rotated refresh token is never presented twice by the same tab.
let refreshing = null;
function refreshSession() {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function request(path, options = {}) {
  let res = await send(path, options);
  // The access token lasts 15 minutes; on a 401 try one refresh, then the original call again.
  // /auth/* answers its own 401s (bad password, dead refresh token), so those are not retried.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await send(path, options);
    // Still 401: the session is over (logged out elsewhere, revoked, or past 7 days).
    if (res.status === 401 && currentUser) setUser(null, 'expired');
  }
  if (!res.ok) throw Object.assign(new Error(`${res.status}`), { status: res.status, body: await res.json().catch(() => ({})) });
  return res.status === 204 ? null : res.json();
}

export const api = {
  /** Public profile of the signed-in user, or null. Filled by restoreSession() before protected screens render. */
  get user() { return currentUser; },
  /** Calls fn(user, reason) whenever the session starts or ends; returns the unsubscribe function. */
  onUserChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  /** On page load: asks the server who the cookies belong to. Resolves to the user or null. */
  async restoreSession() {
    try {
      setUser(await request('/me'), 'restore');
    } catch {
      setUser(null, 'restore');
    }
    return currentUser;
  },
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(data.user, 'login');
    return data.user;
  },
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  async logout() {
    // The server revokes the session and clears the cookies; the local state ends even if it is unreachable.
    try { await request('/auth/logout', { method: 'POST' }); } finally { setUser(null, 'logout'); }
  },
  overview: () => request('/overview'),
  progress: () => request('/progress'),
  result: () => request('/result'),
  questions: (difficulty) => request(`/questions${difficulty ? `?difficulty=${difficulty}` : ''}`),
  modules: () => request('/modules'),
  paths: () => request('/paths'),
  path: (level) => request(`/paths/${level}`),
  module: (id) => request(`/modules/${id}`),
  puzzle: () => request('/puzzle'),
  startSession: () => request('/sessions', { method: 'POST' }),
  finishSession: (id) => request(`/sessions/${id}/finish`, { method: 'POST' }),
  startModule: (id) => request(`/modules/${id}/start`, { method: 'POST' }),
  submitQuiz: (id, answers) => request(`/modules/${id}/quiz/attempts`, { method: 'POST', body: JSON.stringify({ answers }) }),
  quizAttempts: (id) => request(`/modules/${id}/quiz/attempts`),
  submit: (payload) => request('/submit', { method: 'POST', body: JSON.stringify(payload) }),
  /** Admin (dev/demo) only: moves the admin to another level's learning path. */
  async setAdminLevel(level) {
    const data = await request('/admin/level', { method: 'PATCH', body: JSON.stringify({ level }) });
    setUser({ ...currentUser, level: data.level }, 'update');
    return data;
  },
};

/**
 * Overview text for a learner with a level but no next_up: either every module on
 * the path is done, or the path has no modules at all.
 */
export const pathMessage = (overview) =>
  overview.path_steps?.some((s) => s.module_count > 0)
    ? 'Semua modul di jalur kamu sudah selesai.'
    : 'Belum ada modul untuk jalur kamu.';

/** Small hook so every screen has the same loading/error shape. */
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fn();
        if (alive) setState({ loading: false, data, error: null });
      } catch (error) {
        if (alive) setState({ loading: false, data: null, error });
      }
    })();
    return () => { alive = false; };
  }, deps);
  return state;
}
