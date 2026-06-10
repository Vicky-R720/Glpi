import { useState, useEffect, useCallback } from 'react';

/**
 * useKanbanConfig — Hook React pour récupérer les préférences Kanban
 * depuis localStorage (simulant SQLite). Écoute l'événement "storage"
 * pour synchroniser automatiquement entre onglets backoffice ↔ frontoffice.
 */

const API_URL = 'http://localhost:3001/api/kanban-config';

const DEFAULT_CONFIG = {
  columns: {
    nouveau: { color: '#fee2e2', labelMg: 'Vaovao', labelFr: 'Nouveau' },
    in_progress: { color: '#fef3c7', labelMg: 'Efa manao', labelFr: 'In progress' },
    termine: { color: '#dcfce7', labelMg: 'Vita', labelFr: 'Terminé' },
  },
};

export function useKanbanConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Erreur lecture config SQLite Kanban:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    
    // Poll the backend every 5 seconds to sync cross-tabs/changes (since we can't use storage events for backend)
    const interval = setInterval(fetchConfig, 5000);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  return { config };
}
