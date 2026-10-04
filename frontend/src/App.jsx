import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useReport } from './context/ReportContext';
import { setChartTheme } from './components/charts';
import SearchOverlay from './components/SearchOverlay';
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
  { to: '/professors', label: 'Professors', featured: true },
  { to: '/departments', label: 'Departments', featured: true },
  { to: '/timeline', label: 'Timeline' },
  { to: '/about', label: 'About' }
];

export default function App() {
  const { loading, error, reload, isAdmin } = useReport();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('iitb-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [, setThemeTick] = useState(0);
  const location = useLocation();

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
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}ugac-logo.svg`} alt="UGAC" />
        </Link>

        <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
          ☰
        </button>

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
          <img className="header-logo" src={`${import.meta.env.BASE_URL}header-logo.png`} alt="DAV" />
        </div>

        <div className="header-tools">
          <button
            type="button"
            className="icon-btn"
            title="Search the portal (Ctrl+K or /)"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            ⌕
          </button>
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
            className="icon-btn"
            title="Print or save this page as PDF"
            aria-label="Print"
            onClick={() => window.print()}
          >
            ⎙
          </button>
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
          <Route path="/professors" element={<Professors />} />
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
