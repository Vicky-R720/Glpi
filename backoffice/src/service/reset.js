import { buildUrl } from "./api.js";

export const RESET_ENTITIES = [
  { key: "Ticket", label: "Tickets (Ticket)" },
  { key: "Computer", label: "Ordinateurs (Computer)" },
  { key: "Monitor", label: "Écrans / Moniteurs (Monitor)" },
  { key: "Location", label: "Lieux (Location)" },
  { key: "Manufacturer", label: "Fabricants (Manufacturer)" },
  { key: "State", label: "Statuts / États (State)" },
  { key: "User", label: "Utilisateurs (User)" },
  { key: "ComputerModel", label: "Modèles d'Ordinateur (ComputerModel)" },
  { key: "MonitorModel", label: "Modèles d'Écran (MonitorModel)" },
];

// Deletion order to satisfy foreign key constraints:
// Dependent items (like Tickets, Computers, Monitors) must be deleted before
// their master entities (like Locations, States, Models, Manufacturers, Users).
const dependencyOrder = [
  "Ticket",
  "Computer",
  "Monitor",
  "ComputerModel",
  "MonitorModel",
  "Location",
  "State",
  "Manufacturer",
  "User",
];

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

export async function fetchEntityIds(entity) {
  const url = `${buildUrl(entity)}/?only_id=true&range=0-9999`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Session-Token": SESSION_TOKEN,
      "App-Token": APP_TOKEN,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data.map((item) => item.id);
  }
  return [];
}

export async function resetEntity(entity) {
  const ids = await fetchEntityIds(entity);
  if (ids.length === 0) {
    return { count: 0, results: [] };
  }

  // GLPI bulk delete uses DELETE /api/itemtype/
  const url = `${buildUrl(entity)}/`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Session-Token": SESSION_TOKEN,
      "App-Token": APP_TOKEN,
    },
    body: JSON.stringify({
      input: ids.map((id) => ({ id })),
      force_purge: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} - ${text || response.statusText}`);
  }

  const results = await response.json();
  return { count: ids.length, results };
}

export async function resetEntities(entities, onProgress) {
  // Sort entities based on dependencyOrder
  const sorted = [...entities].sort((a, b) => {
    const idxA = dependencyOrder.indexOf(a);
    const idxB = dependencyOrder.indexOf(b);
    return idxA - idxB;
  });

  const results = [];
  for (const entity of sorted) {
    if (onProgress) onProgress(entity, "loading");
    try {
      const res = await resetEntity(entity);
      results.push({ entity, success: true, ...res });
      if (onProgress) onProgress(entity, "success", res.count);
    } catch (err) {
      console.error(`Error resetting ${entity}:`, err);
      results.push({ entity, success: false, error: err.message });
      if (onProgress) onProgress(entity, "error", 0, err.message);
    }
  }
  return results;
}
