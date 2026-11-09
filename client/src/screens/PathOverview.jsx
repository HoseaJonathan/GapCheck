import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Bar, Loading } from '../components/Bits.jsx';
import References from '../components/References.jsx';
import { LEVEL_LABEL } from './ModuleLanding.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

// Bloom levels (revised taxonomy) as the verbs the Indonesian copy uses, so the
// cognitive level reads as a word rather than as a badge in another language.
const BLOOM_ID = {
  remember: 'Mengingat', understand: 'Memahami', apply: 'Menerapkan',
  analyze: 'Menganalisis', evaluate: 'Mengevaluasi', create: 'Mencipta',
};

/** Lesson status as a word. A coloured pill per row would out-shout the titles. */
function ModuleState({ module: m }) {
  if (m.locked) return <span className="state state--locked">Terkunci</span>;
  if (m.state === 'completed') return <span className="state state--done">Selesai</span>;
  if (m.state === 'in_progress') return <span className="state state--progress">Dikerjakan</span>;
  return <span className="state state--open">Belum mulai</span>;
}

/** One step of the path: its lessons, and how many of them are done. */
function StepCard({ step: s, index }) {
  const done = s.modules.filter((m) => m.state === 'completed').length;
  const allDone = s.modules.length > 0 && done === s.modules.length;

  return (
    <section className={`step-card${allDone ? ' is-done' : ''}`}>
      <div className="step-card__head">
        <div>
          <div className="step-card__eyebrow">Langkah {pad2(index + 1)}</div>
          <h3 className="step-card__title">{s.title}</h3>
        </div>
        <div className="step-card__count">{done}/{s.modules.length}</div>
        {s.reason && <p className="step-card__reason">{s.reason}</p>}
      </div>

      <div className="step-card__modules">
        {s.modules.length === 0 && <p className="step-card__empty">Belum ada modul di langkah ini.</p>}
        {s.modules.map((m) => {
          const inner = (
            <>
              <div className="step-module__title">
                <span className="step-module__num">{pad2(m.order)}</span>
                <span>{m.title}</span>
              </div>
              {/* Separators are drawn by CSS on each item after the first, so a
                  wrapped line never leaves a dot dangling behind it. */}
              <div className="step-module__meta">
                <span>{BLOOM_ID[m.bloom_level] ?? m.bloom_level}</span>
                <span>{m.estimated_minutes} menit</span>
                <ModuleState module={m} />
              </div>
            </>
          );
          return m.locked
            ? <div key={m._id} className="step-module is-locked">{inner}</div>
            : <Link key={m._id} className="step-module" to={`/modules/${m._id}`}>{inner}</Link>;
        })}
      </div>

      <div className="step-card__foot">
        <div className="path-progress__row" style={{ marginBottom: 'var(--space-2)' }}>
          <span className="path-progress__label">Progres langkah</span>
          <span className="path-progress__value">{done} dari {s.modules.length}</span>
        </div>
        <Bar value={s.modules.length ? (done / s.modules.length) * 100 : 0} />
      </div>
    </section>
  );
}

/** /paths/:level: what the path covers, shown before its first module. */
export default function PathOverview() {
  const { level } = useParams();
  const { data, loading, error } = useApi(() => api.path(level), [level]);
  if (loading) return <Loading />;
  if (error) {
    const locked = error.status === 403;
    return (
      <div className="page">
        <Link to="/modules" className="crumb">← Semua jalur</Link>
        <h1>{locked ? 'Jalur ini belum terbuka' : 'Jalur tidak ditemukan'}</h1>
        <p style={{ marginTop: 'var(--space-4)' }}>
          {locked
            ? 'Jalur yang terbuka mengikuti level hasil asesmen kamu. Level di bawahmu selalu bisa dibuka kembali.'
            : 'Alamat jalur ini tidak ada.'}
        </p>
      </div>
    );
  }

  const { path: p, next_module: next } = data;
  const modules = p.steps.flatMap((s) => s.modules);
  const done = modules.filter((m) => m.state === 'completed').length;
  const percent = p.module_count ? Math.round((done / p.module_count) * 100) : 0;

  return (
    <div className="page">
      <Link to="/modules" className="crumb">← Semua jalur</Link>

      <section className="path-hero">
        <div className="eyebrow">Jalur {pad2(p.order)} · {LEVEL_LABEL[p.level]}</div>
        <h1 className="path-hero__title">{p.title}</h1>
        <p className="path-hero__lead">{p.overview || p.description}</p>

        <div className="path-hero__actions">
          {next ? (
            <>
              <Link className="btn btn--lg" to={`/modules/${next._id}`}>
                {next.started ? 'Lanjutkan' : 'Mulai'} modul {pad2(next.order)}
              </Link>
              <span className="path-hero__next">{next.title}</span>
            </>
          ) : (
            <span className="callout callout--green">Semua modul di jalur ini sudah selesai.</span>
          )}
        </div>

        <div className="path-progress">
          <div className="path-progress__row">
            <span className="path-progress__label">Progres jalur</span>
            <span className="path-progress__value">{done} dari {p.module_count} modul · {percent}%</span>
          </div>
          <Bar value={percent} />
        </div>

        <div className="statline">
          <div className="statline__item">
            <div className="statline__k">Modul</div>
            <div className="statline__v">{p.module_count}</div>
          </div>
          <div className="statline__item">
            <div className="statline__k">Estimasi waktu</div>
            <div className="statline__v">{p.estimated_minutes}<small>menit</small></div>
          </div>
          <div className="statline__item">
            <div className="statline__k">Tingkat kognitif</div>
            <div className="statline__v" style={{ fontSize: 'var(--text-lg)' }}>
              {p.bloom_from ? `${BLOOM_ID[p.bloom_from]} → ${BLOOM_ID[p.bloom_to]}` : '—'}
            </div>
          </div>
        </div>
      </section>

      {p.outcomes.length > 0 && (
        <section className="section" style={{ marginTop: 'var(--space-7)' }}>
          <h2 className="section-title">Setelah jalur ini kamu bisa</h2>
          <ul className="outcomes">
            {p.outcomes.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </section>
      )}

      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Langkah dan modul</h2>
        <div className="steps">
          {p.steps.map((s, i) => <StepCard key={s.topic ?? 'extra'} step={s} index={i} />)}
        </div>
      </section>

      {p.sources.length > 0 && <References items={p.sources} />}
    </div>
  );
}
