import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import GuestHeader from '../components/GuestHeader.jsx';

// Demo account seeded by `npm run seed` (server/src/seed). Only offered in dev builds.
const DEMO = { email: 'hosea@gapcheck.test', password: 'password123' };

function loginError(err) {
  if (err.status === 401) {
    return 'Email atau password tidak cocok. Periksa lagi keduanya — kami tidak memberi tahu mana yang salah agar akun tetap aman.';
  }
  if (err.status === 400) return 'Isi email dan password terlebih dahulu.';
  if (err.status === 429) {
    const minutes = Math.ceil((err.body?.retry_after_seconds ?? 900) / 60);
    return `Terlalu banyak percobaan gagal untuk email ini. Coba lagi dalam ${minutes} menit.`;
  }
  return 'Server tidak merespons. Pastikan API berjalan di port 4000, lalu coba lagi.';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login(email.trim(), password);
      navigate(location.state?.from || '/overview', { replace: true });
    } catch (err) {
      setError(loginError(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      <GuestHeader />
      <main>
        <div className="page">
          <section className="section auth-page">
            <div className="label label--ink">MASUK</div>
            <h2 style={{ marginTop: 8 }}>Lanjutkan dari posisi terakhir kamu</h2>
            <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
              Level, progres modul, dan riwayat submission tersimpan di akunmu.
            </p>

            {location.state?.expired && (
              <div className="callout" role="status">
                Sesi kamu sudah berakhir. Masuk lagi untuk melanjutkan dari halaman tadi.
              </div>
            )}

            <form className="stack" onSubmit={onSubmit} noValidate>
              <label className="field">
                <span className="label">EMAIL</span>
                <input className="input" type="email" autoComplete="email" required
                       value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@binus.ac.id" />
              </label>
              <label className="field">
                <span className="label">PASSWORD</span>
                <input className="input" type="password" autoComplete="current-password" required
                       value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
              </label>

              {error && <div className="callout" role="alert">{error}</div>}

              <button className="btn" type="submit" disabled={submitting || !email.trim() || !password}>
                {submitting ? 'Memeriksa…' : 'Masuk'}
              </button>

              {import.meta.env.DEV && (
                <button type="button" className="btn btn--ghost"
                        onClick={() => { setEmail(DEMO.email); setPassword(DEMO.password); }}>
                  Isi akun demo <span className="mono faint" style={{ marginLeft: 6 }}>{DEMO.email}</span>
                </button>
              )}
            </form>

            <p style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
              Belum punya akun? <Link to="/register">Daftar</Link>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
