import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { Loading } from '../components/Bits.jsx';

export const LEVEL_LABEL = { new: 'New', beginner: 'Beginner', intermediate: 'Intermediate' };
const pad2 = (n) => String(n).padStart(2, '0');
/** Whole hours, rounded; a path with any content shows at least 1 hour. */
const hours = (minutes) => (minutes > 0 ? Math.max(1, Math.round(minutes / 60)) : 0);

/** One sentence under the heading that explains the lock state of the cards below it. */
function intro(paths) {
  if (api.user?.is_admin) return 'Mode admin: semua jalur terbuka untuk pengujian.';
  const current = paths.find((p) => p.current);
  if (!current) return 'Kerjakan asesmen diagnostik dulu. Hasilnya menentukan jalur mana yang terbuka untuk kamu.';
  return `Asesmen menempatkan kamu di level ${LEVEL_LABEL[current.level]}, jadi jalur ${pad2(current.order)} yang kamu kerjakan sekarang. Jalur di bawahnya tetap terbuka kalau kamu mau mengulang materinya; jalur di atasnya terbuka setelah asesmen ulang menempatkan kamu di sana.`;
}

/** /modules: the three level paths as cards, each in one of three access states (spec A5b). */
export default function ModuleLanding() {
  const { data, loading, error } = useApi(() => api.paths(), []);
  if (loading) return <Loading />;
  if (error || !data) return <div className="page"><p>Daftar jalur belajar belum bisa dimuat. Muat ulang halaman.</p></div>;
  const { paths } = data;
  const noLevel = !api.user?.is_admin && !paths.some((p) => p.current);

  return (
    <div className="page">
      <div className="label label--section">MODULES · JALUR BELAJAR</div>
      <h1 style={{ marginTop: 10 }}>Tiga jalur, satu per level</h1>
      <p style={{ marginTop: 'var(--space-4)' }}>{intro(paths)}</p>
      {noLevel && <Link className="btn" to="/assessment">Mulai asesmen diagnostik</Link>}

      <div className="paths">
        {paths.map((p) => <PathCard key={p.level} path={p} />)}
      </div>
    </div>
  );
}

/** Wording per access state, so the card and its screen-reader label never disagree. */
const STATE = {
  current: { note: null, aria: '', cta: 'Baca selengkapnya' },
  review: { note: 'SUDAH DILEWATI · BISA DIULANG', aria: ', sudah dilewati', cta: 'Ulangi jalur ini' },
  locked: { note: 'TERKUNCI', aria: ', terkunci', cta: 'Baca selengkapnya' },
};

function PathCard({ path: p }) {
  // `access` is the single source of truth; `current`/`locked` remain for older callers.
  const access = p.access ?? (p.current ? 'current' : p.locked ? 'locked' : 'review');
  const state = STATE[access] ?? STATE.locked;
  const cls = `path-card path-card--${p.level} is-${access}`;
  return (
    <section className={cls} aria-label={`Jalur ${pad2(p.order)} ${LEVEL_LABEL[p.level]}${state.aria}`}>
      <div className="path-card__head">
        <div className="path-card__num">{pad2(p.order)}</div>
        <div className="path-card__level">{LEVEL_LABEL[p.level]}</div>
        {access === 'current' && <span className="path-card__here">Kamu di sini</span>}
      </div>
      <div className="path-card__body">
        {state.note && <span className={`label${access === 'review' ? ' label--green' : ''}`}>{state.note}</span>}
        <h2>{p.title}</h2>
        <p>{p.description}</p>
        {p.steps?.length > 0 && (
          <div>
            <div className="label" style={{ marginTop: 'var(--space-2)' }}>YANG AKAN KAMU PELAJARI</div>
            <ol className="path-card__steps">
              {p.steps.map((s) => (
                <li key={s.title}>
                  <span>{s.title}</span>
                  <span className="mono faint">{s.module_count} modul</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="path-card__foot">
          <div className="label">{p.module_count} MODUL · ±{hours(p.estimated_minutes)} JAM</div>
          {access === 'locked' ? (
            <button type="button" className="btn" disabled>{state.cta}</button>
          ) : (
            <Link className="btn" to={`/paths/${p.level}`}>{state.cta}</Link>
          )}
        </div>
      </div>
    </section>
  );
}
