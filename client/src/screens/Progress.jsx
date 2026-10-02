import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Bar, LineChart, Loading, Metric, Tile } from '../components/Bits.jsx';

const pct = (n) => `${Math.round(n * 100)}%`;

export default function Progress() {
  const { data, loading } = useApi(() => api.progress(), []);
  if (loading || !data) return <Loading />;

  const worstLast = [...data.topic_accuracy].sort((a, b) => b.accuracy - a.accuracy);
  const weakest = worstLast.at(-1);

  return (
    <div className="page">
      <h1>Progress</h1>

      <div className="tiles" style={{ marginTop: 'var(--space-6)' }}>
        <Tile label="WEIGHTED SCORE" caption={`Naik ${data.delta_since_previous} sejak Diagnostic 2, ${data.delta_since_first} sejak tes pertama.`}>
          <Metric value={data.weighted_score} unit="%" delta={data.delta_since_previous} />
        </Tile>
        <Tile label="LEVEL" caption={`${data.points_to_next_level} poin lagi ke Intermediate.`}>
          <span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{data.level.toUpperCase()}</span>
        </Tile>
        <Tile label="MODULES COMPLETED" caption={`Dari ${data.modules_total} modul di jalur kamu.`}>
          <Metric value={data.modules_completed} />
        </Tile>
        <Tile label="ACCEPTANCE RATE" caption="Submission yang lolos seluruh test case.">
          <Metric value={pct(data.acceptance_rate).replace('%', '')} unit="%" />
        </Tile>
      </div>

      <section className="section" style={{ marginTop: 'var(--space-7)' }}>
        <div className="section__head"><h2>Skor dari waktu ke waktu</h2></div>
        <LineChart points={data.sessions} threshold={data.intermediate_threshold} />
      </section>

      <hr className="rule" />

      <section className="section split">
        <div>
          <div className="label label--ink">ACCURACY BY TOPIC</div>
          <div className="stack" style={{ marginTop: 16 }}>
            {worstLast.map((t) => (
              <div key={t.topic}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="mono" style={{ fontSize: 'var(--text-sm)' }}>{t.topic}</span>
                  <span className={`mono faint${t.accuracy === 0 ? ' amber' : ''}`} style={{ fontSize: 'var(--text-sm)' }}>{pct(t.accuracy)}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Bar value={t.accuracy * 100} tone={t.accuracy < 0.5 ? 'amber' : 'green'} />
                </div>
              </div>
            ))}
          </div>
          {weakest?.callout && (
            <div className="callout" style={{ marginTop: 20 }}>
              {weakest.callout.text}{' '}
              <Link to={`/modules/${weakest.callout.module_id}`}>Buka modul yang menutup celah ini →</Link>
            </div>
          )}
        </div>

        <div>
          <div className="label label--ink">COGNITIVE LEVEL REACHED</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 16, alignItems: 'end', height: 140 }}>
            {data.bloom_levels.map((b) => (
              <div key={b.level} style={{ textAlign: 'center' }}>
                <div style={{
                  height: `${b.locked ? 8 : Math.max(b.accuracy * 100, 4)}px`,
                  background: b.locked ? 'var(--locked-soft)' : b.accuracy === 0 ? 'var(--amber-soft)' : 'var(--green)',
                  borderTop: b.locked ? '1px dashed var(--locked)' : 'none',
                }} />
                <div className="label" style={{ marginTop: 8, fontSize: 9 }}>{b.level.slice(0, 4).toUpperCase()}</div>
              </div>
            ))}
          </div>
          <p className="faint" style={{ fontSize: 'var(--text-sm)', marginTop: 12 }}>
            Evaluate dan Create terkunci — terbuka di level Intermediate.
          </p>
        </div>
      </section>

      <hr className="rule" />

      <section className="section">
        <div className="section__head"><h2>Recent submissions</h2></div>
        <table className="data">
          <thead>
            <tr>
              <th>Question</th><th>Difficulty</th><th>Verdict</th>
              <th>Runtime</th><th>Memory</th><th>Points</th><th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_submissions.map((s) => (
              <tr key={s._id}>
                <td>{s.question_title}</td>
                <td className="num faint">{s.difficulty}</td>
                <td className={`num${s.verdict === 'Accepted' ? ' green' : ' amber'}`}>{s.verdict}</td>
                <td className="num">{(s.runtime_ms / 1000).toFixed(2)} s</td>
                <td className="num faint">{(s.memory_kb / 1024).toFixed(1)} MB</td>
                <td className="num">{s.points_earned}</td>
                <td className="num faint">{new Date(s.submitted_at).toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
