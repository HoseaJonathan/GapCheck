import { Link, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';
import References from '../components/References.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
const isModuleLocked = (e) => e?.status === 403 && e.body?.reason === 'module_locked';

const BLOOM_ID = {
  remember: 'Mengingat', understand: 'Memahami', apply: 'Menerapkan',
  analyze: 'Menganalisis', evaluate: 'Mengevaluasi', create: 'Mencipta',
};

/** /modules/:id — the material. The questions live at /modules/:id/quiz. */
export default function ModuleScreen() {
  const { id } = useParams();
  return <ModuleView key={id} id={id} />;
}

function ModuleView({ id }) {
  const { data, loading } = useApi(() => api.module(id), [id]);
  const [forcedLocked, setForcedLocked] = useState(false);
  const started = useRef(null);

  // start is idempotent on the server, but the ref keeps it to one call per
  // module id (StrictMode runs effects twice). It is also what opens the quiz:
  // the quiz page refuses a module with no progress row.
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
    <div className="page module-layout">
      <aside className="module-nav">
        {data.path && (
          <Link to={`/paths/${data.path.level}`} className="crumb">← Ikhtisar {data.path.title}</Link>
        )}
        <h2 className="section-title">Modul</h2>
        <ol className="module-nav__list">
          {data.siblings.map((s) => {
            const current = s._id === m._id;
            const cls = `module-nav__item${current ? ' is-current' : ''}${s.locked ? ' is-locked' : ''}`;
            return (
              <li key={s._id} className={cls}>
                <span className="module-nav__num">{pad2(s.order)}</span>
                {s.locked ? <span>{s.title}</span> : <Link to={`/modules/${s._id}`}>{s.title}</Link>}
                {s.state === 'completed' && <span className="state state--done">Selesai</span>}
                {s.locked && <span className="module-nav__hint">{s.unlock_hint}</span>}
              </li>
            );
          })}
        </ol>
      </aside>

      {locked ? <LockedNotice module={m} /> : (
        <article className="module-body">
          <div className="eyebrow">
            Modul {pad2(m.order)} · {BLOOM_ID[m.bloom_level] ?? m.bloom_level}
            {m.flagged_by_diagnostic && ' · ditandai oleh diagnostik kamu'}
          </div>
          <h1 className="module-body__title">{m.title}</h1>

          <div className="prose">
            {(m.body || []).map((block, i) => {
              if (block.type === 'lead') return <p key={i} className="prose__lead">{block.text}</p>;
              if (block.type === 'text') return <p key={i}>{block.text}</p>;
              if (block.type === 'callout') return <div key={i} className="callout">{block.text}</div>;
              return (
                <figure key={i} className="prose__code">
                  {block.label && <figcaption>{block.label}</figcaption>}
                  <pre className="code">{block.code}</pre>
                </figure>
              );
            })}
            {/* The schema defaults body to [], so an unwritten module arrives as an empty array. */}
            {!m.body?.length && <p>Materi modul ini belum ditulis.</p>}
          </div>

          {m.quiz?.length > 0 ? (
            <section className="module-cta">
              <div>
                <h2 className="section-title">Selesai membaca?</h2>
                <p className="module-cta__sub">
                  {m.quiz.length} pertanyaan untuk menguji pemahaman kamu. Lulus di 70% dan modul ini
                  ditandai selesai, lalu modul berikutnya terbuka.
                </p>
              </div>
              <Link className="btn btn--lg" to={`/modules/${m._id}/quiz`}>Ke soal</Link>
            </section>
          ) : next && (
            <section className="module-cta">
              <div>
                <h2 className="section-title">Selesai membaca?</h2>
                <p className="module-cta__sub">Modul ini tidak punya kuis. Lanjut ke modul berikutnya.</p>
              </div>
              <Link className="btn btn--lg" to={`/modules/${next._id}`}>Modul berikutnya</Link>
            </section>
          )}

          {m.references?.length > 0 && <References items={m.references} />}

          <nav className="module-foot">
            {prev ? <Link to={`/modules/${prev._id}`}>← {prev.title}</Link> : <span />}
            {next ? <Link to={`/modules/${next._id}`}>{next.title} →</Link> : <span />}
          </nav>
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
    <article className="module-body">
      <div className="eyebrow">Modul {pad2(m.order)} · terkunci</div>
      <h1 className="module-body__title">{m.title}</h1>
      <div className="callout" style={{ marginTop: 'var(--space-5)' }}>{m.unlock_hint}</div>
      {target && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <Link className="btn" to={`/modules/${target._id}`}>Ke modul yang terbuka</Link>
        </div>
      )}
    </article>
  );
}
