import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import { tokenize, buildFields, scoreEntries, labelScore } from '../lib/search';

const PAGES = [
  { to: '/', label: 'Dashboard', desc: 'Executive overview, KPIs, publication mix' },
  { to: '/impact', label: 'Research Impact', desc: 'Citations, open access, departments' },
  { to: '/excellence', label: 'Rankings', desc: 'QS, NIRF, H-index comparisons' },
  { to: '/publications', label: 'Publications', desc: 'Output, patents, authorship' },
  { to: '/topics', label: 'Topics', desc: 'Key research topics by year' },
  { to: '/collaborations', label: 'Collaborations', desc: 'Domestic and international partners' },
  { to: '/funding', label: 'Funding', desc: 'Grants by department and agency' },
  { to: '/professors', label: 'Professors', desc: 'Searchable professor database' },
  { to: '/departments', label: 'Departments', desc: 'Department profiles and faculty' },
  { to: '/timeline', label: 'Timeline', desc: 'Year-by-year research story' },
  { to: '/about', label: 'About', desc: 'The DAV team behind the portal' }
];

export default function SearchOverlay({ open, onClose }) {
  const { report } = useReport();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  const professors = report?.professor_research_interest_database?.professors || [];
  const entries = useMemo(() => professors.map((p) => ({ p, fields: buildFields(p) })), [professors]);
  const departments = useMemo(
    () => Array.from(new Set(professors.map((p) => p.Department).filter(Boolean))).sort(),
    [professors]
  );

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && open && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const qTokens = tokenize(q);
  const pageHits = qTokens.length
    ? PAGES.map((p) => ({ ...p, s: labelScore(q, p.label) })).filter((p) => p.s > 0).sort((a, b) => b.s - a.s)
    : [];
  const deptHits = qTokens.length
    ? departments.map((d) => ({ d, s: labelScore(q, d) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5)
    : [];
  const profHits = qTokens.length
    ? scoreEntries(entries, qTokens, q).slice(0, 8).map((x) => x.e.p)
    : [];

  const go = (to) => {
    navigate(to);
    onClose();
  };

  const submit = () => {
    if (pageHits.length) return go(pageHits[0].to);
    if (deptHits.length) return go(`/department/${encodeURIComponent(deptHits[0].d)}`);
    if (profHits.length) return go(`/professors?q=${encodeURIComponent(q.trim())}`);
    if (q.trim()) return go(`/professors?q=${encodeURIComponent(q.trim())}`);
  };

  if (!open) return null;
  const empty = qTokens.length === 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="search-overlay-input">
          <span>⌕</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search pages, departments, professors…  (Esc to close)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="search-overlay-results">
          {empty && (
            <div className="search-overlay-hint">
              Start typing to search across the portal - e.g. <b>climate</b>, <b>chemistry</b> or a
              professor's name. Matches are fuzzy, so typos still work.
            </div>
          )}
          {pageHits.length > 0 && (
            <>
              <div className="search-overlay-label">Pages</div>
              {pageHits.map((p) => (
                <button key={p.to} type="button" className="search-hit" onClick={() => go(p.to)}>
                  <b>{p.label}</b>
                  <span>{p.desc}</span>
                </button>
              ))}
            </>
          )}
          {deptHits.length > 0 && (
            <>
              <div className="search-overlay-label">Departments</div>
              {deptHits.map((x) => (
                <button
                  key={x.d}
                  type="button"
                  className="search-hit"
                  onClick={() => go(`/department/${encodeURIComponent(x.d)}`)}
                >
                  <b>{x.d}</b>
                  <span>Department profile</span>
                </button>
              ))}
            </>
          )}
          {profHits.length > 0 && (
            <>
              <div className="search-overlay-label">Professors</div>
              {profHits.map((p) => (
                <button
                  key={p.Name}
                  type="button"
                  className="search-hit"
                  onClick={() => go(`/professors?q=${encodeURIComponent(p.Name)}`)}
                >
                  <b>{p.Name}</b>
                  <span>
                    {p.Designation} · {p.Department}
                  </span>
                </button>
              ))}
            </>
          )}
          {qTokens.length > 0 &&
            pageHits.length + deptHits.length + profHits.length === 0 && (
              <div className="search-overlay-hint">No matches for “{q}”.</div>
            )}
        </div>
      </div>
    </div>
  );
}
