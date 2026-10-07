import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReport } from '../context/ReportContext';
import { Section, Card, Callout, PageIntro, fmt } from '../components/ui';
import { tokenize, buildFields, scoreEntries, fuseWithSemanticRRF } from '../lib/search';
import { initSemanticEngine, semanticSearch } from '../lib/semantic';

const PAGE_SIZE = 25;
const STAR_KEY = 'iitb-starred-professors';
const CMP_KEY = 'iitb-compare-professors';
const HIST_KEY = 'iitb-search-history';

const loadSet = (key) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]').map(String));
  } catch {
    return new Set();
  }
};
const loadList = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};
const save = (key, val) => {
  try {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  } catch {
    /* storage unavailable - state stays for this session */
  }
};

// Display labels for the data keys used in report.json.
const LABELS = {
  Research_Interest: 'Research Interest',
  Scopus_ID: 'Scopus ID'
};
const labelOf = (h) => LABELS[h] || h;

export default function Professors() {
  const { report } = useReport();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [dept, setDept] = useState(() => searchParams.get('dept') || 'All');
  const [desig, setDesig] = useState(() => searchParams.get('desig') || 'All');
  const [starOnly, setStarOnly] = useState(() => searchParams.get('stars') === '1');
  const [page, setPage] = useState(1);
  const [starred, setStarred] = useState(() => loadSet(STAR_KEY));
  const [compare, setCompare] = useState(() => loadSet(CMP_KEY));
  const [showCmp, setShowCmp] = useState(false);
  const [history, setHistory] = useState(() => loadList(HIST_KEY));
  const [showHist, setShowHist] = useState(false);
  const [sem, setSem] = useState({ qq: '', matches: [] });
  const [semState, setSemState] = useState('idle');
  const histTimer = useRef(null);
  const db = report?.professor_research_interest_database;
  const all = useMemo(() => db?.professors || [], [db]);
  const entries = useMemo(() => all.map((p) => ({ p, fields: buildFields(p) })), [all]);

  /* --- Neural semantic engine: load once, re-validate when data changes --- */
  useEffect(() => {
    if (!all.length) return undefined;
    let active = true;
    setSemState('loading');
    initSemanticEngine(all)
      .then((ok) => { if (active) setSemState(ok ? 'ready' : 'unavailable'); })
      .catch(() => { if (active) setSemState('unavailable'); });
    return () => { active = false; };
  }, [all]);

  /* --- Debounced semantic query (results keyed to the query they belong to) --- */
  useEffect(() => {
    const t = q.trim();
    if (!t) {
      setSem({ qq: '', matches: [] });
      return undefined;
    }
    let active = true;
    const timer = setTimeout(() => {
      semanticSearch(t)
        .then((m) => { if (active) setSem({ qq: t, matches: m || [] }); })
        .catch(() => { if (active) setSem({ qq: t, matches: [] }); });
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);

  /* --- URL sync (shareable search links) --- */
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (dept !== 'All') next.set('dept', dept);
    if (desig !== 'All') next.set('desig', desig);
    if (starOnly) next.set('stars', '1');
    const s = next.toString();
    if (s !== searchParams.toString()) setSearchParams(s, { replace: true });
  }, [q, dept, desig, starOnly, searchParams, setSearchParams]);

  useEffect(() => {
    const uq = searchParams.get('q') || '';
    const udept = searchParams.get('dept') || 'All';
    const udesig = searchParams.get('desig') || 'All';
    const ustars = searchParams.get('stars') === '1';
    if (uq !== q) setQ(uq);
    if (udept !== dept) setDept(udept);
    if (udesig !== desig) setDesig(udesig);
    if (ustars !== starOnly) setStarOnly(ustars);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => save(STAR_KEY, [...starred]), [starred]);
  useEffect(() => save(CMP_KEY, [...compare]), [compare]);

  const keyOf = (p) => String(p.Name || '');

  const toggleStar = (p) => {
    const k = keyOf(p);
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleCompare = (p) => {
    const k = keyOf(p);
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else if (next.size < 3) next.add(k);
      return next;
    });
  };

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(all.map((p) => p.Department).filter(Boolean))).sort()],
    [all]
  );
  const designations = useMemo(
    () => ['All', ...Array.from(new Set(all.map((p) => p.Designation).filter(Boolean))).sort()],
    [all]
  );

  const professors = useMemo(() => {
    const base = entries.filter((e) => {
      const p = e.p;
      if (starOnly && !starred.has(keyOf(p))) return false;
      if (dept !== 'All' && p.Department !== dept) return false;
      if (desig !== 'All' && p.Designation !== desig) return false;
      return true;
    });
    const keywordRanked = scoreEntries(base, tokenize(q), q);
    const semMatches = sem.qq === q.trim() ? sem.matches : [];
    if (!semMatches.length) return keywordRanked.map((x) => x.e.p);
    return fuseWithSemanticRRF(keywordRanked, semMatches, base);
  }, [entries, q, dept, desig, starOnly, starred, sem]);

  const semActive = Boolean(q.trim()) && sem.qq === q.trim() && sem.matches.length > 0;

  useEffect(() => setPage(1), [q, dept, desig, starOnly]);

  const rememberQuery = () => {
    const t = q.trim();
    if (!t) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((x) => x !== t)].slice(0, 5);
      save(HIST_KEY, next);
      return next;
    });
  };

  const exportCsv = () => {
    const cols = db?.headers || ['Name', 'Designation', 'Department', 'Expertise', 'Research_Interest'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.map((h) => esc(labelOf(h))).join(',')]
      .concat(professors.map((p) => cols.map((h) => esc(p[h])).join(',')))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `iitb-professors${q ? `-search-${q.replace(/\W+/g, '-')}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!report) return null;

  const headers = db?.headers || ['Name', 'Designation', 'Department', 'Expertise', 'Research_Interest'];
  const totalPages = Math.max(1, Math.ceil(professors.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = professors.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = professors.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const to = Math.min(current * PAGE_SIZE, professors.length);
  const compareList = all.filter((p) => compare.has(keyOf(p)));

  return (
    <>
      <PageIntro title="Professor research database." accent="Find expertise fast." eyebrow="Directory · IRINS · iitb.irins.org">
        {db?.description} - {fmt(all.length)} professors, {departments.length - 1} departments. Search by
        expertise, name or keyword, filter by department/designation, star ★ professors you want to shortlist,
        and click a linked name to open their Vidwan profile. For the complete list, visit{' '}
        <a href={`https://${db?.website || 'iitb.irins.org'}`} target="_blank" rel="noreferrer">
          {db?.website || 'iitb.irins.org'}
        </a>
        .
      </PageIntro>

      <Section title="How to use this database">
        <Card>
          <ol className="howto-list">
            {(db?.how_to_use || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Card>
      </Section>

      <Section
        title="Search Professors"
        note={`${fmt(all.length)} records loaded - combine search with the filters below.`}
      >
        <div className="search-bar">
          <div className="search-input-wrap">
            <input
              type="search"
              placeholder="Search expertise, professor, department… (e.g. chemistry, climate, Kishore)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && rememberQuery()}
              onFocus={() => setShowHist(true)}
              onBlur={() => {
                histTimer.current = setTimeout(() => setShowHist(false), 150);
              }}
            />
            {showHist && !q && history.length > 0 && (
              <div className="search-history">
                <div className="search-history-label">Recent searches</div>
                {history.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQ(h);
                      setShowHist(false);
                    }}
                  >
                    🕘 {h}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All departments' : d}
              </option>
            ))}
          </select>
          <select className="select" value={desig} onChange={(e) => setDesig(e.target.value)} aria-label="Designation">
            {designations.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All designations' : d}
              </option>
            ))}
          </select>
        </div>
        <div className="result-count" data-sem={semState}>
          <span>
            Showing {fmt(from)}-{fmt(to)} of {fmt(professors.length)} professors
            {professors.length !== all.length && ` (filtered from ${fmt(all.length)})`}
            {q.trim() && professors.length > 1 && ' · ranked by relevance'}
            {semActive && ' · neural ranking'}
          </span>
          <span className="result-actions">
            <button type="button" className="btn chip" onClick={exportCsv} title="Download the filtered list as CSV">
              ⬇ Export CSV
            </button>
            <button
              type="button"
              className={`btn chip${starOnly ? ' active' : ''}`}
              onClick={() => setStarOnly((v) => !v)}
              aria-pressed={starOnly}
              title="Show only starred professors"
            >
              ★ Starred{starred.size ? ` (${starred.size})` : ''}
            </button>
          </span>
        </div>
        <Card>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="star-col" aria-label="Compare" />
                  <th className="star-col" aria-label="Star" />
                  {headers.map((h) => (
                    <th key={h}>{labelOf(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => {
                  const k = keyOf(p);
                  const isStarred = starred.has(k);
                  const inCmp = compare.has(k);
                  return (
                    <tr key={`${k}-${(current - 1) * PAGE_SIZE + i}`} className={inCmp ? 'row-cmp' : ''}>
                      <td className="star-cell">
                        <input
                          type="checkbox"
                          className="cmp-box"
                          checked={inCmp}
                          onChange={() => toggleCompare(p)}
                          title={inCmp ? 'Remove from compare' : compare.size >= 3 ? 'Compare holds up to 3' : 'Add to compare'}
                          aria-label={`Compare ${p.Name}`}
                        />
                      </td>
                      <td className="star-cell">
                        <button
                          type="button"
                          className={`star-btn${isStarred ? ' on' : ''}`}
                          onClick={() => toggleStar(p)}
                          aria-pressed={isStarred}
                          aria-label={isStarred ? `Remove ${p.Name} from starred` : `Star ${p.Name}`}
                          title={isStarred ? 'Remove star' : 'Star this professor'}
                        >
                          ★
                        </button>
                      </td>
                  {headers.map((h) => (
                    <td key={h} style={h === 'Research_Interest' ? { minWidth: 260 } : undefined}>
                      {h === 'Name' ? (
                        p.Profile_URL ? (
                          <a className="prof-link" href={p.Profile_URL} target="_blank" rel="noreferrer" title="Open Vidwan profile">
                            <strong>{p[h]}</strong>
                          </a>
                        ) : (
                          <strong>{p[h]}</strong>
                        )
                      ) : h === 'ORCID' && p.ORCID ? (
                        <a className="prof-link" href={`https://orcid.org/${p.ORCID}`} target="_blank" rel="noreferrer">
                          {p.ORCID}
                        </a>
                      ) : (
                        p[h] ?? ''
                      )}
                    </td>
                  ))}
                    </tr>
                  );
                })}
                {professors.length === 0 && (
                  <tr>
                    <td colSpan={headers.length + 2} className="empty-cell">
                      {starOnly && starred.size === 0
                        ? 'No starred professors yet - tap the ★ on any row to bookmark it.'
                        : <>No professors match “{q}”{dept !== 'All' ? ` in ${dept}` : ''}</>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        {totalPages > 1 && (
          <div className="pager">
            <button type="button" className="btn ghost" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              ← Previous
            </button>
            <span className="pager-info">
              Page {current} of {totalPages}
            </span>
            <button
              type="button"
              className="btn ghost"
              disabled={current >= totalPages}
              onClick={() => setPage(current + 1)}
            >
              Next →
            </button>
          </div>
        )}
        <Callout>
          Tip: click a linked name to open that professor's Vidwan profile, star ★ professors to build a
          shortlist, and tick ☐ up to three professors to <strong>compare</strong> them side by side. Your
          stars, comparison and search are saved in this browser, and the search link in the address bar can
          be shared.
        </Callout>
      </Section>

      {compare.size > 0 && !showCmp && (
        <div className="compare-bar">
          <span>
            Compare: {compareList.map((p) => p.Name).join(', ')} ({compare.size}/3)
          </span>
          <span className="compare-bar-actions">
            <button type="button" className="btn" onClick={() => setShowCmp(true)} disabled={compare.size < 2}>
              Compare →
            </button>
            <button type="button" className="btn chip" onClick={() => setCompare(new Set())}>
              Clear
            </button>
          </span>
        </div>
      )}

      {showCmp && (
        <div className="modal-backdrop" onClick={() => setShowCmp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>Compare professors</strong>
              <button type="button" className="btn chip" onClick={() => setShowCmp(false)}>
                ✕ Close
              </button>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Field</th>
                    {compareList.map((p) => (
                      <th key={keyOf(p)}>{p.Name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => (
                    <tr key={h}>
                      <td className="cmp-field">{labelOf(h)}</td>
                      {compareList.map((p) => (
                        <td key={keyOf(p)}>
                          {h === 'Name' && p.Profile_URL ? (
                            <a className="prof-link" href={p.Profile_URL} target="_blank" rel="noreferrer">
                              <strong>{p[h]}</strong>
                            </a>
                          ) : (
                            p[h] || '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
