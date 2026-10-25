/** The official pages the content was checked against (a module's, or a whole path's). */
export default function References({ items, label = 'SUMBER' }) {
  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 16, margin: 'var(--space-5) 0' }}>
      <div className="label">{label}</div>
      <ol className="stack" style={{ marginTop: 8, paddingLeft: 18, fontSize: 'var(--text-sm)', gap: 'var(--space-2)' }}>
        {items.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
            <span className="muted"> — {r.publisher}</span>
            <span className="muted mono" style={{ marginLeft: 8 }}>diakses {r.accessed_at}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
