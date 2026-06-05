import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { fetchEntityIds } from "../service/reset.js";

function Accueil() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    Computer: { count: 0, loading: true },
    Monitor: { count: 0, loading: true },
    Ticket: { count: 0, loading: true },
  });

  useEffect(() => {
    async function loadStats() {
      const entities = ["Computer", "Monitor", "Ticket"];
      for (const entity of entities) {
        try {
          const ids = await fetchEntityIds(entity);
          setStats((prev) => ({
            ...prev,
            [entity]: { count: ids.length, loading: false },
          }));
        } catch (e) {
          console.error(`Failed to load stats for ${entity}:`, e);
          setStats((prev) => ({
            ...prev,
            [entity]: { count: 0, loading: false, error: true },
          }));
        }
      }
    }
    loadStats();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main">
        {/* TOOLBAR */}
        <header className="topbar px-4 py-3 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
          <div>
            <h1 className="h4 mb-1">Tableau de bord GLPI</h1>
            <p className="text-muted mb-0">Vue d'ensemble du parc informatique.</p>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-danger d-flex align-items-center gap-2"
              onClick={() => navigate("/reset")}
            >
              <span>🔄</span> Réinitialiser les données
            </button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Actualiser
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="content p-4">
          <div className="row g-4 mb-4">
            
            {/* CARD COMPUTER */}
            <div className="col-md-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="fs-1">🖥️</span>
                    <h5 className="card-title text-secondary mt-2">Ordinateurs</h5>
                    <p className="text-muted small">Postes clients et serveurs enregistrés.</p>
                  </div>
                  <h3 className="display-6 fw-bold text-dark mt-3">
                    {stats.Computer.loading ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      stats.Computer.count
                    )}
                  </h3>
                </div>
              </div>
            </div>

            {/* CARD MONITOR */}
            <div className="col-md-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="fs-1">📺</span>
                    <h5 className="card-title text-secondary mt-2">Écrans & Moniteurs</h5>
                    <p className="text-muted small">Périphériques d'affichage connectés.</p>
                  </div>
                  <h3 className="display-6 fw-bold text-dark mt-3">
                    {stats.Monitor.loading ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      stats.Monitor.count
                    )}
                  </h3>
                </div>
              </div>
            </div>

            {/* CARD TICKET */}
            <div className="col-md-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body d-flex flex-column justify-content-between">
                  <div>
                    <span className="fs-1">🎟️</span>
                    <h5 className="card-title text-secondary mt-2">Tickets d'Incidents</h5>
                    <p className="text-muted small">Demandes de support et pannes signalées.</p>
                  </div>
                  <h3 className="display-6 fw-bold text-danger mt-3">
                    {stats.Ticket.loading ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      stats.Ticket.count
                    )}
                  </h3>
                </div>
              </div>
            </div>

          </div>

          {/* PARC SYSTEM HIGHLIGHT */}
          <div className="card shadow-sm border-0 p-4 mt-4">
            <h5 className="mb-3 text-secondary">Statut de la connexion API</h5>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-success rounded-circle" style={{ width: '12px', height: '12px' }}></div>
              <div>
                <span className="fw-bold text-dark">URL GLPI:</span> <code className="mx-2">http://glpi.local/apirest.php/</code>
              </div>
            </div>
            <div className="mt-3 text-muted small">
              La console utilise un token de session fixe pour toutes les requêtes d'administration et de vidage de tables.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Accueil;
