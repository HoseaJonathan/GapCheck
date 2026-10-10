import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const STEPS = [
  { title: 'Tes diagnostik', reason: 'Soal Easy, Medium, dan Hard dengan bobot 10, 20, dan 30 poin. Hint dimatikan selama tes.' },
  { title: 'Klasifikasi level', reason: 'Skor tertimbang menentukan level kamu: New, Beginner, atau Intermediate.' },
  { title: 'Jalur belajar', reason: 'Modul diurutkan dari topik yang paling menahan skor kamu.' },
];

const BANDS = [
  { level: 'NEW', range: '0–40', bloom: 'Remember', path: 'Fondasi JavaScript dan DOM' },
  { level: 'BEGINNER', range: '41–70', bloom: 'Understand', path: 'REST API dan React' },
  { level: 'INTERMEDIATE', range: '71–100', bloom: 'Apply · Analyze', path: 'Integrasi full-stack dan optimasi' },
];

// Demo account seeded by `npm run seed` (server/src/seed). Only offered in dev builds.
const DEMO = { email: 'hosea@gapcheck.test', password: 'password123' };

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (api.hasToken) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login(email.trim(), password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.status === 401
        ? 'Email atau password tidak cocok. Periksa lagi keduanya — kami tidak memberi tahu mana yang salah agar akun tetap aman.'
        : 'Server tidak merespons. Pastikan API berjalan di port 4000, lalu coba lagi.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="wordmark"><span className="wordmark__mark" />gapcheck</div>
          <span className="label" style={{ marginLeft: 'auto' }}>WEB-BASED ASSESSMENT · MERN</span>
        </div>
      </header>

      <main>
        <div className="page">
          <section className="section split">
            <div>
              <div className="label label--ink">SKILL GAP DIAGNOSTIC</div>
              <h1 style={{ marginTop: 8 }}>Ketahui seberapa jauh kamu dari Intermediate, lalu tutup celahnya satu modul per satu.</h1>
              <p style={{ marginTop: 12 }}>
                Gap Check mengukur kemampuan web development kamu dengan soal kode yang dijalankan sungguhan,
                bukan kuis tebak-tebakan. Setiap angka yang kamu lihat setelah masuk dihitung dari jawabanmu sendiri.
              </p>
              <div className="track" style={{ marginTop: 'var(--space-6)' }}>
                <div className="track__edge" style={{ left: '41%' }} />
                <div className="track__edge" style={{ left: '71%' }} />
              </div>
              <div className="track__labels">
                <span className="label">NEW 0–40</span>
                <span className="label">BEGINNER 41</span>
                <span className="label">INTERMEDIATE 71</span>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                {STEPS.map((s, i) => (
                  <div key={s.title} className="login-step">
                    <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.title}</div>
                      <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{s.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="login-panel">
              <div className="label label--ink">MASUK</div>
              <h2 style={{ marginTop: 8 }}>Lanjutkan dari posisi terakhir kamu</h2>
              <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
                Level, progres modul, dan riwayat submission tersimpan di akunmu.
              </p>

              <form className="stack" onSubmit={onSubmit} noValidate>
                <label className="field">
                  <span className="label">EMAIL</span>
                  <input className="input" type="email" autoComplete="email" required
                         value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@binus.ac.id" />
                </label>
                <label className="field">
                  <span className="label">PASSWORD</span>
                  <input className="input" type="password" autoComplete="current-password" required minLength={8}
                         value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" />
                </label>

                {error && <div className="callout" role="alert">{error}</div>}

                <button className="btn" type="submit" disabled={submitting || !email || !password}>
                  {submitting ? 'Memeriksa…' : 'Masuk'}
                </button>

                {import.meta.env.DEV && (
                  <button type="button" className="btn btn--ghost"
                          onClick={() => { setEmail(DEMO.email); setPassword(DEMO.password); }}>
                    Isi akun demo <span className="mono faint" style={{ marginLeft: 6 }}>{DEMO.email}</span>
                  </button>
                )}
              </form>
            </div>
          </section>

          <div className="band">
            <div className="band__inner login-bands">
              {BANDS.map((b) => (
                <div key={b.level} style={{ flex: 1 }}>
                  <div className="label" style={{ color: 'var(--code-key)' }}>{b.level} · <span className="mono">{b.range}</span></div>
                  <h2 style={{ color: 'var(--code-ink)', marginTop: 8 }}>{b.path}</h2>
                  <p style={{ color: 'var(--code-dim)', marginTop: 8, marginBottom: 0 }}>
                    Soal di level ini menguji tahap Bloom <span className="mono">{b.bloom}</span>.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
