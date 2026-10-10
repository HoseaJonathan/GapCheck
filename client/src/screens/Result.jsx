import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Loading, ScoreTrack } from '../components/Bits.jsx';

const ROWS = [['easy', 'EASY'], ['medium', 'MEDIUM'], ['hard', 'HARD']];

export default function Result() {
  const { data, loading } = useApi(() => api.result(), []);
  if (loading || !data) return <Loading />;

  // A user who has not finished a diagnostic has no result yet; every field below would be undefined.
  if (data.result === null) {
    return (
      <div className="page">
        <h1>Belum ada hasil diagnostik.</h1>
        <p style={{ marginTop: 12 }}>Selesaikan satu sesi diagnostik dulu, lalu level dan jalur belajarmu akan muncul di sini.</p>
        <div style={{ marginTop: 20 }}><Link className="btn" to="/assessment">Mulai diagnostik</Link></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="label label--ink">DIAGNOSTIC RESULT</div>
      <h1 style={{ marginTop: 8 }}>
        {data.level.toUpperCase()} <span className="mono faint" style={{ fontSize: 'var(--text-xl)' }}>{data.percentage}%</span>
      </h1>
      <ScoreTrack score={data.percentage} />
      <p style={{ marginTop: 'var(--space-5)' }}>{data.narrative.summary}</p>

      <hr className="rule" />

      <section className="section">
        <div className="section__head"><h2>Bagaimana skor ini didapat</h2>
          <span className="label">PARTIAL CREDIT PER TEST CASE</span></div>
        <table className="data">
          <thead><tr><th>Difficulty</th><th>Benar</th><th>Poin</th><th>Kontribusi</th></tr></thead>
          <tbody>
            {ROWS.map(([key, label]) => {
              const d = data.byDifficulty[key];
              return (
                <tr key={key}>
                  <td className="num">{label}</td>
                  <td className="num">{d.correct} / {d.total}</td>
                  <td className="num">{d.earned} / {d.possible}</td>
                  <td className="num faint">{d.possible ? ((d.earned / data.possiblePoints) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              );
            })}
            <tr>
              <td className="num" style={{ fontWeight: 700 }}>TOTAL</td>
              <td />
              <td className="num" style={{ fontWeight: 700 }}>{data.earnedPoints} / {data.possiblePoints}</td>
              <td className="num" style={{ fontWeight: 700 }}>{data.percentage}%</td>
            </tr>
          </tbody>
        </table>
        {/* null means already Intermediate: there is no next level to count down to. */}
        {data.pointsToNextLevel !== null && (
          <p className="faint" style={{ fontSize: 'var(--text-sm)', marginTop: 12 }}>
            <span className="mono">71 − {data.percentage} = {data.pointsToNextLevel}</span> poin lagi ke Intermediate.
          </p>
        )}
      </section>

      <hr className="rule" />

      <section className="section cols-2">
        <div>
          <div className="label label--green">SOLID GROUND</div>
          <ul className="stack" style={{ marginTop: 12, paddingLeft: 18 }}>
            {data.narrative.solid.map((t) => <li key={t} className="muted">{t}</li>)}
          </ul>
        </div>
        <div>
          <div className="label label--amber">WHERE THE GAPS ARE</div>
          <ul className="stack" style={{ marginTop: 12, paddingLeft: 18 }}>
            {data.narrative.gaps.map((t) => <li key={t} className="muted">{t}</li>)}
          </ul>
        </div>
      </section>

      <hr className="rule" />

      <section className="section">
        <div className="section__head"><h2>{data.learning_path.title}</h2>
          <span className="label">JALUR YANG DITUGASKAN</span></div>
        {data.learning_path.steps.map((s, i) => (
          <div key={s.title} style={{ borderTop: '1px solid var(--rule)', padding: '16px 0', display: 'grid', gridTemplateColumns: '40px 1fr 90px', gap: 16 }}>
            <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{s.title}</div>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{s.reason}</div>
            </div>
            <span className="mono faint" style={{ textAlign: 'right' }}>{s.module_count} mod</span>
          </div>
        ))}
        <div style={{ marginTop: 20 }}><Link className="btn" to="/">Mulai belajar</Link></div>
      </section>
    </div>
  );
}
