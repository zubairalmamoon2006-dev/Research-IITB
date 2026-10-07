import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useLayoutEffect } from 'react';
import { useReport } from './context/ReportContext';
import { asset } from './lib/paths';
import { downloadReportPdf } from './lib/pdfReport';
import { setChartTheme } from './components/charts';
import SearchOverlay from './components/SearchOverlay';
import { PageIntro, Callout } from './components/ui';
import Dashboard from './pages/Dashboard';
import Impact from './pages/Impact';
import Excellence from './pages/Excellence';
import Publications from './pages/Publications';
import Topics from './pages/Topics';
import Collaborations from './pages/Collaborations';
import Funding from './pages/Funding';
import Professors from './pages/Professors';
import About from './pages/About';
import Admin from './pages/Admin';
import { DepartmentList, DepartmentDetail } from './pages/Departments';
import Timeline from './pages/Timeline';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/impact', label: 'Research Impact' },
  { to: '/excellence', label: 'Rankings' },
  { to: '/publications', label: 'Publications' },
  { to: '/topics', label: 'Topics' },
  { to: '/collaborations', label: 'Collaborations' },
  { to: '/funding', label: 'Funding' },
  { to: '/professors', label: 'Professors' },
  { to: '/departments', label: 'Departments' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/about', label: 'About' }
];

// Professors page is switched off while the data is refreshed.
// Change this to true to bring the page back.
const PROFESSORS_ENABLED = true;

function ProfessorsUpdating() {
  return (
    <>
      <PageIntro title="Professor research database." accent="Back soon." eyebrow="Directory">
        This section is temporarily unavailable.
      </PageIntro>
      <Callout>
        <strong>Data is being updated.</strong> Please check back shortly.
      </Callout>
    </>
  );
}

export default function App() {
  const { loading, error, reload, isAdmin, report } = useReport();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('iitb-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [, setThemeTick] = useState(0);
  const location = useLocation();

  // Builds the ready-made report PDF (cover, contents, every section) and
  // hands it to the browser as a download instead of printing the website.
  const onDownload = async () => {
    if (exporting || !report) return;
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 40)); // let the busy state paint
      downloadReportPdf(report);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    setChartTheme(dark);
    setThemeTick((t) => t + 1);
    try {
      localStorage.setItem('iitb-theme', dark ? 'dark' : 'light');
    } catch {
      /* storage unavailable */
    }
  }, [dark]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fade each page block in the first time it scrolls into view.
  useLayoutEffect(() => {
    const root = document.querySelector('main.content');
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -40px 0px' }
    );
    const scan = () => {
      Array.from(root.children).forEach((el) => {
        if (!el.classList.contains('reveal')) {
          el.classList.add('reveal');
          io.observe(el);
        }
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [location.pathname, loading, error]);

  if (loading) {
    return (
      <div className="boot">
        <div className="spinner" />
        <p>Loading research report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="boot">
        <p className="error-text">Failed to load report data: {error}</p>
        <button className="btn" onClick={reload}>Retry</button>
      </div>
    );
  }

  return (
    <div className="layout">
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setOpen(false)} aria-label="RESEARCH @ IITB home">
          <img className="brand-logo" src={asset('/ugac-logo.svg')} alt="UGAC" />
        </Link>

        <nav className={`site-nav ${open ? 'open' : ''}`}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `nav-link ${n.featured ? 'featured' : ''} ${isActive ? 'active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-team">
          <span className="header-team-name">DAV Team</span>
          <img className="header-logo" src={asset('/header-logo.png')} alt="DAV" />
        </div>

        <div className="header-actions">
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            ☰
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Search the portal (Ctrl+K or /)"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            ⌕
          </button>
          <div className="header-tools">
            <button
              type="button"
              className="icon-btn"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle dark mode"
              onClick={() => setDark((d) => !d)}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              className={`icon-btn${exporting ? ' busy' : ''}`}
              title={exporting ? 'Preparing your PDF…' : 'Download the full report as PDF'}
              aria-label="Download report"
              onClick={onDownload}
              disabled={exporting}
            >
              {exporting ? '◌' : '⬇︎'}
            </button>
          </div>
        </div>

        {isAdmin && (
          <Link to="/admin" className="btn header-cta">
            Update Data
          </Link>
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <main className="content" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/excellence" element={<Excellence />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/collaborations" element={<Collaborations />} />
          <Route path="/funding" element={<Funding />} />
          <Route path="/professors" element={PROFESSORS_ENABLED ? <Professors /> : <ProfessorsUpdating />} />
          <Route path="/departments" element={<DepartmentList />} />
          <Route path="/department/:name" element={<DepartmentDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/about" element={<About />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <span>
          Made with <span className="heart">❤️</span> by DAV Team, UGAC
        </span>
        <span>
          {isAdmin
            ? 'All charts read live from backend data · updatable via the Update Data page'
            : 'All charts read live from backend data'}
        </span>
      </footer>
    </div>
  );
}
