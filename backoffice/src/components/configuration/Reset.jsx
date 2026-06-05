import { useState } from "react";
import Sidebar from "../layout/Sidebar.jsx";
import { resetEntities, RESET_ENTITIES } from "../../services/reset.js";

function Reset() {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set(RESET_ENTITIES.map(item => item.key)));
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState({});

  const allKeys = RESET_ENTITIES.map((item) => item.key);
  const allSelected = selected.size === allKeys.length && allKeys.length > 0;

  function toggleEntity(key) {
    if (loading) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (loading) return;
    setSelected((prev) => {
      if (prev.size === allKeys.length) return new Set();
      return new Set(allKeys);
    });
  }

  async function handleReset() {
    if (selected.size === 0 || loading) return;
    
    setLoading(true);
    setStatus(null);
    setLogs(["Début de la réinitialisation des tables..."]);
    
    const initialProgress = {};
    selected.forEach(key => {
      initialProgress[key] = { status: 'pending', message: 'En attente...' };
    });
    setProgress(initialProgress);

    try {
      const res = await resetEntities(Array.from(selected), (entity, state, count, errMsg) => {
        setProgress(prev => ({
          ...prev,
          [entity]: {
            status: state,
            count: count,
            message: state === 'loading' ? 'Suppression en cours...' : 
                     state === 'success' ? `Succès (${count} supprimé(s))` : 
                     `Erreur: ${errMsg}`
          }
        }));

        const label = RESET_ENTITIES.find(e => e.key === entity)?.label || entity;
        if (state === 'loading') {
          setLogs(prev => [...prev, `⏳ Réinitialisation de la table ${label}...`]);
        } else if (state === 'success') {
          setLogs(prev => [...prev, `✅ Table ${label} réinitialisée avec succès (${count} entrées supprimées).`]);
        } else {
          setLogs(prev => [...prev, `❌ Échec pour la table ${label}: ${errMsg}`]);
        }
      });

      const totalDeleted = res.reduce((acc, curr) => acc + (curr.count || 0), 0);
      setStatus({ ok: true, message: `Réinitialisation complétée avec succès ! ${totalDeleted} éléments supprimés au total.` });
      setLogs(prev => [...prev, `🎉 Processus de réinitialisation terminé.`]);
    } catch (err) {
      const msg = err?.message || "Une erreur inattendue est survenue.";
      setStatus({ ok: false, message: msg });
      setLogs(prev => [...prev, `🚨 Erreur critique générale: ${msg}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main p-4">
        
        {/* TOPBAR / TOOLBAR */}
        <header className="topbar px-4 py-3 d-flex align-items-center justify-content-between mb-4 rounded shadow-sm">
          <div>
            <h1 className="h4 mb-1 text-primary">Réinitialisation des Données</h1>
            <p className="text-muted mb-0 small">Nettoyage des tables de la base GLPI via l'API REST.</p>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-light text-dark border p-2">
              🔗 http://glpi.local/apirest.php/
            </span>
            <button
              className="btn btn-danger d-flex align-items-center gap-2"
              onClick={handleReset}
              disabled={selected.size === 0 || loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Reset en cours...
                </>
              ) : (
                <>
                  <span>🔄</span> Lancer le reset
                </>
              )}
            </button>
          </div>
        </header>

        {/* CONTENUR PRINCIPAL */}
        <div className="row g-4">
          <div className="col-md-7">
            <div className="card shadow-sm border-0 p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 text-secondary">Tables disponibles</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={toggleAll}
                  disabled={loading}
                >
                  {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>

              <p className="text-muted small">Cochez les tables à réinitialiser. Les dépendances seront traitées dans l'ordre de sécurité approprié.</p>

              <div className="list-group">
                {RESET_ENTITIES.map((item) => {
                  const state = progress[item.key];
                  let badge = null;
                  if (state) {
                    if (state.status === 'loading') badge = <span className="badge bg-warning text-dark spinner-border spinner-border-sm"></span>;
                    else if (state.status === 'success') badge = <span className="badge bg-success">Success ({state.count})</span>;
                    else if (state.status === 'error') badge = <span className="badge bg-danger">Erreur</span>;
                  }

                  return (
                    <label
                      key={item.key}
                      className="list-group-item d-flex justify-content-between align-items-center list-group-item-action py-3 style-checkbox"
                      style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selected.has(item.key)}
                          onChange={() => toggleEntity(item.key)}
                          disabled={loading}
                          style={{ width: '1.25rem', height: '1.25rem' }}
                        />
                        <span className={selected.has(item.key) ? "fw-bold text-dark" : "text-muted"}>
                          {item.label}
                        </span>
                      </div>
                      <div>
                        {badge}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="d-flex gap-2 mt-4">
                <button
                  className="btn btn-outline-danger w-100"
                  onClick={handleReset}
                  disabled={selected.size === 0 || loading}
                >
                  Réinitialiser la sélection
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setSelected(new Set())}
                  disabled={loading}
                >
                  Vider
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-5">
            {/* LOG CONSOLE */}
            <div className="card shadow-sm border-0 p-4 h-100 d-flex flex-column" style={{ minHeight: '400px' }}>
              <h5 className="text-secondary mb-3">Logs d'exécution</h5>
              
              <div 
                className="bg-dark text-white p-3 rounded font-monospace flex-grow-1 overflow-auto" 
                style={{ fontSize: '0.85rem', maxHeight: '380px', minHeight: '200px' }}
              >
                {logs.length === 0 ? (
                  <span className="text-muted">Aucune action en cours. Cliquez sur "Lancer le reset" pour démarrer.</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))
                )}
              </div>

              {status && (
                <div className={`alert ${status.ok ? "alert-success" : "alert-danger"} mt-3 mb-0`}>
                  {status.message}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Reset;
