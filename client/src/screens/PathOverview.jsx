import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Loading, Tile } from '../components/Bits.jsx';
import References from '../components/References.jsx';
import { LEVEL_LABEL } from './ModuleLanding.jsx';

const pad2 = (n) => String(n).padStart(2, '0');
// Bloom levels (revised taxonomy) as the verbs used in the Indonesian copy.
const BLOOM_ID = {
  remember: 'mengingat', understand: 'memahami', apply: 'menerapkan',
  analyze: 'menganalisis', evaluate: 'mengevaluasi', create: 'mencipta',
};

function moduleState(m) {
  if (m.locked) return <span className="label">TERKUNCI</span>;
  if (m.state === 'completed') return <span className="label label--green">SELESAI</span>;
  if (m.state === 'in_progress') return <span className="label label--ink">SEDANG</span>;
  return <span className="label label--ink">TERBUKA</span>;
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
      <div className="label label--ink" style={{ marginTop: 'var(--space-5)' }}>
        JALUR {pad2(p.order)} · {LEVEL_LABEL[p.level].toUpperCase()} · IKHTISAR
      </div>
      <h1 style={{ marginTop: 10 }}>{p.title}</h1>
      <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>{p.overview || p.description}</p>

      <div className="row" style={{ margin: 'var(--space-5) 0 var(--space-6)' }}>
        {next ? (
          <Link className="btn" to={`/modules/${next._id}`}>
            {next.started ? 'Lanjutkan' : 'Mulai'} modul {pad2(next.order)}
          </Link>
        ) : (
          <span className="callout callout--green">Semua modul di jalur ini sudah selesai.</span>
        )}
        {next && <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{next.title}</span>}
      </div>

      <div className="tiles">
        <Tile label="MODUL"><span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{p.module_count}</span></Tile>
        <Tile label="PERKIRAAN WAKTU" caption="Jumlah estimasi semua modul">
          <span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{p.estimated_minutes}</span>
          <span className="metric__unit mono" style={{ fontSize: 'var(--text-sm)' }}>menit</span>
        </Tile>
        <Tile label="TINGKAT BLOOM" caption={p.bloom_from && `Dari ${BLOOM_ID[p.bloom_from]} sampai ${BLOOM_ID[p.bloom_to]}`}>
          <span className="mono" style={{ fontSize: 'var(--text-lg)' }}>
            {p.bloom_from ? `${p.bloom_from} → ${p.bloom_to}` : '-'}
          </span>
        </Tile>
        <Tile label="SELESAI" caption={`${p.module_count - done} modul lagi`}>
          <span className="metric" style={{ fontSize: 'var(--text-xl)' }}>{done}</span>
          <span className="metric__unit mono" style={{ fontSize: 'var(--text-sm)' }}>/ {p.module_count}</span>
        </Tile>
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
        <div className="label label--ink" style={{ marginBottom: 'var(--space-3)' }}>LANGKAH DAN MODUL</div>
        {p.steps.map((s, i) => (
          <div className="step" key={s.topic ?? 'extra'}>
            <div>
              <div className="label">LANGKAH {i + 1}</div>
              <h2 style={{ marginTop: 6 }}>{s.title}</h2>
              {s.reason && <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>{s.reason}</p>}
            </div>
            <div className="step__modules">
              {s.modules.length === 0 && <p className="faint" style={{ fontSize: 'var(--text-sm)' }}>Belum ada modul di langkah ini.</p>}
              {s.modules.map((m) => (
                <div className="step-module" key={m._id}>
                  <span className="mono faint">{pad2(m.order)}</span>
                  {m.locked
                    ? <span className="locked">{m.title}</span>
                    : <Link to={`/modules/${m._id}`} style={{ color: 'var(--ink)' }}>{m.title}</Link>}
                  <span className="label">{m.bloom_level}</span>
                  <span className="mono faint">{m.estimated_minutes} mnt</span>
                  {moduleState(m)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {p.sources.length > 0 && <References items={p.sources} label="SUMBER MATERI JALUR INI" />}
    </div>
  );
}
