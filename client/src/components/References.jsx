import { useId, useState } from 'react';

/**
 * The official pages the content was checked against (a module's, or a whole
 * path's). Collapsed by default: sources are provenance, not study material,
 * so they must not compete with the lessons above them.
 */
export default function References({ items, label = 'Referensi' }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <section className="ref-card">
      <button
        type="button"
        className="ref-card__toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="section-title" style={{ fontSize: 'var(--text-base)' }}>{label}</span>
        <span className="ref-card__count">{items.length} sumber</span>
        <svg className="ref-card__caret" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* Kept in the DOM while closed so aria-controls always points at it. */}
      <div className="ref-card__body" id={listId} hidden={!open}>
        <ol className="ref-list">
          {items.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
              {' — '}{r.publisher}
              <span className="mono" style={{ marginLeft: 8 }}>diakses {r.accessed_at}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
