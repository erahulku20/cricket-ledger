import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';

function Navbar() {
  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'nav-link-active' : ''}`;

  return (
    <nav className="top-nav">
      <div className="nav-inner">
        <Link to="/" className="brand-link">
          <span className="brand-emoji">🏏</span>
          <div>
            <div className="brand-name">Cricket League Ledger</div>
            <div className="brand-tagline">Team, match, and expense tracking made easy</div>
          </div>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
          <NavLink to="/teams" className={linkClass}>Teams</NavLink>
          <NavLink to="/matches" className={linkClass}>Matches</NavLink>
        </div>
      </div>
    </nav>
  );
}

function AppShell() {
  const location = useLocation();
  const showHero = location.pathname === '/';

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-shell fade-in">
        {showHero && (
          <section className="hero-banner">
            <div className="hero-card">
              <div className="hero-copy-block">
                <p className="eyebrow">Cricket league management</p>
                <h1 className="hero-title">A clean dashboard for teams, fixtures, and shared expenses.</h1>
                <p className="hero-copy">
                  Everything you already track is now presented with polished cards, smarter spacing, and a consistent visual system. Navigate faster and keep your league running smoothly.
                </p>
                <div className="hero-actions">
                  <Link to="/teams" className="btn-primary">Manage teams</Link>
                  <Link to="/matches" className="btn-muted">View fixtures</Link>
                </div>
              </div>
              <div className="hero-visual">
                <div className="hero-chip">Live league insights</div>
                <div className="hero-figure">
                  <div className="hero-figure-card">
                    <p className="hero-figure-title">12 teams</p>
                    <p className="hero-figure-note">Active in the current season</p>
                  </div>
                  <div className="hero-figure-card accent">
                    <p className="hero-figure-title">8 matches</p>
                    <p className="hero-figure-note">Scheduled in the next 2 weeks</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        <main className="content-shell">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matches/:id" element={<MatchDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
