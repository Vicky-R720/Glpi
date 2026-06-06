import { NavLink } from 'react-router-dom';

/**
 * Navbar — GLPI-style top navigation bar
 */
export default function Navbar() {
  const linkBase =
    'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2';
  const activeClass = 'bg-white/20 text-white shadow-sm';
  const inactiveClass = 'text-blue-100 hover:bg-white/10 hover:text-white';

  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: 'linear-gradient(135deg, var(--glpi-primary-dark), var(--glpi-primary))' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              G
            </div>
            <span className="text-white font-semibold text-base tracking-tight">
              NewAPP <span className="text-blue-200 font-normal text-xs ml-1">Front-Office</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? activeClass : inactiveClass}`
              }
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Inventaire
            </NavLink>
            <NavLink
              to="/ticket"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? activeClass : inactiveClass}`
              }
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Créer un Ticket
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
