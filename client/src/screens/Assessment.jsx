import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Assessment() {
  const { data, loading } = useApi(() => api.questions(), []);
  const [index, setIndex] = useState(0);
  const [code, setCode] = useState('');
  const [dirty, setDirty] = useState(false);
  const [run, setRun] = useState(null);
  const [left, setLeft] = useState(0);

  const questions = useMemo(() => data?.questions ?? [], [data]);
  const q = questions[index];

  useEffect(() => { if (data) setLeft(data.session_duration_seconds); }, [data]);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (q) { setCode(q.base_code || ''); setDirty(false); setRun(null); } }, [q]);

  if (loading || !q) return <Loading />;

  const runTests = async () => {
    const res = await api.submit({ question_id: q._id, submitted_code: code });
    setRun(res);
    setDirty(false);
  };

  return (
    <div className="assess">
      <header className="assess__head">
        <div className="wordmark"><span className="wordmark__mark" />gapcheck</div>
        <span className="label label--ink">DIAGNOSTIC</span>
        <span className="mono faint" style={{ fontSize: 'var(--text-sm)' }}>
          {String(index + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
        </span>
        <div className="dots">
          {questions.map((_, i) => (
            <span key={i} className={`dot${i < index ? ' is-done' : i === index ? ' is-current' : ''}`} />
          ))}
        </div>
        <span className="mono" style={{ marginLeft: 'auto' }}>{mmss(left)}</span>
        <Link className="btn btn--ghost" to="/">Save and exit</Link>
      </header>

      <div className="assess__body">
        <div className="assess__left">
          <div className="row" style={{ gap: 'var(--space-4)' }}>
            <span className="label label--ink">{q.difficulty.toUpperCase()}</span>
            <span className="label">{q.points} PTS</span>
            <span className="label">{(q.tags || [])[0]?.toUpperCase()}</span>
            <span className="label">BLOOM: {q.bloom_level.toUpperCase()}</span>
          </div>
          <h2 style={{ marginTop: 12 }}>{q.title}</h2>
          <p style={{ marginTop: 10 }}>{q.description}</p>

          {q.requirements && (
            <>
              <div className="label label--ink">REQUIREMENTS</div>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {q.requirements.map((r) => <li key={r} className="muted" style={{ fontSize: 'var(--text-sm)' }}>{r}</li>)}
              </ul>
            </>
          )}

          {q.sample && (
            <>
              <div className="label label--ink" style={{ marginTop: 20 }}>SAMPLE</div>
              <pre className="code" style={{ marginTop: 8 }}>{`${q.sample.request}\n// -> ${q.sample.expected}`}</pre>
            </>
          )}

          <div className="callout" style={{ marginTop: 20 }}>
            Hint dimatikan selama diagnostik berlangsung — bantuan akan membuat level yang dihasilkan tidak mencerminkan kemampuan.
          </div>
        </div>

        <div className="assess__right">
          <div className="tabs">
            <span className="tab is-active">solution.js{dirty ? ' ●' : ''}</span>
            <span className="tab">README.md</span>
            <span className="tab" style={{ marginLeft: 'auto' }}>NODE 20 · JUDGE0</span>
          </div>

          <div className="editor">
            <div className="editor__gutter">
              {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea className="editor__area" spellCheck={false} value={code}
              onChange={(e) => { setCode(e.target.value); setDirty(true); }} />
          </div>

          <div className="cases">
            <div className="label" style={{ color: 'var(--code-dim)' }}>TEST CASES</div>
            {(run?.cases?.length ? run.cases : (q.test_cases || []).map((c) => ({ name: c.name, passed: null, runtime_ms: null }))).map((c, i) => (
              <div key={c.name} className="case">
                <span className={`case__state${c.passed === true ? ' is-pass' : c.passed === false ? ' is-fail' : ''}`} />
                <span>CASE {String(i + 1).padStart(2, '0')} · {c.name}</span>
                <span style={{ marginLeft: 'auto' }}>{c.runtime_ms != null ? `${c.runtime_ms} ms` : '—'}</span>
              </div>
            ))}
            {q.hidden_case_count > 0 && (
              <div className="case"><span className="case__state" />
                <span>+ {q.hidden_case_count} hidden case</span></div>
            )}
            {run && (
              <div className="case" style={{ marginTop: 8, color: run.verdict === 'Accepted' ? 'var(--code-key)' : '#c9803f' }}>
                {run.verdict} · {run.points_earned} pts · {(run.runtime_ms / 1000).toFixed(2)} s
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="assess__foot">
        <button className="btn btn--ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</button>
        <button className="btn btn--ghost" onClick={runTests}>Run tests</button>
        <button className="btn" style={{ marginLeft: 'auto' }}
          onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))}>
          Submit and continue
        </button>
      </footer>
    </div>
  );
}
