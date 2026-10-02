const BASE = '/api';
let token = localStorage.getItem('gc_token') || null;

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw Object.assign(new Error(`${res.status}`), { status: res.status, body: await res.json().catch(() => ({})) });
  return res.json();
}

export const api = {
  get hasToken() { return Boolean(token); },
  async login(email = 'hosea@gapcheck.test', password = 'password123') {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem('gc_token', token);
    return data.user;
  },
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
import { useEffect, useState } from 'react';
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!api.hasToken) await api.login();
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
