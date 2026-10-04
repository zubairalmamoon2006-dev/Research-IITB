import { useState } from 'react';

export function PageIntro({ title, accent, eyebrow = 'IIT Bombay · Seven years of research', eyebrowClass = '', children }) {
  return (
    <div className="page-intro">
      <div className={`eyebrow ${eyebrowClass}`}>{eyebrow}</div>
      <h2>
        {title} {accent && <span className="accent">{accent}</span>}
      </h2>
      <p>{children}</p>
    </div>
  );
}

export function Section({ title, note, actions, children }) {
  return (
    <section className="section">
      <div className="section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Card({ title, note, children }) {
  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      {note && <div className="card-note">{note}</div>}
      {children}
    </div>
  );
}

export function Findings({ items, tone = 'accent' }) {
  if (!items || items.length === 0) return null;
  const tones = { accent: '', gold: 'gold', navy: 'navy' };
  return (
    <ul className="findings">
      {items.map((f, i) => (
        <li key={i} className={tones[tone] || ''}>
          {typeof f === 'string' ? f : f.text || JSON.stringify(f)}
        </li>
      ))}
    </ul>
  );
}

export function Callout({ children }) {
  return <div className="callout">{children}</div>;
}

export function KPI({ value, label }) {
  return (
    <div className="kpi">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function Chips({ items }) {
  return (
    <div className="chips">
      {items.map((c, i) => (
        <span className="chip" key={i}>{c}</span>
      ))}
    </div>
  );
}

export function DataDetails({ title = 'View underlying data', rows, headers }) {
  const [open, setOpen] = useState(false);
  if (!rows || rows.length === 0) return null;
  const cols = headers || Object.keys(rows[0]);
  return (
    <div className="data-details">
      <button type="button" className="btn chip" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? '▴ Hide data table' : '▾ View data table'}
      </button>
      {open && (
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead>
              <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => <td key={c}>{typeof r[c] === 'number' ? r[c].toLocaleString('en-US') : r[c]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DataTable({ headers, rows, renderCell }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h}>{renderCell ? renderCell(h, r, i) : r[h] ?? r[h.toLowerCase()] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const fmt = (n) =>
  typeof n === 'number' ? n.toLocaleString('en-US') : n;
