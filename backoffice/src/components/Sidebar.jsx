import { useState } from 'react';
import { useAuth } from '../service/AuthContext.jsx';

function Sidebar({ onLogout }) {
  const [open, setOpen] = useState({ assets: true, configuration: true })
  const { logout } = useAuth()
  const handleLogout = onLogout || logout

  return (
    <aside className="sidebar bg-dark text-white d-flex flex-column" style={{ minHeight: '100vh' }}>
      <div className="px-4 py-4 border-bottom border-secondary">
        <h2 className="h5 mb-1 text-primary">GLPI Suite</h2>
        <p className="small text-secondary mb-0">Gestion de Parc & ITIL</p>
      </div>

      <nav className="nav flex-column px-3 py-3 gap-1">
        <div className="px-3 py-2 sidebar-section">
          <div className="section-title small text-uppercase text-secondary mb-2">Général</div>
          <nav className="nav flex-column gap-1">
            <a className="nav-link active" href="/accueil">
              <span className="nav-icon">🏠</span>
              Tableau de bord
            </a>
          </nav>
        </div>

        <div className="px-3 py-2 sidebar-section">
          <div className="section-title small text-uppercase text-secondary mb-2">Inventaire</div>
          <nav className="nav flex-column gap-1">
            <button
              type="button"
              className="nav-link d-flex justify-content-between align-items-center"
              onClick={() => setOpen((s) => ({ ...s, assets: !s.assets }))}
            >
              <span>
                <span className="nav-icon">🖥️</span>
                Équipements
              </span>
              <span className="chev">{open.assets ? '▾' : '▸'}</span>
            </button>

            {open.assets && (
              <div className="nav-sublist ms-3 mt-1">
                <a className="nav-link small" href="/computers">🖥️ Ordinateurs</a>
                <a className="nav-link small" href="/monitors">📺 Écrans & Moniteurs</a>
                <a className="nav-link small" href="/tickets">🎟️ Tickets & Incidents</a>
                <a className="nav-link small" href="/items-cost">💰 Coût des Équipements</a>
              </div>
            )}
          </nav>
        </div>

        <div className="px-3 py-2 sidebar-section">
          <div className="section-title small text-uppercase text-secondary mb-2">Paramètres</div>
          <nav className="nav flex-column gap-1">
            <button
              type="button"
              className="nav-link d-flex justify-content-between align-items-center"
              onClick={() => setOpen((s) => ({ ...s, configuration: !s.configuration }))}
            >
              <span>
                <span className="nav-icon">⚙️</span>
                Configuration
              </span>
              <span className="chev">{open.configuration ? '▾' : '▸'}</span>
            </button>

            {open.configuration && (
              <div className="nav-sublist ms-3 mt-1">
                <a className="nav-link small" href="/reset">🔄 Réinitialisation</a>
              </div>
            )}
          </nav>
        </div>
      </nav>

      <div className="px-4 py-4 border-top border-secondary mt-auto">
        <button 
          onClick={handleLogout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <span>🚪</span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
