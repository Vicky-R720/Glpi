import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { getKanbanConfig, saveKanbanConfig } from '../service/kanbanConfig.js';

/**
 * KanbanConfig — Page de configuration Backoffice pour le tableau Kanban.
 * Permet de personnaliser :
 *   - Les couleurs de fond des 3 colonnes
 *   - Les traductions en malgache des noms de statuts
 */
function KanbanConfig() {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    getKanbanConfig().then(loaded => setConfig(loaded));
  }, []);

  const updateColumn = (columnKey, field, value) => {
    setConfig((prev) => ({
      ...prev,
      columns: {
        ...prev.columns,
        [columnKey]: {
          ...prev.columns[columnKey],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const result = await saveKanbanConfig(config);
    if (result.ok) {
      setFeedback({ type: 'success', message: 'Configuration Kanban sauvegardée avec succès !' });
    } else {
      setFeedback({ type: 'error', message: `Erreur: ${result.error}` });
    }
    setSaving(false);
  };

  if (!config) {
    return (
      <div className="app-shell">
        <Sidebar />
        <div className="main p-4 d-flex align-items-center justify-content-center">
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );
  }

  const COLUMNS_META = [
    { key: 'nouveau', icon: '🆕', description: 'Tickets venant d\'être créés (status GLPI = 1)' },
    { key: 'in_progress', icon: '⏳', description: 'Tickets en cours de traitement (status GLPI = 2, 3, 4)' },
    { key: 'termine', icon: '✅', description: 'Tickets résolus ou clos (status GLPI = 5, 6)' },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main p-4">
        <header className="topbar px-4 py-3 d-flex align-items-center justify-content-between mb-4 rounded shadow-sm">
          <div>
            <h1 className="h4 mb-1 text-primary">🎨 Configuration du Kanban</h1>
            <p className="text-muted mb-0 small">
              Personnalisez les couleurs et les traductions malgaches des colonnes du tableau Kanban.
            </p>
          </div>
        </header>

        {feedback && (
          <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
            {feedback.type === 'success' ? '✓' : '✕'} {feedback.message}
            <button type="button" className="btn-close" onClick={() => setFeedback(null)}></button>
          </div>
        )}

        <div className="row g-4 mb-4">
          {COLUMNS_META.map(({ key, icon, description }) => {
            const col = config.columns[key];
            return (
              <div key={key} className="col-md-4">
                <div className="card shadow-sm border-0 h-100" style={{ borderTop: `4px solid ${col.color}` }}>
                  <div className="card-body">
                    <h5 className="card-title d-flex align-items-center gap-2 mb-1">
                      <span>{icon}</span>
                      {col.labelFr}
                    </h5>
                    <p className="text-muted small mb-3">{description}</p>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-uppercase text-secondary">Couleur de fond</label>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="color"
                          value={col.color}
                          onChange={(e) => updateColumn(key, 'color', e.target.value)}
                          className="form-control form-control-color"
                          style={{ width: '50px', height: '38px' }}
                        />
                        <input
                          type="text"
                          value={col.color}
                          onChange={(e) => updateColumn(key, 'color', e.target.value)}
                          className="form-control form-control-sm font-monospace"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-uppercase text-secondary">Nom en Malgache</label>
                      <input
                        type="text"
                        value={col.labelMg}
                        onChange={(e) => updateColumn(key, 'labelMg', e.target.value)}
                        className="form-control"
                        placeholder="Traduction malgache..."
                      />
                      <div className="form-text">
                        Français : <strong>{col.labelFr}</strong> → Malgache : <strong>{col.labelMg}</strong>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="form-label fw-semibold small text-uppercase text-secondary">Aperçu</label>
                      <div className="rounded p-3 text-center fw-semibold" style={{ background: col.color, border: '1px dashed #ccc', fontSize: '0.95rem' }}>
                        {col.labelMg || col.labelFr}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="d-flex justify-content-end">
          <button className="btn btn-primary btn-lg d-flex align-items-center gap-2 px-4" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="spinner-border spinner-border-sm"></span> Sauvegarde en cours...</>
            ) : (
              <>💾 Enregistrer la configuration</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KanbanConfig;
