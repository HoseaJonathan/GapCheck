import { useEffect, useState } from 'react';

const BASE = '/api';
const TOKEN_KEY = 'gc_token';
const USER_KEY = 'gc_user';

let token = localStorage.getItem(TOKEN_KEY) || null;

function readUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

function clearSession() {
  token = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  // An expired or invalid token on a protected route ends the session.
  // The login call itself returns 401 for bad credentials, so it is excluded.
  if (res.status === 401 && path !== '/auth/login') {
    clearSession();
    window.location.assign('/login');
  }
  if (!res.ok) throw Object.assign(new Error(`${res.status}`), { status: res.status, body: await res.json().catch(() => ({})) });
  return res.json();
}

export const api = {
  get hasToken() { return Boolean(token); },
  get user() { return readUser(); },
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  },
  logout: clearSession,
  overview: () => request('/overview'),
  progress: () => request('/progress'),
  result: () => request('/result'),
  questions: (difficulty) => request(`/questions${difficulty ? `?difficulty=${difficulty}` : ''}`),
  modules: () => request('/modules'),
  module: (id) => request(`/modules/${id}`),
  puzzle: () => request('/puzzle'),
  submit: (payload) => request('/submit', { method: 'POST', body: JSON.stringify(payload) }),
};

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
