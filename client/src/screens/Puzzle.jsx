import { useState } from 'react';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

const hhmm = (s) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

export default function Puzzle() {
  const { data, loading } = useApi(() => api.puzzle(), []);
  const [choice, setChoice] = useState(null);
  if (loading || !data) return <Loading />;

  const p = data.puzzle;
  const picked = choice ?? (p.solved ? p.chosen : null);

  return (
    <div className="page" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-7)' }}>
      <div>
        <div className="row" style={{ gap: 'var(--space-4)' }}>
          <span className="label label--ink">{p.date}</span>
          <span className="label">{p.level.toUpperCase()}</span>
          <span className="label">{p.topic.toUpperCase()}</span>
          <span className="label label--green">+{p.bonus_points} BONUS</span>
        </div>
        <h1 style={{ marginTop: 12 }}>Daily puzzle</h1>

        {p.solved && (
          <div className="callout callout--green" style={{ marginTop: 16 }}>
            Selesai dalam <span className="mono">{p.solve_time_seconds}s</span> · streak{' '}
            <span className="mono">{p.streak_days}</span> hari. Bonus tidak pernah menurunkan level kamu.
          </div>
        )}

        <p style={{ marginTop: 20 }}>{p.prompt}</p>
        <pre className="code">{p.buggy_code}</pre>

        <div className="stack">
          {p.options.map((o) => {
            const isPicked = picked === o.key;
            const correct = o.key === p.correct_answer;
            const tone = !isPicked ? 'var(--rule)' : correct ? 'var(--green)' : 'var(--amber)';
            return (
              <button key={o.key} onClick={() => setChoice(o.key)}
                style={{ textAlign: 'left', background: 'transparent', border: `1px solid ${tone}`, borderRadius: 6, padding: '10px 14px', cursor: 'pointer', font: 'inherit' }}>
                <span className="mono faint" style={{ marginRight: 10 }}>{o.key.toUpperCase()}</span>{o.text}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="callout callout--green" style={{ marginTop: 16 }}>{p.explanation}</div>
        )}
      </div>

      <aside>
        <div className="label label--ink">THIS WEEK</div>
        <div className="week" style={{ marginTop: 10 }}>
          {p.week_strip.map((on, i) => (
            <span key={i} className="week__day" style={{ background: on ? 'var(--green)' : 'var(--locked-soft)' }} />
          ))}
        </div>
        <div className="faint mono" style={{ fontSize: 'var(--text-sm)', marginTop: 10 }}>
          Reset berikutnya {hhmm(p.next_reset_in_seconds)}
        </div>

        <hr className="rule" />
        <div className="label label--ink">TOTAL BONUS POINTS</div>
        <div className="metric" style={{ fontSize: 'var(--text-xl)', marginTop: 8 }}>{p.total_bonus_points}</div>

        <div className="label label--ink" style={{ marginTop: 24 }}>BONUS BY TOPIC</div>
        <div className="stack" style={{ marginTop: 10 }}>
          {p.bonus_by_topic.map((t) => (
            <div key={t.topic} className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
              <span className="mono">{t.topic}</span><span className="mono faint">{t.points}</span>
            </div>
          ))}
        </div>

        <div className="label label--ink" style={{ marginTop: 24 }}>RECENT</div>
        <div className="stack" style={{ marginTop: 10 }}>
          {p.recent.map((r) => (
            <div key={r.date} className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
              <span className="mono faint">{r.date}</span>
              <span className="mono">{r.solve_time_seconds}s</span>
              <span className={`mono ${r.misses ? 'amber' : 'faint'}`}>{r.misses} miss</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
