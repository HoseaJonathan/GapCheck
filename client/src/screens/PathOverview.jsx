import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Bar, Loading, Tile } from '../components/Bits.jsx';
import References from '../components/References.jsx';
import { LEVEL_LABEL } from './ModuleLanding.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
// Bloom levels (revised taxonomy) as the verbs used in the Indonesian copy.
const BLOOM_ID = {
  remember: 'mengingat', understand: 'memahami', apply: 'menerapkan',
  analyze: 'menganalisis', evaluate: 'mengevaluasi', create: 'mencipta',
};

function moduleState(m) {
  if (m.locked) return <span className="tag tag--locked">TERKUNCI</span>;
  if (m.state === 'completed') return <span className="tag tag--done">SELESAI</span>;
  if (m.state === 'in_progress') return <span className="tag tag--progress">SEDANG</span>;
  return <span className="tag tag--open">TERBUKA</span>;
}

/** One step of the path as a card: tinted head, its modules, and how many are done. */
function StepCard({ step: s, index }) {
  const done = s.modules.filter((m) => m.state === 'completed').length;
  const allDone = s.modules.length > 0 && done === s.modules.length;
  return (
    <section className={`step-card${allDone ? ' is-done' : ''}`}>
      <div className="step-card__head">
        <div className="step-card__num">LANGKAH {pad2(index + 1)}</div>
        <h2 style={{ marginTop: 6 }}>{s.title}</h2>
        {s.reason && <p>{s.reason}</p>}
      </div>
      <div className="step-card__modules">
        {s.modules.length === 0 && <p className="faint" style={{ fontSize: 'var(--text-sm)', margin: 'var(--space-3) 0' }}>Belum ada modul di langkah ini.</p>}
        {s.modules.map((m) => {
          const inner = (
            <>
              <div className="step-module__title">
                <span className="mono faint">{pad2(m.order)}</span>
                <span>{m.title}</span>
              </div>
              <div className="step-module__meta">
                <span className={`tag tag--${m.bloom_level}`}>{m.bloom_level}</span>
                <span className="mono faint" style={{ fontSize: 'var(--text-xs)' }}>{m.estimated_minutes} mnt</span>
                <span style={{ marginLeft: 'auto' }}>{moduleState(m)}</span>
              </div>
            </>
          );
          return m.locked
            ? <div key={m._id} className="step-module is-locked">{inner}</div>
            : <Link key={m._id} className="step-module" to={`/modules/${m._id}`}>{inner}</Link>;
        })}
      </div>
      <div className="step-card__foot">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="label">PROGRES</span>
          <span className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{done}/{s.modules.length}</span>
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
        <div className="label label--ink">JALUR · {locked ? 'TERKUNCI' : 'TIDAK DITEMUKAN'}</div>
        <div className="callout" style={{ marginTop: 'var(--space-5)' }}>
          {locked
            ? 'Jalur ini belum terbuka untuk kamu. Jalur yang terbuka mengikuti level hasil asesmen kamu.'
            : 'Jalur ini tidak ada.'}
        </div>
        <div style={{ marginTop: 16 }}><Link to="/modules">← Semua jalur</Link></div>
      </div>
    );
  }

  const { path: p, next_module: next } = data;
  const modules = p.steps.flatMap((s) => s.modules);
  const done = modules.filter((m) => m.state === 'completed').length;

  return (
    <div className="page">
      <Link to="/modules" className="muted" style={{ fontSize: 'var(--text-sm)' }}>← Semua jalur</Link>
      <div className="path-hero">
        <div className="label label--green">
          JALUR {pad2(p.order)} · {LEVEL_LABEL[p.level].toUpperCase()} · IKHTISAR
        </div>
        <h1 style={{ marginTop: 10 }}>{p.title}</h1>
        <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>{p.overview || p.description}</p>

        <div className="row" style={{ marginTop: 'var(--space-5)' }}>
          {next ? (
            <Link className="btn" to={`/modules/${next._id}`}>
              {next.started ? 'Lanjutkan' : 'Mulai'} modul {pad2(next.order)}
            </Link>
          ) : (
            <span className="callout callout--green">Semua modul di jalur ini sudah selesai.</span>
          )}
          {next && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--green-ink)' }}>{next.title}</span>}
        </div>

        <div className="tiles">
          <Tile label="MODUL"><span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{p.module_count}</span></Tile>
          <Tile label="PERKIRAAN WAKTU" caption="Jumlah estimasi semua modul">
            <span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{p.estimated_minutes}</span>
            <span className="metric__unit mono" style={{ fontSize: 'var(--text-sm)' }}>menit</span>
          </Tile>
          <Tile label="TINGKAT BLOOM" caption={p.bloom_from && `Dari ${BLOOM_ID[p.bloom_from]} sampai ${BLOOM_ID[p.bloom_to]}`}>
            {p.bloom_from ? (
              <span className="row" style={{ gap: 6 }}>
                <span className={`tag tag--${p.bloom_from}`}>{p.bloom_from}</span>
                <span className="faint">→</span>
                <span className={`tag tag--${p.bloom_to}`}>{p.bloom_to}</span>
              </span>
            ) : '-'}
          </Tile>
          <Tile label="SELESAI" caption={`${p.module_count - done} modul lagi`}>
            <span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{done}</span>
            <span className="metric__unit mono" style={{ fontSize: 'var(--text-sm)' }}>/ {p.module_count}</span>
          </Tile>
        </div>
      </div>

      {p.outcomes.length > 0 && (
        <section className="section" style={{ marginTop: 'var(--space-6)' }}>
          <div className="label label--ink">SETELAH JALUR INI KAMU BISA</div>
          <ul style={{ marginTop: 12, paddingLeft: 18, color: 'var(--ink-muted)' }}>
            {p.outcomes.map((o) => <li key={o} style={{ marginBottom: 6 }}>{o}</li>)}
          </ul>
        </section>
      )}

      <section className="section">
        <div className="label label--ink" style={{ marginBottom: 'var(--space-4)' }}>LANGKAH DAN MODUL</div>
        <div className="steps">
          {p.steps.map((s, i) => <StepCard key={s.topic ?? 'extra'} step={s} index={i} />)}
        </div>
      </section>

      {p.sources.length > 0 && <References items={p.sources} label="SUMBER MATERI JALUR INI" />}
    </div>
  );
}
