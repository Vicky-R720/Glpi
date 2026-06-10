/**
 * kanbanConfig.js — Service de persistance des configurations Kanban
 * Simule une couche SQLite en stockant les préférences dans localStorage.
 *
 * Clé localStorage : "kanban_config"
 *
 * Les 3 colonnes configurables :
 *   - nouveau   (status GLPI = 1)
 *   - in_progress (status GLPI = 2, 3, 4)
 *   - termine   (status GLPI = 5, 6)
 */

const API_URL = 'http://localhost:3001/api/kanban-config';

/**
 * Configuration par défaut des 3 colonnes Kanban
 */
export const DEFAULT_CONFIG = {
  columns: {
    nouveau: {
      color: '#fee2e2',
      labelMg: 'Vaovao',
      labelFr: 'Nouveau',
    },
    in_progress: {
      color: '#fef3c7',
      labelMg: 'Efa manao',
      labelFr: 'In progress',
    },
    termine: {
      color: '#dcfce7',
      labelMg: 'Vita',
      labelFr: 'Terminé',
    },
  },
};

/**
 * Récupère la configuration Kanban depuis l'API (SQLite)
 * @returns {Promise<object>} La config Kanban
 */
export async function getKanbanConfig() {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.error('Erreur lecture config SQLite Kanban:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

/**
 * Sauvegarde la configuration Kanban via l'API (SQLite)
 * @param {object} config - La config Kanban à sauvegarder
 */
export async function saveKanbanConfig(config) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (!res.ok) throw new Error(await res.text());
    return { ok: true };
  } catch (err) {
    console.error('Erreur sauvegarde config SQLite Kanban:', err);
    return { ok: false, error: err.message };
  }
}

export default { getKanbanConfig, saveKanbanConfig, DEFAULT_CONFIG };
