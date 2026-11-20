import { Link } from 'react-router-dom';
import GuestHeader from '../components/GuestHeader.jsx';

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

/** Public landing page. Content carried over unchanged from the old login screen; its redesign is a later phase. */
export default function Landing() {
  return (
    <>
      <GuestHeader />
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
              <div className="label label--ink">MULAI</div>
              <h2 style={{ marginTop: 8 }}>Buat akun, lalu kerjakan tes diagnostik pertamamu</h2>
              <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
                Level, progres modul, dan riwayat submission tersimpan di akunmu.
              </p>
              <div className="stack">
                <Link className="btn" to="/register">Daftar</Link>
                <Link className="btn btn--ghost" to="/login">Sudah punya akun? Masuk</Link>
              </div>
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
