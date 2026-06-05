import { useEffect, useState } from 'react'
import './App.css'

//tsiory
const SESSION_TOKEN = "U3Z3ZXhEbTZrVHJ1WjdBOXdRZHFudVd0bCtTbDlGdVBMclhHd3k5ejdKejN1QUEvSlRmUnZrMDJVTTA3SnhOaXVKOHRxRi9na0xMcmd1S3Z1a08zRCt5OQ==";
const APP_TOKEN = "nD6HHnC4nR9eXSmsevemD8hyA7gAhgVhcuQSPiJh";

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [computers, setComputers] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null);

  // Fetch Inventory and Tickets
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

  // Submit Ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDesc.trim()) return;

    setSubmitStatus({ loading: true });
    try {
      const res = await fetch('/api/Ticket/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': SESSION_TOKEN,
          'App-Token': APP_TOKEN
        },
        body: JSON.stringify({
          input: {
            name: ticketTitle,
            content: ticketDesc
          }
        })
      });

      if (res.ok) {
        setSubmitStatus({ success: true, message: 'Ticket créé avec succès !' });
        setTicketTitle('');
        setTicketDesc('');
        loadData(); // reload tickets
      } else {
        const err = await res.text();
        setSubmitStatus({ success: false, message: `Erreur: ${err}` });
      }
    } catch (e) {
      setSubmitStatus({ success: false, message: `Erreur réseau: ${e.message}` });
    }
  };

  return (
    <div>
      <header className="site-header">
        <div className="container d-flex align-items-center justify-content-between">
          <a href="#" className="brand">🏢 Portail Utilisateur GLPI</a>
          <div className="d-flex gap-3">
            <button 
              className={`btn btn-sm ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('inventory')}
            >
              🖥️ Mon Matériel
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'tickets' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('tickets')}
            >
              🎟️ Mes Tickets
            </button>
            <button 
              className={`btn btn-sm ${activeTab === 'new-ticket' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setActiveTab('new-ticket')}
            >
              ➕ Déclarer un incident
            </button>
          </div>
        </div>
      </header>

      <main className="container main-content" style={{ minHeight: '60vh' }}>
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Chargement des informations...</p>
          </div>
        )}

        {!loading && activeTab === 'inventory' && (
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

        {!loading && activeTab === 'tickets' && (
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

        {!loading && activeTab === 'new-ticket' && (
          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="card shadow-sm border-0 p-4">
                <h2 className="h4 mb-3">Déclarer un Nouvel Incident</h2>
                <p className="text-muted small mb-4">Votre ticket sera instantanément envoyé à l'équipe de support GLPI pour traitement.</p>

                <form onSubmit={handleSubmitTicket}>
                  <div className="mb-3">
                    <label className="form-label fw-bold" htmlFor="ticketTitle">Titre de l'incident</label>
                    <input 
                      type="text" 
                      id="ticketTitle"
                      className="form-control" 
                      placeholder="Ex: Mon écran ne s'allume plus"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold" htmlFor="ticketDesc">Description détaillée</label>
                    <textarea 
                      id="ticketDesc"
                      className="form-control" 
                      rows="5" 
                      placeholder="Décrivez précisément le problème rencontré (symptômes, matériel concerné)..."
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {submitStatus && (
                    <div className={`alert ${submitStatus.success ? 'alert-success' : 'alert-danger'} mb-3`}>
                      {submitStatus.message}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100"
                    disabled={submitStatus?.loading}
                  >
                    {submitStatus?.loading ? 'Création en cours...' : 'Envoyer le ticket d\'incident'}
                  </button>
                </form>
              </div>
            </div>
          </div>
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
