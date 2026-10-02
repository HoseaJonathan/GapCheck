import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

export default function ModuleScreen() {
  const { id = 'm04' } = useParams();
  const { data, loading } = useApi(() => api.module(id), [id]);
  const [choice, setChoice] = useState(null);
  if (loading || !data) return <Loading />;

  const m = data.module;
  const quiz = m.quiz?.[0];

  return (
    <div className="page" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-7)' }}>
      <aside>
        <div className="label label--ink">MODULES</div>
        <div className="stack" style={{ marginTop: 12 }}>
          {data.siblings.map((s) => {
            const locked = s.unlock_rule === 'locked';
            const current = s._id === m._id;
            return (
              <div key={s._id} style={{ fontSize: 'var(--text-sm)' }}>
                {locked ? (
                  <span className="locked">{String(s.order).padStart(2, '0')} · {s.title}</span>
                ) : (
                  <Link to={`/modules/${s._id}`} style={{ color: current ? 'var(--ink)' : 'var(--ink-muted)', fontWeight: current ? 600 : 400 }}>
                    {String(s.order).padStart(2, '0')} · {s.title}
                  </Link>
                )}
                {locked && <div className="label" style={{ fontSize: 9, marginTop: 2 }}>{s.unlock_hint}</div>}
                {s.progress_percent === 100 && <span className="label label--green" style={{ marginLeft: 6 }}>DONE</span>}
              </div>
            );
          })}
        </div>
      </aside>

      <article>
        <div className="label label--ink">
          MODULE {String(m.order).padStart(2, '0')} · BLOOM: {m.bloom_level.toUpperCase()}
          {m.flagged_by_diagnostic && ' · FLAGGED BY YOUR DIAGNOSTIC'}
        </div>
        <h1 style={{ marginTop: 10 }}>{m.title}</h1>

        <div style={{ marginTop: 'var(--space-5)' }}>
          {(m.body || []).map((block, i) => {
            if (block.type === 'lead') return <p key={i} style={{ fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>{block.text}</p>;
            if (block.type === 'callout') return <div key={i} className="callout" style={{ margin: '0 0 var(--space-4)' }}>{block.text}</div>;
            return (
              <div key={i}>
                <div className="label">{block.label}</div>
                <pre className="code" style={{ marginTop: 8 }}>{block.code}</pre>
              </div>
            );
          })}
          {!m.body && <p>Materi modul ini belum ditulis di prototype.</p>}
        </div>

        {quiz && (
          <section className="section" style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--space-5)' }}>
            <div className="label label--ink">CHECK YOUR UNDERSTANDING</div>
            <p style={{ marginTop: 12, color: 'var(--ink)' }}>{quiz.question}</p>
            <div className="stack">
              {quiz.options.map((o) => {
                const picked = choice === o.key;
                const correct = o.key === quiz.correct_answer;
                const tone = !picked ? 'var(--rule)' : correct ? 'var(--green)' : 'var(--amber)';
                return (
                  <button key={o.key} onClick={() => setChoice(o.key)}
                    style={{ textAlign: 'left', background: 'transparent', border: `1px solid ${tone}`, borderRadius: 6, padding: '10px 14px', cursor: 'pointer', font: 'inherit' }}>
                    <span className="mono faint" style={{ marginRight: 10 }}>{o.key.toUpperCase()}</span>{o.text}
                  </button>
                );
              })}
            </div>
            {choice && (
              <div className={`callout${choice === quiz.correct_answer ? ' callout--green' : ''}`} style={{ marginTop: 16 }}>
                {choice === quiz.correct_answer
                  ? 'Benar. Kuis modul lulus di 70% — satu percobaan per soal.'
                  : 'Belum tepat. Baca ulang bagian "Sesudah" di atas.'}
              </div>
            )}
          </section>
        )}

        <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
          <Link className="muted" to="/modules/m02">← Modul sebelumnya</Link>
          <Link className="muted" to="/modules/m07">Modul berikutnya →</Link>
        </div>
      </article>
    </div>
  );
}
