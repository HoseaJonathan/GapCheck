import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

export const LEVEL_LABEL = { new: 'New', beginner: 'Beginner', intermediate: 'Intermediate' };
const pad2 = (n) => String(n).padStart(2, '0');

/** One sentence under the heading that explains the lock state of the cards below it. */
function intro(paths) {
  if (api.user?.is_admin) return 'Mode admin: semua jalur terbuka untuk pengujian.';
  const current = paths.find((p) => p.current);
  if (!current) return 'Kerjakan asesmen diagnostik dulu. Hasilnya menentukan jalur mana yang terbuka untuk kamu.';
  return `Asesmen menempatkan kamu di level ${LEVEL_LABEL[current.level]}, jadi jalur ${pad2(current.order)} yang terbuka. Jalur lain terbuka kalau asesmen ulang menempatkan kamu di level itu.`;
}

/** /modules: the three level paths as cards; only the learner's own level is open. */
export default function ModuleLanding() {
  const { data, loading, error } = useApi(() => api.paths(), []);
  if (loading) return <Loading />;
  if (error || !data) return <div className="page"><p>Daftar jalur belajar belum bisa dimuat. Muat ulang halaman.</p></div>;
  const { paths } = data;
  const noLevel = !api.user?.is_admin && !paths.some((p) => p.current);

  return (
    <div className="page">
      <div className="label label--ink">MODULES · JALUR BELAJAR</div>
      <h1 style={{ marginTop: 10 }}>Tiga jalur, satu per level</h1>
      <p style={{ marginTop: 'var(--space-4)' }}>{intro(paths)}</p>
      {noLevel && <Link className="btn" to="/assessment">Mulai asesmen diagnostik</Link>}

      <div className="paths">
        {paths.map((p) => <PathCard key={p.level} path={p} />)}
      </div>
    </div>
  );
}

function PathCard({ path: p }) {
  const cls = `path-card path-card--${p.level}${p.locked ? ' is-locked' : ''}${p.current ? ' is-current' : ''}`;
  return (
    <section className={cls} aria-label={`Jalur ${pad2(p.order)} ${LEVEL_LABEL[p.level]}${p.locked ? ', terkunci' : ''}`}>
      <div className="path-card__head">
        <div className="path-card__num">{pad2(p.order)}</div>
        <div className="path-card__level">{LEVEL_LABEL[p.level]}</div>
      </div>
      <div className="path-card__body">
        {p.current && <span className="label label--green">LEVEL KAMU</span>}
        {p.locked && <span className="label">TERKUNCI</span>}
        <h2>{p.title}</h2>
        <p>{p.description}</p>
        <div className="label">{p.module_count} MODUL · ±{p.estimated_minutes} MENIT</div>
        <div className="path-card__foot">
          {p.locked ? (
            <button type="button" className="btn" disabled>Baca selengkapnya</button>
          ) : (
            <Link className="btn" to={`/paths/${p.level}`}>Baca selengkapnya</Link>
          )}
        </div>
      </div>
    </section>
  );
}
