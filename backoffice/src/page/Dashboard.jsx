import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { fetchDashboardMetrics } from "../service/dashboard.js";
import { RESET_ENTITIES } from "../service/reset.js";

function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchDashboardMetrics();
        setMetrics(data);
        setError(false);
      } catch (e) {
        console.error("Erreur de chargement du dashboard :", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Formatage des statuts GLPI sous forme de badges HTML
  const renderStatusBadge = (statusId) => {
    const id = parseInt(statusId, 10);
    switch (id) {
      case 1:
        return <span className="badge bg-danger">Nouveau</span>;
      case 2:
      case 3:
        return <span className="badge bg-warning text-dark">En cours</span>;
      case 4:
        return <span className="badge bg-secondary">En attente</span>;
      case 5:
        return <span className="badge bg-info text-dark">Résolu</span>;
      case 6:
        return <span className="badge bg-success">Clos</span>;
      default:
        return <span className="badge bg-light text-dark">Inconnu ({statusId})</span>;
    }
  };

  // Formatage des types GLPI
  const renderTypeBadge = (typeId) => {
    const id = parseInt(typeId, 10);
    if (id === 1) {
      return <span className="badge bg-outline-danger border border-danger text-danger">⚠️ Incident</span>;
    } else if (id === 2) {
      return <span className="badge bg-outline-primary border border-primary text-primary">📋 Demande</span>;
    }
    return <span className="badge bg-light text-dark">Type ({typeId})</span>;
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main">
        <header className="topbar px-4 py-3 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
          <div>
            <h1 className="h4 mb-1">Dashboard GLPI</h1>
            <p className="text-muted mb-0 small">Vue globale du parc d'équipements et des tickets ITIL.</p>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-danger d-flex align-items-center gap-2"
              onClick={() => navigate("/reset")}
            >
              <span>🔄</span> Réinitialiser
            </button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Actualiser
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="content p-4">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center my-5 py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : error || !metrics ? (
            <div className="alert alert-danger" role="alert">
              Une erreur s'est produite lors de la connexion à l'API GLPI. Veuillez vérifier votre jeton de session.
            </div>
          ) : (
            <>
              {/* CARTES DE STATISTIQUES GLOBALES */}
              <div className="row g-4 mb-4">
                
                {/* BLOC 1: ÉLÉMENTS DE PARC */}
                <div className="col-md-6">
                  <div className="card shadow-sm border-0 h-100 p-3">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="card-title text-secondary mb-0">Total Équipements</h5>
                        <span className="fs-3">🖥️</span>
                      </div>
                      
                      <h2 className="display-4 fw-bold text-dark mb-4">{metrics.assets.total}</h2>
                      
                      <div className="border-top pt-3 flex-grow-1">
                        <h6 className="small text-uppercase text-secondary fw-semibold mb-3">Détail par Type d'Équipement</h6>
                        <div className="overflow-auto ps-1" style={{ maxHeight: '240px' }}>
                          {Object.entries(metrics.assets.details).map(([type, count]) => {
                            const label = RESET_ENTITIES.find(e => e.key === type)?.label || type;
                            // N'afficher que les types contenant au moins 1 élément pour plus de clarté
                            if (count === 0) return null;

                            return (
                              <div key={type} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                <span className="text-muted small">{label}</span>
                                <span className="badge bg-light text-dark border fw-bold">{count}</span>
                              </div>
                            );
                          })}
                          {metrics.assets.total === 0 && (
                            <div className="text-center text-muted small py-3">Aucun équipement enregistré.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOC 2: STATS DES TICKETS */}
                <div className="col-md-6">
                  <div className="card shadow-sm border-0 h-100 p-3">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="card-title text-secondary mb-0">Tickets de Support</h5>
                        <span className="fs-3">🎟️</span>
                      </div>
                      
                      <h2 className="display-4 fw-bold text-danger mb-4">{metrics.tickets.total}</h2>
                      
                      <div className="border-top pt-3">
                        <h6 className="small text-uppercase text-secondary fw-semibold mb-2">Répartition par Type</h6>
                        <div className="d-flex justify-content-between mb-2 small text-muted">
                          <span>⚠️ Incidents</span>
                          <span className="fw-bold text-danger">{metrics.tickets.types.incident}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-3 small text-muted">
                          <span>📋 Demandes</span>
                          <span className="fw-bold text-primary">{metrics.tickets.types.request}</span>
                        </div>

                        <h6 className="small text-uppercase text-secondary fw-semibold mb-2 border-top pt-2">Par Statuts GLPI</h6>
                        <div className="row text-center g-2 mt-1">
                          <div className="col-4">
                            <div className="bg-light p-2 rounded small">
                              <span className="d-block text-secondary text-truncate">Nouveau</span>
                              <strong className="text-dark">{metrics.tickets.statuses.new}</strong>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="bg-light p-2 rounded small">
                              <span className="d-block text-secondary text-truncate">En cours</span>
                              <strong className="text-dark">{metrics.tickets.statuses.processing}</strong>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="bg-light p-2 rounded small">
                              <span className="d-block text-secondary text-truncate">Clos/Résolu</span>
                              <strong className="text-success">
                                {metrics.tickets.statuses.resolved + metrics.tickets.statuses.closed}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* SECTION TABLEAU DÉTAILLÉ DES TICKETS */}
              <div className="card shadow-sm border-0 p-4 mt-4">
                <h5 className="text-secondary mb-3">Liste Détaillée des Tickets</h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>Titre / Sujet</th>
                        <th>Type ITIL</th>
                        <th>Statut</th>
                        <th>Dernière modif.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.tickets.list.map((ticket) => (
                        <tr key={ticket.id}>
                          <td><strong>#{ticket.id}</strong></td>
                          <td>{ticket.name || <span className="text-muted italic">Sans titre</span>}</td>
                          <td>{renderTypeBadge(ticket.type)}</td>
                          <td>{renderStatusBadge(ticket.status)}</td>
                          <td className="small text-muted">{ticket.date_mod}</td>
                        </tr>
                      ))}
                      {metrics.tickets.list.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-4">
                            Aucun ticket trouvé dans la base GLPI.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
