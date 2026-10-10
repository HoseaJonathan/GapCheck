import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Bar, Loading, ScoreTrack } from '../components/Bits.jsx';

export default function Overview() {
  const { data, loading } = useApi(() => api.overview(), []);
  if (loading || !data) return <Loading />;

  return (
    <div className="page">
      <section className="section">
        <h1>{data.headline}</h1>
        <p>
          {data.weighted_score === null ? (
            'Belum ada skor. Kerjakan diagnostik untuk melihat level dan jalur belajarmu.'
          ) : (
            <>
              Skor tertimbang kamu <span className="mono">{data.weighted_score}%</span>. Semua angka di
              halaman ini dihitung dari sesi diagnostik terakhir, bukan dari estimasi.
            </>
          )}
        </p>
        {data.weighted_score !== null && <ScoreTrack score={data.weighted_score} />}
      </section>

      <hr className="rule" />

      <section className="section split">
        <div>
          <div className="label label--ink">NEXT UP</div>
          {data.next_up ? (
            <>
              <h2 style={{ marginTop: 8 }}>{data.next_up.module.title}</h2>
              <p style={{ marginTop: 8 }}>{data.next_up.reason}</p>
              <div className="row">
                <span className="label">BLOOM: {data.next_up.module.bloom_level.toUpperCase()}</span>
                <span className="label">{data.next_up.module.estimated_minutes} MIN</span>
              </div>
              <div style={{ marginTop: 16 }}>
                <Link className="btn" to={`/modules/${data.next_up.module._id}`}>Buka modul</Link>
              </div>
            </>
          ) : data.level === null ? (
            <div style={{ marginTop: 8 }}>
              <Link className="btn" to="/assessment">Mulai diagnostik</Link>
            </div>
          ) : (
            // Has a level but nothing to open: sending them back to the diagnostic would loop.
            <p style={{ marginTop: 8 }}>Belum ada modul untuk jalur kamu.</p>
          )}
        </div>

        <div>
          <div className="label label--ink">IN PROGRESS</div>
          <div className="stack" style={{ marginTop: 12 }}>
            {data.in_progress.map((m) => (
              <div key={m._id}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Link to={`/modules/${m._id}`}>{m.title}</Link>
                  <span className="mono faint">{m.progress_percent}%</span>
                </div>
                <div style={{ marginTop: 6 }}><Bar value={m.progress_percent} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule" />

      <section className="section">
        <div className="section__head">
          <h2>Jalur belajar kamu</h2>
          <span className="label">{data.path_steps.reduce((a, s) => a + s.module_count, 0)} MODULES</span>
        </div>
        {data.path_steps.map((s, i) => (
          <div key={s.title} style={{ borderTop: '1px solid var(--rule)', padding: '16px 0', display: 'grid', gridTemplateColumns: '40px 1fr 90px', gap: 16 }}>
            <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{s.title}</div>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{s.reason}</div>
            </div>
            <span className="mono faint" style={{ textAlign: 'right' }}>{s.module_count} mod</span>
          </div>
        ))}
      </section>

      <div className="band">
        <div className="band__inner">
          <div style={{ flex: 1 }}>
            <div className="label" style={{ color: 'var(--code-key)' }}>DAILY PUZZLE · {data.puzzle.topic.toUpperCase()}</div>
            <h2 style={{ color: 'var(--code-ink)', marginTop: 8 }}>
              Streak <span className="mono">{data.puzzle.streak_days}</span> hari
            </h2>
            <p style={{ color: 'var(--code-dim)', marginTop: 8 }}>
              Puzzle hari ini bernilai <span className="mono">{data.puzzle.bonus_points}</span> poin bonus,
              diambil dari dua topik terlemah kamu.
            </p>
          </div>
          <div>
            <div className="week">
              {data.puzzle.week_strip.map((on, i) => <span key={i} className={`week__day${on ? ' is-on' : ''}`} />)}
            </div>
            <div style={{ marginTop: 16 }}><Link className="btn" to="/puzzle">Kerjakan</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}
