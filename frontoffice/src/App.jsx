import { useEffect, useState } from 'react'
import './App.css'
import Assets from './page/Assets.jsx'
import DeclareTicket from './page/DeclareTicket.jsx'

//tsiory
const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [computers, setComputers] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Inventory and Tickets (for inventory and list tabs)
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch Computers
      const resComp = await fetch('/api/Computer/?range=0-100', {
        headers: { 
          "Content-Type": "application/json",
          "Session-Token": SESSION_TOKEN,
          "App-Token": APP_TOKEN
        }
      });
      if (resComp.ok) {
        const data = await resComp.json();
        setComputers(Array.isArray(data) ? data : []);
      }

      // Fetch Monitors
      const resMon = await fetch('/api/Monitor/?range=0-100', {
        headers: { 
          "Content-Type": "application/json",
          "Session-Token": SESSION_TOKEN,
          "App-Token": APP_TOKEN
        }
      });
      if (resMon.ok) {
        const data = await resMon.json();
        setMonitors(Array.isArray(data) ? data : []);
      }

      // Fetch Tickets
      const resTick = await fetch('/api/Ticket/?range=0-100', {
        headers: { 
          "Content-Type": "application/json",
          "Session-Token": SESSION_TOKEN,
          "App-Token": APP_TOKEN
        }
      });
      if (resTick.ok) {
        const data = await resTick.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error loading frontoffice data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <header className="site-header">
        <div className="container d-flex align-items-center justify-content-between">
          <a href="#" className="brand">🏢 Portail Utilisateur GLPI</a>
          <div className="d-flex gap-3">
            <button 
              className={`btn btn-sm ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                setActiveTab('inventory');
                loadData(); // refresh list
              }}
            >
              🖥️ Mon Matériel
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'assets' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('assets')}
            >
              🔍 Recherche d'Éléments
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'tickets' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                setActiveTab('tickets');
                loadData(); // refresh list
              }}
            >
              🎟️ Mes Tickets
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'new-ticket' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('new-ticket')}
            >
              ➕ Déclarer Incident / Demande
            </button>
          </div>
        </div>
      </header>

      <main className="container main-content" style={{ minHeight: '60vh' }}>
        {loading && activeTab !== 'new-ticket' && activeTab !== 'assets' && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Chargement des informations...</p>
          </div>
        )}

        {/* Tab: Inventory */}
        {activeTab === 'inventory' && !loading && (
          <div>
            <h2 className="h4 mb-4">Mes Équipements Enregistrés</h2>
            <div className="row g-4">
              
              {/* Computers section */}
              <div className="col-md-6">
                <div className="card shadow-sm border-0 p-4">
                  <h3 className="h5 text-primary border-bottom pb-2 mb-3">🖥️ Ordinateurs ({computers.length})</h3>
                  {computers.length === 0 ? (
                    <p className="text-muted small">Aucun ordinateur assigné.</p>
                  ) : (
                    <div className="list-group list-group-flush">
                      {computers.map(c => (
                        <div key={c.id} className="list-group-item py-2 px-0 d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold text-dark">{c.name}</span>
                            {c.serial && <span className="text-muted small d-block">S/N: {c.serial}</span>}
                          </div>
                          <span className="badge bg-light text-dark border">ID: {c.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Monitors section */}
              <div className="col-md-6">
                <div className="card shadow-sm border-0 p-4">
                  <h3 className="h5 text-primary border-bottom pb-2 mb-3">📺 Écrans & Moniteurs ({monitors.length})</h3>
                  {monitors.length === 0 ? (
                    <p className="text-muted small">Aucun moniteur assigné.</p>
                  ) : (
                    <div className="list-group list-group-flush">
                      {monitors.map(m => (
                        <div key={m.id} className="list-group-item py-2 px-0 d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold text-dark">{m.name}</span>
                            {m.serial && <span className="text-muted small d-block">S/N: {m.serial}</span>}
                          </div>
                          <span className="badge bg-light text-dark border">ID: {m.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab: Tickets list */}
        {activeTab === 'tickets' && !loading && (
          <div>
            <h2 className="h4 mb-4">Mes Demandes de Support / Incidents</h2>
            <div className="card shadow-sm border-0 p-4">
              {tickets.length === 0 ? (
                <div className="text-center py-4">
                  <span className="fs-1">🎉</span>
                  <p className="text-muted mt-2">Aucun incident ou ticket actif.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Incident / Titre</th>
                        <th>Status</th>
                        <th className="text-end">Date de création</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map(t => (
                        <tr key={t.id}>
                          <td><code>#{t.id}</code></td>
                          <td>
                            <span className="fw-bold text-dark">{t.name}</span>
                            {t.content && <span className="text-muted small d-block text-truncate" style={{ maxWidth: '400px' }} dangerouslySetInnerHTML={{ __html: t.content }}></span>}
                          </td>
                          <td>
                            <span className="badge bg-warning text-dark">En cours</span>
                          </td>
                          <td className="text-end text-muted small">{t.date_creation || t.date_mod || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Declare ticket (Advanced) */}
        {activeTab === 'new-ticket' && (
          <DeclareTicket />
        )}

        {/* Tab: Assets Search */}
        {activeTab === 'assets' && (
          <Assets />
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          🏢 Portail Utilisateur GLPI • Propulsé par React & API REST
        </div>
      </footer>
    </div>
  )
}

export default App
