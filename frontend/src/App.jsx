import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import TeamDashboard from './pages/TeamDashboard';
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
          {/* Teams page removed from navigation for isolation - access via direct URL */}
        </div>
      </div>
    </nav>
  );
}

function AppShell() {
  const location = useLocation();
  const showHero = location.pathname === '/teams';

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-shell fade-in">
        {showHero && (
          <section className="hero-banner">
            <div className="hero-card">
              <div className="hero-copy-block">
                <p className="eyebrow">Team management</p>
                <h1 className="hero-title">Organize your cricket teams and track everything in one place.</h1>
                <p className="hero-copy">
                  Create teams, manage players, schedule matches, and handle expenses. Each team gets their own isolated dashboard with dedicated insights and controls.
                </p>
                <div className="hero-actions">
                  <p className="hero-note">Access your team dashboard directly via URL (e.g., /team/1/dashboard)</p>
                  <Link to="/teams" className="btn-secondary">Team Admin</Link>
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
            <Route path="/" element={<Navigate to="/teams" replace />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/teams/:id/dashboard" element={<TeamDashboard />} />
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
