import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api, pathMessage, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

export default function ModuleScreen() {
  const { id } = useParams();
  // key resets the quiz state when navigating between modules.
  return id ? <ModuleView key={id} id={id} /> : <ModuleRedirect />;
}

/** /modules without an id: the server decides which module comes first, so no id is hardcoded here. */
function ModuleRedirect() {
  const { data, loading } = useApi(() => api.overview(), []);
  if (loading || !data) return <Loading />;
  if (data.next_up) return <Navigate replace to={`/modules/${data.next_up.module._id}`} />;
  // Only a learner without a level still needs the diagnostic; one with a level would just come back here.
  if (data.level === null) return <Navigate replace to="/assessment" />;
  return <div className="page"><p>{pathMessage(data)}</p></div>;
}

const isModuleLocked = (e) => e?.status === 403 && e.body?.reason === 'module_locked';

function ModuleView({ id }) {
  const [rev, setRev] = useState(0);
  const { data, loading } = useApi(() => api.module(id), [id, rev]);
  const [forcedLocked, setForcedLocked] = useState(false);
  const started = useRef(null);

  // start is idempotent on the server, but the ref keeps it to one call per module id (StrictMode runs effects twice).
  const isOpen = Boolean(data) && !data.module.locked && !forcedLocked;
  useEffect(() => {
    if (!isOpen || started.current === id) return;
    started.current = id;
    api.startModule(id).catch((e) => { if (isModuleLocked(e)) setForcedLocked(true); });
  }, [isOpen, id]);

  if (loading || !data) return <Loading />;

  const m = data.module;
  const locked = m.locked || forcedLocked;

  // Neighbours come from the sibling order; a locked module is not a valid target.
  const pos = data.siblings.findIndex((s) => s._id === m._id);
  const open = (s) => (s && !s.locked ? s : null);
  const prev = open(data.siblings[pos - 1]);
  const next = open(data.siblings[pos + 1]);

  return (
    <div className="page" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-7)' }}>
      <aside>
        <div className="label label--ink">MODULES</div>
        <div className="stack" style={{ marginTop: 12 }}>
          {data.siblings.map((s) => {
            const current = s._id === m._id;
            return (
              <div key={s._id} style={{ fontSize: 'var(--text-sm)' }}>
                {s.locked ? (
                  <span className="locked">{String(s.order).padStart(2, '0')} · {s.title}</span>
                ) : (
                  <Link to={`/modules/${s._id}`} style={{ color: current ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: current ? 600 : 400 }}>
                    {String(s.order).padStart(2, '0')} · {s.title}
                  </Link>
                )}
                {s.locked && <div className="label" style={{ fontSize: 9, marginTop: 2 }}>{s.unlock_hint}</div>}
                {s.state === 'completed' && <span className="label label--green" style={{ marginLeft: 6 }}>SELESAI</span>}
              </div>
            );
          })}
        </div>
      </aside>

      {locked ? <LockedNotice module={m} /> : (
        <article>
          <div className="label label--ink">
            MODULE {String(m.order).padStart(2, '0')} · BLOOM: {m.bloom_level.toUpperCase()}
            {m.flagged_by_diagnostic && ' · FLAGGED BY YOUR DIAGNOSTIC'}
          </div>
          <h1 style={{ marginTop: 10 }}>{m.title}</h1>

          <div style={{ marginTop: 'var(--space-5)' }}>
            {(m.body || []).map((block, i) => {
              if (block.type === 'lead') return <p key={i} style={{ fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>{block.text}</p>;
              if (block.type === 'text') return <p key={i}>{block.text}</p>;
              if (block.type === 'callout') return <div key={i} className="callout" style={{ margin: '0 0 var(--space-4)' }}>{block.text}</div>;
              return (
                <div key={i}>
                  <div className="label">{block.label}</div>
                  <pre className="code" style={{ marginTop: 8 }}>{block.code}</pre>
                </div>
              );
            })}
            {/* The schema defaults body to [], so an unwritten module arrives as an empty array, not undefined. */}
            {!m.body?.length && <p>Materi modul ini belum ditulis di prototype.</p>}
          </div>

          {m.quiz?.length > 0 && (
            // Refetched after every graded attempt so quiz_status stays current. useApi keeps the old data
            // while refetching, so Quiz stays mounted and its result (pass review or fail message) survives.
            <Quiz module={m} onLocked={() => setForcedLocked(true)} onGraded={() => setRev((r) => r + 1)} />
          )}

          <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
            {prev ? <Link className="muted" to={`/modules/${prev._id}`}>← Modul sebelumnya</Link> : <span />}
            {next ? <Link className="muted" to={`/modules/${next._id}`}>Modul berikutnya →</Link> : <span />}
          </div>
        </article>
      )}
    </div>
  );
}

/** A locked module shows no content: only why it is locked and where to go instead. */
function LockedNotice({ module: m }) {
  const { data } = useApi(() => api.overview(), []);
  const target = data?.next_up?.module;
  return (
    <article>
      <div className="label label--ink">MODULE {String(m.order).padStart(2, '0')} · TERKUNCI</div>
      <h1 style={{ marginTop: 10 }}>{m.title}</h1>
      <div className="callout" style={{ marginTop: 'var(--space-5)' }}>{m.unlock_hint}</div>
      {target && (
        <div style={{ marginTop: 16 }}>
          <Link to={`/modules/${target._id}`}>Ke modul berikutnya</Link>
        </div>
      )}
    </article>
  );
}

/** review[i] aligns with quiz[i]; falls back to the bare letter if the option is not found. */
function optionLabel(item, k) {
  const text = item?.options?.find((o) => o.key === k)?.text;
  return text === undefined ? k : `${k.toUpperCase()}. ${text}`;
}

function Quiz({ module: m, onLocked, onGraded }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const answered = m.quiz.every((_, i) => answers[i]);
  const passed = result?.passed === true;
  const failed = result !== null && !result.passed;
  const status = m.quiz_status;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitQuiz(m._id, m.quiz.map((_, i) => answers[i]));
      setResult(res);
      onGraded();
    } catch (e) {
      if (isModuleLocked(e)) onLocked();
      else setError('Jawaban belum terkirim. Coba lagi.');
    } finally { setBusy(false); }
  };
  const retry = () => { setAnswers({}); setResult(null); };

  return (
    <section className="section" style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--space-5)' }}>
      <div className="label label--ink">CHECK YOUR UNDERSTANDING</div>
      {status && (
        <p className="muted" style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
          Percobaan: {status.attempts} · Skor terbaik: {status.best_score === null ? '-' : `${Math.round(status.best_score * 100)}%`}
        </p>
      )}

      {!passed && m.quiz.map((q, i) => (
        <div key={i} style={{ marginTop: 16 }}>
          <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{i + 1}. {q.question}</p>
          <div className="stack">
            {q.options.map((o) => {
              const picked = answers[i] === o.key;
              return (
                <button key={o.key} disabled={busy || failed} aria-pressed={picked}
                  onClick={() => setAnswers((a) => ({ ...a, [i]: o.key }))}
                  style={{ textAlign: 'left', background: picked ? 'var(--green-soft)' : 'transparent', border: `1px solid ${picked ? 'var(--green)' : 'var(--rule)'}`, borderRadius: 6, padding: '10px 14px', cursor: 'pointer', font: 'inherit' }}>
                  <span className="mono faint" style={{ marginRight: 10 }}>{o.key.toUpperCase()}</span>{o.text}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {result === null && (
        <div style={{ marginTop: 16 }}>
          <button className="btn" disabled={!answered || busy} onClick={submit}>Kirim jawaban</button>
        </div>
      )}
      {error && <div className="callout" style={{ marginTop: 16 }}>{error}</div>}

      {failed && (
        <>
          <div className="callout" style={{ marginTop: 16 }}>
            {`Skor ${result.correct_count}/${result.total} (${Math.round(result.score * 100)}%) — butuh 70%. Baca ulang materi lalu coba lagi.`}
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={retry}>Coba lagi</button>
          </div>
        </>
      )}

      {passed && (
        <>
          <div className="callout callout--green" style={{ marginTop: 16 }}>
            {`Skor ${result.correct_count}/${result.total} (${Math.round(result.score * 100)}%) — lulus.`}
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            {(result.review || []).map((r, i) => (
              <div key={i}>
                <p style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{i + 1}. {r.question}</p>
                <p className="muted">Jawaban kamu: {optionLabel(m.quiz[i], r.your_answer)}</p>
                <p className="muted">Jawaban benar: {optionLabel(m.quiz[i], r.correct_answer)}</p>
                <p>{r.explanation}</p>
              </div>
            ))}
          </div>
          {result.next_module_id && (
            <div style={{ marginTop: 16 }}>
              <Link className="btn" to={`/modules/${result.next_module_id}`}>Lanjut ke modul berikutnya</Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
