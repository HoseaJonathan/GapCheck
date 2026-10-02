export function Metric({ value, unit, delta }) {
  return (
    <div>
      <span className="metric">{value}</span>
      {unit && <span className="metric__unit mono">{unit}</span>}
      {delta !== undefined && (
        <div className="mono" style={{ fontSize: 'var(--text-sm)', color: delta >= 0 ? 'var(--green)' : 'var(--amber)', marginTop: 4 }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
        </div>
      )}
    </div>
  );
}

export function Tile({ label, children, caption }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div style={{ marginTop: 'var(--space-3)' }}>{children}</div>
      {caption && <div className="tile__caption">{caption}</div>}
    </div>
  );
}

export function Bar({ value, tone = 'green' }) {
  return (
    <div className="bar">
      <div className={`bar__fill${tone === 'amber' ? ' bar__fill--amber' : tone === 'locked' ? ' bar__fill--locked' : ''}`}
           style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Score track marked New / Beginner 41 / Intermediate 71 with current position. */
export function ScoreTrack({ score }) {
  return (
    <div>
      <div className="track">
        <div className="track__fill" style={{ width: `${score}%` }} />
        <div className="track__edge" style={{ left: '41%' }} />
        <div className="track__edge" style={{ left: '71%' }} />
        <div style={{ position: 'absolute', left: `${score}%`, top: -7, width: 2, height: 20, background: 'var(--ink)' }} />
      </div>
      <div className="track__labels">
        <span className="label">NEW 0–40</span>
        <span className="label">BEGINNER 41</span>
        <span className="label">INTERMEDIATE 71</span>
      </div>
    </div>
  );
}

/** Score over time, with the Intermediate 71 threshold as a dashed rule. */
export function LineChart({ points, threshold = 71 }) {
  const w = 620, h = 200, pad = 28;
  const max = 100;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (v) => h - pad - ((v / max) * (h - pad * 2));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.percentage)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img"
         aria-label={`Skor dari ${points[0]?.percentage}% ke ${points.at(-1)?.percentage}%`}>
      <line x1={pad} x2={w - pad} y1={y(threshold)} y2={y(threshold)}
            stroke="var(--rule-strong)" strokeDasharray="4 4" />
      <text x={w - pad} y={y(threshold) - 6} textAnchor="end"
            fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-faint)"
            letterSpacing="0.12em">INTERMEDIATE 71</text>
      <path d={path} fill="none" stroke="var(--green)" strokeWidth="1.5" />
      {points.map((p, i) => (
        <g key={p._id}>
          <circle cx={x(i)} cy={y(p.percentage)} r="3" fill="var(--green)" />
          <text x={x(i)} y={h - 8} textAnchor="middle" fontFamily="var(--font-mono)"
                fontSize="9" fill="var(--ink-faint)" letterSpacing="0.08em">
            {p.label.toUpperCase()}
          </text>
          <text x={x(i)} y={y(p.percentage) - 9} textAnchor="middle" fontFamily="var(--font-mono)"
                fontSize="10" fill="var(--ink-muted)">{p.percentage}</text>
        </g>
      ))}
    </svg>
  );
}

export function Loading() { return <div className="page label">LOADING…</div>; }
