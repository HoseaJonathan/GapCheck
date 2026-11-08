import { useId, useState } from 'react';

/** How many sources show before the reader asks for the rest. */
const COLLAPSED = 5;

/**
 * The official pages the content was checked against (a module's, or a whole
 * path's). Long lists collapse: a path can cite sixteen sources, which buries
 * whatever follows the card.
 */
export default function References({ items, label = 'REFERENSI' }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const hidden = Math.max(0, items.length - COLLAPSED);
  // Always sliced from the start, so the ordinals keep counting across the toggle.
  const shown = expanded ? items : items.slice(0, COLLAPSED);

  return (
    <section className="ref-card">
      <div className="ref-card__head">
        <div className="label label--section">{label}</div>
      </div>
      <div className="ref-card__body">
        <ol className="ref-list" id={listId}>
          {shown.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
              <span className="muted"> — {r.publisher}</span>
              <span className="muted mono" style={{ marginLeft: 8 }}>diakses {r.accessed_at}</span>
            </li>
          ))}
        </ol>
        {hidden > 0 && (
          <button
            type="button"
            className="btn btn--ghost ref-card__more"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Tampilkan lebih sedikit' : `Tampilkan ${hidden} lainnya`}
          </button>
        )}
      </div>
    </section>
  );
}
